import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { tools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/tool-handlers";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.organizationId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { conversationId, message } = await request.json();

    // 1. Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
          organizationId: session.user.organizationId,
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
          organizationId: session.user.organizationId,
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
    const context = await buildContext(session.user.organizationId);

    // 4. Build message history for Claude
    const messageHistory: any[] = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add current user message
    messageHistory.push({
      role: "user",
      content: message,
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
            system: buildSystemPrompt(context),
            messages: messageHistory,
            tools,
          });

          // First, handle any text content and collect tool_use blocks
          const toolUseBlocks: any[] = [];
          for (const block of response.content) {
            if (block.type === "text") {
              assistantMessage += block.text;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "text", content: block.text })}\n\n`
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
                  session.user.organizationId!
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
                system: buildSystemPrompt(context),
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
                  assistantMessage += followBlock.text;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "text",
                        content: followBlock.text,
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

// Helper to build system prompt with context
function buildSystemPrompt(context: any): string {
  return `You are a concise AI assistant for managing expenses. Keep responses SHORT and mobile-friendly.

CRITICAL STYLE RULES:
- Be BRIEF. No long introductions or explanations
- Don't list all categories/features unless asked
- Don't use excessive emojis
- Get straight to the point
- Use short sentences
- For simple confirmations, use 1-2 sentences max

Context (use internally, don't dump to user):
- Categories: ${context.categories.map((c: any) => `${c.name}${c.icon ? " " + c.icon : ""}`).join(", ")}
- Month spending: $${context.currentMonthTotal}
- Bills this month: ${context.billCount}
- Users: ${context.users.map((u: any) => u.name).join(", ")}

Tool guidelines:
- When creating bills, ask for category if not specified
- If category doesn't exist, ask if user wants to create it
- When creating category + bill together, call BOTH tools in same response
- For deletes, call with confirmed=false first, then confirmed=true after user confirms
- Assignments must total 100%
- Use markdown tables for data lists (bills, analytics)

Current date: ${format(new Date(), "yyyy-MM-dd")}`;
}

// Helper to build context
async function buildContext(organizationId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [categories, currentMonthBills, users] = await Promise.all([
    prisma.billType.findMany({
      where: { organizationId },
      select: { id: true, name: true, color: true, icon: true },
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
  ]);

  return {
    categories,
    currentMonthTotal: Number(currentMonthBills._sum.amount || 0).toFixed(2),
    billCount: currentMonthBills._count,
    users,
  };
}
