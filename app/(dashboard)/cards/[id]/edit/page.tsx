import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CardForm } from "@/components/cards/card-form"
import { notFound } from "next/navigation"

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params
  if (!session?.user?.currentOrganizationId) return <div>Unauthorized</div>

  const card = await prisma.billType.findFirst({
    where: { id, organizationId: session.user.currentOrganizationId, isCreditCard: true },
  })
  if (!card) notFound()

  return (
    <CardForm
      mode="edit"
      initialData={{ id: card.id, name: card.name, color: card.color, icon: card.icon }}
    />
  )
}
