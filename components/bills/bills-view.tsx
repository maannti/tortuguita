"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, CreditCard, ChevronRight as Arrow } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"

interface RegularBill {
  id: string; label: string; amount: number; budgetDate: string
  billTypeName: string; billTypeColor: string; billTypeIcon: string | null
}
interface CCGroup {
  name: string; color: string; icon: string | null
  monthTotal: number; itemCount: number; activeInstallmentCount: number
}
interface Props {
  month: string; monthKey: string; availableMonths: string[]
  regularBills: RegularBill[]; creditCardGroups: CCGroup[]
  regularTotal: number; ccTotal: number
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function BillsView({ month, monthKey, availableMonths, regularBills, creditCardGroups, regularTotal, ccTotal }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null
  const grandTotal = regularTotal + ccTotal

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
        {/* Credit card groups */}
        {creditCardGroups.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-base font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Tarjetas</h2>
              <span className="text-sm text-muted-foreground">{formatARS(ccTotal)}</span>
            </div>
            <div className="space-y-2">
              {creditCardGroups.map((group) => (
                <Link key={group.name} href="/cuotas"
                  className="flex items-center justify-between glass rounded-2xl px-4 py-3.5 active:scale-[0.99] transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${group.color}22` }}>
                      {group.icon
                        ? <span className="text-xl">{group.icon}</span>
                        : <CreditCard className="h-5 w-5" style={{ color: group.color }} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.activeInstallmentCount > 0
                          ? `${group.activeInstallmentCount} cuota${group.activeInstallmentCount !== 1 ? "s" : ""} activa${group.activeInstallmentCount !== 1 ? "s" : ""}`
                          : `${group.itemCount} gasto${group.itemCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-medium tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                      {formatARS(group.monthTotal)}
                    </span>
                    <Arrow className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Regular bills */}
        {regularBills.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-base font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Gastos fijos</h2>
              <span className="text-sm text-muted-foreground">{formatARS(regularTotal)}</span>
            </div>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
              {regularBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: bill.billTypeColor }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{bill.label}</p>
                      <p className="text-xs text-muted-foreground">{bill.billTypeName} · {bill.budgetDate}</p>
                    </div>
                  </div>
                  <span className="text-base font-medium tabular-nums ml-3 flex-shrink-0" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                    {formatARS(bill.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {regularBills.length === 0 && creditCardGroups.length === 0 && (
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
