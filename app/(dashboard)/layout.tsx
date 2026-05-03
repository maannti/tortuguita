import { SimpleHeader } from "@/components/layout/simple-header"
import { BottomNav } from "@/components/layout/bottom-nav"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <SimpleHeader />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-background">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
