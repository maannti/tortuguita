import { SimpleHeader } from "@/components/layout/simple-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { SpacesProvider } from "@/lib/spaces-context"
import { SpaceSelectorBar } from "@/components/layout/space-selector-bar"
import { auth } from "@/lib/auth"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const spaces = session?.user?.id
    ? await getUserOrganizations(session.user.id)
    : []

  return (
    <SpacesProvider spaces={spaces}>
      <div className="flex h-dvh flex-col">
        <SimpleHeader />
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-background">
          {children}
        </main>
        <SpaceSelectorBar />
        <BottomNav />
      </div>
    </SpacesProvider>
  )
}
