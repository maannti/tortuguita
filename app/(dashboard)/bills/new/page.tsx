import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillForm } from "@/components/bills/bill-form"

export default async function NewBillPage() {
  const session = await auth()

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const [categories, members] = await Promise.all([
    prisma.billType.findMany({
      where: {
        organizationId: session.user.organizationId,
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
    prisma.user.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ])

  return (
    <div className="max-w-2xl">
      <BillForm
        mode="create"
        categories={categories}
        members={members}
        currentUserId={session.user.id}
      />
    </div>
  )
}
