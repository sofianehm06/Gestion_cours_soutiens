import type { Bilan, Donnees, Parametres } from "./types";

export const PARAMETRES_DEFAUT: Parametres = {
  nomEtablissement: "Cours de soutien",
  nomProf: "",
  tarifMensuel: 1500,
  seancesParMois: 4,
};

export function donneesVides(): Donnees {
  return { version: 1, parametres: { ...PARAMETRES_DEFAUT }, eleves: [], seances: [], paiements: [] };
}

/** Complète des données chargées (anciennes versions, sauvegarde partielle…). */
export function normaliser(brut: unknown): Donnees {
  const d = (brut ?? {}) as Partial<Donnees>;
  if (!Array.isArray(d.eleves) || !Array.isArray(d.seances) || !Array.isArray(d.paiements)) {
    throw new Error("Fichier de données invalide.");
  }
  return {
    version: 1,
    parametres: { ...PARAMETRES_DEFAUT, ...(d.parametres ?? {}) },
    eleves: d.eleves,
    seances: d.seances,
    paiements: d.paiements,
  };
}

export const prixSeance = (p: Parametres) => p.tarifMensuel / p.seancesParMois;

export function bilans(d: Donnees): Bilan[] {
  const map = new Map<string, Bilan>();
  for (const eleve of d.eleves) map.set(eleve.id, { eleve, seances: 0, du: 0, paye: 0, reste: 0 });
  for (const s of d.seances) {
    const b = map.get(s.eleveId);
    if (b) {
      b.seances += 1;
      b.du += s.prix;
    }
  }
  for (const p of d.paiements) {
    const b = map.get(p.eleveId);
    if (b) b.paye += p.montant;
  }
  for (const b of map.values()) b.reste = b.du - b.paye;
  return [...map.values()].sort(comparerEleves);
}

export function comparerEleves(a: { eleve: { nom: string; prenom: string } }, b: { eleve: { nom: string; prenom: string } }) {
  return (
    a.eleve.nom.localeCompare(b.eleve.nom, "fr", { sensitivity: "base" }) ||
    a.eleve.prenom.localeCompare(b.eleve.prenom, "fr", { sensitivity: "base" })
  );
}

/** « 1 mois + 2 séances » */
export function detailSeances(nb: number, parMois: number): string {
  const mois = Math.floor(nb / parMois);
  const reste = nb % parMois;
  const parts: string[] = [];
  if (mois) parts.push(`${mois} mois`);
  if (reste) parts.push(`${reste} séance${reste > 1 ? "s" : ""}`);
  return parts.join(" + ") || "Aucune séance";
}

/** Séances en cours dans le mois entamé (ex. 6 séances → 2/4). */
export function progressionMois(nb: number, parMois: number): number {
  const r = nb % parMois;
  return r === 0 && nb > 0 ? parMois : r;
}

export type Statut = "doit" | "ajour" | "avance";

export function statut(reste: number): Statut {
  if (reste > 0.5) return "doit";
  if (reste < -0.5) return "avance";
  return "ajour";
}

export function correspond(eleve: { nom: string; prenom: string; telephone?: string }, recherche: string) {
  const q = sansAccents(recherche.trim());
  if (!q) return true;
  const cible = sansAccents(`${eleve.nom} ${eleve.prenom} ${eleve.prenom} ${eleve.nom} ${eleve.telephone ?? ""}`);
  return q.split(/\s+/).every((mot) => cible.includes(mot));
}

function sansAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function statsMois(d: Donnees, mois: string) {
  const seances = d.seances.filter((s) => s.date.startsWith(mois));
  const encaisse = d.paiements.filter((p) => p.date.startsWith(mois)).reduce((t, p) => t + p.montant, 0);
  return {
    seances: seances.length,
    joursDeCours: new Set(seances.map((s) => s.date)).size,
    encaisse,
  };
}

export function exporterCsv(d: Donnees): string {
  const lignes = [["Nom", "Prénom", "Téléphone", "Niveau", "Actif", "Séances", "Montant dû (DA)", "Payé (DA)", "Reste (DA)"]];
  for (const b of bilans(d)) {
    lignes.push([
      b.eleve.nom, b.eleve.prenom, b.eleve.telephone, b.eleve.niveau, b.eleve.actif ? "oui" : "non",
      String(b.seances), b.du.toFixed(0), b.paye.toFixed(0), b.reste.toFixed(0),
    ]);
  }
  const echapper = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + lignes.map((l) => l.map(echapper).join(";")).join("\r\n");
}
