"use client";

import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import React from "react";

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

// Custom table component that renders as cards on mobile
function ResponsiveTable({ children, isUser }: { children: React.ReactNode; isUser: boolean }) {
  // Extract headers and rows from children
  const childArray = React.Children.toArray(children);
  let headers: string[] = [];
  let rows: React.ReactNode[][] = [];

  childArray.forEach((child) => {
    if (!React.isValidElement(child)) return;

    const childProps = child.props as { children?: React.ReactNode };
    const grandchildren = React.Children.toArray(childProps.children);
    grandchildren.forEach((row) => {
      if (!React.isValidElement(row)) return;

      const rowProps = row.props as { children?: React.ReactNode };
      const cells = React.Children.toArray(rowProps.children);

      // Check if this is a header row (th elements)
      const isHeaderRow = cells.some((cell) =>
        React.isValidElement(cell) && cell.type === 'th'
      );

      if (isHeaderRow) {
        headers = cells.map((cell) => {
          if (React.isValidElement(cell)) {
            const cellProps = cell.props as { children?: React.ReactNode };
            const content = cellProps.children;
            if (typeof content === 'string') return content;
            if (Array.isArray(content)) {
              return content.map(c => typeof c === 'string' ? c : '').join('');
            }
          }
          return '';
        });
      } else {
        rows.push(cells);
      }
    });
  });

  return (
    <div className="my-3 rounded-lg border border-border overflow-hidden">
      {/* Desktop: Regular table */}
      <table className="hidden md:table w-full border-collapse text-sm">
        <thead className={cn(isUser ? "bg-primary-foreground/10" : "bg-muted")}>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className={cn(
                "px-3 py-2 text-left font-semibold border-r border-border last:border-r-0",
                isUser ? "text-primary-foreground" : "text-foreground"
              )}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cn(
                  "px-3 py-2 border-r border-border last:border-r-0",
                  isUser ? "text-primary-foreground/90" : "text-foreground"
                )}>
                  {React.isValidElement(cell) ? (cell.props as { children?: React.ReactNode }).children : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: Card layout */}
      <div className="md:hidden divide-y divide-border">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="p-3 space-y-1.5">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="flex gap-2 text-sm">
                <span className={cn(
                  "font-medium min-w-[90px] shrink-0",
                  isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {headers[cellIndex] || `Col ${cellIndex + 1}`}:
                </span>
                <span className={cn(
                  isUser ? "text-primary-foreground" : "text-foreground"
                )}>
                  {React.isValidElement(cell) ? (cell.props as { children?: React.ReactNode }).children : cell}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content, isUser = false }: MarkdownRendererProps) {
  const components: Components = {
    table: ({ children }) => (
      <ResponsiveTable isUser={isUser}>{children}</ResponsiveTable>
    ),
  };

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        isUser
          ? "prose-invert"
          : "dark:prose-invert",
        "prose-headings:font-bold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h1:mb-3 prose-h1:mt-4 first:prose-h1:mt-0",
        "prose-h2:text-xl prose-h2:mb-2 prose-h2:mt-4 first:prose-h2:mt-0",
        "prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-3 first:prose-h3:mt-0",
        "prose-p:my-2 prose-p:leading-6 first:prose-p:mt-0 last:prose-p:mb-0",
        isUser
          ? "prose-a:text-primary-foreground prose-a:underline"
          : "prose-a:text-primary hover:prose-a:underline",
        "prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1",
        "prose-ol:my-2 prose-ol:list-decimal prose-ol:pl-5 prose-ol:space-y-1",
        "prose-li:my-0.5 prose-li:leading-6",
        isUser
          ? "prose-pre:bg-primary-foreground/10 prose-pre:text-primary-foreground"
          : "prose-pre:bg-muted/50 prose-pre:text-foreground",
        "prose-pre:rounded-lg prose-pre:p-3 prose-pre:my-2 prose-pre:text-sm",
        isUser
          ? "prose-code:text-primary-foreground prose-code:bg-primary-foreground/20"
          : "prose-code:text-foreground prose-code:bg-muted",
        "prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm",
        "prose-code:before:content-none prose-code:after:content-none",
        isUser
          ? "prose-blockquote:border-primary-foreground/30 prose-blockquote:text-primary-foreground/90"
          : "prose-blockquote:border-muted-foreground/40 prose-blockquote:text-muted-foreground",
        "prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:my-2 prose-blockquote:border-l-2",
        "prose-strong:font-semibold",
        isUser
          ? "prose-strong:text-primary-foreground"
          : "prose-strong:text-foreground"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
