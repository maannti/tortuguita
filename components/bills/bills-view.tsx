"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef, useTransition } from "react"
import { ChevronLeft, ChevronRight, Plus, CreditCard, ChevronDown, Search, X, SlidersHorizontal, Check, User, Home, Loader2, Repeat, Users } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"

interface BillItem {
  id: string; label: string; amount: number; amountUSD: number | null; paymentDate: string
  cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
  myShare?: number | null; isShared?: boolean
}
interface CategoryGroup {
  name: string; color: string; icon: string | null; total: number; totalUSD: number | null; bills: BillItem[]
}
interface FilterOption {
  id: string
  name: string
  color?: string
  icon?: string | null
  organizationId: string
}
interface Organization {
  id: string
  name: string
  isPersonal: boolean
}

interface ActiveFilters {
  categoryIds: string[]
  cardIds: string[]
}

interface Props {
  month: string; monthKey: string; availableMonths: string[]
  categoryGroups: CategoryGroup[]
  grandTotal: number
  myTotal?: number
  hasSharedBills?: boolean
  hasAnyUSD: boolean
  searchQuery?: string
  activeFilters?: ActiveFilters
  availableCategories?: FilterOption[]
  availableCards?: FilterOption[]
  organizations?: Organization[]
  currentUserId?: string
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 })
const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatARS(n: number) { return arsFormatter.format(n) }
function formatUSD(n: number) { return usdFormatter.format(n) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const MAUVE = "#9D8189"

export function BillsView({
  month, monthKey, availableMonths, categoryGroups, grandTotal, myTotal, hasSharedBills = false, hasAnyUSD,
  searchQuery = "", activeFilters = { categoryIds: [], cardIds: [] },
  availableCategories = [], availableCards = [], organizations = [],
  currentUserId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [showPicker, setShowPicker] = useState(false)
  const [showMyPart, setShowMyPart] = useState(true)
  const [showUSD, setShowUSD] = useState(false)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // ActionBar state
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Filter sheet state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [localCategoryIds, setLocalCategoryIds] = useState<Set<string>>(new Set(activeFilters.categoryIds))
  const [localCardIds, setLocalCardIds] = useState<Set<string>>(new Set(activeFilters.cardIds))

  const hasActiveFilters = activeFilters.categoryIds.length > 0 || activeFilters.cardIds.length > 0
  const totalActiveFilters = activeFilters.categoryIds.length + activeFilters.cardIds.length

  // Sync local state when props change
  useEffect(() => {
    setLocalSearch(searchQuery)
    setLocalCategoryIds(new Set(activeFilters.categoryIds))
    setLocalCardIds(new Set(activeFilters.cardIds))
  }, [searchQuery, activeFilters])

  // Focus input when search expands
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [searchExpanded])

  // Debounced search - updates URL in real-time
  function handleSearchChange(value: string) {
    setLocalSearch(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) {
        params.set("search", value.trim())
      } else {
        params.delete("search")
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)
  }

  function clearSearch() {
    setLocalSearch("")
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setSearchExpanded(false)
  }

  // Filter sheet actions
  function toggleCategory(id: string) {
    setLocalCategoryIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleCard(id: string) {
    setLocalCardIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString())

    if (localCategoryIds.size > 0) {
      params.set("categoryIds", Array.from(localCategoryIds).join(","))
    } else {
      params.delete("categoryIds")
    }

    if (localCardIds.size > 0) {
      params.set("cardIds", Array.from(localCardIds).join(","))
    } else {
      params.delete("cardIds")
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setFilterSheetOpen(false)
  }

  function clearAllFilters() {
    setLocalCategoryIds(new Set())
    setLocalCardIds(new Set())
    const params = new URLSearchParams(searchParams.toString())
    params.delete("categoryIds")
    params.delete("cardIds")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setFilterSheetOpen(false)
  }

  function clearEverything() {
    setLocalSearch("")
    setLocalCategoryIds(new Set())
    setLocalCardIds(new Set())
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    const params = new URLSearchParams()
    if (monthKey) params.set("month", monthKey)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setSearchExpanded(false)
  }

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
      <div className="px-4 pt-5">
        <div
          className="relative rounded-3xl overflow-hidden px-5 py-4"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />

          {/* Normal header content */}
          <div className="relative flex items-center justify-between">
            <button onClick={() => {
              haptic("selection")
              if (!prevMonth) return
              const params = new URLSearchParams(searchParams.toString())
              params.set("month", prevMonth)
              router.push(`/bills?${params.toString()}`)
            }} disabled={!prevMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronLeft className="size-4 text-[#6B5159]" />
            </button>
            <div className="text-center space-y-0.5">
              <button
                onClick={() => { haptic("selection"); setShowPicker(true) }}
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
                  {showUSD && grandTotalUSD !== null
                    ? formatUSD(grandTotalUSD)
                    : formatARS(hasSharedBills && showMyPart && myTotal != null ? myTotal : grandTotal)}
                </p>
              )}
              {/* Mi parte / Total toggle — only shown when there are shared bills */}
              {hasSharedBills && (
                <div className="flex items-center justify-center pt-1">
                  <div className="flex rounded-full bg-white/40 backdrop-blur-sm p-0.5">
                    <button
                      onClick={() => { haptic("selection"); setShowMyPart(true) }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${showMyPart ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      Mi parte
                    </button>
                    <button
                      onClick={() => { haptic("selection"); setShowMyPart(false) }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${!showMyPart ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      Total
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => {
              haptic("selection")
              if (!nextMonth) return
              const params = new URLSearchParams(searchParams.toString())
              params.set("month", nextMonth)
              router.push(`/bills?${params.toString()}`)
            }} disabled={!nextMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronRight className="size-4 text-[#6B5159]" />
            </button>
          </div>
        </div>
      </div>

      {/* ActionBar - Search & Filter */}
      <div className="px-4 pt-3 pb-1">
        <div
          data-tour="action-bar"
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #D8E2DC 0%, #FFE5D9 55%, #FFCAD4 100%)" }}
        >
          {searchExpanded ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <Search className="size-4 text-[#6B5159] flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && clearSearch()}
                placeholder="Buscar gastos..."
                className="flex-1 bg-transparent text-sm text-[#4A3540] placeholder:text-[#9D8189] focus:outline-none"
              />
              <div className="size-6 flex items-center justify-center flex-shrink-0">
                {isPending ? (
                  <Loader2 className="size-4 text-[#9D8189] animate-spin" />
                ) : (
                  <button onClick={() => { haptic("light"); localSearch ? clearSearch() : setSearchExpanded(false) }} className="size-6 flex items-center justify-center rounded-full hover:bg-white/30 active:scale-95 transition-all">
                    <X className="size-4 text-[#6B5159]" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <button
                onClick={() => { haptic("light"); setSearchExpanded(true) }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 transition-all active:bg-white/20",
                  searchQuery && "bg-white/30"
                )}
              >
                <Search className="size-4 text-[#6B5159]" />
                <span className="text-sm font-medium text-[#4A3540]">
                  {searchQuery ? `"${searchQuery}"` : "Buscar"}
                </span>
              </button>
              <div className="w-px h-6 bg-white/50" />
              <button
                onClick={() => { haptic("light"); setFilterSheetOpen(true) }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 transition-all active:bg-white/20",
                  hasActiveFilters && "bg-white/30"
                )}
              >
                <SlidersHorizontal className="size-4 text-[#6B5159]" />
                <span className="text-sm font-medium text-[#4A3540]">
                  Filtros{totalActiveFilters > 0 && ` (${totalActiveFilters})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick-access pills: Recurrentes + Compartidos */}
      <div className="mx-4 mt-2 flex gap-2">
        <Link
          href="/bills/recurring"
          className="flex-1 flex items-center justify-between px-3.5 py-3 rounded-2xl active:opacity-80 active:scale-[0.99] transition-all"
          style={{ background: "#EAE4F2" }}
        >
          <div className="flex items-center gap-2">
            <Repeat className="size-4 text-[#6B5A8A]" />
            <span className="text-sm text-[#3d2f5a]"><em className="italic font-normal">gastos</em> <strong className="font-bold not-italic">recurrentes</strong></span>
          </div>
          <ChevronRight className="size-3.5 text-[#6B5A8A]" />
        </Link>
        <Link
          href="/bills/shared"
          className="flex-1 flex items-center justify-between px-3.5 py-3 rounded-2xl active:opacity-80 active:scale-[0.99] transition-all"
          style={{ background: "#FFE0E8" }}
        >
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#7a3040]" />
            <span className="text-sm text-[#5a1828]"><em className="italic font-normal">gastos</em> <strong className="font-bold not-italic">compartidos</strong></span>
          </div>
          <ChevronRight className="size-3.5 text-[#7a3040]" />
        </Link>
      </div>

<div className="px-4 pt-4 space-y-5">
        {categoryGroups.length > 0 ? (
          categoryGroups.map((group) => {
            const usdLabel = groupUSDDisplay(group)
            const isCollapsed = collapsedCategories.has(group.name)
            const toggleCollapse = () => { haptic("selection"); setCollapsedCategories(prev => {
              const next = new Set(prev)
              if (next.has(group.name)) next.delete(group.name)
              else next.add(group.name)
              return next
            }) }
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
                    const hasMyShare = bill.isShared && bill.myShare != null
                    const displayBillAmount = (hasMyShare && showMyPart) ? bill.myShare! : bill.amount
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
                            {bill.isShared && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#F4ACB720", color: "#9D8189" }}>
                                compartido
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-base font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                              {showUSD && usdBill ? usdBill : formatARS(displayBillAmount)}
                            </p>
                            {/* Secondary: show total when in "Mi parte", show user's share when in "Total" */}
                            {hasMyShare && !showUSD && showMyPart && (
                              <p className="text-[10px] text-muted-foreground">total {formatARS(bill.amount)}</p>
                            )}
                            {hasMyShare && !showUSD && !showMyPart && (
                              <p className="text-[10px] text-muted-foreground">tu parte {formatARS(bill.myShare!)}</p>
                            )}
                            {/* Secondary line: show ARS when in USD mode */}
                            {showUSD && usdBill && (
                              <p className="text-[10px] text-muted-foreground">{formatARS(displayBillAmount)}</p>
                            )}
                            {!showUSD && !hasMyShare && bill.amountUSD && (
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
          /* Empty state - different for search/filters vs no bills */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {searchQuery || hasActiveFilters ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Sin resultados</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery && hasActiveFilters
                    ? `No encontramos gastos con "${searchQuery}" y los filtros aplicados`
                    : searchQuery
                      ? `No encontramos gastos con "${searchQuery}"`
                      : "No encontramos gastos con los filtros aplicados"
                  }
                </p>
                <button
                  onClick={() => { haptic("light"); clearEverything() }}
                  className="text-sm text-primary font-medium active:scale-95 transition-transform"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🐢</div>
                <p className="text-lg font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Sin gastos este mes</p>
                <p className="text-sm text-muted-foreground mb-6">¡La tortuguita descansa!</p>
                <Link href="/bills/new"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform">
                  <Plus className="size-4" />Agregar gasto
                </Link>
              </>
            )}
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
          onSelect={(key) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set("month", key)
            router.push(`/bills?${params.toString()}`)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Filter Sheet */}
      {filterSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { haptic("light"); setFilterSheetOpen(false) }}
          />

          {/* Sheet */}
          <div className="relative bg-background rounded-t-3xl max-h-[80vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border/50">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted" />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                  Filtros
                </h2>
                <button
                  onClick={() => { haptic("light"); setFilterSheetOpen(false) }}
                  className="p-1 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Currency toggle — only shown when there are USD bills */}
              {hasAnyUSD && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 pl-1">Moneda</p>
                  <div className="flex rounded-xl bg-muted/40 p-0.5 gap-0.5">
                    <button
                      onClick={() => { haptic("selection"); setShowUSD(false) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!showUSD ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      ARS
                    </button>
                    <button
                      onClick={() => { haptic("selection"); setShowUSD(true) }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${showUSD ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                      USD
                    </button>
                  </div>
                </div>
              )}
              {organizations.map(org => {
                const orgCategories = availableCategories.filter(c => c.organizationId === org.id)
                const orgCards = availableCards.filter(c => c.organizationId === org.id)
                if (orgCategories.length === 0 && orgCards.length === 0) return null

                return (
                  <div key={org.id}>
                    {/* Org header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="size-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${MAUVE}20` }}
                      >
                        {org.isPersonal
                          ? <User className="size-3.5" style={{ color: MAUVE }} />
                          : <Home className="size-3.5" style={{ color: MAUVE }} />
                        }
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wider" style={{ color: MAUVE }}>
                        {org.name}
                      </span>
                    </div>

                    {/* Categories */}
                    {orgCategories.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2 pl-1">Categorías</p>
                        <div className="space-y-1">
                          {orgCategories.map(cat => {
                            const isSelected = localCategoryIds.has(cat.id)
                            return (
                              <button
                                key={cat.id}
                                onClick={() => { haptic("selection"); toggleCategory(cat.id) }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/60 text-foreground"
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                                  {cat.name}
                                </span>
                                {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cards */}
                    {orgCards.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 pl-1">Tarjetas</p>
                        <div className="space-y-1">
                          {orgCards.map(card => {
                            const isSelected = localCardIds.has(card.id)
                            return (
                              <button
                                key={card.id}
                                onClick={() => { haptic("selection"); toggleCard(card.id) }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/60 text-foreground"
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  <CreditCard className="size-4" style={{ color: card.color || MAUVE }} />
                                  {card.name}
                                </span>
                                {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-border/50 pb-safe">
              <button
                onClick={() => { haptic("light"); clearAllFilters() }}
                className="flex-1 h-12 rounded-xl bg-muted/50 text-muted-foreground font-medium active:scale-[0.98] transition-transform"
              >
                Limpiar
              </button>
              <button
                onClick={() => { haptic("medium"); applyFilters() }}
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  `Aplicar${localCategoryIds.size + localCardIds.size > 0 ? ` (${localCategoryIds.size + localCardIds.size})` : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
