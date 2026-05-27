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
  comprobante: z.string().nullable().optional(),
})

const bodySchema = z.object({
  transacciones: z.array(txSchema).min(1),
})

export interface DuplicateMatch {
  billId: string
  label: string
  amount: number
  paymentDate: string
  matchType: "exact" | "fuzzy"
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

    // Load bills from ALL org credit cards (not just the auto-mapped one).
    // The user might have imported a CSV with card A and now uploads a PDF that
    // auto-maps to card B — if we filter by billTypeId we miss all those duplicates.
    // We apply a 2-year window to keep the query fast.
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const existingBills = await prisma.bill.findMany({
      where: {
        organizationId: { in: userOrgIds },
        billType: { isCreditCard: true },
        paymentDate: { gte: twoYearsAgo },
      },
      select: { id: true, label: true, amount: true, paymentDate: true, billTypeId: true, externalRef: true, sourceDescription: true },
      orderBy: { paymentDate: "desc" },
    })

    const matches: Record<string, DuplicateMatch | null> = {}

    for (const tx of transacciones) {
      const txAmount = tx.montoARS ?? 0
      if (txAmount <= 0) { matches[tx.id] = null; continue }

      const txDate = new Date(tx.fecha)

      // Path 0: exact comprobante match — scoped to same card (highest confidence)
      if (tx.comprobante) {
        const exactMatch = existingBills.find(b =>
          b.billTypeId === tx.billTypeId && b.externalRef === tx.comprobante
        )
        if (exactMatch) {
          matches[tx.id] = {
            billId: exactMatch.id,
            label: exactMatch.label,
            amount: Number(exactMatch.amount),
            paymentDate: exactMatch.paymentDate.toISOString(),
            matchType: "exact",
          }
          continue
        }
      }

      let bestMatch: DuplicateMatch | null = null
      let bestScore = 0

      // Fuzzy path: search across ALL org CC bills (not just same card).
      // The CSV might have been imported with a different card than the PDF auto-mapping.
      for (const bill of existingBills) {
        const billAmount = Number(bill.amount)
        const amountDiff = Math.abs(billAmount - txAmount) / Math.max(txAmount, 1)
        if (amountDiff > 0.05) continue // more than 5% difference → skip

        const daysDiff = Math.abs(
          (txDate.getTime() - new Date(bill.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        // Compare against both user label and stored raw bank description
        const lscore = Math.max(
          labelSimilarity(tx.descripcion, bill.label),
          bill.sourceDescription ? labelSimilarity(tx.descripcion, bill.sourceDescription) : 0
        )

        let totalScore = 0

        if (daysDiff <= 3) {
          // Strong signal: same amount + close date → duplicate even if label differs
          // (user likely renamed the transaction when entering manually)
          totalScore = (1 - amountDiff) * 0.55 + (1 - Math.min(daysDiff, 3) / 3) * 0.35 + lscore * 0.10
        } else if (lscore >= 0.5) {
          // Fallback: same amount + similar label or raw bank description
          totalScore = (1 - amountDiff) * 0.3 + lscore * 0.7
        } else {
          continue // neither condition met → not a duplicate
        }

        if (totalScore > bestScore) {
          bestScore = totalScore
          bestMatch = {
            billId: bill.id,
            label: bill.label,
            amount: billAmount,
            paymentDate: bill.paymentDate.toISOString(),
            matchType: "fuzzy",
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
