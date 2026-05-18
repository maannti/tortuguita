import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { addMonths, setDate, endOfMonth } from "date-fns"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})
function formatARS(n: number) {
  return arsFormatter.format(n)
}

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
    },
  })

  if (due.length === 0) {
    return NextResponse.json({ notified: 0, total: 0 })
  }

  let notified = 0

  for (const rb of due) {
    try {
      // Fetch user to check notification settings
      const user = await prisma.user.findUnique({
        where: { id: rb.userId },
        select: { fcmToken: true, notificationsEnabled: true },
      })

      // Send push notification if user has it enabled and has a token
      if (user?.notificationsEnabled === true && user.fcmToken) {
        const title = `¿Te llegó ${rb.label}?`
        const body = `El mes pasado fue ${formatARS(Number(rb.amount))}. Confirmá o ajustá el monto.`
        await sendPushNotification(
          user.fcmToken,
          {
            title,
            body,
            type: "recurring_reminder",
            url: `/bills/recurring/confirm/${rb.id}`,
          },
          rb.userId
        )
        notified++
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

  return NextResponse.json({ notified, total: due.length })
}
