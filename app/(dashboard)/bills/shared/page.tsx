import { auth } from "@/lib/auth"
import { getUserOrganizations } from "@/lib/organization-utils"
import { SharedBalanceView } from "@/components/bills/shared-balance-view"

export default async function SharedBillsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Sesión no válida. Volvé a iniciar sesión.
      </div>
    )
  }

  const orgs = await getUserOrganizations(session.user.id)

  // Only show shared spaces (non-personal and with more than 1 member)
  const sharedOrgs = orgs.filter(o => !o.isPersonal && o.memberCount > 1)

  if (sharedOrgs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No tenés espacios compartidos. Creá uno o pedí un código de invitación en Configuración.
      </div>
    )
  }

  return (
    <SharedBalanceView
      organizations={sharedOrgs.map(o => ({ id: o.id, name: o.name, isPersonal: o.isPersonal }))}
      currentUserId={session.user.id}
    />
  )
}
