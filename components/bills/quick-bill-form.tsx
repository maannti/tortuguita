"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, CreditCard, Banknote, Wallet, Ellipsis } from "lucide-react"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"

interface Category { id: string; name: string; color: string | null; icon: string | null; isCreditCard: boolean }
interface Member { id: string; name: string | null; email: string | null }
interface Props {
  categories: Category[]
  members: Member[]
  memberIncomes: Record<string, number>
  currentUserId: string
  backHref?: string
  defaultInstallments?: number
}

type PaymentMethod = "debit" | "credit" | "cash" | "other"

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "debit",  label: "Débito",   icon: <Wallet   className="h-4 w-4" /> },
  { value: "credit", label: "Crédito",  icon: <CreditCard className="h-4 w-4" /> },
  { value: "cash",   label: "Efectivo", icon: <Banknote className="h-4 w-4" /> },
  { value: "other",  label: "Otro",     icon: <Ellipsis className="h-4 w-4" /> },
]

const INSTALLMENT_OPTIONS = [1, 3, 6, 9, 12]
function formatARS(n: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n)) }
function parseAmount(s: string): number { return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 }
function formatDisplay(n: number): string { if (!n) return ""; const [int, dec] = n.toString().split("."); const f = int.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return dec ? `${f},${dec}` : f }
function formatDateDisplay(iso: string): string { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y.slice(2)}` }

export function QuickBillForm({ categories, members, memberIncomes, currentUserId, backHref, defaultInstallments }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [amountDisplay, setAmountDisplay] = useState("")
  const [categoryId, setCategoryId] = useState("")       // non-CC category
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [cardId, setCardId] = useState("")               // CC card (only when credit)
  const [installments, setInstallments] = useState(defaultInstallments ?? 1)
  const [customInstallments, setCustomInstallments] = useState("")
  const [splitMode, setSplitMode] = useState<string>("mine")
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])

  const isCreditCard = paymentMethod === "credit"
  const amount = parseAmount(amountDisplay)
  const amountPerInstallment = installments > 1 ? amount / installments : amount
  const totalIncome = Object.values(memberIncomes).reduce((s, v) => s + v, 0)
  const hasIncomes = totalIncome > 0

  const normalCats = categories.filter(c => !c.isCreditCard)
  const ccCards    = categories.filter(c => c.isCreditCard)

  // billTypeId to submit: CC card when credit, regular category otherwise
  const billTypeId = isCreditCard ? cardId : categoryId

  const canSave = !!label.trim() && amount > 0 && !!paymentMethod &&
    (isCreditCard ? (ccCards.length === 0 || !!cardId) : !!categoryId)

  function buildAssignments(): Array<{ userId: string; percentage: number }> {
    if (splitMode === "mine") return [{ userId: currentUserId, percentage: 100 }]
    if (members.length <= 1) return [{ userId: currentUserId, percentage: 100 }]
    const specific = members.find((m) => m.id === splitMode)
    if (specific) return [{ userId: specific.id, percentage: 100 }]
    if (splitMode === "income" && hasIncomes) {
      let dist = 0
      return members.map((m, i) => {
        const inc = memberIncomes[m.id] || 0
        const pct = i === members.length - 1 ? 100 - dist : Math.round((inc / totalIncome) * 100)
        dist += pct
        return { userId: m.id, percentage: pct }
      })
    }
    const share = Math.floor(100 / members.length); const rem = 100 - share * members.length
    return members.map((m, i) => ({ userId: m.id, percentage: i === 0 ? share + rem : share }))
  }

  function getMemberShare(memberId: string): number { const a = buildAssignments().find(a => a.userId === memberId); if (!a) return 0; return (amountPerInstallment * a.percentage) / 100 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) { setError("Completá todos los campos requeridos"); return }
    setError(null); setIsLoading(true)
    try {
      const res = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: label.trim(), amount, paymentDate: new Date(paymentDate + "T12:00:00").toISOString(), billTypeId, ...(isCreditCard && installments > 1 ? { totalInstallments: installments } : {}), assignments: buildAssignments(), notes: "" }) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      router.push("/dashboard"); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : "Error inesperado") } finally { setIsLoading(false) }
  }

  const otherMembers = members.filter((m) => m.id !== currentUserId)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button type="button" onClick={() => backHref ? router.push(backHref) : router.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="h-4 w-4" />Volver</button>
        <h1 className="text-base font-semibold">Nuevo gasto</h1>
        <button type="submit" disabled={isLoading || !canSave} className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">{isLoading ? "..." : "Guardar"}</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-5">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descripción</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ej. Tele UWU, vinilos, alquiler..." className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto total</label>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-muted-foreground font-medium">$</span>
              <input type="text" inputMode="numeric" value={amountDisplay} onChange={(e) => setAmountDisplay(e.target.value.replace(/[^0-9,.]/g, ""))} onBlur={() => { const n = parseAmount(amountDisplay); if (n > 0) setAmountDisplay(formatDisplay(n)) }} placeholder="0" className="flex-1 bg-transparent text-sm focus:outline-none" />
            </div>
          </div>

          {/* Categoría */}
          {normalCats.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</label>
              <div className="grid grid-cols-2 gap-2">
                {normalCats.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => { setCategoryId(cat.id); setInstallments(1) }} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${categoryId === cat.id ? "border-primary bg-primary/5 font-medium" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
                    {cat.icon
                      ? <span className="text-base leading-none">{cat.icon}</span>
                      : <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || "#6b7280" }} />}
                    <span className="truncate">{cat.name}</span>
                    {categoryId === cat.id && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
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
                    if (pm.value !== "credit") { setCardId(""); setInstallments(1); setCustomInstallments("") }
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${paymentMethod === pm.value ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
                  {pm.icon}
                  <span>{pm.label}</span>
                  {paymentMethod === pm.value && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas de crédito — solo si seleccionó "Crédito" */}
          {isCreditCard && ccCards.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">¿Con qué tarjeta?</label>
              <div className="grid grid-cols-2 gap-2">
                {ccCards.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setCardId(cat.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${cardId === cat.id ? "border-primary bg-primary/5 font-medium" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}>
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

          {/* Cuotas — solo si es crédito */}
          {isCreditCard && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuotas</label>
              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button key={n} type="button" onClick={() => { setInstallments(n); setCustomInstallments("") }} className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${installments === n && !customInstallments ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`}>{n === 1 ? "1 pago" : `${n}x`}</button>
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

          {/* División */}
          {members.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">División</label>
              <div className="space-y-2">
                {[
                  { value: "income", label: "Gasto común", desc: hasIncomes ? members.map(m => { const inc = memberIncomes[m.id] || 0; return `${m.name?.split(" ")[0]} ${Math.round((inc / totalIncome) * 100)}%` }).join(" · ") : "Configurar ingresos en Config →" },
                  { value: "equal",  label: "50/50",       desc: "Partes iguales" },
                  { value: "mine",   label: "Solo mío",    desc: "100% a mi cargo" },
                  ...otherMembers.map(m => ({ value: m.id, label: `Solo de ${m.name?.split(" ")[0]}`, desc: "100% a cargo de ellos" }))
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSplitMode(opt.value)} className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${splitMode === opt.value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-foreground/30"}`}>
                    <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
                    {splitMode === opt.value && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
              {amount > 0 && (
                <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">{installments > 1 ? `Cuota mensual de ${formatARS(amountPerInstallment)}` : "División del gasto"}</p>
                  {members.map((m) => { const share = getMemberShare(m.id); if (share <= 0) return null; return (<div key={m.id} className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{m.name}</span><span className="text-sm font-semibold">{formatARS(share)}</span></div>) })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
