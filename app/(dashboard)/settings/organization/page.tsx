import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeSettings } from "@/components/settings/income-settings"
import { SettingsBackHeader } from "@/components/settings/settings-back-header"
import { getUserOrganizations } from "@/lib/organization-utils"
import { startOfMonth, endOfMonth } from "date-fns"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Home } from "lucide-react"

interface PageProps { searchParams: Promise<{ spaceId?: string }> }

export default async function OrganizationSettingsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) return <div>Unauthorized</div>

  const params = await searchParams
  const userOrgs = await getUserOrganizations(session.user.id)

  // Only shared (non-personal) spaces show income settings
  const sharedOrgs = userOrgs.filter(o => !o.isPersonal)

  // ── Space detail: spaceId provided ──
  if (params.spaceId) {
    const org = sharedOrgs.find(o => o.id === params.spaceId)
    if (!org) return <div>Espacio no encontrado</div>

    const now = new Date()
    const [memberships, memberIncomeRows] = await Promise.all([
      prisma.userOrganization.findMany({
        where: { organizationId: org.id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.income.groupBy({
        by: ["userId"],
        where: {
          organizationId: org.id,
          incomeDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
        },
        _sum: { amount: true },
      }),
    ])

    const members = memberships.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }))

    const initialIncomes = memberIncomeRows.reduce((acc: Record<string, number>, r) => {
      acc[r.userId] = Number(r._sum.amount || 0)
      return acc
    }, {})

    return (
      <div className="pb-28">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <Link
            href={sharedOrgs.length > 1 ? "/settings/organization" : "/settings"}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />Volver
          </Link>
          <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            {org.name}
          </h1>
          <div className="w-16" />
        </div>
        <div className="px-4 pt-5">
          <IncomeSettings
            organizationId={org.id}
            members={members}
            initialIncomes={initialIncomes}
          />
        </div>
      </div>
    )
  }

  // ── No shared spaces ──
  if (sharedOrgs.length === 0) {
    return (
      <div className="pb-28">
        <SettingsBackHeader title="Ingresos del mes" />
        <div className="px-4 pt-8 text-center text-muted-foreground text-sm">
          <p>No tenés espacios compartidos.</p>
          <p className="mt-1">Los ingresos se configuran por espacio compartido.</p>
        </div>
      </div>
    )
  }

  // ── Single shared space: go straight to income form ──
  if (sharedOrgs.length === 1) {
    const org = sharedOrgs[0]
    const now = new Date()
    const [memberships, memberIncomeRows] = await Promise.all([
      prisma.userOrganization.findMany({
        where: { organizationId: org.id },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.income.groupBy({
        by: ["userId"],
        where: {
          organizationId: org.id,
          incomeDate: { gte: startOfMonth(now), lte: endOfMonth(now) },
        },
        _sum: { amount: true },
      }),
    ])

    const members = memberships.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    }))

    const initialIncomes = memberIncomeRows.reduce((acc: Record<string, number>, r) => {
      acc[r.userId] = Number(r._sum.amount || 0)
      return acc
    }, {})

    return (
      <div className="pb-28">
        <SettingsBackHeader title="Ingresos del mes" />
        <div className="px-4 pt-4">
          <IncomeSettings
            organizationId={org.id}
            members={members}
            initialIncomes={initialIncomes}
          />
        </div>
      </div>
    )
  }

  // ── Multiple shared spaces: show picker ──
  return (
    <div className="pb-28">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Link href="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </Link>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Ingresos del mes
        </h1>
        <div className="w-16" />
      </div>
      <div className="px-4 pt-4">
        <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
          {sharedOrgs.map((org) => (
            <Link
              key={org.id}
              href={`/settings/organization?spaceId=${org.id}`}
              className="flex items-center gap-3 p-4 active:bg-muted/50 transition-colors"
            >
              <div className="size-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Home className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">Configurar ingresos del mes</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
