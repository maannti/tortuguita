"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CategoryFilter } from "@/components/category-filter";
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
  totalInstallments: number | null;
  currentInstallment: number | null;
  installmentGroupId: string | null;
  billType: {
    id: string;
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

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface BillsContentProps {
  bills: BillData[];
  availableMonths: string[];
  categories: Category[];
}

export function BillsContent({ bills, availableMonths, categories }: BillsContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t.bills.title}</h1>
          <div className="flex flex-col items-end gap-2">
            <MonthFilter availableMonths={availableMonths} />
            <CategoryFilter categories={categories} />
          </div>
        </div>
        <p className="text-muted-foreground">{t.bills.subtitle}</p>
        <Button asChild size="lg" className="w-full sm:w-auto">
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
        <div className="space-y-2">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              style={{ backgroundColor: getPastelBackground(bill.billType.color) }}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-foreground/60 mb-0.5">
                      <span>{bill.paymentDate}</span>
                      {bill.billType.icon && <span>{bill.billType.icon}</span>}
                      {bill.totalInstallments && bill.currentInstallment && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          cuota {bill.currentInstallment}/{bill.totalInstallments}
                        </span>
                      )}
                    </div>
                    <p className="font-medium leading-snug text-foreground/90">{bill.label}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap text-foreground/90">${bill.amount.toFixed(2)}</span>
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-black/10 -mr-2">
                          <MoreVertical className="h-4 w-4 text-foreground/70" />
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
                    <DialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-md w-[calc(100%-2rem)] max-w-md">
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
                        {bill.totalInstallments && bill.currentInstallment && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Cuota</p>
                            <p className="text-sm">{bill.currentInstallment} de {bill.totalInstallments}</p>
                          </div>
                        )}
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
      )}
    </div>
  );
}
