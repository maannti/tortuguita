"use client"
import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

interface Props {
  currentMonthKey: string   // "yyyy-MM"
  onSelect: (monthKey: string) => void
  onClose: () => void
}

export function MonthPicker({ currentMonthKey, onSelect, onClose }: Props) {
  const [selYear, selMonthIdx] = currentMonthKey.split("-").map(Number)
  const [viewYear, setViewYear] = useState(selYear)
  const now = new Date()
  const minYear = now.getFullYear() - 3
  const maxYear = now.getFullYear() + 1

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* Sheet */}
      <div
        className="relative w-full rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 -4px 40px rgba(157,129,137,0.15)",
          border: "1px solid rgba(255,255,255,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewYear(y => Math.max(minYear, y - 1))}
              disabled={viewYear <= minYear}
              className="size-9 flex items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span
              className="text-xl font-medium"
              style={{ fontFamily: "var(--font-fraunces, serif)" }}
            >
              {viewYear}
            </span>
            <button
              onClick={() => setViewYear(y => Math.min(maxYear, y + 1))}
              disabled={viewYear >= maxYear}
              className="size-9 flex items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((month, i) => {
              const key = `${viewYear}-${String(i + 1).padStart(2, "0")}`
              const isSelected = key === currentMonthKey
              const isCurrent = viewYear === now.getFullYear() && i === now.getMonth()
              return (
                <button
                  key={i}
                  onClick={() => { onSelect(key); onClose() }}
                  className={cn(
                    "py-3 rounded-2xl text-sm font-medium transition-all active:scale-95",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : isCurrent
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-black/5 text-foreground"
                  )}
                  style={isSelected || isCurrent ? { fontFamily: "var(--font-fraunces, serif)" } : {}}
                >
                  {month}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
