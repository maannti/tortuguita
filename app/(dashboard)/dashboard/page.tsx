import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart"
import { MonthlyTrendChart } from "@/components/dashboard/monthly-trend-chart"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import type { Prisma } from "@prisma/client"

type BillWithRelations = Prisma.BillGetPayload<{
  include: {
    billType: true
    user: {
      select: {
        name: true
      }
    }
  }
}>

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const now = new Date()
  const currentMonthStart = startOfMonth(now)
  const currentMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const sixMonthsAgo = subMonths(now, 6)

  // Total spent this month
  const currentMonthTotal = await prisma.bill.aggregate({
    where: {
      organizationId: session.user.organizationId,
      paymentDate: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    _sum: {
      amount: true,
    },
  })

  // Last month total for comparison
  const lastMonthTotal = await prisma.bill.aggregate({
    where: {
      organizationId: session.user.organizationId,
      paymentDate: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
    },
    _sum: {
      amount: true,
    },
  })

  // Category breakdown
  const categoryBreakdown = await prisma.bill.groupBy({
    by: ["billTypeId"],
    where: {
      organizationId: session.user.organizationId,
      paymentDate: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    _sum: {
      amount: true,
    },
  })

  const billTypes = await prisma.billType.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  })

  const categoryData = categoryBreakdown.map((item) => {
    const billType = billTypes.find((bt) => bt.id === item.billTypeId)
    return {
      name: billType?.name || "Unknown",
      value: Number(item._sum.amount || 0),
      color: billType?.color || "#3b82f6",
    }
  })

  // Monthly trend (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

    const monthTotal = await prisma.bill.aggregate({
      where: {
        organizationId: session.user.organizationId,
        paymentDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        amount: true,
      },
    })

    monthlyData.push({
      month: format(monthDate, "MMM yyyy"),
      amount: Number(monthTotal._sum.amount || 0),
    })
  }

  // Average monthly spending
  const totalSpent = monthlyData.reduce((sum, month) => sum + month.amount, 0)
  const averageMonthly = totalSpent / monthlyData.length

  // Recent bills
  const recentBills: BillWithRelations[] = await prisma.bill.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    include: {
      billType: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      paymentDate: "desc",
    },
    take: 5,
  })

  const currentTotal = Number(currentMonthTotal._sum.amount || 0)
  const lastTotal = Number(lastMonthTotal._sum.amount || 0)
  const percentageChange = lastTotal > 0
    ? ((currentTotal - lastTotal) / lastTotal) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your expense tracking overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(currentMonthStart, "MMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              vs Last Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {percentageChange > 0 ? (
                <>
                  <ArrowUpIcon className="h-4 w-4 text-red-500" />
                  <div className="text-2xl font-bold text-red-500">
                    +{percentageChange.toFixed(1)}%
                  </div>
                </>
              ) : percentageChange < 0 ? (
                <>
                  <ArrowDownIcon className="h-4 w-4 text-green-500" />
                  <div className="text-2xl font-bold text-green-500">
                    {percentageChange.toFixed(1)}%
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold">0%</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last month: ${lastTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              6-Month Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageMonthly.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryBreakdown.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <CategoryBreakdownChart data={categoryData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No expenses this month
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={monthlyData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bills</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/bills">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentBills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No bills yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {bill.billType.icon && (
                      <span className="text-2xl">{bill.billType.icon}</span>
                    )}
                    {!bill.billType.icon && bill.billType.color && (
                      <div
                        className="h-8 w-8 rounded-full"
                        style={{ backgroundColor: bill.billType.color }}
                      />
                    )}
                    <div>
                      <p className="font-medium">{bill.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(bill.paymentDate), "MMM d, yyyy")} •{" "}
                        {bill.billType.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Number(bill.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {bill.user.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
