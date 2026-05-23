import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// GET /api/shared-balance?organizationId=xxx&month=2026-05
// Returns pairwise debts for the current user within a shared space
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const organizationId = searchParams.get("organizationId")
  const month = searchParams.get("month") // "YYYY-MM"

  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 })

  // Verify user belongs to this org
  const membership = await prisma.userOrganization.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
  })
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Get all members of the org
  const members = await prisma.userOrganization.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  // Build date range filter (UTC-based so bills stored at midnight UTC are included)
  let dateFilter: { gte: Date; lt: Date } | undefined
  if (month) {
    const [y, m] = month.split("-").map(Number)
    dateFilter = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    }
  }

  // Fetch all shared bills in this org (bills with assignments to multiple users)
  // Use budgetDate for filtering (consistent with how bills are displayed in the bills list)
  const bills = await prisma.bill.findMany({
    where: {
      organizationId,
      ...(dateFilter ? { budgetDate: dateFilter } : {}),
      assignments: { some: {} }, // only bills with at least one assignment
    },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true } } },
      },
      user: { select: { id: true, name: true } },
      paidByUser: { select: { id: true, name: true } },
      billType: { select: { name: true, color: true, icon: true, isCreditCard: true } },
      category: { select: { name: true, color: true, icon: true } },
    },
    orderBy: { paymentDate: "desc" },
  })

  // Only include bills that are truly shared: at least one assignment to someone other than the payer
  const sharedBills = bills.filter(b => {
    const payerId = b.paidByUserId ?? b.userId
    return b.assignments.some(a => a.userId !== payerId)
  })

  // Build pairwise debt map: debtMap[debtorId][creditorId] = { amount, bills[] }
  type DebtEntry = {
    amount: number
    bills: {
      id: string
      label: string
      amount: number
      paymentDate: string
      percentage: number
      isSettled: boolean
      settledAt: string | null
      categoryName: string | null
      categoryColor: string | null
      payerName: string
      payerId: string
      debtorId: string
    }[]
  }
  const debtMap: Record<string, Record<string, DebtEntry>> = {}

  for (const bill of sharedBills) {
    const payerId = bill.paidByUserId ?? bill.userId
    const billAmount = Number(bill.amount)

    for (const assignment of bill.assignments) {
      if (assignment.userId === payerId) continue // payer doesn't owe themselves

      const debtorId = assignment.userId
      const percentage = Number(assignment.percentage)
      const debtAmount = (billAmount * percentage) / 100

      if (!debtMap[debtorId]) debtMap[debtorId] = {}
      if (!debtMap[debtorId][payerId]) debtMap[debtorId][payerId] = { amount: 0, bills: [] }

      // Only count unsettled amounts in totals
      if (!assignment.isSettled) debtMap[debtorId][payerId].amount += debtAmount
      debtMap[debtorId][payerId].bills.push({
        id: bill.id,
        label: bill.label,
        amount: debtAmount,
        paymentDate: bill.paymentDate.toISOString(),
        percentage,
        isSettled: assignment.isSettled,
        settledAt: assignment.settledAt?.toISOString() ?? null,
        categoryName: bill.category?.name ?? bill.billType.name,
        categoryColor: bill.category?.color ?? bill.billType.color ?? null,
        payerName: bill.paidByUser?.name ?? bill.user.name ?? "—",
        payerId,
        debtorId,
      })
    }
  }

  // Build member list
  const memberList = members.map(m => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email ?? "—",
  }))

  // Calculate net balance per member pair (from current user's perspective)
  // Also return the full debtMap for the detailed view
  const currentUserId = session.user.id

  // What others owe me
  const owedToMe: Record<string, { memberId: string; memberName: string; netAmount: number; bills: DebtEntry["bills"] }> = {}
  // What I owe others
  const iOwe: Record<string, { memberId: string; memberName: string; netAmount: number; bills: DebtEntry["bills"] }> = {}

  for (const member of memberList) {
    if (member.id === currentUserId) continue

    const theyOweMe = debtMap[member.id]?.[currentUserId]?.amount ?? 0
    const iOweThem = debtMap[currentUserId]?.[member.id]?.amount ?? 0

    if (theyOweMe > 0) {
      owedToMe[member.id] = {
        memberId: member.id,
        memberName: member.name,
        netAmount: theyOweMe,
        bills: debtMap[member.id]?.[currentUserId]?.bills ?? [],
      }
    }
    if (iOweThem > 0) {
      iOwe[member.id] = {
        memberId: member.id,
        memberName: member.name,
        netAmount: iOweThem,
        bills: debtMap[currentUserId]?.[member.id]?.bills ?? [],
      }
    }
  }

  const totalOwedToMe = Object.values(owedToMe).reduce((s, v) => s + v.netAmount, 0)
  const totalIOwe = Object.values(iOwe).reduce((s, v) => s + v.netAmount, 0)

  // Progress: settled vs total non-payer assignments across all shared bills
  const relevantAssignments = sharedBills.flatMap(b => {
    const payerId = b.paidByUserId ?? b.userId
    return b.assignments.filter(a => a.userId !== payerId)
  })
  const settledCount = relevantAssignments.filter(a => a.isSettled).length
  const totalCount = relevantAssignments.length

  return NextResponse.json({
    members: memberList,
    owedToMe: Object.values(owedToMe),
    iOwe: Object.values(iOwe),
    totalOwedToMe,
    totalIOwe,
    settledCount,
    totalCount,
  })
}
