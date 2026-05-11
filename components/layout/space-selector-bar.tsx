"use client"

import { usePathname } from "next/navigation"
import { useSpaces } from "@/lib/spaces-context"
import { cn } from "@/lib/utils"
import { User, Home } from "lucide-react"

export function SpaceSelectorBar() {
  const pathname = usePathname()
  const { spaces, activeSpaceIds, toggleSpace, isHydrated } = useSpaces()

  // Hidden on dashboard (has its own inline toggle) and when only 1 space
  if (spaces.length <= 1 || pathname === "/dashboard" || !isHydrated) return null

  return (
    // Positioned just above the floating pill nav (nav: bottom-4 + h-16 = 80px, so we sit at 88px)
    <div className="fixed bottom-[88px] left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div
        className="flex gap-1 pointer-events-auto px-3 py-1.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 2px 16px rgba(157,129,137,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
          border: "1px solid rgba(255,255,255,0.75)",
        }}
      >
        {spaces.map(space => {
          const active = activeSpaceIds.has(space.id)
          return (
            <button
              key={space.id}
              onClick={() => toggleSpace(space.id)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {space.isPersonal
                ? <User className="size-3" />
                : <Home className="size-3" />}
              <span>{space.name.split(" ")[0]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
