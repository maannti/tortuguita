import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"
import { calculateBudgetDate, type BillingPeriod } from "@/lib/budget-date"
import { randomUUID } from "crypto"
import { z } from "zod"

const transactionSchema = z.object({
  fecha: z.string(),
  descripcion: z.string().min(1),
  montoARS: z.number().nullable(),
  montoUSD: z.number().nullable(),
  tipo: z.enum(["compra", "cuota", "debito_automatico", "devolucion"]),
  cuotaActual: z.number().nullable().optional(),
  cuotaTotal: z.number().nullable(),
  usarUSD: z.boolean().default(false),
  billTypeId: z.string().min(1),
  categoryId: z.string().nullable(),
  userId: z.string().min(1),
  comprobante: z.string().nullable().optional(), // banco voucher/ID for deduplication
})

const importSchema = z.object({
  organizationId: z.string().min(1),
  transacciones: z.array(transactionSchema).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { organizationId, transacciones } = importSchema.parse(body)

    // Validate org membership
    const userOrgs = await getUserOrganizations(session.user.id)
    const validOrg = userOrgs.find(o => o.id === organizationId)
    if (!validOrg) return NextResponse.json({ error: "Invalid space" }, { status: 403 })

    // Load the billType (CC card) to get billing period.
    // Cards can belong to any org the user has access to — the target org (organizationId)
    // is where bills get created, but the card itself may live in a different space.
    const userOrgIds = userOrgs.map(o => o.id)

    const billTypeCache = new Map<string, { id: string; currentClosingDate: Date | null; currentDueDate: Date | null; nextClosingDate: Date | null; nextDueDate: Date | null } | null>()
    const getBillType = async (id: string) => {
      if (billTypeCache.has(id)) return billTypeCache.get(id)!
      const bt = await prisma.billType.findFirst({
        where: { id, organizationId: { in: userOrgIds }, isCreditCard: true },
        select: { id: true, currentClosingDate: true, currentDueDate: true, nextClosingDate: true, nextDueDate: true },
      })
      billTypeCache.set(id, bt)
      return bt
    }

    const created: string[] = []
    const errors: string[] = []

    for (const tx of transacciones) {
      try {
        const bt = await getBillType(tx.billTypeId)
        if (!bt) { errors.push(`Tarjeta no encontrada para: ${tx.descripcion}`); continue }

        const paymentDate = new Date(tx.fecha + "T12:00:00")
        const billingPeriod: BillingPeriod = {
          currentClosingDate: bt.currentClosingDate,
          currentDueDate: bt.currentDueDate,
          nextClosingDate: bt.nextClosingDate,
          nextDueDate: bt.nextDueDate,
        }
        const { budgetDate } = calculateBudgetDate(paymentDate, true, billingPeriod)

        // Determine amount — prefer ARS, fall back to USD (stored as-is since app uses ARS)
        const amount = tx.usarUSD
          ? (tx.montoUSD ?? tx.montoARS ?? 0)
          : (tx.montoARS ?? tx.montoUSD ?? 0)

        const isDevolucion = tx.tipo === "devolucion"
        const finalAmount = isDevolucion ? -Math.abs(amount) : Math.abs(amount)

        if (finalAmount === 0) { errors.push(`Monto cero, ignorado: ${tx.descripcion}`); continue }

        const totalInstallments = tx.cuotaTotal ?? 1
        const cuotaActual = tx.cuotaActual ?? 1
        const externalRef = tx.comprobante ?? null

        // ── Dedup check ──────────────────────────────────────────────────────
        // Skip if a bill with the same card + comprobante + this installment already exists
        if (externalRef) {
          const existing = await prisma.bill.findUnique({
            where: {
              billTypeId_externalRef_currentInstallment: {
                billTypeId: tx.billTypeId,
                externalRef,
                currentInstallment: cuotaActual,
              },
            },
            select: { id: true },
          })
          if (existing) {
            errors.push(`Duplicado ignorado: ${tx.descripcion} (comprobante ${externalRef})`)
            continue
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        if (totalInstallments > 1) {
          // Create from cuotaActual onward — handles both cuota 1 (full series)
          // and mid-series imports (e.g. cuota 3/6 for new users with no prior imports)
          const installmentGroupId = randomUUID()
          // The parser already extracts the per-cuota amount (see parse route:
          // "El monto es el de UNA cuota (no el total)"), so we use finalAmount directly.
          const amountPerCuota = finalAmount

          // Calculate budgetDate for the FIRST cuota in this import (cuotaActual).
          // Each subsequent cuota gets that same base date + N months, so they
          // land in consecutive billing cycles instead of all piling into the same month.
          const { budgetDate: baseBudgetDate } = calculateBudgetDate(paymentDate, true, billingPeriod)

          const promises = []
          for (let i = cuotaActual; i <= totalInstallments; i++) {
            const cuotaPaymentDate = new Date(paymentDate)
            cuotaPaymentDate.setMonth(cuotaPaymentDate.getMonth() + (i - cuotaActual))

            // Offset budgetDate by the same number of months as paymentDate
            const cuotaBudgetDate = new Date(baseBudgetDate)
            cuotaBudgetDate.setMonth(cuotaBudgetDate.getMonth() + (i - cuotaActual))

            const usdPerCuota = tx.montoUSD ?? null
            promises.push(prisma.bill.create({
              data: {
                label: tx.descripcion,
                amount: amountPerCuota,
                amountUSD: usdPerCuota,
                paymentDate: cuotaPaymentDate,
                budgetDate: cuotaBudgetDate,
                billTypeId: tx.billTypeId,
                categoryId: tx.categoryId || null,
                organizationId,
                userId: tx.userId,
                totalInstallments,
                currentInstallment: i,
                installmentGroupId,
                externalRef: externalRef ?? undefined,
                assignments: {
                  create: [{ userId: tx.userId, percentage: 100 }],
                },
              },
            }))
          }
          const bills = await Promise.all(promises)
          created.push(...bills.map(b => b.id))
        } else {
          const bill = await prisma.bill.create({
            data: {
              label: tx.descripcion,
              amount: finalAmount,
              amountUSD: tx.montoUSD || null,
              paymentDate,
              budgetDate,
              billTypeId: tx.billTypeId,
              categoryId: tx.categoryId || null,
              organizationId,
              userId: tx.userId,
              externalRef: externalRef ?? undefined,
              assignments: {
                create: [{ userId: tx.userId, percentage: 100 }],
              },
            },
          })
          created.push(bill.id)
        }
      } catch (err) {
        console.error(`Error importing transaction ${tx.descripcion}:`, err)
        errors.push(`Error al importar: ${tx.descripcion}`)
      }
    }

    const duplicates = errors.filter(e => e.startsWith("Duplicado ignorado:"))
    const realErrors = errors.filter(e => !e.startsWith("Duplicado ignorado:"))
    return NextResponse.json({
      imported: created.length,
      duplicates: duplicates.length > 0 ? duplicates.length : undefined,
      errors: realErrors.length > 0 ? realErrors : undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error("Error importing resumen:", error)
    return NextResponse.json({ error: "Error al importar" }, { status: 500 })
  }
}
