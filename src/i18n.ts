import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr";
import ar from "./locales/ar";

export type Language = "fr" | "ar";
const STORAGE_KEY = "soutienpro.language";

function savedLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

function applyDirection(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
}

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, ar: { translation: ar } },
  lng: savedLanguage(),
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

applyDirection(i18n.language);
i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Préférence non persistée : sans conséquence.
  }
});

export default i18n;
