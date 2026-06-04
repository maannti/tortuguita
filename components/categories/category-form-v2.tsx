"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Check } from "lucide-react"
import { ColorInputWithPicker } from "@/components/ui/color-picker-dialog"
import { EmojiPickerSheet } from "@/components/ui/emoji-picker-sheet"

interface Member { id: string; name: string | null; email: string | null }
interface DefaultAssignment { userId: string; percentage: number }

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

// Keyword → emoji/color, used to auto-suggest an icon from the category name.
// Order matters: first match wins, so put more specific terms first.
const EMOJI_KEYWORDS: { words: string[]; emoji: string; color: string }[] = [
  { words: ["nafta", "combustible", "gasolina", "ypf", "shell", "auto", "vehiculo", "patente", "cochera", "peaje"], emoji: "🚗", color: "#7B8FA1" },
  { words: ["super", "supermercado", "mercado", "almacen", "verduler", "carnicer", "comida", "alimento", "compras"], emoji: "🛒", color: "#7B9E87" },
  { words: ["resto", "restaurante", "bar", "salida", "cafe", "café", "delivery", "pedidos", "rappi", "pedidosya"], emoji: "🍔", color: "#C4956A" },
  { words: ["alquiler", "renta", "expensas", "hogar", "casa", "depto", "departamento"], emoji: "🏠", color: "#9D8189" },
  { words: ["luz", "electricidad", "gas", "agua", "servicio", "edenor", "edesur", "metrogas"], emoji: "⚡", color: "#C4A24D" },
  { words: ["internet", "wifi", "fibertel", "telecentro", "telefono", "celular", "movil", "claro", "personal", "movistar"], emoji: "📱", color: "#7B8FA1" },
  { words: ["salud", "medico", "médic", "farmacia", "remedio", "obra social", "prepaga", "osde", "swiss"], emoji: "💊", color: "#B08080" },
  { words: ["educacion", "educación", "colegio", "escuela", "curso", "universidad", "facultad", "estudio"], emoji: "🎓", color: "#5B7BA8" },
  { words: ["viaje", "vuelo", "avion", "avión", "hotel", "vacacion", "vacación", "turismo"], emoji: "✈️", color: "#9B7EC8" },
  { words: ["gym", "gimnasio", "deporte", "fitness", "entrenamiento"], emoji: "💪", color: "#9D8189" },
  { words: ["cine", "pelicula", "película", "netflix", "disney", "hbo", "streaming", "suscrip"], emoji: "🎬", color: "#9B7EC8" },
  { words: ["spotify", "musica", "música", "youtube"], emoji: "🎵", color: "#9B7EC8" },
  { words: ["ropa", "indumentaria", "vestiment", "zapatilla", "calzado"], emoji: "👔", color: "#B08080" },
  { words: ["mascota", "perro", "gato", "veterinaria", "vet"], emoji: "🐾", color: "#C4956A" },
  { words: ["peluqueria", "peluquería", "barberia", "barbería", "belleza", "estetica", "estética"], emoji: "💈", color: "#B08080" },
  { words: ["juego", "gaming", "playstation", "xbox", "steam"], emoji: "🎮", color: "#9B7EC8" },
  { words: ["libro", "libreria", "librería", "lectura"], emoji: "📚", color: "#5B7BA8" },
  { words: ["limpieza", "limpiez"], emoji: "🧹", color: "#7B9E87" },
  { words: ["transporte", "sube", "colectivo", "tren", "subte", "uber", "taxi", "cabify"], emoji: "🚆", color: "#7B8FA1" },
  { words: ["vino", "trago", "bebida", "alcohol", "cerveza"], emoji: "🍷", color: "#C4956A" },
  { words: ["regalo", "cumple", "cumpleaños", "navidad"], emoji: "🎁", color: "#B08080" },
  { words: ["ahorro", "inversion", "inversión", "plata", "dinero", "banco"], emoji: "💰", color: "#C4A24D" },
]

