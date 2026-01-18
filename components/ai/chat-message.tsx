"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircleIcon, XCircleIcon, SparklesIcon, UserIcon } from "lucide-react";

interface ChatMessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
    toolCalls?: any;
    timestamp: Date;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <SparklesIcon className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Message bubble */}
      <div className={cn("max-w-[80%] rounded-lg p-4", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Tool calls results */}
        {message.toolCalls?.calls && (
          <div className="mt-3 space-y-2 border-t pt-3 border-border/40">
            {message.toolCalls.calls.map((call: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                {call.result.success ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {call.tool === "create_bill" && "Created bill"}
                    {call.tool === "create_category" && "Created category"}
                    {call.tool === "get_analytics" && "Retrieved analytics"}
                    {call.tool === "search_bills" && "Found bills"}
                  </div>
                  {call.result.message && (
                    <div className={cn("text-xs mt-1", isUser ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {call.result.message}
                    </div>
                  )}
                  {call.result.error && (
                    <div className="text-xs mt-1 text-red-500">{call.result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn("text-xs mt-2", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {format(new Date(message.timestamp), "h:mm a")}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
