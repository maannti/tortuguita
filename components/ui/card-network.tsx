// Shared credit card network logos + bank data
// Used in category form, categories list, bills view, etc.

export type NetworkId = "visa" | "mastercard" | "amex" | "cabal"
export const KNOWN_NETWORKS: NetworkId[] = ["visa", "mastercard", "amex", "cabal"]
export function isNetworkId(s: string | null | undefined): s is NetworkId {
  return !!s && KNOWN_NETWORKS.includes(s as NetworkId)
}

export const NETWORKS: { id: NetworkId; name: string; color: string }[] = [
  { id: "visa",       name: "Visa",       color: "#1A1F71" },
  { id: "mastercard", name: "Mastercard", color: "#EB001B" },
  { id: "amex",       name: "Amex",       color: "#2E77BC" },
  { id: "cabal",      name: "Cabal",      color: "#005BAA" },
]

// Bank logo filenames — all Play Store PNGs, uniform square icons
const BANK_FILES: Record<string, string> = {
  icbc:        "icbc.png",
  santander:   "santander.png",
  galicia:     "galicia.png",
  bbva:        "bbva.png",
  brubank:     "brubank.png",
  naranjax:    "naranjax.png",
  macro:       "macro.png",
  nacion:      "nacion.png",
  provincia:   "provincia.png",
  ciudad:      "ciudad.jpg",
  supervielle: "supervielle.png",
  patagonia:   "patagonia.jpg",
  mercadopago: "mercadopago.png",
  uala:        "uala.png",
  amexprop:    "amexprop.png",
  otro:        "otro.svg",
}

// Network logo filenames — all Play Store PNGs
const NETWORK_FILES: Record<NetworkId, string> = {
  visa:       "visa.png",
  mastercard: "mastercard.png",
  amex:       "amex.png",
  cabal:      "cabal.png",
}

// kind: "bank" (banco tradicional) | "wallet" (billetera/neobanco) | "crypto" | "intl" (internacional)
export type BankKind = "bank" | "wallet" | "crypto" | "intl"
export const BANKS: { id: string; name: string; color: string; kind: BankKind }[] = [
  { id: "icbc",        name: "ICBC",         color: "#C41230", kind: "bank" },
  { id: "santander",   name: "Santander",    color: "#EC0000", kind: "bank" },
  { id: "galicia",     name: "Galicia",      color: "#E40613", kind: "bank" },
  { id: "bbva",        name: "BBVA",         color: "#004481", kind: "bank" },
  { id: "brubank",     name: "Brubank",      color: "#7B2FBE", kind: "wallet" },
  { id: "naranjax",    name: "Naranja X",    color: "#FF6200", kind: "wallet" },
  { id: "macro",       name: "Macro",        color: "#F5841F", kind: "bank" },
  { id: "mercadopago", name: "Mercado Pago", color: "#009EE3", kind: "wallet" },
  { id: "uala",        name: "Ualá",         color: "#5C2D91", kind: "wallet" },
  { id: "nacion",      name: "Nación",       color: "#004990", kind: "bank" },
  { id: "provincia",   name: "Provincia",    color: "#00539B", kind: "bank" },
  { id: "ciudad",      name: "Ciudad",       color: "#003087", kind: "bank" },
  { id: "supervielle", name: "Supervielle",  color: "#E05C00", kind: "bank" },
  { id: "patagonia",   name: "Patagonia",    color: "#005B8E", kind: "bank" },
  { id: "amexprop",   name: "Amex Propietaria", color: "#016FD0", kind: "bank" },
  { id: "otro",       name: "Otro",         color: "#9D8189", kind: "bank" },
]

// ── Network logo ─────────────────────────────────────────────────────────────

interface NetworkLogoProps { network: NetworkId; size?: number; className?: string }

export function NetworkLogo({ network, size = 40, className = "" }: NetworkLogoProps) {
  const file = NETWORK_FILES[network]
  return (
    <img
      src={`/logos/networks/${file}`}
      alt={network}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      style={{ objectFit: "cover", display: "block" }}
    />
  )
}

// ── Bank logo ─────────────────────────────────────────────────────────────────

interface BankLogoProps { bankId: string; size?: number; className?: string }

export function BankLogo({ bankId, size = 40, className = "" }: BankLogoProps) {
  const file = BANK_FILES[bankId]
  if (!file) return null

  return (
    <img
      src={`/logos/banks/${file}`}
      alt={bankId}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      style={{ objectFit: "cover", display: "block" }}
    />
  )
}

// ── Combined card icon: bank logo + network badge ─────────────────────────────

interface CardIconProps {
  bankId?: string | null
  bankColor: string
  bankName: string
  network: NetworkId | null
  size?: "sm" | "md" | "lg"
}

export function CardIcon({ bankId, bankColor, bankName, network, size = "md" }: CardIconProps) {
  const dims   = size === "sm" ? 36 : size === "md" ? 44 : 56
  const badge  = size === "sm" ? 18 : size === "md" ? 22 : 28
  const radius = size === "sm" ? "rounded-xl" : "rounded-2xl"

  return (
    <div className="relative flex-shrink-0" style={{ width: dims, height: dims }}>
      {bankId && BANK_FILES[bankId] ? (
        <BankLogo bankId={bankId} size={dims} className={radius} />
      ) : (
        <div
          className={`w-full h-full ${radius} flex items-center justify-center font-bold text-white`}
          style={{ backgroundColor: bankColor, fontSize: dims * 0.33 }}
        >
          {bankName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
      )}

      {/* Network badge */}
      {network && (
        <div
          className="absolute -bottom-1 -right-1 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden"
          style={{ width: badge, height: badge }}
        >
          <NetworkBadge network={network} size={badge - 4} />
        </div>
      )}
    </div>
  )
}

// Tiny network badge
function NetworkBadge({ network, size }: { network: NetworkId; size: number }) {
  if (network === "mastercard") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        <circle cx="7"  cy="10" r="6" fill="#EB001B" />
        <circle cx="13" cy="10" r="6" fill="#F79E1B" />
        <path d="M10 4.4A6 6 0 0110 15.6 6 6 0 0110 4.4Z" fill="#FF5F00" />
      </svg>
    )
  }
  if (network === "visa") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logos/networks/v-de-visa.png" alt="Visa" width={size} height={size} style={{ objectFit: "contain" }} />
    )
  }
  if (network === "amex") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logos/networks/amex.png" alt="Amex" width={size} height={size} style={{ objectFit: "contain" }} />
    )
  }
  if (network === "cabal") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logos/networks/cabal.png" alt="Cabal" width={size} height={size} style={{ objectFit: "contain" }} />
    )
  }
}
