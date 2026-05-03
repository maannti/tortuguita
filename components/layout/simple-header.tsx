"use client"
import Link from "next/link"
import { LogoWordmark } from "@/components/ui/logo"

export function SimpleHeader() {
  return (
    <header
      className="sticky top-0 z-30 px-4"
      style={{
        background: "rgba(253,250,249,0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.65)",
      }}
    >
      <div className="flex h-14 items-center">
        <Link href="/dashboard">
          <LogoWordmark />
        </Link>
      </div>
    </header>
  )
}
