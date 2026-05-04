"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User, Home } from "lucide-react"
import { LogoWordmark } from "@/components/ui/logo"
import { useSpaces } from "@/lib/spaces-context"
import { cn } from "@/lib/utils"

export function SimpleHeader() {
  const router = useRouter()
  const { spaces, activeSpaceIds, toggleSpace, isHydrated } = useSpaces()

  const handleToggle = (id: string) => {
    toggleSpace(id)
    // Re-fetch server components so bills/dashboard reflect the new selection immediately
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-30 px-4"
      style={{
        background: "rgba(253,250,249,0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
      }}
    >
      <div className="flex h-14 items-center justify-between">
        <Link href="/dashboard">
          <LogoWordmark />
        </Link>

        {/* Space toggle pills — right side of header, only when >1 space */}
        {spaces.length > 1 && isHydrated && (
          <div className="flex items-center gap-1">
            {spaces.map(space => {
              const active = activeSpaceIds.has(space.id)
              return (
                <button
                  key={space.id}
                  onClick={() => handleToggle(space.id)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {space.isPersonal
                    ? <User className="h-3 w-3 shrink-0" />
                    : <Home className="h-3 w-3 shrink-0" />}
                  <span>{space.name.split(" ")[0]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
