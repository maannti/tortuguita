"use client"
import { CardIcon, isNetworkId, NetworkId, BANKS } from "@/components/ui/card-network"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { useSpaces } from "@/lib/spaces-context"

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

interface Props { month: string; monthKey: string; availableMonths: string[]; spaces: SpaceData[]; currentUserId: string }

function formatARS(n: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

/** Renders a currency amount with superscript cents. Omits cents when they are "00". */
function HeroAmount({ amount, className }: { amount: number; className?: string }) {
  const full = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  const commaIdx = full.lastIndexOf(",")
  const intPart = commaIdx >= 0 ? full.slice(0, commaIdx) : full
  const decPart = commaIdx >= 0 ? full.slice(commaIdx + 1) : ""
  return (
    <span className={className}>
      {intPart}
      {decPart && decPart !== "00" && (
        <sup className="text-[0.42em] align-super leading-none font-medium">,{decPart}</sup>
      )}
    </span>
  )
}

export function HomeDashboard({ month, monthKey, availableMonths, spaces, currentUserId }: Props) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)
  const [showMyPart, setShowMyPart] = useState(false)

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
  const creditCardGroups = activeSpaces.flatMap(sp => sp.creditCardGroups)
  const members = activeSpaces.length === 1 ? activeSpaces[0].members : []
  const recentTotal = recentExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="pb-28">

      {/* ── Hero card ── */}
      <div className="px-4 pt-5 pb-2">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-24 rounded-full bg-[#F4ACB7]/20 blur-xl pointer-events-none" />

          <div className="relative px-5 pt-6 pb-6 space-y-4">
            {/* Month nav */}
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
                      onClick={() => setShowMyPart(false)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        !showMyPart ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setShowMyPart(true)}
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

        {/* Credit card groups — summary only, tappable → /cuotas */}
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
                <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                  {group.name}
                </h2>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(group.totalAmount)}</span>
            </div>
            {/* Tappable summary card → cuotas */}
            <Link href="/cuotas" className="block glass rounded-2xl overflow-hidden active:opacity-80 transition-opacity">
              {group.memberAmounts.length > 1 ? (
                <div className="grid" style={{ gridTemplateColumns: `repeat(${group.memberAmounts.length}, 1fr)` }}>
                  {group.memberAmounts.map((m) => (
                    <div key={m.name} className="px-4 py-3.5 text-center border-r border-white/50 last:border-r-0">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{m.name.split(" ")[0]}</p>
                      <p className="text-base font-medium mt-0.5" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                        {formatARS(m.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-sm text-muted-foreground">Ver cuotas</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </Link>
          </section>
        ))}

        {/* Recent expenses — all bills (CC + non-CC) */}
        {recentExpenses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-base font-medium text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                Gastos recientes
              </h2>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(recentTotal)}</span>
            </div>
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/60">
              {recentExpenses.map((expense) => (
                <Link key={expense.id} href={`/bills/${expense.id}`} className="flex items-center justify-between px-4 py-3.5 active:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: expense.billTypeColor }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{expense.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{expense.billTypeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <span className="text-base font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                      {formatARS(expense.amount)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
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
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/bills/new")}
        className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
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
