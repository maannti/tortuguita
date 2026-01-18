"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-base max-w-none",
        // Base colors - adjusted for chat bubbles
        isUser
          ? "prose-invert" // For light text on primary background
          : "dark:prose-invert", // For dark mode
        // Headings - made much more prominent
        "prose-headings:font-bold prose-headings:tracking-tight prose-headings:leading-tight",
        "prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6 first:prose-h1:mt-0 prose-h1:pb-2 prose-h1:border-b",
        isUser
          ? "prose-h1:border-primary-foreground/20"
          : "prose-h1:border-border",
        "prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 first:prose-h2:mt-0",
        "prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-5 first:prose-h3:mt-0",
        "prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4",
        // Paragraphs - better spacing
        "prose-p:my-4 prose-p:leading-7 first:prose-p:mt-0 last:prose-p:mb-0",
        // Links
        isUser
          ? "prose-a:text-primary-foreground prose-a:underline prose-a:underline-offset-2 hover:prose-a:opacity-80"
          : "prose-a:text-primary prose-a:font-medium hover:prose-a:underline prose-a:underline-offset-2 dark:prose-a:text-primary",
        // Lists - better spacing
        "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-2",
        "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-2",
        "prose-li:my-1.5 prose-li:leading-7",
        "prose-li>p:my-1",
        // Nested lists
        "prose-li>ul:my-2 prose-li>ol:my-2",
        // Code blocks - more prominent
        isUser
          ? "prose-pre:bg-primary-foreground/10 prose-pre:text-primary-foreground"
          : "prose-pre:bg-muted/50 prose-pre:text-foreground dark:prose-pre:bg-muted",
        "prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-4",
        "prose-pre:overflow-x-auto prose-pre:border",
        isUser
          ? "prose-pre:border-primary-foreground/20"
          : "prose-pre:border-border",
        "prose-pre:text-sm prose-pre:leading-6",
        // Inline code - more visible
        isUser
          ? "prose-code:text-primary-foreground prose-code:bg-primary-foreground/20"
          : "prose-code:text-foreground prose-code:bg-muted dark:prose-code:bg-muted",
        "prose-code:rounded prose-code:px-2 prose-code:py-0.5",
        "prose-code:font-mono prose-code:text-[0.9em] prose-code:font-semibold",
        "prose-code:before:content-none prose-code:after:content-none",
        // Blockquotes - more prominent
        isUser
          ? "prose-blockquote:border-primary-foreground/30 prose-blockquote:text-primary-foreground/90"
          : "prose-blockquote:border-muted-foreground/40 prose-blockquote:text-muted-foreground dark:prose-blockquote:text-muted-foreground",
        "prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4",
        "prose-blockquote:border-l-4 prose-blockquote:py-1",
        // Tables - better spacing and styling
        "prose-table:my-4 prose-table:w-full prose-table:border-collapse",
        isUser
          ? "prose-th:bg-primary-foreground/10 prose-th:text-primary-foreground"
          : "prose-th:bg-muted/50 dark:prose-th:bg-muted prose-th:text-foreground",
        "prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-bold prose-th:border",
        isUser
          ? "prose-th:border-primary-foreground/20"
          : "prose-th:border-border",
        "prose-td:px-3 prose-td:py-2 prose-td:border",
        isUser
          ? "prose-td:border-primary-foreground/20"
          : "prose-td:border-border",
        // Horizontal rules - more visible
        isUser
          ? "prose-hr:border-primary-foreground/30"
          : "prose-hr:border-border",
        "prose-hr:my-6 prose-hr:border-t-2",
        // Strong/Bold - more prominent
        "prose-strong:font-bold prose-strong:font-semibold",
        isUser
          ? "prose-strong:text-primary-foreground"
          : "prose-strong:text-foreground",
        // Emphasis/Italic
        isUser
          ? "prose-em:text-primary-foreground"
          : "prose-em:text-foreground"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
