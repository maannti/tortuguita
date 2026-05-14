"use client"
import { useState } from "react"
import { X, Map } from "lucide-react"
import { startAppTour } from "./app-tour"

const STORAGE_KEY = "tortuguita_tour_dismissed"

export function TourInviteCard() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEY) === "1"
  })

  if (dismissed) return null

  function handleStart() {
    setDismissed(true)
    localStorage.setItem(STORAGE_KEY, "1")
    startAppTour()
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1")
    setDismissed(true)
  }

  return (
    <div className="glass rounded-3xl px-4 py-4 flex items-center gap-3">
      <div className="size-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #FFE5D9 0%, #FFCAD4 100%)" }}>
        <Map className="size-5" style={{ color: "#9D8189" }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Conocé la app
        </p>
        <p className="text-xs text-muted-foreground leading-snug">
          Un tour rápido por cada sección.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleStart}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white active:scale-95 transition-all"
          style={{ background: "#9D8189" }}
        >
          Empezar
        </button>
        <button
          onClick={handleDismiss}
          className="size-7 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground transition-colors active:scale-90"
          aria-label="Cerrar"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
