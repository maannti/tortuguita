import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RecurringConfirmView } from "@/components/bills/recurring-confirm-view"

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecurringConfirmPage({ params }: Props) {
  const { id } = await params

  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const rb = await prisma.recurringBill.findUnique({
    where: { id },
    include: {
      billType: {
        select: { id: true, name: true, color: true, icon: true, isCreditCard: true },
      },
      category: {
        select: { id: true, name: true, color: true, icon: true },
      },
      assignments: {
        select: { userId: true, percentage: true },
      },
    },
  })

  if (!rb) {
    notFound()
  }

  // Verify the user owns this recurring bill (direct owner or org member)
  if (rb.userId !== session.user.id) {
    // Check if user belongs to the same organization
    const membership = await prisma.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId: rb.organizationId,
      },
    })
    if (!membership) {
      notFound()
    }
  }

  const recurringBill = {
    id: rb.id,
    label: rb.label,
    amount: Number(rb.amount),
    amountUSD: rb.amountUSD ? Number(rb.amountUSD) : null,
    notes: rb.notes,
    dayOfMonth: rb.dayOfMonth,
    billTypeId: rb.billTypeId,
    categoryId: rb.categoryId,
    organizationId: rb.organizationId,
    assignments: rb.assignments.map(a => ({
      userId: a.userId,
      percentage: Number(a.percentage),
    })),
    billType: rb.billType,
    category: rb.category,
  }

  return <RecurringConfirmView recurringBill={recurringBill} />
}
