"use client"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

interface Props { title: string; backHref?: string }

export function SettingsBackHeader({ title, backHref = "/settings" }: Props) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-4 px-4 mb-2">
      <button
        onClick={() => backHref ? router.push(backHref) : router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />Volver
      </button>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="w-14" />
    </div>
  )
}
