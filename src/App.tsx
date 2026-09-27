import { CalendarCheck, Plus, Settings, Users, UsersRound, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DialogueGroupe, useGroupes } from "./components/groupes";
import { cx } from "./components/ui";
import Eleves from "./pages/Eleves";
import Accueil from "./pages/Accueil";
import Groupes from "./pages/Groupes";
import Paiements from "./pages/Paiements";
import Parametres from "./pages/Parametres";
import Presence from "./pages/Presence";
import { useStore } from "./store";

export type Page = "presence" | "eleves" | "groupes" | "paiements" | "parametres";
/** `cible` : l'élève à ouvrir (page Élèves) ou le groupe à afficher (pages Présence et Groupes). */
export type Aller = (p: Page, cible?: string) => void;

const MENU: { id: Page; libelle: string; icone: ReactNode }[] = [
  { id: "presence", libelle: "Présence", icone: <CalendarCheck size={18} /> },
  { id: "eleves", libelle: "Élèves", icone: <Users size={18} /> },
  { id: "groupes", libelle: "Groupes", icone: <UsersRound size={18} /> },
  { id: "paiements", libelle: "Paiements", icone: <Wallet size={18} /> },
  { id: "parametres", libelle: "Paramètres", icone: <Settings size={18} /> },
];

export default function App() {
  const { donnees, bilans } = useStore();
  const [page, setPage] = useState<Page>("presence");
  const [cible, setCible] = useState<string | undefined>();
  const [visite, setVisite] = useState(0);
  const [nouveauGroupe, setNouveauGroupe] = useState(false);
  const groupes = useGroupes();
  const p = donnees.parametres;
  const aller: Aller = (nouvelle, c) => {
    setPage(nouvelle);
    setCible(c);
    if (c) setVisite((v) => v + 1); // remonte la page pour qu'elle prenne en compte la nouvelle cible
  };
  const nbDoivent = bilans.filter((b) => b.eleve.actif && b.reste > 0.5).length;
  const prof = p.nomProf.trim() || "Enseignant(e)";
  if (!p.configure) return <Accueil onTermine={() => aller("presence")} />;

  return (
    <div className="flex h-full">
      <aside className="sombre flex w-[244px] shrink-0 flex-col bg-brun-800 px-3 py-5 text-creme">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-full bg-orange text-lg font-extrabold text-brun-900">
            {(p.nomEtablissement.trim()[0] ?? "S").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold">{p.nomEtablissement || "Cours de soutien"}</div>
            <div className="text-xs text-brun-300">Cours de soutien</div>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {MENU.map((m) => (
            <button
              key={m.id}
              onClick={() => aller(m.id)}
              className={cx(
                "flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition cursor-pointer",
                page === m.id ? "bg-vert text-white shadow-md shadow-black/20" : "text-creme/85 hover:bg-brun-700",
              )}
            >
              {m.icone}
              <span className="flex-1 text-left">{m.libelle}</span>
              {m.id === "eleves" && nbDoivent > 0 && (
                <span className={cx("rounded-full px-2 text-[11px] font-bold", page === m.id ? "bg-white/20" : "bg-rouge text-white")}>{nbDoivent}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-6 flex items-center justify-between px-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brun-300">Mes groupes</span>
          <button onClick={() => setNouveauGroupe(true)} className="grid size-7 place-items-center rounded-full text-brun-300 hover:bg-brun-700 hover:text-creme cursor-pointer" title="Nouveau groupe">
            <Plus size={15} />
          </button>
        </div>
        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto">
          {groupes.map((g) => {
            const nb = donnees.eleves.filter((e) => e.actif && e.groupeId === g.id).length;
            const sel = page === "presence" && cible === g.id;
            return (
              <button
                key={g.id}
                onClick={() => aller("presence", g.id)}
                title={`Faire l'appel · ${g.nom}${g.horaire ? ` (${g.horaire})` : ""}`}
                className={cx(
                  "flex min-h-9 shrink-0 items-center gap-3 rounded-full px-4 text-left text-sm transition cursor-pointer",
                  sel ? "bg-brun-600 text-creme" : "text-creme/80 hover:bg-brun-700",
                )}
              >
                <span className={cx("size-2 shrink-0 rounded-full", sel ? "bg-orange" : "bg-brun-400")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.nom}</span>
                  {g.horaire && <span className="block truncate text-[11px] text-brun-300">{g.horaire}</span>}
                </span>
                <span className="text-[11px] text-brun-300">{nb}</span>
              </button>
            );
          })}
          {!groupes.length && (
            <button onClick={() => setNouveauGroupe(true)} className="mx-2 rounded-2xl border border-dashed border-brun-600 px-3 py-3 text-left text-xs text-brun-300 hover:border-brun-400 hover:text-creme cursor-pointer">
              + Créer un premier groupe
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brun-700/70 p-3">
          <div className="grid size-10 place-items-center rounded-full bg-rouge text-sm font-bold text-white">
            {prof.split(/\s+/).map((m) => m[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{prof}</div>
            <div className="text-xs text-brun-300">Enseignant(e)</div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        {page === "presence" && <Presence key={visite} groupeInitial={cible} />}
        {page === "eleves" && <Eleves key={visite} eleveInitial={cible} />}
        {page === "groupes" && <Groupes key={visite} aller={aller} groupeInitial={cible} />}
        {page === "paiements" && <Paiements />}
        {page === "parametres" && <Parametres />}
      </main>
      {nouveauGroupe && <DialogueGroupe onFermer={() => setNouveauGroupe(false)} onCree={(id) => aller("groupes", id)} />}
    </div>
  );
}
