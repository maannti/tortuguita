"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, CreditCard, Banknote, Wallet, Ellipsis, ChevronDown, Plus, User, Home, X, Repeat, Bell } from "lucide-react"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"
import { haptic } from "@/lib/haptics"

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
  const [label, setLabel] = useState(initialData?.label ?? "")
  const [amountDisplay, setAmountDisplay] = useState(initialData ? formatDisplay(initialData.amount) : "")
  const [amountUSDDisplay, setAmountUSDDisplay] = useState(initialData?.amountUSD ? String(initialData.amountUSD) : "")
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
  const [paymentDate, setPaymentDate] = useState<string>(
    initialData?.paymentDate ?? new Date().toISOString().split("T")[0]
  )
  const [catSheetOpen, setCatSheetOpen] = useState(false)
  const [catSpacePicker, setCatSpacePicker] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState<number>(1)
  const [notifyMembers, setNotifyMembers] = useState(false)

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
      if (d.amountUSDDisplay)  setAmountUSDDisplay(d.amountUSDDisplay)
      if (d.notes)             setNotes(d.notes)
      if (d.categoryId)    setCategoryId(d.categoryId)
      if (d.paymentMethod) setPaymentMethod(d.paymentMethod)
      // Only restore cardId if the card still exists in the available list
      // (covers the case where you navigate away to create a card and return)
      if (d.cardId && categories.some(c => c.id === d.cardId && c.isCreditCard)) setCardId(d.cardId)
      if (d.installments)  setInstallments(d.installments)
      if (d.splitMode)     setSplitMode(d.splitMode)
      if (d.paymentDate)   setPaymentDate(d.paymentDate)
      if (d.selectedOrgId) setSelectedOrgId(d.selectedOrgId)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save draft on every change
  useEffect(() => {
    if (isEdit) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        label, amountDisplay, amountUSDDisplay, notes, categoryId, paymentMethod, cardId,
        installments, splitMode, paymentDate, selectedOrgId,
      }))
    } catch {}
  }, [label, amountDisplay, amountUSDDisplay, notes, categoryId, paymentMethod, cardId, installments, splitMode, paymentDate, selectedOrgId, isEdit])
  // ─────────────────────────────────────────────────────────────────────────

  const isCreditCard = paymentMethod === "credit"
  const amount = parseAmount(amountDisplay)
  const amountPerInstallment = installments > 1 ? amount / installments : amount
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
    (isCreditCard ? (!!cardId && !!categoryId) : !!categoryId)

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
    const share = Math.floor(100 / orgMembers.length); const rem = 100 - share * orgMembers.length
    return orgMembers.map((m, i) => ({ userId: m.id, percentage: i === 0 ? share + rem : share }))
  }

  function getMemberShare(memberId: string): number { const a = buildAssignments().find(a => a.userId === memberId); if (!a) return 0; return (amountPerInstallment * a.percentage) / 100 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) { setError("Completá todos los campos requeridos"); return }
    haptic("medium")
    setError(null); setIsLoading(true)
    try {
      // ── Recurring bill path ──────────────────────────────────────────────
      if (isRecurring && !isEdit) {
        const res = await fetch("/api/recurring-bills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            amount,
            amountUSD: amountUSDDisplay ? parseFloat(amountUSDDisplay.replace(",", ".")) || null : null,
            billTypeId,
            categoryId: isCreditCard ? (categoryId || null) : null,
            organizationId: selectedOrgId,
            dayOfMonth: recurringDay,
            isActive: true,
            assignments: buildAssignments(),
            notes: notes.trim() || "",
          }),
        })
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
        try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
        push("/bills/recurring"); refresh()
        return
      }
      // ── Regular bill path ────────────────────────────────────────────────
      const url    = isEdit ? `/api/bills/${initialData!.id}` : "/api/bills"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          amount,
          amountUSD: amountUSDDisplay ? parseFloat(amountUSDDisplay.replace(",", ".")) || null : null,
          paymentDate: new Date(paymentDate + "T12:00:00").toISOString(),
          billTypeId,
          categoryId: isCreditCard ? (categoryId || null) : null,
          ...(isCreditCard && installments > 1 ? { totalInstallments: installments } : {}),
          assignments: buildAssignments(),
          notes: notes.trim() || "",
          organizationId: selectedOrgId,
          notifyMembers,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      try { sessionStorage.removeItem(DRAFT_KEY) } catch {}
      const dest = isEdit ? `/bills/${initialData!.id}` : "/bills"
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
    if (!label.trim() && amount <= 0) return "Completá la descripción y el monto para guardar"
    if (!label.trim()) return "Ingresá una descripción para guardar"
    if (amount <= 0) return "Ingresá el monto para guardar"
    if (!paymentMethod) return "Seleccioná un medio de pago"
    if (isCreditCard && !cardId) return "Seleccioná una tarjeta"
    if (isCreditCard && !categoryId) return "Seleccioná una categoría para el gasto"
    if (!isCreditCard && !categoryId) return "Seleccioná una categoría"
    return null
  })()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button type="button" onClick={() => { haptic("selection"); backHref ? push(backHref) : back() }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                      onClick={() => { haptic("selection"); setSelectedOrgId(org.id); setCategoryId(""); setCardId(""); setNotifyMembers(false) }}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all active:scale-[0.97] ${
                        isSelected
                          ? "border-primary bg-primary/8 text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/20"
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

          {/* Notificar a los miembros — solo para orgs compartidas */}
          {(() => {
            const selectedOrg = organizations.find(o => o.id === selectedOrgId)
            if (!selectedOrg || selectedOrg.isPersonal || isEdit) return null
            return (
              <button
                type="button"
                onClick={() => { haptic("selection"); setNotifyMembers(v => !v) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 active:scale-[0.98] transition-all text-left"
              >
                <Bell className={`size-5 flex-shrink-0 ${notifyMembers ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Notificar a los miembros</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avisá al resto del espacio sobre este gasto</p>
                </div>
                <div
                  className={`w-11 h-6 rounded-full flex-shrink-0 transition-colors relative ${
                    notifyMembers ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      notifyMembers ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            )
          })()}

          {/* Título del gasto */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título del gasto</p>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Tele UWU, vinilos, alquiler..." className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus={!isEdit} />
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto total</p>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-muted-foreground font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => {
                  // Strip existing thousand-dots, keep only digits and one comma
                  const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9,]/g, "")
                  const commaIdx = stripped.indexOf(",")
                  const intPart = commaIdx >= 0 ? stripped.slice(0, commaIdx) : stripped
                  const decPart = commaIdx >= 0 ? stripped.slice(commaIdx + 1) : null
                  // Format integer with thousand dots
                  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                  setAmountDisplay(decPart !== null ? `${formattedInt},${decPart}` : formattedInt)
                }}
                onBlur={() => { const n = parseAmount(amountDisplay); if (n > 0) setAmountDisplay(formatDisplay(n)) }}
                placeholder="0"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Monto en USD — opcional, visible siempre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monto en USD <span className="normal-case font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-muted-foreground font-medium text-sm">U$S</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountUSDDisplay}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".")
                  setAmountUSDDisplay(val)
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Categoría — siempre visible cuando no es crédito */}
          {!isCreditCard && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</p>
              {(() => {
                const sel = allNormalCats.find(c => c.id === categoryId)
                return (
                  <button type="button" onClick={() => { haptic("light"); setCatSheetOpen(true) }}
                    className="w-full flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm text-left transition-colors border-border hover:border-foreground/30">
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
                    haptic("selection")
                    setPaymentMethod(pm.value)
                    if (pm.value !== "credit") { setCardId(""); setInstallments(1); setCustomInstallments("") }
                    // categoryId se mantiene al cambiar medio de pago para no perder la selección
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${paymentMethod === pm.value ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
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
                  <button key={cat.id} type="button" onClick={() => { haptic("selection"); setCardId(cat.id) }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${cardId === cat.id ? "border-primary bg-primary/5 font-medium" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
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
                Categoría
              </label>
              {(() => {
                const sel = allNormalCats.find(c => c.id === categoryId)
                return (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { haptic("light"); setCatSheetOpen(true) }}
                      className="flex-1 flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm text-left transition-colors border-border hover:border-foreground/30">
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
                      <button type="button" onClick={() => { haptic("light"); setCategoryId("") }}
                        className="w-11 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground hover:border-foreground/30 transition-colors">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isCreditCard ? "Fecha de compra" : "Fecha"}</p>
            <div className="relative w-full rounded-xl border bg-background px-4 py-3 text-sm cursor-pointer">
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
                  <button key={n} type="button" onClick={() => { haptic("selection"); setInstallments(n); setCustomInstallments(""); if (n > 1) setIsRecurring(false) }}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${installments === n && !customInstallments ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                    {n === 1 ? "1 pago" : `${n}x`}
                  </button>
                ))}
                <div className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors ${customInstallments ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="text" inputMode="numeric" value={customInstallments}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setCustomInstallments(v); const n = parseInt(v); if (n > 0) { setInstallments(n); if (n > 1) setIsRecurring(false) } }}
                    placeholder="otro" className="w-12 bg-transparent text-center focus:outline-none text-muted-foreground placeholder:text-muted-foreground/50" />
                  {customInstallments && <span className="text-muted-foreground text-xs">x</span>}
                </div>
              </div>
              {installments > 1 && amount > 0 && <p className="text-xs text-muted-foreground pt-1">{formatARS(amountPerInstallment)} / mes por {installments} meses</p>}
            </div>
          )}

          {!(isCreditCard && installments > 1) && (
            <div className="space-y-3">
              {/* Toggle "Repetir mensualmente" */}
              <button
                type="button"
                onClick={() => setIsRecurring(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/50 active:scale-[0.98] transition-all text-left"
              >
                <Repeat className="size-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Repetir mensualmente</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRecurring ? `Te avisamos cada mes el día ${recurringDay}` : "Recordatorio automático cada mes"}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full flex-shrink-0 transition-colors relative ${isRecurring ? "bg-primary" : "bg-muted-foreground/20"}`}>
                  <div className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${isRecurring ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>

              {/* Day picker — only visible when isRecurring */}
              {isRecurring && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-muted/30">
                  <p className="text-sm text-muted-foreground flex-1">Recordar el día</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setRecurringDay(d => Math.max(1, d - 1))}
                      className="size-7 rounded-full bg-background border flex items-center justify-center text-sm active:scale-90 transition-all">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{recurringDay}</span>
                    <button type="button" onClick={() => setRecurringDay(d => Math.min(28, d + 1))}
                      className="size-7 rounded-full bg-background border flex items-center justify-center text-sm active:scale-90 transition-all">+</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detalle (notas opcionales) */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalle <span className="normal-case font-normal">(opcional)</span></p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descripción adicional, observaciones..."
              rows={2}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* División */}
          {orgMembers.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">División</p>
              <div className="space-y-2">
                {[
                  { value: "income", label: "Gasto común", desc: hasIncomes ? orgMembers.map(m => { const inc = memberIncomes[m.id] || 0; return `${m.name?.split(" ")[0]} ${Math.round((inc / totalIncome) * 100)}%` }).join(" · ") : "Configurar ingresos en Config →" },
                  { value: "equal",  label: "50/50",        desc: "Partes iguales" },
                  { value: "mine",   label: "Solo mío",     desc: "100% a mi cargo" },
                  ...otherMembers.map(m => ({ value: m.id, label: `Solo de ${m.name?.split(" ")[0]}`, desc: "100% a cargo de ellos" })),
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => { haptic("selection"); setSplitMode(opt.value) }}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${splitMode === opt.value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-foreground/30"}`}>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
                    {splitMode === opt.value && <Check className="size-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
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
                  <button onClick={() => { haptic("light"); setCatSheetOpen(false); setCatSpacePicker(false) }} className="text-muted-foreground active:scale-90 transition-all">
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
                {/* Sin categoría (only for CC bills) */}
                {isCreditCard && (
                  <button type="button"
                    onClick={() => { haptic("selection"); setCategoryId(""); setCatSheetOpen(false) }}
                    className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors ${!categoryId ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"}`}>
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
                                haptic("selection")
                                setCategoryId(cat.id)
                                setSelectedOrgId(cat.organizationId)
                                setCatSheetOpen(false)
                                applyDefaultAssignments(cat.id)
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}`}>
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
