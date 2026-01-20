"use client";

import * as React from "react";
import { translations, defaultLanguage, type Language, type Translations } from "@/lib/i18n";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "app-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(defaultLanguage);
  const [mounted, setMounted] = React.useState(false);

  // Load language from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && (stored === "en" || stored === "es")) {
      setLanguageState(stored);
    }
    setMounted(true);
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language, setLanguage]
  );

  // Prevent hydration mismatch by using default language until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: defaultLanguage,
          setLanguage,
          t: translations[defaultLanguage],
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
