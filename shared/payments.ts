import { PAYMENT_DUE_DAY, type PaymentStatus } from "./types";

/** Statut d'un mois non payé, selon la date du jour. */
export function unpaidStatus(year: number, month: number, today: Date): PaymentStatus {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) return "late";
  if (year === currentYear && month === currentMonth && today.getDate() > PAYMENT_DUE_DAY) return "late";
  return "pending";
}

/** Dernier jour du mois au format AAAA-MM-JJ. */
export function monthEnd(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Date locale au format AAAA-MM-JJ. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
