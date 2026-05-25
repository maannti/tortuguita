import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"
import { calculateBudgetDate, type BillingPeriod } from "@/lib/budget-date"
import { randomUUID } from "crypto"
import { z } from "zod"

const assignmentSchema = z.object({
  userId: z.string().min(1),
  percentage: z.number().min(1).max(100),
})

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
  organizationId: z.string().min(1), // per-transaction: derived from chosen category's org
  userId: z.string().min(1),
  assignments: z.array(assignmentSchema).nullable().optional(),
  comprobante: z.string().nullable().optional(), // banco voucher/ID for deduplication
  descripcionRaw: z.string().nullable().optional(), // raw bank description for future duplicate detection
})

const importSchema = z.object({
  transacciones: z.array(transactionSchema).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { transacciones } = importSchema.parse(body)

    // Validate org membership — each transaction's org must belong to the user
    const userOrgs = await getUserOrganizations(session.user.id)
    const userOrgIds = userOrgs.map(o => o.id)
    const invalidOrg = transacciones.find(tx => !userOrgIds.includes(tx.organizationId))
    if (invalidOrg) return NextResponse.json({ error: "Invalid space" }, { status: 403 })

    // Load the billType (CC card) to get billing period.
    // Cards can belong to any org the user has access to — each tx.organizationId
    // determines where its bills get created, but the card may live in a different space.

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
        // Path 1: exact comprobante match (no time limit)
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
        // Path 2: fallback — same card + exact amount + same date + same installment
        // Catches re-imports of old bills that were loaded before comprobante support
        {
          const txPaymentDate = new Date(tx.fecha + "T12:00:00")
          const dayStart = new Date(txPaymentDate); dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(txPaymentDate); dayEnd.setHours(23, 59, 59, 999)
          const fallback = await prisma.bill.findFirst({
            where: {
              billTypeId: tx.billTypeId,
              amount: Math.abs(finalAmount),
              paymentDate: { gte: dayStart, lte: dayEnd },
              currentInstallment: totalInstallments > 1 ? cuotaActual : null,
            },
            select: { id: true },
          })
          if (fallback) {
            errors.push(`Duplicado ignorado: ${tx.descripcion} (monto+fecha)`)
            continue
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        if (totalInstallments > 1) {
          const installmentGroupId = randomUUID()
          const amountPerCuota = finalAmount
          const { budgetDate: baseBudgetDate } = calculateBudgetDate(paymentDate, true, billingPeriod)
          const billAssignments = tx.assignments?.length
            ? tx.assignments
            : [{ userId: tx.userId, percentage: 100 }]

          const promises = []

          // Create prior cuotas (1 to cuotaActual-1) as isPaid:true
          // so they appear in the history as "already paid"
          for (let i = 1; i < cuotaActual; i++) {
            const cuotaPaymentDate = new Date(paymentDate)
            cuotaPaymentDate.setMonth(cuotaPaymentDate.getMonth() + (i - cuotaActual))
            const cuotaBudgetDate = new Date(baseBudgetDate)
            cuotaBudgetDate.setMonth(cuotaBudgetDate.getMonth() + (i - cuotaActual))
            promises.push(prisma.bill.create({
              data: {
                label: tx.descripcion,
                amount: amountPerCuota,
                amountUSD: tx.montoUSD ?? null,
                paymentDate: cuotaPaymentDate,
                budgetDate: cuotaBudgetDate,
                billTypeId: tx.billTypeId,
                categoryId: tx.categoryId || null,
                organizationId: tx.organizationId,
                userId: tx.userId,
                totalInstallments,
                currentInstallment: i,
                installmentGroupId,
                isPaid: true,
                sourceDescription: tx.descripcionRaw ?? undefined,
                assignments: { create: billAssignments },
              },
            }))
          }

          // Create cuotaActual onward normally
          for (let i = cuotaActual; i <= totalInstallments; i++) {
            const cuotaPaymentDate = new Date(paymentDate)
            cuotaPaymentDate.setMonth(cuotaPaymentDate.getMonth() + (i - cuotaActual))
            const cuotaBudgetDate = new Date(baseBudgetDate)
            cuotaBudgetDate.setMonth(cuotaBudgetDate.getMonth() + (i - cuotaActual))
            promises.push(prisma.bill.create({
              data: {
                label: tx.descripcion,
                amount: amountPerCuota,
                amountUSD: tx.montoUSD ?? null,
                paymentDate: cuotaPaymentDate,
                budgetDate: cuotaBudgetDate,
                billTypeId: tx.billTypeId,
                categoryId: tx.categoryId || null,
                organizationId: tx.organizationId,
                userId: tx.userId,
                totalInstallments,
                currentInstallment: i,
                installmentGroupId,
                externalRef: externalRef ?? undefined,
                sourceDescription: tx.descripcionRaw ?? undefined,
                assignments: { create: billAssignments },
              },
            }))
          }
          const bills = await Promise.all(promises)
          created.push(...bills.map(b => b.id))
        } else {
          const singleAssignments = tx.assignments?.length
            ? tx.assignments
            : [{ userId: tx.userId, percentage: 100 }]
          const bill = await prisma.bill.create({
            data: {
              label: tx.descripcion,
              amount: finalAmount,
              amountUSD: tx.montoUSD || null,
              paymentDate,
              budgetDate,
              billTypeId: tx.billTypeId,
              categoryId: tx.categoryId || null,
              organizationId: tx.organizationId,
              userId: tx.userId,
              externalRef: externalRef ?? undefined,
              sourceDescription: tx.descripcionRaw ?? undefined,
              assignments: {
                create: singleAssignments,
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
