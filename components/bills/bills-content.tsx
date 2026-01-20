"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryBadge } from "@/components/categories/category-badge";
import { DeleteBillButton } from "@/components/bills/delete-bill-button";
import { MonthFilter } from "@/components/month-filter";
import { Info, Pencil } from "lucide-react";
import { useTranslations } from "@/components/providers/language-provider";

interface BillData {
  id: string;
  label: string;
  amount: number;
  paymentDate: string;
  dueDate: string | null;
  notes: string | null;
  billType: {
    name: string;
    color: string | null;
    icon: string | null;
  };
  user: {
    name: string | null;
  };
  assignments: {
    id: string;
    percentage: number;
    user: {
      name: string | null;
    };
  }[];
}

interface BillsContentProps {
  bills: BillData[];
  availableMonths: string[];
}

export function BillsContent({ bills, availableMonths }: BillsContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t.bills.title}</h1>
          <MonthFilter availableMonths={availableMonths} />
        </div>
        <p className="text-muted-foreground">{t.bills.subtitle}</p>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/bills/new">{t.bills.addBill}</Link>
        </Button>
      </div>

      {bills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t.bills.noBillsYet}</p>
            <Button asChild>
              <Link href="/bills/new">{t.bills.addFirstBill}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-2 md:hidden">
            {bills.map((bill) => (
              <Card key={bill.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{bill.paymentDate}</span>
                      </div>
                      <p className="font-medium truncate">{bill.label}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold whitespace-nowrap">${bill.amount.toFixed(2)}</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="end">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{t.bills.category}</p>
                              <CategoryBadge
                                name={bill.billType.name}
                                color={bill.billType.color}
                                icon={bill.billType.icon}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.bills.addedBy}</p>
                              <p className="text-sm">{bill.user.name}</p>
                            </div>
                            {bill.dueDate && (
                              <div>
                                <p className="text-xs text-muted-foreground">{t.bills.dueDate}</p>
                                <p className="text-sm">{bill.dueDate}</p>
                              </div>
                            )}
                            {bill.notes && (
                              <div>
                                <p className="text-xs text-muted-foreground">{t.bills.notes}</p>
                                <p className="text-sm">{bill.notes}</p>
                              </div>
                            )}
                            {bill.assignments.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">{t.bills.assignments}</p>
                                <div className="text-sm space-y-0.5">
                                  {bill.assignments.map((a) => (
                                    <p key={a.id}>
                                      {a.user.name} ({a.percentage}%)
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/bills/${bill.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteBillButton id={bill.id} label={bill.label} iconOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table view */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.date}</TableHead>
                    <TableHead>{t.common.description}</TableHead>
                    <TableHead>{t.bills.category}</TableHead>
                    <TableHead>{t.bills.addedBy}</TableHead>
                    <TableHead className="text-right">{t.common.amount}</TableHead>
                    <TableHead className="text-right">{t.common.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.paymentDate}</TableCell>
                      <TableCell className="font-medium">{bill.label}</TableCell>
                      <TableCell>
                        <CategoryBadge
                          name={bill.billType.name}
                          color={bill.billType.color}
                          icon={bill.billType.icon}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{bill.user.name}</TableCell>
                      <TableCell className="text-right font-medium">${bill.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/bills/${bill.id}/edit`}>{t.common.edit}</Link>
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
        </>
      )}
    </div>
  );
}
