import { CardForm } from "@/components/cards/card-form"

interface PageProps { searchParams: Promise<{ spaceId?: string }> }

export default async function NewCardPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <CardForm mode="create" organizationId={params.spaceId} />
}
