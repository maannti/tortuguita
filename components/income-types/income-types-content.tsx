"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteIncomeTypeButton } from "@/components/income-types/delete-income-type-button";
import { useTranslations } from "@/components/providers/language-provider";
import { Pencil, RefreshCw } from "lucide-react";

interface IncomeTypeData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isRecurring: boolean;
}

interface IncomeTypesContentProps {
  incomeTypes: IncomeTypeData[];
}

export function IncomeTypesContent({ incomeTypes }: IncomeTypesContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.incomeTypes?.title || "Categorías de Ingresos"}</h1>
          <p className="text-muted-foreground">{t.incomeTypes?.subtitle || "Gestiona tus categorías de ingresos"}</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/income-types/new">{t.incomeTypes?.addIncomeType || "Agregar Categoría"}</Link>
        </Button>
      </div>

      {incomeTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t.incomeTypes?.noIncomeTypesYet || "No hay categorías de ingresos aún"}</p>
            <Button asChild>
              <Link href="/income-types/new">{t.incomeTypes?.addFirstIncomeType || "Crea tu primera categoría"}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {incomeTypes.map((incomeType) => (
            <Card key={incomeType.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {incomeType.icon && <span className="text-2xl flex-shrink-0">{incomeType.icon}</span>}
                  {!incomeType.icon && incomeType.color && (
                    <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ backgroundColor: incomeType.color }} />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg truncate">{incomeType.name}</p>
                      {incomeType.isRecurring && (
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {incomeType.description && (
                      <p className="text-sm text-muted-foreground truncate">{incomeType.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Button variant="outline" size="icon" className="h-10 w-10" asChild>
                    <Link href={`/income-types/${incomeType.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteIncomeTypeButton id={incomeType.id} name={incomeType.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
