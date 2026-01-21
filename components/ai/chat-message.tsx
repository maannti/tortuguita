"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { TurtleIcon } from "./turtle-icon";

interface ChatMessageProps {
  message: {
    role: "user" | "assistant";
    content: string;
    toolCalls?: any;
    timestamp: Date;
  };
  isMobile?: boolean;
}

export function ChatMessage({ message, isMobile = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isMobile) {
    // Mobile: Clean, app-like layout similar to Claude/ChatGPT
    return (
      <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
        {/* Assistant avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <TurtleIcon className="h-5 w-5" />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {/* Message content */}
          <div className="text-[15px] leading-relaxed">
            <MarkdownRenderer content={message.content} isUser={isUser} />
          </div>

          {/* Tool calls results */}
          {message.toolCalls?.calls && (
            <div className="mt-2 space-y-1.5 border-t pt-2 border-border/40">
              {message.toolCalls.calls.map((call: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {call.result.success ? (
                    <CheckCircleIcon className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircleIcon className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">
                      {call.tool === "create_bill" && "Created bill"}
                      {call.tool === "create_category" && "Created category"}
                      {call.tool === "get_analytics" && "Retrieved analytics"}
                      {call.tool === "search_bills" && "Found bills"}
                    </div>
                    {call.result.error && (
                      <div className="text-red-500 mt-0.5">{call.result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Original layout with timestamps
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <TurtleIcon className="h-6 w-6" />
        </div>
      )}

      {/* Message bubble */}
      <div className={cn("max-w-[80%] rounded-lg p-4", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        {/* Message content */}
        <MarkdownRenderer content={message.content} isUser={isUser} />

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

      {/* User avatar - only on desktop */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
