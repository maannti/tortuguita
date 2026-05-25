"use client"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Pencil, AlertTriangle } from "lucide-react"
import { DeleteCategoryButton } from "@/components/categories/delete-category-button"
import { CardIcon, isNetworkId, NetworkId, BANKS } from "@/components/ui/card-network"

interface Card {
  id: string; name: string; color: string | null; icon: string | null
}

interface CardsListProps {
  cards: Card[]
  alertCardIds?: string[]
}

export function CardsList({ cards, alertCardIds = [] }: CardsListProps) {
  const { push, replace } = useRouter()
  const newHref = `/cards/new`
  const alertSet = new Set(alertCardIds)

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button onClick={() => push("/settings")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Mis tarjetas
        </h1>
        <button onClick={() => push(newHref)}
          className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Plus className="size-4" />Nueva
        </button>
      </div>

      <div className="px-4 pt-4">
        {cards.length > 0 ? (
          <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
            {cards.map((card) => {
              const network = isNetworkId(card.icon) ? card.icon as NetworkId : null
              const matchedBank = BANKS.find(b => b.color === card.color)
              const bankId = matchedBank?.id || null
              const bankName = matchedBank?.name || card.name.split(" ")[0]
              const netLabel = network
                ? network.charAt(0).toUpperCase() + network.slice(1)
                : ""

              const hasAlert = alertSet.has(card.id)

              return (
                <div
                  key={card.id}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${hasAlert ? "bg-amber-50 dark:bg-amber-500/10" : ""}`}
                >
                  <CardIcon
                    bankId={bankId}
                    bankColor={card.color || "#9D8189"}
                    bankName={bankName}
                    network={network}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{card.name}</p>
                    <p className={`text-xs mt-0.5 ${hasAlert ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {hasAlert
                        ? "Período sin configurar"
                        : netLabel && bankName ? `${netLabel} · ${bankName}` : "Tarjeta de crédito"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {hasAlert && (
                      <AlertTriangle className="size-4 mr-0.5 flex-shrink-0" style={{ color: "#D97706" }} />
                    )}
                    <button onClick={() => replace(`/cards/${card.id}/edit`)}
                      className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="size-4" />
                    </button>
                    <DeleteCategoryButton id={card.id} name={card.name} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">💳</div>
            <p className="text-base font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              Sin tarjetas todavía
            </p>
            <p className="text-sm text-muted-foreground mb-6">Agregá tu primera tarjeta de crédito</p>
            <button onClick={() => push(newHref)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform">
              <Plus className="size-4" />Agregar
            </button>
          </div>
        )}
      </div>

      {cards.length > 0 && (
        <button onClick={() => push(newHref)}
          className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
          <Plus className="size-6" />
        </button>
      )}
    </div>
  )
}
