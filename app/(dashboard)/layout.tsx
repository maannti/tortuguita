import { SimpleHeader } from "@/components/layout/simple-header"
import { BottomNav } from "@/components/layout/bottom-nav"
import { SideNav } from "@/components/layout/side-nav"
import { SpacesProvider } from "@/lib/spaces-context"
import { auth } from "@/lib/auth"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const spaces = session?.user?.id
    ? await getUserOrganizations(session.user.id)
    : []

  return (
    <SpacesProvider spaces={spaces}>
      <div className="flex h-dvh">
        {/* Desktop sidebar — hidden on mobile */}
        <SideNav />

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0">
          <SimpleHeader />
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-background">
            {/* Center content on desktop */}
            <div className="lg:max-w-xl lg:mx-auto">
              {children}
            </div>
          </main>
          {/* Mobile-only bottom nav */}
          <BottomNav />
        </div>
      </div>
    </SpacesProvider>
  )
}
