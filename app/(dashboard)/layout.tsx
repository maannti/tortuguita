import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <main className="flex-1 min-h-0 overflow-y-auto bg-background p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
