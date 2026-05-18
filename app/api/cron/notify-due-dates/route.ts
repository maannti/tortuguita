import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { format, addDays, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0,
})

/**
 * Cron: notify users about CC due dates.
 * Runs daily. Sends reminders at 7, 3, and 1 day(s) before due date.
 * Configured in vercel.json.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const REMINDER_DAYS = [7, 3, 1]
  let notificationsSent = 0

  for (const daysAhead of REMINDER_DAYS) {
    const targetDay = addDays(startOfDay(now), daysAhead)
    const targetDayEnd = endOfDay(targetDay)

    // Find CC types whose dueDate falls on this target day
    const ccTypes = await prisma.billType.findMany({
      where: {
        isCreditCard: true,
        currentDueDate: { gte: targetDay, lte: targetDayEnd },
      },
      select: {
        id: true,
        name: true,
        currentDueDate: true,
        organizationId: true,
      },
    })

    for (const cc of ccTypes) {
      // Get total for this CC this month
      const total = await prisma.bill.aggregate({
        where: { billTypeId: cc.id },
        _sum: { amount: true },
      })

      const totalAmount = Number(total._sum.amount || 0)
      const dueDateStr = format(new Date(cc.currentDueDate!), "d 'de' MMMM", { locale: es })
      const daysLabel = daysAhead === 1 ? "mañana" : `en ${daysAhead} días`

      // Get users in this org with notifications enabled
      const users = await prisma.user.findMany({
        where: {
          notificationsEnabled: true,
          fcmToken: { not: null },
          currentOrganizationId: cc.organizationId,
        },
        select: { id: true, fcmToken: true },
      })

      for (const user of users) {
        if (!user.fcmToken) continue

        const ok = await sendPushNotification(user.fcmToken, {
          title: `Vence ${cc.name} ${daysLabel}`,
          body: totalAmount > 0
            ? `Tu resumen vence el ${dueDateStr}. Total: ${arsFormatter.format(totalAmount)}`
            : `Tu resumen de ${cc.name} vence el ${dueDateStr}.`,
          type: "due_date",
          url: "/tarjetas",
          data: { cardTypeId: cc.id, type: "due_date" },
        }, user.id)

        if (!ok) {
          // Token expired — clear it
          await prisma.user.update({
            where: { id: user.id },
            data: { fcmToken: null, notificationsEnabled: false },
          })
        } else {
          notificationsSent++
        }
      }
    }
  }

  // Delete notifications older than 7 days
  await prisma.notification.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  })

  return NextResponse.json({ ok: true, notificationsSent })
}
