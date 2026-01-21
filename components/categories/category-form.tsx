"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "@/components/providers/language-provider"

const defaultColors = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

interface CategoryFormProps {
  initialData?: BillTypeFormData & { id: string }
  mode: "create" | "edit"
}

export function CategoryForm({ initialData, mode }: CategoryFormProps) {
  const router = useRouter()
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<BillTypeFormData>({
    resolver: zodResolver(billTypeSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      color: defaultColors[0],
      icon: "",
    },
  })

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

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.categories.color}</FormLabel>
                  <FormDescription>
                    {t.categories.colorDescription}
                  </FormDescription>
                  <div className="flex gap-2 flex-wrap">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`h-10 w-10 rounded-full border-2 transition-all ${
                          field.value === color
                            ? "border-gray-900 dark:border-gray-100 scale-110"
                            : "border-gray-300 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <FormControl>
                    <Input
                      placeholder="#3b82f6"
                      disabled={isLoading}
                      {...field}
                      className="mt-2"
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
                  <FormLabel>{t.categories.icon}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.categories.iconPlaceholder}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t.categories.iconDescription}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col md:flex-row gap-3">
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading ? t.categories.saving : mode === "create" ? t.categories.create : t.categories.update}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/categories")}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
