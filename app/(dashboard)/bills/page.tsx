import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { BillsContent } from "@/components/bills/bills-content";
import type { Prisma } from "@prisma/client";

type BillWithRelations = Prisma.BillGetPayload<{
  include: {
    billType: true;
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

export default async function BillsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>;
  }

  const params = await searchParams;
  const selectedMonth = params.month;
  const selectedCategory = params.category;

  // Get available months (months with expenses - using budgetDate for budget impact)
  const monthsWithExpenses = await prisma.bill.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
    },
    select: {
      budgetDate: true,
    },
  });

  const availableMonthsSet = new Set<string>();
  for (const bill of monthsWithExpenses) {
    availableMonthsSet.add(format(new Date(bill.budgetDate), "yyyy-MM"));
  }
  const availableMonths = Array.from(availableMonthsSet).sort().reverse();

  // Get all categories for the organization
  const categories = await prisma.billType.findMany({
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
  const whereClause: Prisma.BillWhereInput = {
    organizationId: session.user.currentOrganizationId,
  };

  if (selectedMonth) {
    const targetDate = parse(selectedMonth, "yyyy-MM", new Date());
    whereClause.budgetDate = {
      gte: startOfMonth(targetDate),
      lte: endOfMonth(targetDate),
    };
  }

  if (selectedCategory) {
    whereClause.billTypeId = selectedCategory;
  }

  const bills: BillWithRelations[] = await prisma.bill.findMany({
    where: whereClause,
    include: {
      billType: true,
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
      budgetDate: "desc",
    },
  });

  return (
    <BillsContent
      bills={bills.map((bill) => ({
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        paymentDate: format(new Date(bill.paymentDate), "MMM d, yyyy"),
        budgetDate: format(new Date(bill.budgetDate), "MMM d, yyyy"),
        dueDate: bill.dueDate ? format(new Date(bill.dueDate), "MMM d, yyyy") : null,
        notes: bill.notes,
        totalInstallments: bill.totalInstallments,
        currentInstallment: bill.currentInstallment,
        installmentGroupId: bill.installmentGroupId,
        billType: {
          id: bill.billType.id,
          name: bill.billType.name,
          color: bill.billType.color,
          icon: bill.billType.icon,
          isCreditCard: bill.billType.isCreditCard,
        },
        user: {
          name: bill.user.name,
        },
        assignments: bill.assignments.map((a) => ({
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
