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
    <div className="my-3 rounded-xl border border-border/50 overflow-hidden bg-background/50">
      {/* Desktop: Regular table */}
      <table className="hidden md:table w-full border-collapse text-sm">
        <thead className={cn(isUser ? "bg-primary-foreground/10" : "bg-muted/50")}>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className={cn(
                "px-4 py-2.5 text-left font-semibold border-b border-border/50",
                isUser ? "text-primary-foreground" : "text-foreground"
              )}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cn(
                  "px-4 py-2.5",
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
      <div className="md:hidden divide-y divide-border/30">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="p-3 space-y-2">
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="flex gap-2 text-sm">
                <span className={cn(
                  "font-medium min-w-[80px] shrink-0",
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
    // Custom bullet list with nice styling
    ul: ({ children }) => (
      <ul className={cn(
        "my-2 space-y-1 pl-4",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={cn(
        "my-2 space-y-1 pl-4 list-decimal",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => {
      const isOrdered = (props as any).ordered;
      return (
        <li className={cn(
          "leading-relaxed pl-1",
          isUser ? "text-primary-foreground" : "text-foreground",
          !isOrdered && "list-disc"
        )}>
          {children}
        </li>
      );
    },
    // Nice code blocks
    pre: ({ children }) => (
      <pre className={cn(
        "my-3 rounded-xl p-4 text-sm overflow-x-auto",
        isUser ? "bg-primary-foreground/10" : "bg-muted/70"
      )}>
        {children}
      </pre>
    ),
    code: ({ children, className }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className={cn(
            "px-1.5 py-0.5 rounded-md text-sm font-mono",
            isUser ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
          )}>
            {children}
          </code>
        );
      }
      return <code className="font-mono text-sm">{children}</code>;
    },
    // Better paragraphs
    p: ({ children }) => (
      <p className={cn(
        "leading-relaxed [&:not(:last-child)]:mb-3",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </p>
    ),
    // Headers
    h1: ({ children }) => (
      <h1 className={cn(
        "text-xl font-bold mb-3 mt-4 first:mt-0",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={cn(
        "text-lg font-bold mb-2 mt-4 first:mt-0",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={cn(
        "text-base font-bold mb-2 mt-3 first:mt-0",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </h3>
    ),
    // Bold/Strong
    strong: ({ children }) => (
      <strong className={cn(
        "font-semibold",
        isUser ? "text-primary-foreground" : "text-foreground"
      )}>
        {children}
      </strong>
    ),
    // Links
    a: ({ children, href }) => (
      <a
        href={href}
        className={cn(
          "underline underline-offset-2 hover:no-underline",
          isUser ? "text-primary-foreground" : "text-primary"
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className={cn(
        "border-l-2 pl-4 my-3 italic",
        isUser
          ? "border-primary-foreground/40 text-primary-foreground/90"
          : "border-primary/40 text-muted-foreground"
      )}>
        {children}
      </blockquote>
    ),
    // Horizontal rule
    hr: () => (
      <hr className={cn(
        "my-4 border-t",
        isUser ? "border-primary-foreground/20" : "border-border"
      )} />
    ),
  };

  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
