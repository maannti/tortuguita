import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeTypeForm } from "@/components/income-types/income-type-form"
import { notFound } from "next/navigation"

export default async function EditIncomeTypePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const incomeType = await prisma.incomeType.findFirst({
    where: {
      id,
      organizationId: session.user.currentOrganizationId,
    },
  })

  if (!incomeType) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <IncomeTypeForm
        mode="edit"
        initialData={{
          id: incomeType.id,
          name: incomeType.name,
          description: incomeType.description || "",
          color: incomeType.color || "",
          icon: incomeType.icon || "",
          isRecurring: incomeType.isRecurring,
        }}
      />
    </div>
  )
}
