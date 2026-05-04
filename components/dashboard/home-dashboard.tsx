"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus, FileText, ChevronDown, ChevronUp } from "lucide-react"
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentIndex = availableMonths.indexOf(monthKey)
  const prevMonth = currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null
  const nextMonth = currentIndex > 0 ? availableMonths[currentIndex - 1] : null

  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)
  const ccTotal = creditCardGroups.reduce((s, g) => s + g.totalAmount, 0)

  const navigateMonth = (m: string) => router.push(`/dashboard?month=${m}`)

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
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
    <div className="pb-28">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,image/*" onChange={handleFileChange} className="hidden" />

      {/* ── Hero card: gradient flotante, mes + total + miembros ── */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="rounded-3xl p-5 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #c8d8c4 0%, #ddd0c8 50%, #dfc5c8 100%)" }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => prevMonth && navigateMonth(prevMonth)}
              disabled={!prevMonth}
              className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center disabled:opacity-30 active:bg-white/60 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-foreground/80" />
            </button>
            <p className="text-sm font-medium text-foreground/70 tracking-wide">
              {capitalize(month)}
            </p>
            <button
              onClick={() => nextMonth && navigateMonth(nextMonth)}
              disabled={!nextMonth}
              className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center disabled:opacity-30 active:bg-white/60 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-foreground/80" />
            </button>
          </div>

          {/* Total */}
          <p className="text-4xl font-bold text-center text-foreground tracking-tight">
            {formatARS(totalAmount)}
          </p>

          {/* Member breakdown */}
          {members.length > 0 && (
            <div
              className="mt-4 pt-4 grid divide-x divide-black/10 border-t border-black/10"
              style={{ gridTemplateColumns: `repeat(${members.length}, 1fr)` }}
            >
              {members.map((member) => (
                <div key={member.id} className="px-3 first:pl-0 last:pr-0 text-center">
                  <p className="text-[11px] text-foreground/60 font-medium">
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {formatARS(member.expenses)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-4">

        {/* ── Tarjetas de crédito ── */}
        {creditCardGroups.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-foreground">Tarjetas</h2>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(ccTotal)}</span>
            </div>
            <div className="rounded-2xl border bg-card divide-y overflow-hidden">
              {creditCardGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.name)
                return (
                  <div key={group.name}>
                    {/* Summary row */}
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-muted/50 transition-colors"
                    >
                      {/* Color circle */}
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: group.color }}
                      >
                        <span className="text-white text-[10px] font-bold leading-none">
                          {group.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.bills.length} {group.bills.length === 1 ? "cuota activa" : "cuotas activas"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm font-semibold tabular-nums">{formatARS(group.totalAmount)}</span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {/* Expanded: member split + bills */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        {/* Member breakdown for this card */}
                        {group.memberAmounts.length > 1 && (
                          <div
                            className="grid divide-x border-b py-2.5"
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
                        {/* Bill rows */}
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
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Gastos fijos ── */}
        {fixedExpenses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm font-semibold text-foreground">Gastos fijos</h2>
              <span className="text-sm font-medium text-muted-foreground">{formatARS(fixedTotal)}</span>
            </div>
            <div className="rounded-2xl border bg-card divide-y overflow-hidden">
              {fixedExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: expense.billTypeColor }}
                    >
                      <span className="text-white text-[10px] font-bold">
                        {expense.billTypeName.slice(0, 2).toUpperCase()}
                      </span>
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

        {/* Empty state */}
        {totalAmount === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">No hay gastos registrados este mes</p>
            <Link
              href="/bills/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Agregar gasto
            </Link>
          </div>
        )}
      </div>

      {/* ── FAB ── well above nav bar */}
      <button
        onClick={() => setShowActions(true)}
        className="fixed bottom-[88px] right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ── Action sheet ── */}
      {showActions && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowActions(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-10 pt-2 animate-in slide-in-from-bottom-4 duration-200">
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
              className="mt-3 w-full bg-background rounded-2xl py-4 text-sm font-semibold text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
