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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CategoryBadge } from "@/components/categories/category-badge"

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
        <DialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-md w-[calc(100%-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar gasto</DialogTitle>
            <DialogDescription>
              ¿Eliminás "{bill.label}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto">
              {isDeleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
