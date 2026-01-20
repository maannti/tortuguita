import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoriesContent } from "@/components/categories/categories-content";

export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>;
  }

  const categories = await prisma.billType.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <CategoriesContent
      categories={categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
        icon: cat.icon,
      }))}
    />
  );
}
