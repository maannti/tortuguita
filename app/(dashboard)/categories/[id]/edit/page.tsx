import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CategoryFormV2 } from "@/components/categories/category-form-v2"
import { notFound } from "next/navigation"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>

  const category = await prisma.billType.findFirst({
    where: { id, organizationId: session.user.currentOrganizationId, isCreditCard: false },
  })
  if (!category) notFound()

  return (
    <CategoryFormV2
      mode="edit"
      initialData={{ id: category.id, name: category.name, color: category.color, icon: category.icon }}
    />
  )
}
