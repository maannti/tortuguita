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
import { DeleteBillButton } from "@/components/bills/delete-bill-button";
import { MonthFilter } from "@/components/month-filter";
import { CategoryFilter } from "@/components/category-filter";
import { Info, Pencil, MoreVertical } from "lucide-react";
import { useTranslations } from "@/components/providers/language-provider";

function getPastelBackground(hexColor: string | null): string {
  if (!hexColor) return "transparent";
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
  budgetDate: string;
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
    isCreditCard?: boolean;
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.bills.title}</h1>
          <p className="text-muted-foreground">{t.bills.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthFilter availableMonths={availableMonths} />
          <CategoryFilter categories={categories} />
        </div>
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
                      <span>{bill.budgetDate}</span>
                      {bill.billType.icon && <span>{bill.billType.icon}</span>}
                      {bill.totalInstallments && bill.currentInstallment && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          cuota {bill.currentInstallment}/{bill.totalInstallments}
                        </span>
                      )}
                      {bill.billType.isCreditCard && bill.paymentDate !== bill.budgetDate && (
                        <span className="text-foreground/40">
                          ({bill.paymentDate})
                        </span>
                      )}
                    </div>
                    <p className="font-medium leading-snug text-foreground/90">{bill.label}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap text-foreground/90">${bill.amount.toFixed(2)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 flex-shrink-0 rounded-full hover:bg-black/10 -mr-2">
                        <MoreVertical className="size-4 text-foreground/70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-2xl bg-background/95 backdrop-blur-sm border-border/50 p-1.5">
                      <DropdownMenuItem asChild className="rounded-xl py-2.5 px-3">
                        <Link href={`/bills/${bill.id}`} className="flex items-center gap-2">
                          <Info className="size-4" />
                          {t.bills.details}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="rounded-xl py-2.5 px-3">
                        <Link href={`/bills/${bill.id}/edit`} className="flex items-center gap-2">
                          <Pencil className="size-4" />
                          {t.common.edit}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5" />
                      <DeleteBillButton id={bill.id} label={bill.label} asMenuItem />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
