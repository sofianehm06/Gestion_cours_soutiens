import { ArrowRight, CalendarCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Aller } from "../App";
import Entete from "../components/Entete";
import { DialoguePaiement } from "../components/dialogues";
import { Avatar, Bouton, Carte, cx } from "../components/ui";
import { statsMois } from "../lib/calculs";
import { aujourdhui, da, dateCourte, dateLongue, moisCourant, nomMois } from "../lib/format";
import { useStore } from "../store";

export default function TableauDeBord({ aller }: { aller: Aller }) {
  const store = useStore();
  const [encaisser, setEncaisser] = useState<string | null>(null);
  const mois = moisCourant();
  const stats = statsMois(store.donnees, mois);
  const actifs = store.bilans.filter((b) => b.eleve.actif);
  const debiteurs = actifs.filter((b) => b.reste > 0.5).sort((a, b) => b.reste - a.reste);
  const totalReste = debiteurs.reduce((t, b) => t + b.reste, 0);
  const presentsAujourdhui = store.presentsLe(aujourdhui()).size;
  const noms = new Map(store.bilans.map((b) => [b.eleve.id, b.eleve]));
  const derniersPaiements = [...store.donnees.paiements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Séances des 8 derniers jours de cours
  const parJour = new Map<string, number>();
  for (const s of store.donnees.seances) parJour.set(s.date, (parJour.get(s.date) ?? 0) + 1);
  const jours = [...parJour.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  const max = Math.max(1, ...jours.map(([, n]) => n));

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Tableau de bord" sousTitre={dateLongue(aujourdhui())}>
        <Bouton variante="vert" onClick={() => aller("presence")}><CalendarCheck size={16} /> Faire l'appel</Bouton>
      </Entete>
      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-4 gap-4">
          <Tuile icone={<Users size={18} />} titre="Élèves actifs" valeur={String(actifs.length)} note={`${presentsAujourdhui} présent(s) aujourd'hui`} />
          <Tuile icone={<CalendarCheck size={18} />} titre={`Séances · ${nomMois(mois)}`} valeur={String(stats.seances)} note={`${stats.joursDeCours} jour(s) de cours`} />
          <Tuile icone={<Wallet size={18} />} titre={`Encaissé · ${nomMois(mois)}`} valeur={da(stats.encaisse)} note="paiements reçus ce mois" accent="vert" />
          <Tuile icone={<TrendingUp size={18} />} titre="Reste à encaisser" valeur={da(totalReste)} note={`${debiteurs.length} élève(s) concerné(s)`} accent="orange" sombre />
        </div>

        <div className="mt-5 grid grid-cols-[1.4fr_1fr] gap-5">
          <Carte>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold">Élèves qui doivent de l'argent</h2>
              <Bouton taille="sm" variante="fantome" onClick={() => aller("eleves")}>Tous les élèves <ArrowRight size={14} /></Bouton>
            </div>
            {debiteurs.length === 0 ? (
              <p className="py-10 text-center text-sm text-brun-400">Tout le monde est à jour 🎉</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {debiteurs.slice(0, 8).map((b) => (
                  <div key={b.eleve.id} className="flex items-center gap-3 rounded-2xl bg-creme-200/70 px-3 py-2.5">
                    <Avatar nom={b.eleve.nom} prenom={b.eleve.prenom} taille={34} />
                    <button onClick={() => aller("eleves", b.eleve.id)} className="min-w-0 flex-1 text-left cursor-pointer">
                      <div className="truncate text-sm font-semibold hover:underline">{b.eleve.nom} {b.eleve.prenom}</div>
                      <div className="text-xs text-brun-400">{b.seances} séances · payé {da(b.paye)}</div>
                    </button>
                    <span className="text-sm font-bold text-rouge">{da(b.reste)}</span>
                    <Bouton taille="sm" variante="principal" onClick={() => setEncaisser(b.eleve.id)}>Encaisser</Bouton>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          <div className="flex flex-col gap-5">
            <Carte>
              <h2 className="mb-4 text-[17px] font-bold">Présence des dernières séances</h2>
              {jours.length === 0 ? (
                <p className="py-6 text-center text-sm text-brun-400">Aucune séance enregistrée.</p>
              ) : (
                <div className="flex h-36 items-end gap-2">
                  {jours.map(([j, n]) => (
                    <div key={j} className="flex flex-1 flex-col items-center gap-1.5" title={`${dateCourte(j)} : ${n} présent(s)`}>
                      <span className="text-xs font-semibold text-brun-600">{n}</span>
                      <div className="w-full max-w-9 rounded-xl bg-vert" style={{ height: `${(n / max) * 90}px` }} />
                      <span className="text-[10px] text-brun-400">{dateCourte(j).slice(0, 5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Carte>
            <Carte>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[17px] font-bold">Derniers paiements</h2>
                <Bouton taille="sm" variante="fantome" onClick={() => aller("paiements")}>Voir tout <ArrowRight size={14} /></Bouton>
              </div>
              {derniersPaiements.length === 0 ? (
                <p className="py-6 text-center text-sm text-brun-400">Aucun paiement.</p>
              ) : derniersPaiements.map((p) => {
                const e = noms.get(p.eleveId);
                return (
                  <div key={p.id} className="flex items-center justify-between border-b border-creme-300/60 py-2 text-sm last:border-0">
                    <div>
                      <div className="font-semibold">{e ? `${e.nom} ${e.prenom}` : "—"}</div>
                      <div className="text-xs text-brun-400">{dateCourte(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
                    </div>
                    <span className="font-bold text-vert">+{da(p.montant)}</span>
                  </div>
                );
              })}
            </Carte>
          </div>
        </div>
      </div>
      {encaisser && <DialoguePaiement eleveId={encaisser} onFermer={() => setEncaisser(null)} />}
    </div>
  );
}

function Tuile({ icone, titre, valeur, note, accent, sombre }: { icone: ReactNode; titre: string; valeur: string; note: string; accent?: "vert" | "orange"; sombre?: boolean }) {
  return (
    <div className={cx("rounded-[24px] border p-5", sombre ? "border-brun-800 bg-brun-800 text-creme" : "border-creme-300/70 bg-creme-100")}>
      <div className="flex items-center gap-2">
        <span className={cx("grid size-8 place-items-center rounded-full", sombre ? "bg-brun-700 text-orange" : accent === "vert" ? "bg-vert-100 text-vert" : "bg-creme-200 text-brun-600")}>{icone}</span>
        <span className={cx("text-xs font-semibold first-letter:uppercase", sombre ? "text-brun-300" : "text-brun-400")}>{titre}</span>
      </div>
      <div className={cx("mt-3 text-[26px] font-extrabold leading-none", accent === "vert" && "text-vert", accent === "orange" && "text-orange")}>{valeur}</div>
      <div className={cx("mt-1.5 text-xs", sombre ? "text-brun-300" : "text-brun-400")}>{note}</div>
    </div>
  );
}
