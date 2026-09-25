const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function da(montant: number): string {
  return `${Math.round(montant).toLocaleString("fr-FR").replace(/ | /g, " ")} DA`;
}

export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const aujourdhui = () => isoLocal(new Date());
export const moisCourant = () => aujourdhui().slice(0, 7);

export function versDate(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

export function decaler(iso: string, jours: number): string {
  const d = versDate(iso);
  d.setDate(d.getDate() + jours);
  return isoLocal(d);
}

export function dateCourte(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

export function dateLongue(iso: string): string {
  const d = versDate(iso);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function nomMois(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  return `${MOIS[m - 1]} ${a}`;
}

export function initiales(nom: string, prenom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export const nouvelId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
