import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SettingsHub } from "@/components/settings/settings-hub"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>
  const orgId = session.user.currentOrganizationId

  const billTypes = await prisma.billType.findMany({
    where: { organizationId: orgId },
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
