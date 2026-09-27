import { Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Bouton, Champ, useUi } from "../components/ui";
import { da } from "../lib/format";
import { ouvrirFichier } from "../lib/stockage";
import { useStore } from "../store";

/** Premier lancement : l'enseignant(e) saisit ses informations. */
export default function Accueil({ onTermine }: { onTermine(): void }) {
  const store = useStore();
  const { notifier, confirmer } = useUi();
  const p = store.donnees.parametres;
  const [f, setF] = useState({ nomProf: "", nomEtablissement: "", tarif: String(p.tarifMensuel), nb: String(p.seancesParMois) });
  const tarif = Number(f.tarif.replace(/\s/g, ""));
  const nb = Number(f.nb);
  const valide = f.nomProf.trim() && tarif >= 0 && Number.isInteger(nb) && nb > 0;

  function commencer(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    store.definirParametres({
      nomProf: f.nomProf.trim(),
      nomEtablissement: f.nomEtablissement.trim() || "Cours de soutien",
      tarifMensuel: tarif,
      seancesParMois: nb,
      configure: true,
    });
    notifier(`Bienvenue ${f.nomProf.trim()} !`);
    onTermine();
  }

  async function restaurer() {
    const contenu = await ouvrirFichier([{ name: "Sauvegarde", extensions: ["json"] }]);
    if (!contenu) return;
    if (!(await confirmer({ titre: "Restaurer la sauvegarde ?", message: "Les données de la sauvegarde (élèves, séances, paiements, informations) seront chargées.", libelle: "Restaurer" }))) return;
    try {
      const brut = JSON.parse(contenu);
      store.remplacer({ ...brut, parametres: { ...brut.parametres, configure: true } });
      notifier("Sauvegarde restaurée");
      onTermine();
    } catch {
      notifier("Ce fichier n'est pas une sauvegarde valide", "erreur");
    }
  }

  return (
    <div className="grid h-full place-items-center overflow-auto bg-creme p-6">
      <div className="anim-apparition w-full max-w-[520px] rounded-[32px] border border-creme-300/70 bg-creme-100 p-8 shadow-xl shadow-brun-900/5">
        <div className="grid size-14 place-items-center rounded-full bg-orange text-2xl font-extrabold text-brun-900">G</div>
        <h1 className="mt-5 text-[26px] font-bold leading-tight">Bienvenue dans Gestion Soutien</h1>
        <p className="mt-1 text-sm text-brun-400">Quelques informations pour commencer. Tout reste modifiable plus tard dans Paramètres.</p>

        <form onSubmit={commencer} className="mt-6 flex flex-col gap-4">
          <Champ label="Votre nom *" value={f.nomProf} onChange={(e) => setF({ ...f, nomProf: e.target.value })} placeholder="ex. Mme Amrani" autoFocus />
          <Champ label="Nom affiché (établissement / cours)" value={f.nomEtablissement} onChange={(e) => setF({ ...f, nomEtablissement: e.target.value })} placeholder="ex. Cours de soutien Amrani" />
          <div className="grid grid-cols-2 gap-4">
            <Champ label="Prix d'un mois (DA)" value={f.tarif} onChange={(e) => setF({ ...f, tarif: e.target.value })} inputMode="numeric" />
            <Champ label="Séances par mois" type="number" min={1} max={31} value={f.nb} onChange={(e) => setF({ ...f, nb: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-creme-200 px-4 py-3 text-sm">
            <span className="text-brun-600">Prix d'une séance</span>
            <span className="font-bold">{tarif >= 0 && nb > 0 ? da(tarif / nb) : "—"}</span>
          </div>
          <Bouton type="submit" variante="vert" taille="lg" disabled={!valide} className="mt-2 w-full">Commencer</Bouton>
        </form>
        <button onClick={restaurer} className="mx-auto mt-4 flex items-center gap-2 text-xs font-semibold text-brun-400 hover:text-brun-900 cursor-pointer">
          <Upload size={13} /> J'ai déjà une sauvegarde : la restaurer
        </button>
      </div>
    </div>
  );
}
