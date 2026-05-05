import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic, MODEL } from "@/lib/anthropic"

export const maxDuration = 60

export interface ParsedTransaction {
  id: string               // temporal, para el frontend
  fecha: string            // "YYYY-MM-DD"
  descripcionRaw: string   // tal como aparece en el resumen
  descripcion: string      // nombre limpio normalizado por Claude
  montoARS: number | null
  montoUSD: number | null
  tipo: "compra" | "cuota" | "debito_automatico" | "devolucion"
  titular: string          // nombre completo del titular en el resumen
  cuotaActual: number | null
  cuotaTotal: number | null
  categoriasugerida: string | null
  incluir: boolean         // default: true (excepto ignorados)
  nota: string | null      // aviso especial (ej: "posible duplicado", "reconstruye 6 cuotas")
}

export interface ResumenParseResult {
  titulares: string[]          // ej: ["MARCOS SANTIAGO FACUNDO", "LUNA SOFIA"]
  periodoDesde: string | null  // "YYYY-MM-DD"
  periodoHasta: string | null  // "YYYY-MM-DD" (fecha de cierre)
  transacciones: ParsedTransaction[]
}

const PARSE_PROMPT = `Sos un asistente especializado en parsear resúmenes de tarjeta de crédito argentinos.
Vas a recibir el texto de un resumen de cuenta de tarjeta de crédito ICBC Mastercard (u otro banco argentino).

Tu tarea es extraer TODAS las transacciones del detalle del mes y devolver un JSON estructurado.

INSTRUCCIONES DE EXTRACCIÓN:

1. INCLUIR estas transacciones:
   - "Compras del Mes" (ARS y/o USD)
   - "Débitos Automáticos"
   - "Cuotas del Mes" (SOLO las de cuota 1/N — las demás son seguimiento de cuotas ya registradas)

2. IGNORAR completamente (no incluirlas en el array):
   - SU PAGO / PAGO RECIBIDO
   - SALDO ANTERIOR
   - SALDO PENDIENTE
   - SUBTOTAL
   - Percepciones fiscales (PERCEPCION IVA, PERCEP AFIP, PERC IIBB, RG 4815, etc.)
   - Devoluciones de percepciones (DEV PER, DEV PERC)
   - Intereses y financiación
   - Cualquier línea que sea un ajuste contable o impuesto del banco

3. DEVOLUCIONES de compras (Refund, Devolución con monto negativo):
   - SÍ incluirlas
   - tipo: "devolucion"
   - incluir: true (restan al balance, el usuario puede desactivarlas)
   - el monto va como positivo en el campo correspondiente (el sistema lo convierte a negativo)

4. CUOTAS DEL MES:
   - Si el formato es "01/N" (primera cuota): incluir, tipo "cuota", cuotaActual: 1, cuotaTotal: N
   - Si el formato es "02/N" o mayor: incluir con incluir: false y nota: "Cuota X/Y - ya debería estar registrada"
   - El monto en el resumen es el de UNA cuota, no el total

5. NORMALIZACIÓN DE NOMBRES:
   - "MERPAGO*BIDCOM" → "Bidcom"
   - "PAYU*AR*UBER" → "Uber"
   - "DLO*PEDIDOSYA BURG" → "PedidosYa Burger"
   - "DLO*PRIMEVIDEO" → "Prime Video"
   - "APPLE.COM/BILL" → "Apple"
   - "CLAUDE.AI SUBSCR" → "Claude AI"
   - "SOUNDIIZ PREMIUM" → "Soundiiz"
   - "SWISS MEDICAL PREPAGO" → "Swiss Medical"
   - Eliminar prefijos MERPAGO*, DLO*, PAYU*AR*, etc.
   - Mantener el nombre del comercio reconocible

6. CATEGORÍAS SUGERIDAS (sugerir solo una de estas según el comercio):
   "Comida", "Transporte", "Salud", "Tecnología", "Entretenimiento", "Ropa", "Hogar", "Viajes", "Supermercado", "Educación", "Servicios", "Otros"

7. FECHAS: convertir DD-MMM-YY a YYYY-MM-DD
   - Los meses en español: Ene=01, Feb=02, Mar=03, Abr=04, May=05, Jun=06, Jul=07, Ago=08, Sep=09, Oct=10, Nov=11, Dic=12
   - El año: si dice "26" → "2026", "25" → "2025", etc.

8. MONTOS:
   - Usar punto como separador decimal en el JSON (43449,00 → 43449.00)
   - Si la transacción está en la columna PESOS: montoARS = valor, montoUSD = null
   - Si está solo en la columna DÓLARES: montoARS = null, montoUSD = valor
   - Si tiene ambas: llenar ambas

9. TITULARES: detectar todos los titulares (TOTAL TITULAR X, TOTAL ADICIONAL Y) y asignar cada transacción al titular que aparece antes de ella en el documento.

DEVUELVE SOLO JSON VÁLIDO, sin markdown, sin explicaciones. Formato:
{
  "titulares": ["NOMBRE TITULAR", "NOMBRE ADICIONAL"],
  "periodoDesde": "YYYY-MM-DD o null",
  "periodoHasta": "YYYY-MM-DD o null",
  "transacciones": [
    {
      "fecha": "YYYY-MM-DD",
      "descripcionRaw": "texto original del resumen",
      "descripcion": "nombre limpio",
      "montoARS": 43449.00,
      "montoUSD": null,
      "tipo": "compra",
      "titular": "NOMBRE COMPLETO",
      "cuotaActual": null,
      "cuotaTotal": null,
      "categoriaSugerida": "Tecnología",
      "incluir": true,
      "nota": null
    }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get("pdf") as File | null
    if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 })
    if (file.type !== "application/pdf") return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 })

    const maxSizeMB = 10
    if (file.size > maxSizeMB * 1024 * 1024)
      return NextResponse.json({ error: `El PDF no puede superar ${maxSizeMB}MB` }, { status: 400 })

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: PARSE_PROMPT,
            },
          ],
        },
      ],
    })

    const rawText = response.content[0].type === "text" ? response.content[0].text : ""

    // Parse JSON — Claude might wrap it in code blocks despite instructions
    let parsed: ResumenParseResult
    try {
      const cleaned = rawText.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error("Claude response could not be parsed as JSON:", rawText.slice(0, 500))
      return NextResponse.json({ error: "No se pudo interpretar el resumen. Verificá que el PDF sea un resumen de tarjeta." }, { status: 422 })
    }

    // Add temporal IDs for frontend keying
    parsed.transacciones = parsed.transacciones.map((t, i) => ({
      ...t,
      id: `tx-${i}`,
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("Error parsing resumen:", error)
    return NextResponse.json({ error: "Error al procesar el PDF" }, { status: 500 })
  }
}
