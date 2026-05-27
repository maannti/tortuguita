"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"

// ── Types ─────────────────────────────────────────────────────────────────

interface Organization {
  id: string
  name: string
  isPersonal: boolean
}

interface BillDetail {
  id: string
  label: string
  amount: number
  paymentDate: string
  percentage: number
  isSettled: boolean
  settledAt: string | null
  categoryName: string | null
  categoryColor: string | null
  payerName: string
  payerId: string
  debtorId: string
  currentInstallment: number | null
  totalInstallments: number | null
}

interface PersonBalance {
  memberId: string
  memberName: string
  netAmount: number
  bills: BillDetail[]
}

interface SharedBalanceData {
  members: { id: string; name: string }[]
  owedToMe: PersonBalance[]
  iOwe: PersonBalance[]
  totalOwedToMe: number
  totalIOwe: number
  settledCount: number
  totalCount: number
}

interface Props {
  organizations: Organization[]
  currentUserId: string
}

// ── Formatters ────────────────────────────────────────────────────────────

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
function formatARS(n: number) {
  return arsFormatter.format(n)
}
function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const AVATAR_COLORS = [
  "#9B7EC8",
  "#C4956A",
  "#7B8FA1",
  "#E87A8A",
  "#6AAE9B",
  "#B8956C",
]
function getAvatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = ((hash << 5) - hash) + c.charCodeAt(0)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ── Hero theme ────────────────────────────────────────────────────────────

type HeroVariant = "green" | "pink" | "neutral"

const HERO_THEME = {
  green: {
    label:    "#3a6b58",
    sub:      "#3a6b58",
    monthBg:  "rgba(255,255,255,0.35)",
    monthTxt: "#2d5245",
    main:     "#1a3d30",
    progress: "#2d7a5a",
    darkLabel:    "#FCB9B2",
    darkSub:      "#FCB9B2",
    darkMonthBg:  "rgba(255,255,255,0.15)",
    darkMonthTxt: "#FED0BB",
    darkMain:     "#FED0BB",
    darkProgress: "#B23A48",
  },
  pink: {
    label:    "#7a3040",
    sub:      "#7a3040",
    monthBg:  "rgba(255,255,255,0.35)",
    monthTxt: "#5a2030",
    main:     "#5a1828",
    progress: "#9D3050",
    darkLabel:    "#FCB9B2",
    darkSub:      "#FCB9B2",
    darkMonthBg:  "rgba(255,255,255,0.15)",
    darkMonthTxt: "#FED0BB",
    darkMain:     "#FED0BB",
    darkProgress: "#B23A48",
  },
  neutral: {
    label:    "#4a3540",
    sub:      "#6b5560",
    monthBg:  "rgba(255,255,255,0.3)",
    monthTxt: "#4a3540",
    main:     "#2d1a20",
    progress: "#7a5560",
    darkLabel:    "#FCB9B2",
    darkSub:      "#FCB9B2",
    darkMonthBg:  "rgba(255,255,255,0.12)",
    darkMonthTxt: "#FED0BB",
    darkMain:     "#FED0BB",
    darkProgress: "#8C2F39",
  },
}

// ── Main component ────────────────────────────────────────────────────────

