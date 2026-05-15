"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef, useTransition } from "react"
import { ChevronLeft, ChevronRight, Plus, CreditCard, ChevronDown, Search, X } from "lucide-react"
import { MonthPicker } from "@/components/ui/month-picker"
import { cn } from "@/lib/utils"

interface BillItem {
  id: string; label: string; amount: number; amountUSD: number | null; paymentDate: string
  cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
}
interface CategoryGroup {
  name: string; color: string; icon: string | null; total: number; totalUSD: number | null; bills: BillItem[]
}
interface FilterOption {
  id: string
  name: string
  color?: string
  icon?: string | null
}

interface ActiveFilters {
  categoryId?: string
  cardId?: string
}

interface Props {
  month: string; monthKey: string; availableMonths: string[]
  categoryGroups: CategoryGroup[]
  grandTotal: number
  hasAnyUSD: boolean
  searchQuery?: string
  activeFilters?: ActiveFilters
  availableCategories?: FilterOption[]
  availableCards?: FilterOption[]
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 })
const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatARS(n: number) { return arsFormatter.format(n) }
function formatUSD(n: number) { return usdFormatter.format(n) }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function BillsView({
  month, monthKey, availableMonths, categoryGroups, grandTotal, hasAnyUSD,
  searchQuery = "", activeFilters = {}, availableCategories = [], availableCards = []
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [showPicker, setShowPicker] = useState(false)
  const [showUSD, setShowUSD] = useState(false)
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Search & Filter sheet state
  const [searchOpen, setSearchOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [localFilters, setLocalFilters] = useState<ActiveFilters>(activeFilters)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters = !!(activeFilters.categoryId || activeFilters.cardId)

  // Sync local state when props change
  useEffect(() => {
    setLocalSearch(searchQuery)
    setLocalFilters(activeFilters)
  }, [searchQuery, activeFilters])

  // Focus input when sheet opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString())

    // Search
    if (localSearch.trim()) {
      params.set("search", localSearch.trim())
    } else {
      params.delete("search")
    }

    // Category filter
    if (localFilters.categoryId) {
      params.set("categoryId", localFilters.categoryId)
    } else {
      params.delete("categoryId")
    }

    // Card filter
    if (localFilters.cardId) {
      params.set("cardId", localFilters.cardId)
    } else {
      params.delete("cardId")
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setSearchOpen(false)
  }

  function clearAllFilters() {
    setLocalSearch("")
    setLocalFilters({})
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    params.delete("categoryId")
    params.delete("cardId")
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
    setSearchOpen(false)
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
            <button onClick={() => prevMonth && router.push(`/bills?month=${prevMonth}`)} disabled={!prevMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronLeft className="size-4 text-[#6B5159]" />
            </button>
            <div className="text-center space-y-0.5">
              <button
                onClick={() => setShowPicker(true)}
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
                  {showUSD && grandTotalUSD !== null ? formatUSD(grandTotalUSD) : formatARS(grandTotal)}
                </p>
              )}
              {/* ARS / USD toggle — only shown when there are USD bills */}
              {hasAnyUSD && (
                <div className="flex items-center justify-center pt-1">
                  <div className="flex rounded-full bg-white/40 backdrop-blur-sm p-0.5">
                    <button
                      onClick={() => setShowUSD(false)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${!showUSD ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      ARS
                    </button>
                    <button
                      onClick={() => setShowUSD(true)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${showUSD ? "bg-white/80 text-[#4A3540] shadow-sm" : "text-[#9D8189]"}`}
                    >
                      USD
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => nextMonth && router.push(`/bills?month=${nextMonth}`)} disabled={!nextMonth}
              className="size-8 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-sm disabled:opacity-30 active:scale-95 transition-all">
              <ChevronRight className="size-4 text-[#6B5159]" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter button */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-full",
            "bg-white/60 backdrop-blur-sm border border-white/80",
            "active:scale-[0.98] transition-all",
            (searchQuery || hasActiveFilters) && "ring-2 ring-primary/20"
          )}
        >
          <Search className="size-4 text-[#9D8189]" />
          {searchQuery ? (
            <span className="text-sm text-[#4A3540]">"{searchQuery}"</span>
          ) : (
            <span className="text-sm text-[#9D8189]">Buscar y filtrar</span>
          )}
          {(searchQuery || hasActiveFilters) && (
            <span className="size-2 rounded-full bg-primary ml-1" />
          )}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {categoryGroups.length > 0 ? (
          categoryGroups.map((group) => {
            const usdLabel = groupUSDDisplay(group)
            const isCollapsed = collapsedCategories.has(group.name)
            const toggleCollapse = () => setCollapsedCategories(prev => {
              const next = new Set(prev)
              if (next.has(group.name)) next.delete(group.name)
              else next.add(group.name)
              return next
            })
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
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-base font-medium tabular-nums text-foreground" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                              {showUSD && usdBill ? usdBill : formatARS(bill.amount)}
                            </p>
                            {/* Secondary line: show ARS when in USD mode (or vice versa) */}
                            {showUSD && usdBill && (
                              <p className="text-[10px] text-muted-foreground">{formatARS(bill.amount)}</p>
                            )}
                            {!showUSD && bill.amountUSD && (
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
                  onClick={clearAllFilters}
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
          onSelect={(key) => router.push(`/bills?month=${key}`)}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Search & Filter Sheet */}
      {searchOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-xl animate-slide-up">
            <div className="p-4 space-y-4">
              {/* Handle */}
              <div className="flex justify-center">
                <div className="w-10 h-1 rounded-full bg-muted" />
              </div>

              {/* Title */}
              <h2 className="text-lg font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                Buscar y filtrar
              </h2>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Buscar por nombre, notas..."
                  className={cn(
                    "w-full h-12 pl-10 pr-4 rounded-xl",
                    "bg-muted/50 border border-border",
                    "text-sm placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                />
              </div>

              {/* Category filter */}
              {availableCategories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setLocalFilters(f => ({ ...f, categoryId: undefined }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        !localFilters.categoryId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Todas
                    </button>
                    {availableCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setLocalFilters(f => ({ ...f, categoryId: cat.id }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5",
                          localFilters.categoryId === cat.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {cat.icon && <span className="text-xs">{cat.icon}</span>}
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Card filter */}
              {availableCards.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tarjeta</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setLocalFilters(f => ({ ...f, cardId: undefined }))}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        !localFilters.cardId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Todas
                    </button>
                    {availableCards.map(card => (
                      <button
                        key={card.id}
                        onClick={() => setLocalFilters(f => ({ ...f, cardId: card.id }))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5",
                          localFilters.cardId === card.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <CreditCard className="size-3" />
                        {card.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-safe">
                <button
                  onClick={clearAllFilters}
                  className="flex-1 h-12 rounded-xl bg-muted/50 text-muted-foreground font-medium active:scale-[0.98] transition-transform"
                >
                  Limpiar
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
