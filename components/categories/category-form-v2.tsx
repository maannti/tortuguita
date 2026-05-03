"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

const MUTED_COLORS = [
  { hex: "#9D8189", label: "Mauve"     },
  { hex: "#7B9E87", label: "Sage"      },
  { hex: "#C4956A", label: "Terracota" },
  { hex: "#5B7BA8", label: "Azul"      },
  { hex: "#9B7EC8", label: "Lavanda"   },
  { hex: "#C4A24D", label: "Ámbar"     },
  { hex: "#7B8FA1", label: "Pizarra"   },
  { hex: "#B08080", label: "Rosa"      },
]

interface Props {
  mode: "create" | "edit"
  initialData?: {
    id: string; name: string; color: string | null; icon: string | null
  }
}

export function CategoryFormV2({ mode, initialData }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name || "")
  const [emoji, setEmoji] = useState(initialData?.icon || "")
  const [color, setColor] = useState(initialData?.color || MUTED_COLORS[0].hex)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    setError(null); setIsLoading(true)
    try {
      const url = mode === "create" ? "/api/bill-types" : `/api/bill-types/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), color,
          icon: emoji.trim() || null,
          isCreditCard: false,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      router.push("/categories"); router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => router.push("/categories")}
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
        <div className="px-4 py-5 space-y-6">
          {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

          {/* Preview */}
          <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${color}22` }}>
              {emoji
                ? <span className="text-2xl">{emoji}</span>
                : <span className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
              }
            </div>
            <div>
              <p className="text-sm font-semibold">{name || "Nombre de la categoría"}</p>
              <p className="text-xs text-muted-foreground">Gasto fijo</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="ej. Alquiler, Netflix, Gimnasio…"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Emoji */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Emoji <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
            </label>
            <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
              placeholder="ej. 🛒 🏠 💊"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
            <div className="flex gap-3 flex-wrap">
              {MUTED_COLORS.map((c) => (
                <button key={c.hex} type="button" onClick={() => setColor(c.hex)}
                  title={c.label}
                  className="relative w-9 h-9 rounded-full transition-all active:scale-90"
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: color === c.hex ? `0 0 0 3px white, 0 0 0 5px ${c.hex}` : "none"
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
