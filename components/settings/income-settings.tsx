"use client"
import { useState } from "react"
import { Check } from "lucide-react"

interface Member { id: string; name: string | null; email: string | null }

interface Props {
  organizationId: string
  members: Member[]
  initialIncomes: Record<string, number>
}

function parseAmount(s: string): number { return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0 }
function formatDisplay(n: number): string {
  if (!n) return ""
  const [int, dec] = n.toString().split(".")
  const f = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return dec ? `${f},${dec}` : f
}
function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))
}

export function IncomeSettings({ organizationId, members, initialIncomes }: Props) {
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, formatDisplay(initialIncomes[m.id] || 0)]))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalIncome = members.reduce((s, m) => s + parseAmount(amounts[m.id] || "0"), 0)

  async function handleSave() {
    setIsSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch("/api/settings/incomes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          members: members.map((m) => ({ userId: m.id, amount: parseAmount(amounts[m.id] || "0") })),
        }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError("No se pudo guardar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Ingresos del mes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Usados para calcular la división proporcional de gastos
        </p>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          const amount = parseAmount(amounts[member.id] || "0")
          const pct = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0
          return (
            <div key={member.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {member.name || member.email}
                </span>
                {totalIncome > 0 && amount > 0 && (
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
                <span className="text-muted-foreground font-medium text-sm">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amounts[member.id]}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [member.id]: e.target.value.replace(/[^0-9,.]/g, ""),
                    }))
                  }
                  onBlur={() => {
                    const n = parseAmount(amounts[member.id] || "0")
                    if (n > 0)
                      setAmounts((prev) => ({ ...prev, [member.id]: formatDisplay(n) }))
                  }}
                  placeholder="0"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          )
        })}
      </div>

      {totalIncome > 0 && (
        <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Total combinado</p>
          <p className="text-sm font-semibold">{formatARS(totalIncome)}</p>
          <div className="flex gap-2 pt-1">
            {members.map((m) => {
              const a = parseAmount(amounts[m.id] || "0")
              const pct = totalIncome > 0 ? Math.round((a / totalIncome) * 100) : 0
              return (
                <div key={m.id} className="flex-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{m.name?.split(" ")[0]} {pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
      >
        {saved ? <><Check className="size-4" /> Guardado</> : isSaving ? "Guardando..." : "Guardar ingresos"}
      </button>
    </div>
  )
}
