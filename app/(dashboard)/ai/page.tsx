"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { ChatMessage } from "@/components/ai/chat-message";
import { ConversationSidebar } from "@/components/ai/conversation-sidebar";
import { SendIcon, XIcon, PaperclipIcon } from "lucide-react";
import { TurtleIcon } from "@/components/ai/turtle-icon";
import { useTranslations, useLanguage } from "@/components/providers/language-provider";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: any;
  timestamp: Date;
}

export default function AIPage() {
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

  return (
    <div className="flex h-full -m-4 md:-m-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,image/*" onChange={handleFileChange} className="hidden" />
      {/* Sidebar with conversation history - hidden on mobile */}
      <div className="hidden md:block p-4 md:p-6">
        <ConversationSidebar
          conversations={Array.isArray(conversations) ? conversations : []}
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop: Same layout as mobile */}
        <div className="hidden md:flex flex-col flex-1 p-4 md:p-6 pl-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Messages area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-4">
                  <div className="space-y-8">
                    {/* Turtle icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <TurtleIcon className="h-12 w-12 text-primary" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-semibold mb-2">{t.ai.title}</h2>
                      <p className="text-muted-foreground">{t.ai.subtitle}</p>
                    </div>

                    {/* Suggestion chips - vertical stack */}
                    <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
                      <button
                        onClick={() => handleSuggestionClick(suggestions.analytics)}
                        className="w-full px-4 py-3.5 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.viewAnalytics}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.createBill)}
                        className="w-full px-4 py-3.5 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.createBill}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.showBills)}
                        className="w-full px-4 py-3.5 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.showBills}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.createCategory)}
                        className="w-full px-4 py-3.5 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.createCategory}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 space-y-4">
                  {messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)}
                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-center gap-3 text-muted-foreground py-2">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <TurtleIcon className="h-6 w-6" isThinking />
                      </div>
                      <span className="text-sm">{t.ai.thinking}</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Desktop Input - Same style as mobile */}
            <div className="flex-shrink-0 px-5 py-4">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 bg-muted rounded-3xl px-4 py-3 min-h-[56px]">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={t.ai.placeholder}
                    disabled={isLoading}
                    className="flex-1 min-h-[24px] max-h-[200px] resize-none overflow-y-auto bg-transparent border-none outline-none py-0 px-0 leading-6 text-[16px] placeholder:text-muted-foreground/70"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all grid place-items-center self-end"
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !attachedFile)}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity grid place-items-center self-end"
                  >
                    <SendIcon className="h-4 w-4" />
                  </button>
                </div>
              </form>
              {attachedFile && (
                <div className="flex items-center gap-2 px-1 pb-2">
                  <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium">
                    <PaperclipIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="ml-1 opacity-60 hover:opacity-100">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Mobile sidebar drawer */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
            isMobileSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div
            className={`absolute left-0 top-0 h-full w-72 bg-background transform transition-transform duration-300 ease-out ${
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">{t.ai.history}</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 -mr-2 rounded-full hover:bg-muted"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 h-[calc(100%-57px)] overflow-hidden">
              <ConversationSidebar
                conversations={Array.isArray(conversations) ? conversations : []}
                currentConversationId={conversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>
          </div>
        </div>

        {/* Mobile: Full-screen app-like layout */}
        <div
          className="flex md:hidden flex-col h-full bg-background pb-16"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Mobile scrollable messages area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Mobile Messages area */}
            <div>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-4">
                  <div className="space-y-8">
                    {/* Turtle icon */}
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <TurtleIcon className="h-10 w-10 text-primary" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl font-semibold mb-2">{t.ai.title}</h2>
                      <p className="text-muted-foreground text-sm">{t.ai.subtitle}</p>
                    </div>

                    {/* Suggestion chips - vertical stack on mobile */}
                    <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
                      <button
                        onClick={() => handleSuggestionClick(suggestions.analytics)}
                        className="w-full px-4 py-3 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.viewAnalytics}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.createBill)}
                        className="w-full px-4 py-3 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.createBill}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.showBills)}
                        className="w-full px-4 py-3 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.showBills}
                      </button>

                      <button
                        onClick={() => handleSuggestionClick(suggestions.createCategory)}
                        className="w-full px-4 py-3 text-sm text-left rounded-2xl bg-muted/50 hover:bg-muted active:scale-[0.98] transition-all"
                      >
                        {t.ai.suggestions.createCategory}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-4 space-y-4">
                  {messages.map((msg, idx) => <ChatMessage key={idx} message={msg} isMobile />)}
                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-center gap-3 text-muted-foreground py-2">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <TurtleIcon className="h-5 w-5" isThinking />
                      </div>
                      <span className="text-sm">{t.ai.thinking}</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

          </div>{/* end scroll */}

          {/* Mobile Input - flex-shrink-0, always visible above BottomNav */}
          <div className="flex-shrink-0 bg-background px-4 py-2">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 bg-muted rounded-3xl px-4 py-3">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={t.ai.placeholder}
                    disabled={isLoading}
                    enterKeyHint="send"
                    autoComplete="off"
                    autoCorrect="on"
                    className="flex-1 min-w-0 min-h-[24px] max-h-[120px] resize-none overflow-y-auto bg-transparent border-none outline-none py-0 px-0 leading-6 text-[16px] placeholder:text-muted-foreground/70"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all grid place-items-center"
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !attachedFile)}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity grid place-items-center"
                  >
                    <SendIcon className="h-4 w-4" />
                  </button>
                </div>
              </form>
              {/* File chip */}
              {attachedFile && (
                <div className="flex items-center gap-2 px-1 py-1">
                  <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary font-medium max-w-full">
                    <PaperclipIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="ml-1 opacity-60 hover:opacity-100">
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
