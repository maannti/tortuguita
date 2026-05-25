import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addMonths, endOfMonth } from "date-fns"
import {
  createBillFromRecurring,
  notifyRecurringBillCreated,
  advanceNextDate,
} from "@/lib/recurring-bill-utils"

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Look-ahead window: create bills for the current month AND the next full month.
  // Running daily, this ensures bills are visible ~30 days in advance.
  const lookAheadEnd = endOfMonth(addMonths(now, 1))

  const due = await prisma.recurringBill.findMany({
    where: { isActive: true, nextDate: { lte: lookAheadEnd } },
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
    return NextResponse.json({ created: 0, skipped: 0, total: 0 })
  }

  let created = 0
  let skipped = 0

  for (const rb of due) {
    try {
      const paymentDate = new Date(rb.nextDate)

      const bill = await createBillFromRecurring(rb, paymentDate, now)

      if (!bill) {
        // Bill already existed for this month — just advance nextDate if needed
        skipped++
        await prisma.recurringBill.update({
          where: { id: rb.id },
          data: { nextDate: advanceNextDate(rb.nextDate, rb.dayOfMonth) },
        })
        continue
      }

      created++

      // Notify asynchronously — non-fatal
      notifyRecurringBillCreated(rb, bill.id, paymentDate, now).catch(console.error)

      await prisma.recurringBill.update({
        where: { id: rb.id },
        data: {
          nextDate: advanceNextDate(rb.nextDate, rb.dayOfMonth),
          lastGeneratedAt: now,
        },
      })
    } catch (error) {
      console.error(`Error processing recurringBill ${rb.id}:`, error)
    }
  }

  return NextResponse.json({ created, skipped, total: due.length })
}
