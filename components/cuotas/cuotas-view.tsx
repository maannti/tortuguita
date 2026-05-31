"use client"
import { useState, useTransition, useCallback, useEffect } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Plus, ChevronLeft, ChevronRight, FileText, ChevronDown, Check, AlertTriangle, X } from "lucide-react"
import { isNetworkId, CardIcon, BANKS, NetworkId } from "@/components/ui/card-network"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MonthPicker } from "@/components/ui/month-picker"

interface InstallmentBill {
  id: string; amount: number; amountUSD: number | null; budgetDate: string
  currentInstallment: number; isPast: boolean; isPaid: boolean
}
interface InstallmentGroup {
  groupId: string; label: string; totalInstallments: number; minInstallment: number
  bills: InstallmentBill[]; memberNames: string[]
}
interface SingleBill {
  id: string; label: string; amount: number; amountUSD: number | null
  budgetDate: string; isPaid: boolean
}
interface CardData {
  typeName: string; typeColor: string; typeIcon: string | null
  installmentGroups: InstallmentGroup[]
  singleBills: SingleBill[]
  monthTotal: number
}
interface Props {
  cards: CardData[]
  monthLabel: string
  monthKey: string
  prevMonth: string | null
  nextMonth: string | null
  staleCards?: Array<{ id: string; name: string }>
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// ─── Paid toggle button ───────────────────────────────────────────────────────
function PaidToggle({ billId, isPaid: initialIsPaid }: { billId: string; isPaid: boolean }) {
  const [isPaid, setIsPaid] = useState(initialIsPaid)
  const [isPending, startTransition] = useTransition()

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bills/${billId}/paid`, { method: "PATCH" })
        if (res.ok) {
          const data = await res.json()
          setIsPaid(data.isPaid)
        }
      } catch {}
    })
  }, [billId])

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90",
        isPaid
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-muted-foreground/30 bg-transparent",
        isPending && "opacity-50"
      )}
      aria-label={isPaid ? "Marcar como no pagado" : "Marcar como pagado"}
    >
      {isPaid && <Check className="h-3 w-3 stroke-[3]" />}
    </button>
  )
}

// ─── Single installment group row ─────────────────────────────────────────────
function InstallmentGroupCard({ group, cardColor }: { group: InstallmentGroup; cardColor: string }) {
  const [expanded, setExpanded] = useState(false)

  const priorPaid = group.minInstallment - 1
  const paidCount = priorPaid + group.bills.filter(b => b.isPast || b.isPaid).length
  const progress = Math.min(paidCount / group.totalInstallments, 1)

  // Bills sorted by installment number
  const sorted = [...group.bills].sort((a, b) => a.currentInstallment - b.currentInstallment)
  const currentBill = sorted.find(b => !b.isPast && !b.isPaid) ?? sorted[sorted.length - 1]
  const monthAmount = currentBill?.amount ?? (sorted[0]?.amount ?? 0)

  return (
    <div className={cn(
      "glass rounded-2xl overflow-hidden transition-all",
      sorted.some(b => b.isPaid) && "ring-1 ring-emerald-400/30"
    )}>
      {/* Header — always visible */}
      <button
        className="w-full px-4 py-3.5 flex items-start gap-3 active:bg-white/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">{group.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {paidCount} de {group.totalInstallments} cuotas
            {group.memberNames.length > 0 && ` · ${group.memberNames.join(" & ")}`}
          </p>
          {/* Progress bar */}
          <div className="mt-2 space-y-0.5">
            <div className="w-full h-1.5 bg-black/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, backgroundColor: cardColor }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span className="text-base font-medium tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            {formatARS(monthAmount)}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded: all installments */}
      {expanded && (
        <div className="border-t border-white/60 divide-y divide-white/60">
          {sorted.map(bill => (
            <div
              key={bill.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                bill.isPaid && "bg-emerald-50/60 dark:bg-emerald-950/20"
              )}
            >
              <PaidToggle billId={bill.id} isPaid={bill.isPaid} />
              <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-muted-foreground capitalize">{bill.budgetDate}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">· cuota {bill.currentInstallment}</span>
                  {bill.isPast && !bill.isPaid && (
                    <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">vencida</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn("text-sm font-medium tabular-nums", bill.isPaid && "text-muted-foreground line-through")}
                    style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                    {formatARS(bill.amount)}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function CuotasView({ cards, monthLabel, monthKey, prevMonth, nextMonth, staleCards = [] }: Props) {
  const { push } = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"
  const [activeCard, setActiveCard] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [staleDismissed, setStaleDismissed] = useState(false)

  // Reset to first card when month changes (cards array changes)
  // Avoids out-of-bounds index showing "Sin gastos" on a month with fewer cards
  useEffect(() => {
    setActiveCard(prev => (prev >= cards.length ? 0 : prev))
  }, [cards])

  const current = cards[activeCard] ?? cards[0]

  return (
    <div className="pb-28">
      {/* Gradient header */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="relative rounded-3xl overflow-hidden px-5 py-4"
          style={{ background: isDark
            ? "linear-gradient(135deg, #461220 0%, #6B2030 55%, #8C2F39 100%)"
            : "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button
              onClick={() => prevMonth && push(`/cuotas?month=${prevMonth}`)}
              disabled={!prevMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronLeft className="size-4" style={{ color: isDark ? "#FCB9B2" : "#6B5159" }} />
            </button>
            <div className="text-center space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: isDark ? "#FCB9B2" : "#9D8189" }}>Tarjetas</p>
              <button
                onClick={() => setShowPicker(true)}
                className="font-medium px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)", fontSize: "1.05rem", color: isDark ? "#FCB9B2" : "#4A3540" }}
              >
                {capitalize(monthLabel)}
              </button>
              {current && current.monthTotal > 0 && (
                <p className="text-2xl font-medium leading-tight" style={{ fontFamily: "var(--font-fraunces, serif)", color: isDark ? "#FED0BB" : "#4A3540" }}>
                  {formatARS(current.monthTotal)}
                </p>
              )}
            </div>
            <button
              onClick={() => nextMonth && push(`/cuotas?month=${nextMonth}`)}
              disabled={!nextMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronRight className="size-4" style={{ color: isDark ? "#FCB9B2" : "#6B5159" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Stale period banner — shown when any card's billing period expired */}
      {staleCards.length > 0 && !staleDismissed && (
        <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 leading-snug">
              {staleCards.length === 1
                ? `El período de ${staleCards[0].name} venció`
                : `Período vencido: ${staleCards.map(c => c.name).join(", ")}`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Actualizá las fechas de cierre y vencimiento en{" "}
              <button
                className="underline font-semibold"
                onClick={() => push("/cards")}
              >
                Configuración de tarjetas
              </button>
            </p>
          </div>
          <button
            onClick={() => setStaleDismissed(true)}
            className="text-amber-500 hover:text-amber-700 flex-shrink-0 active:scale-90 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Card selector — horizontal scroll chips */}
      {cards.length > 0 && (
        <div className="flex gap-2.5 px-4 py-3 overflow-x-auto scrollbar-none">
          {cards.map((card, i) => {
            const bankId = BANKS.find(b => b.color === card.typeColor)?.id ?? null
            const network = isNetworkId(card.typeIcon) ? card.typeIcon as NetworkId : null
            const isActive = activeCard === i
            return (
              <button
                key={card.typeName}
                onClick={() => setActiveCard(i)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "glass text-muted-foreground hover:text-foreground"
                )}
              >
                <CardIcon bankId={bankId} bankColor={card.typeColor} bankName={card.typeName} network={network} size="sm" />
                {card.typeName}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {!current ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="text-5xl mb-4">🐢</div>
          <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Sin gastos en {capitalize(monthLabel)}
          </p>
          <p className="text-sm text-muted-foreground">¡La tortuguita descansa!</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pt-1">
          {/* Installment groups — collapsed by default */}
          {current.installmentGroups.map((group) => (
            <InstallmentGroupCard key={group.groupId} group={group} cardColor={current.typeColor} />
          ))}

          {/* Single bills */}
          {current.singleBills.length > 0 && (
            <div>
              {current.installmentGroups.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2 mt-1">
                  Pagos únicos
                </h2>
              )}
              <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
                {current.singleBills.map(bill => (
                  <div
                    key={bill.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 transition-colors",
                      bill.isPaid && "bg-emerald-50/60 dark:bg-emerald-950/20"
                    )}
                  >
                    <PaidToggle billId={bill.id} isPaid={bill.isPaid} />
                    <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", bill.isPaid && "text-muted-foreground line-through")}>
                          {bill.label}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{bill.budgetDate}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className={cn("text-base font-medium tabular-nums", bill.isPaid && "text-muted-foreground line-through")}
                          style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                          {formatARS(bill.amount)}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FABs — stacked vertically, right-aligned */}
      <Link href="/bills/import"
        className="fixed bottom-40 right-4 z-30 flex items-center gap-2 px-4 h-11 rounded-full glass text-foreground text-sm font-medium shadow-sm active:scale-95 transition-transform">
        <FileText className="size-4 text-primary" />
        Importar gastos
      </Link>
      <Link href="/cuotas/new"
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Plus className="size-6" />
      </Link>

      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => push(`/cuotas?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
