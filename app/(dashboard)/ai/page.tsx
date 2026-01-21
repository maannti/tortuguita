"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "@/components/ai/chat-message";
import { ConversationSidebar } from "@/components/ai/conversation-sidebar";
import { SendIcon } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations();
  const { language } = useLanguage();

  const { data: conversations, mutate: refreshConversations } = useSWR("/api/ai/conversations", fetcher);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        const form = document.querySelector("form");
        form?.requestSubmit();
      }
    }
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
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: input,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

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
  };

  const handleSelectConversation = async (id: string) => {
    try {
      // Load conversation messages
      setConversationId(id);
      setMessages([]); // Clear current messages
      setIsLoading(true);

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
        {/* Desktop: Card wrapper */}
        <div className="hidden md:flex flex-1 p-4 md:p-6 pl-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-2">
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.ai.title}</h2>
                      <p className="text-muted-foreground text-sm md:text-base">{t.ai.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm whitespace-nowrap"
                        onClick={() => handleSuggestionClick(suggestions.analytics)}
                      >
                        {t.ai.suggestions.viewAnalytics}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm whitespace-nowrap"
                        onClick={() => handleSuggestionClick(suggestions.createBill)}
                      >
                        {t.ai.suggestions.createBill}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm whitespace-nowrap"
                        onClick={() => handleSuggestionClick(suggestions.showBills)}
                      >
                        {t.ai.suggestions.showBills}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs md:text-sm whitespace-nowrap"
                        onClick={() => handleSuggestionClick(suggestions.createCategory)}
                      >
                        {t.ai.suggestions.createCategory}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)
              )}
              {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <TurtleIcon className="h-6 w-6" isThinking />
                  </div>
                  <span className="text-sm">{t.ai.thinking}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Desktop Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSubmit}>
                <div className="relative flex items-end bg-muted/50 rounded-2xl border border-border/50 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t.ai.placeholder}
                    disabled={isLoading}
                    className="flex-1 min-h-[48px] max-h-[120px] resize-none overflow-y-auto bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 py-[14px] px-4 pr-14 leading-5"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="absolute right-2 bottom-2 h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40"
                  >
                    <SendIcon className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>

        {/* Mobile: Full-screen app-like layout */}
        <div className="flex md:hidden flex-col h-full bg-background overflow-hidden">
          {/* Mobile Messages area */}
          <div className="flex-1 overflow-y-auto min-h-0">
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
                    <h2 className="text-xl font-semibold mb-2">{t.ai.title}</h2>
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

          {/* Mobile Input - At bottom */}
          <div className="flex-shrink-0 bg-background px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 bg-muted rounded-3xl pl-4 pr-1.5 min-h-[48px]">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.ai.placeholder}
                  disabled={isLoading}
                  className="flex-1 min-h-[24px] max-h-[120px] resize-none overflow-y-auto bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 py-0 px-0 leading-6 text-[16px] placeholder:text-muted-foreground/70 self-center"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity grid place-items-center self-center"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
