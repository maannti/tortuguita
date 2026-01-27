import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeForm } from "@/components/incomes/income-form"
import { startOfMonth, endOfMonth } from "date-fns"

export default async function NewIncomePage() {
  const session = await auth()

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [categories, memberships, organization, memberIncomes] = await Promise.all([
    prisma.incomeType.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isRecurring: true,
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
    prisma.organization.findUnique({
      where: {
        id: session.user.currentOrganizationId,
      },
      select: {
        isPersonal: true,
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

  const members = memberships.map((m) => m.user)

  // Map member incomes to a simple object { userId: totalIncome }
  const incomeByMember = memberIncomes.reduce((acc, inc) => {
    acc[inc.userId] = Number(inc._sum.amount || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <IncomeForm
        mode="create"
        categories={categories}
        members={members}
        memberIncomes={incomeByMember}
        currentUserId={session.user.id}
        isPersonalOrg={organization?.isPersonal ?? true}
      />
    </div>
  )
}
