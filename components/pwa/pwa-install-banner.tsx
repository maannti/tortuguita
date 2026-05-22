"use client"
import { useState, useEffect } from "react"
import { Smartphone, X, ChevronRight } from "lucide-react"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import { PwaInstallSheet } from "@/components/pwa/pwa-install-sheet"

const DISMISSED_KEY = "pwa-banner-dismissed"

export function PwaInstallBanner() {
  const { canInstall, isIOS, isInstalled, showIOSInstructions, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true) // start hidden, reveal after mount
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_KEY)
      setDismissed(saved === "true")
    } catch {
      setDismissed(false)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISSED_KEY, "true") } catch {}
  }

  // Hide if: already installed, dismissed, or no reason to show
  if (isInstalled || dismissed || (!canInstall && !showIOSInstructions)) return null

  return (
    <>
      <div className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 2px 12px rgba(157,129,137,0.10)",
        }}
      >
        <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(157,129,137,0.12)" }}>
          <Smartphone className="size-4.5" style={{ color: "#9D8189" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Guardá la app en tu inicio</p>
          <p className="text-xs text-muted-foreground mt-0.5">Accedé más rápido sin el navegador</p>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-0.5 text-xs font-medium active:scale-95 transition-all flex-shrink-0"
          style={{ color: "#9D8189" }}
        >
          Ver <ChevronRight className="size-3" />
        </button>
        <button
          onClick={dismiss}
          className="size-6 flex items-center justify-center rounded-full active:scale-90 transition-all flex-shrink-0"
          style={{ color: "#9D8189" }}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <PwaInstallSheet
        isOpen={sheetOpen}
        onClose={() => { setSheetOpen(false); if (!isIOS) dismiss() }}
        isIOS={isIOS}
        install={install}
      />
    </>
  )
}
