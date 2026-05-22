import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/bills/[id]/settle
// Toggles isSettled on the calling user's BillAssignment for this bill
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: billId } = await params
  const { searchParams } = new URL(req.url)
  // debtorUserId: if provided, the caller is the payer settling on behalf of the debtor
  const debtorUserId = searchParams.get("debtorUserId") ?? session.user.id
  const targetUserId = debtorUserId

  // Find the assignment for the target user on this bill
  const assignment = await prisma.billAssignment.findUnique({
    where: { billId_userId: { billId, userId: targetUserId } },
    include: { bill: { select: { organizationId: true, userId: true, paidByUserId: true } } },
  })

  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

  // If settling someone else's assignment, verify the caller is the payer
  if (targetUserId !== session.user.id) {
    const payerId = assignment.bill.paidByUserId ?? assignment.bill.userId
    if (payerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // Verify caller belongs to the org
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: assignment.bill.organizationId } },
  })
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const newSettled = !assignment.isSettled

  const updated = await prisma.billAssignment.update({
    where: { billId_userId: { billId, userId: targetUserId } },
    data: {
      isSettled: newSettled,
      settledAt: newSettled ? new Date() : null,
    },
  })

  return NextResponse.json({ isSettled: updated.isSettled, settledAt: updated.settledAt })
}
