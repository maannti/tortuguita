"use client"

import { useRouter } from "next/navigation"
import { TurtleIcon } from "@/components/ai/turtle-icon"

export interface InsightData {
  thisMonthTotal: number
  lastMonthTotal: number
  topCategory: { name: string; amount: number } | null
  monthName: string
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }

function buildInsight(data: InsightData): string {
  const { thisMonthTotal, lastMonthTotal, topCategory } = data

  if (thisMonthTotal === 0) {
    return "Todavía no hay gastos este mes. ¿Empezamos a registrar?"
  }

  const topCatStr = topCategory ? ` ${topCategory.name} lidera con ${formatARS(topCategory.amount)}.` : ""

  if (lastMonthTotal === 0) {
    return `Este mes llevás ${formatARS(thisMonthTotal)} en gastos.${topCatStr}`
  }

  const pct = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)

  if (pct > 25) {
    return `Gastás bastante más que el mes pasado (+${pct}%).${topCatStr}`
  }
  if (pct > 8) {
    return `Un poco más que el mes pasado (+${pct}%).${topCatStr}`
  }
  if (pct < -10) {
    return `Vas más tranquilo que el mes pasado (${pct}%).${topCatStr}`
  }
  return `Tu gasto va similar al mes pasado.${topCatStr}`
}

const QUICK_QUESTIONS = [
  "¿En qué gasté más este mes?",
  "Comparame con el mes pasado",
  "¿Cómo viene el gasto de cada uno?",
]

export function AiInsightWidget({ data }: { data: InsightData }) {
  const router = useRouter()
  const insight = buildInsight(data)

  function goToAi(question?: string) {
    if (question) {
      try { sessionStorage.setItem("pendingQuestion", question) } catch {}
    }
    router.push("/ai")
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
    >
      <div className="px-4 pt-4 pb-3 space-y-3">

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-white/50 flex items-center justify-center flex-shrink-0">
            <TurtleIcon className="size-3.5 text-[#9D8189]" />
          </div>
          <span className="text-xs font-semibold text-[#6B5159] uppercase tracking-wider">Tortuguita IA</span>
        </div>

        {/* Insight text */}
        <p className="text-sm text-[#4A3540] leading-snug font-medium">
          {insight}
        </p>

        {/* Quick question chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => goToAi(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/50 text-[#4A3540] hover:bg-white/70 active:scale-95 transition-all font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => goToAi()}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6B5159] hover:text-[#4A3540] active:scale-95 transition-all"
          >
            Preguntar algo
            <span className="text-[10px]">→</span>
          </button>
        </div>

      </div>
    </div>
  )
}
