import { Copy, KeyRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Bouton, useUi } from "../components/ui";
import type { EtatLicence } from "../lib/stockage";

/** Bloque le logiciel tant qu'il n'est pas activé sur cet ordinateur (version Electron uniquement). */
export function VerifLicence({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<EtatLicence | null>(null);
  useEffect(() => {
    if (!window.api?.licence) setEtat({ requise: false, active: true, code: "" });
    else window.api.licence.etat().then(setEtat);
  }, []);
  if (!etat) return <div className="grid h-screen place-items-center bg-creme text-brun-400">Chargement…</div>;
  if (!etat.active) return <Activation code={etat.code} onActive={() => window.api!.licence.etat().then(setEtat)} />;
  return <>{children}</>;
}

function Activation({ code, onActive }: { code: string; onActive(): void }) {
  const { notifier } = useUi();
  const [cle, setCle] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function copier() {
    await navigator.clipboard.writeText(code);
    notifier("Code copié");
  }

  async function activer() {
    setEnCours(true);
    const ok = await window.api!.licence.activer(cle);
    setEnCours(false);
    if (ok) {
      notifier("Logiciel activé");
      onActive();
    } else notifier("Clé invalide pour cet ordinateur", "erreur");
  }

  return (
    <div className="grid h-full place-items-center overflow-auto bg-creme p-6">
      <div className="anim-apparition w-full max-w-[520px] rounded-[32px] border border-creme-300/70 bg-creme-100 p-8 shadow-xl shadow-brun-900/5">
        <div className="grid size-14 place-items-center rounded-full bg-brun-800 text-orange"><KeyRound size={26} /></div>
        <h1 className="mt-5 text-[26px] font-bold leading-tight">Activation du logiciel</h1>
        <p className="mt-1 text-sm leading-relaxed text-brun-400">
          Envoyez le code de cet ordinateur au vendeur du logiciel. Il vous renverra une clé d'activation, valable uniquement sur cet ordinateur.
        </p>

        <div className="mt-6 text-xs font-semibold text-brun-400">Code de cet ordinateur</div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex h-12 flex-1 items-center rounded-xl bg-creme-200 px-4 font-mono text-lg font-bold tracking-wider select-text">{code}</div>
          <Bouton onClick={copier} className="h-12"><Copy size={16} /> Copier</Bouton>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-brun-400">Clé d'activation</span>
          <textarea
            value={cle}
            onChange={(e) => setCle(e.target.value)}
            rows={4}
            placeholder="Collez ici la clé reçue"
            className="resize-none rounded-xl border border-creme-300 bg-creme-100 px-3.5 py-3 font-mono text-xs break-all outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10"
          />
        </label>
        <Bouton variante="vert" taille="lg" className="mt-5 w-full" disabled={!cle.trim() || enCours} onClick={activer}>Activer</Bouton>
      </div>
    </div>
  );
}
