"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CategoryBadge } from "@/components/categories/category-badge"
import { CardIcon, BANKS, isNetworkId, NetworkId } from "@/components/ui/card-network"

interface BillDetailProps {
  bill: {
    id: string
    label: string
    amount: number
    amountUSD: number | null
    paymentDate: string
    budgetDate: string
    dueDate: string | null
    notes: string | null
    totalInstallments: number | null
    currentInstallment: number | null
    billType: {
      name: string
      color: string | null
      icon: string | null
      isCreditCard: boolean
    }
    category: {
      name: string
      color: string | null
      icon: string | null
    } | null
    user: { name: string | null }
    spaceName: string | null
    assignments: {
      id: string
      percentage: number
      user: { name: string | null }
    }[]
  }
}

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2 })
function formatARS(n: number) { return arsFormatter.format(n) }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function BillDetail({ bill }: BillDetailProps) {
  const { push } = useRouter()
  const accentColor = (bill.category?.color || bill.billType.color) ?? "#9D8189"
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || "Error al eliminar")
        return
      }
      push("/bills")
    } catch {
      setDeleteError("Error al eliminar")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Navigation bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={() => push("/bills")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Gastos
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={`/bills/${bill.id}/edit`}
            className="size-9 flex items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          >
            <Pencil className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="size-9 flex items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground hover:text-destructive active:scale-95 transition-all"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-28 space-y-4">
          {/* Hero */}
          <div
            className="relative rounded-3xl overflow-hidden px-5 pt-6 pb-7 text-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}30 100%)` }}
          >
            {/* Orbs decorativos */}
            <div className="absolute -top-8 -right-8 size-36 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${accentColor}22` }} />
            <div className="absolute bottom-0 left-0 w-28 h-20 rounded-full blur-xl pointer-events-none"  style={{ backgroundColor: `${accentColor}18` }} />
            <div className="relative space-y-2">
              <p className="text-sm text-muted-foreground font-medium truncate px-4">{bill.label}</p>
              <p
                className="text-5xl font-medium text-foreground leading-none tracking-tight"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                {formatARS(bill.amount)}
              </p>
              {bill.amountUSD && (
                <p className="text-sm text-muted-foreground">
                  U$S {Number(bill.amountUSD).toFixed(2)}
                </p>
              )}
              {bill.totalInstallments && bill.currentInstallment && (
                <p className="text-xs text-muted-foreground pt-0.5">
                  Cuota {bill.currentInstallment} de {bill.totalInstallments}
                </p>
              )}
            </div>
          </div>

          {/* Main info */}
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-1">
            {/* Categoría — siempre visible */}
            {bill.billType.isCreditCard ? (
              <>
                <Row
                  label="Categoría"
                  value={
                    bill.category
                      ? <CategoryBadge name={bill.category.name} color={bill.category.color} icon={bill.category.icon} />
                      : <span className="text-muted-foreground/60 text-sm">Sin categoría</span>
                  }
                />
                <Row
                  label="Tarjeta"
                  value={
                    <div className="flex items-center gap-2">
                      <CardIcon
                        bankId={BANKS.find(b => b.color === bill.billType.color)?.id ?? null}
                        bankColor={bill.billType.color || "#9D8189"}
                        bankName={bill.billType.name}
                        network={isNetworkId(bill.billType.icon) ? bill.billType.icon as NetworkId : null}
                        size="sm"
                      />
                      <span>{bill.billType.name}</span>
                    </div>
                  }
                />
              </>
            ) : (
              <Row
                label="Categoría"
                value={
                  <CategoryBadge
                    name={bill.billType.name}
                    color={bill.billType.color}
                    icon={bill.billType.icon}
                  />
                }
              />
            )}
            <Row label="Fecha de pago" value={bill.paymentDate} />
            <Row label="Período presupuestario" value={bill.budgetDate} />
            {bill.billType.isCreditCard && bill.dueDate && (
              <Row label="Fecha de vencimiento" value={bill.dueDate} />
            )}
            {bill.notes && <Row label="Notas" value={bill.notes} />}
            <Row label="Cargado por" value={bill.user.name ?? "—"} />
            {bill.spaceName && <Row label="Espacio" value={bill.spaceName} />}
          </div>

          {/* Assignments */}
          {bill.assignments.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden px-5 py-4"
              style={{ background: `linear-gradient(135deg, ${accentColor}12 0%, ${accentColor}22 100%)` }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center mb-3">
                Distribución
              </p>
              <div className={`grid gap-3 ${bill.assignments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {bill.assignments.map((a) => {
                  const memberAmount = (bill.amount * Number(a.percentage)) / 100
                  return (
                    <div key={a.id} className="rounded-xl bg-background/60 backdrop-blur-sm px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground font-medium truncate mb-1">
                        {a.user.name ?? "—"}
                      </p>
                      <p
                        className="text-xl font-medium text-foreground leading-none"
                        style={{ fontFamily: "var(--font-fraunces, serif)" }}
                      >
                        {formatARS(memberAmount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{Math.round(Number(a.percentage))}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteError(null) } }}>
        <DialogContent className="rounded-3xl border-border/40 bg-card w-[calc(100%-2rem)] max-w-sm p-6 [&>.absolute]:hidden">
          <DialogHeader className="items-center text-center gap-4 pb-1">
            <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="size-6 text-destructive" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle
                className="text-xl"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
              >
                Eliminar gasto
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                ¿Eliminás{" "}
                <span className="font-medium text-foreground">"{bill.label}"</span>
                ?{" "}Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive text-center pt-1">{deleteError}</p>
          )}
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full rounded-full bg-destructive text-white py-3.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
            >
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </button>
            <button
              type="button"
              onClick={() => { setDeleteOpen(false); setDeleteError(null) }}
              disabled={isDeleting}
              className="w-full rounded-full bg-muted text-muted-foreground py-3.5 text-sm font-medium disabled:opacity-50 active:scale-[0.97] transition-all"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
