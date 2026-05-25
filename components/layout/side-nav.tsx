"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"
import { LogoWordmark } from "@/components/ui/logo"

function getInitials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"
}

const navItems = [
  {
    label: "Inicio", href: "/dashboard",
    icon: (a: boolean) => (
      <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    label: "Mis gastos", href: "/bills",
    icon: (a: boolean) => (
      <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    label: "Tarjetas", href: "/wallet",
    icon: (a: boolean) => (
      <svg className="size-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={a ? 2.2 : 1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
]

export function SideNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isSettingsActive = pathname.startsWith("/settings")

  return (
    <aside className="hidden lg:flex flex-col w-56 h-dvh sticky top-0 flex-shrink-0 z-30 border-r border-border/50 bg-background/90 backdrop-blur-xl px-3 py-5">
      {/* Logo */}
      <div className="px-2 mb-7">
        <Link href="/dashboard">
          <LogoWordmark />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic("selection")}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {item.icon(isActive)}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Settings at bottom */}
      <Link
        href="/settings"
        onClick={() => haptic("selection")}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
          isSettingsActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
      >
        <div className={cn(
          "size-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ring-2 transition-all",
          isSettingsActive
            ? "bg-primary text-primary-foreground ring-primary/30"
            : "bg-muted text-muted-foreground ring-transparent"
        )}>
          {session?.user?.image
            ? <img src={session.user.image} alt="" className="size-7 rounded-full object-cover" />
            : getInitials(session?.user?.name)
          }
        </div>
        <span className="truncate">
          {session?.user?.name?.split(" ")[0] || "Perfil"}
        </span>
      </Link>
    </aside>
  )
}
