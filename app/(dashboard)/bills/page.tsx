import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { format, parse, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { BillsView } from "@/components/bills/bills-view"

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BillsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>

  const orgId = session.user.currentOrganizationId
  const params = await searchParams
  const now = new Date()
  const targetDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : now
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  const allBills = await prisma.bill.findMany({
    where: { organizationId: orgId },
    select: { budgetDate: true },
  })
  const monthSet = new Set<string>()
  for (const b of allBills) monthSet.add(format(new Date(b.budgetDate), "yyyy-MM"))
  const availableMonths = Array.from(monthSet).sort().reverse()

  const bills = await prisma.bill.findMany({
    where: { organizationId: orgId, budgetDate: { gte: monthStart, lte: monthEnd } },
    include: { billType: true },
    orderBy: { budgetDate: "asc" },
  })

  const regularBills = bills
    .filter((b) => !b.billType.isCreditCard)
    .map((b) => ({
      id: b.id,
      label: b.label,
      amount: Number(b.amount),
      budgetDate: format(new Date(b.budgetDate), "d MMM"),
      billTypeName: b.billType.name,
      billTypeColor: b.billType.color || "#6b7280",
      billTypeIcon: b.billType.icon || null,
    }))

  // Group credit card bills by billType — show monthly total per card
  const ccGroupMap = new Map<
    string,
    {
      name: string
      color: string
      icon: string | null
      monthTotal: number
      itemCount: number
      activeInstallmentGroups: Set<string>
    }
  >()

  for (const bill of bills.filter((b) => b.billType.isCreditCard)) {
    if (!ccGroupMap.has(bill.billTypeId)) {
      ccGroupMap.set(bill.billTypeId, {
        name: bill.billType.name,
        color: bill.billType.color || "#f59e0b",
        icon: bill.billType.icon || null,
        monthTotal: 0,
        itemCount: 0,
        activeInstallmentGroups: new Set(),
      })
    }
    const g = ccGroupMap.get(bill.billTypeId)!
    g.monthTotal += Number(bill.amount)
    g.itemCount += 1
    if (bill.installmentGroupId) g.activeInstallmentGroups.add(bill.installmentGroupId)
  }

  const creditCardGroups = Array.from(ccGroupMap.values()).map((g) => ({
    name: g.name,
    color: g.color,
    icon: g.icon,
    monthTotal: g.monthTotal,
    itemCount: g.itemCount,
    activeInstallmentCount: g.activeInstallmentGroups.size,
  }))

  return (
    <BillsView
      month={format(monthStart, "MMMM yyyy", { locale: es })}
      monthKey={format(monthStart, "yyyy-MM")}
      availableMonths={availableMonths}
      regularBills={regularBills}
      creditCardGroups={creditCardGroups}
      regularTotal={regularBills.reduce((s, b) => s + b.amount, 0)}
      ccTotal={creditCardGroups.reduce((s, g) => s + g.monthTotal, 0)}
    />
  )
}
