"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, FileText } from "lucide-react"
import { useState, useRef } from "react"

interface Member {
  id: string
  name: string
  expenses: number
  income: number
  percentage: number
}

interface FixedExpense {
  id: string
  label: string
  amount: number
  billTypeName: string
  billTypeColor: string
  billTypeIcon: string | null
}

interface CreditCardGroup {
  name: string
  color: string
  icon: string | null
  totalAmount: number
  memberAmounts: Array<{ name: string; amount: number }>
  bills: Array<{
    id: string
    label: string
    amount: number
    currentInstallment: number | null
    totalInstallments: number | null
  }>
}

interface Props {
  month: string
  monthKey: string
  availableMonths: string[]
  totalAmount: number
  members: Member[]
  fixedExpenses: FixedExpense[]
  creditCardGroups: CreditCardGroup[]
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Darken a hex color for text contrast
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

export function HomeDashboard({
  month,
  monthKey,
  availableMonths,
  totalAmount,
  members,
  fixedExpenses,
  creditCardGroups,
}: Props) {
  const router = useRouter()
  const [showActions, setShowActions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)

  const navigateMonth = (m: string) => {
    router.push(`/dashboard?month=${m}`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert("El archivo no puede superar 10MB"); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1]
      sessionStorage.setItem("pendingImport", JSON.stringify({ name: file.name, type: file.type, data: base64 }))
      router.push("/ai")
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div className="pb-24">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,image/*" onChange={handleFileChange} className="hidden" />

      {/* Hero card — month nav + total integrated */}
      <div className="bg-primary px-4 pt-4 pb-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => prevMonth && navigateMonth(prevMonth)}
            disabled={!prevMonth}
            className="p-1.5 rounded-full bg-white/20 disabled:opacity-30 active:bg-white/30 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-primary-foreground" />
          </button>
          <h1 className="text-sm font-semibold text-primary-foreground/80 tracking-wide uppercase">
            {capitalize(month)}
          </h1>
          <button
            onClick={() => nextMonth && navigateMonth(nextMonth)}
            disabled={!nextMonth}
            className="p-1.5 rounded-full bg-white/20 disabled:opacity-30 active:bg-white/30 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>

        {/* Total */}
        <p className="text-4xl font-bold text-primary-foreground text-center tracking-tight">
          {formatARS(totalAmount)}
        </p>
        <p className="text-xs text-primary-foreground/60 text-center mt-1 uppercase tracking-wide">Total del mes</p>

        {/* Member breakdown */}
        {members.length > 0 && (
          <div
            className="mt-5 grid divide-x divide-white/20 border-t border-white/20 pt-4"
            style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}
          >
            {members.map((member) => (
              <div key={member.id} className="px-3 first:pl-0 last:pr-0 text-center">
                <p className="text-[11px] text-primary-foreground/60 font-medium">{member.name.split(" ")[0]}</p>
                <p className="text-base font-bold text-primary-foreground mt-0.5">{formatARS(member.expenses)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* Gastos fijos */}
        {fixedExpenses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos fijos</h2>
              <span className="text-xs font-semibold text-muted-foreground">{formatARS(fixedTotal)}</span>
            </div>
            <div className="rounded-2xl border bg-card divide-y overflow-hidden">
              {fixedExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: expense.billTypeColor + "22", border: `1.5px solid ${expense.billTypeColor}44` }}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: expense.billTypeColor }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{expense.label}</p>
                      <p className="text-xs text-muted-foreground">{expense.billTypeName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatARS(expense.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Cuotas por tarjeta */}
        {creditCardGroups.map((group) => (
          <section key={group.name}>
            {/* Colored header bar */}
            <div
              className="rounded-t-2xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: group.color }}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Cuotas {group.name}
              </h2>
              <span className="text-sm font-bold text-white">{formatARS(group.totalAmount)}</span>
            </div>

            <div className="rounded-b-2xl border border-t-0 bg-card overflow-hidden">
              {/* Member breakdown */}
              {group.memberAmounts.length > 1 && (
                <div
                  className="grid divide-x border-b py-2"
                  style={{ gridTemplateColumns: `repeat(${group.memberAmounts.length}, 1fr)` }}
                >
                  {group.memberAmounts.map((m) => (
                    <div key={m.name} className="px-3 text-center">
                      <p className="text-[10px] text-muted-foreground">{m.name.split(" ")[0]}</p>
                      <p className="text-sm font-semibold">{formatARS(m.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Bills list */}
              <div className="divide-y">
                {group.bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{bill.label}</p>
                      {bill.totalInstallments && bill.totalInstallments > 1 && (
                        <p className="text-xs text-muted-foreground">
                          Cuota {bill.currentInstallment} de {bill.totalInstallments}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatARS(bill.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Empty state */}
        {totalAmount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">No hay gastos registrados este mes</p>
            <Link href="/bills/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium">
              <Plus className="h-4 w-4" />
              Agregar gasto
            </Link>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowActions(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Action sheet */}
      {showActions && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowActions(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-8 pt-2 animate-in slide-in-from-bottom-4 duration-200">
            <div className="bg-background rounded-2xl overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b">
                <p className="text-xs text-muted-foreground text-center font-medium">¿Qué querés hacer?</p>
              </div>
              <button
                onClick={() => { setShowActions(false); router.push("/bills/new") }}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors border-b"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Nuevo gasto</p>
                  <p className="text-xs text-muted-foreground">Cargá un gasto manualmente</p>
                </div>
              </button>
              <button
                onClick={() => { setShowActions(false); setTimeout(() => fileInputRef.current?.click(), 100) }}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Importar resumen</p>
                  <p className="text-xs text-muted-foreground">PDF, imagen o CSV del banco / tarjeta</p>
                </div>
              </button>
            </div>
            <button
              onClick={() => setShowActions(false)}
              className="mt-3 w-full bg-background rounded-2xl py-4 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
