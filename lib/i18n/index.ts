import { en, type Translations } from "./translations/en";
import { es } from "./translations/es";

export type Language = "en" | "es";

export const translations: Record<Language, Translations> = {
  en,
  es,
};

export const languageNames: Record<Language, string> = {
  en: "English",
  es: "Español",
};

export const defaultLanguage: Language = "es";

export type { Translations };
export { en, es };
