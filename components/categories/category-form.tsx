"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { format } from "date-fns"
import { billTypeSchema, type BillTypeFormData } from "@/lib/validations/bill-type"
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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ColorInputWithPicker } from "@/components/ui/color-picker-dialog"
import { useTranslations } from "@/components/providers/language-provider"

interface CategoryFormProps {
  initialData?: BillTypeFormData & {
    id: string
    currentClosingDate?: Date | null
    currentDueDate?: Date | null
    nextClosingDate?: Date | null
    nextDueDate?: Date | null
  }
  mode: "create" | "edit"
}

export function CategoryForm({ initialData, mode }: CategoryFormProps) {
  const router = useRouter()
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Billing period state
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return ""
    return format(new Date(date), "yyyy-MM-dd")
  }

  const [currentClosingDate, setCurrentClosingDate] = useState(
    formatDateForInput(initialData?.currentClosingDate)
  )
  const [currentDueDate, setCurrentDueDate] = useState(
    formatDateForInput(initialData?.currentDueDate)
  )
  const [nextClosingDate, setNextClosingDate] = useState(
    formatDateForInput(initialData?.nextClosingDate)
  )
  const [nextDueDate, setNextDueDate] = useState(
    formatDateForInput(initialData?.nextDueDate)
  )

  const form = useForm<BillTypeFormData>({
    resolver: zodResolver(billTypeSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      color: "#3b82f6",
      icon: "",
      isCreditCard: false,
    },
  })

  const isCreditCard = form.watch("isCreditCard")

  async function onSubmit(data: BillTypeFormData) {
    setIsLoading(true)
    setError(null)

    try {
      const url = mode === "create"
        ? "/api/bill-types"
        : `/api/bill-types/${initialData?.id}`

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

      // If it's a credit card and we have billing period dates, save them
      if (data.isCreditCard && (currentClosingDate || currentDueDate)) {
        const categoryId = mode === "create" ? result.id : initialData?.id

        if (categoryId && currentClosingDate && currentDueDate) {
          const billingResponse = await fetch(`/api/bill-types/${categoryId}/billing-period`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentClosingDate: new Date(currentClosingDate + "T00:00:00"),
              currentDueDate: new Date(currentDueDate + "T00:00:00"),
              nextClosingDate: nextClosingDate ? new Date(nextClosingDate + "T00:00:00") : undefined,
              nextDueDate: nextDueDate ? new Date(nextDueDate + "T00:00:00") : undefined,
            }),
          })

          if (!billingResponse.ok) {
            const billingResult = await billingResponse.json()
            setError(billingResult.error || "Failed to save billing period")
            return
          }
        }
      }

      router.push("/categories")
      router.refresh()
    } catch (error) {
      setError("Failed to save category")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? t.categories.newCategory : t.categories.editCategory}</CardTitle>
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
                    <FormLabel>{t.categories.categoryName}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.categories.categoryNamePlaceholder} disabled={isLoading} {...field} />
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
                    <FormLabel>{t.categories.categoryDescription}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.categories.categoryDescriptionPlaceholder}
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
                        placeholder={t.categories.iconPlaceholder}
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
              name="isCreditCard"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t.categories.isCreditCard || "Tarjeta de crédito"}
                    </FormLabel>
                    <FormDescription>
                      {t.categories.isCreditCardDescription || "Habilita la opción de cuotas al crear gastos con esta categoría"}
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

            {/* Billing Period Section - only show for credit cards */}
            {isCreditCard && (
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <h3 className="text-base font-medium">{t.billingPeriod.title}</h3>
                  <p className="text-sm text-muted-foreground">{t.billingPeriod.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentClosingDate">{t.billingPeriod.closingDate}</Label>
                    <Input
                      id="currentClosingDate"
                      type="date"
                      disabled={isLoading}
                      value={currentClosingDate}
                      onChange={(e) => setCurrentClosingDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.billingPeriod.closingDateDescription}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentDueDate">{t.billingPeriod.dueDate}</Label>
                    <Input
                      id="currentDueDate"
                      type="date"
                      disabled={isLoading}
                      value={currentDueDate}
                      onChange={(e) => setCurrentDueDate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.billingPeriod.dueDateDescription}
                    </p>
                  </div>
                </div>

                {/* Next period - optional */}
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-3">{t.billingPeriod.nextPeriod} - ({t.common.optional})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nextClosingDate">{t.billingPeriod.nextClosingDate}</Label>
                      <Input
                        id="nextClosingDate"
                        type="date"
                        disabled={isLoading}
                        value={nextClosingDate}
                        onChange={(e) => setNextClosingDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextDueDate">{t.billingPeriod.nextDueDate}</Label>
                      <Input
                        id="nextDueDate"
                        type="date"
                        disabled={isLoading}
                        value={nextDueDate}
                        onChange={(e) => setNextDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/categories")}
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
