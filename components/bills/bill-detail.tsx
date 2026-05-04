"use client"

import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategoryBadge } from "@/components/categories/category-badge"
import { DeleteBillButton } from "@/components/bills/delete-bill-button"

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
  return (
    <div className="flex flex-col min-h-[calc(100dvh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/bills" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1">
          <ChevronLeft className="h-4 w-4" />
          Gastos
        </Link>
      </div>

      {/* Hero */}
      <div className="px-4 pt-2 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight leading-snug mb-1">{bill.label}</h1>
        <p
          className="text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-fraunces, serif)" }}
        >
          {formatARS(bill.amount)}
        </p>
      </div>

      {/* Details card */}
      <div className="flex-1 px-4 space-y-4">
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
            <Row
              label="Cuota"
              value={`${bill.currentInstallment} de ${bill.totalInstallments}`}
            />
          )}
          {bill.notes && <Row label="Notas" value={bill.notes} />}
          <Row label="Cargado por" value={bill.user.name ?? "—"} />
        </div>

        {bill.assignments.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card px-4 py-1">
            {bill.assignments.map((a) => (
              <Row
                key={a.id}
                label={a.user.name ?? "—"}
                value={`${a.percentage}%`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-6 space-y-3">
        <Button asChild size="lg" className="w-full" variant="outline">
          <Link href={`/bills/${bill.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar gasto
          </Link>
        </Button>
        <DeleteBillButton id={bill.id} label={bill.label} fullWidth redirectTo="/bills" />
      </div>
    </div>
  )
}
