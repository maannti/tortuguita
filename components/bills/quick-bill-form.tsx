"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, CreditCard, Banknote, Wallet, Ellipsis, ChevronDown, Plus, User, Home } from "lucide-react"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"

interface Category {
  id: string; name: string; color: string | null; icon: string | null; isCreditCard: boolean; organizationId: string
  currentClosingDate?: Date | string | null
  currentDueDate?: Date | string | null
  nextClosingDate?: Date | string | null
  nextDueDate?: Date | string | null
}
interface Member { id: string; name: string | null; email: string | null; organizationId: string }
interface Organization { id: string; name: string; isPersonal: boolean }
interface InitialData {
  id: string
  label: string
  amount: number
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
  { value: "debit",  label: "Débito",   icon: <Wallet     className="h-4 w-4" /> },
  { value: "credit", label: "Crédito",  icon: <CreditCard className="h-4 w-4" /> },
  { value: "cash",   label: "Efectivo", icon: <Banknote   className="h-4 w-4" /> },
  { value: "other",  label: "Otro",     icon: <Ellipsis   className="h-4 w-4" /> },
]

const INSTALLMENT_OPTIONS = [1, 3, 6, 9, 12]

function formatARS(n: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) }
function parseAmount(s: string): number { return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 }
function formatDisplay(n: number): string { if (!n) return ""; const [int, dec] = n.toString().split("."); const f = int.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return dec ? `${f},${dec}` : f }
function formatDateDisplay(iso: string): string { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y.slice(2)}` }
function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  return new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
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
  const router = useRouter()
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
  const [expandedCats, setExpandedCats] = useState(false)

  const isCreditCard = paymentMethod === "credit"
  const amount = parseAmount(amountDisplay)
  const amountPerInstallment = installments > 1 ? amount / installments : amount
  const totalIncome = Object.values(memberIncomes).reduce((s, v) => s + v, 0)
  const hasIncomes = totalIncome > 0

  const orgCategories = categories.filter(c => c.organizationId === selectedOrgId)
  const normalCats = orgCategories.filter(c => !c.isCreditCard)
  const ccCards    = orgCategories.filter(c => c.isCreditCard)
  const orgMembers = members.filter(m => m.organizationId === selectedOrgId)

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
    const share = Math.floor(100 / orgMembers.length); const rem = 100 - share * orgMembers.length
    return orgMembers.map((m, i) => ({ userId: m.id, percentage: i === 0 ? share + rem : share }))
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
          paymentDate: new Date(paymentDate + "T12:00:00").toISOString(),
          billTypeId,
          categoryId: isCreditCard ? (categoryId || null) : null,
          ...(isCreditCard && installments > 1 ? { totalInstallments: installments } : {}),
          assignments: buildAssignments(),
          notes: notes.trim() || "",
          ...(!isEdit ? { organizationId: selectedOrgId } : {}),
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      const dest = isEdit ? `/bills/${initialData!.id}` : "/bills"
      router.push(dest); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : "Error inesperado") } finally { setIsLoading(false) }
  }

  const otherMembers = orgMembers.filter((m) => m.id !== currentUserId)

  // Billing period feedback for credit card + selected card + date
  const selectedCard = isCreditCard && cardId ? ccCards.find(c => c.id === cardId) : null
  type BillingFeedback =
    | { type: "current"; dueDate: string; closingDate: string }
    | { type: "next";    dueDate: string; closingDate: string }
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
    const p = new Date(payment); p.setHours(0,0,0,0)
    const c = new Date(closing); c.setHours(0,0,0,0)
    if (p <= c) return { type: "current", dueDate: formatShortDate(due), closingDate: formatShortDate(closing) }
    const nextDue     = selectedCard.nextDueDate     ? new Date(selectedCard.nextDueDate)     : null
    const nextClosing = selectedCard.nextClosingDate ? new Date(selectedCard.nextClosingDate) : null
    if (!nextDue) return { type: "no-next" }
    return { type: "next", dueDate: formatShortDate(nextDue), closingDate: formatShortDate(nextClosing) }
  })()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button type="button" onClick={() => backHref ? router.push(backHref) : router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver
        </button>
        <h1 className="text-base font-semibold">{isEdit ? "Editar gasto" : "Nuevo gasto"}</h1>
        <button type="submit" disabled={isLoading || !canSave} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "..." : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-5">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Espacio — solo en create mode con múltiples orgs */}
          {!isEdit && organizations.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">¿En qué espacio cargás este gasto?</label>
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
                          ? "border-primary bg-primary/8 text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/20"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ backgroundColor: isSelected ? "#9D8189" : "#9D818920" }}
                      >
                        {org.isPersonal
                          ? <User className="h-4 w-4" style={{ color: isSelected ? "#fff" : "#9D8189" }} />
                          : <Home className="h-4 w-4" style={{ color: isSelected ? "#fff" : "#9D8189" }} />}
                      </div>
                      <span className="flex-1 text-left leading-tight">{org.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Tele UWU, vinilos, alquiler..." className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus={!isEdit} />
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto total</label>
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
            {amount > 0 && (
              <p
                className="text-right text-2xl font-medium text-foreground/80 pr-1 leading-none"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {formatARS(amount)}
              </p>
            )}
          </div>

          {/* Categoría — siempre visible cuando no es crédito */}
          {!isCreditCard && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</label>
              {normalCats.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border px-4 py-4 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">No hay categorías en este espacio</p>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedOrg = organizations.find(o => o.id === selectedOrgId)
                      router.push(`/categories/new?spaceId=${selectedOrgId}&spaceName=${encodeURIComponent(selectedOrg?.name ?? "")}&returnTo=${encodeURIComponent("/bills/new")}`)
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary whitespace-nowrap flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />Crear una
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setExpandedCats(o => !o)}
                    className={`flex-1 flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm text-left transition-colors ${expandedCats ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-foreground/30"}`}>
                    {(() => {
                      const sel = normalCats.find(c => c.id === categoryId)
                      return sel ? (
                        <>
                          {sel.icon
                            ? <span className="text-base leading-none flex-shrink-0">{sel.icon}</span>
                            : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sel.color || "#6b7280" }} />}
                          <span className="flex-1 font-medium text-foreground">{sel.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-muted-foreground">Seleccioná una categoría</span>
                      )
                    })()}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${expandedCats ? "rotate-180" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedOrg = organizations.find(o => o.id === selectedOrgId)
                      router.push(`/categories/new?spaceId=${selectedOrgId}&spaceName=${encodeURIComponent(selectedOrg?.name ?? "")}&returnTo=${encodeURIComponent("/bills/new")}`)
                    }}
                    title="Nueva categoría"
                    className="w-11 rounded-xl border border-border bg-background flex items-center justify-center hover:border-foreground/30 transition-colors"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
              {expandedCats && normalCats.length > 0 && (
                <div className="rounded-xl border border-primary/30 bg-background overflow-hidden shadow-sm">
                  {normalCats.map((cat, i) => (
                    <button key={cat.id} type="button"
                      onClick={() => { setCategoryId(cat.id); setInstallments(1); setExpandedCats(false) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${i < normalCats.length - 1 ? "border-b border-border/50" : ""} ${categoryId === cat.id ? "bg-primary/5 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}>
                      {cat.icon
                        ? <span className="text-base leading-none flex-shrink-0">{cat.icon}</span>
                        : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || "#6b7280" }} />}
                      <span className="flex-1">{cat.name}</span>
                      {categoryId === cat.id && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Medio de pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medio de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button key={pm.value} type="button"
                  onClick={() => {
                    setPaymentMethod(pm.value)
                    if (pm.value !== "credit") { setCardId(""); setInstallments(1); setCustomInstallments(""); setCategoryId("") }
                    else { setCategoryId("") }
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
                onClick={() => router.push(`/cards?spaceId=${selectedOrgId}`)}
              >
                Agregá una tarjeta
              </button>{" "}
              antes de cargar un gasto con crédito.
            </div>
          )}

          {/* Tarjetas de crédito */}
          {isCreditCard && ccCards.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">¿Con qué tarjeta?</label>
              <div className="grid grid-cols-2 gap-2">
                {ccCards.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCardId(cat.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${cardId === cat.id ? "border-primary bg-primary/5 font-medium" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
                    <CardIcon bankId={BANKS.find(b => b.color === cat.color)?.id ?? null} bankColor={cat.color || "#9D8189"} bankName={cat.name} network={isNetworkId(cat.icon) ? cat.icon as NetworkId : null} size="sm" />
                    <span className="truncate">{cat.name}</span>
                    {cardId === cat.id && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isCreditCard ? "Fecha de compra" : "Fecha"}</label>
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
              billingFeedback.type === "current"   ? "bg-[#D8E2DC]/60 text-[#3a5a45]" :
              billingFeedback.type === "next"      ? "bg-[#FFE5D9]/70 text-[#7a4520]" :
              billingFeedback.type === "no-next"   ? "bg-amber-50 text-amber-800 border border-amber-200" :
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
                {billingFeedback.type === "next" && (
                  <>
                    <p className="font-medium leading-snug">Entra en el próximo período</p>
                    <p className="text-xs opacity-75 mt-0.5">Ya pasó el cierre · vence {billingFeedback.dueDate}</p>
                  </>
                )}
                {billingFeedback.type === "no-next" && (
                  <>
                    <p className="font-medium leading-snug">Fecha posterior al cierre actual</p>
                    <p className="text-xs opacity-75 mt-0.5">Configurá el próximo período de la tarjeta en <span className="underline">Tarjetas</span></p>
                  </>
                )}
                {billingFeedback.type === "no-period" && (
                  <>
                    <p className="font-medium leading-snug">Esta tarjeta no tiene período configurado</p>
                    <p className="text-xs opacity-75 mt-0.5">Configuralo en <button type="button" className="underline font-semibold" onClick={() => router.push("/cards")}>Tarjetas</button> para ver el impacto correcto</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cuotas */}
          {isCreditCard && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuotas</label>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button key={n} type="button" onClick={() => { setInstallments(n); setCustomInstallments("") }}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${installments === n && !customInstallments ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                    {n === 1 ? "1 pago" : `${n}x`}
                  </button>
                ))}
                <div className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors ${customInstallments ? "border-primary bg-primary/5" : "border-border"}`}>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalle <span className="normal-case font-normal">(opcional)</span></label>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">División</label>
              <div className="space-y-2">
                {[
                  { value: "income", label: "Gasto común", desc: hasIncomes ? orgMembers.map(m => { const inc = memberIncomes[m.id] || 0; return `${m.name?.split(" ")[0]} ${Math.round((inc / totalIncome) * 100)}%` }).join(" · ") : "Configurar ingresos en Config →" },
                  { value: "equal",  label: "50/50",        desc: "Partes iguales" },
                  { value: "mine",   label: "Solo mío",     desc: "100% a mi cargo" },
                  ...otherMembers.map(m => ({ value: m.id, label: `Solo de ${m.name?.split(" ")[0]}`, desc: "100% a cargo de ellos" })),
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSplitMode(opt.value)}
                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${splitMode === opt.value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-foreground/30"}`}>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
                    {splitMode === opt.value && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
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
    </form>
  )
}
