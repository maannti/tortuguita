"use client"
import { CardIcon, isNetworkId, NetworkId, BANKS } from "@/components/ui/card-network"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"

interface Member { id: string; name: string; expenses: number; income: number; percentage: number }
interface FixedExpense { id: string; label: string; amount: number; billTypeName: string; billTypeColor: string; billTypeIcon: string | null }
interface CreditCardGroup { name: string; color: string; icon: string | null; totalAmount: number; memberAmounts: Array<{ name: string; amount: number }>; bills: Array<{ id: string; label: string; amount: number; currentInstallment: number | null; totalInstallments: number | null }> }

interface Props { month: string; monthKey: string; availableMonths: string[]; totalAmount: number; members: Member[]; fixedExpenses: FixedExpense[]; creditCardGroups: CreditCardGroup[] }

function formatARS(n: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function HomeDashboard({ month, monthKey, availableMonths, totalAmount, members, fixedExpenses, creditCardGroups }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null
  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="pb-28">
      {/* ── Hero card ── */}
      <div className="px-4 pt-5 pb-2">
        <div className="relative rounded-3xl overflow-hidden" style={{
          background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)",
        }}>
          {/* Decorative orb */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-24 rounded-full bg-[#F4ACB7]/20 blur-xl pointer-events-none" />

          <div className="relative px-5 pt-5 pb-4 space-y-4">
            {/* Month nav inside hero */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => prevMonth && router.push(`/dashboard?month=${prevMonth}`)}
                disabled={!prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-[#6B5159]" />
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="text-sm font-medium text-[#6B5159] px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {capitalize(month)}
              </button>
              <button
                onClick={() => nextMonth && router.push(`/dashboard?month=${nextMonth}`)}
                disabled={!nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
              >
                <ChevronRight className="h-4 w-4 text-[#6B5159]" />
              </button>
            </div>

            {/* Big total */}
            <div>
              <p className="text-[11px] font-medium text-[#9D8189] uppercase tracking-wide mb-1">Total del mes</p>
              <p
                className="text-5xl font-medium text-[#4A3540] leading-none tracking-tight"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {formatARS(totalAmount)}
              </p>
            </div>

            {/* Member split */}
            {members.length > 0 && (
              <div className="grid gap-3 pt-1" style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}>
                {members.map((member) => (
                  <div key={member.id} className="flex-1 bg-white/35 backdrop-blur-sm rounded-2xl px-3 py-2.5">
                    <p className="text-[11px] font-medium text-[#9D8189]">{member.name.split(" ")[0]}</p>
                    <p
                      className="text-xl font-medium text-[#4A3540] leading-tight mt-0.5"
                      style={{ fontFamily: "var(--font-fraunces, serif)" }}
                    >
                      {formatARS(member.expenses)}
                    </p>
                    {member.percentage > 0 && (
                      <p className="text-[10px] text-[#9D8189] mt-0.5">{Math.round(member.percentage)}% ingresos</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div className="px-4 pt-3 space-y-5">

        {/* Fixed expenses */}
        {fixedExpenses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2
                className="text-base font-medium text-foreground"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                Gastos fijos
              </h2>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(fixedTotal)}</span>
            </div>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
              {fixedExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: expense.billTypeColor }} />
                    <div>
                      <p className="text-sm font-medium">{expense.label}</p>
                      <p className="text-xs text-muted-foreground">{expense.billTypeName}</p>
                    </div>
                  </div>
                  <span
                    className="text-base font-medium tabular-nums text-foreground"
                    style={{ fontFamily: "var(--font-fraunces, serif)" }}
                  >
                    {formatARS(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Credit card groups */}
        {creditCardGroups.map((group) => (
          <section key={group.name}>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-3">
                <CardIcon
                  bankId={BANKS.find(b => b.color === group.color)?.id ?? null}
                  bankColor={group.color}
                  bankName={group.name}
                  network={isNetworkId(group.icon) ? group.icon as NetworkId : null}
                  size="sm"
                />
                <h2
                  className="text-base font-medium text-foreground"
                  style={{ fontFamily: "var(--font-fraunces, serif)" }}
                >
                  {group.name}
                </h2>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(group.totalAmount)}</span>
            </div>
            <div className="glass rounded-2xl overflow-hidden">
              {group.memberAmounts.length > 1 && (
                <div className="grid border-b border-white/60 bg-white/20" style={{ gridTemplateColumns: `repeat(${group.memberAmounts.length}, 1fr)` }}>
                  {group.memberAmounts.map((m) => (
                    <div key={m.name} className="px-4 py-2.5 text-center border-r border-white/50 last:border-r-0">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{m.name}</p>
                      <p
                        className="text-sm font-medium mt-0.5"
                        style={{ fontFamily: "var(--font-fraunces, serif)" }}
                      >
                        {formatARS(m.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="divide-y divide-white/60">
                {group.bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{bill.label}</p>
                      {bill.totalInstallments && bill.totalInstallments > 1 && (
                        <p className="text-xs text-muted-foreground">Cuota {bill.currentInstallment} de {bill.totalInstallments}</p>
                      )}
                    </div>
                    <span
                      className="text-base font-medium tabular-nums"
                      style={{ fontFamily: "var(--font-fraunces, serif)" }}
                    >
                      {formatARS(bill.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Empty state */}
        {totalAmount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🐢</div>
            <p
              className="text-lg font-medium text-foreground mb-1"
              style={{ fontFamily: "var(--font-fraunces, serif)" }}
            >
              Sin gastos este mes
            </p>
            <p className="text-sm text-muted-foreground mb-6">¡La tortuguita descansa!</p>
            <Link
              href="/bills/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />Agregar gasto
            </Link>
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/bills/new"
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {/* Month picker */}
      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => router.push(`/dashboard?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
