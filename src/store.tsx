import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { bilans, donneesVides, normaliser, prixSeance } from "./lib/calculs";
import { aujourdhui, nouvelId } from "./lib/format";
import { charger, sauver } from "./lib/stockage";
import type { Bilan, Donnees, Eleve, Parametres } from "./lib/types";

export type ChampsEleve = Pick<Eleve, "nom" | "prenom" | "telephone" | "niveau">;

interface Store {
  donnees: Donnees;
  bilans: Bilan[];
  bilanDe(id: string): Bilan | undefined;
  ajouterEleve(c: ChampsEleve): string;
  modifierEleve(id: string, c: Partial<Eleve>): void;
  supprimerEleve(id: string): void;
  presentsLe(date: string): Set<string>;
  enregistrerPresence(date: string, ids: string[]): void;
  ajouterSeance(eleveId: string, date: string): boolean;
  supprimerSeance(id: string): void;
  ajouterPaiement(eleveId: string, montant: number, date: string, note: string): void;
  supprimerPaiement(id: string): void;
  definirParametres(p: Parametres): void;
  remplacer(d: unknown): void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const premier = useRef(true);

  useEffect(() => {
    charger()
      .then((brut) => setDonnees(brut ? normaliser(brut) : donneesVides()))
      .catch(() => setDonnees(donneesVides()));
  }, []);

  useEffect(() => {
    if (!donnees) return;
    if (premier.current) {
      premier.current = false;
      return;
    }
    sauver(donnees);
  }, [donnees]);

  const maj = useCallback((f: (d: Donnees) => Donnees) => setDonnees((d) => (d ? f(d) : d)), []);

  const store = useMemo<Store | null>(() => {
    if (!donnees) return null;
    const liste = bilans(donnees);
    const parId = new Map(liste.map((b) => [b.eleve.id, b]));
    const prix = prixSeance(donnees.parametres);
    return {
      donnees,
      bilans: liste,
      bilanDe: (id) => parId.get(id),
      ajouterEleve(c) {
        const id = nouvelId();
        const eleve: Eleve = {
          id, nom: c.nom.trim(), prenom: c.prenom.trim(), telephone: c.telephone.trim(),
          niveau: c.niveau.trim(), actif: true, dateInscription: aujourdhui(),
        };
        maj((d) => ({ ...d, eleves: [...d.eleves, eleve] }));
        return id;
      },
      modifierEleve(id, c) {
        maj((d) => ({ ...d, eleves: d.eleves.map((e) => (e.id === id ? { ...e, ...c } : e)) }));
      },
      supprimerEleve(id) {
        maj((d) => ({
          ...d,
          eleves: d.eleves.filter((e) => e.id !== id),
          seances: d.seances.filter((s) => s.eleveId !== id),
          paiements: d.paiements.filter((p) => p.eleveId !== id),
        }));
      },
      presentsLe(date) {
        return new Set(donnees.seances.filter((s) => s.date === date).map((s) => s.eleveId));
      },
      enregistrerPresence(date, ids) {
        const voulus = new Set(ids);
        maj((d) => {
          const deja = new Set(d.seances.filter((s) => s.date === date).map((s) => s.eleveId));
          const gardees = d.seances.filter((s) => s.date !== date || voulus.has(s.eleveId));
          const nouvelles = ids
            .filter((id) => !deja.has(id))
            .map((eleveId) => ({ id: nouvelId(), eleveId, date, prix }));
          return { ...d, seances: [...gardees, ...nouvelles] };
        });
      },
      ajouterSeance(eleveId, date) {
        if (donnees.seances.some((s) => s.eleveId === eleveId && s.date === date)) return false;
        maj((d) => ({ ...d, seances: [...d.seances, { id: nouvelId(), eleveId, date, prix }] }));
        return true;
      },
      supprimerSeance(id) {
        maj((d) => ({ ...d, seances: d.seances.filter((s) => s.id !== id) }));
      },
      ajouterPaiement(eleveId, montant, date, note) {
        maj((d) => ({
          ...d,
          paiements: [...d.paiements, { id: nouvelId(), eleveId, montant, date, note: note.trim() }],
        }));
      },
      supprimerPaiement(id) {
        maj((d) => ({ ...d, paiements: d.paiements.filter((p) => p.id !== id) }));
      },
      definirParametres(p) {
        maj((d) => ({ ...d, parametres: p }));
      },
      remplacer(brut) {
        const d = normaliser(brut);
        setDonnees(d);
      },
    };
  }, [donnees, maj]);

  if (!store) {
    return <div className="grid h-screen place-items-center bg-creme text-brun-400">Chargement…</div>;
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore hors du StoreProvider");
  return s;
}
