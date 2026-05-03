import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CardsList } from "@/components/cards/cards-list"

export default async function CardsPage() {
  const session = await auth()
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>

  const cards = await prisma.billType.findMany({
    where: { organizationId: session.user.currentOrganizationId, isCreditCard: true },
    select: { id: true, name: true, color: true, icon: true },
    orderBy: { name: "asc" },
  })

  return <CardsList cards={cards} />
}
