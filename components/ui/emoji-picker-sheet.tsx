"use client"
import { useMemo, useState } from "react"
import { X, Search } from "lucide-react"

/**
 * In-app emoji picker as a bottom sheet. No external dependency — a curated,
 * searchable set that covers what expense categories need (and then some).
 * Same sheet pattern used elsewhere (category picker in the bill form).
 */

interface EmojiGroup {
  label: string
  emojis: { e: string; k: string }[] // k = space-separated search keywords (es)
}

const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: "Dinero",
    emojis: [
      { e: "💰", k: "dinero plata ahorro bolsa" },
      { e: "💵", k: "dinero billete efectivo plata dolar" },
      { e: "💳", k: "tarjeta credito debito pago" },
      { e: "🪙", k: "moneda cambio plata" },
      { e: "🏦", k: "banco" },
      { e: "💸", k: "gasto plata vuela dinero" },
      { e: "🧾", k: "factura recibo ticket comprobante" },
      { e: "📈", k: "inversion suba grafico" },
      { e: "📉", k: "baja perdida grafico" },
      { e: "🤑", k: "plata dinero rico" },
    ],
  },
  {
    label: "Hogar",
    emojis: [
      { e: "🏠", k: "casa hogar alquiler" },
      { e: "🏡", k: "casa hogar jardin" },
      { e: "🛋️", k: "sillon living muebles" },
      { e: "🛏️", k: "cama dormitorio muebles" },
      { e: "🚪", k: "puerta" },
      { e: "🔑", k: "llave alquiler" },
      { e: "🧹", k: "limpieza escoba" },
      { e: "🧺", k: "lavanderia ropa canasto" },
      { e: "🧻", k: "papel limpieza bano" },
      { e: "🚿", k: "ducha agua bano" },
      { e: "🛁", k: "bañera bano" },
      { e: "🚽", k: "inodoro bano" },
      { e: "💡", k: "luz electricidad foco" },
      { e: "🔌", k: "enchufe electricidad" },
      { e: "🪴", k: "planta hogar deco" },
      { e: "🧯", k: "matafuego seguridad" },
    ],
  },
  {
    label: "Comida",
    emojis: [
      { e: "🛒", k: "super supermercado compras mercado carrito" },
      { e: "🍔", k: "comida hamburguesa fast food" },
      { e: "🍕", k: "pizza comida" },
      { e: "🌮", k: "taco comida mexicana" },
      { e: "🥪", k: "sandwich comida" },
      { e: "🥗", k: "ensalada comida sano" },
      { e: "🍣", k: "sushi comida japonesa" },
      { e: "🍜", k: "ramen fideos comida" },
      { e: "🍝", k: "pasta fideos comida" },
      { e: "🥘", k: "comida guiso olla" },
      { e: "🍳", k: "huevo desayuno comida" },
      { e: "🥐", k: "factura medialuna panaderia" },
      { e: "🥖", k: "pan panaderia" },
      { e: "🧀", k: "queso" },
      { e: "🥩", k: "carne carniceria asado" },
      { e: "🍗", k: "pollo comida" },
      { e: "🍰", k: "torta postre" },
      { e: "🍦", k: "helado postre" },
      { e: "🍪", k: "galletita postre" },
      { e: "☕", k: "cafe desayuno bar" },
      { e: "🧉", k: "mate" },
      { e: "🍷", k: "vino trago bebida alcohol" },
      { e: "🍺", k: "cerveza birra trago bebida" },
      { e: "🥤", k: "gaseosa bebida" },
      { e: "🍎", k: "fruta manzana verduleria" },
      { e: "🥑", k: "palta verduleria fruta" },
      { e: "🥦", k: "verdura brocoli verduleria" },
    ],
  },
  {
    label: "Transporte",
    emojis: [
      { e: "🚗", k: "auto coche vehiculo nafta" },
      { e: "🚙", k: "auto camioneta suv" },
      { e: "🚕", k: "taxi" },
      { e: "🏍️", k: "moto" },
      { e: "🛵", k: "moto scooter" },
      { e: "🚲", k: "bici bicicleta" },
      { e: "🛴", k: "monopatin" },
      { e: "🚆", k: "tren transporte" },
      { e: "🚇", k: "subte metro transporte" },
      { e: "🚌", k: "colectivo bondi bus transporte" },
      { e: "✈️", k: "avion vuelo viaje" },
      { e: "🚀", k: "cohete" },
      { e: "⛽", k: "nafta combustible estacion" },
      { e: "🅿️", k: "estacionamiento cochera parking" },
      { e: "🛣️", k: "ruta peaje camino" },
      { e: "🚦", k: "semaforo transito" },
    ],
  },
  {
    label: "Salud",
    emojis: [
      { e: "💊", k: "remedio pastilla farmacia salud medicamento" },
      { e: "💉", k: "vacuna inyeccion salud" },
      { e: "🩺", k: "medico doctor salud consulta" },
      { e: "🏥", k: "hospital clinica salud" },
      { e: "🩹", k: "curita herida salud" },
      { e: "🦷", k: "diente dentista odontologo" },
      { e: "🧠", k: "psicologo terapia mente" },
      { e: "🧴", k: "crema higiene farmacia" },
    ],
  },
  {
    label: "Educación y trabajo",
    emojis: [
      { e: "🎓", k: "educacion universidad facultad estudio colegio" },
      { e: "📚", k: "libros estudio educacion" },
      { e: "📖", k: "libro lectura estudio" },
      { e: "✏️", k: "lapiz utiles escuela" },
      { e: "💼", k: "trabajo oficina maletin" },
      { e: "🏢", k: "oficina trabajo edificio" },
      { e: "💻", k: "computadora notebook trabajo" },
      { e: "🖥️", k: "computadora monitor pc" },
      { e: "📱", k: "celular telefono movil" },
      { e: "📞", k: "telefono llamada" },
      { e: "🖨️", k: "impresora oficina" },
    ],
  },
  {
    label: "Ocio",
    emojis: [
      { e: "🎬", k: "cine pelicula streaming netflix" },
      { e: "🍿", k: "pochoclo cine" },
      { e: "📺", k: "tv television streaming" },
      { e: "🎮", k: "juego gaming consola play" },
      { e: "🎵", k: "musica spotify cancion" },
      { e: "🎧", k: "auriculares musica" },
      { e: "🎤", k: "karaoke musica recital" },
      { e: "🎸", k: "guitarra musica" },
      { e: "🎨", k: "arte pintura hobby" },
      { e: "🎭", k: "teatro show" },
      { e: "🎟️", k: "entrada ticket evento" },
      { e: "🎲", k: "juego mesa" },
      { e: "🎯", k: "hobby dardos" },
    ],
  },
  {
    label: "Deporte",
    emojis: [
      { e: "💪", k: "gym gimnasio fuerza entrenamiento" },
      { e: "⚽", k: "futbol pelota deporte" },
      { e: "🏀", k: "basket deporte" },
      { e: "🎾", k: "tenis deporte" },
      { e: "🏐", k: "voley deporte" },
      { e: "🏓", k: "ping pong deporte" },
      { e: "🥊", k: "box boxeo deporte" },
      { e: "🏋️", k: "pesas gym gimnasio" },
      { e: "🚴", k: "ciclismo bici deporte" },
      { e: "🏊", k: "natacion pileta deporte" },
      { e: "🧘", k: "yoga meditacion" },
      { e: "🏃", k: "running correr deporte" },
    ],
  },
  {
    label: "Viajes",
    emojis: [
      { e: "🧳", k: "valija viaje equipaje" },
      { e: "🏖️", k: "playa vacaciones viaje" },
      { e: "🏝️", k: "isla playa vacaciones" },
      { e: "🗺️", k: "mapa viaje" },
      { e: "🧭", k: "brujula viaje" },
      { e: "🏨", k: "hotel viaje hospedaje" },
      { e: "📸", k: "foto camara viaje" },
      { e: "🌍", k: "mundo viaje mundo" },
    ],
  },
  {
    label: "Ropa y belleza",
    emojis: [
      { e: "👕", k: "ropa remera indumentaria" },
      { e: "👔", k: "ropa camisa trabajo" },
      { e: "👗", k: "ropa vestido indumentaria" },
      { e: "👖", k: "ropa jean pantalon" },
      { e: "👟", k: "zapatilla calzado ropa" },
      { e: "👠", k: "zapato calzado" },
      { e: "👜", k: "cartera accesorio" },
      { e: "🧥", k: "campera abrigo ropa" },
      { e: "🧢", k: "gorra ropa" },
      { e: "💈", k: "peluqueria barberia corte" },
      { e: "💄", k: "maquillaje belleza" },
      { e: "💅", k: "uñas manicura belleza" },
    ],
  },
  {
    label: "Mascotas",
    emojis: [
      { e: "🐶", k: "perro mascota" },
      { e: "🐱", k: "gato mascota" },
      { e: "🐾", k: "mascota patitas veterinaria" },
      { e: "🦴", k: "hueso perro mascota" },
      { e: "🐟", k: "pez mascota" },
      { e: "🐦", k: "pajaro mascota" },
    ],
  },
  {
    label: "Servicios",
    emojis: [
      { e: "⚡", k: "luz electricidad energia servicio" },
      { e: "💧", k: "agua servicio" },
      { e: "🔥", k: "gas servicio fuego" },
      { e: "📶", k: "internet señal wifi" },
      { e: "📡", k: "internet antena cable" },
      { e: "🔋", k: "energia bateria" },
      { e: "🧰", k: "herramientas mantenimiento" },
      { e: "🔧", k: "arreglo mantenimiento herramienta" },
      { e: "🔨", k: "arreglo herramienta refaccion" },
    ],
  },
  {
    label: "Símbolos",
    emojis: [
      { e: "⭐", k: "estrella favorito" },
      { e: "❤️", k: "corazon amor rojo" },
      { e: "🧡", k: "corazon naranja" },
      { e: "💛", k: "corazon amarillo" },
      { e: "💚", k: "corazon verde" },
      { e: "💙", k: "corazon azul" },
      { e: "💜", k: "corazon violeta" },
      { e: "✅", k: "check ok hecho" },
      { e: "⚠️", k: "alerta cuidado" },
      { e: "🎁", k: "regalo cumple" },
      { e: "🎉", k: "fiesta celebracion cumple" },
      { e: "🔔", k: "campana aviso recordatorio" },
      { e: "📌", k: "pin importante" },
      { e: "🏷️", k: "etiqueta categoria precio" },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
}

export function EmojiPickerSheet({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const hits: string[] = []
    for (const g of EMOJI_GROUPS) {
      for (const item of g.emojis) {
        if (item.k.includes(q) || g.label.toLowerCase().includes(q)) hits.push(item.e)
      }
    }
    return Array.from(new Set(hits))
  }, [query])

  if (!open) return null

  const pick = (e: string) => {
    onSelect(e)
    setQuery("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background rounded-t-3xl max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold">Elegí un emoji</p>
          <button type="button" onClick={onClose} className="text-muted-foreground active:scale-90 transition-all">
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-4 pb-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3.5 py-2.5 focus-within:bg-background focus-within:border-primary/40 transition-colors">
            <Search className="size-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar (ej. comida, auto, salud…)"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-muted-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">
          {filtered ? (
            filtered.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {filtered.map((e) => (
                  <button key={e} type="button" onClick={() => pick(e)}
                    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-2xl hover:bg-muted/60 active:scale-90 transition-all">
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sin resultados. Probá otra palabra.</p>
            )
          ) : (
            <div className="space-y-4">
              {EMOJI_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{g.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.emojis.map((item) => (
                      <button key={item.e} type="button" onClick={() => pick(item.e)}
                        className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-2xl hover:bg-muted/60 active:scale-90 transition-all">
                        {item.e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
