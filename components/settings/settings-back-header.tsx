"use client"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

interface Props { title: string; backHref?: string }

export function SettingsBackHeader({ title, backHref = "/settings" }: Props) {
  const { push, back } = useRouter()
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10 -mx-4 px-4 mb-2">
      <button
        onClick={() => backHref ? push(backHref) : back()}
        className="justify-self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="size-4" />Volver
      </button>
      <h1 className="justify-self-center text-base font-semibold whitespace-nowrap">{title}</h1>
      <div />
    </div>
  )
}
