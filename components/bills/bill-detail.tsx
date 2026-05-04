"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    assignments: {
      id: string
      percentage: number
      user: { name: string | null }
    }[]
  }
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function BillDetail({ bill }: BillDetailProps) {
  const router = useRouter()
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
      router.push("/bills")
    } catch {
      setDeleteError("Error al eliminar")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header sticky */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={() => router.push("/bills")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Gastos
        </button>
        <h1 className="text-base font-semibold truncate max-w-[50%]" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          {bill.label}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-2xl bg-background/95 backdrop-blur-sm border-border/50 p-1.5">
            <DropdownMenuItem asChild className="rounded-xl py-2.5 px-3">
              <Link href={`/bills/${bill.id}/edit`} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="flex items-center gap-2 rounded-xl py-2.5 px-3 text-destructive focus:text-destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-28 space-y-4">
          {/* Amount hero */}
          <div>
            <p
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-fraunces, serif)" }}
            >
              {formatARS(bill.amount)}
            </p>
          </div>

          {/* Main info */}
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-1">
            {/* Categoría — siempre que exista (o para bills sin CC) */}
            {bill.billType.isCreditCard ? (
              <>
                {bill.category && (
                  <Row
                    label="Categoría"
                    value={
                      <CategoryBadge
                        name={bill.category.name}
                        color={bill.category.color}
                        icon={bill.category.icon}
                      />
                    }
                  />
                )}
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
            {bill.totalInstallments && bill.currentInstallment && (
              <Row label="Cuota" value={`${bill.currentInstallment} de ${bill.totalInstallments}`} />
            )}
            {bill.notes && <Row label="Notas" value={bill.notes} />}
            <Row label="Cargado por" value={bill.user.name ?? "—"} />
          </div>

          {/* Assignments */}
          {bill.assignments.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card px-4 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">
                Distribución
              </p>
              {bill.assignments.map((a) => (
                <Row key={a.id} label={a.user.name ?? "—"} value={`${a.percentage}%`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) { setDeleteOpen(false); setDeleteError(null) } }}>
        <DialogContent className="rounded-3xl border-border/40 bg-card w-[calc(100%-2rem)] max-w-sm p-6 [&>.absolute]:hidden">
          <DialogHeader className="items-center text-center gap-4 pb-1">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-destructive" />
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
