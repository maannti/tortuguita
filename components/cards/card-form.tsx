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
    id: string; name: string; color: string | null; icon: string | null
  }
}

export function CardForm({ mode, initialData }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialNetwork = isNetworkId(initialData?.icon) ? initialData!.icon as NetworkId : null
  const [network, setNetwork] = useState<NetworkId | null>(initialNetwork)
  const [bankId, setBankId] = useState<string | null>(
    initialData?.color ? (BANKS.find(b => b.color === initialData!.color)?.id ?? null) : null
  )
  const [name, setName] = useState(initialData?.name || "")

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
    setError(null); setIsLoading(true)
    try {
      const url = mode === "create" ? "/api/bill-types" : `/api/bill-types/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon: network, isCreditCard: true }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      router.push("/cards"); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => router.push("/cards")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver
        </button>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          {mode === "create" ? "Nueva tarjeta" : "Editar tarjeta"}
        </h1>
        <button type="submit" disabled={isLoading || !name.trim()}
          className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "…" : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 space-y-6">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Network */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Red</label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => {
                const selected = network === n.id
                return (
                  <button key={n.id} type="button" onClick={() => handleNetworkSelect(n.id)}
                    className="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all"
                    style={{ background: selected ? "#F4ACB7" : "rgba(0,0,0,0.04)" }}>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banco</label>
            <div className="grid grid-cols-4 gap-2">
              {BANKS.map((bank) => {
                const selected = bankId === bank.id
                return (
                  <button key={bank.id} type="button" onClick={() => handleBankSelect(bank.id)}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all"
                    style={{ background: selected ? "#F4ACB7" : "rgba(0,0,0,0.04)" }}>
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
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ej. ICBC Visa"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
    </form>
  )
}
