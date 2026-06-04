"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Check } from "lucide-react"
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

// Fallback icon when the name doesn't match any keyword — keeps the icon mandatory
// without the user ever having to pick one manually.
const DEFAULT_EMOJI = "🏷️"

// Soft pastel palette, on-brand. The category color is derived from the emoji
// (deterministic) so the user never picks one — always pastel, lots of variety.
const PASTEL_PALETTE = [
  "#F4ACB7", "#FFCAD4", "#FFB7B2", "#FAD2E1", "#FFE5D9", "#FFD6A5",
  "#FBD49C", "#FCE1A8", "#FFF1B6", "#D0E8C5", "#C9E4CA", "#B5EAD7",
  "#B8E0D2", "#A8DADC", "#BEE1E6", "#BBD0E5", "#C7CEEA", "#CDDAFD",
  "#DAE2F2", "#E0C3FC", "#E8DFF5", "#D6CDEA", "#D8E2DC", "#E8D7DB",
]

function pastelForEmoji(emoji: string): string {
  if (!emoji) return "#D8E2DC"
  let h = 0
  for (const ch of emoji) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return PASTEL_PALETTE[h % PASTEL_PALETTE.length]
}

// Keyword → emoji/color, used to auto-suggest an icon from the category name.
// Keywords are single words (no spaces), accent-insensitive. Order matters:
// first match wins, so put more specific groups before generic ones.
const EMOJI_KEYWORDS: { words: string[]; emoji: string; color: string }[] = [
  // Vehículo / transporte propio
  { words: ["auto", "autos", "vehiculo", "vehiculos", "rodado", "rodados", "movilidad", "coche", "camioneta", "moto", "nafta", "combustible", "gasolina", "gnc", "ypf", "axion", "shell", "puma", "cochera", "garage", "garaje", "estacionamiento", "peaje", "patente", "vtv", "gomeria", "lavadero", "taller", "mecanico", "repuesto", "repuestos", "neumatico", "cubierta", "cubiertas"], emoji: "🚗", color: "#7B8FA1" },
  // Transporte público / apps
  { words: ["transporte", "sube", "colectivo", "bondi", "tren", "subte", "metro", "ferrocarril", "uber", "taxi", "remis", "cabify", "didi", "pasaje", "boleto", "viaticos"], emoji: "🚆", color: "#7B8FA1" },
  // Seguros
  { words: ["seguro", "seguros", "poliza", "polizas", "aseguradora", "art"], emoji: "🛡️", color: "#5B7BA8" },
  // Súper / mercado
  { words: ["super", "supermercado", "supermercados", "mercado", "almacen", "almacenes", "autoservicio", "mayorista", "coto", "carrefour", "jumbo", "vea", "chino", "despensa", "dietetica", "compras", "mandados", "viveres", "provista"], emoji: "🛒", color: "#7B9E87" },
  // Verdulería / frutas
  { words: ["verduleria", "verdura", "verduras", "fruta", "frutas", "fruteria", "granja", "huerta"], emoji: "🥦", color: "#7B9E87" },
  // Carnicería
  { words: ["carniceria", "carne", "carnes", "pollo", "pollos", "pescaderia", "pescado"], emoji: "🥩", color: "#C4956A" },
  // Fiambrería
  { words: ["fiambreria", "fiambre", "fiambres"], emoji: "🧀", color: "#C4A24D" },
  // Panadería
  { words: ["panaderia", "pan", "factura", "facturas", "medialuna", "medialunas", "reposteria"], emoji: "🥖", color: "#C4956A" },
  // Kiosco / golosinas
  { words: ["kiosco", "kiosko", "maxikiosco", "golosina", "golosinas", "caramelo", "chocolate", "snack", "snacks"], emoji: "🍬", color: "#C4956A" },
  // Comida / delivery / resto
  { words: ["comida", "comidas", "vianda", "viandas", "almuerzo", "cena", "delivery", "pedido", "pedidos", "rappi", "pedidosya", "mcdonalds", "burger", "hamburguesa", "restaurante", "resto", "fastfood"], emoji: "🍔", color: "#C4956A" },
  { words: ["pizza", "pizzeria", "empanada", "empanadas"], emoji: "🍕", color: "#C4956A" },
  { words: ["sushi", "japonesa"], emoji: "🍣", color: "#B08080" },
  { words: ["helado", "heladeria", "postre", "postres", "torta", "tortas"], emoji: "🍰", color: "#C4956A" },
  // Café / desayuno
  { words: ["cafe", "cafeteria", "desayuno", "merienda", "starbucks"], emoji: "☕", color: "#C4956A" },
  { words: ["mate", "yerba"], emoji: "🧉", color: "#7B9E87" },
  // Bebidas / salidas nocturnas
  { words: ["vino", "vinos", "vinoteca", "trago", "tragos", "bebida", "bebidas", "alcohol", "fernet", "birra", "cerveza", "cervezas", "previa", "boliche", "joda", "bar"], emoji: "🍷", color: "#C4956A" },
  // Alquiler / vivienda
  { words: ["alquiler", "renta", "expensas", "hogar", "casa", "vivienda", "depto", "departamento", "inmobiliaria", "garantia", "abl"], emoji: "🏠", color: "#9D8189" },
  // Muebles / deco
  { words: ["mueble", "muebles", "deco", "decoracion", "sillon", "colchon", "easy", "sodimac"], emoji: "🛋️", color: "#9D8189" },
  // Ferretería / arreglos / oficios
  { words: ["ferreteria", "herramienta", "herramientas", "arreglo", "arreglos", "refaccion", "refacciones", "plomero", "plomeria", "electricista", "gasista", "albañil", "pintura", "pintor", "mantenimiento", "obra"], emoji: "🔧", color: "#7B8FA1" },
  // Limpieza
  { words: ["limpieza", "limpiar", "lavandina", "detergente", "escoba", "mucama", "empleada", "articulos"], emoji: "🧹", color: "#7B9E87" },
  // Lavandería
  { words: ["lavanderia", "tintoreria"], emoji: "🧺", color: "#7B8FA1" },
  // Luz
  { words: ["luz", "electricidad", "edenor", "edesur", "epec", "edelap"], emoji: "⚡", color: "#C4A24D" },
  // Gas
  { words: ["gas", "garrafa", "metrogas", "naturgy", "camuzzi"], emoji: "🔥", color: "#C4956A" },
  // Agua
  { words: ["agua", "aysa", "absa", "aguas"], emoji: "💧", color: "#5B7BA8" },
  // Internet / cable / TV
  { words: ["internet", "wifi", "fibertel", "telecentro", "flow", "cable", "directv", "tv", "television", "telefonia"], emoji: "📡", color: "#7B8FA1" },
  // Celular / teléfono
  { words: ["celular", "celu", "telefono", "movil", "claro", "movistar", "personal", "tuenti", "recarga"], emoji: "📱", color: "#7B8FA1" },
  // Tecnología / electrónica / suscripciones digitales
  { words: ["tecnologia", "electronica", "compu", "computadora", "notebook", "pc", "gadget", "monitor", "teclado", "software", "hosting", "dominio", "nube", "icloud"], emoji: "💻", color: "#5B7BA8" },
  // Psicología
  { words: ["psicologo", "psicologa", "psicologia", "terapia", "psiquiatra"], emoji: "🧠", color: "#B08080" },
  // Dentista
  { words: ["dentista", "odontologo", "odontologia", "ortodoncia", "muela"], emoji: "🦷", color: "#5B7BA8" },
  // Salud / farmacia
  { words: ["salud", "farmacia", "remedio", "remedios", "medicamento", "medicamentos", "medico", "doctor", "consulta", "clinica", "hospital", "sanatorio", "analisis", "laboratorio", "kinesiologia", "oculista", "oftalmologo", "prepaga", "osde", "galeno", "medife", "ioma", "pami"], emoji: "💊", color: "#B08080" },
  // Educación
  { words: ["educacion", "colegio", "escuela", "matricula", "universidad", "facultad", "instituto", "curso", "cursos", "capacitacion", "posgrado", "maestria", "ingles", "idiomas", "apuntes", "fotocopias", "utiles"], emoji: "🎓", color: "#5B7BA8" },
  // Niños / bebé
  { words: ["bebe", "bebes", "niño", "niños", "hijo", "hijos", "pañal", "pañales", "jardin", "guarderia", "juguete", "juguetes", "jugueteria"], emoji: "🧸", color: "#C4956A" },
  // Viajes
  { words: ["viaje", "viajes", "vacaciones", "turismo", "vuelo", "vuelos", "pasajes", "aerolineas", "hotel", "hospedaje", "hosteria", "airbnb", "excursion", "europa", "brasil", "exterior"], emoji: "✈️", color: "#9B7EC8" },
  { words: ["playa", "costa", "mar"], emoji: "🏖️", color: "#9B7EC8" },
  // Ropa / indumentaria
  { words: ["ropa", "indumentaria", "vestimenta", "remera", "pantalon", "jean", "campera", "abrigo", "buzo", "vestido", "calzado", "zapatilla", "zapatillas", "zapato", "zapatos", "zapateria", "cartera", "accesorios", "lenceria", "medias"], emoji: "👕", color: "#B08080" },
  // Peluquería / belleza
  { words: ["peluqueria", "peluquero", "barberia", "barber", "corte", "belleza", "estetica", "cosmetica", "maquillaje", "manicura", "pedicura", "depilacion", "uñas", "spa", "perfumeria", "perfume"], emoji: "💈", color: "#B08080" },
  // Mascotas
  { words: ["mascota", "mascotas", "perro", "perros", "gato", "gatos", "veterinaria", "veterinario", "vet", "balanceado", "petshop", "pet"], emoji: "🐶", color: "#C4956A" },
  // Gaming
  { words: ["juego", "juegos", "gaming", "gamer", "playstation", "xbox", "nintendo", "steam", "consola", "videojuego", "videojuegos"], emoji: "🎮", color: "#9B7EC8" },
  // Cine / streaming
  { words: ["cine", "pelicula", "peliculas", "netflix", "disney", "hbo", "max", "star", "paramount", "prime", "streaming", "entretenimiento"], emoji: "🎬", color: "#9B7EC8" },
  // Música
  { words: ["musica", "spotify", "deezer", "tidal", "youtube"], emoji: "🎵", color: "#9B7EC8" },
  // Entradas / eventos
  { words: ["entrada", "entradas", "evento", "eventos", "ticket", "show", "teatro", "recital", "recitales", "concierto"], emoji: "🎟️", color: "#9B7EC8" },
  // Deporte / gym
  { words: ["gym", "gimnasio", "fitness", "entrenamiento", "deporte", "deportes", "padel", "paddle", "futbol", "tenis", "natacion", "pileta", "running", "crossfit", "pilates", "yoga", "cancha", "club"], emoji: "💪", color: "#9D8189" },
  // Arte / hobbies
  { words: ["arte", "dibujo", "manualidades", "hobby", "hobbies"], emoji: "🎨", color: "#9B7EC8" },
  // Libros
  { words: ["libro", "libros", "libreria", "lectura", "kindle"], emoji: "📚", color: "#5B7BA8" },
  // Cigarrillos
  { words: ["cigarrillo", "cigarrillos", "tabaco", "fumar", "vape", "marlboro"], emoji: "🚬", color: "#9D8189" },
  // Regalos
  { words: ["regalo", "regalos", "cumple", "cumpleaños", "navidad", "presente"], emoji: "🎁", color: "#B08080" },
  // Fiesta / eventos sociales
  { words: ["fiesta", "festejo", "casamiento", "boda", "despedida"], emoji: "🎉", color: "#9B7EC8" },
  // Donaciones / iglesia
  { words: ["donacion", "donaciones", "caridad", "iglesia", "diezmo", "ong"], emoji: "❤️", color: "#B08080" },
  // Impuestos
  { words: ["impuesto", "impuestos", "afip", "monotributo", "arba", "rentas", "municipal", "inmobiliario", "tasa", "tasas", "ganancias", "sellos", "multa", "multas"], emoji: "🏛️", color: "#9D8189" },
  // Banco / finanzas
  { words: ["banco", "comision", "comisiones", "prestamo", "prestamos", "interes", "intereses", "tarjeta", "resumen", "mercadopago", "uala", "brubank", "transferencia"], emoji: "🏦", color: "#7B8FA1" },
  // Ahorro / inversión
  { words: ["ahorro", "ahorros", "inversion", "inversiones", "dolar", "dolares", "cripto", "bitcoin", "acciones", "fci", "plazo"], emoji: "💰", color: "#C4A24D" },
  // Sueldo / ingresos
  { words: ["sueldo", "salario", "ingreso", "ingresos", "honorarios", "freelance", "aguinaldo"], emoji: "💵", color: "#7B9E87" },
]

