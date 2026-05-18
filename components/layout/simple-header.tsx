"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { User, Home, Check, Bell } from "lucide-react"
import { LogoWordmark } from "@/components/ui/logo"
import { useSpaces } from "@/lib/spaces-context"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { cn } from "@/lib/utils"
import { NotificationTray } from "@/components/layout/notification-tray"

// Pages where the global space selector should be hidden (form has its own)
const HIDE_SELECTOR_PATHS = ["/bills/new", "/tarjetas/new"]
function hideSelector(pathname: string) {
  return HIDE_SELECTOR_PATHS.some(p => pathname === p) ||
    /^\/bills\/[^/]+\/edit$/.test(pathname)
}

const MAUVE = "#9D8189"
const MAUVE_DARK = "#4A3540"

export function SimpleHeader() {
  const { refresh } = useRouter()
  const pathname = usePathname()
  const { spaces, activeSpaceIds, toggleSpace, isHydrated } = useSpaces()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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
    refresh()
  }

  const showSpaces = spaces.length > 1 && isHydrated && !hideSelector(pathname)
  const { isEnabled: notifEnabled, isSupported: notifSupported } = usePushNotifications()
  const [trayOpen, setTrayOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count on mount
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setUnreadCount(data.unreadCount ?? 0)
      })
      .catch(() => {})
  }, [])

  return (
    <>
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

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          {notifSupported && (
            <button
              onClick={() => setTrayOpen(true)}
              className="relative flex items-center justify-center size-9 rounded-full transition-all active:scale-90"
              style={{ backgroundColor: unreadCount > 0 ? `${MAUVE}15` : `${MAUVE}08` }}
              aria-label="Notificaciones"
            >
              <Bell
                className="size-4.5"
                style={{ color: notifEnabled ? MAUVE : `${MAUVE}60` }}
                fill={notifEnabled ? MAUVE : "none"}
                strokeWidth={notifEnabled ? 0 : 1.8}
              />
              {unreadCount > 0 ? (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                  style={{ backgroundColor: "#F4ACB7" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : !notifEnabled && (
                <span
                  className="absolute top-1.5 right-1.5 size-1.5 rounded-full"
                  style={{ backgroundColor: "#F4ACB7" }}
                />
              )}
            </button>
          )}
          <NotificationTray
            isOpen={trayOpen}
            onClose={() => setTrayOpen(false)}
            onRead={() => setUnreadCount(0)}
          />

          {showSpaces && (
          <div ref={wrapperRef} className="relative">
            {/* Trigger: colored dots — active = solid mauve, inactive = ghost */}
            <button
              data-tour="space-selector"
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-full transition-all active:scale-95"
              style={open
                ? { backgroundColor: `${MAUVE}18`, border: `1.5px solid ${MAUVE}50` }
                : { backgroundColor: `${MAUVE}10`, border: `1.5px solid ${MAUVE}25` }
              }
            >
              <div className="flex items-center gap-1.5">
                {spaces.map(s => (
                  <div
                    key={s.id}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: activeSpaceIds.has(s.id) ? MAUVE : `${MAUVE}30`,
                      transform: activeSpaceIds.has(s.id) ? "scale(1)" : "scale(0.75)",
                    }}
                  />
                ))}
              </div>
            </button>

            {/* Dropdown */}
            {open && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] min-w-[210px] rounded-2xl p-1.5 z-50"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  boxShadow: "0 8px 32px rgba(157,129,137,0.18), 0 2px 8px rgba(157,129,137,0.10)",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider px-3 pt-2 pb-1.5" style={{ color: `${MAUVE}80` }}>
                  Espacios
                </p>
                {spaces.map(space => {
                  const active = activeSpaceIds.has(space.id)
                  return (
                    <button
                      key={space.id}
                      onClick={() => handleToggle(space.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] text-left"
                      style={active ? { backgroundColor: `${MAUVE}12` } : {}}
                    >
                      <div
                        className="size-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ backgroundColor: active ? MAUVE : `${MAUVE}20` }}
                      >
                        {space.isPersonal
                          ? <User className="h-3.5 w-3.5" style={{ color: active ? "#fff" : MAUVE }} />
                          : <Home className="h-3.5 w-3.5" style={{ color: active ? "#fff" : MAUVE }} />}
                      </div>
                      <span
                        className="flex-1 text-sm font-medium truncate"
                        style={{ color: active ? MAUVE_DARK : `${MAUVE}90` }}
                      >
                        {space.name}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: MAUVE }} />}
                    </button>
                  )
                })}
                <p className="text-[10px] text-center py-1.5" style={{ color: `${MAUVE}60` }}>
                  Toca para activar · desactivar
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </header>
    <NotificationTray isOpen={trayOpen} onClose={() => setTrayOpen(false)} onRead={() => setUnreadCount(0)} />
    </>
  )
}
