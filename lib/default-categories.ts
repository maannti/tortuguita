import { PrismaClient } from "@prisma/client";

const defaultBillCategories = [
  { name: "Groceries", description: "Food and household items", color: "#10b981", icon: "🛒", isCreditCard: false },
  { name: "Utilities", description: "Electric, water, gas, internet", color: "#3b82f6", icon: "💡", isCreditCard: false },
  { name: "Rent", description: "Monthly rent or mortgage", color: "#ef4444", icon: "🏠", isCreditCard: false },
  { name: "Transportation", description: "Gas, public transit, car maintenance", color: "#f59e0b", icon: "🚗", isCreditCard: false },
  { name: "Entertainment", description: "Movies, games, streaming services", color: "#ec4899", icon: "🎬", isCreditCard: false },
  { name: "Dining Out", description: "Restaurants and takeout", color: "#8b5cf6", icon: "🍽️", isCreditCard: false },
  { name: "Healthcare", description: "Medical expenses and pharmacy", color: "#06b6d4", icon: "⚕️", isCreditCard: false },
  { name: "Shopping", description: "Clothing and personal items", color: "#f97316", icon: "🛍️", isCreditCard: false },
];

const defaultIncomeCategories = [
  { name: "Salario", description: "Salario mensual o nómina", color: "#10b981", icon: "💰", isRecurring: true },
  { name: "Inversiones", description: "Dividendos, intereses, ganancias", color: "#8b5cf6", icon: "📈", isRecurring: false },
  { name: "Ahorros", description: "Ingresos de ahorros o intereses", color: "#f59e0b", icon: "🏦", isRecurring: false },
  { name: "Otros", description: "Otros ingresos", color: "#6b7280", icon: "💵", isRecurring: false },
];

export async function createDefaultCategories(
  tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  organizationId: string
) {
  // Create default bill categories
  await tx.billType.createMany({
    data: defaultBillCategories.map((cat) => ({
      ...cat,
      organizationId,
    })),
    skipDuplicates: true,
  });

  // Create default income categories
  await tx.incomeType.createMany({
    data: defaultIncomeCategories.map((cat) => ({
      ...cat,
      organizationId,
    })),
    skipDuplicates: true,
  });
}

export { defaultBillCategories, defaultIncomeCategories };
