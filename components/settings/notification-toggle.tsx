"use client"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { Bell, BellOff, Loader2 } from "lucide-react"

export function NotificationToggle() {
  const { permission, isLoading, isSupported, isEnabled, enable, disable } =
    usePushNotifications()

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50">
        <BellOff className="size-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Notificaciones push</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tu navegador no soporta notificaciones push. Instalá la app para recibirlas.
          </p>
        </div>
      </div>
    )
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50">
        <BellOff className="size-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Notificaciones bloqueadas</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Habilitá los permisos desde la configuración de tu navegador.
          </p>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={isEnabled ? disable : enable}
      disabled={isLoading}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 active:scale-[0.98] transition-all text-left"
    >
      {isLoading ? (
        <Loader2 className="size-5 text-muted-foreground flex-shrink-0 animate-spin" />
      ) : isEnabled ? (
        <Bell className="size-5 text-primary flex-shrink-0" />
      ) : (
        <BellOff className="size-5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Notificaciones push</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isEnabled
            ? "Activadas · vencimientos de tarjeta y recordatorios"
            : "Recibí alertas de vencimientos y gastos recurrentes"}
        </p>
      </div>
      {/* Visual toggle pill */}
      <div
        className={`w-11 h-6 rounded-full flex-shrink-0 transition-colors relative ${
          isEnabled ? "bg-primary" : "bg-muted-foreground/20"
        }`}
      >
        <div
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
            isEnabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  )
}
