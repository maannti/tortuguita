import { auth } from "@/lib/auth"
import { AccountForm } from "@/components/cards/account-form"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string; returnTo?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return <div className="p-8 text-center text-muted-foreground">Sesión no válida.</div>

  const { spaceId, returnTo } = await searchParams
  const userOrgs = await getUserOrganizations(session.user.id)
  const organizations = userOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))

  return <AccountForm organizations={organizations} spaceId={spaceId} returnTo={returnTo} />
}
