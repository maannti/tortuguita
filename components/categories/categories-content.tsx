"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCategoryButton } from "@/components/categories/delete-category-button";
import { useTranslations } from "@/components/providers/language-provider";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.categories.title}</h1>
          <p className="text-muted-foreground">{t.categories.subtitle}</p>
        </div>
        <Button asChild>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {category.icon && <span className="text-2xl">{category.icon}</span>}
                    {!category.icon && category.color && (
                      <div className="h-6 w-6 rounded-full" style={{ backgroundColor: category.color }} />
                    )}
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                  </div>
                </div>
                {category.description && <CardDescription>{category.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/categories/${category.id}/edit`}>{t.common.edit}</Link>
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
