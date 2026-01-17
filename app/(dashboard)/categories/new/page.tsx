import { CategoryForm } from "@/components/categories/category-form"

export default function NewCategoryPage() {
  return (
    <div className="max-w-2xl">
      <CategoryForm mode="create" />
    </div>
  )
}
