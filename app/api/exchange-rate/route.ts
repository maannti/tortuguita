import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const revalidate = 3600 // cache 1h at the edge

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const arsRate: number | undefined = data.rates?.ARS

    if (!arsRate) throw new Error("Missing ARS rate in response")

    return NextResponse.json({
      rate: Math.round(arsRate), // round to whole pesos
      updatedAt: data.time_last_update_utc ?? null,
    })
  } catch (err) {
    console.error("exchange-rate fetch error:", err)
    return NextResponse.json({ error: "No se pudo obtener el tipo de cambio" }, { status: 502 })
  }
}
