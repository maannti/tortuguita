import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserOrganizations } from "@/lib/organization-utils"
import { ResumenImporter } from "@/components/resumen/resumen-importer"

export default async function ResumenPage() {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const [ccCards, memberships, categories] = await Promise.all([
    prisma.billType.findMany({
      where: { organizationId: { in: orgIds }, isCreditCard: true },
      select: { id: true, name: true, color: true, icon: true, organizationId: true },
      orderBy: { name: "asc" },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: { in: orgIds } },
      select: { organizationId: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.billType.findMany({
      where: { organizationId: { in: orgIds }, isCreditCard: false },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: "asc" },
    }),
  ])

  const members = memberships.map(m => ({ ...m.user, organizationId: m.organizationId }))
  const organizations = userOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))

  return (
    <ResumenImporter
      ccCards={ccCards}
      members={members}
      organizations={organizations}
      currentUserId={session.user.id}
      categories={categories}
    />
  )
}
