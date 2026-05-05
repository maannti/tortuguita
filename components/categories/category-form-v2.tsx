"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Pencil } from "lucide-react"
import { ColorInputWithPicker } from "@/components/ui/color-picker-dialog"

const EMOJI_BASICS = [
  { emoji: "🏠", color: "#9D8189" },
  { emoji: "🛒", color: "#7B9E87" },
  { emoji: "🍔", color: "#C4956A" },
  { emoji: "💰", color: "#C4A24D" },
]

const EMOJI_MORE = [
  { emoji: "🚗", color: "#7B8FA1" },
  { emoji: "💊", color: "#B08080" },
  { emoji: "🎓", color: "#5B7BA8" },
  { emoji: "✈️", color: "#9B7EC8" },
  { emoji: "💪", color: "#9D8189" },
  { emoji: "🎬", color: "#9B7EC8" },
  { emoji: "📱", color: "#7B8FA1" },
  { emoji: "⚡", color: "#C4A24D" },
  { emoji: "🐾", color: "#C4956A" },
  { emoji: "💈", color: "#B08080" },
  { emoji: "🎮", color: "#9B7EC8" },
  { emoji: "🎵", color: "#9B7EC8" },
  { emoji: "📚", color: "#5B7BA8" },
  { emoji: "🧹", color: "#7B9E87" },
  { emoji: "💰", color: "#C4A24D" },
  { emoji: "🍷", color: "#C4956A" },
  { emoji: "👔", color: "#B08080" },
]

const ALL_EMOJIS = [...EMOJI_BASICS, ...EMOJI_MORE]

interface Props {
  mode: "create" | "edit"
  initialData?: { id: string; name: string; color: string | null; icon: string | null }
  organizationId?: string
  spaceName?: string
  returnTo?: string
}

export function CategoryFormV2({ mode, initialData, organizationId, spaceName, returnTo }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name || "")
  const [color, setColor] = useState(initialData?.color || "#9D8189")
  const [expanded, setExpanded] = useState(false)

  // Emoji state: which preset is selected, or custom text
  const initialIsPreset = !!initialData?.icon && ALL_EMOJIS.some(e => e.emoji === initialData.icon)
  const [selectedEmoji, setSelectedEmoji] = useState(initialIsPreset ? initialData!.icon! : "")
  const [customMode, setCustomMode] = useState(!!initialData?.icon && !initialIsPreset)
  const [customEmoji, setCustomEmoji] = useState(!initialIsPreset ? initialData?.icon || "" : "")

  function pickEmoji(e: string, c: string) {
    setSelectedEmoji(e)
    setColor(c)
    setCustomMode(false)
    setCustomEmoji("")
  }

  function openCustom() {
    setCustomMode(true)
    setSelectedEmoji("")
  }

  const displayEmoji = customMode ? customEmoji : selectedEmoji

  const visibleEmojis = expanded ? ALL_EMOJIS : EMOJI_BASICS

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    setError(null); setIsLoading(true)
    const finalEmoji = customMode ? customEmoji.trim() || null : selectedEmoji || null
    try {
      const url = mode === "create" ? "/api/bill-types" : `/api/bill-types/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon: finalEmoji, isCreditCard: false, organizationId: organizationId || undefined }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      const dest = returnTo || (organizationId ? `/categories?spaceId=${organizationId}` : "/categories")
      router.push(dest); router.refresh()
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
      }
    } finally { setIsLoading(false) }
  }

  const backPath = returnTo || (organizationId ? `/categories?spaceId=${organizationId}` : "/categories")

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => router.push(backPath)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver
        </button>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          {mode === "create" ? "Nueva categoría" : "Editar categoría"}
        </h1>
        <button type="submit" disabled={isLoading || !name.trim()}
          className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
          {isLoading ? "…" : "Guardar"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-6">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Space context banner */}
          {mode === "create" && spaceName && (
            <div className="rounded-xl bg-muted/60 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-base leading-none">🏠</span>
              <span>Estás creando esta categoría en <span className="font-semibold text-foreground">{spaceName}</span></span>
            </div>
          )}

          {/* Preview */}
          <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}22` }}>
              {displayEmoji
                ? <span className="text-2xl leading-none">{displayEmoji}</span>
                : <span className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
              }
            </div>
            <div>
              <p className="text-sm font-semibold">{name || "Nombre de la categoría"}</p>
              <p className="text-xs text-muted-foreground">Gasto fijo</p>
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="ej. Alquiler, Netflix, Gimnasio…"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Ícono */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ícono</label>

            {/* Fila base: siempre grid de 6 columnas → alineado con los márgenes */}
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_BASICS.map((p) => {
                const selected = !customMode && selectedEmoji === p.emoji
                return (
                  <button key={p.emoji} type="button" onClick={() => pickEmoji(p.emoji, p.color)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90
                      ${selected ? "ring-2 ring-primary bg-primary/8" : "bg-muted/50 hover:bg-muted"}`}>
                    {p.emoji}
                  </button>
                )
              })}

              {/* Expand */}
              <button type="button" onClick={() => setExpanded(o => !o)}
                className="aspect-square rounded-2xl flex items-center justify-center bg-muted/50 hover:bg-muted transition-all active:scale-90">
                <Plus className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? "rotate-45" : ""}`} />
              </button>

              {/* Custom emoji */}
              <button type="button" onClick={openCustom}
                className={`aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90
                  ${customMode ? "ring-2 ring-primary bg-primary/8" : "bg-muted/50 hover:bg-muted"}`}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Emojis extra — misma grilla de 6 */}
            {expanded && (
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_MORE.map((p) => {
                  const selected = !customMode && selectedEmoji === p.emoji
                  return (
                    <button key={p.emoji} type="button" onClick={() => pickEmoji(p.emoji, p.color)}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90
                        ${selected ? "ring-2 ring-primary bg-primary/8" : "bg-muted/50 hover:bg-muted"}`}>
                      {p.emoji}
                    </button>
                  )
                })}
              </div>
            )}

            {customMode && (
              <input type="text" value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="Escribí cualquier emoji…"
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
            <ColorInputWithPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>
    </form>
  )
}
