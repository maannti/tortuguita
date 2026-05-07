import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { format, parse, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { BillsView } from "@/components/bills/bills-view"
import { getUserOrganizations } from "@/lib/organization-utils"

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BillsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) return <div className="p-8 text-center text-muted-foreground">Sesión no válida. Volvé a iniciar sesión.</div>

  // Resolve active space IDs from cookie (written by SpacesProvider on toggle)
  const cookieStore = await cookies()
  const userOrgs = await getUserOrganizations(session.user.id)
  const userOrgIds = userOrgs.map(o => o.id)

  const cookieVal = cookieStore.get("activeSpaceIds")?.value
  const activeOrgIds = cookieVal
    ? cookieVal.split(",").filter(id => userOrgIds.includes(id))
    : userOrgIds
  const orgIds = activeOrgIds.length > 0 ? activeOrgIds : userOrgIds

  const params = await searchParams
  const now = new Date()
  const targetDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : now
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  const [allBills, bills] = await Promise.all([
    prisma.bill.findMany({
      where: { organizationId: { in: orgIds } },
      select: { budgetDate: true },
    }),
    prisma.bill.findMany({
      where: { organizationId: { in: orgIds }, budgetDate: { gte: monthStart, lte: monthEnd } },
      include: { billType: true, category: true },
      orderBy: { budgetDate: "asc" },
    }),
  ])

  const monthSet = new Set<string>()
  for (const b of allBills) monthSet.add(format(new Date(b.budgetDate), "yyyy-MM"))
  const availableMonths = Array.from(monthSet).sort().reverse()

  // Group all bills (CC and non-CC) by their effective expense category.
  // For CC bills with a category: use the category (Tecnología, Ropa…).
  // For CC bills without a category: use the card name as fallback.
  // For non-CC bills: use the bill type (same as category for regular bills).
  const catGroupMap = new Map<string, {
    name: string; color: string; icon: string | null; total: number; totalUSD: number | null
    bills: Array<{
      id: string; label: string; amount: number; amountUSD: number | null; budgetDate: string
      cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
    }>
  }>()

  for (const bill of bills) {
    let catName: string, catColor: string, catIcon: string | null
    if (bill.billType.isCreditCard && bill.category) {
      catName  = bill.category.name
      catColor = bill.category.color || "#6b7280"
      catIcon  = bill.category.icon  || null
    } else {
      catName  = bill.billType.name
      catColor = bill.billType.color || "#6b7280"
      catIcon  = bill.billType.icon  || null
    }

    if (!catGroupMap.has(catName)) {
      catGroupMap.set(catName, { name: catName, color: catColor, icon: catIcon, total: 0, totalUSD: null, bills: [] })
    }
    const g = catGroupMap.get(catName)!
    const billUSD = bill.amountUSD ? Number(bill.amountUSD) : null
    g.total += Number(bill.amount)
    if (billUSD !== null) g.totalUSD = (g.totalUSD ?? 0) + billUSD
    g.bills.push({
      id: bill.id,
      label: bill.label,
      amount: Number(bill.amount),
      amountUSD: billUSD,
      budgetDate: format(new Date(bill.budgetDate), "d MMM"),
      cardName: bill.billType.isCreditCard ? bill.billType.name : null,
      currentInstallment: bill.currentInstallment,
      totalInstallments: bill.totalInstallments,
    })
  }

  const categoryGroups = Array.from(catGroupMap.values())
  const grandTotal = categoryGroups.reduce((s, g) => s + g.total, 0)
  const hasAnyUSD = categoryGroups.some(g => g.bills.some(b => b.amountUSD !== null))

  return (
    <BillsView
      month={format(monthStart, "MMMM yyyy", { locale: es })}
      monthKey={format(monthStart, "yyyy-MM")}
      availableMonths={availableMonths}
      categoryGroups={categoryGroups}
      grandTotal={grandTotal}
      hasAnyUSD={hasAnyUSD}
    />
  )
}
