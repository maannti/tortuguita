"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import {
  NETWORKS, BANKS, NetworkId, CardIcon, NetworkLogo, BankLogo, isNetworkId
} from "@/components/ui/card-network"

interface Props {
  mode: "create" | "edit"
  initialData?: {
    id: string
    name: string
    color: string | null
    icon: string | null
    bank: string | null
    currentClosingDate?: string | null
    currentDueDate?: string | null
    nextClosingDate?: string | null
    nextDueDate?: string | null
  }
}

export function CardForm({ mode, initialData }: Props) {
  const { push, replace, refresh } = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialNetwork = isNetworkId(initialData?.icon) ? initialData!.icon as NetworkId : null
  const [network, setNetwork] = useState<NetworkId | null>(initialNetwork)
  // Use bank field directly, fallback to color detection for backwards compatibility
  const [bankId, setBankId] = useState<string | null>(
    initialData?.bank || (initialData?.color ? (BANKS.find(b => b.color === initialData!.color)?.id ?? null) : null)
  )
  const [name, setName] = useState(initialData?.name || "")

  // Billing period state
  const [currentClosingDate, setCurrentClosingDate] = useState(initialData?.currentClosingDate ?? "")
  const [currentDueDate, setCurrentDueDate] = useState(initialData?.currentDueDate ?? "")
  const [nextClosingDate, setNextClosingDate] = useState(initialData?.nextClosingDate ?? "")
  const [nextDueDate, setNextDueDate] = useState(initialData?.nextDueDate ?? "")

  const selectedBank = BANKS.find(b => b.id === bankId)
  const color = selectedBank?.color || BANKS[0].color

  function autoFillName(bankName: string, net: NetworkId) {
    const netLabel = NETWORKS.find(n => n.id === net)?.name || ""
    setName(`${bankName} ${netLabel}`)
  }
  function handleNetworkSelect(n: NetworkId) {
    setNetwork(n)
    if (selectedBank) autoFillName(selectedBank.name, n)
  }
  function handleBankSelect(id: string) {
    setBankId(id)
    const bank = BANKS.find(b => b.id === id)!
    if (network) autoFillName(bank.name, network)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    if (!network) { setError("Seleccioná una red (Visa, Mastercard…)"); return }

    // Validate billing period if any date is filled
    if (currentClosingDate || currentDueDate) {
      if (!currentClosingDate || !currentDueDate) {
        setError("Completá cierre y vencimiento del período actual"); return
      }
      if (new Date(currentDueDate) <= new Date(currentClosingDate)) {
        setError("El vencimiento debe ser posterior al cierre"); return
      }
    }
    if (nextClosingDate || nextDueDate) {
      if (!nextClosingDate || !nextDueDate) {
        setError("Completá cierre y vencimiento del próximo período"); return
      }
      if (new Date(nextDueDate) <= new Date(nextClosingDate)) {
        setError("El vencimiento del próximo período debe ser posterior al cierre"); return
      }
    }

    setError(null); setIsLoading(true)
    try {
      const url = mode === "create" ? "/api/bill-types" : `/api/bill-types/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon: network, bank: bankId, isCreditCard: true }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      const saved = await res.json()
      const cardId = saved.id

      // Save billing period separately if dates are provided
      if (currentClosingDate && currentDueDate) {
        const periodRes = await fetch(`/api/bill-types/${cardId}/billing-period`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentClosingDate: new Date(currentClosingDate + "T00:00:00"),
            currentDueDate: new Date(currentDueDate + "T00:00:00"),
            ...(nextClosingDate && nextDueDate ? {
              nextClosingDate: new Date(nextClosingDate + "T00:00:00"),
              nextDueDate: new Date(nextDueDate + "T00:00:00"),
            } : {}),
          }),
        })
        if (!periodRes.ok) {
          const err = await periodRes.json()
          throw new Error(err.error || "Error al guardar el período")
        }
      }

      replace("/cards"); refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => replace("/cards")}
          className="justify-self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="justify-self-center text-base font-semibold whitespace-nowrap">
          {mode === "create" ? "Nueva tarjeta" : "Editar tarjeta"}
        </h1>
        <button type="submit" disabled={isLoading || !name.trim()}
          className="justify-self-end px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "…" : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-6">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Network */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Red</p>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => {
                const selected = network === n.id
                return (
                  <button key={n.id} type="button" onClick={() => handleNetworkSelect(n.id)}
                    className={`flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${selected ? "bg-[#F4ACB7]" : "bg-black/[0.04] dark:bg-white/[0.08]"}`}>
                    <NetworkLogo network={n.id} size={34} />
                    <span className="text-[10px] font-semibold text-center leading-tight"
                      style={{ color: selected ? "#7a3a47" : undefined }}>
                      {n.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bank */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banco</p>
            <div className="grid grid-cols-4 gap-2">
              {BANKS.map((bank) => {
                const selected = bankId === bank.id
                return (
                  <button key={bank.id} type="button" onClick={() => handleBankSelect(bank.id)}
                    className={`flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all ${selected ? "bg-[#F4ACB7]" : "bg-black/[0.04] dark:bg-white/[0.08]"}`}>
                    <BankLogo bankId={bank.id} size={36} />
                    <span className="text-[10px] font-semibold text-center leading-tight px-0.5"
                      style={{ color: selected ? "#7a3a47" : undefined }}>
                      {bank.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview */}
          {(network || bankId) && (
            <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <CardIcon
                bankId={bankId}
                bankColor={selectedBank?.color || "#9D8189"}
                bankName={selectedBank?.name || "?"}
                network={network}
                size="md"
              />
              <div>
                <p className="text-sm font-semibold">{name || "Nombre de la tarjeta"}</p>
                <p className="text-xs text-muted-foreground">Tarjeta de crédito</p>
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="card-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
            <input id="card-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ej. ICBC Visa"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Billing period */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Período de facturación actual
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cierre y vencimiento del resumen en curso
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="currentClosingDate" className="text-xs text-muted-foreground">Fecha de cierre</label>
                <input
                  id="currentClosingDate"
                  type="date"
                  value={currentClosingDate}
                  onChange={(e) => setCurrentClosingDate(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="currentDueDate" className="text-xs text-muted-foreground">Fecha de vencimiento</label>
                <input
                  id="currentDueDate"
                  type="date"
                  value={currentDueDate}
                  onChange={(e) => setCurrentDueDate(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Próximo período (opcional)
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completá si ya conocés el próximo cierre
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="nextClosingDate" className="text-xs text-muted-foreground">Fecha de cierre</label>
                <input
                  id="nextClosingDate"
                  type="date"
                  value={nextClosingDate}
                  onChange={(e) => setNextClosingDate(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="nextDueDate" className="text-xs text-muted-foreground">Fecha de vencimiento</label>
                <input
                  id="nextDueDate"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
