"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteCategoryButton } from "@/components/categories/delete-category-button";
import { useTranslations } from "@/components/providers/language-provider";
import { Pencil } from "lucide-react";

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
}

interface CategoriesContentProps {
  categories: CategoryData[];
}

export function CategoriesContent({ categories }: CategoriesContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.categories.title}</h1>
          <p className="text-muted-foreground">{t.categories.subtitle}</p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/categories/new">{t.categories.addCategory}</Link>
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">{t.categories.noCategoriesYet}</p>
            <Button asChild>
              <Link href="/categories/new">{t.categories.addFirstCategory}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {category.icon && <span className="text-2xl flex-shrink-0">{category.icon}</span>}
                  {!category.icon && category.color && (
                    <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-lg truncate">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground truncate">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Button variant="outline" size="icon" className="h-10 w-10" asChild>
                    <Link href={`/categories/${category.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteCategoryButton id={category.id} name={category.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
