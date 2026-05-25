import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuickBillForm } from "@/components/bills/quick-bill-form"
import { notFound } from "next/navigation"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function EditBillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const session = await auth()
  const { id } = await params
  const { returnTo } = await searchParams
  const backHref = returnTo ? `/bills/${id}?returnTo=${encodeURIComponent(returnTo)}` : `/bills/${id}`

  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)
  const now = new Date()

  const [bill, categories, memberships, incomeRows] = await Promise.all([
    prisma.bill.findFirst({
      where: { id, organizationId: { in: orgIds } },
      include: {
        billType: { select: { isCreditCard: true } },
        assignments: { select: { userId: true, percentage: true } },
      },
    }),
    prisma.billType.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true, name: true, color: true, icon: true, isCreditCard: true, organizationId: true, currentClosingDate: true, currentDueDate: true, nextClosingDate: true, nextDueDate: true, defaultAssignments: true },
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

  if (!bill) notFound()

  const members = memberships.map((m) => ({ ...m.user, organizationId: m.organizationId }))
  const memberIncomes = incomeRows.reduce((acc: Record<string, number>, r) => {
    acc[r.userId] = Number(r._sum.amount || 0)
    return acc
  }, {})
  const organizations = userOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))
  const typedCategories = categories.map(c => ({
    ...c,
    defaultAssignments: c.defaultAssignments as { userId: string; percentage: number }[] | null,
  }))

  return (
    <QuickBillForm
      mode="edit"
      categories={typedCategories}
      members={members}
      memberIncomes={memberIncomes}
      currentUserId={session.user.id}
      organizations={organizations}
      backHref={backHref}
      initialData={{
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        amountUSD: bill.amountUSD ? Number(bill.amountUSD) : null,
        billTypeId: bill.billTypeId,
        categoryId: bill.categoryId,
        isCreditCard: bill.billType.isCreditCard,
        paymentDate: format(new Date(bill.paymentDate), "yyyy-MM-dd"),
        totalInstallments: bill.totalInstallments,
        notes: bill.notes,
        assignments: bill.assignments.map(a => ({
          userId: a.userId,
          percentage: Number(a.percentage),
        })),
        organizationId: bill.organizationId,
      }}
    />
  )
}
