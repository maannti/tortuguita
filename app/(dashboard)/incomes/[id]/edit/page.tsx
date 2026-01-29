import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeForm } from "@/components/incomes/income-form"
import { notFound } from "next/navigation"
import { startOfMonth, endOfMonth } from "date-fns"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId || !session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [income, categories, memberships, organization, memberIncomes, userOrganizations] = await Promise.all([
    prisma.income.findFirst({
      where: {
        id,
        organizationId: session.user.currentOrganizationId,
      },
      include: {
        assignments: true,
      },
    }),
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
    // Get all organizations the user belongs to
    getUserOrganizations(session.user.id),
  ])

  if (!income) {
    notFound()
  }

  const members = memberships.map((m) => m.user)

  // Map member incomes to a simple object { userId: totalIncome }
  const incomeByMember = memberIncomes.reduce((acc, inc) => {
    acc[inc.userId] = Number(inc._sum.amount || 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <IncomeForm
        mode="edit"
        categories={categories}
        members={members}
        memberIncomes={incomeByMember}
        currentUserId={session.user.id}
        isPersonalOrg={organization?.isPersonal ?? true}
        userOrganizations={userOrganizations}
        currentOrganizationId={session.user.currentOrganizationId}
        initialData={{
          id: income.id,
          label: income.label,
          amount: Number(income.amount),
          incomeDate: income.incomeDate,
          incomeTypeId: income.incomeTypeId,
          notes: income.notes || "",
          assignments: income.assignments.map((a) => ({
            userId: a.userId,
            percentage: Number(a.percentage),
          })),
        }}
      />
    </div>
  )
}
