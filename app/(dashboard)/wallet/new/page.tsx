import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuickBillForm } from "@/components/bills/quick-bill-form"
import { startOfMonth, endOfMonth } from "date-fns"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function NewCuotaPage() {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const now = new Date()
  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const [categories, memberships, incomeRows] = await Promise.all([
    prisma.billType.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true, name: true, color: true, icon: true, isCreditCard: true, accountType: true, bank: true, organizationId: true, currentClosingDate: true, currentDueDate: true, nextClosingDate: true, nextDueDate: true },
      orderBy: { name: "asc" },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: { in: orgIds } },
      select: { organizationId: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.income.groupBy({
      by: ["userId"],
      where: { organizationId: { in: orgIds }, incomeDate: { gte: startOfMonth(now), lte: endOfMonth(now) } },
      _sum: { amount: true },
    }),
  ])

  const members = memberships.map((m) => ({ ...m.user, organizationId: m.organizationId }))
  const memberIncomes = incomeRows.reduce(
    (acc: Record<string, number>, r) => { acc[r.userId] = Number(r._sum.amount || 0); return acc },
    {}
  )
  const organizations = userOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))

  return (
    <QuickBillForm
      categories={categories}
      members={members}
      memberIncomes={memberIncomes}
      currentUserId={session.user.id}
      organizations={organizations}
      backHref="/wallet"
      defaultInstallments={3}
    />
  )
}
