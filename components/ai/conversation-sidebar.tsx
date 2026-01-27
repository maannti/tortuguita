"use client";

import { useState, useRef } from "react";
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

interface SwipeState {
  id: string | null;
  startX: number;
  currentX: number;
  swiping: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const swipeRef = useRef<SwipeState>({ id: null, startX: 0, currentX: 0, swiping: false });

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      const response = await fetch(`/api/ai/conversations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSwipedId(null);
        onDeleteConversation?.(id);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    // Close any other swiped item
    if (swipedId && swipedId !== id) {
      setSwipedId(null);
    }
    swipeRef.current = {
      id,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      swiping: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    if (swipeRef.current.id !== id) return;

    const currentX = e.touches[0].clientX;
    const deltaX = currentX - swipeRef.current.startX;

    // Only allow left swipe
    if (deltaX < -10) {
      swipeRef.current.swiping = true;
      swipeRef.current.currentX = currentX;

      // Update the element transform directly for smooth animation
      const element = e.currentTarget as HTMLElement;
      const translateX = Math.max(deltaX, -80); // Limit swipe distance
      element.style.transform = `translateX(${translateX}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (swipeRef.current.id !== id) return;

    const element = e.currentTarget as HTMLElement;
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;

    // If swiped far enough, keep it open
    if (deltaX < -40) {
      element.style.transform = "translateX(-72px)";
      setSwipedId(id);
    } else {
      element.style.transform = "translateX(0)";
      setSwipedId(null);
    }

    swipeRef.current = { id: null, startX: 0, currentX: 0, swiping: false };
  };

  const handleClick = (id: string) => {
    // If this item is swiped open, close it instead of selecting
    if (swipedId === id) {
      setSwipedId(null);
      return;
    }
    // If we were swiping, don't trigger click
    if (swipeRef.current.swiping) return;

    onSelectConversation(id);
  };

  // Close swiped item when clicking elsewhere
  const handleContainerClick = () => {
    if (swipedId) {
      setSwipedId(null);
    }
  };

  return (
    <Card className="w-64 p-4 flex flex-col gap-4 h-full">
      <Button onClick={onNewConversation} className="w-full">
        <PlusIcon className="h-4 w-4 mr-2" />
        New Chat
      </Button>

      <div className="space-y-2 overflow-y-auto flex-1" onClick={handleContainerClick}>
        {conversations.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="relative overflow-hidden rounded-lg">
              {/* Delete button behind */}
              <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-destructive rounded-r-lg">
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="w-full h-full flex items-center justify-center"
                >
                  <TrashIcon className="h-5 w-5 text-destructive-foreground" />
                </button>
              </div>

              {/* Swipeable conversation item */}
              <div
                onClick={() => handleClick(conv.id)}
                onTouchStart={(e) => handleTouchStart(e, conv.id)}
                onTouchMove={(e) => handleTouchMove(e, conv.id)}
                onTouchEnd={(e) => handleTouchEnd(e, conv.id)}
                style={{
                  transform: swipedId === conv.id ? "translateX(-72px)" : "translateX(0)",
                }}
                className={cn(
                  "relative w-full text-left p-3 rounded-lg transition-colors group cursor-pointer bg-background",
                  "transition-transform duration-200 ease-out",
                  currentConversationId === conv.id && "bg-muted",
                  currentConversationId !== conv.id && "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquareIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{conv.title || "New conversation"}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(conv.updatedAt), "MMM d")} • {conv._count.messages} messages
                    </div>
                  </div>
                  {/* Desktop: show delete on hover */}
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <TrashIcon className="h-4 w-4 text-destructive hover:text-destructive/80" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
