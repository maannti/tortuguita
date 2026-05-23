"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"

function getInitials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"
}

const navItems = [
  {
    label: "Inicio", href: "/dashboard", tourAttr: undefined,
    icon: (a: boolean) => (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    label: "Mis gastos", href: "/bills", tourAttr: "nav-bills",
    icon: (a: boolean) => (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    label: "Tarjetas", href: "/tarjetas", tourAttr: "nav-tarjetas",
    icon: (a: boolean) => (
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSettingsActive = pathname.startsWith("/settings")

  return (
    /* Floating pill nav */
    <nav className="fixed bottom-4 left-4 right-4 z-40">
      <div
        className="flex h-16 items-stretch rounded-2xl px-2 gap-1 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_4px_30px_rgba(157,129,137,0.14),0_1px_4px_rgba(157,129,137,0.08)] bg-white/75 dark:bg-card/90"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic("selection")}
              {...(item.tourAttr ? { "data-tour": item.tourAttr } : {})}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon(isActive)}
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* User avatar tab */}
        <Link
          href="/settings"
          onClick={() => haptic("selection")}
          data-tour="nav-settings"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all",
            isSettingsActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "size-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ring-2",
            isSettingsActive
              ? "bg-primary text-primary-foreground ring-primary/30"
              : "bg-muted text-muted-foreground ring-transparent"
          )}>
            {session?.user?.image
              ? <img src={session.user.image} alt="" className="size-7 rounded-full object-cover" />
              : getInitials(session?.user?.name)
            }
          </div>
          <span className={cn("text-[10px] font-medium", isSettingsActive ? "text-primary" : "text-muted-foreground")}>
            {session?.user?.name?.split(" ")[0] || "Perfil"}
          </span>
        </Link>
      </div>
    </nav>
  )
}
