import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CuotasView } from "@/components/cuotas/cuotas-view"
import { format, parse, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { getUserOrganizations } from "@/lib/organization-utils"
import { cookies } from "next/headers"

type InstallmentBillSummary = {
  id: string; amount: number; budgetDate: string; currentInstallment: number; isPast: boolean
}
type InstallmentGroup = {
  groupId: string; label: string; totalInstallments: number; minInstallment: number; bills: InstallmentBillSummary[]; memberNames: string[]
}
type CardEntry = {
  typeName: string; typeColor: string; typeIcon: string | null
  installmentGroups: InstallmentGroup[]
  singleBills: Array<{ id: string; label: string; amount: number; budgetDate: string }>
  monthTotal: number
}

interface PageProps { searchParams: Promise<{ month?: string }> }

export default async function CuotasPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) return <div className="p-8 text-center text-muted-foreground">Sesión no válida. Volvé a iniciar sesión.</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const allOrgIds = userOrgs.map(o => o.id)
  const cookieStore = await cookies()
  const activeSpaceCookie = cookieStore.get("activeSpaceIds")?.value
  const activeIds = activeSpaceCookie ? activeSpaceCookie.split(",").filter(Boolean) : []
  const orgIds = activeIds.length > 0 ? allOrgIds.filter(id => activeIds.includes(id)) : allOrgIds

  const params = await searchParams

  const now = new Date()
  const targetDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : now
  const monthStart = startOfMonth(targetDate)
  const monthEnd = endOfMonth(targetDate)

  // Build a range of available months: 3 back, 12 ahead from today
  const availableMonths: string[] = []
  for (let i = -3; i <= 12; i++) {
    availableMonths.push(format(addMonths(startOfMonth(now), i), "yyyy-MM"))
  }

  const [installmentBills, singleCCBills, creditCardTypes] = await Promise.all([
    // All installment bills that overlap the selected month
    prisma.bill.findMany({
      where: {
        organizationId: { in: orgIds },
        totalInstallments: { gt: 1 },
        installmentGroupId: { not: null },
        budgetDate: { gte: monthStart, lte: monthEnd },
      },
      include: {
        billType: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: [{ installmentGroupId: "asc" }, { currentInstallment: "asc" }],
    }),
    // Single CC bills in selected month
    prisma.bill.findMany({
      where: {
        organizationId: { in: orgIds },
        billType: { isCreditCard: true },
        totalInstallments: { lte: 1 },
        budgetDate: { gte: monthStart, lte: monthEnd },
      },
      include: {
        billType: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { budgetDate: "asc" },
    }),
    prisma.billType.findMany({
      where: { organizationId: { in: allOrgIds }, isCreditCard: true },
      orderBy: { name: "asc" },
    }),
  ])

  // For each installment group found in this month, also fetch the full plan
  const groupIds = [...new Set(installmentBills.map(b => b.installmentGroupId!))]
  const allGroupBills = groupIds.length > 0 ? await prisma.bill.findMany({
    where: { organizationId: { in: orgIds }, installmentGroupId: { in: groupIds } },
    select: { id: true, amount: true, budgetDate: true, currentInstallment: true, installmentGroupId: true, totalInstallments: true, label: true },
    orderBy: { currentInstallment: "asc" },
  }) : []

  // Pre-compute minInstallment per group (to count cuotas paid before first DB record)
  const groupMinInstallment = new Map<string, number>()
  for (const bill of allGroupBills) {
    const gId = bill.installmentGroupId!
    const prev = groupMinInstallment.get(gId) ?? Infinity
    groupMinInstallment.set(gId, Math.min(prev, bill.currentInstallment!))
  }

  const groupMap = new Map<string, InstallmentGroup>()
  for (const bill of installmentBills) {
    const gId = bill.installmentGroupId!
    if (!groupMap.has(gId)) {
      groupMap.set(gId, {
        groupId: gId,
        label: bill.label,
        totalInstallments: bill.totalInstallments!,
        minInstallment: groupMinInstallment.get(gId) ?? 1,
        bills: [],
        memberNames: bill.assignments.map((a) => a.user.name || "").filter(Boolean),
      })
    }
  }

  // Populate each group with all its bills (for progress tracking)
  // isPast uses current time — not the selected month — so the progress bar is always accurate
  for (const bill of allGroupBills) {
    const group = groupMap.get(bill.installmentGroupId!)
    if (!group) continue
    group.bills.push({
      id: bill.id,
      amount: Number(bill.amount),
      budgetDate: format(new Date(bill.budgetDate), "MMMM yyyy", { locale: es }),
      currentInstallment: bill.currentInstallment!,
      isPast: new Date(bill.budgetDate) < now,
    })
  }

  const byCard = new Map<string, CardEntry>()
  for (const ct of creditCardTypes) {
    byCard.set(ct.id, { typeName: ct.name, typeColor: ct.color || "#f59e0b", typeIcon: ct.icon || null, installmentGroups: [], singleBills: [], monthTotal: 0 })
  }

  for (const bill of installmentBills) {
    const cardData = byCard.get(bill.billTypeId)
    if (!cardData) continue
    const group = groupMap.get(bill.installmentGroupId!)
    if (!group) continue
    if (!cardData.installmentGroups.find((g) => g.groupId === group.groupId)) {
      cardData.installmentGroups.push(group)
      cardData.monthTotal += Number(bill.amount)
    }
  }
  for (const bill of singleCCBills) {
    const cardData = byCard.get(bill.billTypeId)
    if (!cardData) continue
    cardData.singleBills.push({ id: bill.id, label: bill.label, amount: Number(bill.amount), budgetDate: format(new Date(bill.budgetDate), "MMMM yyyy", { locale: es }) })
    cardData.monthTotal += Number(bill.amount)
  }

  const monthKey = format(monthStart, "yyyy-MM")
  const currentIndex = availableMonths.indexOf(monthKey)

  return (
    <CuotasView
      cards={Array.from(byCard.values()).filter(c => c.installmentGroups.length > 0 || c.singleBills.length > 0)}
      monthLabel={format(monthStart, "MMMM yyyy", { locale: es })}
      monthKey={monthKey}
      prevMonth={currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null}
      nextMonth={currentIndex > 0 ? availableMonths[currentIndex - 1] : null}
    />
  )
}
