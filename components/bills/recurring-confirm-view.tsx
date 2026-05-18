"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { haptic } from "@/lib/haptics"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})
function formatARS(n: number) {
  return arsFormatter.format(Math.round(n))
}
function parseAmount(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0
}
function formatDisplay(n: number): string {
  if (!n) return ""
  const [int, dec] = n.toString().split(".")
  const f = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return dec ? `${f},${dec}` : f
}

interface Assignment {
  userId: string
  percentage: number
}

interface RecurringBill {
  id: string
  label: string
  amount: number
  amountUSD: number | null
  notes: string | null
  dayOfMonth: number
  billTypeId: string
  categoryId: string | null
  organizationId: string
  assignments: Assignment[]
  billType: { id: string; name: string; color: string | null; icon: string | null; isCreditCard: boolean } | null
  category: { id: string; name: string; color: string | null; icon: string | null } | null
}

interface Props {
  recurringBill: RecurringBill
}

export function RecurringConfirmView({ recurringBill: rb }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]

  const [amountDisplay, setAmountDisplay] = useState(formatDisplay(rb.amount))
  const [paymentDate, setPaymentDate] = useState<string>(today)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    const confirmedAmount = parseAmount(amountDisplay)
    if (confirmedAmount <= 0) {
      setError("El monto debe ser mayor a cero.")
      return
    }
    haptic("medium")
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: rb.label,
          amount: confirmedAmount,
          billTypeId: rb.billTypeId,
          categoryId: rb.categoryId,
          organizationId: rb.organizationId,
          paymentDate: new Date(paymentDate + "T12:00:00").toISOString(),
          recurringBillId: rb.id,
          assignments: rb.assignments,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al guardar")
      }

      router.push("/bills")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  function formatDateDisplay(iso: string): string {
    if (!iso) return ""
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y.slice(2)}`
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => router.push("/bills/recurring")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Volver
        </button>
        <h1 className="text-base font-semibold">Confirmar gasto</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6 pb-28 space-y-6">
          {/* Title */}
          <div className="text-center space-y-1">
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-fraunces, serif)" }}
            >
              {rb.label}
            </p>
            {rb.billType && (
              <p className="text-sm text-muted-foreground">{rb.billType.name}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monto
            </p>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-4 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-2xl text-muted-foreground font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => {
                  const stripped = e.target.value.replace(/\./g, "").replace(/[^0-9,]/g, "")
                  const commaIdx = stripped.indexOf(",")
                  const intPart = commaIdx >= 0 ? stripped.slice(0, commaIdx) : stripped
                  const decPart = commaIdx >= 0 ? stripped.slice(commaIdx + 1) : null
                  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                  setAmountDisplay(decPart !== null ? `${formattedInt},${decPart}` : formattedInt)
                }}
                onBlur={() => {
                  const n = parseAmount(amountDisplay)
                  if (n > 0) setAmountDisplay(formatDisplay(n))
                }}
                placeholder="0"
                className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none"
                style={{ fontFamily: "var(--font-fraunces, serif)" }}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground px-1">
              El mes pasado fue {formatARS(rb.amount)}
            </p>
          </div>

          {/* Payment date */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fecha de pago
            </p>
            <div className="relative w-full rounded-xl border bg-background px-4 py-3 text-sm cursor-pointer">
              <span className={paymentDate ? "text-foreground" : "text-muted-foreground"}>
                {paymentDate ? formatDateDisplay(paymentDate) : "DD/MM/AA"}
              </span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            disabled={isLoading || parseAmount(amountDisplay) <= 0}
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {isLoading ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}
