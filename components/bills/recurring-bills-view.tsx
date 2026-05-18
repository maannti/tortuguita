"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, MoreHorizontal, Pause, Play, Trash2, X, AlertTriangle } from "lucide-react"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"

interface Assignment { userId: string; percentage: number; user: { id: string; name: string | null } }
interface BillType { id: string; name: string; color: string | null; icon: string | null; isCreditCard: boolean }
interface Category { id: string; name: string; color: string | null; icon: string | null }

interface RecurringBill {
  id: string
  label: string
  amount: number
  amountUSD: number | null
  notes: string | null
  dayOfMonth: number
  isActive: boolean
  nextDate: string
  lastGeneratedAt: string | null
  billType: BillType
  category: Category | null
  assignments: Assignment[]
}

interface Props {
  recurringBills: RecurringBill[]
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }
function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
}

type DeleteMode = "keep" | "delete"

interface DeleteDialogState {
  id: string
  label: string
  mode: DeleteMode
}

export function RecurringBillsView({ recurringBills }: Props) {
  const router = useRouter()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = recurringBills.filter(r => r.isActive)
  const paused = recurringBills.filter(r => !r.isActive)

  async function handleToggleActive(rb: RecurringBill) {
    setIsToggling(rb.id)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/recurring-bills/${rb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: rb.label,
          amount: rb.amount,
          amountUSD: rb.amountUSD,
          notes: rb.notes,
          billTypeId: rb.billType.id,
          categoryId: rb.category?.id ?? null,
          organizationId: undefined,
          dayOfMonth: rb.dayOfMonth,
          isActive: !rb.isActive,
          assignments: rb.assignments.map(a => ({ userId: a.userId, percentage: a.percentage })),
        }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
      router.refresh()
    } catch {
      setError("No se pudo actualizar el estado. Intentá de nuevo.")
    } finally {
      setIsToggling(null)
    }
  }

  async function handleDelete(deleteGenerated: boolean) {
    if (!deleteDialog) return
    setIsDeleting(true)
    try {
      const url = `/api/recurring-bills/${deleteDialog.id}?deleteGenerated=${deleteGenerated}`
      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al eliminar")
      setDeleteDialog(null)
      router.refresh()
    } catch {
      setError("No se pudo eliminar. Intentá de nuevo.")
    } finally {
      setIsDeleting(false)
    }
  }

  function RecurringItem({ rb }: { rb: RecurringBill }) {
    const isCC = rb.billType.isCreditCard
    const bankId = isCC ? (BANKS.find(b => b.color === rb.billType.color)?.id ?? null) : null
    const network = isCC && isNetworkId(rb.billType.icon) ? rb.billType.icon as NetworkId : null
    const menuOpen = openMenuId === rb.id
    const isToggleLoading = isToggling === rb.id

    return (
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isCC ? (
            <CardIcon bankId={bankId} bankColor={rb.billType.color || "#9D8189"} bankName={rb.billType.name} network={network} size="sm" />
          ) : (
            <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${rb.billType.color || "#9D8189"}22` }}>
              {rb.billType.icon
                ? <span className="text-base leading-none">{rb.billType.icon}</span>
                : <span className="size-2.5 rounded-full" style={{ backgroundColor: rb.billType.color || "#9D8189" }} />}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{rb.label}</p>
            {!rb.isActive && (
              <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                Pausada
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-muted-foreground">
              {rb.billType.name}
              {rb.category && <span className="text-muted-foreground/60"> · {rb.category.name}</span>}
            </p>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <p className="text-xs text-muted-foreground">
              Día {rb.dayOfMonth} · próx. {formatShortDate(rb.nextDate)}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            {formatARS(rb.amount)}
          </p>
          {rb.amountUSD && (
            <p className="text-xs text-muted-foreground">U$S {rb.amountUSD.toFixed(0)}</p>
          )}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpenMenuId(menuOpen ? null : rb.id)}
            disabled={isToggleLoading}
            className="size-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors active:scale-90 disabled:opacity-40"
          >
            {isToggleLoading
              ? <span className="size-4 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />
              : <MoreHorizontal className="size-4 text-muted-foreground" />}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-2xl shadow-lg overflow-hidden min-w-[180px]">
                <button
                  type="button"
                  onClick={() => handleToggleActive(rb)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60 transition-colors text-left"
                >
                  {rb.isActive
                    ? <><Pause className="size-4 text-muted-foreground" /> Pausar</>
                    : <><Play className="size-4 text-muted-foreground" /> Activar</>}
                </button>
                <div className="border-t border-border/50" />
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null)
                    setDeleteDialog({ id: rb.id, label: rb.label, mode: "keep" })
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors text-left"
                >
                  <Trash2 className="size-4" /> Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <Link href="/bills" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Gastos
        </Link>
        <h1 className="text-base font-semibold">Recurrentes</h1>
        <Link href="/bills/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-all">
          <Plus className="size-3.5" />Nuevo
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {error && (
          <div className="mx-4 mt-4 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="size-4" /></button>
          </div>
        )}

        {recurringBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
              <span className="text-3xl">↻</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">Sin gastos recurrentes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Al crear un gasto, activá "Repetir mensualmente" para que se genere solo cada mes.
              </p>
            </div>
            <Link href="/bills/new" className="mt-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-all">
              Crear gasto recurrente
            </Link>
          </div>
        ) : (
          <div className="px-4 pt-5 space-y-5">
            {/* Active */}
            {active.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  Activas · {active.length}
                </p>
                <div className="rounded-2xl border border-border bg-background overflow-hidden">
                  {active.map(rb => <RecurringItem key={rb.id} rb={rb} />)}
                </div>
              </section>
            )}

            {/* Paused */}
            {paused.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  Pausadas · {paused.length}
                </p>
                <div className="rounded-2xl border border-border bg-background overflow-hidden">
                  {paused.map(rb => <RecurringItem key={rb.id} rb={rb} />)}
                </div>
              </section>
            )}

            <p className="text-xs text-muted-foreground text-center pb-4">
              El cron corre a las 9 AM UTC · Los gastos se generan automáticamente
            </p>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setDeleteDialog(null)} />
          <div className="relative bg-background rounded-t-3xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Eliminar recurrencia</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  "{deleteDialog.label}" ya no se generará automáticamente.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              ¿Qué hacemos con los gastos ya generados?
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(d => d ? { ...d, mode: "keep" } : null)}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                  deleteDialog.mode === "keep" ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">Mantener gastos generados</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Los gastos ya creados no se tocan</p>
                </div>
                <div className={`size-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  deleteDialog.mode === "keep" ? "border-primary bg-primary" : "border-border"
                }`}>
                  {deleteDialog.mode === "keep" && <div className="size-2 rounded-full bg-white" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeleteDialog(d => d ? { ...d, mode: "delete" } : null)}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                  deleteDialog.mode === "delete" ? "border-destructive bg-destructive/5" : "border-border hover:border-foreground/20"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-destructive">Eliminar también los gastos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Borra todos los gastos vinculados a esta recurrencia</p>
                </div>
                <div className={`size-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  deleteDialog.mode === "delete" ? "border-destructive bg-destructive" : "border-border"
                }`}>
                  {deleteDialog.mode === "delete" && <div className="size-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteDialog.mode === "delete")}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-semibold active:scale-95 transition-all disabled:opacity-40"
              >
                {isDeleting ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
