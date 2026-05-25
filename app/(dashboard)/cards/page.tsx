import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CardsList } from "@/components/cards/cards-list"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function CardsPage() {
  const session = await auth()
  if (!session?.user?.id) return <div className="p-8 text-center text-muted-foreground">Sesión no válida. Volvé a iniciar sesión.</div>

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const now = new Date()

  // Cards are global — show all cards across all user spaces
  const cards = await prisma.billType.findMany({
    where: { organizationId: { in: orgIds }, isCreditCard: true },
    select: { id: true, name: true, color: true, icon: true, currentDueDate: true, nextDueDate: true },
    orderBy: { name: "asc" },
  })

  // IDs of cards with a billing period issue (same logic as /api/billing-alerts)
  const alertCardIds = cards
    .filter(c =>
      !c.currentDueDate ||
      (c.currentDueDate < now && !c.nextDueDate) ||
      (c.currentDueDate >= now && !c.nextDueDate)
    )
    .map(c => c.id)

  return <CardsList cards={cards} alertCardIds={alertCardIds} />
}
