import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { es } from "date-fns/locale"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Cron: send each user a monthly expense summary on the 1st of the month.
 * Compares last month's total to the month before for context.
 * Configured in vercel.json: "0 9 1 * *"
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Last month
  const lastMonthDate = subMonths(now, 1)
  const lastMonthStart = startOfMonth(lastMonthDate)
  const lastMonthEnd = endOfMonth(lastMonthDate)

  // Month before last
  const prevMonthDate = subMonths(now, 2)
  const prevMonthStart = startOfMonth(prevMonthDate)
  const prevMonthEnd = endOfMonth(prevMonthDate)

  const lastMonthName = format(lastMonthDate, "MMMM", { locale: es })
  const prevMonthName = format(prevMonthDate, "MMMM", { locale: es })

  // Get all users with notifications enabled
  const users = await prisma.user.findMany({
    where: {
      notificationsEnabled: true,
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  })

  let notificationsSent = 0

  for (const user of users) {
    if (!user.fcmToken) continue

    // Total for last month
    const lastMonthAgg = await prisma.bill.aggregate({
      where: {
        userId: user.id,
        paymentDate: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    })
    const lastMonthTotal = Number(lastMonthAgg._sum.amount ?? 0)

    // Skip if no expenses last month
    if (lastMonthTotal === 0) continue

    // Total for the month before
    const prevMonthAgg = await prisma.bill.aggregate({
      where: {
        userId: user.id,
        paymentDate: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    })
    const prevMonthTotal = Number(prevMonthAgg._sum.amount ?? 0)

    const formattedTotal = arsFormatter.format(lastMonthTotal)

    let body: string
    if (prevMonthTotal === 0) {
      body = `Gastaste ${formattedTotal} en ${lastMonthName}`
    } else {
      const diffPct = Math.round(Math.abs((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
      if (lastMonthTotal > prevMonthTotal) {
        body = `Gastaste ${formattedTotal}, un ${diffPct}% más que ${prevMonthName}`
      } else {
        body = `Gastaste ${formattedTotal}, un ${diffPct}% menos que ${prevMonthName}`
      }
    }

    const ok = await sendPushNotification(
      user.fcmToken,
      {
        title: `Resumen de ${lastMonthName}`,
        body,
        type: "monthly_summary",
        url: "/bills",
      },
      user.id
    )

    if (!ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fcmToken: null, notificationsEnabled: false },
      })
    } else {
      notificationsSent++
    }
  }

  return NextResponse.json({ ok: true, notificationsSent })
}
