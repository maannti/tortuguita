import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BillDetail } from "@/components/bills/bill-detail"
import { getUserOrganizations } from "@/lib/organization-utils"

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return <div>Unauthorized</div>
  }

  const userOrgs = await getUserOrganizations(session.user.id)
  const orgIds = userOrgs.map(o => o.id)

  const bill = await prisma.bill.findFirst({
    where: {
      id,
      organizationId: { in: orgIds },
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
      category: {
        select: {
          name: true,
          color: true,
          icon: true,
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

  const spaceName = userOrgs.find(o => o.id === bill.organizationId)?.name ?? null

  return (
    <BillDetail
      bill={{
        id: bill.id,
        label: bill.label,
        amount: Number(bill.amount),
        amountUSD: bill.amountUSD ? Number(bill.amountUSD) : null,
        paymentDate: formatDate(bill.paymentDate),
        budgetDate: formatDate(bill.budgetDate),
        dueDate: validDate(bill.dueDate) ? formatDate(bill.dueDate!) : null,
        notes: bill.notes,
        totalInstallments: bill.totalInstallments,
        currentInstallment: bill.currentInstallment,
        billType: bill.billType,
        category: bill.category,
        user: bill.user,
        spaceName,
        installmentGroupId: bill.installmentGroupId,
        assignments: bill.assignments.map((a) => ({
          id: a.id,
          percentage: Number(a.percentage),
          user: a.user,
        })),
      }}
    />
  )
}
