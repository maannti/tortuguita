"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { User, Home, Check, Layers } from "lucide-react"
import { LogoWordmark } from "@/components/ui/logo"
import { useSpaces } from "@/lib/spaces-context"
import { cn } from "@/lib/utils"

// Brand colours (from design palette)
const MAUVE = "#9D8189"
const MAUVE_DARK = "#4A3540"

export function SimpleHeader() {
  const router = useRouter()
  const { spaces, activeSpaceIds, toggleSpace, isHydrated } = useSpaces()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onMouse)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onMouse); document.removeEventListener("keydown", onKey) }
  }, [open])

  const handleToggle = (id: string) => {
    toggleSpace(id)
    router.refresh() // re-fetches server components with updated cookie
  }

  const activeCount = spaces.filter(s => activeSpaceIds.has(s.id)).length
  const showSpaces = spaces.length > 1 && isHydrated

  return (
    <header
      className="sticky top-0 z-30 px-4"
      style={{
        background: "rgba(253,250,249,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
      }}
    >
      <div className="flex h-14 items-center justify-between">
        <Link href="/dashboard">
          <LogoWordmark />
        </Link>

        {/* Space selector — compact dropdown trigger */}
        {showSpaces && (
          <div ref={wrapperRef} className="relative">
            {/* Trigger button */}
            <button
              onClick={() => setOpen(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
                open
                  ? "text-white"
                  : "text-[#9D8189] hover:opacity-80"
              )}
              style={open
                ? { backgroundColor: MAUVE }
                : { backgroundColor: `${MAUVE}18`, border: `1.5px solid ${MAUVE}40` }
              }
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span>{activeCount}/{spaces.length}</span>
            </button>

            {/* Dropdown panel */}
            {open && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] min-w-[200px] rounded-2xl p-1.5 z-50 shadow-xl"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 8px 32px rgba(157,129,137,0.18), 0 2px 8px rgba(157,129,137,0.10)",
                }}
              >
                {spaces.map(space => {
                  const active = activeSpaceIds.has(space.id)
                  return (
                    <button
                      key={space.id}
                      onClick={() => handleToggle(space.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] text-left"
                      style={active
                        ? { backgroundColor: `${MAUVE}14` }
                        : { backgroundColor: "transparent" }
                      }
                    >
                      {/* Space icon */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={active
                          ? { backgroundColor: MAUVE }
                          : { backgroundColor: `${MAUVE}22` }
                        }
                      >
                        {space.isPersonal
                          ? <User className="h-3.5 w-3.5" style={{ color: active ? "#fff" : MAUVE }} />
                          : <Home className="h-3.5 w-3.5" style={{ color: active ? "#fff" : MAUVE }} />}
                      </div>

                      {/* Name */}
                      <span
                        className="flex-1 text-sm font-medium truncate"
                        style={{ color: active ? MAUVE_DARK : "#9D8189" }}
                      >
                        {space.name}
                      </span>

                      {/* Checkmark */}
                      {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: MAUVE }} />}
                    </button>
                  )
                })}

                {/* Footer hint */}
                <p className="text-[10px] text-center pb-1 pt-0.5" style={{ color: `${MAUVE}90` }}>
                  Toca para activar o desactivar
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
