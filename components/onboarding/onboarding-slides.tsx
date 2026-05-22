"use client"
import { useState, useRef } from "react"
import { ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const SLIDES = [
  {
    emoji: "🐢",
    title: "Bienvenido a tortuguita",
    body: "Tu app para llevar las finanzas del hogar.\nSimple, sin drama.",
    gradient: "linear-gradient(160deg, #D8E2DC 0%, #FFE5D9 100%)",
    accent: "#4A3540",
  },
  {
    emoji: "👥",
    title: "Gastos compartidos",
    body: "Invitá a tu pareja o familia a tu espacio y ven quién gastó qué cada mes.",
    gradient: "linear-gradient(160deg, #FFE5D9 0%, #FFCAD4 100%)",
    accent: "#4A3540",
  },
  {
    emoji: "📄",
    title: "Importá tus movimientos",
    body: "Subí el resumen de tu banco en PDF o CSV y la app organiza todo automáticamente.",
    gradient: "linear-gradient(160deg, #FFCAD4 0%, #F4ACB7 100%)",
    accent: "#4A3540",
  },
]

interface Props {
  onDone: () => void
}

export function OnboardingSlides({ onDone }: Props) {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)

  const next = () => {
    if (current < SLIDES.length - 1) setCurrent(c => c + 1)
    else onDone()
  }
  const prev = () => current > 0 && setCurrent(c => c - 1)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: slide.gradient }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative orbs */}
      <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-32 -left-16 size-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />

      {/* Skip button */}
      <div className="flex justify-end px-5 pt-12 pb-4">
        <button
          onClick={onDone}
          className="flex items-center gap-1 text-sm font-medium text-[#6B5159]/70 hover:text-[#6B5159] transition-colors px-3 py-1.5 rounded-full hover:bg-black/5 active:scale-95"
        >
          <X className="size-3.5" />
          Saltar
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div
          className="text-7xl mb-8 select-none"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
        >
          {slide.emoji}
        </div>
        <h1
          className="text-3xl font-semibold text-[#4A3540] leading-tight mb-4"
          style={{ fontFamily: "var(--font-fraunces, serif)" }}
        >
          {slide.title}
        </h1>
        <p className="text-base text-[#6B5159] leading-relaxed whitespace-pre-line max-w-xs">
          {slide.body}
        </p>
      </div>

      {/* Bottom nav */}
      <div className="px-6 pb-14 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "w-6 h-2 bg-[#4A3540]"
                  : "w-2 h-2 bg-[#4A3540]/25"
              )}
            />
          ))}
        </div>

        {/* CTA */}
        {isLast ? (
          <button
            onClick={onDone}
            className="w-full py-4 rounded-full bg-[#4A3540] text-white text-base font-semibold active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            style={{ fontFamily: "var(--font-fraunces, serif)" }}
          >
            Empezar
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              className={cn(
                "px-5 py-3 rounded-full text-sm font-medium text-[#6B5159] hover:bg-black/5 transition-colors active:scale-95",
                current === 0 && "invisible"
              )}
            >
              Anterior
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#4A3540]/90 text-white text-sm font-semibold active:scale-95 transition-all"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
