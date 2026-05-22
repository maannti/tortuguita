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

  // ── Closing date reminders ────────────────────────────────────────────────
  const CLOSING_REMINDER_DAYS = [3, 1, 0]
  let closingNotificationsSent = 0

  for (const daysAhead of CLOSING_REMINDER_DAYS) {
    let targetDay: Date
    let targetDayEnd: Date

    if (daysAhead === 0) {
      targetDay = startOfDay(now)
      targetDayEnd = endOfDay(now)
    } else {
      targetDay = addDays(startOfDay(now), daysAhead)
      targetDayEnd = endOfDay(targetDay)
    }

    // Find CC types whose closingDate falls on this target day
    const ccTypes = await prisma.billType.findMany({
      where: {
        isCreditCard: true,
        currentClosingDate: { gte: targetDay, lte: targetDayEnd },
      },
      select: {
        id: true,
        name: true,
        currentClosingDate: true,
        currentDueDate: true,
        nextClosingDate: true,
        nextDueDate: true,
        organizationId: true,
      },
    })

    for (const cc of ccTypes) {
      // Get total bills for this CC in the current billing cycle (current month approximation)
      const cycleStart = startOfDay(
        new Date(new Date(cc.currentClosingDate!).getFullYear(), new Date(cc.currentClosingDate!).getMonth() - 1, new Date(cc.currentClosingDate!).getDate() + 1)
      )
      const total = await prisma.bill.aggregate({
        where: {
          billTypeId: cc.id,
          budgetDate: { gte: cycleStart, lte: new Date(cc.currentClosingDate!) },
        },
        _sum: { amount: true },
      })

      const totalAmount = Number(total._sum.amount || 0)
      const totalStr = arsFormatter.format(totalAmount)

      let title: string
      let body: string

      if (daysAhead === 3) {
        title = `Tu ${cc.name} cierra en 3 días`
        body = totalAmount > 0
          ? `Llevás ${totalStr} gastados en este ciclo. Todavía tenés tiempo de planificar.`
          : `Se acerca el cierre de tu resumen de ${cc.name}.`
      } else if (daysAhead === 1) {
        title = `Tu ${cc.name} cierra mañana`
        body = totalAmount > 0
          ? `Llevás ${totalStr} gastados. Mañana se cierra el resumen.`
          : `Mañana se cierra el resumen de ${cc.name}.`
      } else {
        title = `Tu ${cc.name} cerró hoy`
        body = totalAmount > 0
          ? `El total del ciclo fue ${totalStr}. En breve vas a recibir el resumen.`
          : `El resumen de ${cc.name} cerró hoy.`
      }

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
          title,
          body,
          type: "closing_date",
          url: "/tarjetas",
          data: { cardTypeId: cc.id, type: "closing_date" },
        }, user.id)

        if (!ok) {
          // Token expired — clear it
          await prisma.user.update({
            where: { id: user.id },
            data: { fcmToken: null, notificationsEnabled: false },
          })
        } else {
          closingNotificationsSent++
        }
      }

      // On closing day (daysAhead === 0): advance billing period
      if (daysAhead === 0 && cc.nextClosingDate && cc.nextDueDate) {
        await prisma.billType.update({
          where: { id: cc.id },
          data: {
            currentClosingDate: cc.nextClosingDate,
            currentDueDate: cc.nextDueDate,
          },
        })
      }
    }
  }
  // ── End closing date reminders ────────────────────────────────────────────

  // Delete notifications older than 7 days
  await prisma.notification.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  })

  return NextResponse.json({ ok: true, notificationsSent, closingNotificationsSent })
}
