import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SettingsHub } from "@/components/settings/settings-hub"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const billTypes = await prisma.billType.findMany({
    where: { organizationId: { in: orgIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, icon: true, isCreditCard: true },
  })

  return (
    <SettingsHub
      creditCards={billTypes.filter(b => b.isCreditCard)}
      categories={billTypes.filter(b => !b.isCreditCard)}
    />
  )
}
