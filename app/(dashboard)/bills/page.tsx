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
import { format } from "date-fns"
import { DeleteBillButton } from "@/components/bills/delete-bill-button"

export default async function BillsPage() {
  const session = await auth()

  if (!session?.user?.organizationId) {
    return <div>Unauthorized</div>
  }

  const bills = await prisma.bill.findMany({
    where: {
      organizationId: session.user.organizationId,
    },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground">
            Track and manage your expenses
          </p>
        </div>
        <Button asChild>
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
