import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillForm } from "@/components/bills/bill-form"
import { notFound } from "next/navigation"

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const [bill, categories] = await Promise.all([
    prisma.bill.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    }),
    prisma.billType.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ])

  if (!bill) {
    notFound()
  }

  return (
    <div className="max-w-2xl">
      <BillForm
        mode="edit"
        categories={categories}
        initialData={{
          id: bill.id,
          label: bill.label,
          amount: Number(bill.amount),
          paymentDate: bill.paymentDate,
          dueDate: bill.dueDate,
          billTypeId: bill.billTypeId,
          notes: bill.notes || "",
        }}
      />
    </div>
  )
}
