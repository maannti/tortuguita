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

  if (!session?.user?.currentOrganizationId || !session?.user?.id) {
    return <div>Unauthorized</div>;
  }

  const currentUserId = session.user.id;
  const params = await searchParams;
  const selectedMonth = params.month;

  // Get available months (months with expenses or incomes)
  const [monthsWithExpenses, monthsWithIncomes] = await Promise.all([
    prisma.bill.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      select: {
        paymentDate: true,
      },
      distinct: ["paymentDate"],
    }),
    prisma.income.findMany({
      where: {
        organizationId: session.user.currentOrganizationId,
      },
      select: {
        incomeDate: true,
      },
      distinct: ["incomeDate"],
    }),
  ]);

  const availableMonthsSet = new Set<string>();
  for (const bill of monthsWithExpenses) {
    availableMonthsSet.add(format(new Date(bill.paymentDate), "yyyy-MM"));
  }
  for (const income of monthsWithIncomes) {
    availableMonthsSet.add(format(new Date(income.incomeDate), "yyyy-MM"));
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
      organizationId: session.user.currentOrganizationId,
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
      organizationId: session.user.currentOrganizationId,
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
      organizationId: session.user.currentOrganizationId,
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
      organizationId: session.user.currentOrganizationId,
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

  // Average monthly spending (last 6 months)
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));
  const sixMonthTotal = await prisma.bill.aggregate({
    where: {
      organizationId: session.user.currentOrganizationId,
      paymentDate: {
        gte: sixMonthsAgo,
        lte: endOfMonth(now),
      },
    },
    _sum: {
      amount: true,
    },
  });
  const averageMonthly = Number(sixMonthTotal._sum.amount || 0) / 6;

  // User distribution (bills with assignments)
  const billsWithAssignments = await prisma.bill.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
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

  // Fetch incomes with assignments for the current month
  const incomesWithAssignments = await prisma.income.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
      incomeDate: {
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

  // Calculate income distribution by user
  const userIncomeTotals = new Map<string, { name: string; total: number }>();
  let unassignedIncomeTotal = 0;

  for (const income of incomesWithAssignments) {
    const incomeAmount = Number(income.amount);

    if (income.assignments.length === 0) {
      unassignedIncomeTotal += incomeAmount;
    } else {
      for (const assignment of income.assignments) {
        const userShare = (incomeAmount * Number(assignment.percentage)) / 100;
        const usrId = assignment.user.id;
        const userName = assignment.user.name || "Unknown";

        if (userIncomeTotals.has(usrId)) {
          userIncomeTotals.get(usrId)!.total += userShare;
        } else {
          userIncomeTotals.set(usrId, { name: userName, total: userShare });
        }
      }
    }
  }

  // Calculate balance for each user (income - expenses)
  const allUserIds = new Set<string>();
  for (const [userId] of userTotals) allUserIds.add(userId);
  for (const [userId] of userIncomeTotals) allUserIds.add(userId);

  const userBalances = new Map<string, { name: string; income: number; expenses: number; balance: number }>();

  for (const userId of allUserIds) {
    const expenseData = userTotals.get(userId);
    const incomeData = userIncomeTotals.get(userId);

    const name = expenseData?.name || incomeData?.name || "Unknown";
    const expenses = expenseData?.total || 0;
    const income = incomeData?.total || 0;
    const balance = income - expenses;

    userBalances.set(userId, { name, income, expenses, balance });
  }

  // Current user's balance data
  const currentUserBalance = userBalances.get(currentUserId) || {
    name: session.user.name || "You",
    income: 0,
    expenses: 0,
    balance: 0,
  };

  // Balance comparison data for all users
  const balanceComparisonData = Array.from(userBalances.entries()).map(([, data], index) => ({
    name: data.name,
    income: data.income,
    expenses: data.expenses,
    balance: data.balance,
    color: userColors[index % userColors.length],
  }));

  // Recent bills
  const recentBills: BillWithRelations[] = await prisma.bill.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
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
      currentUserBalance={currentUserBalance}
      balanceComparisonData={balanceComparisonData}
    />
  );
}
