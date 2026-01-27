import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeForm } from "@/components/incomes/income-form"
import { notFound } from "next/navigation"

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const [income, categories, memberships, organization] = await Promise.all([
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
  ])

  if (!income) {
    notFound()
  }

  const members = memberships.map((m) => m.user)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <IncomeForm
        mode="edit"
        categories={categories}
        members={members}
        currentUserId={session.user.id}
        isPersonalOrg={organization?.isPersonal ?? true}
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
