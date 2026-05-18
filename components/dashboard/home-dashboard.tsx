"use client"
import { CardIcon, isNetworkId, NetworkId, BANKS } from "@/components/ui/card-network"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { useSpaces } from "@/lib/spaces-context"
import { OnboardingSlides } from "@/components/onboarding/onboarding-slides"
import { OnboardingChecklist, ChecklistData } from "@/components/onboarding/onboarding-checklist"
import { TourInviteCard } from "@/components/onboarding/tour-invite-card"
import { startAppTour } from "@/components/onboarding/app-tour"
import { AiInsightWidget, InsightData } from "@/components/dashboard/ai-insight-widget"
import { haptic } from "@/lib/haptics"

const BANK_COLORS: Record<string, string> = {
  bbva: "#004481", icbc: "#8C8C8C", santander: "#EC0000", galicia: "#E8302E",
  ciudad: "#0066B3", provincia: "#46A857", patagonia: "#05D7C3", brubank: "#F7AFE0",
  uala: "#E91E63", ualá: "#E91E63", naranjax: "#C4A77D", naranja: "#C4A77D",
  supervielle: "#F49900", nacion: "#3EA5C8", macro: "#B69157",
  mercadopago: "#00AEEF", mp: "#00AEEF", amex: "#B7DFBD", amexprop: "#B7DFBD",
}
const BANK_LOGOS: Record<string, string> = {
  icbc: "/banks/icbc.png", galicia: "/banks/galicia.png", bbva: "/banks/bbva.png",
  santander: "/banks/santander.png", ciudad: "/banks/ciudad.svg", macro: "/banks/macro.png",
  nacion: "/banks/nacion.png", patagonia: "/banks/patagonia.png", provincia: "/banks/provincia.png",
  brubank: "/banks/brubank.png", mercadopago: "/banks/mercadopago.png", mp: "/banks/mercadopago.png",
  naranjax: "/banks/naranjax.png", naranja: "/banks/naranjax.png", supervielle: "/banks/supervielle.png",
  amex: "/banks/amex.svg", amexprop: "/banks/amex.svg", uala: "/banks/uala.png", ualá: "/banks/uala.png",
}
const NETWORK_LOGOS: Record<string, string> = {
  visa: "/networks/visa.png", mastercard: "/networks/mastercard.png",
  master: "/networks/mastercard.png", amex: "/networks/amex.png", cabal: "/networks/cabal.jpg",
}
const BANKS_NEED_WHITE = ["ciudad", "santander"]
function resolveCardColor(bank: string | null, fallback: string) {
  const base = (bank && BANK_COLORS[bank.toLowerCase()]) || fallback
  const r = parseInt(base.slice(1, 3), 16)
  const g = parseInt(base.slice(3, 5), 16)
  const b = parseInt(base.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.45).toString(16).padStart(2, "0")
  return `#${mix(r)}${mix(g)}${mix(b)}`
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

interface Member { id: string; name: string; expenses: number; income: number; percentage: number }
interface RecentExpense {
  id: string
  label: string
  amount: number
  billTypeName: string
  billTypeColor: string
  billTypeIcon: string | null
  isCreditCard?: boolean
}
interface CreditCardGroup {
  name: string
  color: string
  icon: string | null
  bank: string | null
  totalAmount: number
  memberAmounts: Array<{ name: string; amount: number }>
}

export interface SpaceData {
  id: string
  name: string
  isPersonal: boolean
  totalAmount: number
  members: Member[]
  recentExpenses: RecentExpense[]
  creditCardGroups: CreditCardGroup[]
}

interface Props { month: string; monthKey: string; availableMonths: string[]; spaces: SpaceData[]; currentUserId: string; showOnboarding?: boolean; checklistData?: ChecklistData; insights?: { insights: string[] } }

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 })
const arsFormatterFull = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatARS(n: number) { return arsFormatter.format(n) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

/** Renders a currency amount with superscript cents. Omits cents when they are "00". */
function HeroAmount({ amount, className }: { amount: number; className?: string }) {
  const full = arsFormatterFull.format(amount)
  const commaIdx = full.lastIndexOf(",")
  const intPart = commaIdx >= 0 ? full.slice(0, commaIdx) : full
  const decPart = commaIdx >= 0 ? full.slice(commaIdx + 1) : ""
  return (
    <span className={className} style={{ fontFamily: "var(--font-fraunces, serif)" }}>
      {intPart}
      {decPart && decPart !== "00" && (
        <sup className="text-[0.42em] align-super leading-none font-medium">,{decPart}</sup>
      )}
    </span>
  )
}

export function HomeDashboard({ month, monthKey, availableMonths, spaces, currentUserId, showOnboarding = false, checklistData, insights }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [showMyPart, setShowMyPart] = useState(true)
  const [slidesVisible, setSlidesVisible] = useState(showOnboarding)

  const handleSlidesDone = useCallback(() => {
    setSlidesVisible(false)
    fetch("/api/user/onboarding-seen", { method: "POST" }).catch(() => {})
    // Pequeño delay para que el dashboard se pinte antes de que arranque el tour
    setTimeout(() => startAppTour(), 400)
  }, [])

  const { activeSpaceIds } = useSpaces()

  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  // Combine data from active spaces
  const activeSpaces = spaces.filter(s => activeSpaceIds.has(s.id))
  const totalAmount = activeSpaces.reduce((s, sp) => s + sp.totalAmount, 0)
  const myAmount = activeSpaces.reduce((s, sp) => {
    const me = sp.members.find(m => m.id === currentUserId)
    return s + (me?.expenses ?? sp.totalAmount)
  }, 0)
  const hasSharedSpace = activeSpaces.some(sp => !sp.isPersonal && sp.members.length > 1)
  const displayAmount = showMyPart ? myAmount : totalAmount
  const recentExpenses = activeSpaces.flatMap(sp => sp.recentExpenses)
  // Merge CC groups across spaces: same card name → one block with summed totals and members
  const creditCardGroups = activeSpaces.flatMap(sp => sp.creditCardGroups).reduce((acc, group) => {
    const existing = acc.find(g => g.name === group.name)
    if (existing) {
      existing.totalAmount += group.totalAmount
      for (const m of group.memberAmounts) {
        const em = existing.memberAmounts.find(x => x.name === m.name)
        if (em) em.amount += m.amount
        else existing.memberAmounts.push({ ...m })
      }
    } else {
      acc.push({ ...group, memberAmounts: [...group.memberAmounts] })
    }
    return acc
  }, [] as CreditCardGroup[])
  // Show member split for the first active shared space (even if personal is also active)
  const sharedSpace = activeSpaces.find(sp => !sp.isPersonal && sp.members.length > 1)
  const members = sharedSpace ? sharedSpace.members : (activeSpaces.length === 1 ? activeSpaces[0].members : [])
  // ── Category summary (top 5 non-CC, sorted by amount) ──
  const categoryMap = new Map<string, { name: string; color: string; amount: number }>()
  for (const e of recentExpenses) {
    if (e.isCreditCard) continue
    const cur = categoryMap.get(e.billTypeName) ?? { name: e.billTypeName, color: e.billTypeColor, amount: 0 }
    categoryMap.set(e.billTypeName, { ...cur, amount: cur.amount + e.amount })
  }
  const topCategories = [...categoryMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5)
  // ── Biggest single expense of the month (any type) ──
  const biggestExpense = recentExpenses.length > 0
    ? recentExpenses.reduce((max, e) => e.amount > max.amount ? e : max, recentExpenses[0])
    : null

  return (
    <div className="pb-28">
      {slidesVisible && <OnboardingSlides onDone={handleSlidesDone} />}

      {/* ── Hero card ── */}
      <div className="px-4 pt-5 pb-2">
        <div
          data-tour="hero"
          className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-8 -right-8 size-40 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-24 rounded-full bg-[#F4ACB7]/20 blur-xl pointer-events-none" />

          <div className="relative px-5 pt-6 pb-6 space-y-4">
            {/* Month nav */}
            <div data-tour="month-nav" className="flex items-center justify-between">
              <button
                onClick={() => { haptic("selection"); prevMonth && router.push(`/dashboard?month=${prevMonth}`) }}
                disabled={!prevMonth}
                className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
              >
                <ChevronLeft className="size-4 text-[#6B5159]" />
              </button>
              <button
                onClick={() => { haptic("selection"); setShowPicker(true) }}
                className="text-sm font-medium text-[#6B5159] px-3 py-1 rounded-full hover:bg-white/30 transition-colors active:scale-95"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {capitalize(month)}
              </button>
              <button
                onClick={() => { haptic("selection"); nextMonth && router.push(`/dashboard?month=${nextMonth}`) }}
                disabled={!nextMonth}
                className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all"
              >
                <ChevronRight className="size-4 text-[#6B5159]" />
              </button>
            </div>

            {/* Big total */}
            <div className="text-center space-y-2">
              <p className="text-[11px] font-medium text-[#9D8189] uppercase tracking-wide">Total del mes</p>
              <HeroAmount
                amount={displayAmount}
                className="text-5xl font-medium text-[#4A3540] leading-none tracking-tight block"
              />
              {/* Toggle Total / Mi parte — only shown when a shared space is active */}
              {hasSharedSpace && (
                <div className="flex items-center justify-center pt-1">
                  <div className="flex rounded-full bg-white/40 backdrop-blur-sm p-0.5">
                    <button
                      onClick={() => { haptic("selection"); setShowMyPart(false) }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        !showMyPart ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => { haptic("selection"); setShowMyPart(true) }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        showMyPart ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"
                      }`}
                    >
                      Mi parte
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Member split — only shown when exactly 1 space is active */}
            {members.length > 1 && (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}>
                {members.map((member) => (
                  <div key={member.id} className="flex-1 bg-white/35 backdrop-blur-sm rounded-2xl px-3 py-2.5">
                    <p className="text-[11px] font-medium text-[#9D8189] text-center">{member.name.split(" ")[0]}</p>
                    <p
                      className="text-xl font-medium text-[#4A3540] leading-tight mt-0.5 text-center"
                      style={{ fontFamily: "var(--font-fraunces, serif)" }}
                    >
                      {formatARS(member.expenses)}
                    </p>
                    {member.percentage > 0 && (
                      <p className="text-[10px] text-[#9D8189] mt-0.5 text-center">{Math.round(member.percentage)}% ingresos</p>
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

        {/* Credit cards — Apple Wallet stack, top 3 by amount */}
        {creditCardGroups.length > 0 && (() => {
          const top3 = [...creditCardGroups].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 3)
          const PEEK = 35
          const CARD_H = 96
          const containerH = (top3.length - 1) * PEEK + CARD_H
          const backToFront = [...top3].reverse()
          return (
            <section data-tour="cc-groups">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                  Tarjetas
                </h2>
                <Link href="/tarjetas" className="text-sm text-muted-foreground">
                  Ver todas →
                </Link>
              </div>
              <Link href="/tarjetas" className="block active:scale-[0.99] transition-transform">
                <div className="relative" style={{ height: containerH }}>
                  {backToFront.map((card, ri) => {
                    const isFront = ri === backToFront.length - 1
                    const bg = resolveCardColor(card.bank, card.color)
                    const bankLogo = card.bank ? BANK_LOGOS[card.bank.toLowerCase()] ?? null : null
                    const networkLogo = card.icon ? NETWORK_LOGOS[card.icon.toLowerCase()] ?? null : null
                    const needsInvert = card.bank ? BANKS_NEED_WHITE.includes(card.bank.toLowerCase()) : false
                    const light = isLightColor(bg)
                    const txtPrimary = light ? "#2A1F24" : "white"
                    const txtSecondary = light ? "#4A3540" : "rgba(255,255,255,0.9)"
                    return (
                      <div
                        key={card.name}
                        className="absolute left-0 right-0 rounded-2xl overflow-hidden shadow-md"
                        style={{
                          top: ri * PEEK,
                          height: CARD_H,
                          zIndex: ri + 1,
                          background: `linear-gradient(145deg, ${bg} 0%, ${bg}cc 100%)`,
                        }}
                      >
                        {isFront ? (
                          /* ── Front card: bank logo + network logo same row (top), name + amount (bottom) ── */
                          <div className="px-4 py-3.5 h-full flex flex-col justify-between">
                            {/* Top row: bank logo ←→ network logo */}
                            <div className="flex items-center justify-between">
                              <div className="h-7 w-[108px] flex items-center">
                                {bankLogo ? (
                                  <img src={bankLogo} alt="" className={`w-full h-full object-contain object-left${needsInvert ? " brightness-0 invert" : ""}`} />
                                ) : (
                                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: txtSecondary }}>
                                    {card.name.split(" ")[0]}
                                  </span>
                                )}
                              </div>
                              {networkLogo && (
                                <div className="h-7 w-[52px] flex items-center justify-end">
                                  <img src={networkLogo} alt="" className="w-full h-full object-contain object-right" />
                                </div>
                              )}
                            </div>
                            {/* Bottom row: card name ←→ amount */}
                            <div className="flex items-end justify-between">
                              <p className="text-sm font-semibold truncate" style={{ color: txtSecondary }}>{card.name}</p>
                              <p className="text-xl font-medium leading-none" style={{ color: txtPrimary, fontFamily: "var(--font-fraunces, serif)" }}>
                                {formatARS(card.totalAmount)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* ── Back cards: banco + red en la misma fila ── */
                          <div className="flex items-center justify-between px-4" style={{ height: PEEK }}>
                            <div className="h-5 w-[90px] flex items-center">
                              {bankLogo ? (
                                <img src={bankLogo} alt="" className={`w-full h-full object-contain object-left${needsInvert ? " brightness-0 invert" : ""}`} />
                              ) : (
                                <span className="text-xs font-bold uppercase tracking-wider leading-none" style={{ color: txtSecondary }}>
                                  {card.name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                            {networkLogo && (
                              <div className="h-5 w-[36px] flex items-center justify-end">
                                <img src={networkLogo} alt="" className="w-full h-full object-contain object-right" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Link>
            </section>
          )
        })()}

        {/* AI Insight widget */}
        {insights && <AiInsightWidget data={insights} />}

        {/* Category summary + biggest expense */}
        {(topCategories.length > 0 || biggestExpense) && (
          <section data-tour="recent-expenses">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                Por categoría
              </h2>
              <Link href="/bills" className="text-sm text-muted-foreground">
                Ver todos →
              </Link>
            </div>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
              {/* Top categories */}
              {topCategories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: cat.color }} />
                    <p className="text-sm font-medium truncate text-foreground">{cat.name}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-foreground ml-3 flex-shrink-0" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                    {formatARS(cat.amount)}
                  </span>
                </div>
              ))}

              {/* Divider + biggest expense */}
              {biggestExpense && (
                <Link
                  href={`/bills/${biggestExpense.id}`}
                  className="flex items-center justify-between px-4 py-3 active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: biggestExpense.billTypeColor }} />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Gasto más grande</p>
                      <p className="text-sm font-medium truncate text-foreground">{biggestExpense.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <span className="text-sm font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                      {formatARS(biggestExpense.amount)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Empty state */}
        {totalAmount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🐢</div>
            <p className="text-lg font-medium text-foreground mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              Sin gastos este mes
            </p>
            <p className="text-sm text-muted-foreground">¡La tortuguita descansa!</p>
          </div>
        )}

        {/* Onboarding checklist — shown until dismissed via localStorage */}
        {checklistData && <OnboardingChecklist data={checklistData} />}

        {/* Tour invite card */}
        <TourInviteCard />
      </div>

      {/* FAB */}
      <button
        data-tour="fab"
        onClick={() => { haptic("medium"); router.push("/bills/new") }}
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        <Plus className="size-6" />
      </button>

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
