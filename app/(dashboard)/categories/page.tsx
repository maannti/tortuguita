import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CategoriesList } from "@/components/categories/categories-list"

export default async function CategoriesPage() {
  const session = await auth()
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>

  const categories = await prisma.billType.findMany({
    where: { organizationId: session.user.currentOrganizationId, isCreditCard: false },
    select: { id: true, name: true, color: true, icon: true },
    orderBy: { name: "asc" },
  })

  return <CategoriesList categories={categories} />
}
