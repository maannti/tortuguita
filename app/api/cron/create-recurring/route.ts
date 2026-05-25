import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { addMonths, setDate, endOfMonth } from "date-fns"
import { calculateBudgetDate, type BillingPeriod } from "@/lib/budget-date"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})
function formatARS(n: number) { return arsFormatter.format(n) }

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Find all active recurring bills whose nextDate has arrived
  const due = await prisma.recurringBill.findMany({
    where: { isActive: true, nextDate: { lte: now } },
    include: {
      assignments: true,
      billType: {
        select: {
          isCreditCard: true,
          currentClosingDate: true,
          currentDueDate: true,
          nextClosingDate: true,
          nextDueDate: true,
        },
      },
    },
  })

  if (due.length === 0) {
    return NextResponse.json({ created: 0, total: 0 })
  }

  let created = 0

  for (const rb of due) {
    try {
      const paymentDate = new Date(rb.nextDate)
      paymentDate.setHours(12, 0, 0, 0)

      const billingPeriod: BillingPeriod = {
        currentClosingDate: rb.billType.currentClosingDate,
        currentDueDate: rb.billType.currentDueDate,
        nextClosingDate: rb.billType.nextClosingDate,
        nextDueDate: rb.billType.nextDueDate,
      }
      const { budgetDate } = calculateBudgetDate(paymentDate, rb.billType.isCreditCard, billingPeriod)

      // Auto-create the Bill with the recurring bill's stored amount
      const bill = await prisma.bill.create({
        data: {
          label: rb.label,
          amount: rb.amount,
          amountUSD: rb.amountUSD ?? null,
          paymentDate,
          budgetDate,
          billTypeId: rb.billTypeId,
          categoryId: rb.categoryId ?? null,
          organizationId: rb.organizationId,
          userId: rb.userId,
          notes: rb.notes ?? null,
          recurringBillId: rb.id,
          assignments: {
            create: rb.assignments.map(a => ({
              userId: a.userId,
              percentage: a.percentage,
            })),
          },
        },
      })
      created++

      // Notify user: bill was created automatically, prompt to adjust if amount changed
      const user = await prisma.user.findUnique({
        where: { id: rb.userId },
        select: { fcmToken: true, notificationsEnabled: true },
      })

      if (user?.notificationsEnabled === true && user.fcmToken) {
        const ok = await sendPushNotification(
          user.fcmToken,
          {
            title: `${rb.label} registrado automáticamente`,
            body: `Lo cargamos por ${formatARS(Number(rb.amount))}. ¿Cambió el monto este mes?`,
            type: "recurring_reminder",
            url: `/bills/${bill.id}/edit`,
          },
          rb.userId
        )
        if (!ok) {
          await prisma.user.update({
            where: { id: rb.userId },
            data: { fcmToken: null, notificationsEnabled: false },
          })
        }
      }

      // Advance nextDate: same dayOfMonth, next month — clamped to end of month
      const candidate = setDate(addMonths(rb.nextDate, 1), rb.dayOfMonth)
      const lastDay = endOfMonth(addMonths(rb.nextDate, 1))
      const safeNextDate = candidate > lastDay ? lastDay : candidate

      await prisma.recurringBill.update({
        where: { id: rb.id },
        data: { nextDate: safeNextDate, lastGeneratedAt: now },
      })
    } catch (error) {
      console.error(`Error processing recurringBill ${rb.id}:`, error)
    }
  }

  return NextResponse.json({ created, total: due.length })
}
