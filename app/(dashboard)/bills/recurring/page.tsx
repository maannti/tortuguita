import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"
import { RecurringBillsView } from "@/components/bills/recurring-bills-view"

export default async function RecurringBillsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return <div className="p-8 text-center text-muted-foreground">Sesión no válida. Volvé a iniciar sesión.</div>
  }

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const rows = await prisma.recurringBill.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      billType: { select: { id: true, name: true, color: true, icon: true, isCreditCard: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ isActive: "desc" }, { label: "asc" }],
  })

  const recurringBills = rows.map(rb => ({
    id: rb.id,
    label: rb.label,
    amount: Number(rb.amount),
    amountUSD: rb.amountUSD ? Number(rb.amountUSD) : null,
    notes: rb.notes,
    dayOfMonth: rb.dayOfMonth,
    isActive: rb.isActive,
    nextDate: rb.nextDate.toISOString(),
    lastGeneratedAt: rb.lastGeneratedAt?.toISOString() ?? null,
    billType: rb.billType,
    category: rb.category,
    assignments: rb.assignments.map(a => ({
      userId: a.userId,
      percentage: Number(a.percentage),
      user: a.user,
    })),
  }))

  return <RecurringBillsView recurringBills={recurringBills} />
}
