import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TarjetasWalletView, CardData } from "@/components/tarjetas/tarjetas-wallet-view"
import { format, parse, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { getUserOrganizations } from "@/lib/organization-utils"
import { cookies } from "next/headers"

type InstallmentBillSummary = {
  id: string; amount: number; amountUSD: number | null; budgetDate: string; paymentDate: string; currentInstallment: number; isPast: boolean; isPaid: boolean; isCurrentMonth: boolean
}
type InstallmentGroup = {
  groupId: string; label: string; totalInstallments: number; minInstallment: number; bills: InstallmentBillSummary[]; memberNames: string[]
  categoryName: string | null; categoryColor: string | null; categoryIcon: string | null
}
type CardEntry = CardData

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

  // Smart default: when no month param, show the month of the nearest upcoming dueDate.
  // This reflects the user's mental model: "what will I pay next month?"
  // We need creditCardTypes early, so fetch them first.
  const creditCardTypesEarly = await prisma.billType.findMany({
    where: { organizationId: { in: allOrgIds }, isCreditCard: true },
    select: { currentDueDate: true },
  })

  let defaultDate = now
  let cycleLabel: string | null = null // e.g. "junio 2026"

  if (!params.month) {
    const dueDates = creditCardTypesEarly
      .map(ct => ct.currentDueDate ? new Date(ct.currentDueDate) : null)
      .filter((d): d is Date => d !== null)
    if (dueDates.length > 0) {
      // Use the latest due date month among all cards (usually all in the same month)
      const latestDue = new Date(Math.max(...dueDates.map(d => d.getTime())))
      defaultDate = latestDue
      cycleLabel = format(latestDue, "MMMM yyyy", { locale: es })
    }
  }

  const targetDate = params.month ? parse(params.month, "yyyy-MM", new Date()) : defaultDate
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
        category: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: [{ installmentGroupId: "asc" }, { currentInstallment: "asc" }],
    }),
    // Single CC bills in selected month (totalInstallments is nullable; NULL means single purchase)
    prisma.bill.findMany({
      where: {
        organizationId: { in: orgIds },
        billType: { isCreditCard: true },
        OR: [{ totalInstallments: null }, { totalInstallments: { lte: 1 } }],
        budgetDate: { gte: monthStart, lte: monthEnd },
      },
      include: {
        billType: true,
        category: true,
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.billType.findMany({
      where: { organizationId: { in: allOrgIds }, isCreditCard: true },
      select: { id: true, name: true, color: true, icon: true, bank: true, currentClosingDate: true, currentDueDate: true, nextClosingDate: true, nextDueDate: true },
      orderBy: { name: "asc" },
    }),
  ])

  // For each installment group found in this month, also fetch the full plan
  const currentMonthBillIds = new Set(installmentBills.map(b => b.id))
  const groupIds = [...new Set(installmentBills.map(b => b.installmentGroupId!))]
  const allGroupBills = groupIds.length > 0 ? await prisma.bill.findMany({
    where: { organizationId: { in: orgIds }, installmentGroupId: { in: groupIds } },
    select: { id: true, amount: true, amountUSD: true, budgetDate: true, paymentDate: true, currentInstallment: true, installmentGroupId: true, totalInstallments: true, label: true, isPaid: true },
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
        categoryName: bill.category?.name ?? null,
        categoryColor: bill.category?.color ?? null,
        categoryIcon: bill.category?.icon ?? null,
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
      amountUSD: bill.amountUSD ? Number(bill.amountUSD) : null,
      budgetDate: format(new Date(bill.budgetDate), "MMMM yyyy", { locale: es }),
      paymentDate: format(new Date(bill.paymentDate), "d MMM", { locale: es }),
      currentInstallment: bill.currentInstallment!,
      isPast: new Date(bill.budgetDate) < now,
      isPaid: bill.isPaid,
      isCurrentMonth: currentMonthBillIds.has(bill.id),
    })
  }

  const byCard = new Map<string, CardEntry>()
  for (const ct of creditCardTypes) {
    byCard.set(ct.id, {
      typeName: ct.name,
      typeColor: ct.color || "#f59e0b",
      typeIcon: ct.icon || null,
      typeBank: ct.bank || null,
      installmentGroups: [],
      singleBills: [],
      monthTotal: 0,
      closingDate: ct.currentClosingDate ? format(new Date(ct.currentClosingDate), "d MMM", { locale: es }) : null,
      dueDate: ct.currentDueDate ? format(new Date(ct.currentDueDate), "d MMM", { locale: es }) : null,
    })
  }

  // Track paymentDate per group (from the bill in the current month) for sorting
  const groupPaymentDate = new Map<string, Date>()
  for (const bill of installmentBills) {
    const cardData = byCard.get(bill.billTypeId)
    if (!cardData) continue
    const group = groupMap.get(bill.installmentGroupId!)
    if (!group) continue
    if (!cardData.installmentGroups.find((g) => g.groupId === group.groupId)) {
      cardData.installmentGroups.push(group)
      cardData.monthTotal += Number(bill.amount)
      groupPaymentDate.set(group.groupId, new Date(bill.paymentDate))
    }
  }
  // Sort installment groups by payment date of current month's bill
  for (const cardData of byCard.values()) {
    cardData.installmentGroups.sort((a, b) => {
      const da = groupPaymentDate.get(a.groupId)?.getTime() ?? 0
      const db = groupPaymentDate.get(b.groupId)?.getTime() ?? 0
      return da - db
    })
  }

  for (const bill of singleCCBills) {
    const cardData = byCard.get(bill.billTypeId)
    if (!cardData) continue
    cardData.singleBills.push({
      id: bill.id, label: bill.label, amount: Number(bill.amount),
      amountUSD: bill.amountUSD ? Number(bill.amountUSD) : null,
      budgetDate: format(new Date(bill.budgetDate), "MMMM yyyy", { locale: es }),
      paymentDate: format(new Date(bill.paymentDate), "d MMM", { locale: es }),
      isPaid: bill.isPaid,
      categoryName: bill.category?.name ?? null,
      categoryColor: bill.category?.color ?? null,
      categoryIcon: bill.category?.icon ?? null,
    })
    cardData.monthTotal += Number(bill.amount)
  }
  // Single bills already ordered by paymentDate asc from the query

  // Auto-roll: if current period expired AND next period is already configured, promote it silently
  const toRoll = creditCardTypes.filter(ct =>
    ct.currentDueDate && new Date(ct.currentDueDate) < now &&
    ct.nextClosingDate && ct.nextDueDate
  )
  if (toRoll.length > 0) {
    await Promise.all(toRoll.map(ct =>
      prisma.billType.update({
        where: { id: ct.id },
        data: {
          currentClosingDate: ct.nextClosingDate,
          currentDueDate: ct.nextDueDate,
          nextClosingDate: null,
          nextDueDate: null,
        },
      })
    ))
    // Update local copies so staleCards computation below is accurate
    for (const ct of creditCardTypes) {
      if (toRoll.find(r => r.id === ct.id)) {
        ct.currentClosingDate = ct.nextClosingDate
        ct.currentDueDate = ct.nextDueDate
        ct.nextClosingDate = null
        ct.nextDueDate = null
      }
    }
  }

  // Stale = current period still expired AND no next period was available to auto-roll
  const staleCards = creditCardTypes
    .filter(ct => ct.currentDueDate && new Date(ct.currentDueDate) < now)
    .map(ct => ({ id: ct.id, name: ct.name }))

  const monthKey = format(monthStart, "yyyy-MM")
  const currentIndex = availableMonths.indexOf(monthKey)

  return (
    <TarjetasWalletView
      cards={Array.from(byCard.values()).filter(c => c.installmentGroups.length > 0 || c.singleBills.length > 0)}
      monthLabel={format(monthStart, "MMMM yyyy", { locale: es })}
      monthKey={monthKey}
      prevMonth={currentIndex > 0 ? availableMonths[currentIndex - 1] : null}
      nextMonth={currentIndex < availableMonths.length - 1 ? availableMonths[currentIndex + 1] : null}
      cycleLabel={!params.month ? cycleLabel : null}
    />
  )
}
