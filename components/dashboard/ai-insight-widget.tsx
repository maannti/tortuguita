"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

  return (
    <div
      className="rounded-3xl overflow-hidden flex"
      style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
    >
      {/* ── Left: content ── */}
      <div className="flex-1 min-w-0 px-4 pt-3.5 pb-3.5 space-y-2.5">

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
            <TurtleIcon className="size-3 text-[#9D8189]" />
          </div>
          <span
            className="text-xs font-semibold italic text-[#6B5159]"
            style={{ fontFamily: "var(--font-fraunces, serif)" }}
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
          <p className="text-sm text-[#4A3540] leading-snug font-medium">{insight}</p>

        </button>

        {/* Quick question chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => goToAi(q)}
              className="text-xs px-2.5 py-1 rounded-full bg-white/50 text-[#4A3540] hover:bg-white/70 active:scale-95 transition-all font-medium"
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
        <ChevronRight className="size-4 text-[#9D8189]" strokeWidth={2} />
      </button>

    </div>
  )
}
