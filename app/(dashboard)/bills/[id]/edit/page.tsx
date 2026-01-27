import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillForm } from "@/components/bills/bill-form"
import { notFound } from "next/navigation"
import { startOfMonth, endOfMonth } from "date-fns"

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [bill, categories, memberships, memberIncomes] = await Promise.all([
    prisma.bill.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
      include: {
        assignments: true,
      },
    }),
    prisma.billType.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isCreditCard: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.userOrganization.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    }),
    // Get total income per user for the current month
    prisma.income.groupBy({
      by: ["userId"],
      where: {
        organizationId: session.user.currentOrganizationId,
        incomeDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
  ])

  if (!bill) {
    notFound()
  }

  const members = memberships.map((m) => m.user)

  // Map member incomes to a simple object { odaId: totalIncome }
  const incomeByMember = memberIncomes.reduce((acc, inc) => {
    acc[inc.userId] = Number(inc._sum.amount || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <BillForm
        mode="edit"
        categories={categories}
        members={members}
        memberIncomes={incomeByMember}
        currentUserId={session.user.id}
        initialData={{
          id: bill.id,
          label: bill.label,
          amount: Number(bill.amount),
          paymentDate: bill.paymentDate,
          dueDate: bill.dueDate,
          billTypeId: bill.billTypeId,
          notes: bill.notes || "",
          assignments: bill.assignments.map((a) => ({
            userId: a.userId,
            percentage: Number(a.percentage),
          })),
        }}
      />
    </div>
  )
}
