"use client"
import { useState, useEffect, useCallback } from "react"

type PermissionState = "default" | "granted" | "denied" | "unsupported"

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported")
      return
    }
    setPermission(Notification.permission as PermissionState)
  }, [])

  const enable = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return

    setIsLoading(true)
    try {
      // Dynamically import to avoid SSR issues
      const { requestNotificationPermission } = await import("@/lib/firebase-client")
      const token = await requestNotificationPermission()

      if (token) {
        await fetch("/api/notifications/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        setPermission("granted")
      } else {
        setPermission(Notification.permission as PermissionState)
      }
    } catch (err) {
      console.error("Push notification setup error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disable = useCallback(async () => {
    await fetch("/api/notifications/token", { method: "DELETE" })
    // Note: can't programmatically revoke browser permission — user must do it in browser settings
    setPermission("denied")
  }, [])

  const isSupported = permission !== "unsupported"
  const isEnabled = permission === "granted"

  return { permission, isLoading, isSupported, isEnabled, enable, disable }
}
