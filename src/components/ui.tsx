import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { statut } from "../lib/calculs";
import { da, initiales } from "../lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variante = "principal" | "vert" | "clair" | "sombre" | "danger" | "fantome";

const VARIANTES: Record<Variante, string> = {
  principal: "bg-orange text-brun-900 hover:bg-orange-600",
  vert: "bg-vert text-white hover:bg-vert-600",
  clair: "bg-white text-brun-900 border border-creme-300 hover:bg-creme-100",
  sombre: "bg-brun-700 text-creme hover:bg-brun-600",
  danger: "bg-rouge-100 text-rouge hover:bg-[#f2cdbf]",
  fantome: "text-brun-600 hover:bg-creme-200",
};

export function Bouton({
  variante = "clair", taille = "md", className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; taille?: "sm" | "md" | "lg" }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        taille === "sm" && "h-8 px-3 text-xs",
        taille === "md" && "h-10 px-4 text-sm",
        taille === "lg" && "h-12 px-6 text-[15px]",
        VARIANTES[variante],
        className,
      )}
    />
  );
}

export function Champ({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-semibold text-brun-400">{label}</span>}
      <input
        {...props}
        className="h-11 rounded-xl border border-creme-300 bg-creme-100 px-3.5 text-sm outline-none transition focus:border-vert focus:bg-white focus:ring-4 focus:ring-vert/10"
      />
    </label>
  );
}

export function Carte({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-[28px] border border-creme-300/70 bg-creme-100 p-5", className)}>{children}</div>;
}

const TEINTES = ["bg-orange text-brun-900", "bg-vert text-white", "bg-rouge text-white", "bg-brun-700 text-creme", "bg-[#7a8b4f] text-white", "bg-[#5b7fa6] text-white"];

export function Avatar({ nom, prenom, taille = 40 }: { nom: string; prenom: string; taille?: number }) {
  const h = [...(nom + prenom)].reduce((t, c) => t + c.charCodeAt(0), 0);
  return (
    <div
      className={cx("grid shrink-0 place-items-center rounded-full font-bold", TEINTES[h % TEINTES.length])}
      style={{ width: taille, height: taille, fontSize: taille * 0.36 }}
    >
      {initiales(nom, prenom)}
    </div>
  );
}

export function Pastille({ children, ton }: { children: ReactNode; ton: "rouge" | "vert" | "orange" | "gris" }) {
  const tons = {
    rouge: "bg-rouge-100 text-rouge",
    vert: "bg-vert-100 text-vert",
    orange: "bg-orange-100 text-[#9a6210]",
    gris: "bg-creme-300 text-brun-600",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", tons[ton])}>{children}</span>;
}

export function PastilleReste({ reste }: { reste: number }) {
  const s = statut(reste);
  if (s === "doit") return <Pastille ton="rouge">doit {da(reste)}</Pastille>;
  if (s === "avance") return <Pastille ton="vert">avance {da(-reste)}</Pastille>;
  return <Pastille ton="vert">à jour</Pastille>;
}

export function BarreMois({ faites, total, claire }: { faites: number; total: number; claire?: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cx("h-1.5 flex-1 rounded-full", i < faites ? "bg-vert" : claire ? "bg-brun-600" : "bg-creme-300")}
        />
      ))}
    </div>
  );
}

export function Modale({
  titre, sousTitre, onFermer, children, pied, largeur = 460,
}: { titre: string; sousTitre?: string; onFermer(): void; children: ReactNode; pied?: ReactNode; largeur?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFermer]);
  return (
    <div className="anim-fondu fixed inset-0 z-50 grid place-items-center bg-brun-900/40 p-6 backdrop-blur-[2px]" onMouseDown={onFermer}>
      <div
        className="anim-apparition w-full rounded-[28px] bg-creme-100 shadow-2xl"
        style={{ maxWidth: largeur }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold">{titre}</h2>
            {sousTitre && <p className="mt-0.5 text-sm text-brun-400">{sousTitre}</p>}
          </div>
          <button onClick={onFermer} className="grid size-9 place-items-center rounded-full text-brun-400 hover:bg-creme-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {pied && <div className="flex justify-end gap-2 border-t border-creme-300/70 px-6 py-4">{pied}</div>}
      </div>
    </div>
  );
}

// ---------- confirmation & notifications ----------

interface Confirmation { titre: string; message: string; libelle?: string; danger?: boolean; resoudre(ok: boolean): void }
interface Notif { id: number; texte: string; ton: "ok" | "erreur" }

const UiCtx = createContext<{ confirmer(o: Omit<Confirmation, "resoudre">): Promise<boolean>; notifier(t: string, ton?: Notif["ton"]): void } | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [conf, setConf] = useState<Confirmation | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const confirmer = useCallback(
    (o: Omit<Confirmation, "resoudre">) => new Promise<boolean>((resoudre) => setConf({ ...o, resoudre })),
    [],
  );
  const notifier = useCallback((texte: string, ton: Notif["ton"] = "ok") => {
    const id = Date.now() + Math.random();
    setNotifs((n) => [...n, { id, texte, ton }]);
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 2800);
  }, []);
  const fermer = (ok: boolean) => {
    conf?.resoudre(ok);
    setConf(null);
  };

  return (
    <UiCtx.Provider value={{ confirmer, notifier }}>
      {children}
      {conf && (
        <Modale
          titre={conf.titre}
          onFermer={() => fermer(false)}
          largeur={420}
          pied={
            <>
              <Bouton onClick={() => fermer(false)}>Annuler</Bouton>
              <Bouton variante={conf.danger ? "danger" : "vert"} onClick={() => fermer(true)} autoFocus>
                {conf.libelle ?? "Confirmer"}
              </Bouton>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-brun-600 whitespace-pre-line">{conf.message}</p>
        </Modale>
      )}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {notifs.map((n) => (
          <div
            key={n.id}
            className={cx(
              "anim-apparition rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg",
              n.ton === "ok" ? "bg-brun-800 text-creme" : "bg-rouge text-white",
            )}
          >
            {n.texte}
          </div>
        ))}
      </div>
    </UiCtx.Provider>
  );
}

export function useUi() {
  const u = useContext(UiCtx);
  if (!u) throw new Error("useUi hors du UiProvider");
  return u;
}
