"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Wallet, ArrowLeftRight, QrCode, Smartphone, User, Home } from "lucide-react"
import {
  NETWORKS, BANKS, NetworkId, CardIcon, NetworkLogo, BankLogo, isNetworkId
} from "@/components/ui/card-network"

type AccountType = "debit" | "transfer" | "qr" | "wallet"

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: React.ReactNode }[] = [
  { value: "debit",    label: "Débito",        icon: <Wallet className="size-4" /> },
  { value: "transfer", label: "Transferencia", icon: <ArrowLeftRight className="size-4" /> },
  { value: "qr",       label: "QR",            icon: <QrCode className="size-4" /> },
  { value: "wallet",   label: "Billetera",     icon: <Smartphone className="size-4" /> },
]
const TYPE_LABEL: Record<AccountType, string> = {
  debit: "Débito", transfer: "Transferencia", qr: "QR", wallet: "Billetera",
}

interface Organization { id: string; name: string; isPersonal: boolean }
interface Props {
  organizations: Organization[]
  spaceId?: string
  returnTo?: string
  mode?: "create" | "edit"
  initialData?: {
    id: string
    name: string
    color: string | null
    icon: string | null
    bank: string | null
    accountType: string | null
    organizationId: string
  }
}

export function AccountForm({ organizations, spaceId, returnTo, mode = "create", initialData }: Props) {
  const { push, replace, refresh } = useRouter()
  const back = returnTo || "/cards"
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [accountType, setAccountType] = useState<AccountType>(
    (initialData?.accountType as AccountType) || "debit"
  )
  const initialNetwork = isNetworkId(initialData?.icon) ? (initialData!.icon as NetworkId) : null
  const [network, setNetwork] = useState<NetworkId | null>(initialNetwork)
  const [bankId, setBankId] = useState<string | null>(initialData?.bank ?? null)
  const [name, setName] = useState(initialData?.name || "")
  const [selectedOrgId, setSelectedOrgId] = useState<string>(
    initialData?.organizationId || spaceId || organizations[0]?.id || ""
  )

  const selectedBank = BANKS.find(b => b.id === bankId)
  const color = selectedBank?.color || BANKS[0].color

  function autoFillName(bankName: string, type: AccountType) {
    setName(`${bankName} ${TYPE_LABEL[type]}`)
  }
  function handleBankSelect(id: string) {
    setBankId(id)
    const bank = BANKS.find(b => b.id === id)!
    autoFillName(bank.name, accountType)
  }
  function handleTypeSelect(t: AccountType) {
    setAccountType(t)
    if (selectedBank) autoFillName(selectedBank.name, t)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    if (!bankId) { setError("Seleccioná un banco o billetera"); return }
    setError(null); setIsLoading(true)
    try {
      const url = mode === "create" ? "/api/bill-types" : `/api/bill-types/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          icon: network || undefined,
          bank: bankId,
          isCreditCard: false,
          accountType,
          organizationId: selectedOrgId,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      push(back); refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => replace(back)}
          className="justify-self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="justify-self-center text-base font-semibold whitespace-nowrap">
          {mode === "create" ? "Nuevo medio de pago" : "Editar medio de pago"}
        </h1>
        <button type="submit" disabled={isLoading || !name.trim()}
          className="justify-self-end px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "…" : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-6">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Tipo de medio */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const selected = accountType === t.value
                return (
                  <button key={t.value} type="button" onClick={() => handleTypeSelect(t.value)}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all ${selected ? "border-primary bg-primary/5 dark:bg-primary/20 font-medium text-foreground" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                    {t.icon}<span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Espacio (si hay más de uno) */}
          {organizations.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Espacio</p>
              <div className="grid grid-cols-2 gap-2">
                {organizations.map((org) => {
                  const selected = selectedOrgId === org.id
                  return (
                    <button key={org.id} type="button" onClick={() => setSelectedOrgId(org.id)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all ${selected ? "border-primary bg-primary/5 dark:bg-primary/20 font-medium text-foreground" : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
                      {org.isPersonal ? <User className="size-4" /> : <Home className="size-4" />}
                      <span className="truncate">{org.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Banco / billetera */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banco / billetera</p>
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

          {/* Red (opcional, p. ej. débito Visa/Maestro) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Red <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => {
                const selected = network === n.id
                return (
                  <button key={n.id} type="button" onClick={() => setNetwork(selected ? null : n.id)}
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

          {/* Preview */}
          {bankId && (
            <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <CardIcon
                bankId={bankId}
                bankColor={selectedBank?.color || "#9D8189"}
                bankName={selectedBank?.name || "?"}
                network={network}
                size="md"
              />
              <div>
                <p className="text-sm font-semibold">{name || "Nombre del medio"}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABEL[accountType]}</p>
              </div>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <label htmlFor="account-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
            <input id="account-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ej. Galicia Débito"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
    </form>
  )
}
