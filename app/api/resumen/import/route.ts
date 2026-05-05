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
  cuotaTotal: z.number().nullable(),
  usarUSD: z.boolean().default(false), // si true, guardar en USD (como monto en ARS al equivalente)
  billTypeId: z.string().min(1),       // id de la tarjeta CC en el sistema
  categoryId: z.string().nullable(),   // categoría de gasto opcional
  userId: z.string().min(1),           // miembro asignado
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

    // Load the billType (CC card) to get billing period
    const billType = await prisma.billType.findFirst({
      where: { organizationId, isCreditCard: true },
    })

    // We'll look up each billType per transaction (user may use different cards)
    // Cache them
    const billTypeCache = new Map<string, typeof billType>()
    const getBillType = async (id: string) => {
      if (billTypeCache.has(id)) return billTypeCache.get(id)!
      const bt = await prisma.billType.findFirst({ where: { id, organizationId } })
      if (bt) billTypeCache.set(id, bt)
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

        if (totalInstallments > 1) {
          // Create all installments as a group
          const installmentGroupId = randomUUID()
          const amountPerCuota = Math.round((finalAmount / totalInstallments) * 100) / 100

          const promises = []
          for (let i = 1; i <= totalInstallments; i++) {
            const cuotaPaymentDate = new Date(paymentDate)
            cuotaPaymentDate.setMonth(cuotaPaymentDate.getMonth() + (i - 1))
            const { budgetDate: cuotaBudgetDate } = calculateBudgetDate(cuotaPaymentDate, true, billingPeriod)

            promises.push(prisma.bill.create({
              data: {
                label: tx.descripcion,
                amount: amountPerCuota,
                paymentDate: cuotaPaymentDate,
                budgetDate: cuotaBudgetDate,
                billTypeId: tx.billTypeId,
                categoryId: tx.categoryId || null,
                organizationId,
                userId: tx.userId,
                totalInstallments,
                currentInstallment: i,
                installmentGroupId,
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
              paymentDate,
              budgetDate,
              billTypeId: tx.billTypeId,
              categoryId: tx.categoryId || null,
              organizationId,
              userId: tx.userId,
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

    return NextResponse.json({
      imported: created.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    console.error("Error importing resumen:", error)
    return NextResponse.json({ error: "Error al importar" }, { status: 500 })
  }
}
