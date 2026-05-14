import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CategoryFormV2 } from "@/components/categories/category-form-v2"

interface PageProps { searchParams: Promise<{ spaceId?: string; spaceName?: string; returnTo?: string }> }

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams

  let members: { id: string; name: string | null; email: string | null }[] = []
  if (params.spaceId && session?.user?.id) {
    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId: params.spaceId },
      select: { user: { select: { id: true, name: true, email: true } } },
    })
    members = memberships.map(m => m.user)
  }

  return (
    <CategoryFormV2
      mode="create"
      organizationId={params.spaceId}
      spaceName={params.spaceName}
      returnTo={params.returnTo}
      members={members}
      currentUserId={session?.user?.id}
    />
  )
}
