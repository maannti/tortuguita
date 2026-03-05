import { CategoryForm } from "@/components/categories/category-form"

export default function NewCategoryPage() {
  return (
    <div className="-mx-4 md:mx-0 md:max-w-3xl lg:mx-auto">
      <CategoryForm mode="create" />
    </div>
  )
}
