import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { tools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { startOfMonth, endOfMonth, format } from "date-fns";
import {
  validateUserMessage,
  buildSafeSystemPrompt,
  logSuspiciousActivity,
  validateAIOutput,
  logOutputIssue,
  needsOutputValidation,
} from "@/lib/ai/safety";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.currentOrganizationId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { conversationId, message, file } = await request.json();
    // file = { name, type, data (base64) } | null

    // 0. Validate user message for safety
    const validation = validateUserMessage(message);
    if (!validation.isValid) {
      // Log suspicious activity
      if (validation.riskLevel !== 'none') {
        logSuspiciousActivity(
          session.user.id,
          message,
          validation.riskLevel,
          validation.reason || 'Unknown'
        );
      }

      // Return a friendly redirect response
      return new Response(
        JSON.stringify({
          type: "safety_block",
          message: validation.reason,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 1. Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
          organizationId: session.user.currentOrganizationId,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20, // Limit context window
          },
        },
      });

      if (!conversation) {
        return new Response("Conversation not found", { status: 404 });
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          organizationId: session.user.currentOrganizationId,
          title: message.slice(0, 50),
        },
        include: { messages: true },
      });
    }

    // 2. Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // 3. Build context for Claude
    const context = await buildContext(session.user.currentOrganizationId, session.user.id);

    // 4. Build message history for Claude
    const messageHistory: any[] = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add current user message (with optional file attachment)
    const userContent: any[] = []
    if (file) {
      if (file.type === "application/pdf") {
        userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: file.data } })
      } else if (file.type.startsWith("image/")) {
        userContent.push({ type: "image", source: { type: "base64", media_type: file.type, data: file.data } })
      } else if (file.type === "text/csv" || file.type === "text/plain") {
        const csvText = Buffer.from(file.data, "base64").toString("utf-8")
        userContent.push({ type: "text", text: `Archivo adjunto (${file.name}):\n\n${csvText}` })
      }
    }
    const userText = message || (file ? `Analizá este resumen de tarjeta/banco y preparate para importar las transacciones.` : "")
    userContent.push({ type: "text", text: userText })
    messageHistory.push({
      role: "user",
      content: userContent,
    });

    // 5. Call Claude with streaming
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let assistantMessage = "";
          let toolCallsData: any[] = [];

          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: buildSystemPrompt(context, !!file),
            messages: messageHistory,
            tools,
          });

          // First, handle any text content and collect tool_use blocks
          const toolUseBlocks: any[] = [];
          for (const block of response.content) {
            if (block.type === "text") {
              let textContent = block.text;

              // Validate output if needed
              if (needsOutputValidation(textContent)) {
                const outputValidation = validateAIOutput(textContent);
                if (!outputValidation.isValid) {
                  logOutputIssue(session.user.id, conversation.id, outputValidation.issues);
                  textContent = outputValidation.sanitizedContent || textContent;
                }
              }

              assistantMessage += textContent;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "text", content: textContent })}\n\n`
                )
              );
            } else if (block.type === "tool_use") {
              toolUseBlocks.push(block);
            }
          }

          // If there are tool calls, execute ALL of them and then make ONE follow-up call
          if (toolUseBlocks.length > 0) {
            const toolResults: any[] = [];

            // Execute all tools
            for (const block of toolUseBlocks) {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "tool_start", tool: block.name })}\n\n`
                )
              );

              try {
                const result = await handleToolCall(
                  block.name,
                  block.input,
                  session.user.id,
                  session.user.currentOrganizationId!
                );

                toolCallsData.push({
                  tool: block.name,
                  input: block.input,
                  result,
                  timestamp: new Date().toISOString(),
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result),
                });

                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "tool_result",
                      tool: block.name,
                      result,
                    })}\n\n`
                  )
                );
              } catch (error: any) {
                const errorResult = {
                  success: false,
                  error: error.message || "Tool execution failed",
                };

                toolCallsData.push({
                  tool: block.name,
                  input: block.input,
                  result: errorResult,
                  timestamp: new Date().toISOString(),
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(errorResult),
                  is_error: true,
                });

                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "tool_result",
                      tool: block.name,
                      result: errorResult,
                    })}\n\n`
                  )
                );
              }
            }

            // Now make ONE follow-up call with ALL tool results
            try {
              const followUpResponse = await anthropic.messages.create({
                model: MODEL,
                max_tokens: 4096,
                system: buildSystemPrompt(context, !!file),
                messages: [
                  ...messageHistory,
                  {
                    role: "assistant",
                    content: response.content,
                  },
                  {
                    role: "user",
                    content: toolResults,
                  },
                ],
                tools,
              });

              // Stream follow-up response
              for (const followBlock of followUpResponse.content) {
                if (followBlock.type === "text") {
                  let textContent = followBlock.text;

                  // Validate output if needed
                  if (needsOutputValidation(textContent)) {
                    const outputValidation = validateAIOutput(textContent);
                    if (!outputValidation.isValid) {
                      logOutputIssue(session.user.id, conversation.id, outputValidation.issues);
                      textContent = outputValidation.sanitizedContent || textContent;
                    }
                  }

                  assistantMessage += textContent;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "text",
                        content: textContent,
                      })}\n\n`
                    )
                  );
                }
              }
            } catch (followUpError) {
              console.error("Error in follow-up call:", followUpError);
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "Failed to process tool results",
                  })}\n\n`
                )
              );
            }
          }

          // 6. Save assistant message
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: assistantMessage || "I've completed the requested action.",
              toolCalls: toolCallsData.length > 0 ? { calls: toolCallsData } : undefined,
            },
          });

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          // Send completion
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "done",
                conversationId: conversation.id,
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                error: "An error occurred processing your request",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// Helper to build system prompt with context (uses hardened safety prompt)
function buildSystemPrompt(context: any, hasFile = false): string {
  const base = buildSafeSystemPrompt({
    categories: context.categories,
    incomeCategories: context.incomeCategories,
    currentMonthTotal: context.currentMonthTotal,
    billCount: context.billCount,
    users: context.users,
    currentUserName: context.currentUserName,
    currentDate: format(new Date(), "yyyy-MM-dd"),
  });
  if (!hasFile) return base;
  return base + `

INSTRUCCIONES PARA IMPORTAR RESÚMENES:
El usuario adjuntó un resumen de tarjeta o banco. Tu tarea es:
1. Extraer todas las transacciones: fecha, descripción, monto en pesos (ARS).
2. Para compras en cuotas (ej. "AMAZON 3/12"), identificar que es la cuota N de un total M.
   - IMPORTANTE: en tortuguita, una compra en cuotas se registra UNA SOLA VEZ con totalInstallments=M.
   - El sistema genera las cuotas mensuales automáticamente.
   - Si ves "AMAZON 3/12", significa que ya existe una compra de hace 2 meses — NO la vuelvas a crear.
3. Ignorar: pagos mínimos, pagos del resumen anterior, totales, cargos de financiación, intereses.
4. ANTES de presentar la lista final, usar search_bills para verificar cuáles ya existen:
   - Buscar por descripción similar y rango de fechas del último año
   - Para cuotas: si encontrás un bill con descripción similar y totalInstallments igual, está duplicado
   - Marcar los duplicados en tu lista (no los importes)
5. Presentar dos listas al usuario: "A importar" y "Ya existentes (omitidos)".
6. Preguntar confirmación antes de importar.
7. Una vez confirmado, usar create_bill solo para los que NO son duplicados.
8. Para cuotas nuevas: usar totalInstallments con el total (ej. 12), categoría de tarjeta de crédito correspondiente, y como paymentDate la fecha ORIGINAL de la compra (no la del resumen).`;
}

// Helper to build context
async function buildContext(organizationId: string, currentUserId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [categories, incomeCategories, currentMonthBills, users, currentUser] = await Promise.all([
    prisma.billType.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isCreditCard: true,
        currentClosingDate: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.incomeType.findMany({
      where: { organizationId },
      select: { id: true, name: true, color: true, icon: true, isRecurring: true },
      orderBy: { name: "asc" },
    }),
    prisma.bill.aggregate({
      where: {
        organizationId,
        paymentDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true },
    }),
  ]);

  return {
    categories,
    incomeCategories,
    currentMonthTotal: Number(currentMonthBills._sum.amount || 0).toFixed(2),
    billCount: currentMonthBills._count,
    users,
    currentUserName: currentUser?.name || "Unknown",
  };
}
