import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CategoryForm } from "@/components/categories/category-form"
import { notFound } from "next/navigation"

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const category = await prisma.billType.findFirst({
    where: {
      id,
      organizationId: session.user.currentOrganizationId,
    },
  })

  if (!category) {
    notFound()
  }

  return (
    <div className="-mx-4 md:mx-0 md:max-w-3xl lg:mx-auto">
      <CategoryForm
        mode="edit"
        initialData={{
          id: category.id,
          name: category.name,
          description: category.description || "",
          color: category.color || "#3b82f6",
          icon: category.icon || "",
          isCreditCard: category.isCreditCard,
          currentClosingDate: category.currentClosingDate,
          currentDueDate: category.currentDueDate,
          nextClosingDate: category.nextClosingDate,
          nextDueDate: category.nextDueDate,
        }}
      />
    </div>
  )
}
