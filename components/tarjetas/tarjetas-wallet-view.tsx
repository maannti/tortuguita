"use client"
import { useState, useTransition, useCallback, useEffect } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, ChevronDown, Check, X, FileText, CreditCard, Clock } from "lucide-react"
import Link from "next/link"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { MonthPicker } from "@/components/ui/month-picker"

// ─── Types ────────────────────────────────────────────────────────────────────
interface InstallmentBill {
  id: string; amount: number; amountUSD: number | null; budgetDate: string; paymentDate: string
  currentInstallment: number; isPast: boolean; isPaid: boolean; isCurrentMonth: boolean
}
interface InstallmentGroup {
  groupId: string; label: string; totalInstallments: number; minInstallment: number
  bills: InstallmentBill[]; memberNames: string[]
  categoryName: string | null; categoryColor: string | null; categoryIcon: string | null
}
interface SingleBill {
  id: string; label: string; amount: number; amountUSD: number | null
  budgetDate: string; paymentDate: string; isPaid: boolean
  categoryName: string | null; categoryColor: string | null; categoryIcon: string | null
}
export interface CardData {
  typeName: string; typeColor: string; typeIcon: string | null; typeBank: string | null
  installmentGroups: InstallmentGroup[]
  singleBills: SingleBill[]
  monthTotal: number
  // Billing period info
  closingDate?: string | null
  dueDate?: string | null
}
interface Props {
  cards: CardData[]
  monthLabel: string
  monthKey: string
  prevMonth: string | null
  nextMonth: string | null
  cycleLabel?: string | null
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// ─── Paid toggle button ───────────────────────────────────────────────────────
function PaidToggle({ billId, isPaid: initialIsPaid, onToggle }: { billId: string; isPaid: boolean; onToggle?: (newPaid: boolean) => void }) {
  const [isPaid, setIsPaid] = useState(initialIsPaid)
  const [isPending, startTransition] = useTransition()

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    haptic("medium")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bills/${billId}/paid`, { method: "PATCH" })
        if (res.ok) {
          const data = await res.json()
          setIsPaid(data.isPaid)
          onToggle?.(data.isPaid)
        }
      } catch {}
    })
  }, [billId, onToggle])

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90",
        isPaid
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-muted-foreground/30 bg-transparent",
        isPending && "opacity-50"
      )}
      aria-label={isPaid ? "Marcar como no pagado" : "Marcar como pagado"}
    >
      {isPaid && <Check className="h-2.5 w-2.5 stroke-[3]" />}
    </button>
  )
}

// ─── Installment group row ────────────────────────────────────────────────────
function InstallmentGroupRow({ group, cardColor }: { group: InstallmentGroup; cardColor: string }) {
  const [expanded, setExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  // Local paid-state overrides so counter/progress update immediately on toggle
  const [localPaid, setLocalPaid] = useState<Record<string, boolean>>({})

  const getEffectivePaid = useCallback((bill: InstallmentBill) =>
    localPaid[bill.id] !== undefined ? localPaid[bill.id] : bill.isPaid, [localPaid])

  const handleToggle = useCallback((billId: string, newPaid: boolean) => {
    setLocalPaid(prev => ({ ...prev, [billId]: newPaid }))
  }, [])

  const sorted = [...group.bills].sort((a, b) => a.currentInstallment - b.currentInstallment)

  // Split: past (auto-cobradas o pagadas) vs pendientes
  const pastBills = sorted.filter(b => b.isPast || getEffectivePaid(b))
  const pendingBills = sorted.filter(b => !b.isPast && !getEffectivePaid(b))

  // paidCount: cuotas previas al primer registro + las del historial
  const priorPaid = group.minInstallment - 1
  const paidCount = priorPaid + pastBills.length
  const progress = Math.min(paidCount / group.totalInstallments, 1)

  // Amount shown on header = next pending, or last bill if all done
  const currentBill = pendingBills[0] ?? sorted[sorted.length - 1]
  const monthAmount = currentBill?.amount ?? 0

  // Show just the month name ("Mayo") instead of the purchase date ("17 may")
  const billMonth = (bill: InstallmentBill) => capitalize(bill.budgetDate.split(" ")[0])

  return (
    <div className="overflow-hidden transition-all">
      {/* Header */}
      <button
        className="w-full px-4 py-3 flex items-start gap-3 active:bg-black/5 dark:active:bg-white/10 transition-colors"
        onClick={() => { haptic("light"); setExpanded(v => !v) }}
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{group.label}</p>
          {group.categoryName && (
            <span className="inline-flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.categoryColor ?? "#9D8189" }} />
              <span className="text-[10px] text-muted-foreground">{group.categoryName}</span>
            </span>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {paidCount}/{group.totalInstallments} cuotas
          </p>
          <div className="mt-1.5 w-full h-1 bg-black/8 dark:bg-white/15 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress * 100}%`, backgroundColor: cardColor }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
          <span className="text-sm font-medium tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            {formatARS(monthAmount)}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">

