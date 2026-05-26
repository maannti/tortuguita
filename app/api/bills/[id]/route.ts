import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billSchema } from "@/lib/validations/bill"
import { z } from "zod"
import { calculateBudgetDate, type BillingPeriod } from "@/lib/budget-date"
import { getUserOrganizations } from "@/lib/organization-utils"
import { notifySharedBillMembers } from "@/lib/shared-bill-notifications"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userOrgs = await getUserOrganizations(session.user.id)
    const orgIds = userOrgs.map(o => o.id)

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        organizationId: { in: orgIds },
      },
      include: {
        billType: true,
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(bill)
  } catch (error) {
    console.error("Error fetching bill:", error)
    return NextResponse.json(
      { error: "Error al obtener el gasto" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { updateRecurring, ...rest } = body
    const data = billSchema.parse(rest)

    const userOrgs = await getUserOrganizations(session.user.id)
    const orgIds = userOrgs.map(o => o.id)

    const bill = await prisma.bill.findFirst({
      where: {
        id,
        organizationId: { in: orgIds },
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      )
    }

    // Verify billType belongs to any of the user's organizations
    const billType = await prisma.billType.findFirst({
      where: {
        id: data.billTypeId,
        organizationId: { in: orgIds },
      },
    })

    if (!billType) {
      return NextResponse.json(
        { error: "La categoría seleccionada no es válida" },
        { status: 400 }
      )
    }

    // Use provided organizationId (space change) or keep existing
    const targetOrgId = data.organizationId ?? bill.organizationId

    // Verify target org belongs to the user
    if (!orgIds.includes(targetOrgId)) {
      return NextResponse.json({ error: "Espacio no válido" }, { status: 400 })
    }

    // Verify all assigned users belong to the target organization
    if (data.assignments && data.assignments.length > 0) {
      const userIds = data.assignments.map((a) => a.userId)
      const memberships = await prisma.userOrganization.findMany({
        where: {
          userId: { in: userIds },
          organizationId: targetOrgId,
        },
      })

      if (memberships.length !== userIds.length) {
        return NextResponse.json(
          { error: "Uno o más miembros asignados no pertenecen a este espacio" },
          { status: 400 }
        )
      }
    }

    // Calculate budget date
    const billingPeriod: BillingPeriod = {
      currentClosingDate: billType.currentClosingDate,
      currentDueDate: billType.currentDueDate,
      nextClosingDate: billType.nextClosingDate,
      nextDueDate: billType.nextDueDate,
    }

    // Use provided budgetDate or calculate it
    const budgetDate = data.budgetDate
      ? new Date(data.budgetDate)
      : calculateBudgetDate(data.paymentDate, billType.isCreditCard, billingPeriod).budgetDate

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        label: data.label,
        amount: data.amount,
        amountUSD: data.amountUSD ?? null,
        paymentDate: data.paymentDate,
        budgetDate,
        dueDate: data.dueDate || null,
        billTypeId: data.billTypeId,
        categoryId: data.categoryId || null,
        organizationId: targetOrgId,
        notes: data.notes,
        assignments: {
          deleteMany: {},
          create: data.assignments?.map((assignment) => ({
            userId: assignment.userId,
            percentage: assignment.percentage,
          })),
        },
      },
      include: {
        billType: true,
        user: { select: { id: true, name: true, email: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    })

    // ── Propagate amount to RecurringBill template if requested ──────────────
    if (updateRecurring === true && bill.recurringBillId) {
      await prisma.recurringBill.update({
        where: { id: bill.recurringBillId },
        data: { amount: data.amount, amountUSD: data.amountUSD ?? null },
      })
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Propagate shared fields to installment siblings ──────────────────────
    // When editing a cuota, label/amount/amountUSD/categoryId/notes should
    // apply to ALL bills in the same installmentGroupId (each cuota has the
    // same amount, description, and category — only paymentDate/budgetDate differ).
    if (bill.installmentGroupId) {
      const siblingIds = await prisma.bill.findMany({
        where: { installmentGroupId: bill.installmentGroupId, id: { not: id } },
        select: { id: true },
      })
      if (siblingIds.length > 0) {
        // Update shared fields in bulk
        await prisma.bill.updateMany({
          where: { installmentGroupId: bill.installmentGroupId, id: { not: id } },
          data: {
            label: data.label,
            amount: data.amount,
            amountUSD: data.amountUSD ?? null,
            categoryId: data.categoryId || null,
            billTypeId: data.billTypeId,
            organizationId: targetOrgId,
            notes: data.notes,
          },
        })
        // Propagate assignments: delete + recreate for each sibling
        if (data.assignments && data.assignments.length > 0) {
          const ids = siblingIds.map(s => s.id)
          await prisma.billAssignment.deleteMany({ where: { billId: { in: ids } } })
          await prisma.billAssignment.createMany({
            data: ids.flatMap(sibId =>
              data.assignments!.map(a => ({ billId: sibId, userId: a.userId, percentage: a.percentage }))
            ),
          })
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Notify other assigned members (fire-and-forget)
    const otherAssignees = updated.assignments
      .filter(a => a.userId !== session.user.id)
      .map(a => ({ userId: a.userId, percentage: Number(a.percentage) }))
    if (otherAssignees.length > 0) {
      notifySharedBillMembers({
        billId: updated.id,
        billLabel: updated.label,
        billAmount: Number(updated.amount),
        actorId: session.user.id,
        actorName: session.user.name ?? "Alguien",
        action: "updated",
        assignments: otherAssignees,
      }).catch(console.error)
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Error updating bill:", error)
    return NextResponse.json(
      { error: "Error al actualizar el gasto. Intentá de nuevo." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const userOrgs = await getUserOrganizations(session.user.id)
    const orgIds = userOrgs.map(o => o.id)

    const { searchParams } = new URL(request.url)
    const deleteMode = searchParams.get("mode") // "single" | "all-series"

    const bill = await prisma.bill.findFirst({
      where: { id, organizationId: { in: orgIds } },
      include: { assignments: { select: { userId: true, percentage: true } } },
    })

    if (!bill) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
    }

    if (deleteMode === "all-series" && bill.installmentGroupId) {
      // Delete the entire installment series
      await prisma.bill.deleteMany({
        where: { installmentGroupId: bill.installmentGroupId, organizationId: { in: orgIds } },
      })
    } else {
      await prisma.bill.delete({ where: { id } })
    }

    // Notify other assigned members (fire-and-forget)
    const otherAssignees = bill.assignments
      .filter(a => a.userId !== session.user.id)
      .map(a => ({ userId: a.userId, percentage: Number(a.percentage) }))
    if (otherAssignees.length > 0) {
      notifySharedBillMembers({
        billId: id,
        billLabel: bill.label,
        billAmount: Number(bill.amount),
        actorId: session.user.id,
        actorName: session.user.name ?? "Alguien",
        action: "deleted",
        assignments: otherAssignees,
      }).catch(console.error)
    }

    return NextResponse.json({ message: "Gasto eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting bill:", error)
    return NextResponse.json(
      { error: "Error al eliminar el gasto. Intentá de nuevo." },
      { status: 500 }
    )
  }
}
