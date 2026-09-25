import { useTranslation } from "react-i18next";

function numberLocale(lng: string) {
  return lng === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR";
}

/** Fonctions d'affichage dépendant de la langue courante. */
export function useFormat() {
  const { i18n } = useTranslation();
  const lng = i18n.language;
  const locale = numberLocale(lng);
  const currency = lng === "ar" ? "دج" : "DA";
  const numberFmt = new Intl.NumberFormat(locale);
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long" });

  return {
    money: (amount: number) => `${numberFmt.format(amount)} ${currency}`,
    monthName: (month: number) => capitalize(monthFmt.format(new Date(2000, month - 1, 1))),
    monthLabel: (year: number, month: number) => `${capitalize(monthFmt.format(new Date(2000, month - 1, 1)))} ${year}`,
    date: (iso: string | null) => {
      if (!iso) return "—";
      const [y, m, d] = iso.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    },
    weekday: (iso: string) =>
      capitalize(new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parseIso(iso))),
  };
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convertit une saisie en montant entier (espaces et séparateurs ignorés). */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[\s  .,]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
