import { Download, FileSpreadsheet, FolderOpen, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Entete from "../components/Entete";
import { Bouton, Carte, Champ, useUi } from "../components/ui";
import { exporterCsv } from "../lib/calculs";
import { aujourdhui, da } from "../lib/format";
import { enregistrerFichier, estElectron, ouvrirFichier } from "../lib/stockage";
import { useStore } from "../store";

export default function Parametres() {
  const store = useStore();
  const { notifier, confirmer } = useUi();
  const p = store.donnees.parametres;
  const [f, setF] = useState({ nomEtablissement: p.nomEtablissement, nomProf: p.nomProf, tarif: String(p.tarifMensuel), nb: String(p.seancesParMois) });
  const [dossier, setDossier] = useState("");
  useEffect(() => { window.api?.dossier().then(setDossier); }, []);

  const tarif = Number(f.tarif.replace(/\s/g, ""));
  const nb = Number(f.nb);
  const valide = tarif >= 0 && Number.isInteger(nb) && nb > 0;

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    store.definirParametres({ nomEtablissement: f.nomEtablissement.trim(), nomProf: f.nomProf.trim(), tarifMensuel: tarif, seancesParMois: nb });
    notifier("Paramètres enregistrés");
  }

  async function exporter() {
    if (await enregistrerFichier(`eleves_${aujourdhui()}.csv`, exporterCsv(store.donnees), [{ name: "Fichier Excel (CSV)", extensions: ["csv"] }]))
      notifier("Liste exportée");
  }

  async function sauvegarder() {
    if (await enregistrerFichier(`sauvegarde_soutien_${aujourdhui()}.json`, JSON.stringify(store.donnees, null, 2), [{ name: "Sauvegarde", extensions: ["json"] }]))
      notifier("Sauvegarde effectuée");
  }

  async function restaurer() {
    const contenu = await ouvrirFichier([{ name: "Sauvegarde", extensions: ["json"] }]);
    if (!contenu) return;
    if (!(await confirmer({ titre: "Restaurer la sauvegarde ?", message: "Toutes les données actuelles seront remplacées par celles de la sauvegarde.", libelle: "Restaurer", danger: true }))) return;
    try {
      store.remplacer(JSON.parse(contenu));
      notifier("Sauvegarde restaurée");
    } catch {
      notifier("Ce fichier n'est pas une sauvegarde valide", "erreur");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Entete titre="Paramètres" sousTitre="Tarif, informations et sauvegardes" />
      <div className="flex-1 overflow-auto p-5">
        <div className="grid max-w-5xl grid-cols-2 gap-5">
          <Carte className="p-6">
            <form onSubmit={enregistrer} className="flex flex-col gap-4">
              <h2 className="text-[17px] font-bold">Tarif et informations</h2>
              <Champ label="Nom affiché (établissement / cours)" value={f.nomEtablissement} onChange={(e) => setF({ ...f, nomEtablissement: e.target.value })} />
              <Champ label="Nom de l'enseignante" value={f.nomProf} onChange={(e) => setF({ ...f, nomProf: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Champ label="Prix d'un mois (DA)" value={f.tarif} onChange={(e) => setF({ ...f, tarif: e.target.value })} inputMode="numeric" />
                <Champ label="Séances par mois" type="number" min={1} max={31} value={f.nb} onChange={(e) => setF({ ...f, nb: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-creme-200 px-4 py-3 text-sm">
                <span className="text-brun-600">Prix d'une séance</span>
                <span className="font-bold">{valide ? da(tarif / nb) : "—"}</span>
              </div>
              <p className="text-xs leading-relaxed text-brun-400">Un nouveau tarif s'applique aux prochaines séances. Les séances déjà enregistrées gardent leur prix.</p>
              <Bouton type="submit" variante="vert" disabled={!valide} className="self-start">Enregistrer</Bouton>
            </form>
          </Carte>

          <Carte className="p-6">
            <h2 className="text-[17px] font-bold">Données</h2>
            <p className="mt-1 text-sm text-brun-400">Faites une sauvegarde régulièrement (par exemple sur une clé USB).</p>
            <div className="mt-5 flex flex-col gap-2">
              <Action icone={<FileSpreadsheet size={18} />} titre="Exporter la liste pour Excel" texte="Élèves, séances, montants dus et payés (CSV)" onClick={exporter} />
              <Action icone={<Download size={18} />} titre="Faire une sauvegarde" texte="Enregistre toutes les données dans un fichier" onClick={sauvegarder} />
              <Action icone={<Upload size={18} />} titre="Restaurer une sauvegarde" texte="Remplace les données actuelles" onClick={restaurer} />
              {estElectron() && <Action icone={<FolderOpen size={18} />} titre="Ouvrir le dossier des données" texte={dossier} onClick={() => window.api?.ouvrirDossier()} />}
            </div>
          </Carte>
        </div>
      </div>
    </div>
  );
}

function Action({ icone, titre, texte, onClick }: { icone: ReactNode; titre: string; texte: string; onClick(): void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 rounded-2xl bg-creme-200/70 px-4 py-3 text-left transition hover:bg-creme-200 cursor-pointer">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-vert">{icone}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{titre}</span>
        <span className="block truncate text-xs text-brun-400">{texte}</span>
      </span>
    </button>
  );
}
