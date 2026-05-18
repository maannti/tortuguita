import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { format, parse, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { BillsView } from "@/components/bills/bills-view"
import { getUserOrganizations } from "@/lib/organization-utils"

interface PageProps {
  searchParams: Promise<{ month?: string; search?: string; categoryIds?: string; cardIds?: string }>
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
  const searchQuery = params.search?.trim() || ""
  const categoryIdFilters = params.categoryIds ? params.categoryIds.split(",").filter(Boolean) : []
  const cardIdFilters = params.cardIds ? params.cardIds.split(",").filter(Boolean) : []

  const [allBills, bills, allBillTypes] = await Promise.all([
    prisma.bill.findMany({
      where: { organizationId: { in: orgIds } },
      select: { budgetDate: true },
    }),
    prisma.bill.findMany({
      where: {
        organizationId: { in: orgIds },
        budgetDate: { gte: monthStart, lte: monthEnd },
        // Search filter
        ...(searchQuery && {
          OR: [
            { label: { contains: searchQuery, mode: "insensitive" } },
            { notes: { contains: searchQuery, mode: "insensitive" } },
            { billType: { name: { contains: searchQuery, mode: "insensitive" } } },
            { category: { name: { contains: searchQuery, mode: "insensitive" } } },
          ],
        }),
        // Category filter (applies to category or billType for non-CC) - multi-select
        ...(categoryIdFilters.length > 0 && {
          OR: [
            { categoryId: { in: categoryIdFilters } },
            { billTypeId: { in: categoryIdFilters }, billType: { isCreditCard: false } },
          ],
        }),
        // Card filter (only CC bills) - multi-select
        ...(cardIdFilters.length > 0 && {
          billTypeId: { in: cardIdFilters },
          billType: { isCreditCard: true },
        }),
      },
      include: { billType: true, category: true, assignments: true },
      orderBy: { budgetDate: "asc" },
    }),
    // Get all bill types for filter options (include organizationId for grouping)
    prisma.billType.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true, name: true, color: true, icon: true, isCreditCard: true, organizationId: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Separate categories and cards for filter UI (include organizationId for grouping)
  const availableCategories = allBillTypes
    .filter(bt => !bt.isCreditCard)
    .map(bt => ({ id: bt.id, name: bt.name, color: bt.color || undefined, icon: bt.icon, organizationId: bt.organizationId }))
  const availableCards = allBillTypes
    .filter(bt => bt.isCreditCard)
    .map(bt => ({ id: bt.id, name: bt.name, color: bt.color || undefined, icon: bt.icon, organizationId: bt.organizationId }))

  // Prepare organizations for filter UI
  const organizations = userOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))

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
      id: string; label: string; amount: number; amountUSD: number | null; paymentDate: string
      cardName: string | null; currentInstallment: number | null; totalInstallments: number | null
      myShare: number | null; isShared: boolean
    }>
  }>()

  for (const bill of bills) {
    let catName: string, catColor: string, catIcon: string | null
    if (bill.billType.isCreditCard && bill.category) {
      catName  = bill.category.name
      catColor = bill.category.color || "#6b7280"
      catIcon  = bill.category.icon  || null
    } else if (bill.billType.isCreditCard && !bill.category) {
      catName  = "Sin categoría"
      catColor = "#9D8189"
      catIcon  = null
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
    const myAssignment = bill.assignments.find(a => a.userId === session.user.id!)
    const isShared = bill.assignments.length > 0
    const myShare = myAssignment ? Number(bill.amount) * (Number(myAssignment.percentage) / 100) : null
    g.bills.push({
      id: bill.id,
      label: bill.label,
      amount: Number(bill.amount),
      amountUSD: billUSD,
      paymentDate: format(new Date(bill.paymentDate), "d MMM"),
      cardName: bill.billType.isCreditCard ? bill.billType.name : null,
      currentInstallment: bill.currentInstallment,
      totalInstallments: bill.totalInstallments,
      myShare,
      isShared,
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
      searchQuery={searchQuery}
      activeFilters={{ categoryIds: categoryIdFilters, cardIds: cardIdFilters }}
      availableCategories={availableCategories}
      availableCards={availableCards}
      organizations={organizations}
      currentUserId={session.user.id!}
    />
  )
}
