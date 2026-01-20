"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const t = useTranslations();
  const { language } = useLanguage();

  const { data: conversations, mutate: refreshConversations } = useSWR("/api/ai/conversations", fetcher);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="flex h-[calc(100vh-4rem-2rem)] md:h-[calc(100vh-4rem-3rem)] gap-4">
      {/* Sidebar with conversation history - hidden on mobile */}
      <div className="hidden md:block">
        <ConversationSidebar
          conversations={Array.isArray(conversations) ? conversations : []}
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{t.ai.title}</h2>
                    <p className="text-muted-foreground">{t.ai.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start"
                      onClick={() => handleSuggestionClick(suggestions.analytics)}
                    >
                      <div>
                        <div className="font-medium">{t.ai.suggestions.viewAnalytics}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.ai.suggestions.viewAnalyticsDesc}
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start"
                      onClick={() => handleSuggestionClick(suggestions.createBill)}
                    >
                      <div>
                        <div className="font-medium">{t.ai.suggestions.createBill}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.ai.suggestions.createBillDesc}
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start"
                      onClick={() => handleSuggestionClick(suggestions.showBills)}
                    >
                      <div>
                        <div className="font-medium">{t.ai.suggestions.showBills}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.ai.suggestions.showBillsDesc}
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-4 px-6 text-left justify-start"
                      onClick={() => handleSuggestionClick(suggestions.createCategory)}
                    >
                      <div>
                        <div className="font-medium">{t.ai.suggestions.createCategory}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.ai.suggestions.createCategoryDesc}
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)
            )}
            {isLoading && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <TurtleIcon className="h-6 w-6" isThinking />
                </div>
                <span className="text-sm">{t.ai.thinking}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.ai.placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <SendIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
