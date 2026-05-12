"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Plus, CreditCard, ChevronDown } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { cn } from "@/lib/utils"

interface BillItem {
  id: string; label: string; amount: number; amountUSD: number | null; paymentDate: string
  cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
}
interface CategoryGroup {
  name: string; color: string; icon: string | null; total: number; totalUSD: number | null; bills: BillItem[]
}
interface Props {
  month: string; monthKey: string; availableMonths: string[]
  categoryGroups: CategoryGroup[]
  grandTotal: number
  hasAnyUSD: boolean
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 })
const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatARS(n: number) { return arsFormatter.format(n) }
function formatUSD(n: number) { return usdFormatter.format(n) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function BillsView({ month, monthKey, availableMonths, categoryGroups, grandTotal, hasAnyUSD }: Props) {
  const { push } = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [showUSD, setShowUSD] = useState(false)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  // Fetch exchange rate only when needed
  useEffect(() => {
    if (!showUSD || !hasAnyUSD) return
    if (usdRate !== null) return
    fetch("/api/exchange-rate")
      .then(r => r.json())
      .then(d => { if (d.rate) setUsdRate(d.rate) })
      .catch(() => {})
  }, [showUSD, hasAnyUSD, usdRate])

  function billUSDDisplay(bill: BillItem): string | null {
    if (!showUSD) return null
    if (bill.amountUSD !== null) return formatUSD(bill.amountUSD)
    if (usdRate) return `≈ ${formatUSD(bill.amount / usdRate)}`
    return null
  }

  function groupUSDDisplay(group: CategoryGroup): string | null {
    if (!showUSD) return null
    if (group.totalUSD !== null) return formatUSD(group.totalUSD)
    if (usdRate) return `≈ ${formatUSD(group.total / usdRate)}`
    return null
  }

  const grandTotalUSD = showUSD
    ? categoryGroups.reduce((s, g) => {
        if (g.totalUSD !== null) return s + g.totalUSD
        if (usdRate) return s + g.total / usdRate
        return s
      }, 0)
    : null

  return (
    <div className="pb-28">
      {/* Gradient header card */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="relative rounded-3xl overflow-hidden px-5 py-4"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button onClick={() => prevMonth && push(`/bills?month=${prevMonth}`)} disabled={!prevMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronLeft className="size-4 text-[#6B5159]" />
            </button>
            <div className="text-center space-y-0.5">
              <button
                onClick={() => setShowPicker(true)}
                className="font-medium text-[#6B5159] px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)", fontSize: "1.05rem" }}
              >
                {capitalize(month)}
              </button>
              {grandTotal > 0 && (
                <p
                  className="text-2xl font-medium text-[#4A3540] leading-tight"
                  style={{ fontFamily: "var(--font-fraunces, serif)" }}
                >
                  {showUSD && grandTotalUSD !== null ? formatUSD(grandTotalUSD) : formatARS(grandTotal)}
                </p>
              )}
              {/* ARS / USD toggle — only shown when there are USD bills */}
              {hasAnyUSD && (
                <div className="flex items-center justify-center pt-1">
                  <div className="flex rounded-full bg-white/40 backdrop-blur-sm p-0.5">
                    <button
                      onClick={() => setShowUSD(false)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${!showUSD ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      ARS
                    </button>
                    <button
                      onClick={() => setShowUSD(true)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${showUSD ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      USD
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => nextMonth && push(`/bills?month=${nextMonth}`)} disabled={!nextMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronRight className="size-4 text-[#6B5159]" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {categoryGroups.length > 0 ? (
          categoryGroups.map((group) => {
            const usdLabel = groupUSDDisplay(group)
            const isCollapsed = collapsedCategories.has(group.name)
            const toggleCollapse = () => setCollapsedCategories(prev => {
              const next = new Set(prev)
              if (next.has(group.name)) next.delete(group.name)
              else next.add(group.name)
              return next
            })
            return (
              <section key={group.name}>
                {/* Category header */}
                <button
                  onClick={toggleCollapse}
                  className="w-full flex items-center justify-between mb-2.5 px-1 active:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${group.color}22` }}
                    >
                      {group.icon
                        ? <span className="text-sm leading-none">{group.icon}</span>
                        : <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                      }
                    </div>
                    <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                      {group.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {showUSD && usdLabel ? usdLabel : formatARS(group.total)}
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isCollapsed && "-rotate-90")} />
                  </div>
                </button>

                {/* Bills list */}
                {!isCollapsed && <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
                  {group.bills.map((bill) => {
                    const usdBill = billUSDDisplay(bill)
                    return (
                      <Link
                        key={bill.id}
                        href={`/bills/${bill.id}`}
                        className="flex items-center justify-between px-4 py-3.5 active:bg-white/20 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{bill.label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{bill.paymentDate}</span>
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
                          <div className="text-right">
                            <p className="text-base font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                              {showUSD && usdBill ? usdBill : formatARS(bill.amount)}
                            </p>
                            {/* Secondary line: show ARS when in USD mode (or vice versa) */}
                            {showUSD && usdBill && (
                              <p className="text-[10px] text-muted-foreground">{formatARS(bill.amount)}</p>
                            )}
                            {!showUSD && bill.amountUSD && (
                              <p className="text-[10px] text-muted-foreground">{formatUSD(bill.amountUSD)}</p>
                            )}
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </Link>
                    )
                  })}
                </div>}
              </section>
            )
          })
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🐢</div>
            <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Sin gastos este mes</p>
            <p className="text-sm text-muted-foreground mb-6">¡La tortuguita descansa!</p>
            <Link href="/bills/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform">
              <Plus className="size-4" />Agregar gasto
            </Link>
          </div>
        )}
      </div>

      <Link href="/bills/new"
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Plus className="size-6" />
      </Link>

      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => push(`/bills?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
