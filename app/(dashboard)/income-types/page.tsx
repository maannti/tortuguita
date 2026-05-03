import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IncomeTypesContent } from "@/components/income-types/income-types-content";

export default async function IncomeTypesPage() {
  const session = await auth();

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>;
  }

  const incomeTypes = await prisma.incomeType.findMany({
    where: {
      organizationId: session.user.currentOrganizationId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <IncomeTypesContent
      incomeTypes={incomeTypes.map((type) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        color: type.color,
        icon: type.icon,
        isRecurring: type.isRecurring,
      }))}
    />
  );
}