          {/* Pending / active cuotas */}
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {pendingBills.map(bill => (
              <div key={bill.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <PaidToggle billId={bill.id} isPaid={getEffectivePaid(bill)} onToggle={(p) => handleToggle(bill.id, p)} />
                <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{billMonth(bill)}</span>
                    <span className="text-xs text-muted-foreground">· #{bill.currentInstallment}</span>
                    {bill.isCurrentMonth && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                        este mes
                      </span>
                    )}
                  </div>
                  <span className="text-sm tabular-nums" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                    {formatARS(bill.amount)}
                  </span>
                </Link>
              </div>
            ))}
          </div>

          {/* Historial colapsado */}
          {(paidCount > 0) && (
            <div className="border-t border-black/5 dark:border-white/10">
              <button
                type="button"
                onClick={() => { haptic("light"); setHistoryExpanded(v => !v) }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="size-3 flex-shrink-0" />
                <span>{historyExpanded ? "Ocultar historial" : `Ver ${paidCount} cuota${paidCount !== 1 ? "s" : ""} pagada${paidCount !== 1 ? "s" : ""}`}</span>
                <ChevronDown className={cn("size-3 ml-auto transition-transform duration-200", historyExpanded && "rotate-180")} />
              </button>

              {historyExpanded && (
                <div className="divide-y divide-black/5 dark:divide-white/10">
                  {/* Prior paid cuotas that aren't in DB */}
                  {priorPaid > 0 && Array.from({ length: priorPaid }).map((_, i) => (
                    <div key={`prior-${i}`} className="flex items-center gap-2.5 px-4 py-2 opacity-50">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground flex-1">#{group.minInstallment - priorPaid + i} · cobrada</span>
                    </div>
                  ))}
                  {/* Past bills in DB */}
                  {pastBills.map(bill => (
                    <div key={bill.id} className="flex items-center gap-2.5 px-4 py-2">
                      {/* Paid manually → show toggle so user can unmark; auto-cobrada → static clock */}
                      {getEffectivePaid(bill) ? (
                        <PaidToggle billId={bill.id} isPaid={getEffectivePaid(bill)} onToggle={(p) => handleToggle(bill.id, p)} />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                      )}
                      <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{billMonth(bill)}</span>
                          <span className="text-xs text-muted-foreground">· #{bill.currentInstallment}</span>
                          {bill.isCurrentMonth && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                              este mes
                            </span>
                          )}
                          {!getEffectivePaid(bill) && <span className="text-[10px] text-muted-foreground/60">cobrada</span>}
                        </div>
                        <span className={cn(
                          "text-sm tabular-nums text-muted-foreground",
                          getEffectivePaid(bill) && "line-through"
                        )} style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                          {formatARS(bill.amount)}
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Single bill row ──────────────────────────────────────────────────────────
function SingleBillRow({ bill }: { bill: SingleBill }) {
  const [isPaid, setIsPaid] = useState(bill.isPaid)
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-4 py-3 transition-colors",
      isPaid && "bg-emerald-50/60 dark:bg-emerald-950/20"
    )}>
      <PaidToggle billId={bill.id} isPaid={isPaid} onToggle={setIsPaid} />
      <Link href={`/bills/${bill.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium truncate", isPaid && "text-muted-foreground line-through")}>
            {bill.label}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{bill.paymentDate}</span>
            {bill.categoryName && (
              <>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: bill.categoryColor ?? "#9D8189" }} />
                <span className="text-[10px] text-muted-foreground">{bill.categoryName}</span>
              </>
            )}
          </div>
        </div>
        <span className={cn("text-sm font-medium tabular-nums flex-shrink-0", isPaid && "text-muted-foreground line-through")}
          style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          {formatARS(bill.amount)}
        </span>
      </Link>
    </div>
  )
}

// ─── Bank logo mapping ────────────────────────────────────────────────────────
const BANK_LOGOS: Record<string, string> = {
  icbc: "/banks/icbc.png",
  galicia: "/banks/galicia.png",
  bbva: "/banks/bbva.png",
  santander: "/banks/santander.png",
  ciudad: "/banks/ciudad.svg",
  macro: "/banks/macro.png",
  nacion: "/banks/nacion.png",
  patagonia: "/banks/patagonia.png",
  provincia: "/banks/provincia.png",
  brubank: "/banks/brubank.png",
  mercadopago: "/banks/mercadopago.png",
  mp: "/banks/mercadopago.png",
  naranjax: "/banks/naranjax.png",
  naranja: "/banks/naranjax.png",
  supervielle: "/banks/supervielle.png",
  amex: "/banks/amex.svg",
  amexprop: "/banks/amex.svg",
  uala: "/banks/uala.png",
  ualá: "/banks/uala.png",
}

const NETWORK_LOGOS: Record<string, string> = {
  visa: "/networks/visa.png",
  mastercard: "/networks/mastercard.png",
  master: "/networks/mastercard.png",
  amex: "/networks/amex.png",
  cabal: "/networks/cabal.jpg",
}

// Default card colors based on real card references
const BANK_COLORS: Record<string, string> = {
  bbva: "#004481",
  icbc: "#8C8C8C",
  santander: "#EC0000",
  galicia: "#E8302E",
  ciudad: "#0066B3",
  provincia: "#46A857",
  patagonia: "#05D7C3",
  brubank: "#F7AFE0",
  uala: "#E91E63",
  ualá: "#E91E63",
  naranjax: "#C4A77D",
  naranja: "#C4A77D",
  supervielle: "#F49900",
  nacion: "#3EA5C8",
  macro: "#B69157",
  mercadopago: "#00AEEF",
  mp: "#00AEEF",
  amex: "#B7DFBD",
  amexprop: "#B7DFBD",
}

// Banks that need white logo (invert filter)
const BANKS_NEED_WHITE = ["ciudad", "santander"]

function getBankColor(bankId: string | null): string | null {
  if (!bankId) return null
  return BANK_COLORS[bankId.toLowerCase()] || null
}

function pastelify(hex: string, factor = 0.45): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * factor).toString(16).padStart(2, "0")
  return `#${mix(r)}${mix(g)}${mix(b)}`
}

function darkify(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c * 0.62).toString(16).padStart(2, "0")
  return `#${mix(r)}${mix(g)}${mix(b)}`
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

function needsWhiteLogo(bankId: string | null): boolean {
  if (!bankId) return false
  return BANKS_NEED_WHITE.includes(bankId.toLowerCase())
}

function getBankLogo(bankId: string | null): string | null {
  if (!bankId) return null
  return BANK_LOGOS[bankId.toLowerCase()] || null
}

function getNetworkLogo(icon: string | null): string | null {
  if (!icon) return null
  const lower = icon.toLowerCase()
  return NETWORK_LOGOS[lower] || null
}

// ─── Card visual (Apple Wallet style) ─────────────────────────────────────────
function CardVisual({ card, isExpanded, onClick, style }: {
  card: CardData
  isExpanded: boolean
  onClick: () => void
  style?: React.CSSProperties
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  const bankLogo = getBankLogo(card.typeBank)
  const networkLogo = getNetworkLogo(card.typeIcon)
  // Use bank reference color if available, otherwise keep original typeColor
  const bankRefColor = getBankColor(card.typeBank)
  const cardColor = isDark
    ? darkify(bankRefColor || card.typeColor)
    : pastelify(bankRefColor || card.typeColor)

  // Gradient end color
  const darkerColor = isDark ? cardColor + "dd" : cardColor + "cc"

  // Adaptive text color based on card background luminance
  const light = !isDark && isLightColor(cardColor)
  const txtPrimary = isDark ? "#FED0BB" : (light ? "#2A1F24" : "white")
  const txtSecondary = isDark ? "#FCB9B2" : (light ? "#4A3540" : "rgba(255,255,255,0.9)")

  // Clean up card name: avoid "Amex Amex" -> just "American Express"
  let displayName = card.typeName
  if (card.typeBank === "amexprop" && card.typeIcon === "amex") {
    displayName = "American Express"
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]",
        isExpanded ? "shadow-xl" : "shadow-lg"
      )}
      style={{
        background: `linear-gradient(145deg, ${cardColor} 0%, ${darkerColor} 100%)`,
        ...style,
      }}
    >
      <div className={cn(
        "px-4 transition-all duration-300 overflow-hidden flex flex-col justify-between",
        isExpanded ? "py-5" : "py-3.5"
      )} style={{ minHeight: isExpanded ? 80 : 64 }}>
        {/* Top row: bank logo ←→ network logo */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-[108px] flex items-center">
            {bankLogo ? (
              <img
                src={bankLogo}
                alt=""
                className={cn("w-full h-full object-contain object-left", needsWhiteLogo(card.typeBank) && "brightness-0 invert")}
              />
            ) : (
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: txtSecondary }}>
                {card.typeName.split(" ")[0]}
              </span>
            )}
          </div>
          {networkLogo && (
            <div className="h-7 w-[52px] flex items-center justify-end">
              <img
                src={networkLogo}
                alt=""
                className="w-full h-full object-contain object-right"
              />
            </div>
          )}
        </div>

        {/* Bottom row: card name ←→ amount */}
        <div className="flex items-end justify-between mt-2">
          <p className="text-sm font-semibold truncate" style={{ color: txtSecondary }}>
            {displayName}
          </p>
          <p
            className={cn("font-medium leading-none transition-all", isExpanded ? "text-2xl" : "text-xl")}
            style={{ color: txtPrimary, fontFamily: "var(--font-fraunces, serif)" }}
          >
            {formatARS(card.monthTotal)}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Expanded card content ────────────────────────────────────────────────────
function ExpandedCardContent({ card }: { card: CardData }) {
  const [cuotasCollapsed, setCuotasCollapsed] = useState(false)
  const [singlesCollapsed, setSinglesCollapsed] = useState(false)

  return (
    <div className="mt-4 space-y-4">
      {/* Stats row */}
      {(card.closingDate || card.dueDate) && (
        <div className="flex gap-3 px-1">
          {card.closingDate && (
            <div className="flex-1 glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cierre</p>
              <p className="text-sm font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                {card.closingDate}
              </p>
            </div>
          )}
          {card.dueDate && (
            <div className="flex-1 glass rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vence</p>
              <p className="text-sm font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                {card.dueDate}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
        {/* Installment groups */}
        {card.installmentGroups.length > 0 && (
          <button
            onClick={() => { haptic("selection"); setCuotasCollapsed(v => !v) }}
            className="w-full px-4 py-2 bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Cuotas</p>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", cuotasCollapsed && "-rotate-90")} />
          </button>
        )}
        {!cuotasCollapsed && card.installmentGroups.map(group => (
          <InstallmentGroupRow key={group.groupId} group={group} cardColor={card.typeColor} />
        ))}

        {/* Single bills */}
        {card.singleBills.length > 0 && (
          <button
            onClick={() => { haptic("selection"); setSinglesCollapsed(v => !v) }}
            className="w-full px-4 py-2 bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Pagos únicos</p>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", singlesCollapsed && "-rotate-90")} />
          </button>
        )}
        {!singlesCollapsed && card.singleBills.map(bill => (
          <SingleBillRow key={bill.id} bill={bill} />
        ))}

        {/* Empty state */}
        {card.installmentGroups.length === 0 && card.singleBills.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Sin gastos este mes</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function TarjetasWalletView({ cards, monthLabel, monthKey, prevMonth, nextMonth, cycleLabel }: Props) {
  const { push } = useRouter()
  const { resolvedTheme } = useTheme()
  const [mountedView, setMountedView] = useState(false)
  useEffect(() => setMountedView(true), [])
  const isDark = mountedView && resolvedTheme === "dark"
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const handleCardClick = (index: number) => {
    haptic("light")
    setExpandedIndex(prev => prev === index ? null : index)
  }

  const grandTotal = cards.reduce((sum, c) => sum + c.monthTotal, 0)

  // Stack dimensions
  const COLLAPSED_HEIGHT = 56 // px per collapsed card
  const CARD_GAP = 12 // px between cards

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div
          data-tour="tarjetas-header"
          className="relative rounded-3xl overflow-hidden px-5 py-4"
          style={{ background: isDark
            ? "linear-gradient(135deg, #461220 0%, #6B2030 55%, #8C2F39 100%)"
            : "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button
              onClick={() => { if (prevMonth) { haptic("selection"); push(`/wallet?month=${prevMonth}`) } }}
              disabled={!prevMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronLeft className="size-4" style={{ color: isDark ? "#FCB9B2" : "#6B5159" }} />
            </button>
            <div className="text-center space-y-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: isDark ? "#FCB9B2" : "#9D8189" }}>Tarjetas</p>
              <button
                onClick={() => { haptic("selection"); setShowPicker(true) }}
                className="font-medium px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)", fontSize: "1.05rem", color: isDark ? "#FED0BB" : "#4A3540" }}
              >
                {capitalize(monthLabel)}
              </button>
              {grandTotal > 0 && (
                <p className="text-2xl font-medium leading-tight" style={{ fontFamily: "var(--font-fraunces, serif)", color: isDark ? "#FED0BB" : "#4A3540" }}>
                  {formatARS(grandTotal)}
                </p>
              )}
              {cycleLabel && (
                <p className="text-[10px] mt-0.5" style={{ color: isDark ? "#FCB9B2" : "#9D8189" }}>
                  Gastos que vencen en {cycleLabel}
                </p>
              )}
            </div>
            <button
              onClick={() => { if (nextMonth) { haptic("selection"); push(`/wallet?month=${nextMonth}`) } }}
              disabled={!nextMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
            >
              <ChevronRight className="size-4" style={{ color: isDark ? "#FCB9B2" : "#6B5159" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Action links */}
      <div className="mx-4 mt-2 flex gap-2">
        <Link href="/cards"
          className="flex-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl active:opacity-80 active:scale-[0.99] transition-all"
          style={{ background: isDark ? "#1a1a2e" : "#E0E8FF" }}
        >
          <CreditCard className="size-4" style={{ color: isDark ? "#b0c4ff" : "#3a4a8a" }} />
          <span className="text-sm" style={{ color: isDark ? "#b0c4ff" : "#2a3570" }}><em className="italic font-normal">gestionar</em> <strong className="font-bold not-italic">tarjetas</strong></span>
        </Link>
        <Link href="/resumen"
          className="flex-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-2xl active:opacity-80 active:scale-[0.99] transition-all"
          style={{ background: isDark ? "#0e2a1a" : "#D8EFE3" }}
        >
          <FileText className="size-4" style={{ color: isDark ? "#9ee6b8" : "#2d6a4a" }} />
          <span className="text-sm" style={{ color: isDark ? "#9ee6b8" : "#1e4a32" }}><em className="italic font-normal">importar</em> <strong className="font-bold not-italic">gastos</strong></span>
        </Link>
      </div>

      {/* Cards stack */}
      {cards.length > 0 ? (
        <div className="px-4 pt-3">
          <div className="space-y-3">
            {cards.map((card, index) => {
              const isExpanded = expandedIndex === index

              return (
                <div key={card.typeName} className="transition-all duration-300">
                  <CardVisual
                    card={card}
                    isExpanded={isExpanded}
                    onClick={() => handleCardClick(index)}
                  />
                  {isExpanded && <ExpandedCardContent card={card} />}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="text-5xl mb-4">🐢</div>
          <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Sin gastos en tarjetas
          </p>
          <p className="text-sm text-muted-foreground">¡La tortuguita descansa!</p>
        </div>
      )}


      {/* Month picker */}
      {showPicker && (
        <MonthPicker
          currentMonthKey={monthKey}
          onSelect={(key) => push(`/wallet?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
