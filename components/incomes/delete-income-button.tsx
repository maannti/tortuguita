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
import { X, Trash2 } from "lucide-react"
import { useTranslations } from "@/components/providers/language-provider"

interface DeleteIncomeButtonProps {
  id: string
  label: string
  iconOnly?: boolean
  asMenuItem?: boolean
}

export function DeleteIncomeButton({ id, label, iconOnly, asMenuItem }: DeleteIncomeButtonProps) {
  const t = useTranslations()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to delete income")
        return
      }

      setIsOpen(false)
      router.refresh()
    } catch (error) {
      setError("Failed to delete income")
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
        ) : (
          <Button variant="destructive" size="sm">
            {t.common.delete}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.incomes?.deleteIncome || "Eliminar Ingreso"}</DialogTitle>
          <DialogDescription>
            {(t.incomes?.confirmDelete || "¿Estás seguro de que quieres eliminar el ingreso \"{label}\"? Esta acción no se puede deshacer.").replace("{label}", label)}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            {t.common.cancel}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? t.common.deleting : t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
