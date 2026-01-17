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

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const category = await prisma.billType.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
    },
  })

  if (!category) {
    notFound()
  }

  return (
    <div className="max-w-2xl">
      <CategoryForm
        mode="edit"
        initialData={{
          id: category.id,
          name: category.name,
          description: category.description || "",
          color: category.color || "#3b82f6",
          icon: category.icon || "",
        }}
      />
    </div>
  )
}
