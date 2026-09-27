import { Archive, CalendarPlus, Pencil, Phone, Plus, RotateCcw, Trash2, UsersRound, Wallet, X } from "lucide-react";
import { useState } from "react";
import Entete, { Recherche } from "../components/Entete";
import { DialogueEleve, DialoguePaiement, DialogueSeance } from "../components/dialogues";
import { ChoixGroupe } from "../components/groupes";
import { Avatar, BarreMois, Bouton, Pastille, PastilleReste, cx, useUi } from "../components/ui";
import { correspond, dansGroupe, detailSeances, origineTarif, progressionMois, SANS_GROUPE, statut, tarifEleve } from "../lib/calculs";
import { da, dateCourte } from "../lib/format";
import { useStore } from "../store";

type Filtre = "tous" | "doit" | "ajour" | "inactifs";

export default function Eleves({ eleveInitial }: { eleveInitial?: string }) {
  const store = useStore();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [groupe, setGroupe] = useState("");
  const [ouvert, setOuvert] = useState<string | undefined>(eleveInitial);
  const [nouveau, setNouveau] = useState(false);
  const parMois = store.donnees.parametres.seancesParMois;

  const actifs = store.bilans.filter((b) => b.eleve.actif);
  const duGroupe = store.bilans.filter((b) => dansGroupe(b.eleve, groupe));
  const actifsDuGroupe = duGroupe.filter((b) => b.eleve.actif);
  const compte = {
    tous: actifsDuGroupe.length,
    doit: actifsDuGroupe.filter((b) => statut(b.reste) === "doit").length,
    ajour: actifsDuGroupe.filter((b) => statut(b.reste) !== "doit").length,
    inactifs: duGroupe.length - actifsDuGroupe.length,
  };
  const liste = duGroupe.filter((b) => {
    if (!correspond(b.eleve, recherche)) return false;
    if (filtre === "inactifs") return !b.eleve.actif;
    if (!b.eleve.actif) return false;
    if (filtre === "doit") return statut(b.reste) === "doit";
    if (filtre === "ajour") return statut(b.reste) !== "doit";
    return true;
  });
  const totalReste = actifs.reduce((t, b) => t + Math.max(b.reste, 0), 0);
  const nomGroupe = (id: string) => store.groupeDe(id)?.nom;

  const FILTRES: [Filtre, string][] = [["tous", "Actifs"], ["doit", "Doivent"], ["ajour", "À jour"], ["inactifs", "Inactifs"]];

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Élèves" sousTitre={`${actifs.length} élève(s) actif(s) · ${da(totalReste)} restant à encaisser`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher un élève…" />
        <Bouton variante="vert" onClick={() => setNouveau(true)}><Plus size={16} /> Nouvel élève</Bouton>
      </Entete>

      <div className="flex min-h-0 flex-1 gap-5 p-5">
        <section className="flex min-w-0 flex-1 flex-col rounded-[28px] border border-creme-300/70 bg-creme-100">
          <div className="flex gap-2 px-5 pt-5">
            {FILTRES.map(([id, lib]) => (
              <button
                key={id}
                onClick={() => setFiltre(id)}
                className={cx("flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition cursor-pointer", filtre === id ? "bg-brun-800 text-creme" : "bg-creme-200 text-brun-600 hover:bg-creme-300")}
              >
                {lib}
                <span className={cx("rounded-full px-1.5 text-[11px]", filtre === id ? "bg-white/15" : "bg-white/70")}>{compte[id]}</span>
              </button>
            ))}
          </div>
          {store.donnees.groupes.length > 0 && <div className="px-5 pt-3"><ChoixGroupe valeur={groupe} onChange={setGroupe} actifsSeulement={filtre !== "inactifs"} /></div>}
          <div className="mt-3 min-h-0 flex-1 overflow-auto px-3 pb-3">
            <table className="w-full border-separate border-spacing-y-1 text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-creme-100 text-left text-xs text-brun-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Élève</th>
                  <th className="px-3 py-2 font-semibold">Séances</th>
                  {!ouvert && <th className="px-3 py-2 font-semibold">Mois en cours</th>}
                  <th className="px-3 py-2 text-right font-semibold">Dû</th>
                  <th className="px-3 py-2 text-right font-semibold">Payé</th>
                  <th className="px-3 py-2 text-right font-semibold">Situation</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((b) => {
                  const sel = ouvert === b.eleve.id;
                  return (
                    <tr key={b.eleve.id} onClick={() => setOuvert(b.eleve.id)} className={cx("cursor-pointer transition [&>td]:py-2.5 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl", sel ? "bg-vert-100" : "hover:bg-creme-200")}>
                      <td className="px-3">
                        <div className="flex items-center gap-3">
                          <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={36} />
                          <div>
                            <div className="font-semibold">{b.eleve.nom} {b.eleve.prenom}</div>
                            <div className="max-w-44 truncate text-xs text-brun-400">{[nomGroupe(b.eleve.groupeId), b.eleve.niveau, b.eleve.telephone].filter(Boolean).join(" · ") || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3">
                        <div className="font-semibold">{b.seances}</div>
                        <div className="text-xs text-brun-400">{detailSeances(b.seances, parMois)}</div>
                      </td>
                      {!ouvert && <td className="w-28 min-w-24 px-3"><BarreMois faites={progressionMois(b.seances, parMois)} total={parMois} /></td>}
                      <td className="px-3 text-right font-medium">{da(b.du)}</td>
                      <td className="px-3 text-right font-medium text-brun-600">{da(b.paye)}</td>
                      <td className="px-3 text-right"><PastilleReste reste={b.reste} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!liste.length && (
              <div className="py-16 text-center text-sm text-brun-400">
                {store.bilans.length ? "Aucun élève ne correspond." : "Aucun élève pour l'instant. Cliquez sur « Nouvel élève » pour commencer."}
              </div>
            )}
          </div>
        </section>

        {ouvert && store.bilanDe(ouvert) && <Fiche key={ouvert} eleveId={ouvert} onFermer={() => setOuvert(undefined)} />}
      </div>
      {nouveau && <DialogueEleve groupeInitial={groupe === SANS_GROUPE ? "" : groupe} onFermer={() => setNouveau(false)} onCree={setOuvert} />}
    </div>
  );
}

function Fiche({ eleveId, onFermer }: { eleveId: string; onFermer(): void }) {
  const store = useStore();
  const { confirmer, notifier } = useUi();
  const [onglet, setOnglet] = useState<"seances" | "paiements">("seances");
  const [dialogue, setDialogue] = useState<"modifier" | "paiement" | "seance" | null>(null);
  const b = store.bilanDe(eleveId)!;
  const e = b.eleve;
  const parMois = store.donnees.parametres.seancesParMois;
  const seances = store.donnees.seances.filter((s) => s.eleveId === eleveId).sort((a, c) => c.date.localeCompare(a.date));
  const paiements = store.donnees.paiements.filter((p) => p.eleveId === eleveId).sort((a, c) => c.date.localeCompare(a.date));

  async function supprimer() {
    if (await confirmer({
      titre: `Supprimer ${e.prenom} ${e.nom} ?`,
      message: "Toutes ses séances et tous ses paiements seront supprimés définitivement.\n\nSi l'élève a simplement arrêté, utilisez plutôt « Archiver » : son historique sera conservé.",
      libelle: "Supprimer définitivement",
      danger: true,
    })) {
      store.supprimerEleve(eleveId);
      notifier("Élève supprimé");
      onFermer();
    }
  }

  function archiver() {
    store.modifierEleve(eleveId, { actif: !e.actif });
    notifier(e.actif ? "Élève archivé" : "Élève réactivé");
  }

  return (
    <aside className="anim-glisse flex w-[370px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-creme-300/70 bg-creme-100">
      <div className="relative bg-brun-800 px-6 pb-5 pt-6 text-creme">
        <button onClick={onFermer} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-brun-300 hover:bg-brun-700 cursor-pointer"><X size={17} /></button>
        <div className="flex items-center gap-4">
          <Avatar nom={e.nom} prenom={e.prenom} taille={54} />
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{e.nom} {e.prenom}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-brun-300">
              {store.groupeDe(e.groupeId) && <span className="flex items-center gap-1"><UsersRound size={12} />{store.groupeDe(e.groupeId)!.nom}</span>}
              {e.niveau && <span>{e.niveau}</span>}
              <Pastille ton={e.tarifMensuel != null ? "orange" : "gris"}>
                {da(tarifEleve(store.donnees, e))} / mois{e.tarifMensuel != null ? " (perso)" : origineTarif(store.donnees, e).origine === "groupe" ? " (groupe)" : ""}
              </Pastille>
              {e.telephone && <span className="flex items-center gap-1"><Phone size={12} />{e.telephone}</span>}
              {!e.actif && <Pastille ton="gris">archivé</Pastille>}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[["Séances", String(b.seances)], ["Dû", da(b.du)], ["Payé", da(b.paye)]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-brun-700/70 px-2 py-2.5">
              <div className="text-[11px] text-brun-300">{l}</div>
              <div className="text-sm font-bold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-brun-700/70 px-4 py-3">
          <span className="text-sm text-brun-300">{b.reste < -0.5 ? "Avance" : "Reste à payer"}</span>
          <span className={cx("text-2xl font-extrabold", b.reste > 0.5 ? "text-orange" : "text-[#6fd3a2]")}>{da(Math.abs(b.reste))}</span>
        </div>
        <div className="mt-3 text-xs text-brun-300">{detailSeances(b.seances, parMois)} · inscrit(e) le {dateCourte(e.dateInscription)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        <Bouton variante="principal" onClick={() => setDialogue("paiement")}><Wallet size={16} /> Encaisser</Bouton>
        <Bouton variante="vert" onClick={() => setDialogue("seance")}><CalendarPlus size={16} /> Séance</Bouton>
      </div>

      <div className="mx-5 mt-4 flex rounded-full bg-creme-200 p-1">
        {(["seances", "paiements"] as const).map((o) => (
          <button key={o} onClick={() => setOnglet(o)} className={cx("h-8 flex-1 rounded-full text-sm font-semibold transition cursor-pointer", onglet === o ? "bg-white shadow-sm" : "text-brun-400")}>
            {o === "seances" ? `Séances (${seances.length})` : `Paiements (${paiements.length})`}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        {onglet === "seances" &&
          (seances.length ? seances.map((s) => (
            <Ligne key={s.id} gauche={dateCourte(s.date)} droite={da(s.prix)} onSupprimer={async () => {
              if (await confirmer({ titre: "Supprimer cette séance ?", message: `Séance du ${dateCourte(s.date)}.`, libelle: "Supprimer", danger: true })) store.supprimerSeance(s.id);
            }} />
          )) : <Vide texte="Aucune séance." />)}
        {onglet === "paiements" &&
          (paiements.length ? paiements.map((p) => (
            <Ligne key={p.id} gauche={dateCourte(p.date)} sous={p.note} droite={da(p.montant)} vert onSupprimer={async () => {
              if (await confirmer({ titre: "Supprimer ce paiement ?", message: `${da(p.montant)} du ${dateCourte(p.date)}.`, libelle: "Supprimer", danger: true })) store.supprimerPaiement(p.id);
            }} />
          )) : <Vide texte="Aucun paiement." />)}
      </div>

      <div className="flex gap-1 border-t border-creme-300/70 px-4 py-3">
        <Bouton variante="fantome" taille="sm" onClick={() => setDialogue("modifier")}><Pencil size={14} /> Modifier</Bouton>
        <Bouton variante="fantome" taille="sm" onClick={archiver}>{e.actif ? <><Archive size={14} /> Archiver</> : <><RotateCcw size={14} /> Réactiver</>}</Bouton>
        <Bouton variante="fantome" taille="sm" className="ml-auto text-rouge hover:bg-rouge-100" onClick={supprimer}><Trash2 size={14} /> Supprimer</Bouton>
      </div>

      {dialogue === "modifier" && <DialogueEleve eleve={e} onFermer={() => setDialogue(null)} />}
      {dialogue === "paiement" && <DialoguePaiement eleveId={eleveId} onFermer={() => setDialogue(null)} />}
      {dialogue === "seance" && <DialogueSeance eleveId={eleveId} onFermer={() => setDialogue(null)} />}
    </aside>
  );
}

function Ligne({ gauche, sous, droite, vert, onSupprimer }: { gauche: string; sous?: string; droite: string; vert?: boolean; onSupprimer(): void }) {
  return (
    <div className="group flex items-center gap-3 border-b border-creme-300/60 py-2.5 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium">{gauche}</div>
        {sous && <div className="text-xs text-brun-400">{sous}</div>}
      </div>
      <span className={cx("text-sm font-semibold", vert && "text-vert")}>{droite}</span>
      <button onClick={onSupprimer} className="grid size-7 place-items-center rounded-full text-brun-300 opacity-0 transition group-hover:opacity-100 hover:bg-rouge-100 hover:text-rouge cursor-pointer" title="Supprimer">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="py-8 text-center text-sm text-brun-400">{texte}</p>;
}
