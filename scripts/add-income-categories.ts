import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultIncomeCategories = [
  { name: "Salario", description: "Salario mensual o nómina", color: "#10b981", icon: "💰", isRecurring: true },
  { name: "Freelance", description: "Trabajo independiente o proyectos", color: "#3b82f6", icon: "💼", isRecurring: false },
  { name: "Inversiones", description: "Dividendos, intereses, ganancias", color: "#8b5cf6", icon: "📈", isRecurring: false },
  { name: "Alquiler", description: "Ingresos por alquiler de propiedades", color: "#f59e0b", icon: "🏠", isRecurring: true },
  { name: "Otros", description: "Otros ingresos", color: "#6b7280", icon: "💵", isRecurring: false },
];

async function main() {
  console.log("Adding default income categories to all organizations...\n");

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  for (const org of organizations) {
    // Check if org already has income categories
    const existingCount = await prisma.incomeType.count({
      where: { organizationId: org.id },
    });

    if (existingCount > 0) {
      console.log(`✓ ${org.name}: Already has ${existingCount} income categories`);
      continue;
    }

    // Create default income categories
    await prisma.incomeType.createMany({
      data: defaultIncomeCategories.map((cat) => ({
        ...cat,
        organizationId: org.id,
      })),
    });

    console.log(`✓ ${org.name}: Created ${defaultIncomeCategories.length} income categories`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
