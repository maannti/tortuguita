"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tag, X } from "lucide-react"

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface CategoryFilterProps {
  categories: Category[]
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedCategory = searchParams.get("category")

  const handleSelectCategory = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categoryId) {
      params.set("category", categoryId)
    } else {
      params.delete("category")
    }
    router.push(`?${params.toString()}`)
  }

  const selectedCategoryData = categories.find(c => c.id === selectedCategory)
  const selectedLabel = selectedCategoryData
    ? selectedCategoryData.name
    : "All categories"

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {selectedCategoryData?.icon ? (
              <span>{selectedCategoryData.icon}</span>
            ) : (
              <Tag className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{selectedLabel}</span>
            <span className="sm:hidden">
              {selectedCategoryData ? selectedCategoryData.name.slice(0, 3) : "All"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
          <DropdownMenuItem
            onClick={() => handleSelectCategory(null)}
            className={!selectedCategory ? "bg-muted" : ""}
          >
            All categories
          </DropdownMenuItem>
          {categories.map((category) => (
            <DropdownMenuItem
              key={category.id}
              onClick={() => handleSelectCategory(category.id)}
              className={selectedCategory === category.id ? "bg-muted" : ""}
            >
              <span className="flex items-center gap-2">
                {category.icon && <span>{category.icon}</span>}
                {category.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedCategory && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelectCategory(null)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
