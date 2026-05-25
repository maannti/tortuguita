import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recurringBillSchema } from "@/lib/validations/recurring-bill"
import { getUserOrganizations } from "@/lib/organization-utils"
import { setDate, startOfMonth, addMonths } from "date-fns"
import { ZodError } from "zod"
import {
  createBillFromRecurring,
  notifyRecurringBillCreated,
  advanceNextDate,
  fetchRecurringBillForCreation,
} from "@/lib/recurring-bill-utils"

// GET — list all recurring bills for the user's orgs
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const recurringBills = await prisma.recurringBill.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      billType: { select: { id: true, name: true, color: true, icon: true, bank: true, isCreditCard: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ isActive: "desc" }, { label: "asc" }],
  })

  return NextResponse.json(recurringBills)
}

// POST — create a new recurring bill and immediately generate the first Bill
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const data = recurringBillSchema.parse(body)

    const userOrgs = await getUserOrganizations(session.user.id)
    const validOrg = userOrgs.find(o => o.id === data.organizationId)
    if (!validOrg) return NextResponse.json({ error: "Organización inválida" }, { status: 403 })

    const now = new Date()

    // First occurrence: if dayOfMonth hasn't arrived yet this month → this month, else → next month
    const thisMonthCandidate = setDate(startOfMonth(now), data.dayOfMonth)
    const firstOccurrence = thisMonthCandidate >= now
      ? thisMonthCandidate
      : setDate(startOfMonth(addMonths(now, 1)), data.dayOfMonth)

    // nextDate starts at the SECOND occurrence (first bill is created immediately below)
    const secondOccurrence = advanceNextDate(firstOccurrence, data.dayOfMonth)

    const recurring = await prisma.recurringBill.create({
      data: {
        label: data.label,
        amount: data.amount,
        amountUSD: data.amountUSD ?? null,
        notes: data.notes ?? null,
        billTypeId: data.billTypeId,
        categoryId: data.categoryId ?? null,
        organizationId: data.organizationId,
        userId: session.user.id,
        dayOfMonth: data.dayOfMonth,
        isActive: data.isActive,
        nextDate: secondOccurrence,
        assignments: {
          create: data.assignments.map(a => ({
            userId: a.userId,
            percentage: a.percentage,
          })),
        },
      },
      include: {
        billType: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
    })

    // Immediately create the first Bill — fire & forget notification
    if (data.isActive) {
      const rbFull = await fetchRecurringBillForCreation(recurring.id)
      if (rbFull) {
        // Temporarily set nextDate to firstOccurrence so createBillFromRecurring uses the right date
        const rbForCreation = { ...rbFull, nextDate: firstOccurrence }
        const bill = await createBillFromRecurring(rbForCreation, firstOccurrence, now)
        if (bill) {
          notifyRecurringBillCreated(rbForCreation, bill.id, firstOccurrence, now).catch(console.error)
          await prisma.recurringBill.update({
            where: { id: recurring.id },
            data: { lastGeneratedAt: now },
          })
        }
      }
    }

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error creating recurring bill:", error)
    return NextResponse.json({ error: "Error al crear la recurrencia" }, { status: 500 })
  }
}
