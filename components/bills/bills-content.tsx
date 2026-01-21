"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CategoryBadge } from "@/components/categories/category-badge";
import { DeleteBillButton } from "@/components/bills/delete-bill-button";
import { MonthFilter } from "@/components/month-filter";
import { Info, Pencil, MoreVertical } from "lucide-react";
import { useTranslations } from "@/components/providers/language-provider";

// Convert hex color to pastel version with low opacity
function getPastelBackground(hexColor: string | null): string {
  if (!hexColor) return "transparent";
  // Return the color with very low opacity for subtle effect
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.08)`;
}

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
              <Card
                key={bill.id}
                style={{ backgroundColor: getPastelBackground(bill.billType.color) }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{bill.paymentDate}</span>
                        {bill.billType.icon && <span>{bill.billType.icon}</span>}
                      </div>
                      <p className="font-medium leading-snug">{bill.label}</p>
                    </div>
                    <span className="font-semibold whitespace-nowrap pt-0.5">${bill.amount.toFixed(2)}</span>
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-1 rounded-full hover:bg-black/5">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-2xl bg-background/95 backdrop-blur-sm border-border/50 p-1.5">
                          <DialogTrigger asChild>
                            <DropdownMenuItem className="flex items-center gap-2 rounded-xl py-2.5 px-3">
                              <Info className="h-4 w-4" />
                              {t.bills.details}
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DropdownMenuItem asChild className="rounded-xl py-2.5 px-3">
                            <Link href={`/bills/${bill.id}/edit`} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              {t.common.edit}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1.5" />
                          <DeleteBillButton id={bill.id} label={bill.label} asMenuItem />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-md mx-4 max-w-[calc(100%-2rem)]">
                        <DialogHeader>
                          <DialogTitle>{bill.label}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.category}</p>
                              <CategoryBadge
                                name={bill.billType.name}
                                color={bill.billType.color}
                                icon={bill.billType.icon}
                              />
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-1">{t.common.amount}</p>
                              <p className="text-lg font-semibold">${bill.amount.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.paymentDate}</p>
                              <p className="text-sm">{bill.paymentDate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.addedBy}</p>
                              <p className="text-sm">{bill.user.name}</p>
                            </div>
                          </div>
                          {bill.dueDate && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.dueDate}</p>
                              <p className="text-sm">{bill.dueDate}</p>
                            </div>
                          )}
                          {bill.notes && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.notes}</p>
                              <p className="text-sm">{bill.notes}</p>
                            </div>
                          )}
                          {bill.assignments.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">{t.bills.assignments}</p>
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
                      </DialogContent>
                    </Dialog>
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
