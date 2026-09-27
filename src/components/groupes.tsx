import { Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { comparerGroupes, correspond, dansGroupe, SANS_GROUPE } from "../lib/calculs";
import type { Groupe } from "../lib/types";
import { useStore } from "../store";
import { Avatar, Bouton, Champ, Modale, cx, useUi } from "./ui";

/** Groupes triés par nom. */
export function useGroupes(): Groupe[] {
  const { donnees } = useStore();
  return [...donnees.groupes].sort(comparerGroupes);
}

/** Rangée de pastilles : Tous · Groupe A · Groupe B · Sans groupe. */
export function ChoixGroupe({ valeur, onChange, actifsSeulement = true }: { valeur: string; onChange(v: string): void; actifsSeulement?: boolean }) {
  const store = useStore();
  const groupes = useGroupes();
  if (!groupes.length) return null;
  const eleves = store.donnees.eleves.filter((e) => !actifsSeulement || e.actif);
  const options: [string, string][] = [["", "Tous"], ...groupes.map((g): [string, string] => [g.id, g.nom])];
  if (eleves.some((e) => !e.groupeId)) options.push([SANS_GROUPE, "Sans groupe"]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([id, lib]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cx(
            "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition cursor-pointer",
            valeur === id ? "bg-vert text-white" : "bg-creme-200 text-brun-600 hover:bg-creme-300",
          )}
        >
          {lib}
          <span className={cx("rounded-full px-1.5 text-[10px]", valeur === id ? "bg-white/20" : "bg-white/70")}>
            {eleves.filter((e) => dansGroupe(e, id)).length}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SelectGroupe({ label, value, onChange }: { label?: string; value: string; onChange(v: string): void }) {
  const groupes = useGroupes();
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-semibold text-brun-400">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-creme-300 bg-creme-100 px-3 text-sm outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10"
      >
        <option value="">— Sans groupe —</option>
        {groupes.map((g) => (
          <option key={g.id} value={g.id}>{g.nom}{g.horaire ? ` (${g.horaire})` : ""}</option>
        ))}
      </select>
    </label>
  );
}

export function DialogueGroupe({ groupe, onFermer, onCree }: { groupe?: Groupe; onFermer(): void; onCree?(id: string): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const [c, setC] = useState({ nom: groupe?.nom ?? "", horaire: groupe?.horaire ?? "" });
  const doublon = store.donnees.groupes.some(
    (g) => g.id !== groupe?.id && g.nom.trim().toLowerCase() === c.nom.trim().toLowerCase(),
  );
  const valide = c.nom.trim() && !doublon;

  function valider(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    if (groupe) {
      store.modifierGroupe(groupe.id, c);
      notifier("Groupe modifié");
    } else {
      const id = store.ajouterGroupe(c);
      notifier(`Groupe « ${c.nom.trim()} » créé`);
      onCree?.(id);
    }
    onFermer();
  }

  return (
    <Modale titre={groupe ? "Modifier le groupe" : "Nouveau groupe"} sousTitre={doublon ? "Un groupe porte déjà ce nom" : undefined} onFermer={onFermer} largeur={420}>
      <form onSubmit={valider} className="flex flex-col gap-4">
        <Champ label="Nom du groupe *" value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} placeholder="ex. 4AM Maths" autoFocus />
        <Champ label="Horaire" value={c.horaire} onChange={(e) => setC({ ...c, horaire: e.target.value })} placeholder="ex. Samedi 14h – 16h" />
        <div className="flex justify-end gap-2">
          <Bouton type="button" onClick={onFermer}>Annuler</Bouton>
          <Bouton type="submit" variante="vert" disabled={!valide}>{groupe ? "Enregistrer" : "Créer le groupe"}</Bouton>
        </div>
      </form>
    </Modale>
  );
}

/** Choisir plusieurs élèves à mettre dans un groupe. */
export function DialogueAjoutMembres({ groupe, onFermer }: { groupe: Groupe; onFermer(): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const [recherche, setRecherche] = useState("");
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const candidats = store.bilans.filter((b) => b.eleve.actif && b.eleve.groupeId !== groupe.id && correspond(b.eleve, recherche));

  function basculer(id: string) {
    setChoisis((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function valider() {
    store.affecterGroupe([...choisis], groupe.id);
    notifier(`${choisis.size} élève(s) ajouté(s) à « ${groupe.nom} »`);
    onFermer();
  }

  return (
    <Modale
      titre={`Ajouter des élèves · ${groupe.nom}`}
      sousTitre="Un élève déjà dans un autre groupe y sera déplacé"
      onFermer={onFermer}
      largeur={500}
      pied={
        <>
          <Bouton onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="vert" disabled={!choisis.size} onClick={valider}>Ajouter {choisis.size || ""} élève(s)</Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Champ placeholder="Rechercher un élève…" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus />
        <div className="max-h-80 overflow-auto rounded-2xl border border-creme-300">
          {candidats.map((b) => {
            const actif = choisis.has(b.eleve.id);
            const actuel = b.eleve.groupeId ? store.groupeDe(b.eleve.groupeId)?.nom : undefined;
            return (
              <button key={b.eleve.id} onClick={() => basculer(b.eleve.id)} className={cx("flex w-full items-center gap-3 border-b border-creme-300/60 px-3 py-2.5 text-left last:border-0 cursor-pointer", actif ? "bg-vert-100/70" : "hover:bg-creme-200")}>
                <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{b.eleve.nom} {b.eleve.prenom}</span>
                  <span className="block truncate text-xs text-brun-400">{[b.eleve.niveau, actuel ? `groupe ${actuel}` : "sans groupe"].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full", actif ? "bg-vert text-white" : "border-2 border-creme-300 text-transparent")}>
                  <Check size={14} strokeWidth={3} />
                </span>
              </button>
            );
          })}
          {!candidats.length && <p className="p-4 text-center text-sm text-brun-400">Aucun élève à ajouter.</p>}
        </div>
      </div>
    </Modale>
  );
}
