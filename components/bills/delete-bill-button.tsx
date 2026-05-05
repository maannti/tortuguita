"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Trash2 } from "lucide-react"
import { useTranslations } from "@/components/providers/language-provider"

interface DeleteBillButtonProps {
  id: string
  label: string
  iconOnly?: boolean
  asMenuItem?: boolean
  fullWidth?: boolean
  redirectTo?: string
}

export function DeleteBillButton({ id, label, iconOnly, asMenuItem, fullWidth, redirectTo }: DeleteBillButtonProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Error al eliminar el gasto")
        return
      }

      setIsOpen(false)
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch {
      setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {asMenuItem ? (
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="flex items-center gap-2 text-destructive focus:text-destructive rounded-xl py-2.5 px-3"
          >
            <Trash2 className="h-4 w-4" />
            {t.common.delete}
          </DropdownMenuItem>
        ) : iconOnly ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </Button>
        ) : fullWidth ? (
          <Button variant="destructive" size="lg" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar gasto
          </Button>
        ) : (
          <Button variant="destructive" size="sm">
            {t.common.delete}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-border/40 bg-card w-[calc(100%-2rem)] max-w-sm p-6 [&>.absolute]:hidden">
        <DialogHeader className="items-center text-center gap-4 pb-1">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              Eliminar gasto
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              ¿Eliminás <span className="font-medium text-foreground">"{label}"</span>? Esta acción no se puede deshacer.
            </DialogDescription>
          </div>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive text-center pt-1">{error}</p>
        )}
        <div className="flex flex-col gap-2.5 pt-2">
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}
            className="w-full rounded-full py-3.5 text-sm font-semibold disabled:opacity-50">
            {isLoading ? "Eliminando…" : "Eliminar"}
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}
            className="w-full rounded-full py-3.5 text-sm font-medium border-0 bg-muted text-muted-foreground hover:bg-muted/80">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
