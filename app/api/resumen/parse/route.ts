import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { anthropic, MODEL } from "@/lib/anthropic"

export const maxDuration = 300

export interface ParsedTransaction {
  id: string               // temporal, para el frontend
  fecha: string            // "YYYY-MM-DD"
  descripcionRaw: string   // tal como aparece en el resumen
  descripcion: string      // nombre limpio normalizado
  montoARS: number | null
  montoUSD: number | null
  tipo: "compra" | "cuota" | "debito_automatico" | "devolucion"
  titular: string          // nombre del titular/tarjeta al que pertenece
  cuotaActual: number | null
  cuotaTotal: number | null
  comprobante: string | null  // ID externo del banco (NRO CUPÓN, COMPROBANTE, VOUCHER, etc.)
  categoriaSugerida: string | null
  incluir: boolean
  nota: string | null
}

export interface ResumenParseResult {
  banco: string | null             // banco detectado (ej: "Santander", "ICBC", "Galicia")
  titulares: string[]              // nombres de titulares/tarjetas detectados
  periodoDesde: string | null      // "YYYY-MM-DD"
  periodoHasta: string | null      // "YYYY-MM-DD" (fecha de cierre)
  transacciones: ParsedTransaction[]
}

const PARSE_PROMPT = `Sos un experto en parsear resúmenes de tarjetas de crédito argentinas de cualquier banco.
Vas a recibir un PDF de resumen de cuenta O un archivo CSV/texto con movimientos exportados desde el banco. Puede ser de cualquier banco: Santander, ICBC, Galicia, HSBC, Supervielle, Patagonia, BBVA, Macro, Naranja X, American Express, u otros.

━━━ FORMATO CSV DE ICBC ━━━

El CSV de ICBC usa asterisco (*) como separador. Formato de cada línea:
  DD/MM/YYYY*DESCRIPCION*COMPROBANTE*IMPORTE_ARS*IMPORTE_USD

• Las líneas "Consumos Tarjeta:NNNN" indican cambio de tarjeta (usar número como titular)
• Las líneas "SU PAGO EN PESOS" / "SU PAGO EN DOLARES" son pagos → ignorar
• Cuotas en descripción: "PASSLINE 03/03" = cuota 3 de 3, "GADNIC 03/06" = cuota 3 de 6
• Importe ARS usa coma decimal (29766,50 → 29766.50); USD usa punto (167.07)
• COMPROBANTE = campo comprobante para deduplicación

Tu tarea es identificar y extraer SOLO las transacciones de tarjeta de crédito (consumos/compras) y devolver JSON estructurado.

━━━ QUÉ EXTRAER ━━━

INCLUIR:
• Compras y consumos del período (en pesos y/o dólares)
• Débitos automáticos en tarjeta de crédito
• Cuota 1/N de compras en cuotas (primera aparición = nueva compra)
• Devoluciones / bonificaciones / reintegros

NO INCLUIR (ignorar completamente):
• Pagos recibidos / abono del resumen anterior
• Saldo anterior / saldo pendiente / subtotales
• Percepciones impositivas (IVA, AFIP, IIBB, SIRCREB, Imp. País, RG 4815, RG 5272, etc.)
• Devoluciones de percepciones (DEV PER, DEV PERC)
• Intereses, financiación, cargos por mora
• Movimientos de cuenta corriente / caja de ahorro / débito
• Transferencias bancarias entre cuentas
• Inversiones (plazos fijos, fondos comunes)
• Seguros sobre saldo deudor
• Impuesto de sellos
• Cualquier ajuste contable del banco sin comercio asociado

━━━ CUOTAS ━━━

El formato varía por banco:
• "01/12" o "1/12" en la descripción (ICBC, Macro)
• Columna separada "Cuota" con "01 de 12" o "1 de 12" (Santander, Galicia)
• "C:01/12" o "(1/12)" en la descripción (otros)

Regla:
• cuotaActual = 1 → nueva compra → incluir: true, tipo: "cuota"
• cuotaActual > 1 → incluir: true, tipo: "cuota", nota: "Cuota X/Y — puede que ya esté registrada si importaste resúmenes anteriores"
• El monto es el de UNA cuota (no el total)
• NUNCA pongas incluir: false por ser cuota > 1. El sistema verifica duplicados automáticamente.

━━━ DEVOLUCIONES Y BONIFICACIONES ━━━

Caso normal: tipo "devolucion", incluir: true, monto como positivo.

Caso especial — MISMA transacción con bonificación/descuento (mismo comprobante/voucher o descripción que dice "Bonif.", "Descuento", "Reintegro" sobre una compra del mismo período):
• Consolidar en UNA sola transacción
• monto neto = compra - bonificación (siempre positivo)
• descripcion = "NombreComercio (bonif. -$X.XXX aplicada)"
• tipo: "compra"
• NO crear dos entradas separadas

━━━ COMPROBANTE / ID EXTERNO ━━━

Cada banco usa un identificador distinto para cada operación:
• ICBC: columna "NRO CUPON" o "CUPÓN"
• Santander: columna "COMPROBANTE"
• Galicia: columna "NRO. OPERACIÓN" o "REFERENCIA"
• HSBC, Supervielle, otros: puede llamarse "VOUCHER", "REF", "TICKET", "NRO OP", etc.

Extraé siempre este ID en el campo "comprobante". Si no existe columna identificadora, usar null.

━━━ TITULARES ━━━

Detectá a quién pertenece cada transacción. Los bancos lo indican de formas distintas:
• "TOTAL TITULAR: JUAN PEREZ" / "TOTAL ADICIONAL: MARIA PEREZ" (ICBC)
• "Tarjeta terminada en 7723 | Adriana Rosa Boces" (Santander)
• Secciones por titular con subtotal

Usá el nombre más corto y reconocible (ej: "Adriana Rosa Boces", no "ADRIANA ROSA BOCES TARJETA TERMINADA EN 7723").

━━━ NORMALIZACIÓN DE DESCRIPCIONES ━━━

Limpiar prefijos de procesadores de pago y normalizar nombres:
• MERPAGO* / MP* → quitar prefijo
• DLO* → quitar prefijo
• PAYU*AR* → quitar prefijo
• AMZN* → "Amazon"
• APPLE.COM/BILL → "Apple"
• NETFLIX.COM → "Netflix"
• SPOTIFY → "Spotify"
• CLAUDE.AI → "Claude AI"
• Mantener el nombre del comercio reconocible en español cuando sea posible

━━━ CATEGORÍAS SUGERIDAS ━━━

Elegir UNA de: "Comida", "Transporte", "Salud", "Tecnología", "Entretenimiento", "Ropa", "Hogar", "Viajes", "Supermercado", "Educación", "Servicios", "Otros"

━━━ FECHAS ━━━

Normalizar a YYYY-MM-DD. Formatos posibles:
• DD/MM/YY o DD/MM/YYYY (Santander, Galicia)
• DD-MMM-YY con meses en español: Ene=01 Feb=02 Mar=03 Abr=04 May=05 Jun=06 Jul=07 Ago=08 Sep=09 Oct=10 Nov=11 Dic=12 (ICBC)
• Año de 2 dígitos: "24" → 2024, "25" → 2025, "26" → 2026

━━━ MONTOS ━━━

• Separador decimal en JSON: siempre punto (43.449,00 → 43449.00)
• Solo pesos → montoARS = valor, montoUSD = null
• Solo dólares → montoARS = null, montoUSD = valor
• Ambos → llenar los dos campos
• Montos negativos (devoluciones) → guardar como positivo, tipo: "devolucion"

━━━ FORMATO DE RESPUESTA ━━━

DEVUELVE SOLO JSON VÁLIDO, sin markdown, sin texto adicional:
{
  "banco": "Santander",
  "titulares": ["Nombre Titular", "Nombre Adicional"],
  "periodoDesde": "YYYY-MM-DD",
  "periodoHasta": "YYYY-MM-DD",
  "transacciones": [
    {
      "fecha": "YYYY-MM-DD",
      "descripcionRaw": "texto exacto del PDF",
      "descripcion": "nombre limpio",
      "montoARS": 43449.00,
      "montoUSD": null,
      "tipo": "compra",
      "titular": "Nombre del titular",
      "cuotaActual": null,
      "cuotaTotal": null,
      "comprobante": "003469",
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

    const isCsv = file.name.endsWith(".csv") || file.type === "text/csv"
    const isPdf = file.type === "application/pdf"
    if (!isPdf && !isCsv) return NextResponse.json({ error: "El archivo debe ser un PDF o CSV" }, { status: 400 })

    const maxSizeMB = 10
    if (file.size > maxSizeMB * 1024 * 1024)
      return NextResponse.json({ error: `El archivo no puede superar ${maxSizeMB}MB` }, { status: 400 })

    let response
    if (isCsv) {
      const csvText = await file.text()
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: `${PARSE_PROMPT}\n\n[ARCHIVO CSV DE MOVIMIENTOS]\n${csvText}\n[FIN DEL ARCHIVO]`,
          },
        ],
      })
    } else {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              {
                type: "text",
                text: PARSE_PROMPT,
              },
            ],
          },
        ],
      })
    }

    const rawText = response.content[0].type === "text" ? response.content[0].text : ""

    let parsed: ResumenParseResult
    try {
      const cleaned = rawText
        .replace(/^```json\s*/m, "")
        .replace(/^```\s*/m, "")
        .replace(/```\s*$/m, "")
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error("Claude response could not be parsed as JSON:", rawText.slice(0, 500))
      return NextResponse.json(
        { error: "No se pudo interpretar el archivo. Verificá que sea un resumen o listado de movimientos de tarjeta de crédito." },
        { status: 422 }
      )
    }

    // Add temporal IDs for frontend keying
    parsed.transacciones = parsed.transacciones.map((t, i) => ({
      ...t,
      id: `tx-${i}`,
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error("Error parsing resumen:", error)
    return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 })
  }
}
