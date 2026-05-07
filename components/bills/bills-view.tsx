"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, CreditCard } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"

interface BillItem {
  id: string; label: string; amount: number; budgetDate: string
  cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
}
interface CategoryGroup {
  name: string; color: string; icon: string | null; total: number; bills: BillItem[]
}
interface Props {
  month: string; monthKey: string; availableMonths: string[]
  categoryGroups: CategoryGroup[]
  grandTotal: number
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function BillsView({ month, monthKey, availableMonths, categoryGroups, grandTotal }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  return (
    <div className="pb-28">
      {/* Gradient header card */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="relative rounded-3xl overflow-hidden px-5 py-4"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button onClick={() => prevMonth && router.push(`/bills?month=${prevMonth}`)} disabled={!prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronLeft className="h-4 w-4 text-[#6B5159]" />
            </button>
            <div className="text-center">
              <button
                onClick={() => setShowPicker(true)}
                className="font-medium text-[#6B5159] px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)", fontSize: "1.05rem" }}
              >
                {capitalize(month)}
              </button>
              {grandTotal > 0 && (
                <p
                  className="text-2xl font-medium text-[#4A3540] leading-tight mt-0.5"
                  style={{ fontFamily: "var(--font-fraunces, serif)" }}
                >
                  {formatARS(grandTotal)}
                </p>
              )}
            </div>
            <button onClick={() => nextMonth && router.push(`/bills?month=${nextMonth}`)} disabled={!nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronRight className="h-4 w-4 text-[#6B5159]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {categoryGroups.length > 0 ? (
          categoryGroups.map((group) => (
            <section key={group.name}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${group.color}22` }}
                  >
                    {group.icon
                      ? <span className="text-sm leading-none">{group.icon}</span>
                      : <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                    }
                  </div>
                  <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                    {group.name}
                  </h2>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{formatARS(group.total)}</span>
              </div>

              {/* Bills list */}
              <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
                {group.bills.map((bill) => (
                  <Link
                    key={bill.id}
                    href={`/bills/${bill.id}`}
                    className="flex items-center justify-between px-4 py-3.5 active:bg-white/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{bill.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{bill.budgetDate}</span>
                        {bill.totalInstallments && bill.totalInstallments > 1 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {bill.currentInstallment}/{bill.totalInstallments}
                          </span>
                        )}
                        {bill.cardName && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <CreditCard className="h-2.5 w-2.5" />{bill.cardName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <span className="text-base font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                        {formatARS(bill.amount)}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🐢</div>
            <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Sin gastos este mes</p>
            <p className="text-sm text-muted-foreground mb-6">¡La tortuguita descansa!</p>
            <Link href="/bills/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform">
              <Plus className="h-4 w-4" />Agregar gasto
            </Link>
          </div>
        )}
      </div>

      <Link href="/bills/new"
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </Link>

      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => router.push(`/bills?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
