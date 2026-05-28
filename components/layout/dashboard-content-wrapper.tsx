"use client"

import { usePathname } from "next/navigation"

/**
 * Centers the dashboard children inside a max-w-xl column on desktop so the
 * mobile-first pages don't stretch awkwardly on a wide monitor.
 *
 * Routes that need the full remaining viewport width (AI chat, etc.) opt out
 * via the FULL_WIDTH_PREFIXES list — they get a plain h-full container.
 */
const FULL_WIDTH_PREFIXES = ["/ai"] as const

export function DashboardContentWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ""
  const isFullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname.startsWith(p))

  return (
    <div className={isFullWidth ? "h-full" : "lg:max-w-xl lg:mx-auto h-full"}>
      {children}
    </div>
  )
}
