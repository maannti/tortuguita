/**
 * Shared logic for creating a Bill from a RecurringBill template.
 * Used by both the cron job and the API route (on create/reactivate).
 */

import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { addMonths, setDate, endOfMonth, startOfMonth, isSameMonth } from "date-fns"
import { calculateBudgetDate, type BillingPeriod } from "@/lib/budget-date"
import type { Decimal } from "@prisma/client/runtime/library"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})
function formatARS(n: number) { return arsFormatter.format(n) }

interface RecurringBillForCreation {
  id: string
  label: string
  amount: Decimal
  amountUSD: Decimal | null
  notes: string | null
  billTypeId: string
  categoryId: string | null
  organizationId: string
  userId: string
  dayOfMonth: number
  nextDate: Date
  assignments: { userId: string; percentage: Decimal }[]
  billType: {
    isCreditCard: boolean
    currentClosingDate: Date | null
    currentDueDate: Date | null
    nextClosingDate: Date | null
    nextDueDate: Date | null
  }
}

/**
 * Creates a Bill record from a RecurringBill for the given paymentDate.
 * Returns the created Bill, or null if a bill already exists for that month.
 */
export async function createBillFromRecurring(
  rb: RecurringBillForCreation,
  paymentDate: Date,
  now: Date
): Promise<{ id: string } | null> {
  // Guard: don't create if a bill already exists for this recurring template in the same month
  const monthStart = startOfMonth(paymentDate)
  const monthEnd = endOfMonth(paymentDate)
  const existing = await prisma.bill.findFirst({
    where: {
      recurringBillId: rb.id,
      paymentDate: { gte: monthStart, lte: monthEnd },
    },
    select: { id: true },
  })
  if (existing) return null

  const pd = new Date(paymentDate)
  pd.setHours(12, 0, 0, 0)

  const billingPeriod: BillingPeriod = {
    currentClosingDate: rb.billType.currentClosingDate,
    currentDueDate: rb.billType.currentDueDate,
    nextClosingDate: rb.billType.nextClosingDate,
    nextDueDate: rb.billType.nextDueDate,
  }
  const { budgetDate } = calculateBudgetDate(pd, rb.billType.isCreditCard, billingPeriod)

  const bill = await prisma.bill.create({
    data: {
      label: rb.label,
      amount: rb.amount,
      amountUSD: rb.amountUSD ?? null,
      paymentDate: pd,
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
          percentage: Number(a.percentage),
        })),
      },
    },
    select: { id: true },
  })

  return bill
}

/**
 * Sends a push notification after a recurring bill is created.
 * Adapts the message depending on whether the bill is for this month or next.
 */
export async function notifyRecurringBillCreated(
  rb: RecurringBillForCreation,
  billId: string,
  paymentDate: Date,
  now: Date
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: rb.userId },
    select: { fcmToken: true, notificationsEnabled: true },
  })
  if (!user?.notificationsEnabled || !user.fcmToken) return

  const isThisMonth = isSameMonth(paymentDate, now)
  const body = isThisMonth
    ? `Lo cargamos por ${formatARS(Number(rb.amount))}. ¿Cambió el monto?`
    : `Proyectado para el mes siguiente por ${formatARS(Number(rb.amount))}. ¿Ya sabés si cambia?`

  const ok = await sendPushNotification(
    user.fcmToken,
    {
      title: `${rb.label} cargado automáticamente`,
      body,
      type: "recurring_reminder",
      url: `/bills/${billId}/edit`,
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

/**
 * Advances nextDate to the same dayOfMonth of the following month,
 * clamped to end of month for short months (e.g., day 31 in February).
 */
export function advanceNextDate(currentNextDate: Date, dayOfMonth: number): Date {
  const candidate = setDate(addMonths(currentNextDate, 1), dayOfMonth)
  const lastDay = endOfMonth(addMonths(currentNextDate, 1))
  return candidate > lastDay ? lastDay : candidate
}

/**
 * Fetches a RecurringBill with the billType fields needed for Bill creation.
 * Used by POST/PATCH handlers to run the immediate-creation flow.
 */
export async function fetchRecurringBillForCreation(id: string) {
  return prisma.recurringBill.findUnique({
    where: { id },
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
}
