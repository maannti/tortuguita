"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { incomeTypeSchema, type IncomeTypeFormData } from "@/lib/validations/income-type"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ColorInputWithPicker } from "@/components/ui/color-picker-dialog"
import { useTranslations } from "@/components/providers/language-provider"

interface IncomeTypeFormProps {
  initialData?: IncomeTypeFormData & { id: string }
  mode: "create" | "edit"
}

export function IncomeTypeForm({ initialData, mode }: IncomeTypeFormProps) {
  const router = useRouter()
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<IncomeTypeFormData>({
    resolver: zodResolver(incomeTypeSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      color: "#10b981",
      icon: "",
      isRecurring: false,
    },
  })

  async function onSubmit(data: IncomeTypeFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const url = mode === "create"
        ? "/api/income-types"
        : `/api/income-types/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Something went wrong")
        return
      }

      router.push("/income-types")
      router.refresh()
    } catch (error) {
      setError("Failed to save income type")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? t.incomeTypes?.newIncomeType || "Nueva Categoría de Ingreso" : t.incomeTypes?.editIncomeType || "Editar Categoría de Ingreso"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.incomeTypes?.incomeTypeName || "Nombre"}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.incomeTypes?.incomeTypeNamePlaceholder || "ej., Salario"} disabled={isLoading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.incomeTypes?.incomeTypeDescription || "Descripción - (Opcional)"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.incomeTypes?.incomeTypeDescriptionPlaceholder || "Breve descripción de esta categoría"}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.categories.color}</FormLabel>
                    <FormControl>
                      <ColorInputWithPicker
                        value={field.value || "#3b82f6"}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.categories.icon} - ({t.common.optional})</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.incomeTypes?.iconPlaceholder || "ej., 💰"}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t.incomeTypes?.isRecurring || "Ingreso recurrente"}
                    </FormLabel>
                    <FormDescription>
                      {t.incomeTypes?.isRecurringDescription || "Indica si este tipo de ingreso es recurrente (ej., salario mensual)"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/income-types")}
                disabled={isLoading}
                size="lg"
                className="w-full md:w-auto"
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isLoading} size="lg" className="w-full md:flex-1">
                {isLoading ? t.categories.saving : mode === "create" ? t.categories.create : t.categories.update}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