export function SharedBalanceView({ organizations, currentUserId }: Props) {
  const now = new Date()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const [selectedOrgId, setSelectedOrgId] = useState(
    organizations.find((o) => !o.isPersonal)?.id ?? organizations[0]?.id ?? ""
  )
  const [month, setMonth] = useState(format(now, "yyyy-MM"))
  const [data, setData] = useState<SharedBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set())

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!selectedOrgId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/shared-balance?organizationId=${selectedOrgId}&month=${month}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {}
    setLoading(false)
  }, [selectedOrgId, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Month navigation ───────────────────────────────────────────────────

  function prevMonth() {
    const [y, m] = month.split("-").map(Number)
    setMonth(format(new Date(y, m - 2, 1), "yyyy-MM"))
  }
  function nextMonth() {
    const [y, m] = month.split("-").map(Number)
    setMonth(format(new Date(y, m, 1), "yyyy-MM"))
  }

  // ── Settle ─────────────────────────────────────────────────────────────

  const handleSettle = useCallback(
    async (billId: string, debtorId?: string) => {
      haptic("medium")
      setSettlingIds((prev) => new Set(prev).add(billId))

      // Optimistic update: toggle settled state + recalculate amounts
      setData((prev) => {
        if (!prev) return prev
        const allBills = [
          ...prev.iOwe.flatMap((p) => p.bills),
          ...prev.owedToMe.flatMap((p) => p.bills),
        ]
        const target = allBills.find((b) => b.id === billId)
        if (!target) return prev
        const wasSettled = target.isSettled
        const delta = wasSettled ? target.amount : -target.amount

        const togglePeople = (people: PersonBalance[]) =>
          people.map((p) => {
            const hasBill = p.bills.some((b) => b.id === billId)
            if (!hasBill) return p
            return {
              ...p,
              netAmount: p.netAmount + delta,
              bills: p.bills.map((b) =>
                b.id === billId ? { ...b, isSettled: !wasSettled } : b
              ),
            }
          })

        const inIOwe = prev.iOwe.some((p) => p.bills.some((b) => b.id === billId))
        return {
          ...prev,
          settledCount: prev.settledCount + (wasSettled ? -1 : 1),
          totalIOwe: inIOwe ? prev.totalIOwe + delta : prev.totalIOwe,
          totalOwedToMe: !inIOwe ? prev.totalOwedToMe + delta : prev.totalOwedToMe,
          iOwe: togglePeople(prev.iOwe),
          owedToMe: togglePeople(prev.owedToMe),
        }
      })

      try {
        const url = debtorId
          ? `/api/bills/${billId}/settle?debtorUserId=${debtorId}`
          : `/api/bills/${billId}/settle`
        const res = await fetch(url, { method: "PATCH" })
        if (res.ok) await fetchData()
      } catch {}
      setSettlingIds((prev) => {
        const next = new Set(prev)
        next.delete(billId)
        return next
      })
    },
    [fetchData]
  )

  // ── Hero variant ───────────────────────────────────────────────────────

  const heroVariant: HeroVariant = !data
    ? "neutral"
    : data.totalIOwe > data.totalOwedToMe
    ? "pink"
    : data.totalOwedToMe > data.totalIOwe
    ? "green"
    : "neutral"

  const theme = HERO_THEME[heroVariant]
  // Pick light vs dark hero colors
  const tc = {
    label:    isDark ? theme.darkLabel    : theme.label,
    sub:      isDark ? theme.darkSub      : theme.sub,
    monthBg:  isDark ? theme.darkMonthBg  : theme.monthBg,
    monthTxt: isDark ? theme.darkMonthTxt : theme.monthTxt,
    main:     isDark ? theme.darkMain     : theme.main,
    progress: isDark ? theme.darkProgress : theme.progress,
  }
  const monthLabel = format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy", { locale: es })
  const progressPct =
    data && data.totalCount > 0
      ? Math.round((data.settledCount / data.totalCount) * 100)
      : 0

  const iOweMap = Object.fromEntries(
    (data?.iOwe ?? []).map((p) => [p.memberId, p])
  )
  const owedToMeMap = Object.fromEntries(
    (data?.owedToMe ?? []).map((p) => [p.memberId, p])
  )
  const otherMembers = (data?.members ?? []).filter((m) => m.id !== currentUserId)

  return (
    <div className="min-h-full bg-background pb-24">
      {/* Space selector */}
      <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => setSelectedOrgId(org.id)}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border-none transition-colors",
              selectedOrgId === org.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {org.name}
          </button>
        ))}
      </div>

      {/* ── Hero card ── */}
      <div
        className={cn("mx-4 mt-3 rounded-3xl overflow-hidden p-5 relative", `hero-gradient-${heroVariant}`)}
      >
        {/* decorative orbs */}
        <div
          className="pointer-events-none absolute top-[-24px] right-[-24px] w-[120px] h-[120px] rounded-full"
          style={{ background: "rgba(255,255,255,0.22)", filter: "blur(24px)" }}
        />
        <div
          className="pointer-events-none absolute bottom-[-12px] left-[-12px] w-[80px] h-[60px] rounded-full"
          style={{ background: "rgba(255,255,255,0.14)", filter: "blur(18px)" }}
        />

        {/* Top row */}
        <div className="flex items-center justify-between mb-4 relative">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: tc.label }}
          >
            Gastos compartidos
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={prevMonth}
              className="p-1 opacity-60 hover:opacity-100"
              style={{ color: tc.sub }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="text-[13px] font-semibold rounded-full px-2.5 py-1"
              style={{ color: tc.monthTxt, background: tc.monthBg }}
            >
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 opacity-60 hover:opacity-100"
              style={{ color: tc.sub }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance row */}
        <div className="flex gap-3 mb-4 relative">
          <div
            className="flex-1 rounded-2xl px-3 py-2.5"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.45)" }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: tc.sub }}
            >
              Te deben
            </div>
            <div
              className="text-[20px] font-light leading-none"
              style={{ fontFamily: "var(--font-fraunces, serif)", color: tc.sub }}
            >
              {formatARS(data?.totalOwedToMe ?? 0)}
            </div>
          </div>
          <div
            className="flex-1 rounded-2xl px-3 py-2.5"
            style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.45)" }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: tc.sub }}
            >
              Debés
            </div>
            <div
              className="text-[20px] font-light leading-none"
              style={{ fontFamily: "var(--font-fraunces, serif)", color: tc.main }}
            >
              {formatARS(data?.totalIOwe ?? 0)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="relative">
          <div
            className="flex justify-between text-[11px] font-medium mb-1.5"
            style={{ color: tc.sub }}
          >
            <span>Saldado este mes</span>
            <span>
              {data?.settledCount ?? 0} de {data?.totalCount ?? 0} gastos
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.4)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: tc.progress }}
            />
          </div>
        </div>
      </div>

      {/* ── Member chips / avatars ── */}
      {otherMembers.length > 0 && (
        otherMembers.length <= 2 ? (
          /* 1–2 members: full-width chips */
          <div className="flex gap-2 px-4 py-3">
            {otherMembers.map((member) => {
              const owes = iOweMap[member.id]
              const owed = owedToMeMap[member.id]
              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 border",
                    owes && owes.netAmount > 0
                      ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30"
                      : owed && owed.netAmount > 0
                      ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {member.name.split(" ")[0]}
                    </span>
                    {owes && owes.netAmount > 0 ? (
                      <div className="text-right flex-shrink-0">
                        <div className="text-[13px] font-semibold text-[#9D3050]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                          −{formatARS(owes.netAmount)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">le debés</div>
                      </div>
                    ) : owed && owed.netAmount > 0 ? (
                      <div className="text-right flex-shrink-0">
                        <div className="text-[13px] font-semibold text-[#2d7a5a]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                          +{formatARS(owed.netAmount)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">te debe</div>
                      </div>
                    ) : (
                      <div className="text-right flex-shrink-0">
                        <div className="text-[13px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>$0</div>
                        <div className="text-[9px] text-muted-foreground">al día ✓</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* 3+ members: rounded-square tiles, fill width evenly */
          <div
            className="grid gap-x-1 gap-y-2 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${Math.min(otherMembers.length, 5)}, 1fr)` }}
          >
            {otherMembers.map((member) => {
              const owes = iOweMap[member.id]
              const owed = owedToMeMap[member.id]
              const hasDebt = !!(owes && owes.netAmount > 0)
              const isOwed = !!(owed && owed.netAmount > 0)
              const amount = hasDebt ? owes!.netAmount : isOwed ? owed!.netAmount : 0
              const parts = member.name.trim().split(" ")
              const initials = parts.length >= 2
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : parts[0].slice(0, 2).toUpperCase()
              return (
                <div key={member.id} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "size-11 rounded-2xl flex items-center justify-center text-xs font-semibold ring-2",
                      hasDebt ? "ring-rose-300 bg-rose-50 dark:bg-rose-950/30 text-[#9D3050]"
                        : isOwed ? "ring-green-300 bg-green-50 dark:bg-green-950/30 text-[#2d7a5a]"
                        : "ring-transparent bg-muted text-muted-foreground"
                    )}
                  >
                    {initials}
                  </div>
                  <p className="text-[10px] font-medium text-center leading-tight text-foreground w-full truncate">
                    {parts[0]}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-semibold text-center leading-tight w-full truncate",
                      hasDebt ? "text-[#9D3050]" : isOwed ? "text-[#2d7a5a]" : "text-muted-foreground"
                    )}
                    style={{ fontFamily: "var(--font-fraunces, serif)" }}
                  >
                    {hasDebt ? `−${formatARS(amount)}` : isOwed ? `+${formatARS(amount)}` : "$0"}
                  </p>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Loading ── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && data && data.iOwe.length === 0 && data.owedToMe.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-card border p-8 text-center">
          <div className="text-3xl mb-3">🎉</div>
          <div className="text-[15px] font-semibold text-foreground mb-1">
            Todo saldado
          </div>
          <div className="text-[13px] text-muted-foreground">
            No hay deudas pendientes este mes en este espacio
          </div>
        </div>
      )}

      {/* ── Sections: lo que debo ── */}
      {(data?.iOwe ?? []).map((person) => (
        <BillGroup
          key={`owe-${person.memberId}`}
          person={person}
          direction="iOwe"
          onSettle={handleSettle}
          onSettleAll={async () => {
            const unsettled = person.bills.filter(b => !b.isSettled)
            await Promise.all(unsettled.map(b => handleSettle(b.id)))
          }}
          settlingIds={settlingIds}
        />
      ))}

      {/* ── Sections: lo que me deben ── */}
      {(data?.owedToMe ?? []).map((person) => (
        <BillGroup
          key={`owed-${person.memberId}`}
          person={person}
          direction="owedToMe"
          onSettle={handleSettle}
          onSettleAll={async () => {
            const unsettled = person.bills.filter(b => !b.isSettled)
            await Promise.all(unsettled.map(b => handleSettle(b.id, b.debtorId)))
          }}
          settlingIds={settlingIds}
        />
      ))}
    </div>
  )
}

// ── BillGroup ─────────────────────────────────────────────────────────────

interface BillGroupProps {
  person: PersonBalance
  direction: "iOwe" | "owedToMe"
  onSettle: (billId: string, debtorId?: string) => Promise<void>
  onSettleAll: () => Promise<void>
  settlingIds: Set<string>
}

function BillGroup({ person, direction, onSettle, onSettleAll, settlingIds }: BillGroupProps) {
  const initials = getInitials(person.memberName)
  const avatarColor = getAvatarColor(person.memberName)
  const settledCount = person.bills.filter((b) => b.isSettled).length
  const firstName = person.memberName.split(" ")[0]
  const sectionLabel =
    direction === "iOwe" ? `Le debés a ${firstName}` : `Te debe ${firstName}`

  // Swipeable header state
  const headerStartXRef = useRef<number>(0)
  const [headerDeltaX, setHeaderDeltaX] = useState(0)
  const [settlingAll, setSettlingAll] = useState(false)
  const unsettledCount = person.bills.filter(b => !b.isSettled).length
  const headerSwipeProgress = Math.min(Math.abs(headerDeltaX) / SWIPE_THRESHOLD, 1)

  const triggerSettleAll = useCallback(async () => {
    if (settlingAll || unsettledCount === 0) return
    setSettlingAll(true)
    haptic("medium")
    await onSettleAll()
    setSettlingAll(false)
  }, [settlingAll, unsettledCount, onSettleAll])

  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    headerStartXRef.current = e.touches[0].clientX
  }
  const handleHeaderTouchMove = (e: React.TouchEvent) => {
    if (unsettledCount === 0 || settlingAll) return
    const dx = e.touches[0].clientX - headerStartXRef.current
    setHeaderDeltaX(Math.max(-140, Math.min(dx, 140)))
  }
  const handleHeaderTouchEnd = () => {
    if (Math.abs(headerDeltaX) >= SWIPE_THRESHOLD) {
      setHeaderDeltaX(0)
      triggerSettleAll()
    } else {
      setHeaderDeltaX(0)
    }
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {sectionLabel}
      </div>
      <div className="mx-4 mb-3 bg-card rounded-[18px] overflow-hidden border">
        {/* Swipeable header */}
        <div className="relative overflow-hidden">
          {/* Green layer revealed on swipe */}
          {unsettledCount > 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 text-white text-[13px] font-semibold"
              style={{
                background: "#2d7a5a",
                opacity: headerSwipeProgress,
                transition: headerDeltaX === 0 ? "opacity 0.2s" : "none",
              }}
            >
              <Check className="w-4 h-4" />
              Saldar todo
            </div>
          )}
          <div
            className="flex items-center justify-between px-3.5 py-3 bg-muted/40 border-b border-border relative z-10"
            style={{
              transform: `translateX(${headerDeltaX}px)`,
              transition: headerDeltaX === 0 ? "transform 0.25s ease-out" : "none",
            }}
            onTouchStart={handleHeaderTouchStart}
            onTouchMove={handleHeaderTouchMove}
            onTouchEnd={handleHeaderTouchEnd}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: avatarColor }}
              >
                {initials}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">{firstName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {person.bills.length} {person.bills.length === 1 ? "gasto" : "gastos"} · {settledCount} saldados
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="text-[15px] font-semibold text-[#9D3050]"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {formatARS(person.netAmount)}
              </div>
              {/* Tickbox for settle-all — same style as individual rows */}
              <button
                onClick={triggerSettleAll}
                disabled={settlingAll || unsettledCount === 0}
                className={cn(
                  "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90",
                  unsettledCount === 0
                    ? "bg-[#2d7a5a] border-[#2d7a5a] text-white"
                    : "border-border bg-card"
                )}
              >
                {settlingAll
                  ? <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  : unsettledCount === 0
                  ? <Check className="w-3.5 h-3.5" />
                  : null
                }
              </button>
            </div>
          </div>
        </div>

        {/* Bill rows */}
        {person.bills.map((bill) => (
          <SwipeableBillRow
            key={bill.id}
            bill={bill}
            canSettle={true}
            onSettle={(billId) =>
              direction === "owedToMe"
                ? onSettle(billId, bill.debtorId)
                : onSettle(billId)
            }
            settling={settlingIds.has(bill.id)}
          />
        ))}
      </div>
    </>
  )
}

