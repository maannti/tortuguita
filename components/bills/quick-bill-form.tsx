"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, CreditCard, Banknote, Wallet, Ellipsis, ChevronDown, Plus, User, Home, X } from "lucide-react"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"

interface DefaultAssignment { userId: string; percentage: number }
interface Category {
  id: string; name: string; color: string | null; icon: string | null; isCreditCard: boolean; organizationId: string
  currentClosingDate?: Date | string | null
  currentDueDate?: Date | string | null
  nextClosingDate?: Date | string | null
  nextDueDate?: Date | string | null
  defaultAssignments?: DefaultAssignment[] | null
}
interface Member { id: string; name: string | null; email: string | null; organizationId: string }
interface Organization { id: string; name: string; isPersonal: boolean }
interface InitialData {
  id: string
  label: string
  amount: number
  amountUSD?: number | null
  billTypeId: string
  categoryId?: string | null
  isCreditCard: boolean
  paymentDate: string  // yyyy-MM-dd
  totalInstallments: number | null
  notes: string | null
  assignments: Array<{ userId: string; percentage: number }>
  organizationId?: string
  recurringBillId?: string | null
}
interface Props {
  categories: Category[]
  members: Member[]
  memberIncomes: Record<string, number>
  currentUserId: string
  organizations: Organization[]
  backHref?: string
  defaultInstallments?: number
  mode?: "create" | "edit"
  initialData?: InitialData
}

type PaymentMethod = "debit" | "credit" | "cash" | "other"

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "debit",  label: "Débito",   icon: <Wallet     className="size-4" /> },
  { value: "credit", label: "Crédito",  icon: <CreditCard className="size-4" /> },
  { value: "cash",   label: "Efectivo", icon: <Banknote   className="size-4" /> },
  { value: "other",  label: "Otro",     icon: <Ellipsis   className="size-4" /> },
]

