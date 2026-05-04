import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CardsList } from "@/components/cards/cards-list"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function CardsPage() {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  // Cards are global — show all cards across all user spaces
  const cards = await prisma.billType.findMany({
    where: { organizationId: { in: orgIds }, isCreditCard: true },
    select: { id: true, name: true, color: true, icon: true },
    orderBy: { name: "asc" },
  })

  return <CardsList cards={cards} />
}
