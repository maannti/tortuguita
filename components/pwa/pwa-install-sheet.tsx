"use client"
import { useState, useRef } from "react"
import { X, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  isIOS: boolean
  install: () => void
}

// ── Illustrated steps for iOS ───────────────────────────────────────────────

function ShareButtonIllustration() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Phone mockup */}
      <div
        className="relative flex flex-col"
        style={{
          width: 160,
          height: 280,
          borderRadius: 28,
          border: "2.5px solid rgba(74,53,64,0.18)",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 32px rgba(74,53,64,0.10)",
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span style={{ fontSize: 9, color: "#4A3540", fontWeight: 600 }}>9:41</span>
          <div className="flex gap-1 items-center">
            <div style={{ width: 12, height: 7, borderRadius: 2, border: "1.5px solid #4A3540", position: "relative" }}>
              <div style={{ position: "absolute", left: 1, top: 1, right: 1, bottom: 1, background: "#4A3540", borderRadius: 1 }} />
            </div>
          </div>
        </div>
        {/* URL bar */}
        <div className="mx-3 mb-2 rounded-lg px-2 py-1 flex items-center gap-1" style={{ background: "rgba(74,53,64,0.07)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#9D8189" }} />
          <span style={{ fontSize: 8, color: "#9D8189" }}>tortuguita.ar</span>
        </div>
        {/* Screen content placeholder */}
        <div className="flex-1 mx-3 rounded-lg" style={{ background: "linear-gradient(160deg, #D8E2DC 0%, #FFE5D9 100%)" }}>
          <div className="flex items-center justify-center h-full">
            <span style={{ fontSize: 28 }}>🐢</span>
          </div>
        </div>
        {/* Safari bottom bar with highlighted share button */}
        <div className="flex items-center justify-around px-4 py-2.5">
          {["←", "→", "", "⊡", "⋯"].map((icon, i) =>
            i === 2 ? (
              <div key={i} className="relative flex items-center justify-center">
                {/* Pulse ring */}
                <div className="absolute size-8 rounded-full animate-ping" style={{ background: "#F4ACB7", opacity: 0.4 }} />
                <div className="relative size-7 rounded-full flex items-center justify-center" style={{ background: "#F4ACB7" }}>
                  <ShareSVG />
                </div>
              </div>
            ) : (
              <span key={i} style={{ fontSize: 14, color: "#9D8189", fontWeight: 500 }}>{icon}</span>
            )
          )}
        </div>
      </div>
      <p className="text-sm text-center" style={{ color: "#6B5159" }}>
        Tocá el ícono de compartir<br />en la barra inferior de Safari
      </p>
    </div>
  )
}

function ShareSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A3540" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function AddToHomeIllustration() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Mock iOS share sheet rows */}
      <div
        className="w-56 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(74,53,64,0.12)",
          border: "1px solid rgba(255,255,255,0.8)",
        }}
      >
        {[
          { icon: "✉️", label: "Correo" },
          { icon: "💬", label: "Mensajes" },
          { icon: null, label: "Agregar al inicio", highlighted: true },
          { icon: "📋", label: "Copiar" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom: i < 3 ? "1px solid rgba(74,53,64,0.06)" : "none",
              background: item.highlighted ? "rgba(244,172,183,0.15)" : "transparent",
            }}
          >
            {item.icon ? (
              <span style={{ fontSize: 16 }}>{item.icon}</span>
            ) : (
              <div className="size-6 rounded-lg flex items-center justify-center" style={{ background: "#9D8189" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
            )}
            <span
              style={{
                fontSize: 13,
                fontWeight: item.highlighted ? 600 : 400,
                color: item.highlighted ? "#4A3540" : "#6B5159",
              }}
            >
              {item.label}
            </span>
            {item.highlighted && (
              <div className="ml-auto size-2 rounded-full animate-pulse" style={{ background: "#F4ACB7" }} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-center" style={{ color: "#6B5159" }}>
        Buscá "Agregar al inicio"<br />y luego tocá <strong>Agregar</strong>
      </p>
    </div>
  )
}

// ── Slide data ───────────────────────────────────────────────────────────────

const IOS_SLIDES = [
  {
    gradient: "linear-gradient(160deg, #D8E2DC 0%, #FFE5D9 100%)",
    title: "Guardá tortuguita",
    body: "Instalala en tu pantalla de inicio para acceder más rápido, sin abrir el navegador.",
    illustration: <div className="text-6xl text-center" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}>📲</div>,
  },
  {
    gradient: "linear-gradient(160deg, #FFE5D9 0%, #FFCAD4 100%)",
    title: "1. Tocá Compartir",
    body: null,
    illustration: <ShareButtonIllustration />,
  },
  {
    gradient: "linear-gradient(160deg, #FFCAD4 0%, #F4ACB7 100%)",
    title: '2. "Agregar al inicio"',
    body: null,
    illustration: <AddToHomeIllustration />,
  },
]

// ── Main component ───────────────────────────────────────────────────────────

export function PwaInstallSheet({ isOpen, onClose, isIOS, install }: Props) {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)

  if (!isOpen) return null

  const slides = IOS_SLIDES
  const slide = slides[current]
  const isLast = current === slides.length - 1

  const next = () => {
    if (!isLast) setCurrent(c => c + 1)
    else onClose()
  }
  const prev = () => current > 0 && setCurrent(c => c - 1)

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
  }

  // Android — single slide with native prompt
  if (!isIOS) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "linear-gradient(160deg, #D8E2DC 0%, #FFE5D9 100%)" }}
      >
        <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-32 -left-16 size-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="flex justify-end px-5 pt-12 pb-4">
          <button onClick={onClose} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-black/5 active:scale-95 transition-all" style={{ color: "#6B5159" }}>
            <X className="size-3.5" /> Cerrar
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
          <div className="text-7xl" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}>📲</div>
          <h1 className="text-3xl font-semibold text-[#4A3540] leading-tight" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Instalá la app
          </h1>
          <p className="text-base text-[#6B5159] leading-relaxed max-w-xs">
            Agregá tortuguita a tu pantalla de inicio para una experiencia completa, sin el navegador.
          </p>
        </div>
        <div className="px-6 pb-14">
          <button
            onClick={() => { install(); onClose() }}
            className="w-full py-4 rounded-full text-white text-base font-semibold active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            style={{ background: "#4A3540", fontFamily: "var(--font-fraunces, serif)" }}
          >
            Instalar app
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: slide.gradient }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-32 -left-16 size-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />

      {/* Close */}
      <div className="flex justify-end px-5 pt-12 pb-4">
        <button onClick={onClose} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full hover:bg-black/5 active:scale-95 transition-all" style={{ color: "#6B5159" }}>
          <X className="size-3.5" /> Cerrar
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
        <div>{slide.illustration}</div>
        <h1 className="text-2xl font-semibold text-[#4A3540] leading-tight" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          {slide.title}
        </h1>
        {slide.body && (
          <p className="text-base text-[#6B5159] leading-relaxed max-w-xs">{slide.body}</p>
        )}
      </div>

      {/* Bottom nav */}
      <div className="px-6 pb-14 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={cn("rounded-full transition-all duration-300", i === current ? "w-6 h-2 bg-[#4A3540]" : "w-2 h-2 bg-[#4A3540]/25")}
            />
          ))}
        </div>

        {isLast ? (
          <button
            onClick={onClose}
            className="w-full py-4 rounded-full text-white text-base font-semibold active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            style={{ background: "#4A3540", fontFamily: "var(--font-fraunces, serif)" }}
          >
            Entendido
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              className={cn("px-5 py-3 rounded-full text-sm font-medium hover:bg-black/5 transition-colors active:scale-95", current === 0 && "invisible")}
              style={{ color: "#6B5159" }}
            >
              Anterior
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold active:scale-95 transition-all"
              style={{ background: "rgba(74,53,64,0.9)" }}
            >
              Siguiente <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