// ── SwipeableBillRow ──────────────────────────────────────────────────────

interface SwipeableBillRowProps {
  bill: BillDetail
  canSettle: boolean
  onSettle: (billId: string) => Promise<void>
  settling: boolean
}

const SWIPE_THRESHOLD = 80

function SwipeableBillRow({ bill, canSettle, onSettle, settling }: SwipeableBillRowProps) {
  const startXRef = useRef<number>(0)
  const [deltaX, setDeltaX] = useState(0)
  const [localSettled, setLocalSettled] = useState(bill.isSettled)

  // Sync from parent after fetchData
  useEffect(() => {
    setLocalSettled(bill.isSettled)
  }, [bill.isSettled])

  const triggerSettle = useCallback(async () => {
    setLocalSettled((s) => !s) // optimistic
    await onSettle(bill.id)
  }, [bill.id, onSettle])

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canSettle) return
    const dx = e.touches[0].clientX - startXRef.current
    // Bidirectional: allow both left→right and right→left swipe
    setDeltaX(Math.max(-140, Math.min(dx, 140)))
  }

  const handleTouchEnd = () => {
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      setDeltaX(0)
      triggerSettle()
    } else {
      setDeltaX(0)
    }
  }

  const dotColor = bill.categoryColor ?? "#9D8189"
  const dateStr = format(new Date(bill.paymentDate), "d MMM", { locale: es })
  const swipeProgress = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 1)

  return (
    <div className="relative overflow-hidden border-b border-border last:border-b-0">
      {/* Green settle layer — shown on swipe in either direction */}
      {canSettle && (
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 text-white text-[13px] font-semibold"
          style={{
            background: "#2d7a5a",
            opacity: swipeProgress,
            transition: deltaX === 0 ? "opacity 0.2s" : "none",
          }}
        >
          <Check className="w-5 h-5" />
          Saldar
        </div>
      )}

      {/* Row content */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-3.5 py-3 relative z-10",
          localSettled ? "bg-green-50 dark:bg-green-950/20" : "bg-card"
        )}
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: deltaX === 0 ? "transform 0.25s ease-out" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-[13px] font-medium text-foreground truncate",
              localSettled && "line-through opacity-40"
            )}
          >
            {bill.label}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {dateStr}
            {bill.currentInstallment && bill.totalInstallments
              ? ` · cuota ${bill.currentInstallment}/${bill.totalInstallments}`
              : ""}
            {" · "}{bill.percentage}% · {bill.payerName.split(" ")[0]} pagó
          </div>
        </div>
        <div
          className={cn(
            "text-[14px] font-medium flex-shrink-0",
            localSettled && "opacity-40"
          )}
          style={{ fontFamily: "var(--font-fraunces, serif)" }}
        >
          {formatARS(bill.amount)}
        </div>

        {/* Right side indicator */}
        {canSettle && (
          localSettled ? (
            // Settled → green circle ✓ always visible (mobile + desktop)
            <button
              onClick={triggerSettle}
              disabled={settling}
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90 bg-[#2d7a5a] border-[#2d7a5a] text-white"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Empty circle — visible on all screen sizes, swipe also works on mobile */
            <button
              onClick={triggerSettle}
              disabled={settling}
              className="w-7 h-7 rounded-full border-2 border-border bg-card flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            >
              {settling && <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />}
            </button>
          )
        )}

      </div>
    </div>
  )
}
