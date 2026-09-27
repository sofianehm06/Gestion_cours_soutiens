import { Download, FileSpreadsheet, FolderOpen, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Entete from "../components/Entete";
import { Bouton, Carte, Champ, Modale, cx, useUi } from "../components/ui";
import { exporterCsv } from "../lib/calculs";
import { aujourdhui, da } from "../lib/format";
import { enregistrerFichier, estElectron, ouvrirFichier, type EtatLicence } from "../lib/stockage";
import { useStore } from "../store";

export default function Parametres() {
  const store = useStore();
  const { notifier, confirmer } = useUi();
  const p = store.donnees.parametres;
  const [f, setF] = useState({ nomEtablissement: p.nomEtablissement, nomProf: p.nomProf, tarif: String(p.tarifMensuel), nb: String(p.seancesParMois) });
  const [dossier, setDossier] = useState("");
  const [reinit, setReinit] = useState<"historique" | "tout" | null>(null);
  const [licence, setLicence] = useState<EtatLicence | null>(null);
  useEffect(() => {
    window.api?.dossier().then(setDossier);
    window.api?.licence?.etat().then(setLicence);
  }, []);

  const tarif = Number(f.tarif.replace(/\s/g, ""));
  const nb = Number(f.nb);
  const valide = tarif >= 0 && Number.isInteger(nb) && nb > 0;

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    if (!valide) return;
    store.definirParametres({ ...p, nomEtablissement: f.nomEtablissement.trim(), nomProf: f.nomProf.trim(), tarifMensuel: tarif, seancesParMois: nb });
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
              <Champ label="Nom de l'enseignant(e)" value={f.nomProf} onChange={(e) => setF({ ...f, nomProf: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Champ label="Tarif général (DA / mois)" value={f.tarif} onChange={(e) => setF({ ...f, tarif: e.target.value })} inputMode="numeric" />
                <Champ label="Séances par mois" type="number" min={1} max={31} value={f.nb} onChange={(e) => setF({ ...f, nb: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-creme-200 px-4 py-3 text-sm">
                <span className="text-brun-600">Prix d'une séance</span>
                <span className="font-bold">{valide ? da(tarif / nb) : "—"}</span>
              </div>
              <p className="text-xs leading-relaxed text-brun-400">Le tarif général s'applique aux élèves sans tarif particulier. Un groupe (page Groupes → Modifier) ou un élève (fiche → Modifier) peut avoir son propre tarif. Un nouveau tarif s'applique aux prochaines séances ; les séances déjà enregistrées gardent leur prix.</p>
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
            {licence?.requise && (
              <p className="mt-4 text-xs text-brun-400">
                Licence {licence.active ? `activée pour ${licence.nom}` : "non activée"} · ordinateur <span className="font-mono">{licence.code}</span>
              </p>
            )}
          </Carte>

          <Carte className="col-span-2 border-rouge/30 p-6">
            <h2 className="text-[17px] font-bold">Fin d'année / nouvelle année</h2>
            <p className="mt-1 text-sm text-brun-400">
              Pour repartir à zéro. Une sauvegarde est proposée juste avant, pour pouvoir tout récupérer si besoin
              (Restaurer une sauvegarde). Pour donner le logiciel à un autre enseignant, utilisez « Tout supprimer »
              en cochant « Effacer aussi le nom de l'enseignant(e) ».
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Action icone={<RotateCcw size={18} />} titre="Remettre les compteurs à zéro" texte="Efface séances et paiements · garde élèves et groupes" onClick={() => setReinit("historique")} danger />
              <Action icone={<Trash2 size={18} />} titre="Tout supprimer" texte="Efface élèves, groupes, séances et paiements (et, au choix, le nom de l'enseignant)" onClick={() => setReinit("tout")} danger />
            </div>
          </Carte>
        </div>
      </div>
      {reinit && <DialogueReinit mode={reinit} onFermer={() => setReinit(null)} />}
    </div>
  );
}

function DialogueReinit({ mode, onFermer }: { mode: "historique" | "tout"; onFermer(): void }) {
  const store = useStore();
  const { notifier } = useUi();
  const [sauvegarde, setSauvegarde] = useState(true);
  const [saisie, setSaisie] = useState("");
  const [effacerProf, setEffacerProf] = useState(false);
  const d = store.donnees;
  const valide = saisie.trim().toUpperCase() === "SUPPRIMER";
  const efface = mode === "tout"
    ? [`${d.eleves.length} élève(s)`, `${d.groupes.length} groupe(s)`, `${d.seances.length} séance(s)`, `${d.paiements.length} paiement(s)`, ...(effacerProf ? ["les informations de l'enseignant et le tarif"] : [])]
    : [`${d.seances.length} séance(s)`, `${d.paiements.length} paiement(s)`];

  async function valider() {
    if (!valide) return;
    if (sauvegarde) {
      const ok = await enregistrerFichier(`sauvegarde_soutien_${aujourdhui()}.json`, JSON.stringify(d, null, 2), [{ name: "Sauvegarde", extensions: ["json"] }]);
      if (!ok) {
        notifier("Sauvegarde annulée : rien n'a été supprimé", "erreur");
        return;
      }
    }
    store.reinitialiser(mode === "tout" && effacerProf ? "neuf" : mode);
    notifier(mode === "tout" ? "Toutes les données ont été supprimées" : "Séances et paiements remis à zéro");
    onFermer();
  }

  return (
    <Modale
      titre={mode === "tout" ? "Tout supprimer ?" : "Remettre les compteurs à zéro ?"}
      sousTitre="Cette action est définitive"
      onFermer={onFermer}
      largeur={460}
      pied={
        <>
          <Bouton onClick={onFermer}>Annuler</Bouton>
          <Bouton variante="danger" disabled={!valide} onClick={valider}>{sauvegarde ? "Sauvegarder puis supprimer" : "Supprimer"}</Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-brun-600">
        <div className="rounded-2xl bg-rouge-100 px-4 py-3 text-rouge">
          Seront supprimés : <span className="font-semibold">{efface.join(", ")}</span>.
          {mode === "historique" && <> Les élèves et les groupes sont gardés, avec un solde remis à 0.</>}
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={sauvegarde} onChange={(e) => setSauvegarde(e.target.checked)} className="size-4 accent-[var(--color-vert)]" />
          Faire une sauvegarde avant (recommandé)
        </label>
        {mode === "tout" && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={effacerProf} onChange={(e) => setEffacerProf(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-vert)]" />
            <span>
              Effacer aussi le nom de l'enseignant(e), le nom affiché et le tarif
              <span className="block text-xs text-brun-400">Pour donner le logiciel à un autre enseignant : il retrouvera l'écran de bienvenue au prochain affichage.</span>
            </span>
          </label>
        )}
        <Champ label="Pour confirmer, tapez SUPPRIMER" value={saisie} onChange={(e) => setSaisie(e.target.value)} autoFocus />
      </div>
    </Modale>
  );
}

function Action({ icone, titre, texte, onClick, danger }: { icone: ReactNode; titre: string; texte: string; onClick(): void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition cursor-pointer", danger ? "bg-rouge-100/60 hover:bg-rouge-100" : "bg-creme-200/70 hover:bg-creme-200")}>
      <span className={cx("grid size-10 shrink-0 place-items-center rounded-full bg-white", danger ? "text-rouge" : "text-vert")}>{icone}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{titre}</span>
        <span className="block truncate text-xs text-brun-400">{texte}</span>
      </span>
    </button>
  );
}
