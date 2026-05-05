import { CategoryFormV2 } from "@/components/categories/category-form-v2"

interface PageProps { searchParams: Promise<{ spaceId?: string; spaceName?: string; returnTo?: string }> }

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  return (
    <CategoryFormV2
      mode="create"
      organizationId={params.spaceId}
      spaceName={params.spaceName}
      returnTo={params.returnTo}
    />
  )
}
