import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuickBillForm } from "@/components/bills/quick-bill-form"
import { startOfMonth, endOfMonth } from "date-fns"

export default async function NewBillPage() {
  const session = await auth()
  if (!session?.user?.currentOrganizationId || !session?.user?.id) return <div>Unauthorized</div>
  const now = new Date()
  const orgId = session.user.currentOrganizationId
  const [categories, memberships, incomeRows] = await Promise.all([
    prisma.billType.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, color: true, icon: true, isCreditCard: true }, orderBy: { name: "asc" } }),
    prisma.userOrganization.findMany({ where: { organizationId: orgId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.income.groupBy({ by: ["userId"], where: { organizationId: orgId, incomeDate: { gte: startOfMonth(now), lte: endOfMonth(now) } }, _sum: { amount: true } }),
  ])
  const members = memberships.map((m) => m.user)
  const memberIncomes = incomeRows.reduce((acc: Record<string, number>, r) => { acc[r.userId] = Number(r._sum.amount || 0); return acc }, {})
  return <QuickBillForm categories={categories} members={members} memberIncomes={memberIncomes} currentUserId={session.user.id} />
}
