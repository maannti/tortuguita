import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"
import { z } from "zod"

const txSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  descripcion: z.string(),
  montoARS: z.number().nullable(),
  billTypeId: z.string(),
})

const bodySchema = z.object({
  transacciones: z.array(txSchema).min(1),
})

export interface DuplicateMatch {
  billId: string
  label: string
  amount: number
  paymentDate: string
}

function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/^(merpago\*|mp\*|dlo\*|payu\*ar\*|amzn\*)\s*/gi, "")
    .replace(/[^a-záéíóúüñ0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function labelSimilarity(a: string, b: string): number {
  const na = normalizeLabel(a)
  const nb = normalizeLabel(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wordsA = new Set(na.split(" ").filter(w => w.length > 2))
  const wordsB = new Set(nb.split(" ").filter(w => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return intersection / union
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { transacciones } = bodySchema.parse(body)

    const userOrgs = await getUserOrganizations(session.user.id)
    const userOrgIds = userOrgs.map(o => o.id)

    const billTypeIds = [...new Set(transacciones.map(t => t.billTypeId).filter(Boolean))]
    if (billTypeIds.length === 0) return NextResponse.json({ matches: {} })

    // Look back 90 days
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const existingBills = await prisma.bill.findMany({
      where: {
        organizationId: { in: userOrgIds },
        billTypeId: { in: billTypeIds },
        paymentDate: { gte: since },
      },
      select: { id: true, label: true, amount: true, paymentDate: true, billTypeId: true },
      orderBy: { paymentDate: "desc" },
    })

    const matches: Record<string, DuplicateMatch | null> = {}

    for (const tx of transacciones) {
      const txAmount = tx.montoARS ?? 0
      if (txAmount <= 0) { matches[tx.id] = null; continue }

      const candidates = existingBills.filter(b => b.billTypeId === tx.billTypeId)

      let bestMatch: DuplicateMatch | null = null
      let bestScore = 0

      for (const bill of candidates) {
        const billAmount = Number(bill.amount)
        const amountDiff = Math.abs(billAmount - txAmount) / Math.max(txAmount, 1)
        if (amountDiff > 0.05) continue // more than 5% difference → skip

        const lscore = labelSimilarity(tx.descripcion, bill.label)
        if (lscore < 0.5) continue // not similar enough

        const totalScore = (1 - amountDiff) * 0.3 + lscore * 0.7
        if (totalScore > bestScore) {
          bestScore = totalScore
          bestMatch = {
            billId: bill.id,
            label: bill.label,
            amount: billAmount,
            paymentDate: bill.paymentDate.toISOString(),
          }
        }
      }

      matches[tx.id] = bestMatch
    }

    return NextResponse.json({ matches })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error("Error checking duplicates:", error)
    return NextResponse.json({ error: "Error checking duplicates" }, { status: 500 })
  }
}