// Accent/diacritic-insensitive lowercase
function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

// Whole-word match: exact for short keywords; prefix-tolerant (plurals, etc.)
// for keywords/tokens of length >= 4. Avoids substring false positives like
// "europa"⊃"ropa" or "entrenamiento"⊃"tren".
function tokenMatches(token: string, keyword: string): boolean {
  if (token === keyword) return true
  if (Math.min(token.length, keyword.length) < 4) return false
  return token.startsWith(keyword) || keyword.startsWith(token)
}

function matchEmojiFromName(name: string): { emoji: string; color: string } | null {
  const n = normalizeText(name).trim()
  if (!n) return null
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.length === 0) return null
  for (const entry of EMOJI_KEYWORDS) {
    for (const w of entry.words) {
      const wn = normalizeText(w)
      if (tokens.some((t) => tokenMatches(t, wn))) {
        return { emoji: entry.emoji, color: entry.color }
      }
    }
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
  // Once the user picks an icon manually, stop auto-suggesting from the name.
  const [emojiTouched, setEmojiTouched] = useState(mode === "edit" && !!initialData?.icon)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Auto-suggest emoji from the typed name (until the user picks manually).
  // Empty name → no emoji. Non-empty with no keyword match → default icon.
  // Color is always derived from the emoji (pastel, on-brand).
  useEffect(() => {
    if (emojiTouched) return
    setCustomMode(false)
    setCustomEmoji("")
    if (!name.trim()) { setSelectedEmoji(""); return }
    const m = matchEmojiFromName(name)
    const emoji = m?.emoji ?? DEFAULT_EMOJI
    setSelectedEmoji(emoji)
    setColor(pastelForEmoji(emoji))
  }, [name, emojiTouched])

  function pickEmoji(e: string) {
    setEmojiTouched(true)
    setSelectedEmoji(e)
    setColor(pastelForEmoji(e))
    setCustomMode(false)
    setCustomEmoji("")
  }

  // Picked from the in-app emoji sheet → treat as a custom icon
  function handleCustomEmoji(e: string) {
    setEmojiTouched(true)
    setSelectedEmoji("")
    setCustomMode(true)
    setCustomEmoji(e)
    setColor(pastelForEmoji(e))
  }

  const displayEmoji = customMode ? customEmoji : selectedEmoji

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    const finalEmoji = customMode ? customEmoji.trim() : selectedEmoji
    if (!finalEmoji) { setError("Elegí un ícono"); return }
    setError(null); setIsLoading(true)
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button type="button" onClick={() => replace(backPath)}
          className="justify-self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="justify-self-center text-base font-semibold whitespace-nowrap">
          {mode === "create" ? "Nueva categoría" : "Editar categoría"}
        </h1>
        <button type="submit" disabled={isLoading || !name.trim()}
          className="justify-self-end px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all">
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
              <p className={`text-xl font-semibold truncate ${name ? "" : "text-muted-foreground/50"}`} style={{ fontFamily: "var(--font-fraunces, serif)" }}>
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
            <label className={labelClass}>Ícono <span className="normal-case font-normal">(se elige solo · podés cambiarlo)</span></label>

            {/* Fixed-size tiles so they don't stretch on wide screens */}
            <div className="flex flex-wrap gap-2">
              {EMOJI_BASICS.map((p) => {
                const selected = !customMode && selectedEmoji === p.emoji
                return (
                  <button key={p.emoji} type="button" onClick={() => pickEmoji(p.emoji)}
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
