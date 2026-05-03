"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, CreditCard, ChevronLeft, ChevronRight } from "lucide-react"
import { isNetworkId, CardIcon, BANKS, NetworkId } from "@/components/ui/card-network"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MonthPicker } from "@/components/ui/month-picker"

interface InstallmentBill { id: string; amount: number; budgetDate: string; currentInstallment: number; isPast: boolean }
interface InstallmentGroup { groupId: string; label: string; totalInstallments: number; bills: InstallmentBill[]; memberNames: string[] }
interface CardData { typeName: string; typeColor: string; typeIcon: string | null; installmentGroups: InstallmentGroup[]; singleBills: Array<{ id: string; label: string; amount: number; budgetDate: string }>; monthTotal: number }
interface Props {
  cards: CardData[]
  monthLabel: string
  monthKey: string
  prevMonth: string | null
  nextMonth: string | null
}

function formatARS(n: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function CuotasView({ cards, monthLabel, monthKey, prevMonth, nextMonth }: Props) {
  const router = useRouter()
  const [activeCard, setActiveCard] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const current = cards[activeCard]

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
            <button
              onClick={() => prevMonth && router.push(`/cuotas?month=${prevMonth}`)}
              disabled={!prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronLeft className="h-4 w-4 text-[#6B5159]" />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-medium text-[#9D8189] uppercase tracking-wide mb-0.5">Cuotas activas</p>
              <button
                onClick={() => setShowPicker(true)}
                className="font-medium text-[#4A3540] px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)", fontSize: "1.15rem" }}
              >
                {capitalize(monthLabel)}
              </button>
            </div>
            <button
              onClick={() => nextMonth && router.push(`/cuotas?month=${nextMonth}`)}
              disabled={!nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronRight className="h-4 w-4 text-[#6B5159]" />
            </button>
          </div>
        </div>
      </div>

      {/* Card tabs */}
      {cards.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {cards.map((card, i) => (
            <button key={card.typeName} onClick={() => setActiveCard(i)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCard === i
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white/60 backdrop-blur-sm text-muted-foreground border border-white/70 hover:bg-white/80"
              )}>
              <CardIcon
                bankId={BANKS.find(b => b.color === card.typeColor)?.id ?? null}
                bankColor={card.typeColor}
                bankName={card.typeName}
                network={isNetworkId(card.typeIcon) ? card.typeIcon as NetworkId : null}
                size="sm"
              />{card.typeName}
            </button>
          ))}
        </div>
      )}

      {!current ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="text-5xl mb-4">🐢</div>
          <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Sin cuotas en {capitalize(monthLabel)}
          </p>
          <p className="text-sm text-muted-foreground">¡La tortuguita descansa!</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 pt-2">
          {/* Month total */}
          {current.monthTotal > 0 && (
            <div className="glass rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">{current.typeName} — este mes</span>
              <span className="text-xl font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                {formatARS(current.monthTotal)}
              </span>
            </div>
          )}

          {/* Installment groups */}
          {current.installmentGroups.map((group) => {
            const upcoming = group.bills.filter(b => !b.isPast)
            const paidCount = group.bills.filter(b => b.isPast).length
            const progress = paidCount / group.totalInstallments
            return (
              <div key={group.groupId} className="glass rounded-2xl overflow-hidden">
                <div className="px-4 py-3.5 flex items-start justify-between border-b border-white/60 bg-white/20">
                  <div>
                    <p className="text-sm font-semibold">{group.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paidCount} de {group.totalInstallments} cuotas
                      {group.memberNames.length > 0 && ` · ${group.memberNames.join(" & ")}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-3">
                    <span className="text-xs font-medium text-muted-foreground">{Math.round(progress * 100)}%</span>
                    <div className="w-16 h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary shadow-sm" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-white/60">
                  {upcoming.slice(0, 3).map(bill => (
                    <div key={bill.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="text-xs text-muted-foreground capitalize">{bill.budgetDate}</span>
                        <span className="text-xs text-muted-foreground ml-2">· cuota {bill.currentInstallment}</span>
                      </div>
                      <span className="text-base font-medium tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                        {formatARS(bill.amount)}
                      </span>
                    </div>
                  ))}
                  {upcoming.length > 3 && (
                    <div className="px-4 py-2.5 text-xs text-muted-foreground">+{upcoming.length - 3} cuotas más...</div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Single bills */}
          {current.singleBills.length > 0 && (
            <div>
              <h2 className="text-base font-medium mb-2.5 px-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                Pagos únicos
              </h2>
              <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
                {current.singleBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium">{bill.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{bill.budgetDate}</p>
                    </div>
                    <span className="text-base font-medium tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                      {formatARS(bill.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Link href="/cuotas/new"
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </Link>

      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => router.push(`/cuotas?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
