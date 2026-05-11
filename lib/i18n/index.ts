import { en, type Translations } from "./translations/en";
import { es } from "./translations/es";

export type Language = "en" | "es";

export const translations: Record<Language, Translations> = {
  en,
  es,
};

export const defaultLanguage: Language = "es";

export type { Translations };
