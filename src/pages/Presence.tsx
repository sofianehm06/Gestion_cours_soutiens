import { Check, ChevronLeft, ChevronRight, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Entete, { Recherche } from "../components/Entete";
import { DialogueEleve } from "../components/dialogues";
import { ChoixGroupe } from "../components/groupes";
import { Avatar, BarreMois, Bouton, cx, useUi } from "../components/ui";
import { correspond, dansGroupe, prixSeance, progressionMois, SANS_GROUPE } from "../lib/calculs";
import { aujourdhui, da, dateCourte, dateLongue, decaler } from "../lib/format";
import { useStore } from "../store";

export default function Presence({ groupeInitial = "" }: { groupeInitial?: string }) {
  const store = useStore();
  const [groupe, setGroupe] = useState(groupeInitial);
  const { notifier, confirmer } = useUi();
  const [date, setDate] = useState(aujourdhui());
  const [recherche, setRecherche] = useState("");
  const [coches, setCoches] = useState<Set<string>>(() => store.presentsLe(aujourdhui()));
  const [nouvelEleve, setNouvelEleve] = useState(false);
  const parMois = store.donnees.parametres.seancesParMois;
  const prix = prixSeance(store.donnees.parametres);

  const enregistres = useMemo(() => store.presentsLe(date), [store, date]);
  const modifie = coches.size !== enregistres.size || [...coches].some((id) => !enregistres.has(id));

  // Recharger la feuille quand on change de date
  useEffect(() => {
    setCoches(store.presentsLe(date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function changerDate(nouvelle: string) {
    if (!nouvelle || nouvelle === date) return;
    if (modifie && !(await confirmer({
      titre: "Présence non enregistrée",
      message: "Vous avez modifié la présence sans l'enregistrer. Changer de date quand même ?",
      libelle: "Changer de date",
      danger: true,
    }))) return;
    setDate(nouvelle);
  }

  const groupeChoisi = groupe && groupe !== SANS_GROUPE ? store.groupeDe(groupe) : undefined;
  const duGroupe = store.bilans.filter(
    (b) => (b.eleve.actif || enregistres.has(b.eleve.id)) && dansGroupe(b.eleve, groupe),
  );
  const visibles = duGroupe.filter((b) => correspond(b.eleve, recherche));
  const presents = store.bilans.filter((b) => coches.has(b.eleve.id));
  const presentsDuGroupe = duGroupe.filter((b) => coches.has(b.eleve.id));
  // Élèves cochés dans d'autres groupes (même date) : on les signale dans le panneau.
  const autres = presents.length - presentsDuGroupe.length;
  const effectif = groupe ? duGroupe.filter((b) => b.eleve.actif).length : store.bilans.filter((b) => b.eleve.actif).length;

  function basculer(id: string) {
    setCoches((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function enregistrer() {
    store.enregistrerPresence(date, [...coches]);
    notifier(`Présence du ${dateCourte(date)} enregistrée · ${coches.size} présent(s)`);
  }

  const sousTitre = enregistres.size
    ? `Séance du ${dateLongue(date)} · déjà enregistrée`
    : `Séance du ${dateLongue(date)}`;

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Présence" sousTitre={sousTitre}>
        <div className="flex h-10 items-center rounded-full border border-creme-300 bg-white">
          <button onClick={() => changerDate(decaler(date, -1))} className="grid size-10 place-items-center rounded-full text-brun-600 hover:bg-creme-200 cursor-pointer" title="Jour précédent"><ChevronLeft size={18} /></button>
          <input type="date" value={date} onChange={(e) => changerDate(e.target.value)} className="bg-transparent px-1 text-sm font-semibold outline-none" />
          <button onClick={() => changerDate(decaler(date, 1))} className="grid size-10 place-items-center rounded-full text-brun-600 hover:bg-creme-200 cursor-pointer" title="Jour suivant"><ChevronRight size={18} /></button>
        </div>
        <Bouton onClick={() => changerDate(aujourdhui())} disabled={date === aujourdhui()}>Aujourd'hui</Bouton>
      </Entete>

      <div className="flex min-h-0 flex-1 gap-5 p-5">
        {/* Grille des élèves */}
        <section className="flex min-w-0 flex-1 flex-col rounded-[28px] border border-creme-300/70 bg-creme-100">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 className="text-[17px] font-bold">{groupeChoisi ? groupeChoisi.nom : groupe === SANS_GROUPE ? "Sans groupe" : "Élèves"}</h2>
            <div className="flex items-center gap-2">
              <Recherche valeur={recherche} onChange={setRecherche} placeholder="Nom ou prénom…" className="w-60" />
              <Bouton taille="sm" variante="fantome" onClick={() => setCoches(new Set([...coches, ...visibles.map((b) => b.eleve.id)]))}>Tout cocher</Bouton>
            </div>
          </div>
          <div className="px-5 pb-3"><ChoixGroupe valeur={groupe} onChange={setGroupe} /></div>
          <div className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 overflow-auto px-5 pb-5">
            {visibles.map((b) => {
              const actif = coches.has(b.eleve.id);
              const faites = progressionMois(b.seances, parMois);
              return (
                <button
                  key={b.eleve.id}
                  onClick={() => basculer(b.eleve.id)}
                  className={cx(
                    "group relative flex flex-col gap-3 rounded-3xl border-2 p-4 text-left transition cursor-pointer",
                    actif ? "border-vert bg-vert-100/60" : "border-transparent bg-creme-200/80 hover:border-creme-300 hover:bg-creme-200",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold leading-tight">{b.eleve.nom} {b.eleve.prenom}</div>
                      <div className="mt-0.5 truncate text-xs text-brun-400">
                        {b.eleve.niveau ? `${b.eleve.niveau} · ` : ""}{b.seances} séance{b.seances > 1 ? "s" : ""}
                      </div>
                    </div>
                    <span className={cx("grid size-6 shrink-0 place-items-center rounded-full transition", actif ? "bg-vert text-white" : "border-2 border-creme-300 text-transparent group-hover:border-brun-300")}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-brun-400">
                      <span>Mois en cours</span>
                      <span>{faites}/{parMois}</span>
                    </div>
                    <BarreMois faites={faites} total={parMois} />
                  </div>
                  <div className={cx("text-sm font-bold", b.reste > 0.5 ? "text-rouge" : "text-vert")}>
                    {b.reste > 0.5 ? `Doit ${da(b.reste)}` : b.reste < -0.5 ? `Avance ${da(-b.reste)}` : "À jour"}
                  </div>
                </button>
              );
            })}
            <button onClick={() => setNouvelEleve(true)} className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-creme-300 text-sm font-semibold text-brun-400 transition hover:border-vert hover:text-vert cursor-pointer">
              <UserPlus size={22} />
              Nouvel élève
            </button>
          </div>
        </section>

        {/* Panneau de la séance */}
        <aside className="sombre flex w-[380px] shrink-0 flex-col rounded-[28px] bg-brun-800 text-creme">
          <div className="flex items-baseline justify-between px-6 pt-6">
            <h2 className="text-[17px] font-bold">Séance du jour</h2>
            <span className="text-sm font-semibold text-brun-300">{dateCourte(date)}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
            {presents.length === 0 ? (
              <p className="px-2 text-sm text-brun-300">Cliquez sur un élève pour le marquer présent.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {presents.map((b) => (
                  <li key={b.eleve.id} className="anim-glisse flex items-center gap-3 rounded-2xl bg-brun-700/70 px-3 py-2.5">
                    <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{b.eleve.nom} {b.eleve.prenom}</div>
                      <div className="truncate text-xs text-brun-300">
                        {enregistres.has(b.eleve.id) ? "enregistré" : "nouveau"}
                        {store.groupeDe(b.eleve.groupeId) ? ` · ${store.groupeDe(b.eleve.groupeId)!.nom}` : ""}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brun-300">{da(prix)}</span>
                    <button onClick={() => basculer(b.eleve.id)} className="grid size-7 place-items-center rounded-full text-brun-300 hover:bg-brun-600 hover:text-creme cursor-pointer" title="Retirer">
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-brun-600 px-6 pb-6 pt-4">
            <div className="flex items-center justify-between text-sm text-brun-300">
              <span>Présents{groupeChoisi ? ` · ${groupeChoisi.nom}` : groupe === SANS_GROUPE ? " · sans groupe" : ""}</span>
              <span className="font-semibold text-creme">{groupe ? presentsDuGroupe.length : coches.size} / {effectif}</span>
            </div>
            {groupe && autres > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm text-brun-300">
                <span>Autres groupes ce jour</span>
                <span className="font-semibold text-creme">{autres}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-sm text-brun-300">
              <span>Prix d'une séance</span>
              <span className="font-semibold text-creme">{da(prix)}</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-sm text-brun-300">Valeur de la séance</span>
              <span className="text-3xl font-extrabold text-orange">{da(coches.size * prix)}</span>
            </div>
            <Bouton variante="principal" taille="lg" className="mt-5 w-full" disabled={!modifie} onClick={enregistrer}>
              {modifie ? "Enregistrer la présence" : enregistres.size ? "Présence enregistrée ✓" : "Enregistrer la présence"}
            </Bouton>
            {modifie && enregistres.size > 0 && (
              <button onClick={() => setCoches(new Set(enregistres))} className="mt-2 w-full text-center text-xs text-brun-300 hover:text-creme cursor-pointer">Annuler les modifications</button>
            )}
          </div>
        </aside>
      </div>
      {nouvelEleve && <DialogueEleve groupeInitial={groupe === SANS_GROUPE ? "" : groupe} onFermer={() => setNouvelEleve(false)} onCree={(id) => setCoches((c) => new Set([...c, id]))} />}
    </div>
  );
}