const INSTALLMENT_OPTIONS = [1, 3, 6, 9, 12]

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }
function parseAmount(s: string): number { return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 }
function formatDisplay(n: number): string { if (!n) return ""; const [int, dec] = n.toString().split("."); const f = int.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return dec ? `${f},${dec}` : f }
function formatDateDisplay(iso: string): string { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y.slice(2)}` }
function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

/** Convert category defaultAssignments → splitMode string (returns null if can't map) */
function defaultAssignmentsToSplitMode(
  assignments: DefaultAssignment[] | null | undefined,
  currentUserId: string,
  orgMembers: Member[]
): string | null {
  if (!assignments || assignments.length === 0) return null
  if (assignments.length === 1 && assignments[0].percentage === 100) {
    return assignments[0].userId === currentUserId ? "mine" : assignments[0].userId
  }
  const equalShare = Math.round(100 / orgMembers.length)
  const allEqual = orgMembers.every(m => {
    const a = assignments.find(x => x.userId === m.id)
    return a && Math.abs(a.percentage - equalShare) <= 1
  })
  if (allEqual && assignments.length === orgMembers.length) return "equal"
  return null
}

/** Infer a simple splitMode from saved assignments */
function inferSplitMode(assignments: Array<{ userId: string; percentage: number }>, currentUserId: string, members: Member[]): string {
  if (assignments.length === 0) return "mine"
  if (assignments.length === 1) {
    const a = assignments[0]
    if (a.userId === currentUserId) return "mine"
    return a.userId  // solo de otra persona
  }
  const equalShare = Math.round(100 / assignments.length)
  const allEqual = assignments.every(a => Math.abs(a.percentage - equalShare) <= 1)
  if (allEqual) return "equal"
  return "income"  // default a proporcional si no encaja
}

export function QuickBillForm({ categories, members, memberIncomes, currentUserId, organizations, backHref, defaultInstallments, mode = "create", initialData }: Props) {
  const { push, refresh, back } = useRouter()
  const isEdit = mode === "edit"

  // Space selection (only in create mode; edit uses the bill's existing org)
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    initialData?.organizationId ?? organizations[0]?.id ?? ""
  )

  // Derive initial payment method from initialData
  const initPaymentMethod: PaymentMethod | "" = initialData
    ? (initialData.isCreditCard ? "credit" : "debit")
    : ""
  const initSplitMode = initialData
    ? inferSplitMode(initialData.assignments, currentUserId, members)
    : "mine"

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateRecurring, setUpdateRecurring] = useState(false)
  const [label, setLabel] = useState(initialData?.label ?? "")
  // Currency toggle: default ARS. If a bill already has a USD value, edit in USD.
  const [currency, setCurrency] = useState<"ARS" | "USD">(initialData?.amountUSD ? "USD" : "ARS")
  const [amountDisplay, setAmountDisplay] = useState(
    initialData ? formatDisplay(initialData.amountUSD ? initialData.amountUSD : initialData.amount) : ""
  )
  // ARS per USD — reconstructed in edit mode when both values exist
  const [usdRate, setUsdRate] = useState(
    initialData?.amountUSD && initialData.amount
      ? formatDisplay(Math.round((initialData.amount / initialData.amountUSD) * 100) / 100)
      : ""
  )
  const [rateIsLive, setRateIsLive] = useState(false)
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  // For non-CC: categoryId maps to billTypeId. For CC: categoryId maps to the new categoryId field.
  const [categoryId, setCategoryId] = useState(
    initialData
      ? (initialData.isCreditCard ? (initialData.categoryId ?? "") : initialData.billTypeId)
      : ""
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(initPaymentMethod)
  const [cardId, setCardId] = useState(initialData?.isCreditCard ? initialData.billTypeId : "")
  const [installments, setInstallments] = useState(initialData?.totalInstallments ?? defaultInstallments ?? 1)
  const [customInstallments, setCustomInstallments] = useState("")
  const [splitMode, setSplitMode] = useState<string>(initSplitMode)
  // soloMemberId: person selected in "Solo de..." option
  const initSoloMemberId = (() => {
    if (!initialData) return ""
    const inf = inferSplitMode(initialData.assignments, currentUserId, members)
    const isMember = inf !== "mine" && inf !== "equal" && inf !== "income"
    return isMember ? inf : ""
  })()
  const [soloMemberId, setSoloMemberId] = useState<string>(initSoloMemberId)
  const [paymentDate, setPaymentDate] = useState<string>(
    initialData?.paymentDate ?? new Date().toISOString().split("T")[0]
  )
  const [catSheetOpen, setCatSheetOpen] = useState(false)
  const [catSpacePicker, setCatSpacePicker] = useState(false)

  // ── Draft persistence (create mode only) ────────────────────────────────
  const DRAFT_KEY = "new-bill-draft"

  // Restore draft on mount
  useEffect(() => {
    if (isEdit) return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.label)             setLabel(d.label)
      if (d.amountDisplay)     setAmountDisplay(d.amountDisplay)
      if (d.currency)          setCurrency(d.currency)
      if (d.usdRate)           setUsdRate(d.usdRate)
      if (d.notes)             setNotes(d.notes)
      if (d.categoryId)    setCategoryId(d.categoryId)
      if (d.paymentMethod) setPaymentMethod(d.paymentMethod)
      // Only restore cardId if the card still exists in the available list
      // (covers the case where you navigate away to create a card and return)
      if (d.cardId && categories.some(c => c.id === d.cardId && c.isCreditCard)) setCardId(d.cardId)
      if (d.installments)  setInstallments(d.installments)
      if (d.splitMode) { setSplitMode(d.splitMode); if (d.soloMemberId) setSoloMemberId(d.soloMemberId) }
      if (d.paymentDate)   setPaymentDate(d.paymentDate)
      if (d.selectedOrgId) setSelectedOrgId(d.selectedOrgId)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft on every change
  useEffect(() => {
    if (isEdit) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        label, amountDisplay, currency, usdRate, notes, categoryId, paymentMethod, cardId,
        installments, splitMode, soloMemberId, paymentDate, selectedOrgId,
      }))
    } catch {}
  }, [label, amountDisplay, currency, usdRate, notes, categoryId, paymentMethod, cardId, installments, splitMode, soloMemberId, paymentDate, selectedOrgId, isEdit])
  // ─────────────────────────────────────────────────────────────────────────

  // Prefill the official USD→ARS rate (same source as card imports). Only fills
  // when the field is still empty, so it never clobbers an edit or a manual rate.
  useEffect(() => {
    let active = true
    fetch("/api/exchange-rate")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.rate) return
        setUsdRate((prev) => (prev ? prev : formatDisplay(d.rate)))
        setRateIsLive(true)
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const isCreditCard = paymentMethod === "credit"
  // rawAmount = value typed in the selected currency; amount is always ARS (for budget math)
  const rawAmount = parseAmount(amountDisplay)
  const usdRateValue = parseAmount(usdRate)
  const amount = currency === "USD" ? Math.round(rawAmount * usdRateValue * 100) / 100 : rawAmount
  const amountUSDValue = currency === "USD" ? rawAmount : null
  const amountPerInstallment = installments > 1 ? amount / installments : amount

  // Strip thousand-dots, keep digits + one comma, re-format integer part
  function handleAmountChange(value: string) {
    const stripped = value.replace(/\./g, "").replace(/[^0-9,]/g, "")
    const commaIdx = stripped.indexOf(",")
    const intPart = commaIdx >= 0 ? stripped.slice(0, commaIdx) : stripped
    const decPart = commaIdx >= 0 ? stripped.slice(commaIdx + 1) : null
    const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
    setAmountDisplay(decPart !== null ? `${formattedInt},${decPart}` : formattedInt)
  }
  const totalIncome = Object.values(memberIncomes).reduce((s, v) => s + v, 0)
  const hasIncomes = totalIncome > 0

  const orgCategories = categories.filter(c => c.organizationId === selectedOrgId)
  const normalCats = orgCategories.filter(c => !c.isCreditCard)
  // CC cards are user-level, not space-level — show all regardless of selected org
  const ccCards = categories.filter(c => c.isCreditCard)
  // For CC bills: show ALL expense categories from ALL spaces (org is derived from chosen category)
  const allNormalCats = categories.filter(c => !c.isCreditCard)
  const orgMembers = members.filter(m => m.organizationId === selectedOrgId)

  // Auto-apply default assignments when category changes (create mode only)
  function applyDefaultAssignments(catId: string) {
    if (isEdit) return
    const cat = categories.find(c => c.id === catId)
    if (!cat?.defaultAssignments) return
    const mode = defaultAssignmentsToSplitMode(cat.defaultAssignments, currentUserId, orgMembers)
    if (mode) setSplitMode(mode)
  }

  const billTypeId = isCreditCard ? cardId : categoryId

  const canSave = !!label.trim() && amount > 0 && !!paymentMethod &&
    (isCreditCard ? !!cardId : !!categoryId)

  function buildAssignments(): Array<{ userId: string; percentage: number }> {
    if (splitMode === "mine") return [{ userId: currentUserId, percentage: 100 }]
    if (orgMembers.length <= 1) return [{ userId: currentUserId, percentage: 100 }]
    const specific = orgMembers.find((m) => m.id === splitMode)
    if (specific) return [{ userId: specific.id, percentage: 100 }]
    if (splitMode === "income" && hasIncomes) {
      let dist = 0
      return orgMembers.map((m, i) => {
        const inc = memberIncomes[m.id] || 0
        const pct = i === orgMembers.length - 1 ? 100 - dist : Math.round((inc / totalIncome) * 100)
        dist += pct
        return { userId: m.id, percentage: pct }
      })
    }
    // Distribute remainder across first N members to avoid giving all rounding error to one person
    const n = orgMembers.length
    const base = Math.floor(100 / n); const rem = 100 - base * n
    return orgMembers.map((m, i) => ({ userId: m.id, percentage: i < rem ? base + 1 : base }))
  }

  function getMemberShare(memberId: string): number { const a = buildAssignments().find(a => a.userId === memberId); if (!a) return 0; return (amountPerInstallment * a.percentage) / 100 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) { setError("Completá todos los campos requeridos"); return }
    setError(null); setIsLoading(true)
    try {
      const url    = isEdit ? `/api/bills/${initialData!.id}` : "/api/bills"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          amount,
          amountUSD: amountUSDValue,
          paymentDate: new Date(paymentDate + "T12:00:00").toISOString(),
          billTypeId,
          categoryId: isCreditCard ? (categoryId || null) : null,
          ...(isCreditCard && installments > 1 ? { totalInstallments: installments } : {}),
          assignments: buildAssignments(),
          notes: notes.trim() || "",
          organizationId: selectedOrgId,
          ...(isEdit && updateRecurring ? { updateRecurring: true } : {}),
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
      const dest = isEdit ? (backHref ?? `/bills/${initialData!.id}`) : "/bills"
      push(dest); refresh()
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
      }
    } finally { setIsLoading(false) }
  }

  const otherMembers = orgMembers.filter((m) => m.id !== currentUserId)

  // Billing period feedback for credit card + selected card + date
  const selectedCard = isCreditCard && cardId ? ccCards.find(c => c.id === cardId) : null
  type BillingFeedback =
    | { type: "current";        dueDate: string; closingDate: string }
    | { type: "current-closed"; dueDate: string; closingDate: string }
    | { type: "next";           dueDate: string; closingDate: string }
    | { type: "no-next" }
    | { type: "no-period" }
    | null
  const billingFeedback: BillingFeedback = (() => {
    if (!selectedCard || !paymentDate) return null
    const payment = new Date(paymentDate + "T12:00:00")
    const closing = selectedCard.currentClosingDate ? new Date(selectedCard.currentClosingDate) : null
    const due     = selectedCard.currentDueDate     ? new Date(selectedCard.currentDueDate)     : null
    if (!closing || !due) return { type: "no-period" }
    // normalize to midnight for comparison
    const today = new Date(); today.setHours(0,0,0,0)
    const p = new Date(payment); p.setHours(0,0,0,0)
    const c = new Date(closing); c.setHours(0,0,0,0)
    const d = new Date(due); d.setHours(0,0,0,0)
    // If the current closing is already in the past and the expense is after it → next period
    // If the current due date already passed → rotation needed (stale period)
    if (today > d) {
      // Current period expired — check if next period is already configured
      const nextDue2     = selectedCard.nextDueDate     ? new Date(selectedCard.nextDueDate)     : null
      const nextClosing2 = selectedCard.nextClosingDate ? new Date(selectedCard.nextClosingDate) : null
      if (!nextDue2) return { type: "no-next" }
      return { type: "next", dueDate: formatShortDate(nextDue2), closingDate: formatShortDate(nextClosing2) }
    }
    if (p <= c) {
      // Expense is before closing. If closing already passed, show as "closed" (amber), not green
      if (today > c) return { type: "current-closed", dueDate: formatShortDate(due), closingDate: formatShortDate(closing) }
      return { type: "current", dueDate: formatShortDate(due), closingDate: formatShortDate(closing) }
    }
    const nextDue     = selectedCard.nextDueDate     ? new Date(selectedCard.nextDueDate)     : null
    const nextClosing = selectedCard.nextClosingDate ? new Date(selectedCard.nextClosingDate) : null
    if (!nextDue) return { type: "no-next" }
    return { type: "next", dueDate: formatShortDate(nextDue), closingDate: formatShortDate(nextClosing) }
  })()

  // Build a hint about what's missing when canSave is false
  const saveHint = (() => {
    if (!label.trim() && rawAmount <= 0) return "Completá la descripción y el monto para guardar"
    if (rawAmount <= 0) return "Ingresá el monto para guardar"
    if (currency === "USD" && usdRateValue <= 0) return "Ingresá la cotización del dólar"
    if (!label.trim()) return "Ingresá una descripción para guardar"
    if (!paymentMethod) return "Seleccioná un medio de pago"
    if (isCreditCard && !cardId) return "Seleccioná una tarjeta"
    if (!isCreditCard && !categoryId) return "Seleccioná una categoría"
    return null
  })()

  // Shared modern field style — soft filled, rounded, subtle focus ring
  const fieldClass =
    "w-full rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5 text-sm transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button type="button" onClick={() => backHref ? push(backHref) : back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="text-base font-semibold">{isEdit ? "Editar gasto" : "Nuevo gasto"}</h1>
        <button type="submit" disabled={isLoading || !canSave} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "..." : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-5">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}
          {!canSave && !error && saveHint && (
            <p className="text-xs text-muted-foreground text-center px-2">{saveHint}</p>
          )}

          {/* ── Monto (hero) ── */}
          <div className="pt-1 pb-2">
            {/* Currency toggle */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex rounded-full bg-muted/50 p-[3px]">
                {(["ARS", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { if (c !== currency) { setCurrency(c); setAmountDisplay("") } }}
                    className={`px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                      currency === c ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c === "ARS" ? "Pesos" : "Dólares"}
                  </button>
                ))}
              </div>
            </div>
            {/* Big serif amount with small prefix */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-lg text-muted-foreground/60 font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                {currency === "ARS" ? "$" : "U$S"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                onBlur={() => { const n = parseAmount(amountDisplay); if (n > 0) setAmountDisplay(formatDisplay(n)) }}
                placeholder="0"
                autoFocus={!isEdit}
                className="w-full max-w-[13rem] bg-transparent text-center text-5xl font-semibold focus:outline-none placeholder:text-muted-foreground/20"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              />
            </div>
            {/* USD → exchange rate (only when Dólares) */}
            {currency === "USD" && (
              <div className="mt-5 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cotización</span>
                  <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/30 px-2.5 py-1.5 transition-colors focus-within:bg-background focus-within:border-primary/40">
                    <span className="text-muted-foreground text-xs">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={usdRate}
                      onChange={(e) => {
                        const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9,]/g, "")
                        const commaIdx = stripped.indexOf(",")
                        const intPart = commaIdx >= 0 ? stripped.slice(0, commaIdx) : stripped
                        const decPart = commaIdx >= 0 ? stripped.slice(commaIdx + 1) : null
                        const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                        setUsdRate(decPart !== null ? `${formattedInt},${decPart}` : formattedInt)
                      }}
                      placeholder="1.000"
                      className="w-16 bg-transparent text-sm text-center focus:outline-none"
                    />
                  </div>
                  {amount > 0 && <span className="text-xs font-medium text-foreground/70">= {formatARS(amount)}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {rateIsLive ? "Dólar oficial · podés editarlo" : "Ingresá la cotización"}
                </span>
              </div>
            )}
          </div>

          {/* Título del gasto */}
          <div className="space-y-1.5">
            <p className={labelClass}>Título del gasto</p>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Supermercado, alquiler, nafta…" className={fieldClass} />
          </div>

          {/* Espacio — oculto para CC (el espacio se deriva de la categoría elegida) */}
          {organizations.length > 1 && !isCreditCard && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Espacio</p>
              <div className="grid grid-cols-2 gap-2">
                {organizations.map((org) => {
                  const isSelected = selectedOrgId === org.id
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => { setSelectedOrgId(org.id); setCategoryId(""); setCardId("") }}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all active:scale-[0.97] ${
                        isSelected
                          ? "border-primary bg-primary/8 dark:bg-primary/25 text-foreground shadow-sm"
                          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div
                        className="size-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ backgroundColor: isSelected ? "#9D8189" : "#9D818920" }}
                      >
                        {org.isPersonal
                          ? <User className="size-4" style={{ color: isSelected ? "#fff" : "#9D8189" }} />
                          : <Home className="size-4" style={{ color: isSelected ? "#fff" : "#9D8189" }} />}
                      </div>
                      <span className="flex-1 text-left leading-tight">{org.name}</span>
                      {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* "Aplicar de acá en adelante" — solo al editar bills generados por recurrentes */}
          {isEdit && initialData?.recurringBillId && (
            <button
              type="button"
              onClick={() => setUpdateRecurring(v => !v)}
              className={`flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                updateRecurring
                  ? "border-primary bg-primary/5 dark:bg-primary/20"
                  : "border-border bg-background"
              }`}
            >
              <div className={`size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                updateRecurring ? "bg-primary border-primary" : "border-muted-foreground/30"
              }`}>
                {updateRecurring && <Check className="size-3 text-primary-foreground stroke-[3]" />}
              </div>
              <div>
                <p className="text-sm font-medium">Actualizar también los meses siguientes</p>
                <p className="text-xs text-muted-foreground">
                  {updateRecurring
                    ? `El recurrente queda en ${formatARS(amount || initialData.amount)}/mes`
                    : "Solo cambia este mes"}
                </p>
              </div>
            </button>
          )}

          {/* Categoría — siempre visible cuando no es crédito */}
          {!isCreditCard && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</p>
              {(() => {
                const sel = allNormalCats.find(c => c.id === categoryId)
                return (
                  <button type="button" onClick={() => setCatSheetOpen(true)}
                    className="w-full flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-left transition-all hover:bg-muted/50 focus:outline-none focus:border-primary/40">
                    {sel ? (
                      <>
                        {sel.icon
                          ? <span className="text-base leading-none flex-shrink-0">{sel.icon}</span>
                          : <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: sel.color || "#6b7280" }} />}
                        <span className="flex-1 font-medium text-foreground">{sel.name}</span>
                        {organizations.length > 1 && (
                          <span className="text-xs text-muted-foreground/60">{organizations.find(o => o.id === sel.organizationId)?.name}</span>
                        )}
                      </>
                    ) : (
                      <span className="flex-1 text-muted-foreground">Seleccioná una categoría</span>
                    )}
                    <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
                  </button>
                )
              })()}
            </div>
          )}

          {/* Medio de pago */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medio de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm.value} type="button"
                  onClick={() => {
                    setPaymentMethod(pm.value)
                    if (pm.value !== "credit") { setCardId(""); setInstallments(1); setCustomInstallments("") }
                    // categoryId se mantiene al cambiar medio de pago para no perder la selección
                  }}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm text-left transition-all ${paymentMethod === pm.value ? "border-primary bg-primary/5 dark:bg-primary/20 font-medium text-foreground" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                  {pm.icon}
                  <span>{pm.label}</span>
                  {paymentMethod === pm.value && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas de crédito — sin tarjetas configuradas */}
          {isCreditCard && ccCards.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No tenés tarjetas configuradas para este espacio.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => push(`/cards?spaceId=${selectedOrgId}`)}
              >
                Agregá una tarjeta
              </button>{" "}
              antes de cargar un gasto con crédito.
            </div>
          )}

          {/* Tarjetas de crédito */}
          {isCreditCard && ccCards.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">¿Con qué tarjeta?</p>
              <div className="grid grid-cols-2 gap-2">
                {ccCards.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCardId(cat.id)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm text-left transition-all ${cardId === cat.id ? "border-primary bg-primary/5 dark:bg-primary/20 font-medium text-foreground" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                    <CardIcon bankId={BANKS.find(b => b.color === cat.color)?.id ?? null} bankColor={cat.color || "#9D8189"} bankName={cat.name} network={isNetworkId(cat.icon) ? cat.icon as NetworkId : null} size="sm" />
                    <span className="truncate">{cat.name}</span>
                    {cardId === cat.id && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categoría del gasto — para tarjetas de crédito (elige el espacio implícitamente) */}
          {isCreditCard && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categoría <span className="normal-case font-normal">(opcional)</span>
              </label>
              {(() => {
                const sel = allNormalCats.find(c => c.id === categoryId)
                return (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCatSheetOpen(true)}
                      className="flex-1 flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-left transition-all hover:bg-muted/50 focus:outline-none focus:border-primary/40">
                      {sel ? (
                        <>
                          {sel.icon
                            ? <span className="text-base leading-none flex-shrink-0">{sel.icon}</span>
                            : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sel.color || "#6b7280" }} />}
                          <span className="flex-1 font-medium text-foreground">{sel.name}</span>
                          {organizations.length > 1 && (
                            <span className="text-xs text-muted-foreground/60">{organizations.find(o => o.id === sel.organizationId)?.name}</span>
                          )}
                        </>
                      ) : (
                        <span className="flex-1 text-muted-foreground">Sin categoría</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                    {categoryId && (
                      <button type="button" onClick={() => setCategoryId("")}
                        className="w-12 rounded-2xl border border-border/40 bg-muted/30 flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-all">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <p className={labelClass}>{isCreditCard ? "Fecha de compra" : "Fecha"}</p>
            <div className="relative w-full rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5 text-sm cursor-pointer transition-all hover:bg-muted/50">
              <span className={paymentDate ? "text-foreground" : "text-muted-foreground"}>
                {paymentDate ? formatDateDisplay(paymentDate) : "DD/MM/AA"}
              </span>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* Billing period feedback */}
          {billingFeedback && (
            <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm ${
              billingFeedback.type === "current"        ? "bg-[#D8E2DC]/60 text-[#3a5a45]" :
              billingFeedback.type === "current-closed" ? "bg-amber-50 text-amber-800 border border-amber-200" :
              billingFeedback.type === "next"           ? "bg-[#FFE5D9]/70 text-[#7a4520]" :
              "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              <span className="mt-px text-base leading-none flex-shrink-0">
                {billingFeedback.type === "current" ? "✓" :
                 billingFeedback.type === "next"    ? "→" : "⚠"}
              </span>
              <div>
                {billingFeedback.type === "current" && (
                  <>
                    <p className="font-medium leading-snug">Entra en el período actual</p>
                    <p className="text-xs opacity-75 mt-0.5">Cierre {billingFeedback.closingDate} · vence {billingFeedback.dueDate}</p>
                  </>
                )}
                {billingFeedback.type === "current-closed" && (
                  <>
                    <p className="font-medium leading-snug">Período ya cerrado — se asigna al vencimiento</p>
                    <p className="text-xs opacity-75 mt-0.5">Cerró el {billingFeedback.closingDate} · vence {billingFeedback.dueDate}</p>
                  </>
                )}
                {billingFeedback.type === "next" && (
                  <>
                    <p className="font-medium leading-snug">Entra en el próximo período</p>
                    <p className="text-xs opacity-75 mt-0.5">Ya pasó el cierre · vence {billingFeedback.dueDate}</p>
                  </>
                )}
                {billingFeedback.type === "no-next" && (
                  <>
                    <p className="font-medium leading-snug">El período venció — actualizá las fechas</p>
                    <p className="text-xs opacity-75 mt-0.5">
                      Configurá el nuevo cierre en{" "}
                      <button type="button" className="underline font-semibold" onClick={() => push("/cards")}>
                        Tarjetas
                      </button>
                    </p>
                  </>
                )}
                {billingFeedback.type === "no-period" && (
                  <>
                    <p className="font-medium leading-snug">Esta tarjeta no tiene período configurado</p>
                    <p className="text-xs opacity-75 mt-0.5">Configuralo en <button type="button" className="underline font-semibold" onClick={() => push("/cards")}>Tarjetas</button> para ver el impacto correcto</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cuotas */}
          {isCreditCard && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuotas</p>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button key={n} type="button" onClick={() => { setInstallments(n); setCustomInstallments("") }}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${installments === n && !customInstallments ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                    {n === 1 ? "1 pago" : `${n}x`}
                  </button>
                ))}
                <div className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors ${customInstallments ? "border-primary bg-primary/5 dark:bg-primary/20" : "border-border"}`}>
                  <input type="text" inputMode="numeric" value={customInstallments}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCustomInstallments(v); const n = parseInt(v); if (n > 0) setInstallments(n) }}
                    placeholder="otro" className="w-12 bg-transparent text-center focus:outline-none text-muted-foreground placeholder:text-muted-foreground/50" />
                  {customInstallments && <span className="text-muted-foreground text-xs">x</span>}
                </div>
              </div>
              {installments > 1 && amount > 0 && <p className="text-xs text-muted-foreground pt-1">{formatARS(amountPerInstallment)} / mes por {installments} meses</p>}
            </div>
          )}

          {/* Detalle (notas opcionales) */}
          <div className="space-y-1.5">
            <p className={labelClass}>Detalle <span className="normal-case font-normal">(opcional)</span></p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descripción adicional, observaciones..."
              rows={2}
              className={`${fieldClass} resize-none`}
            />
          </div>

          {/* División */}
          {orgMembers.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">División</p>
              <div className="space-y-2">
                {[
                  { value: "income", label: "Gasto común", desc: hasIncomes ? orgMembers.map(m => { const inc = memberIncomes[m.id] || 0; return `${m.name?.split(" ")[0]} ${Math.round((inc / totalIncome) * 100)}%` }).join(" · ") : "Configurar ingresos en Config →" },
                  { value: "equal",  label: "Gasto compartido", desc: "A partes iguales" },
                  { value: "mine",   label: "Solo mío",          desc: "100% a mi cargo" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSplitMode(opt.value)}
                    className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${splitMode === opt.value ? "border-primary bg-primary/5 dark:bg-primary/20" : "border-border/40 bg-muted/30 hover:bg-muted/50"}`}>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
                    {splitMode === opt.value && <Check className="size-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
                {/* Solo de... — single option with inline person picker */}
                {otherMembers.length > 0 && (() => {
                  const isSolo = otherMembers.some(m => m.id === splitMode)
                  const selectedSolo = otherMembers.find(m => m.id === splitMode) ?? otherMembers.find(m => m.id === soloMemberId) ?? otherMembers[0]
                  return (
                    <div className={`rounded-2xl border transition-all ${isSolo ? "border-primary bg-primary/5 dark:bg-primary/20" : "border-border/40 bg-muted/30"}`}>
                      <button type="button"
                        onClick={() => { const target = soloMemberId || otherMembers[0]?.id || ""; setSoloMemberId(target); setSplitMode(target) }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left">
                        <div>
                          <p className="text-sm font-medium">Solo de…</p>
                          <p className="text-xs text-muted-foreground">{isSolo ? `100% a cargo de ${selectedSolo?.name?.split(" ")[0]}` : "Elegir persona"}</p>
                        </div>
                        {isSolo && <Check className="size-4 text-primary flex-shrink-0" />}
                      </button>
                      {isSolo && (
                        <div className="border-t border-primary/10 px-4 pb-3 pt-2 flex flex-wrap gap-2">
                          {otherMembers.map(m => (
                            <button key={m.id} type="button"
                              onClick={() => { setSoloMemberId(m.id); setSplitMode(m.id) }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${splitMode === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                              {m.name?.split(" ")[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              {amount > 0 && (
                <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">{installments > 1 ? `Cuota mensual de ${formatARS(amountPerInstallment)}` : "División del gasto"}</p>
                  {orgMembers.map((m) => { const share = getMemberShare(m.id); if (share <= 0) return null; return (<div key={m.id} className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{m.name}</span><span className="text-sm font-semibold">{formatARS(share)}</span></div>) })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Category bottom sheet ─────────────────────────────────────────── */}
      {catSheetOpen && (() => {
        const MAUVE = "#9D8189"
        const returnPath = isEdit ? `/bills/${initialData?.id}/edit` : "/bills/new"
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setCatSheetOpen(false); setCatSpacePicker(false) }} />
            <div className="relative bg-background rounded-t-3xl max-h-[75vh] flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
                <p className="text-sm font-semibold">Categoría</p>
                <div className="flex items-center gap-2">
                  {/* + Nueva with space picker */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (organizations.length === 1) {
                          const org = organizations[0]
                          push(`/categories/new?spaceId=${org.id}&spaceName=${encodeURIComponent(org.name)}&returnTo=${encodeURIComponent(returnPath)}`)
                        } else {
                          setCatSpacePicker(v => !v)
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-full transition-colors active:scale-95"
                    >
                      <Plus className="size-3" /> Nueva
                      {organizations.length > 1 && <ChevronDown className={`size-3 transition-transform ${catSpacePicker ? "rotate-180" : ""}`} />}
                    </button>
                    {catSpacePicker && (
                      <div className="absolute right-0 top-full mt-1.5 z-10 bg-background border border-border rounded-2xl shadow-lg overflow-hidden min-w-[160px]">
                        {organizations.map(org => (
                          <button key={org.id} type="button"
                            onClick={() => {
                              setCatSpacePicker(false)
                              push(`/categories/new?spaceId=${org.id}&spaceName=${encodeURIComponent(org.name)}&returnTo=${encodeURIComponent(returnPath)}`)
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left">
                            <div className="size-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MAUVE}25` }}>
                              {org.isPersonal ? <User className="size-3" style={{ color: MAUVE }} /> : <Home className="size-3" style={{ color: MAUVE }} />}
                            </div>
                            <span className="truncate">{org.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setCatSheetOpen(false); setCatSpacePicker(false) }} className="text-muted-foreground active:scale-90 transition-all">
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
                {/* Sin categoría (only for CC bills) */}
                {isCreditCard && (
                  <button type="button"
                    onClick={() => { setCategoryId(""); setCatSheetOpen(false) }}
                    className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors ${!categoryId ? "bg-primary/10 dark:bg-primary/25 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"}`}>
                    Sin categoría
                  </button>
                )}

                {/* Categories grouped by space */}
                {organizations.map(org => {
                  const orgCats = allNormalCats.filter(c => c.organizationId === org.id)
                  if (orgCats.length === 0) return null
                  return (
                    <div key={org.id}>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MAUVE}25` }}>
                            {org.isPersonal ? <User className="size-3" style={{ color: MAUVE }} /> : <Home className="size-3" style={{ color: MAUVE }} />}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: MAUVE }}>{org.name}</p>
                        </div>
                        <button type="button"
                          onClick={() => {
                            setCatSpacePicker(false)
                            push(`/categories/new?spaceId=${org.id}&spaceName=${encodeURIComponent(org.name)}&returnTo=${encodeURIComponent(returnPath)}`)
                          }}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                          <Plus className="size-3" /> agregar
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        {orgCats.map(cat => {
                          const isSelected = cat.id === categoryId
                          return (
                            <button key={cat.id} type="button"
                              onClick={() => {
                                setCategoryId(cat.id)
                                setSelectedOrgId(cat.organizationId)
                                setCatSheetOpen(false)
                                applyDefaultAssignments(cat.id)
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isSelected ? "bg-primary/10 dark:bg-primary/25 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}`}>
                              <span className="flex items-center gap-2.5">
                                {cat.icon
                                  ? <span className="text-base leading-none">{cat.icon}</span>
                                  : <span className="size-2 rounded-full" style={{ backgroundColor: cat.color || "#6b7280" }} />}
                                {cat.name}
                              </span>
                              {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </form>
  )
}
