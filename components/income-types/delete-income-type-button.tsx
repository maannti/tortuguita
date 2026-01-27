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
import { useTranslations } from "@/components/providers/language-provider"
import { Trash2 } from "lucide-react"

interface DeleteIncomeTypeButtonProps {
  id: string
  name: string
}

export function DeleteIncomeTypeButton({ id, name }: DeleteIncomeTypeButtonProps) {
  const router = useRouter()
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/income-types/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || t.incomeTypes?.cannotDeleteWithIncomes || "No se puede eliminar una categoría con ingresos existentes")
        return
      }

      setIsOpen(false)
      router.refresh()
    } catch (error) {
      setError(t.errors.somethingWentWrong)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" className="h-10 w-10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.common.delete}</DialogTitle>
          <DialogDescription>
            {(t.incomeTypes?.confirmDelete || "¿Estás seguro de que quieres eliminar esta categoría?").replace("esta categoría", `"${name}"`)}
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