function matchEmojiFromName(name: string): { emoji: string; color: string } | null {
  const n = name.toLowerCase().trim()
  if (!n) return null
  for (const entry of EMOJI_KEYWORDS) {
    if (entry.words.some((w) => n.includes(w))) return { emoji: entry.emoji, color: entry.color }
  }
  return null
}

interface Props {
  mode: "create" | "edit"
  initialData?: { id: string; name: string; color: string | null; icon: string | null; defaultAssignments?: DefaultAssignment[] | null }
  organizationId?: string
  spaceName?: string
  returnTo?: string
  members?: Member[]
  currentUserId?: string
}

export function CategoryFormV2({ mode, initialData, organizationId, spaceName, returnTo, members = [], currentUserId }: Props) {
  const { push, replace, refresh } = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialData?.name || "")
  const [color, setColor] = useState(initialData?.color || "#9D8189")

  // Default assignments: null = no preference, or array of { userId, percentage }
  const [defaultAssignments, setDefaultAssignments] = useState<DefaultAssignment[] | null>(
    initialData?.defaultAssignments ?? null
  )
  const isShared = members.length > 1

  function setDefaultFor(userId: string) {
    setDefaultAssignments([{ userId, percentage: 100 }])
  }
  function setDefaultEqual() {
    const share = Math.floor(100 / members.length)
    const rem = 100 - share * members.length
    setDefaultAssignments(members.map((m, i) => ({ userId: m.id, percentage: i === 0 ? share + rem : share })))
  }
  function clearDefault() { setDefaultAssignments(null) }

  function isDefaultFor(userId: string) {
    return defaultAssignments?.length === 1 && defaultAssignments[0].userId === userId && defaultAssignments[0].percentage === 100
  }
  function isDefaultEqual() {
    if (!defaultAssignments || defaultAssignments.length !== members.length) return false
    const share = Math.round(100 / members.length)
    return defaultAssignments.every(a => Math.abs(a.percentage - share) <= 1)
  }

  // Emoji state: which preset is selected, or custom text
  const initialIsPreset = !!initialData?.icon && ALL_EMOJIS.some(e => e.emoji === initialData.icon)
  const [selectedEmoji, setSelectedEmoji] = useState(initialIsPreset ? initialData!.icon! : "")
  const [customMode, setCustomMode] = useState(!!initialData?.icon && !initialIsPreset)
  const [customEmoji, setCustomEmoji] = useState(!initialIsPreset ? initialData?.icon || "" : "")
  // Once the user picks an icon/color manually, stop auto-suggesting from the name.
  const [emojiTouched, setEmojiTouched] = useState(mode === "edit" && !!initialData?.icon)
  const [colorTouched, setColorTouched] = useState(mode === "edit" && !!initialData?.color)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Auto-suggest emoji + color from the typed name (until the user picks manually)
  useEffect(() => {
    if (emojiTouched) return
    const m = matchEmojiFromName(name)
    setSelectedEmoji(m?.emoji ?? "")
    setCustomMode(false)
    setCustomEmoji("")
    if (m && !colorTouched) setColor(m.color)
  }, [name, emojiTouched, colorTouched])

  function pickEmoji(e: string, c: string) {
    setEmojiTouched(true)
    setColorTouched(true)
    setSelectedEmoji(e)
    setColor(c)
    setCustomMode(false)
    setCustomEmoji("")
  }

  // Picked from the in-app emoji sheet → treat as a custom icon
  function handleCustomEmoji(e: string) {
    setEmojiTouched(true)
    setSelectedEmoji("")
    setCustomMode(true)
    setCustomEmoji(e)
  }

  const displayEmoji = customMode ? customEmoji : selectedEmoji

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
        body: JSON.stringify({ name: name.trim(), color, icon: finalEmoji, isCreditCard: false, organizationId: organizationId || undefined, defaultAssignments: defaultAssignments ?? null }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar") }
      const dest = returnTo || (organizationId ? `/categories?spaceId=${organizationId}` : "/categories")
      replace(dest); refresh()
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
      }
    } finally { setIsLoading(false) }
  }

  const backPath = returnTo || (organizationId ? `/categories?spaceId=${organizationId}` : "/categories")

  // Shared modern field style — soft filled, rounded, subtle focus ring
  const fieldClass =
    "w-full rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5 text-sm transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => replace(backPath)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
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

          {/* Preview — hero */}
          <div className="pt-1 pb-2 flex flex-col items-center gap-3">
            <div className="size-20 rounded-3xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: `${color}22` }}>
              {displayEmoji
                ? <span className="text-4xl leading-none">{displayEmoji}</span>
                : <span className="size-7 rounded-full" style={{ backgroundColor: color }} />
              }
            </div>
            <div className="flex items-center gap-2 max-w-full px-4">
              {displayEmoji && <span className="text-xl leading-none">{displayEmoji}</span>}
              <p className="text-xl font-semibold truncate" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                {name || "Nombre de la categoría"}
              </p>
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className={labelClass}>Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="ej. Alquiler, Netflix, Gimnasio…"
              className={fieldClass} />
          </div>

          {/* Ícono */}
          <div className="space-y-2">
            <label className={labelClass}>Ícono <span className="normal-case font-normal">(opcional · se sugiere solo)</span></label>

            {/* Fixed-size tiles so they don't stretch on wide screens */}
            <div className="flex flex-wrap gap-2">
              {EMOJI_BASICS.map((p) => {
                const selected = !customMode && selectedEmoji === p.emoji
                return (
                  <button key={p.emoji} type="button" onClick={() => pickEmoji(p.emoji, p.color)}
                    className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90
                      ${selected ? "ring-2 ring-primary bg-primary/10" : "bg-muted/40 hover:bg-muted/70"}`}>
                    {p.emoji}
                  </button>
                )
              })}

              {/* Open the in-app emoji picker — shows the chosen custom emoji here */}
              <button type="button" onClick={() => setPickerOpen(true)}
                className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center transition-all active:scale-90
                  ${customMode && customEmoji ? "ring-2 ring-primary bg-primary/10" : "bg-muted/40 hover:bg-muted/70"}`}>
                {customMode && customEmoji
                  ? <span className="text-2xl leading-none">{customEmoji}</span>
                  : <Plus className="size-5 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Tocá <span className="font-medium">+</span> para elegir cualquier emoji.</p>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</label>
            <ColorInputWithPicker value={color} onChange={setColor} />
          </div>

          {/* Default assignments — only for shared spaces */}
          {isShared && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">¿Quién paga por defecto?</label>
                <p className="text-xs text-muted-foreground mt-0.5">Se pre-seleccionará al crear un gasto en esta categoría.</p>
              </div>
              <div className="grid gap-2">
                {/* No preference */}
                <button type="button" onClick={clearDefault}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${!defaultAssignments ? "border-primary bg-primary/5 font-medium" : "border-border/40 hover:border-muted-foreground/40"}`}>
                  <span>Sin preferencia</span>
                  {!defaultAssignments && <Check className="size-4 text-primary" />}
                </button>
                {/* Equal split */}
                <button type="button" onClick={setDefaultEqual}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${isDefaultEqual() ? "border-primary bg-primary/5 font-medium" : "border-border/40 hover:border-muted-foreground/40"}`}>
                  <span>Partes iguales</span>
                  {isDefaultEqual() && <Check className="size-4 text-primary" />}
                </button>
                {/* Per member */}
                {members.map(m => (
                  <button key={m.id} type="button" onClick={() => setDefaultFor(m.id)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-sm transition-all ${isDefaultFor(m.id) ? "border-primary bg-primary/5 font-medium" : "border-border/40 hover:border-muted-foreground/40"}`}>
                    <span>
                      {m.name || m.email || "Usuario"}
                      {m.id === currentUserId && <span className="text-muted-foreground font-normal ml-1">(yo)</span>}
                    </span>
                    {isDefaultFor(m.id) && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-app emoji picker */}
      <EmojiPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleCustomEmoji} />
    </form>
  )
}
