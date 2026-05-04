import { CategoryFormV2 } from "@/components/categories/category-form-v2"

interface PageProps { searchParams: Promise<{ spaceId?: string }> }

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <CategoryFormV2 mode="create" organizationId={params.spaceId} />
}
