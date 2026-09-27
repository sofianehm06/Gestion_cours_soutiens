import { CalendarCheck, Clock, Pencil, Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { useState } from "react";
import type { Aller } from "../App";
import Entete from "../components/Entete";
import { DialogueAjoutMembres, DialogueGroupe, useGroupes } from "../components/groupes";
import { Avatar, Bouton, PastilleReste, cx, useUi } from "../components/ui";
import { da, moisCourant } from "../lib/format";
import { useStore } from "../store";

export default function Groupes({ aller, groupeInitial }: { aller: Aller; groupeInitial?: string }) {
  const store = useStore();
  const groupes = useGroupes();
  const [ouvert, setOuvert] = useState<string | undefined>(groupeInitial ?? groupes[0]?.id);
  const [nouveau, setNouveau] = useState(false);
  const mois = moisCourant();
  const actifs = store.bilans.filter((b) => b.eleve.actif);
  const sansGroupe = actifs.filter((b) => !b.eleve.groupeId || !store.groupeDe(b.eleve.groupeId)).length;

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Groupes" sousTitre={`${groupes.length} groupe(s) · ${sansGroupe} élève(s) actif(s) sans groupe`}>
        <Bouton variante="vert" onClick={() => setNouveau(true)}><Plus size={16} /> Nouveau groupe</Bouton>
      </Entete>

      <div className="flex min-h-0 flex-1 gap-5 p-5">
        <section className="flex min-w-0 flex-1 flex-col rounded-[28px] border border-creme-300/70 bg-creme-100">
          {groupes.length === 0 ? (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-vert-100 text-vert"><UsersRound size={26} /></span>
              <h2 className="text-lg font-bold">Organisez vos élèves par groupes</h2>
              <p className="text-sm leading-relaxed text-brun-400">
                Créez un groupe par créneau ou par classe (ex. « 4AM Maths – samedi 14h »), puis faites l'appel groupe par groupe.
              </p>
              <Bouton variante="vert" onClick={() => setNouveau(true)}><Plus size={16} /> Créer un groupe</Bouton>
            </div>
          ) : (
            <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 overflow-auto p-5">
              {groupes.map((g) => {
                const membres = actifs.filter((b) => b.eleve.groupeId === g.id);
                const ids = new Set(membres.map((b) => b.eleve.id));
                const seancesMois = store.donnees.seances.filter((s) => ids.has(s.eleveId) && s.date.startsWith(mois)).length;
                const reste = membres.reduce((t, b) => t + Math.max(b.reste, 0), 0);
                const sel = ouvert === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setOuvert(g.id)}
                    className={cx(
                      "flex flex-col gap-3 rounded-3xl border-2 p-4 text-left transition cursor-pointer",
                      sel ? "border-vert bg-vert-100/60" : "border-transparent bg-creme-200/80 hover:border-creme-300 hover:bg-creme-200",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brun-800 text-orange"><UsersRound size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold leading-tight">{g.nom}</div>
                        <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-brun-400">
                          {g.horaire ? <><Clock size={11} />{g.horaire}</> : "Pas d'horaire"}
                          <span className="ml-1 font-semibold text-brun-600">· {da(g.tarifMensuel ?? store.donnees.parametres.tarifMensuel)}/mois</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Chiffre libelle="Élèves" valeur={String(membres.length)} />
                      <Chiffre libelle="Séances ce mois" valeur={String(seancesMois)} />
                      <Chiffre libelle="Reste" valeur={da(reste)} rouge={reste > 0.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {ouvert && store.groupeDe(ouvert) && <FicheGroupe key={ouvert} groupeId={ouvert} aller={aller} onFermer={() => setOuvert(undefined)} />}
      </div>
      {nouveau && <DialogueGroupe onFermer={() => setNouveau(false)} onCree={setOuvert} />}
    </div>
  );
}

function Chiffre({ libelle, valeur, rouge }: { libelle: string; valeur: string; rouge?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/70 px-1 py-2">
      <div className="text-[10px] text-brun-400">{libelle}</div>
      <div className={cx("truncate text-sm font-bold", rouge && "text-rouge")}>{valeur}</div>
    </div>
  );
}

function FicheGroupe({ groupeId, aller, onFermer }: { groupeId: string; aller: Aller; onFermer(): void }) {
  const store = useStore();
  const { confirmer, notifier } = useUi();
  const [dialogue, setDialogue] = useState<"modifier" | "ajouter" | null>(null);
  const g = store.groupeDe(groupeId)!;
  const membres = store.bilans.filter((b) => b.eleve.groupeId === groupeId);
  const actifs = membres.filter((b) => b.eleve.actif);
  const reste = actifs.reduce((t, b) => t + Math.max(b.reste, 0), 0);

  async function supprimer() {
    if (await confirmer({
      titre: `Supprimer le groupe « ${g.nom} » ?`,
      message: "Les élèves ne sont pas supprimés : ils passent « sans groupe ». Leurs séances et paiements sont conservés.",
      libelle: "Supprimer le groupe",
      danger: true,
    })) {
      store.supprimerGroupe(groupeId);
      notifier("Groupe supprimé");
      onFermer();
    }
  }

  function retirer(id: string) {
    store.affecterGroupe([id], "");
    notifier("Élève retiré du groupe");
  }

  return (
    <aside className="anim-glisse flex w-[370px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-creme-300/70 bg-creme-100">
      <div className="sombre relative bg-brun-800 px-6 pb-5 pt-6 text-creme">
        <button onClick={onFermer} className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-brun-300 hover:bg-brun-700 cursor-pointer"><X size={17} /></button>
        <div className="pr-8 text-lg font-bold">{g.nom}</div>
        <div className="flex items-center gap-1 text-sm text-brun-300">
          {g.horaire ? <><Clock size={12} />{g.horaire}</> : "Pas d'horaire"}
          <span className="ml-1">· {da(g.tarifMensuel ?? store.donnees.parametres.tarifMensuel)} / mois{g.tarifMensuel == null ? " (tarif général)" : ""}</span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brun-700/70 px-4 py-3">
          <span className="text-sm text-brun-300">{actifs.length} élève(s) · reste à encaisser</span>
          <span className={cx("text-xl font-extrabold", reste > 0.5 ? "text-orange" : "text-[#6fd3a2]")}>{da(reste)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        <Bouton variante="principal" onClick={() => aller("presence", groupeId)} disabled={!actifs.length}><CalendarCheck size={16} /> Faire l'appel</Bouton>
        <Bouton variante="vert" onClick={() => setDialogue("ajouter")}><UserPlus size={16} /> Ajouter</Bouton>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        {membres.length === 0 ? (
          <p className="py-8 text-center text-sm text-brun-400">Aucun élève dans ce groupe.</p>
        ) : membres.map((b) => (
          <div key={b.eleve.id} className="group flex items-center gap-3 border-b border-creme-300/60 py-2.5 last:border-0">
            <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={32} />
            <button onClick={() => aller("eleves", b.eleve.id)} className="min-w-0 flex-1 text-left cursor-pointer">
              <div className="truncate text-sm font-semibold hover:underline">{b.eleve.nom} {b.eleve.prenom}</div>
              <div className="text-xs text-brun-400">{b.eleve.actif ? `${b.seances} séance(s)` : "archivé"}</div>
            </button>
            <PastilleReste reste={b.reste} />
            <button onClick={() => retirer(b.eleve.id)} className="grid size-7 place-items-center rounded-full text-brun-300 opacity-0 transition group-hover:opacity-100 hover:bg-rouge-100 hover:text-rouge cursor-pointer" title="Retirer du groupe">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-t border-creme-300/70 px-4 py-3">
        <Bouton variante="fantome" taille="sm" onClick={() => setDialogue("modifier")}><Pencil size={14} /> Modifier</Bouton>
        <Bouton variante="fantome" taille="sm" className="ml-auto text-rouge hover:bg-rouge-100" onClick={supprimer}><Trash2 size={14} /> Supprimer</Bouton>
      </div>

      {dialogue === "modifier" && <DialogueGroupe groupe={g} onFermer={() => setDialogue(null)} />}
      {dialogue === "ajouter" && <DialogueAjoutMembres groupe={g} onFermer={() => setDialogue(null)} />}
    </aside>
  );
}
