import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format, parse } from "date-fns";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { Prisma } from "@prisma/client";

type BillWithRelations = Prisma.BillGetPayload<{
  include: {
    billType: true;
    user: {
      select: {
        name: true;
      };
    };
  };
}>;

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>;
  }

  const params = await searchParams;
  const selectedMonth = params.month;

  // Get available months (months with expenses)
  const monthsWithExpenses = await prisma.bill.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      paymentDate: true,
    },
    distinct: ["paymentDate"],
  });

  const availableMonthsSet = new Set<string>();
  for (const bill of monthsWithExpenses) {
    availableMonthsSet.add(format(new Date(bill.paymentDate), "yyyy-MM"));
  }
  const availableMonths = Array.from(availableMonthsSet).sort().reverse();

  const now = new Date();

  // Determine the target month based on filter
  const targetDate = selectedMonth ? parse(selectedMonth, "yyyy-MM", new Date()) : now;

  const currentMonthStart = startOfMonth(targetDate);
  const currentMonthEnd = endOfMonth(targetDate);
  const lastMonthStart = startOfMonth(subMonths(targetDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(targetDate, 1));

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
  });

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
  });

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
  });

  const billTypes = await prisma.billType.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
  });

  const categoryData = categoryBreakdown.map((item) => {
    const billType = billTypes.find((bt) => bt.id === item.billTypeId);
    return {
      name: billType?.name || "Unknown",
      value: Number(item._sum.amount || 0),
      color: billType?.color || "#3b82f6",
    };
  });

  // Monthly trend (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

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
    });

    monthlyData.push({
      month: format(monthDate, "MMM yyyy"),
      amount: Number(monthTotal._sum.amount || 0),
    });
  }

  // Average monthly spending
  const totalSpent = monthlyData.reduce((sum, month) => sum + month.amount, 0);
  const averageMonthly = totalSpent / monthlyData.length;

  // User distribution (bills with assignments)
  const billsWithAssignments = await prisma.bill.findMany({
    where: {
      organizationId: session.user.organizationId,
      paymentDate: {
        gte: currentMonthStart,
        lte: currentMonthEnd,
      },
    },
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Calculate user distribution
  const userTotals = new Map<string, { name: string; total: number }>();
  let unassignedTotal = 0;

  for (const bill of billsWithAssignments) {
    const billAmount = Number(bill.amount);

    if (bill.assignments.length === 0) {
      unassignedTotal += billAmount;
    } else {
      for (const assignment of bill.assignments) {
        const userShare = (billAmount * Number(assignment.percentage)) / 100;
        const usrId = assignment.user.id;
        const userName = assignment.user.name || "Unknown";

        if (userTotals.has(usrId)) {
          userTotals.get(usrId)!.total += userShare;
        } else {
          userTotals.set(usrId, { name: userName, total: userShare });
        }
      }
    }
  }

  // Generate colors for users
  const userColors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f97316",
    "#14b8a6",
    "#a855f7",
    "#84cc16",
  ];

  const userDistributionData = Array.from(userTotals.entries()).map(([, data], index) => ({
    name: data.name,
    value: data.total,
    color: userColors[index % userColors.length],
  }));

  if (unassignedTotal > 0) {
    userDistributionData.push({
      name: "Unassigned",
      value: unassignedTotal,
      color: "#6b7280",
    });
  }

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
  });

  const currentTotal = Number(currentMonthTotal._sum.amount || 0);
  const lastTotal = Number(lastMonthTotal._sum.amount || 0);
  const percentageChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

  return (
    <DashboardContent
      currentTotal={currentTotal}
      lastTotal={lastTotal}
      percentageChange={percentageChange}
      averageMonthly={averageMonthly}
      categoryCount={categoryBreakdown.length}
      categoryData={categoryData}
      monthlyData={monthlyData}
      userDistributionData={userDistributionData}
      recentBills={recentBills.map((bill) => ({
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        paymentDate: format(new Date(bill.paymentDate), "MMM d, yyyy"),
        billType: {
          name: bill.billType.name,
          color: bill.billType.color,
          icon: bill.billType.icon,
        },
        user: { name: bill.user.name },
      }))}
      currentMonthLabel={format(currentMonthStart, "MMM yyyy")}
      availableMonths={availableMonths}
    />
  );
}
