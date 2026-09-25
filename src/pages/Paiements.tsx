import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Entete, { Recherche } from "../components/Entete";
import { DialoguePaiement } from "../components/dialogues";
import { Avatar, Bouton, useUi } from "../components/ui";
import { correspond } from "../lib/calculs";
import { da, dateCourte, moisCourant, nomMois } from "../lib/format";
import { useStore } from "../store";

function decalerMois(mois: string, n: number) {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Paiements() {
  const store = useStore();
  const { confirmer, notifier } = useUi();
  const [mois, setMois] = useState(moisCourant());
  const [recherche, setRecherche] = useState("");
  const [nouveau, setNouveau] = useState(false);
  const eleves = new Map(store.donnees.eleves.map((e) => [e.id, e]));

  const liste = store.donnees.paiements
    .filter((p) => p.date.startsWith(mois))
    .filter((p) => {
      const e = eleves.get(p.eleveId);
      return e ? correspond(e, recherche) : false;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = liste.reduce((t, p) => t + p.montant, 0);

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Paiements" sousTitre={`${liste.length} paiement(s) en ${nomMois(mois)}`}>
        <Recherche valeur={recherche} onChange={setRecherche} placeholder="Filtrer par élève…" />
        <Bouton variante="vert" onClick={() => setNouveau(true)}><Plus size={16} /> Encaisser</Bouton>
      </Entete>
      <div className="flex min-h-0 flex-1 gap-5 p-5">
        <section className="flex min-w-0 flex-1 flex-col rounded-[28px] border border-creme-300/70 bg-creme-100">
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-1 rounded-full bg-creme-200 p-1">
              <button onClick={() => setMois(decalerMois(mois, -1))} className="grid size-8 place-items-center rounded-full hover:bg-white cursor-pointer"><ChevronLeft size={16} /></button>
              <span className="w-40 text-center text-sm font-bold first-letter:uppercase">{nomMois(mois)}</span>
              <button onClick={() => setMois(decalerMois(mois, 1))} className="grid size-8 place-items-center rounded-full hover:bg-white cursor-pointer"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-auto px-3 pb-3">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead className="sticky top-0 bg-creme-100 text-left text-xs text-brun-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Élève</th>
                  <th className="px-3 py-2 font-semibold">Note</th>
                  <th className="px-3 py-2 text-right font-semibold">Montant</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {liste.map((p) => {
                  const e = eleves.get(p.eleveId)!;
                  return (
                    <tr key={p.id} className="group hover:bg-creme-200 [&>td]:py-2.5 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl">
                      <td className="px-3 font-medium">{dateCourte(p.date)}</td>
                      <td className="px-3">
                        <div className="flex items-center gap-3">
                          <Avatar nom={e.nom} prenom={e.prenom} taille={30} />
                          <span className="font-semibold">{e.nom} {e.prenom}</span>
                        </div>
                      </td>
                      <td className="px-3 text-brun-400">{p.note || "—"}</td>
                      <td className="px-3 text-right font-bold text-vert">{da(p.montant)}</td>
                      <td className="px-2">
                        <button
                          onClick={async () => {
                            if (await confirmer({ titre: "Supprimer ce paiement ?", message: `${da(p.montant)} de ${e.prenom} ${e.nom} du ${dateCourte(p.date)}.`, libelle: "Supprimer", danger: true })) {
                              store.supprimerPaiement(p.id);
                              notifier("Paiement supprimé");
                            }
                          }}
                          className="grid size-8 place-items-center rounded-full text-brun-300 opacity-0 group-hover:opacity-100 hover:bg-rouge-100 hover:text-rouge cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!liste.length && <p className="py-16 text-center text-sm text-brun-400">Aucun paiement ce mois-ci.</p>}
          </div>
        </section>
        <aside className="sombre flex w-[320px] shrink-0 flex-col justify-between rounded-[28px] bg-brun-800 p-6 text-creme">
          <div>
            <h2 className="text-[17px] font-bold">Total du mois</h2>
            <p className="text-sm text-brun-300 first-letter:uppercase">{nomMois(mois)}</p>
            <div className="mt-6 text-4xl font-extrabold text-orange">{da(total)}</div>
            <p className="mt-2 text-sm text-brun-300">{liste.length} paiement(s)</p>
          </div>
          <Bouton variante="principal" taille="lg" className="w-full" onClick={() => setNouveau(true)}>Encaisser un paiement</Bouton>
        </aside>
      </div>
      {nouveau && <DialoguePaiement onFermer={() => setNouveau(false)} />}
    </div>
  );
}
