"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteCategoryButtonProps {
  id: string
  name: string
}

type Step = "confirm" | "confirm-force"

export function DeleteCategoryButton({ id, name }: DeleteCategoryButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>("confirm")
  const [billCount, setBillCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function handleOpen(open: boolean) {
    setIsOpen(open)
    if (!open) { setStep("confirm"); setBillCount(0); setError(null) }
  }

  async function handleDelete(force = false) {
    setIsLoading(true)
    setError(null)
    try {
      const url = force ? `/api/bill-types/${id}?force=true` : `/api/bill-types/${id}`
      const res = await fetch(url, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === "has_bills") {
          // Escalate to second confirmation step
          setBillCount(data.count ?? 0)
          setStep("confirm-force")
          return
        }
        setError(data.error || "No se pudo eliminar la categoría")
        return
      }

      setIsOpen(false)
      router.refresh()
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" className="h-10 w-10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Eliminar categoría</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que querés eliminar <span className="font-semibold text-foreground">"{name}"</span>?
            </p>
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(false)} disabled={isLoading}>
                {isLoading ? "Eliminando..." : "Eliminar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                Esta categoría tiene gastos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">"{name}"</span> tiene{" "}
                <span className="font-semibold text-foreground">
                  {billCount} gasto{billCount !== 1 ? "s" : ""}
                </span>{" "}
                asignado{billCount !== 1 ? "s" : ""}.
              </p>
              <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                Si eliminás la categoría, <span className="font-semibold">esos gastos se borrarán también</span>. Esta acción no se puede deshacer.
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(true)} disabled={isLoading}>
                {isLoading ? "Eliminando..." : "Sí, eliminar todo"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
