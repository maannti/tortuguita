"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ChevronRight } from "lucide-react"
import { TurtleIcon } from "@/components/ai/turtle-icon"

export interface InsightData {
  insights: string[]
}

const QUICK_QUESTIONS = [
  "¿En qué gasté más?",
  "Comparame con el mes pasado",
  "¿Cómo viene el gasto de cada uno?",
]

export function AiInsightWidget({ data }: { data: InsightData }) {
  const { insights } = data
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  // Pick a random insight on mount; tap to cycle through the rest
  const [idx, setIdx] = useState(() =>
    insights.length > 0 ? Math.floor(Math.random() * insights.length) : 0
  )

  const insight = insights[idx] ?? ""

  function cycleInsight() {
    if (insights.length > 1) setIdx(i => (i + 1) % insights.length)
  }

  function goToAi(question?: string) {
    if (question) {
      try { sessionStorage.setItem("pendingQuestion", question) } catch {}
    }
    router.push("/ai")
  }

  const heroGradient = isDark
    ? "linear-gradient(135deg, #461220 0%, #6B2030 55%, #8C2F39 100%)"
    : "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)"
  const textPrimary   = isDark ? "#FED0BB" : "#4A3540"
  const textSecondary = isDark ? "#FCB9B2" : "#6B5159"
  const textMuted     = isDark ? "#FCB9B2" : "#9D8189"
  const iconBg        = isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.50)"
  const chipBg        = isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.50)"

  return (
    <div
      data-tour="ai-widget"
      className="rounded-3xl overflow-hidden flex"
      style={{ background: heroGradient }}
    >
      {/* ── Left: content ── */}
      <div className="flex-1 min-w-0 px-4 pt-3.5 pb-3.5 space-y-2.5">

        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="size-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            <TurtleIcon className="size-3" />
          </div>
          <span
            className="text-xs font-semibold italic"
            style={{ fontFamily: "var(--font-fraunces, serif)", color: textSecondary }}
          >
            tortuguita IA
          </span>
        </div>

        {/* Insight text — tappable to cycle */}
        <button
          type="button"
          onClick={cycleInsight}
          className="text-left w-full"
          disabled={insights.length <= 1}
        >
          <p className="text-sm leading-snug font-medium" style={{ color: textPrimary }}>{insight}</p>
        </button>

        {/* Quick question chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => goToAi(q)}
              className="text-xs px-2.5 py-1 rounded-full active:scale-95 transition-all font-medium"
              style={{ background: chipBg, color: textPrimary }}
            >
              {q}
            </button>
          ))}
        </div>

      </div>

      {/* ── Right: invisible tap zone → /ai ── */}
      <button
        type="button"
        onClick={() => goToAi()}
        className="w-12 flex-shrink-0 flex items-center justify-center"
        aria-label="Ir al chat de Tortuguita IA"
      >
        <ChevronRight className="size-4" style={{ color: textMuted }} strokeWidth={2} />
      </button>

    </div>
  )
}
