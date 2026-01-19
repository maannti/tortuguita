import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CategoryBadge } from "@/components/categories/category-badge"
import { format, parse, startOfMonth, endOfMonth } from "date-fns"
import { DeleteBillButton } from "@/components/bills/delete-bill-button"
import { MonthFilter } from "@/components/month-filter"
import type { Prisma } from "@prisma/client"

type BillWithRelations = Prisma.BillGetPayload<{
  include: {
    billType: true
    user: {
      select: {
        name: true
      }
    }
  }
}>

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BillsPage({ searchParams }: PageProps) {
  const session = await auth()

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const params = await searchParams
  const selectedMonth = params.month

  // Get available months (months with expenses)
  const monthsWithExpenses = await prisma.bill.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      paymentDate: true,
    },
    distinct: ["paymentDate"],
  })

  const availableMonthsSet = new Set<string>()
  for (const bill of monthsWithExpenses) {
    availableMonthsSet.add(format(new Date(bill.paymentDate), "yyyy-MM"))
  }
  const availableMonths = Array.from(availableMonthsSet).sort().reverse()

  // Build where clause with optional month filter
  const whereClause: Prisma.BillWhereInput = {
    organizationId: session.user.organizationId,
  }

  if (selectedMonth) {
    const targetDate = parse(selectedMonth, "yyyy-MM", new Date())
    whereClause.paymentDate = {
      gte: startOfMonth(targetDate),
      lte: endOfMonth(targetDate),
    }
  }

  const bills: BillWithRelations[] = await prisma.bill.findMany({
    where: whereClause,
    include: {
      billType: true,
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      paymentDate: "desc",
    },
  })

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <MonthFilter availableMonths={availableMonths} />
        </div>
        <p className="text-muted-foreground">
          Track and manage your expenses
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/bills/new">Add Bill</Link>
        </Button>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No bills yet</p>
            <Button asChild>
              <Link href="/bills/new">Add your first bill</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      {format(new Date(bill.paymentDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{bill.label}</TableCell>
                    <TableCell>
                      <CategoryBadge
                        name={bill.billType.name}
                        color={bill.billType.color}
                        icon={bill.billType.icon}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bill.user.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(bill.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/bills/${bill.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteBillButton id={bill.id} label={bill.label} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
