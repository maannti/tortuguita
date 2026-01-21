"use client"

import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LogOut, Sun, Moon } from "lucide-react"
import { useTranslations } from "@/components/providers/language-provider"

// Animated hamburger/close icon component
function MenuIcon({ isOpen, className }: { isOpen: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Top line - moves to center and rotates 45deg */}
      <line
        x1="4"
        y1={isOpen ? "12" : "6"}
        x2="20"
        y2={isOpen ? "12" : "6"}
        className="transition-all duration-300 ease-in-out"
        style={{
          transformOrigin: "center",
          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
        }}
      />
      {/* Middle line - fades out */}
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className="transition-all duration-300 ease-in-out"
        style={{
          opacity: isOpen ? 0 : 1,
        }}
      />
      {/* Bottom line - moves to center and rotates -45deg */}
      <line
        x1="4"
        y1={isOpen ? "12" : "18"}
        x2="20"
        y2={isOpen ? "12" : "18"}
        className="transition-all duration-300 ease-in-out"
        style={{
          transformOrigin: "center",
          transform: isOpen ? "rotate(-45deg)" : "rotate(0deg)",
        }}
      />
    </svg>
  )
}

type NavKey = "aiAssistant" | "dashboard" | "bills" | "categories" | "settings"

const navItems: { key: NavKey; href: string }[] = [
  { key: "aiAssistant", href: "/ai" },
  { key: "dashboard", href: "/dashboard" },
  { key: "bills", href: "/bills" },
  { key: "categories", href: "/categories" },
  { key: "settings", href: "/settings/organization" },
]

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuExpanded, setUserMenuExpanded] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false)
    setUserMenuExpanded(false)
    router.push(href)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    setUserMenuExpanded(false)
  }

  return (
    <>
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href="/ai" className="flex items-center">
              <img src={mounted && theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg"} alt="tortuguita" className="h-10 w-auto" />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {t.nav[item.key]}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Desktop only: Theme toggle */}
            <div className="hidden md:block mr-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "relative w-12 h-7 rounded-full transition-colors flex items-center",
                  mounted && theme === "dark" ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute w-5 h-5 bg-white rounded-full shadow-md transition-transform flex items-center justify-center",
                    mounted && theme === "dark" ? "translate-x-6" : "translate-x-1"
                  )}
                >
                  {mounted && theme === "dark" ? (
                    <Moon className="h-3 w-3 text-primary" />
                  ) : (
                    <Sun className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              </button>
            </div>

            {/* Desktop only: User menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                      <AvatarFallback>{getInitials(session?.user?.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session?.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
                    {t.nav.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings/organization")}>
                    {t.nav.organization}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                    {t.nav.logOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile hamburger button */}
            <button
              className="md:hidden p-2 -mr-2 text-foreground hover:text-primary hover:bg-muted active:scale-90 rounded-lg cursor-pointer transition-all duration-150"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <MenuIcon isOpen={mobileMenuOpen} className="h-8 w-8" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background md:hidden transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile menu header */}
          <div className="flex h-20 items-center justify-between px-4 border-b">
            <Link href="/ai" onClick={closeMobileMenu} className="flex items-center">
              <img src={mounted && theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg"} alt="tortuguita" className="h-10 w-auto" />
            </Link>
            <button
              className="p-2 -mr-2 text-foreground hover:text-primary hover:bg-muted active:scale-90 rounded-lg cursor-pointer transition-all duration-150"
              onClick={closeMobileMenu}
              aria-label="Close menu"
            >
              <MenuIcon isOpen={true} className="h-8 w-8" />
            </button>
          </div>

          {/* Mobile navigation links */}
          <nav className="flex-1 px-8 py-10 overflow-y-auto">
            <ul className="space-y-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.href}>
                    <button
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        "block w-full text-left text-[42px] font-light lowercase leading-normal py-2 transition-colors",
                        isActive
                          ? "text-primary underline underline-offset-8 decoration-4"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.nav[item.key]}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile menu footer with user info and actions */}
          <div className="px-8 py-6">
            {/* User info - clickable to expand */}
            <button
              onClick={() => setUserMenuExpanded(!userMenuExpanded)}
              className="w-full flex items-center gap-3 p-3 -m-3 rounded-xl transition-colors hover:bg-muted active:bg-muted"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                <AvatarFallback className="text-lg font-bold">{getInitials(session?.user?.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-bold text-lg">{session?.user?.name}</p>
                <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
              </div>
              {/* Theme toggle */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setTheme(theme === "dark" ? "light" : "dark")
                }}
                className={cn(
                  "relative w-16 h-9 rounded-full transition-colors flex items-center cursor-pointer",
                  mounted && theme === "dark" ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute w-7 h-7 bg-white rounded-full shadow-md transition-transform flex items-center justify-center",
                    mounted && theme === "dark" ? "translate-x-8" : "translate-x-1"
                  )}
                >
                  {mounted && theme === "dark" ? (
                    <Moon className="h-4 w-4 text-primary" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-500" />
                  )}
                </div>
              </div>
            </button>

            {/* Logout button - shown when expanded */}
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              userMenuExpanded ? "max-h-20 opacity-100 mt-4" : "max-h-0 opacity-0"
            )}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                {t.nav.logOut}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
