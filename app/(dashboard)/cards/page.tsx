import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CardsList } from "@/components/cards/cards-list"
import { getUserOrganizations } from "@/lib/organization-utils"
import Link from "next/link"
import { ChevronLeft, ChevronRight, User, Home } from "lucide-react"

interface PageProps { searchParams: Promise<{ spaceId?: string }> }

export default async function CardsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const params = await searchParams
  const userOrgs = await getUserOrganizations(session.user.id)

  if (params.spaceId) {
    const org = userOrgs.find(o => o.id === params.spaceId)
    if (!org) return <div>Espacio no encontrado</div>

    const cards = await prisma.billType.findMany({
      where: { organizationId: org.id, isCreditCard: true },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: "asc" },
    })
    return <CardsList cards={cards} spaceId={org.id} spaceName={org.name} />
  }

  if (userOrgs.length === 1) {
    const org = userOrgs[0]
    const cards = await prisma.billType.findMany({
      where: { organizationId: org.id, isCreditCard: true },
      select: { id: true, name: true, color: true, icon: true },
      orderBy: { name: "asc" },
    })
    return <CardsList cards={cards} spaceId={org.id} spaceName={org.name} />
  }

  const cardCounts = await Promise.all(
    userOrgs.map(async (org) => {
      const count = await prisma.billType.count({ where: { organizationId: org.id, isCreditCard: true } })
      return { ...org, count }
    })
  )

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Link href="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />Volver
        </Link>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Mis tarjetas
        </h1>
        <div className="w-16" />
      </div>
      <div className="px-4 pt-4">
        <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
          {cardCounts.map((org) => (
            <Link key={org.id} href={`/cards?spaceId=${org.id}`} className="flex items-center gap-3 px-4 py-4 active:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                {org.isPersonal ? <User className="h-4 w-4 text-muted-foreground" /> : <Home className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">{org.count === 0 ? "Sin tarjetas" : `${org.count} tarjeta${org.count !== 1 ? "s" : ""}`}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
