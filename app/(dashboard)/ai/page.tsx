"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/card";
import { ConversationSidebar } from "@/components/ai/conversation-sidebar";
import { MarkdownRenderer } from "@/components/ai/markdown-renderer";
import { XIcon, PaperclipIcon, ArrowUpIcon, ChevronLeftIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { TurtleIcon } from "@/components/ai/turtle-icon";
import { useTranslations, useLanguage } from "@/components/providers/language-provider";
import useSWR from "swr";
import { haptic } from "@/lib/haptics";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: any;
  timestamp: Date;
}

export default function AIPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const t = useTranslations();
  const { language } = useLanguage();

  const { data: conversations, mutate: refreshConversations } = useSWR("/api/ai/conversations", fetcher);

  // Swipe gesture handlers for mobile sidebar
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and significant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Swipe right from left edge to open sidebar
      if (deltaX > 0 && touchStartX.current < 30 && !isMobileSidebarOpen) {
        setIsMobileSidebarOpen(true);
      }
      // Swipe left to close sidebar
      if (deltaX < 0 && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [isMobileSidebarOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-submit a file (used for pendingImport from action sheet)
  const autoSubmitImport = async (file: { name: string; type: string; data: string }) => {
    const defaultMessage = "Analizá este resumen de tarjeta y mostrá las transacciones encontradas antes de importar.";
    const userMessage: Message = {
      role: "user",
      content: `📎 ${file.name}`,
      timestamp: new Date(),
    };
    setMessages([userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: null, message: defaultMessage, file }),
      });

      if (!response.ok) throw new Error("Failed to send");

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.type === "safety_block") {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message, timestamp: new Date() }]);
          setIsLoading(false);
          return;
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let currentToolCalls: any[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text") {
                  assistantMessage += data.content;
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, content: assistantMessage }];
                    return [...prev, { role: "assistant", content: assistantMessage, timestamp: new Date() }];
                  });
                } else if (data.type === "tool_result") {
                  currentToolCalls.push(data);
                } else if (data.type === "done") {
                  if (currentToolCalls.length > 0) {
                    setMessages((prev) => {
                      const last = prev[prev.length - 1];
                      if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, toolCalls: { calls: currentToolCalls.map((tc) => ({ tool: tc.tool, result: tc.result })) } }];
                      return prev;
                    });
                  }
                  setConversationId(data.conversationId);
                  refreshConversations();
                } else if (data.type === "error") {
                  setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Error", timestamp: new Date() }]);
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      console.error("Auto-import error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error procesando el archivo. Intentá de nuevo.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Pick up file pre-loaded from action sheet and auto-submit
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingImport")
    if (pending) {
      try {
        const file = JSON.parse(pending)
        sessionStorage.removeItem("pendingImport")
        autoSubmitImport(file)
        return
      } catch {}
    }
    // Pick up pre-filled question from AI widget
    const pendingQuestion = sessionStorage.getItem("pendingQuestion")
    if (pendingQuestion) {
      try {
        sessionStorage.removeItem("pendingQuestion")
        setInput(pendingQuestion)
        setTimeout(() => {
          const form = document.querySelector("form")
          form?.requestSubmit()
        }, 100)
      } catch {}
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        const form = document.querySelector("form");
        form?.requestSubmit();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) { alert("El archivo no puede superar 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setAttachedFile({ name: file.name, type: file.type, data: base64 });
    };
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isLoading) return;
    haptic("medium");

    const displayContent = input || (attachedFile ? `📎 ${attachedFile.name}` : "");
    const userMessage: Message = {
      role: "user",
      content: displayContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    const fileToSend = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: input,
          file: fileToSend,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Check for safety block response
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.type === "safety_block") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
          return;
        }
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let currentToolCalls: any[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "text") {
                  assistantMessage += data.content;
                  // Update message in real-time
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === "assistant") {
                      return [...prev.slice(0, -1), { ...lastMsg, content: assistantMessage }];
                    } else {
                      return [
                        ...prev,
                        {
                          role: "assistant",
                          content: assistantMessage,
                          timestamp: new Date(),
                        },
                      ];
                    }
                  });
                } else if (data.type === "tool_result") {
                  // Store tool result
                  currentToolCalls.push(data);
                } else if (data.type === "done") {
                  // Update with tool calls
                  if (currentToolCalls.length > 0) {
                    setMessages((prev) => {
                      const lastMsg = prev[prev.length - 1];
                      if (lastMsg?.role === "assistant") {
                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMsg,
                            toolCalls: {
                              calls: currentToolCalls.map((tc) => ({
                                tool: tc.tool,
                                result: tc.result,
                              })),
                            },
                          },
                        ];
                      }
                      return prev;
                    });
                  }

                  setConversationId(data.conversationId);
                  refreshConversations();
                } else if (data.type === "error") {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content: data.error || "An error occurred",
                      timestamp: new Date(),
                    },
                  ]);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setIsMobileSidebarOpen(false); // Close mobile sidebar
  };

  const handleSelectConversation = async (id: string) => {
    try {
      // Load conversation messages
      setConversationId(id);
      setMessages([]); // Clear current messages
      setIsLoading(true);
      setIsMobileSidebarOpen(false); // Close mobile sidebar

      const response = await fetch(`/api/ai/conversations/${id}`);
      if (!response.ok) throw new Error("Failed to load conversation");

      const conversation = await response.json();

      // Convert messages to the correct format
      const loadedMessages: Message[] = conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        timestamp: new Date(msg.createdAt),
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error("Error loading conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (conversationId === id) {
      handleNewConversation();
    }
    refreshConversations();
  };

  const handleSuggestionClick = (prompt: string) => {
    if (isLoading) return;
    haptic("selection");
    setInput(prompt);
    // Use setTimeout to ensure state is updated before submitting
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };

  // Suggestion prompts based on language
  const suggestions = {
    analytics: language === "es" ? "Mostrame mis gastos de este mes por categoria" : "Show me my spending this month by category",
    createBill: language === "es" ? "Crear un gasto de supermercado por $150 pagado hoy" : "Create a new grocery bill for $150 paid today",
    showBills: language === "es" ? "Mostrame los gastos del mes pasado" : "Show me bills from last month",
    createCategory: language === "es" ? "Crear una categoria llamada Restaurantes con icono 🍽️" : "Create a new category called Restaurants with 🍽️ icon",
  };

  // Shared bubble styles
  const glassBubble = {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.65)",
  } as React.CSSProperties;

  const GRADIENT = isDark
    ? "linear-gradient(135deg, #461220 0%, #6B2030 55%, #8C2F39 100%)"
    : "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)"
  const heroTextPrimary = isDark ? "#FED0BB" : "#4A3540"
  const heroTextSecondary = isDark ? "#FCB9B2" : "#6B5159"
  const heroTextMuted = isDark ? "#FCB9B2" : "#9D8189"

  // ── Messages JSX (variable, not component — prevents remount on re-render) ──
  const messagesJsx = messages.length === 0 ? (
    // Empty state — minimal
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="size-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.55)" }}>
        <TurtleIcon className="size-8" />
      </div>
      <p className="text-base font-medium tracking-tight" style={{ color: heroTextSecondary }}>
        ¿En qué te ayudo?
      </p>
    </div>
  ) : (
    <div className="px-4 py-4 space-y-3">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        return (
          <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            {isUser ? (
              <div className="max-w-[78%] rounded-2xl rounded-br-sm px-4 py-2.5" style={{ background: "#4A3540" }}>
                <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{msg.content}</p>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5" style={glassBubble}>
                <div className="text-sm leading-relaxed text-[#2A1F24]">
                  <MarkdownRenderer content={msg.content} />
                </div>
                {msg.toolCalls?.calls && (
                  <div className="mt-2 space-y-1 border-t border-[#D8E2DC]/60 pt-2">
                    {msg.toolCalls.calls.map((call: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#9D8189]">
                        {call.result.success
                          ? <CheckCircleIcon className="size-3 text-green-500 mt-0.5 flex-shrink-0" />
                          : <XCircleIcon className="size-3 text-red-400 mt-0.5 flex-shrink-0" />}
                        <span>
                          {call.tool === "create_bill" && "Gasto creado"}
                          {call.tool === "create_category" && "Categoría creada"}
                          {call.tool === "get_analytics" && "Análisis obtenido"}
                          {call.tool === "search_bills" && "Gastos encontrados"}
                          {call.result.error && ` — ${call.result.error}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* Thinking dots */}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={glassBubble}>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="block size-2 rounded-full animate-bounce" style={{ backgroundColor: heroTextMuted, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  return (
    <div className="flex h-full" style={{ background: GRADIENT }}>
      <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,image/*" onChange={handleFileChange} className="hidden" />

      {/* Desktop sidebar */}
      <div className="hidden md:block p-4 md:p-6">
        <ConversationSidebar
          conversations={Array.isArray(conversations) ? conversations : []}
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── DESKTOP ── */}
        <div className="hidden md:flex flex-col flex-1 p-4 md:p-6 pl-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden" style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", border: "1px solid rgba(216,226,220,0.6)" }}>
            <div className="flex-shrink-0 flex items-center justify-center px-5 pt-5 pb-3 border-b border-[#D8E2DC]/50">
              <span className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)", color: heroTextPrimary }}>
                tortuguita IA
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {messagesJsx}
            </div>
            {/* Desktop input — inlined to preserve focus */}
            <form onSubmit={handleSubmit} className="flex-shrink-0 px-4 pt-2 pb-4">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-[52px]" style={glassBubble}>
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntame algo..."
                  disabled={isLoading}
                  className="flex-1 min-w-0 min-h-[24px] max-h-[200px] resize-none overflow-y-auto bg-transparent border-none outline-none py-0 px-0 leading-6 text-[16px] placeholder:opacity-60"
                  style={{ color: heroTextPrimary }}
                  rows={1}
                />
                <button type="submit" disabled={isLoading || (!input.trim() && !attachedFile)} className="flex-shrink-0 size-9 rounded-full grid place-items-center transition-all active:scale-90 disabled:opacity-30" style={{ background: heroTextPrimary }}>
                  <ArrowUpIcon className="size-4 text-white" strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* ── MOBILE ── */}
        <div
          className="flex md:hidden flex-col h-full"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center px-4 pt-4 pb-3">
            <button
              onClick={() => { haptic("selection"); window.history.back() }}
              className="flex items-center justify-center size-11 rounded-2xl active:bg-white/30 active:scale-95 transition-all"
            style={{ color: heroTextPrimary }}
            >
              <ChevronLeftIcon className="size-6" strokeWidth={2} />
            </button>
            <span className="flex-1 text-center text-[15px] font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)", color: heroTextPrimary }}>
              tortuguita IA
            </span>
            <div className="size-11" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
            {messagesJsx}
          </div>

          {/* Input — inlined so textarea never unmounts between renders */}
          <div className="flex-shrink-0 pb-20">
            <form onSubmit={handleSubmit} className="px-4 pt-2 pb-2">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-[52px]" style={glassBubble}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Preguntame algo..."
                  disabled={isLoading}
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="on"
                  className="flex-1 min-w-0 min-h-[24px] max-h-[120px] resize-none overflow-y-auto bg-transparent border-none outline-none py-0 px-0 leading-6 text-[16px] placeholder:opacity-60"
                  style={{ color: heroTextPrimary }}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  className="flex-shrink-0 size-9 rounded-full grid place-items-center transition-all active:scale-90 disabled:opacity-30"
                  style={{ background: heroTextPrimary }}
                >
                  <ArrowUpIcon className="size-4 text-white" strokeWidth={2.5} />
                </button>
              </div>
              {attachedFile && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white/60 border border-white/80 px-3 py-1.5 text-xs text-[#4A3540] font-medium max-w-full">
                    <PaperclipIcon className="size-3 flex-shrink-0" />
                    <span className="truncate">{attachedFile.name}</span>
                    <button type="button" onClick={() => { haptic("light"); setAttachedFile(null) }} className="ml-1 opacity-50 hover:opacity-100">
                      <XIcon className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
