"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage, useTranslations } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

const languages: { code: Language; name: string; flag: string }[] = [
  { code: "es", name: "Español", flag: "🇦🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

export function LanguageSettings() {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.language}</CardTitle>
        <CardDescription>{t.settings.languageDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
                language === lang.code
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted"
              )}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
