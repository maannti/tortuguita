import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recurringBillSchema } from "@/lib/validations/recurring-bill"
import { getUserOrganizations } from "@/lib/organization-utils"
import { setDate, startOfMonth, addMonths } from "date-fns"
import { ZodError } from "zod"

async function getRecurringBillForUser(id: string, userId: string) {
  const userOrgs = await getUserOrganizations(userId)
  const orgIds = userOrgs.map(o => o.id)
  return prisma.recurringBill.findFirst({
    where: { id, organizationId: { in: orgIds } },
    include: {
      billType: true,
      category: true,
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
  })
}

// GET — detail
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const recurring = await getRecurringBillForUser(id, session.user.id)
  if (!recurring) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  return NextResponse.json(recurring)
}

// PATCH — edit (label, amount, dayOfMonth, isActive, assignments)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const recurring = await getRecurringBillForUser(id, session.user.id)
  if (!recurring) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  try {
    const body = await request.json()
    const data = recurringBillSchema.parse({ ...body, organizationId: recurring.organizationId })

    // Recalculate nextDate if dayOfMonth changed or if reactivating
    let nextDate = recurring.nextDate
    if (data.dayOfMonth !== recurring.dayOfMonth || (data.isActive && !recurring.isActive)) {
      const now = new Date()
      const thisMonthCandidate = setDate(startOfMonth(now), data.dayOfMonth)
      nextDate = thisMonthCandidate >= now ? thisMonthCandidate : setDate(startOfMonth(addMonths(now, 1)), data.dayOfMonth)
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Replace assignments
      await tx.recurringBillAssignment.deleteMany({ where: { recurringBillId: id } })
      return tx.recurringBill.update({
        where: { id },
        data: {
          label: data.label,
          amount: data.amount,
          amountUSD: data.amountUSD ?? null,
          notes: data.notes ?? null,
          billTypeId: data.billTypeId,
          categoryId: data.categoryId ?? null,
          dayOfMonth: data.dayOfMonth,
          isActive: data.isActive,
          nextDate,
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
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error updating recurring bill:", error)
    return NextResponse.json({ error: "Error al actualizar la recurrencia" }, { status: 500 })
  }
}

// DELETE — ?deleteGenerated=true also deletes all generated bills
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const recurring = await getRecurringBillForUser(id, session.user.id)
  if (!recurring) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const deleteGenerated = searchParams.get("deleteGenerated") === "true"

  await prisma.$transaction(async (tx) => {
    if (deleteGenerated) {
      await tx.bill.deleteMany({ where: { recurringBillId: id } })
    }
    await tx.recurringBill.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true, deletedGenerated: deleteGenerated })
}
