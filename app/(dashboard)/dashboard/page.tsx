import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
import { startOfMonth, endOfMonth, subMonths, format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { HomeDashboard, SpaceData } from "@/components/dashboard/home-dashboard"
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner"

interface PageProps { searchParams: Promise<{ month?: string }> }

/** Available months across all user orgs — cache 5 min. */
const getAvailableMonths = unstable_cache(
  async (userId: string) => {
    const userOrgs = await prisma.userOrganization.findMany({ where: { userId }, select: { organizationId: true } })
    const orgIds = userOrgs.map(o => o.organizationId)
    const [allBills, allIncomes] = await Promise.all([
      prisma.bill.findMany({ where: { organizationId: { in: orgIds } }, select: { budgetDate: true } }),
      prisma.income.findMany({ where: { organizationId: { in: orgIds } }, select: { incomeDate: true } }),
    ])
    const monthSet = new Set<string>()
    for (const b of allBills) monthSet.add(format(new Date(b.budgetDate), "yyyy-MM"))
    for (const i of allIncomes) monthSet.add(format(new Date(i.incomeDate), "yyyy-MM"))
    return Array.from(monthSet).sort().reverse()
  },
  ["available-months"],
  { revalidate: 300 }
)

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>
  const userId = session.user.id

  const params = await searchParams
  const now = new Date()
  const targetDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : now
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  // All user orgs (ordered by join date so the primary space comes first)
  const userOrgs = await prisma.userOrganization.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, isPersonal: true } } },
    orderBy: { joinedAt: "asc" },
  })

  // Last month range for insights
  const lastMonthStart = startOfMonth(subMonths(targetDate, 1))
  const lastMonthEnd = endOfMonth(subMonths(targetDate, 1))

  // Parallel: available months + per-org data + onboarding + checklist + last month total
  const allOrgIds = userOrgs.map(uo => uo.organization.id)
  const [availableMonths, allOrgData, userRecord, checklistRaw, lastMonthBills] = await Promise.all([
    getAvailableMonths(userId),
    Promise.all(userOrgs.map(uo => Promise.all([
      prisma.bill.findMany({
        where: { organizationId: uo.organizationId, budgetDate: { gte: monthStart, lte: monthEnd } },
        include: { billType: true, category: { select: { name: true } }, assignments: { include: { user: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.income.findMany({
        where: { organizationId: uo.organizationId, incomeDate: { gte: monthStart, lte: monthEnd } },
        include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
      }),
      prisma.userOrganization.findMany({
        where: { organizationId: uo.organizationId },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]))),
    prisma.user.findUnique({ where: { id: userId }, select: { onboardingSeenAt: true } }),
    Promise.all([
      prisma.bill.count({ where: { userId } }),
      prisma.userOrganization.count({ where: { organizationId: { in: allOrgIds }, userId: { not: userId } } }),
      prisma.billType.count({ where: { organizationId: { in: allOrgIds }, isCreditCard: true } }),
      prisma.bill.count({ where: { userId, externalRef: { not: null } } }),
    ]),
    prisma.bill.findMany({
      where: { organizationId: { in: allOrgIds }, budgetDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { amount: true, billType: { select: { name: true } } },
    }),
  ])

  // Build SpaceData per org
  const spaces: SpaceData[] = userOrgs.map((uo, i) => {
    const [bills, incomes, orgMembers] = allOrgData[i]
    const org = uo.organization

    const memberIncomeMap = new Map<string, { name: string; income: number }>()
    for (const member of orgMembers) memberIncomeMap.set(member.userId, { name: member.user.name || "Usuario", income: 0 })
    for (const income of incomes) for (const a of income.assignments) { const share = (Number(income.amount) * Number(a.percentage)) / 100; const m = memberIncomeMap.get(a.userId); if (m) m.income += share }
    const totalIncome = Array.from(memberIncomeMap.values()).reduce((s, m) => s + m.income, 0)

    const memberExpenseMap = new Map<string, number>()
    for (const member of orgMembers) memberExpenseMap.set(member.userId, 0)
    for (const bill of bills) {
      const amount = Number(bill.amount)
      if (bill.assignments.length === 0) { const share = amount / orgMembers.length; for (const member of orgMembers) memberExpenseMap.set(member.userId, (memberExpenseMap.get(member.userId) || 0) + share) }
      else for (const a of bill.assignments) { const share = (amount * Number(a.percentage)) / 100; memberExpenseMap.set(a.userId, (memberExpenseMap.get(a.userId) || 0) + share) }
    }

    const members = Array.from(memberIncomeMap.entries()).map(([id, data]) => ({ id, name: data.name, expenses: memberExpenseMap.get(id) || 0, income: data.income, percentage: totalIncome > 0 ? (data.income / totalIncome) * 100 : 0 }))
    const totalAmount = bills.reduce((s, b) => s + Number(b.amount), 0)

    const creditCardGroupMap = new Map<string, { name: string; color: string; icon: string | null; bank: string | null; bills: typeof bills }>()
    for (const bill of bills.filter(b => b.billType.isCreditCard)) {
      if (!creditCardGroupMap.has(bill.billTypeId)) creditCardGroupMap.set(bill.billTypeId, { name: bill.billType.name, color: bill.billType.color || "#f59e0b", icon: bill.billType.icon || null, bank: bill.billType.bank || null, bills: [] })
      creditCardGroupMap.get(bill.billTypeId)!.bills.push(bill)
    }

    const creditCardGroups = Array.from(creditCardGroupMap.values()).map((group) => {
      const memberAmountMap = new Map<string, { name: string; amount: number }>()
      for (const member of orgMembers) memberAmountMap.set(member.userId, { name: memberIncomeMap.get(member.userId)?.name || "", amount: 0 })
      for (const bill of group.bills) {
        const amount = Number(bill.amount)
        if (bill.assignments.length === 0) { const share = amount / orgMembers.length; for (const member of orgMembers) { const m = memberAmountMap.get(member.userId)!; m.amount += share } }
        else for (const a of bill.assignments) { const share = (amount * Number(a.percentage)) / 100; const m = memberAmountMap.get(a.userId); if (m) m.amount += share }
      }
      return { name: group.name, color: group.color, icon: group.icon, bank: group.bank, totalAmount: group.bills.reduce((s, b) => s + Number(b.amount), 0), memberAmounts: Array.from(memberAmountMap.values()).filter(m => m.amount > 0) }
    })

    return {
      id: org.id,
      name: org.name,
      isPersonal: org.isPersonal,
      totalAmount,
      members,
      // All bills (CC + non-CC) — shown in "Gastos recientes" section
      recentExpenses: bills.map(b => ({
        id: b.id,
        label: b.label,
        amount: Number(b.amount),
        billTypeName: b.billType.name,
        billTypeColor: b.billType.color || "#6b7280",
        billTypeIcon: b.billType.icon || null,
        isCreditCard: b.billType.isCreditCard,
      })),
      creditCardGroups,
    }
  })

  // ── Build rotating insights array ──
  const thisMonthTotal = spaces.reduce((s, sp) => s + sp.totalAmount, 0)
  const lastMonthTotal = lastMonthBills.reduce((s, b) => s + Number(b.amount), 0)

  // Top category (skips CC card names)
  const catTotals = new Map<string, { name: string; amount: number }>()
  for (const [bills] of allOrgData) {
    for (const bill of bills) {
      const name = bill.billType.isCreditCard ? (bill.category?.name ?? null) : bill.billType.name
      if (!name) continue
      const cur = catTotals.get(name) ?? { name, amount: 0 }
      catTotals.set(name, { name, amount: cur.amount + Number(bill.amount) })
    }
  }
  const topCategory = catTotals.size > 0
    ? [...catTotals.values()].sort((a, b) => b.amount - a.amount)[0]
    : null

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n))

  const insightStrings: string[] = []

  if (thisMonthTotal === 0) {
    insightStrings.push("Todavía no hay gastos este mes. ¿Empezamos a registrar?")
  } else {
    // 1. Total del mes
    insightStrings.push(`Llevás ${fmt(thisMonthTotal)} en gastos este mes.`)

    // 2. Comparación con mes anterior
    if (lastMonthTotal > 0) {
      const pct = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      if (pct > 10)       insightStrings.push(`Gastás un ${pct}% más que el mes pasado.`)
      else if (pct < -10) insightStrings.push(`Gastás un ${Math.abs(pct)}% menos que el mes pasado.`)
      else                insightStrings.push(`Gastos similares al mes pasado (${pct > 0 ? "+" : ""}${pct}%).`)
    }

    // 3. Categoría líder
    if (topCategory) {
      insightStrings.push(`${topCategory.name} es tu categoría más grande: ${fmt(topCategory.amount)}.`)
    }

    // 4. Total en tarjetas de crédito
    const ccTotal = spaces.reduce((s, sp) => s + sp.creditCardGroups.reduce((cs, g) => cs + g.totalAmount, 0), 0)
    if (ccTotal > 0 && ccTotal < thisMonthTotal) {
      insightStrings.push(`En tarjetas de crédito llevás ${fmt(ccTotal)} este mes.`)
    }

    // 5. Por miembro (espacios compartidos)
    for (const space of spaces) {
      if (!space.isPersonal && space.members.length > 1) {
        for (const member of space.members) {
          if (member.id !== userId && member.expenses > 0) {
            insightStrings.push(`${member.name.split(" ")[0]} lleva ${fmt(member.expenses)} en gastos este mes.`)
          }
        }
      }
    }

    // 6. Gasto más grande del mes
    const allExpenses = spaces.flatMap(sp => sp.recentExpenses)
    if (allExpenses.length > 0) {
      const biggest = allExpenses.reduce((max, e) => e.amount > max.amount ? e : max, allExpenses[0])
      insightStrings.push(`Tu gasto más grande fue "${biggest.label}" (${fmt(biggest.amount)}).`)
    }
  }

  const TEST_EMAILS = ["test-cards@tortuguita.app"]
  const isTestUser = !!(session.user.email && TEST_EMAILS.includes(session.user.email))
  const showOnboarding = isTestUser || !userRecord?.onboardingSeenAt
  const [billCount, extraMemberCount, creditCardCount, importedBillCount] = checklistRaw
  const checklistData = {
    hasBills: billCount > 0,
    hasExtraMember: extraMemberCount > 0,
    hasCreditCard: creditCardCount > 0,
    hasImportedBill: importedBillCount > 0,
  }

  return (
    <>
    <PwaInstallBanner />
    <HomeDashboard
      month={format(monthStart, "MMMM yyyy", { locale: es })}
      monthKey={format(monthStart, "yyyy-MM")}
      availableMonths={availableMonths}
      spaces={spaces}
      currentUserId={userId}
      showOnboarding={showOnboarding}
      checklistData={checklistData}
      insights={{ insights: insightStrings }}
    />
    </>
  )
}
