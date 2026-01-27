import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { IncomesContent } from "@/components/incomes/incomes-content";
import type { Prisma } from "@prisma/client";

type IncomeWithRelations = Prisma.IncomeGetPayload<{
  include: {
    incomeType: true;
    user: {
      select: {
        name: true;
      };
    };
    assignments: {
      include: {
        user: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

interface PageProps {
  searchParams: Promise<{ month?: string; category?: string }>;
}

export default async function IncomesPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>;
  }

  const params = await searchParams;
  const selectedMonth = params.month;
  const selectedCategory = params.category;

  // Get available months (months with incomes)
  const monthsWithIncomes = await prisma.income.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
    },
    select: {
      incomeDate: true,
    },
    distinct: ["incomeDate"],
  });

  const availableMonthsSet = new Set<string>();
  for (const income of monthsWithIncomes) {
    availableMonthsSet.add(format(new Date(income.incomeDate), "yyyy-MM"));
  }
  const availableMonths = Array.from(availableMonthsSet).sort().reverse();

  // Get all categories for the organization
  const categories = await prisma.incomeType.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
    },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Build where clause with optional filters
  const whereClause: Prisma.IncomeWhereInput = {
    organizationId: session.user.currentOrganizationId,
  };

  if (selectedMonth) {
    const targetDate = parse(selectedMonth, "yyyy-MM", new Date());
    whereClause.incomeDate = {
      gte: startOfMonth(targetDate),
      lte: endOfMonth(targetDate),
    };
  }

  if (selectedCategory) {
    whereClause.incomeTypeId = selectedCategory;
  }

  const incomes: IncomeWithRelations[] = await prisma.income.findMany({
    where: whereClause,
    include: {
      incomeType: true,
      user: {
        select: {
          name: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      incomeDate: "desc",
    },
  });

  return (
    <IncomesContent
      incomes={incomes.map((income) => ({
        id: income.id,
        label: income.label,
        amount: Number(income.amount),
        incomeDate: format(new Date(income.incomeDate), "MMM d, yyyy"),
        notes: income.notes,
        incomeType: {
          id: income.incomeType.id,
          name: income.incomeType.name,
          color: income.incomeType.color,
          icon: income.incomeType.icon,
        },
        user: {
          name: income.user.name,
        },
        assignments: income.assignments.map((a) => ({
          id: a.id,
          percentage: Number(a.percentage),
          user: { name: a.user.name },
        })),
      }))}
      availableMonths={availableMonths}
      categories={categories}
    />
  );
}
