"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const MAUVE = "#9D8189"
const MAUVE_DARK = "#4A3540"
const DUSTY_ROSE = "#F4ACB7"

interface Notification {
  id: string
  title: string
  body: string
  type: string
  readAt: string | null
  createdAt: string
}

interface NotificationTrayProps {
  isOpen: boolean
  onClose: () => void
  onRead?: () => void
}

function groupNotifications(notifications: Notification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const today: Notification[] = []
  const thisWeek: Notification[] = []

  for (const n of notifications) {
    const date = new Date(n.createdAt)
    if (date >= startOfToday) {
      today.push(n)
    } else {
      thisWeek.push(n)
    }
  }

  return { today, thisWeek }
}

function NotificationRow({ notification }: { notification: Notification }) {
  const isUnread = !notification.readAt
  const relativeTime = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: es,
  })

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Unread dot */}
      <div className="flex flex-col items-center pt-1 w-3 flex-shrink-0">
        {isUnread ? (
          <span
            className="size-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: DUSTY_ROSE }}
          />
        ) : (
          <span className="size-2 flex-shrink-0" />
        )}
      </div>

      {/* Icon */}
      <div
        className="size-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${MAUVE}15` }}
      >
        <Bell className="size-3.5" style={{ color: MAUVE }} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug truncate"
          style={{ color: MAUVE_DARK }}
        >
          {notification.title}
        </p>
        <p
          className="text-sm leading-snug mt-0.5"
          style={{ color: `${MAUVE}90` }}
        >
          {notification.body}
        </p>
        <p className="text-xs mt-1" style={{ color: `${MAUVE}60` }}>
          {relativeTime}
        </p>
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-wider px-4 pt-4 pb-1"
      style={{ color: `${MAUVE}70` }}
    >
      {label}
    </p>
  )
}

export function NotificationTray({ isOpen, onClose, onRead }: NotificationTrayProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Mark all as read
    fetch("/api/notifications", { method: "PATCH" })
      .then(() => {
        onRead?.()
      })
      .catch(() => {})
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const { today, thisWeek } = groupNotifications(notifications)
  const hasNotifications = notifications.length > 0

  return (
    <>
      {/* Backdrop — transparent, just catches outside clicks */}
      <div
        className="fixed inset-0 z-40"
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Top sheet — slides down from header */}
      <div
        className="fixed top-14 right-3 z-50 rounded-2xl transition-all duration-300 ease-out"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 32px rgba(157,129,137,0.18), 0 2px 12px rgba(157,129,137,0.10)",
          border: "1px solid rgba(255,255,255,0.8)",
          width: "min(340px, calc(100vw - 24px))",
          maxHeight: "70dvh",
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.97)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2
            className="text-sm font-semibold"
            style={{ color: MAUVE_DARK }}
          >
            Notificaciones
          </h2>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(70dvh - 80px)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="size-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${MAUVE}40`, borderTopColor: "transparent" }}
              />
            </div>
          ) : !hasNotifications ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div
                className="size-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${MAUVE}12` }}
              >
                <Bell className="size-5" style={{ color: `${MAUVE}60` }} strokeWidth={1.5} />
              </div>
              <p className="text-sm" style={{ color: `${MAUVE}70` }}>
                No hay notificaciones recientes
              </p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <SectionLabel label="Hoy" />
                  <div className="divide-y" style={{ borderColor: `${MAUVE}10` }}>
                    {today.map((n) => (
                      <NotificationRow key={n.id} notification={n} />
                    ))}
                  </div>
                </>
              )}
              {thisWeek.length > 0 && (
                <>
                  <SectionLabel label="Esta semana" />
                  <div className="divide-y" style={{ borderColor: `${MAUVE}10` }}>
                    {thisWeek.map((n) => (
                      <NotificationRow key={n.id} notification={n} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Footer link */}
          <div className="px-4 py-4 mt-1">
            <Link
              href="/settings"
              onClick={onClose}
              className="text-xs"
              style={{ color: `${MAUVE}80` }}
            >
              Preferencias de notificaciones →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
