import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CategoryFormV2 } from "@/components/categories/category-form-v2"
import { notFound } from "next/navigation"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  if (!session?.user?.id) return <div>Unauthorized</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const [category, memberships] = await Promise.all([
    prisma.billType.findFirst({
      where: { id, organizationId: { in: orgIds }, isCreditCard: false },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: { in: orgIds } },
      select: { organizationId: true, user: { select: { id: true, name: true, email: true } } },
    }),
  ])
  if (!category) notFound()

  const spaceId = category.organizationId
  const members = memberships
    .filter(m => m.organizationId === spaceId)
    .map(m => m.user)

  return (
    <CategoryFormV2
      mode="edit"
      organizationId={spaceId}
      initialData={{
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        defaultAssignments: category.defaultAssignments as { userId: string; percentage: number }[] | null,
      }}
      members={members}
      currentUserId={session.user.id}
    />
  )
}
