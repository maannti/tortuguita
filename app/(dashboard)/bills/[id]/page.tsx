import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BillDetail } from "@/components/bills/bill-detail"

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  const bill = await prisma.bill.findFirst({
    where: {
      id,
      organizationId: session.user.currentOrganizationId,
    },
    include: {
      billType: {
        select: {
          name: true,
          color: true,
          icon: true,
          isCreditCard: true,
        },
      },
      user: {
        select: { name: true },
      },
      assignments: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  })

  if (!bill) notFound()

  const formatDate = (d: Date) => format(new Date(d), "d 'de' MMMM yyyy", { locale: es })
  // Descarta fechas inválidas del epoch (app vieja guardaba timestamp 0 en vez de null)
  const validDate = (d: Date | null): Date | null => {
    if (!d) return null
    const parsed = new Date(d)
    return parsed.getFullYear() >= 2000 ? parsed : null
  }

  return (
    <BillDetail
      bill={{
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        paymentDate: formatDate(bill.paymentDate),
        budgetDate: formatDate(bill.budgetDate),
        dueDate: validDate(bill.dueDate) ? formatDate(bill.dueDate!) : null,
        notes: bill.notes,
        totalInstallments: bill.totalInstallments,
        currentInstallment: bill.currentInstallment,
        billType: bill.billType,
        user: bill.user,
        assignments: bill.assignments.map((a) => ({
          id: a.id,
          percentage: Number(a.percentage),
          user: a.user,
        })),
      }}
    />
  )
}
