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
import { DeleteIncomeButton } from "@/components/incomes/delete-income-button";
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

interface IncomeData {
  id: string;
  label: string;
  amount: number;
  incomeDate: string;
  notes: string | null;
  incomeType: {
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

interface IncomesContentProps {
  incomes: IncomeData[];
  availableMonths: string[];
  categories: Category[];
}

export function IncomesContent({ incomes, availableMonths, categories }: IncomesContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.incomes?.title || "Ingresos"}</h1>
          <p className="text-muted-foreground">{t.incomes?.subtitle || "Gestiona y registra tus ingresos"}</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthFilter availableMonths={availableMonths} />
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/incomes/new">{t.incomes?.addIncome || "Agregar Ingreso"}</Link>
        </Button>
      </div>

      {incomes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t.incomes?.noIncomesYet || "No hay ingresos aún"}</p>
            <Button asChild>
              <Link href="/incomes/new">{t.incomes?.addFirstIncome || "Agrega tu primer ingreso"}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incomes.map((income) => (
            <Card
              key={income.id}
              style={{ backgroundColor: getPastelBackground(income.incomeType.color) }}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-foreground/60 mb-0.5">
                      <span>{income.incomeDate}</span>
                      {income.incomeType.icon && <span>{income.incomeType.icon}</span>}
                    </div>
                    <p className="font-medium leading-snug text-foreground/90">{income.label}</p>
                  </div>
                  <span className="font-semibold whitespace-nowrap text-green-600 dark:text-green-400">+${income.amount.toFixed(2)}</span>
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
                            {t.incomes?.details || "Detalles"}
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem asChild className="rounded-xl py-2.5 px-3">
                          <Link href={`/incomes/${income.id}/edit`} className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            {t.common.edit}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1.5" />
                        <DeleteIncomeButton id={income.id} label={income.label} asMenuItem />
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-md w-[calc(100%-2rem)] max-w-md">
                      <DialogHeader>
                        <DialogTitle>{income.label}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.incomes?.category || "Categoría"}</p>
                            <CategoryBadge
                              name={income.incomeType.name}
                              color={income.incomeType.color}
                              icon={income.incomeType.icon}
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">{t.common.amount}</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">+${income.amount.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.incomes?.incomeDate || "Fecha de Ingreso"}</p>
                            <p className="text-sm">{income.incomeDate}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.incomes?.addedBy || "Agregado Por"}</p>
                            <p className="text-sm">{income.user.name}</p>
                          </div>
                        </div>
                        {income.notes && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.incomes?.notes || "Notas"}</p>
                            <p className="text-sm">{income.notes}</p>
                          </div>
                        )}
                        {income.assignments.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.incomes?.assignments || "Asignaciones"}</p>
                            <div className="text-sm space-y-0.5">
                              {income.assignments.map((a) => (
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
