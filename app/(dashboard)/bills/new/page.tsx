import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillForm } from "@/components/bills/bill-form"

export default async function NewBillPage() {
  const session = await auth()

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const [categories, memberships] = await Promise.all([
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
  ])

  const members = memberships.map((m) => m.user)

  return (
    <div className="-mx-4 md:mx-0 md:max-w-2xl">
      <BillForm
        mode="create"
        categories={categories}
        members={members}
        currentUserId={session.user.id}
      />
    </div>
  )
}
