"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage, useTranslations } from "@/components/providers/language-provider";
import type { Language } from "@/lib/i18n";

const languages: { code: Language; flag: string }[] = [
  { code: "es", flag: "🇪🇸" },
  { code: "en", flag: "🇺🇸" },
];

export function SettingsSidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const { language, setLanguage } = useLanguage();

  const navItems = [
    { href: "/settings/profile", label: t.nav.profile },
    { href: "/settings/organization", label: t.nav.organization },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-md transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-3">{t.settings.language}</p>
        <div className="flex gap-1 px-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "text-2xl p-2 rounded-md transition-all",
                language === lang.code
                  ? "bg-primary/20 ring-2 ring-primary"
                  : "hover:bg-muted opacity-60 hover:opacity-100"
              )}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
