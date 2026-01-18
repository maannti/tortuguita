"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusIcon, MessageSquareIcon, TrashIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationSidebarProps {
  conversations: any[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;

    try {
      const response = await fetch(`/api/ai/conversations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDeleteConversation?.(id);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  return (
    <Card className="w-64 p-4 flex flex-col gap-4 h-full">
      <Button onClick={onNewConversation} className="w-full">
        <PlusIcon className="h-4 w-4 mr-2" />
        New Chat
      </Button>

      <div className="space-y-2 overflow-y-auto flex-1">
        {conversations.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer",
                currentConversationId === conv.id && "bg-muted"
              )}
            >
              <div className="flex items-start gap-2">
                <MessageSquareIcon className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{conv.title || "New conversation"}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(conv.updatedAt), "MMM d")} • {conv._count.messages} messages
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <TrashIcon className="h-4 w-4 text-destructive hover:text-destructive/80" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
