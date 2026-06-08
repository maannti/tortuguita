import { auth } from "@/lib/auth"
import { AccountForm } from "@/components/cards/account-form"

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return <div className="p-8 text-center text-muted-foreground">Sesión no válida.</div>

  const { returnTo } = await searchParams
  return <AccountForm returnTo={returnTo} />
}
