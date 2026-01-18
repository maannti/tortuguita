import { prisma } from "@/lib/prisma";
import { billSchema } from "@/lib/validations/bill";
import { billTypeSchema } from "@/lib/validations/bill-type";
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from "date-fns";
import { Prisma } from "@prisma/client";

export async function handleToolCall(
  toolName: string,
  toolInput: any,
  userId: string,
  organizationId: string
) {
  switch (toolName) {
    case "create_bill":
      return await createBill(toolInput, userId, organizationId);

    case "create_category":
      return await createCategory(toolInput, organizationId);

    case "get_analytics":
      return await getAnalytics(toolInput, organizationId);

    case "search_bills":
      return await searchBills(toolInput, userId, organizationId);

    case "update_bill":
      return await updateBill(toolInput, organizationId);

    case "delete_bill":
      return await deleteBill(toolInput, organizationId);

    case "update_category":
      return await updateCategory(toolInput, organizationId);

    case "delete_category":
      return await deleteCategory(toolInput, organizationId);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function createBill(input: any, userId: string, organizationId: string) {
  try {
    console.log("createBill called with:", { input, userId, organizationId });

    // 1. Find category by name (case-insensitive)
    const categoryName = input.categoryName;
    const billType = await prisma.billType.findFirst({
      where: {
        organizationId,
        name: { equals: categoryName, mode: "insensitive" },
      },
    });

    console.log("Found billType:", billType);

    if (!billType) {
      // Category doesn't exist - return error with available categories
      const availableCategories = await prisma.billType.findMany({
        where: { organizationId },
        select: { name: true },
        take: 10,
      });

      console.log("Category not found. Available:", availableCategories);

      return {
        success: false,
        error: `Category "${categoryName}" doesn't exist. Available categories: ${availableCategories.map((c) => c.name).join(", ")}. Would you like me to create this category?`,
      };
    }

    // 2. Resolve userName to userId in assignments
    let resolvedAssignments: { userId: string; percentage: number }[] = [];
    if (input.assignments && input.assignments.length > 0) {
      // Fetch all users in organization
      const users = await prisma.user.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      });

      // Build map for efficient lookup (case-insensitive)
      const userMap = new Map<string, string>();
      users.forEach((u) => {
        if (u.name) {
          userMap.set(u.name.toLowerCase(), u.id);
        }
      });

      // Resolve each userName to userId
      for (const assignment of input.assignments) {
        const userId = userMap.get(assignment.userName.toLowerCase());

        if (!userId) {
          const availableUsers = users
            .filter((u) => u.name)
            .map((u) => u.name)
            .join(", ");

          return {
            success: false,
            error: `User "${assignment.userName}" not found. Available users: ${availableUsers}`,
          };
        }

        resolvedAssignments.push({
          userId,
          percentage: assignment.percentage,
        });
      }
    }

    // 3. Validate and create bill
    const billData = {
      label: input.label,
      amount: input.amount,
      paymentDate: new Date(input.paymentDate),
      billTypeId: billType.id,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      notes: input.notes,
      assignments: resolvedAssignments,
    };

    const validated = billSchema.parse(billData);

    // 4. Create bill with assignments
    const bill = await prisma.bill.create({
      data: {
        label: validated.label,
        amount: validated.amount,
        paymentDate: validated.paymentDate,
        dueDate: validated.dueDate || null,
        billTypeId: validated.billTypeId,
        notes: validated.notes,
        organizationId,
        userId,
        assignments: {
          create: validated.assignments?.map((a) => ({
            userId: a.userId,
            percentage: a.percentage,
          })),
        },
      },
      include: {
        billType: true,
        assignments: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    console.log("Bill created successfully:", bill.id);

    return {
      success: true,
      message: `Created bill: ${bill.label}`,
      bill: {
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        category: bill.billType.name,
        paymentDate: format(bill.paymentDate, "yyyy-MM-dd"),
        assignments: bill.assignments.map((a) => ({
          user: a.user.name,
          percentage: Number(a.percentage),
        })),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create bill",
    };
  }
}

async function createCategory(input: any, organizationId: string) {
  try {
    // Check if category exists
    const existing = await prisma.billType.findFirst({
      where: {
        organizationId,
        name: { equals: input.name, mode: "insensitive" },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Category "${input.name}" already exists.`,
      };
    }

    const validated = billTypeSchema.parse({
      name: input.name,
      description: input.description,
      color: input.color || "#3b82f6",
      icon: input.icon,
    });

    const category = await prisma.billType.create({
      data: {
        ...validated,
        organizationId,
      },
    });

    return {
      success: true,
      message: `Created category: ${category.name}`,
      category: {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create category",
    };
  }
}

async function getAnalytics(input: any, organizationId: string) {
  try {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine date range based on period
    switch (input.period) {
      case "current_month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "last_month":
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case "last_6_months":
        startDate = startOfMonth(subMonths(now, 6));
        endDate = endOfMonth(now);
        break;
      case "year_to_date":
        startDate = startOfYear(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Get total spending
    const total = await prisma.bill.aggregate({
      where: {
        organizationId,
        paymentDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    let breakdown: any[] = [];

    // Group by category or user based on groupBy
    if (input.groupBy === "category") {
      const grouped = await prisma.bill.groupBy({
        by: ["billTypeId"],
        where: {
          organizationId,
          paymentDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      const billTypes = await prisma.billType.findMany({
        where: { id: { in: grouped.map((g) => g.billTypeId) } },
      });

      breakdown = grouped.map((g) => {
        const bt = billTypes.find((b) => b.id === g.billTypeId);
        return {
          name: bt?.name || "Unknown",
          amount: Number(g._sum.amount || 0),
          percentage: total._sum.amount
            ? ((Number(g._sum.amount || 0) / Number(total._sum.amount)) * 100).toFixed(1)
            : "0",
        };
      });
    } else if (input.groupBy === "user") {
      // Get bills with assignments
      const billsWithAssignments = await prisma.bill.findMany({
        where: {
          organizationId,
          paymentDate: { gte: startDate, lte: endDate },
        },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      const userTotals = new Map<string, { name: string; amount: number }>();

      for (const bill of billsWithAssignments) {
        const billAmount = Number(bill.amount);
        for (const assignment of bill.assignments) {
          const userShare = (billAmount * Number(assignment.percentage)) / 100;
          const existing = userTotals.get(assignment.userId) || {
            name: assignment.user.name || "Unknown",
            amount: 0,
          };
          userTotals.set(assignment.userId, {
            name: existing.name,
            amount: existing.amount + userShare,
          });
        }
      }

      breakdown = Array.from(userTotals.values()).map((user) => ({
        name: user.name,
        amount: user.amount,
        percentage: total._sum.amount
          ? ((user.amount / Number(total._sum.amount)) * 100).toFixed(1)
          : "0",
      }));
    } else if (input.groupBy === "month") {
      // Get monthly breakdown for the period
      const monthlyData = [];
      let currentMonth = startDate;

      while (currentMonth <= endDate) {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const monthTotal = await prisma.bill.aggregate({
          where: {
            organizationId,
            paymentDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });

        monthlyData.push({
          name: format(currentMonth, "MMM yyyy"),
          amount: Number(monthTotal._sum.amount || 0),
        });

        currentMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() + 1));
      }

      breakdown = monthlyData;
    }

    return {
      success: true,
      analytics: {
        period: input.period,
        periodLabel: `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`,
        totalSpent: Number(total._sum.amount || 0),
        billCount: total._count,
        breakdown,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get analytics",
    };
  }
}

async function searchBills(input: any, userId: string, organizationId: string) {
  try {
    const where: Prisma.BillWhereInput = {
      organizationId,
    };

    // Filter by creator (bills user created/paid)
    if (input.createdByMe) {
      where.userId = userId;
    }

    // Filter by assigned user
    if (input.assignedToUser) {
      // Resolve userName to userId
      const user = await prisma.user.findFirst({
        where: {
          organizationId,
          name: { equals: input.assignedToUser, mode: "insensitive" },
        },
      });

      if (!user) {
        return {
          success: false,
          error: `User "${input.assignedToUser}" not found`,
        };
      }

      // Add assignment filter
      where.assignments = {
        some: {
          userId: user.id,
        },
      };
    }

    // Build filters
    if (input.categoryName) {
      const billType = await prisma.billType.findFirst({
        where: {
          organizationId,
          name: { contains: input.categoryName, mode: "insensitive" },
        },
      });
      if (billType) {
        where.billTypeId = billType.id;
      } else {
        return {
          success: false,
          error: `Category "${input.categoryName}" not found`,
        };
      }
    }

    if (input.startDate || input.endDate) {
      where.paymentDate = {};
      if (input.startDate) where.paymentDate.gte = new Date(input.startDate);
      if (input.endDate) where.paymentDate.lte = new Date(input.endDate);
    }

    if (input.minAmount || input.maxAmount) {
      where.amount = {};
      if (input.minAmount) where.amount.gte = input.minAmount;
      if (input.maxAmount) where.amount.lte = input.maxAmount;
    }

    if (input.searchText) {
      where.OR = [
        { label: { contains: input.searchText, mode: "insensitive" } },
        { notes: { contains: input.searchText, mode: "insensitive" } },
      ];
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        billType: true,
        user: { select: { name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      take: input.limit || 10,
    });

    return {
      success: true,
      bills: bills.map((b) => ({
        id: b.id,
        label: b.label,
        amount: Number(b.amount),
        category: b.billType.name,
        paymentDate: format(b.paymentDate, "MMM d, yyyy"),
        addedBy: b.user.name,
        notes: b.notes,
        assignments:
          b.assignments.length > 0
            ? b.assignments.map((a) => ({
                user: a.user.name,
                percentage: Number(a.percentage),
              }))
            : undefined, // Only include if there are assignments
      })),
      count: bills.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to search bills",
    };
  }
}

async function updateBill(input: any, organizationId: string) {
  try {
    // Get the existing bill
    const existingBill = await prisma.bill.findFirst({
      where: {
        id: input.billId,
        organizationId,
      },
      include: {
        billType: true,
      },
    });

    if (!existingBill) {
      return {
        success: false,
        error: "Bill not found",
      };
    }

    // Build update data
    const updateData: any = {};

    if (input.label) updateData.label = input.label;
    if (input.amount) updateData.amount = input.amount;
    if (input.paymentDate) updateData.paymentDate = new Date(input.paymentDate);
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Handle category change
    if (input.categoryName) {
      const billType = await prisma.billType.findFirst({
        where: {
          organizationId,
          name: { equals: input.categoryName, mode: "insensitive" },
        },
      });

      if (!billType) {
        return {
          success: false,
          error: `Category "${input.categoryName}" doesn't exist`,
        };
      }

      updateData.billTypeId = billType.id;
    }

    // Handle assignment updates
    if (input.assignments) {
      // Resolve userNames to userIds (same logic as createBill)
      const users = await prisma.user.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      });

      const userMap = new Map<string, string>();
      users.forEach((u) => {
        if (u.name) {
          userMap.set(u.name.toLowerCase(), u.id);
        }
      });
      const resolvedAssignments = [];

      for (const assignment of input.assignments) {
        const userId = userMap.get(assignment.userName.toLowerCase());
        if (!userId) {
          const availableUsers = users
            .filter((u) => u.name)
            .map((u) => u.name)
            .join(", ");
          return {
            success: false,
            error: `User "${assignment.userName}" not found. Available users: ${availableUsers}`,
          };
        }
        resolvedAssignments.push({
          userId,
          percentage: assignment.percentage,
        });
      }

      // Validate using billSchema
      const validationData = {
        label: updateData.label || existingBill.label,
        amount: updateData.amount || Number(existingBill.amount),
        paymentDate: updateData.paymentDate || existingBill.paymentDate,
        billTypeId: updateData.billTypeId || existingBill.billTypeId,
        dueDate: updateData.dueDate,
        notes: updateData.notes,
        assignments: resolvedAssignments,
      };

      try {
        billSchema.parse(validationData);
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Invalid assignment data",
        };
      }

      // Add to update data
      updateData.assignments = {
        deleteMany: {},
        create: resolvedAssignments,
      };
    }

    // Update the bill
    const updatedBill = await prisma.bill.update({
      where: { id: input.billId },
      data: updateData,
      include: {
        billType: true,
        assignments: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    return {
      success: true,
      message: `Updated bill: ${updatedBill.label}`,
      bill: {
        id: updatedBill.id,
        label: updatedBill.label,
        amount: Number(updatedBill.amount),
        category: updatedBill.billType.name,
        paymentDate: format(updatedBill.paymentDate, "yyyy-MM-dd"),
        assignments:
          updatedBill.assignments.length > 0
            ? updatedBill.assignments.map((a) => ({
                user: a.user.name,
                percentage: Number(a.percentage),
              }))
            : undefined,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update bill",
    };
  }
}

async function deleteBill(input: any, organizationId: string) {
  try {
    // Check if user has confirmed
    if (!input.confirmed) {
      // First call - get bill details and ask for confirmation
      const bill = await prisma.bill.findFirst({
        where: {
          id: input.billId,
          organizationId,
        },
        include: {
          billType: true,
        },
      });

      if (!bill) {
        return {
          success: false,
          error: "Bill not found",
        };
      }

      return {
        success: false,
        needsConfirmation: true,
        message: `Are you sure you want to delete the bill "${bill.label}" ($${Number(bill.amount)}) from ${format(bill.paymentDate, "MMM d, yyyy")}? This action cannot be undone.`,
        billDetails: {
          id: bill.id,
          label: bill.label,
          amount: Number(bill.amount),
          category: bill.billType.name,
        },
      };
    }

    // Second call - user confirmed, proceed with deletion
    const bill = await prisma.bill.findFirst({
      where: {
        id: input.billId,
        organizationId,
      },
    });

    if (!bill) {
      return {
        success: false,
        error: "Bill not found",
      };
    }

    await prisma.bill.delete({
      where: { id: input.billId },
    });

    return {
      success: true,
      message: `Successfully deleted bill: ${bill.label}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete bill",
    };
  }
}

async function updateCategory(input: any, organizationId: string) {
  try {
    // Find category by ID or name
    let category;
    if (input.categoryId) {
      category = await prisma.billType.findFirst({
        where: {
          id: input.categoryId,
          organizationId,
        },
      });
    } else if (input.categoryName) {
      category = await prisma.billType.findFirst({
        where: {
          organizationId,
          name: { equals: input.categoryName, mode: "insensitive" },
        },
      });
    } else {
      return {
        success: false,
        error: "Either categoryId or categoryName is required",
      };
    }

    if (!category) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    // Build update data
    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.color) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;

    // Update the category
    const updatedCategory = await prisma.billType.update({
      where: { id: category.id },
      data: updateData,
    });

    return {
      success: true,
      message: `Updated category: ${updatedCategory.name}`,
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        color: updatedCategory.color,
        icon: updatedCategory.icon,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update category",
    };
  }
}

async function deleteCategory(input: any, organizationId: string) {
  try {
    // Find category by ID or name
    let category;
    if (input.categoryId) {
      category = await prisma.billType.findFirst({
        where: {
          id: input.categoryId,
          organizationId,
        },
      });
    } else if (input.categoryName) {
      category = await prisma.billType.findFirst({
        where: {
          organizationId,
          name: { equals: input.categoryName, mode: "insensitive" },
        },
      });
    } else {
      return {
        success: false,
        error: "Either categoryId or categoryName is required",
      };
    }

    if (!category) {
      return {
        success: false,
        error: "Category not found",
      };
    }

    // Check if user has confirmed
    if (!input.confirmed) {
      // Count bills using this category
      const billCount = await prisma.bill.count({
        where: {
          billTypeId: category.id,
          organizationId,
        },
      });

      return {
        success: false,
        needsConfirmation: true,
        message: `Are you sure you want to delete the category "${category.name}"? ${billCount > 0 ? `This category is used by ${billCount} bill(s). ` : ""}This action cannot be undone.`,
        categoryDetails: {
          id: category.id,
          name: category.name,
          billCount,
        },
      };
    }

    // Second call - user confirmed, proceed with deletion
    // Note: This will fail if there are bills using this category due to database constraints
    // You might want to handle this by either deleting bills or preventing deletion
    try {
      await prisma.billType.delete({
        where: { id: category.id },
      });

      return {
        success: true,
        message: `Successfully deleted category: ${category.name}`,
      };
    } catch (dbError: any) {
      if (dbError.code === "P2003") {
        return {
          success: false,
          error: `Cannot delete category "${category.name}" because it is being used by existing bills. Please reassign or delete those bills first.`,
        };
      }
      throw dbError;
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete category",
    };
  }
}
