import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeForm } from "@/components/incomes/income-form"

export default async function NewIncomePage() {
  const session = await auth()

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const [categories, memberships, organization] = await Promise.all([
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

  const members = memberships.map((m) => m.user)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <IncomeForm
        mode="create"
        categories={categories}
        members={members}
        currentUserId={session.user.id}
        isPersonalOrg={organization?.isPersonal ?? true}
      />
    </div>
  )
}
