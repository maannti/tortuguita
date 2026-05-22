"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
    gradient: "linear-gradient(135deg, #C8EBD8 0%, #B8E0D0 45%, #A8D5C2 100%)",
    label:    "#3a6b58",
    sub:      "#3a6b58",
    monthBg:  "rgba(255,255,255,0.35)",
    monthTxt: "#2d5245",
    main:     "#1a3d30",
    progress: "#2d7a5a",
  },
  pink: {
    gradient: "linear-gradient(135deg, #FFCAD4 0%, #F4ACB7 45%, #e89aa8 100%)",
    label:    "#7a3040",
    sub:      "#7a3040",
    monthBg:  "rgba(255,255,255,0.35)",
    monthTxt: "#5a2030",
    main:     "#5a1828",
    progress: "#9D3050",
  },
  neutral: {
    gradient: "linear-gradient(135deg, #E8E0DC 0%, #D8D0CC 100%)",
    label:    "#4a3540",
    sub:      "#6b5560",
    monthBg:  "rgba(255,255,255,0.3)",
    monthTxt: "#4a3540",
    main:     "#2d1a20",
    progress: "#7a5560",
  },
} as const

// ── Main component ────────────────────────────────────────────────────────

export function SharedBalanceView({ organizations, currentUserId }: Props) {
  const now = new Date()

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
    <div className="min-h-full bg-[#f0ece8] pb-24">
      {/* Space selector */}
      <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => setSelectedOrgId(org.id)}
            className={cn(
              "flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-semibold border-none transition-colors",
              selectedOrgId === org.id
                ? "bg-[#4A3540] text-white"
                : "bg-[#ede9e7] text-[#9D8189]"
            )}
          >
            {org.name}
          </button>
        ))}
      </div>

      {/* ── Hero card ── */}
      <div
        className="mx-4 mt-3 rounded-3xl overflow-hidden p-5 relative"
        style={{ background: theme.gradient }}
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
            style={{ color: theme.label }}
          >
            Gastos compartidos
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={prevMonth}
              className="p-1 opacity-60 hover:opacity-100"
              style={{ color: theme.sub }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              className="text-[13px] font-semibold rounded-full px-2.5 py-1"
              style={{ color: theme.monthTxt, background: theme.monthBg }}
            >
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 opacity-60 hover:opacity-100"
              style={{ color: theme.sub }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Balance row */}
        <div className="flex gap-3 mb-4 relative">
          <div
            className="flex-1 rounded-2xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.45)" }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: theme.sub }}
            >
              Te deben
            </div>
            <div
              className="text-[20px] font-light leading-none"
              style={{ fontFamily: "var(--font-fraunces, serif)", color: theme.sub }}
            >
              {formatARS(data?.totalOwedToMe ?? 0)}
            </div>
          </div>
          <div
            className="flex-1 rounded-2xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.45)" }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: theme.sub }}
            >
              Debés
            </div>
            <div
              className="text-[20px] font-light leading-none"
              style={{ fontFamily: "var(--font-fraunces, serif)", color: theme.main }}
            >
              {formatARS(data?.totalIOwe ?? 0)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="relative">
          <div
            className="flex justify-between text-[11px] font-medium mb-1.5"
            style={{ color: theme.sub }}
          >
            <span>Saldado este mes</span>
            <span>
              {data?.settledCount ?? 0} de {data?.totalCount ?? 0} gastos
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.4)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: theme.progress }}
            />
          </div>
        </div>
      </div>

      {/* ── Member chips ── */}
      {otherMembers.length > 0 && (
        <div className={cn(
          "flex gap-2 px-4 py-3",
          otherMembers.length >= 4 ? "overflow-x-auto" : ""
        )}>
          {otherMembers.map((member) => {
            const owes = iOweMap[member.id]
            const owed = owedToMeMap[member.id]
            // ≤3 members: divide equally; ≥4: fixed width + horizontal scroll
            const chipStyle = otherMembers.length <= 3
              ? { flex: `0 0 calc(${100 / otherMembers.length}% - ${(otherMembers.length - 1) * 8 / otherMembers.length}px)` }
              : { flexShrink: 0, width: 120 }
            return (
              <div
                key={member.id}
                className={cn(
                  "rounded-xl px-3 py-2 border",
                  owes && owes.netAmount > 0
                    ? "border-[#F4ACB7] bg-[#fff5f7]"
                    : owed && owed.netAmount > 0
                    ? "border-[#a8d5c2] bg-[#f4fbf8]"
                    : "border-[#ede9e7] bg-white"
                )}
                style={chipStyle}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[#4a3540] truncate">
                    {member.name.split(" ")[0]}
                  </span>
                  {owes && owes.netAmount > 0 ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-semibold text-[#9D3050]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                        −{formatARS(owes.netAmount)}
                      </div>
                      <div className="text-[9px] text-[#9D8189]">le debés</div>
                    </div>
                  ) : owed && owed.netAmount > 0 ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-semibold text-[#2d7a5a]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                        +{formatARS(owed.netAmount)}
                      </div>
                      <div className="text-[9px] text-[#9D8189]">te debe</div>
                    </div>
                  ) : (
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] font-medium text-[#9D8189]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>$0</div>
                      <div className="text-[9px] text-[#9D8189]">al día ✓</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#9D8189] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && data && data.iOwe.length === 0 && data.owedToMe.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-white border border-[#ede9e7] p-8 text-center">
          <div className="text-3xl mb-3">🎉</div>
          <div className="text-[15px] font-semibold text-[#1a1a1a] mb-1">
            Todo saldado
          </div>
          <div className="text-[13px] text-[#9D8189]">
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
  settlingIds: Set<string>
}

function BillGroup({ person, direction, onSettle, settlingIds }: BillGroupProps) {
  const initials = getInitials(person.memberName)
  const avatarColor = getAvatarColor(person.memberName)
  const settledCount = person.bills.filter((b) => b.isSettled).length
  const firstName = person.memberName.split(" ")[0]
  const sectionLabel =
    direction === "iOwe" ? `Le debés a ${firstName}` : `Te debe ${firstName}`

  return (
    <>
      <div className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9D8189]">
        {sectionLabel}
      </div>
      <div className="mx-4 mb-3 bg-white rounded-[18px] overflow-hidden border border-[#ede9e7]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-3 bg-[#faf9f8] border-b border-[#ede9e7]">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{ background: avatarColor }}
            >
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#1a1a1a]">{firstName}</div>
              <div className="text-[11px] text-[#9D8189]">
                {person.bills.length} {person.bills.length === 1 ? "gasto" : "gastos"} · {settledCount} saldados
              </div>
            </div>
          </div>
          <div
            className="text-[15px] font-semibold text-[#9D3050]"
            style={{ fontFamily: "var(--font-fraunces, serif)" }}
          >
            {formatARS(person.netAmount)}
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
    setDeltaX(Math.max(0, Math.min(dx, 140)))
  }

  const handleTouchEnd = () => {
    if (deltaX >= SWIPE_THRESHOLD) {
      setDeltaX(0)
      triggerSettle()
    } else {
      setDeltaX(0)
    }
  }

  const dotColor = bill.categoryColor ?? "#9D8189"
  const dateStr = format(new Date(bill.paymentDate), "d MMM", { locale: es })
  const swipeProgress = Math.min(deltaX / SWIPE_THRESHOLD, 1)

  return (
    <div className="relative overflow-hidden border-b border-[#f5f2f0] last:border-b-0">
      {/* Green settle layer (revealed on swipe) */}
      {canSettle && (
        <div
          className="absolute inset-0 flex items-center pl-4 gap-2 text-white text-[13px] font-semibold"
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
        className="flex items-center gap-2.5 px-3.5 py-3 relative z-10"
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: deltaX === 0 ? "transform 0.25s ease-out" : "none",
          background: localSettled ? "#f4fbf8" : "white",
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
              "text-[13px] font-medium text-[#1a1a1a] truncate",
              localSettled && "line-through opacity-40"
            )}
          >
            {bill.label}
          </div>
          <div className="text-[11px] text-[#9D8189] mt-0.5">
            {dateStr} · {bill.percentage}% · {bill.payerName.split(" ")[0]} pagó
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

        {/* Settle circle button */}
        {canSettle && (
          <button
            onClick={triggerSettle}
            disabled={settling}
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90",
              localSettled
                ? "bg-[#2d7a5a] border-[#2d7a5a] text-white"
                : "border-[#d0cac8] bg-white"
            )}
          >
            {settling ? (
              <div className="w-3 h-3 border border-[#9D8189] border-t-transparent rounded-full animate-spin" />
            ) : localSettled ? (
              <Check className="w-3.5 h-3.5" />
            ) : null}
          </button>
        )}

      </div>
    </div>
  )
}
