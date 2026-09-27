import { CalendarCheck, LayoutGrid, Settings, Users, UsersRound, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cx } from "./components/ui";
import Eleves from "./pages/Eleves";
import Groupes from "./pages/Groupes";
import Paiements from "./pages/Paiements";
import Parametres from "./pages/Parametres";
import Presence from "./pages/Presence";
import TableauDeBord from "./pages/TableauDeBord";
import { useStore } from "./store";

export type Page = "tableau" | "presence" | "eleves" | "groupes" | "paiements" | "parametres";
/** `cible` : l'élève à ouvrir (page Élèves) ou le groupe à appeler (page Présence). */
export type Aller = (p: Page, cible?: string) => void;

const MENU: { id: Page; libelle: string; icone: ReactNode }[] = [
  { id: "tableau", libelle: "Tableau de bord", icone: <LayoutGrid size={18} /> },
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
  const p = donnees.parametres;
  const aller: Aller = (nouvelle, c) => {
    setPage(nouvelle);
    setCible(c);
    if (c) setVisite((v) => v + 1); // remonte la page pour qu'elle prenne en compte la nouvelle cible
  };
  const nbDoivent = bilans.filter((b) => b.eleve.actif && b.reste > 0.5).length;
  const prof = p.nomProf.trim() || "Enseignant(e)";

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
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-brun-700/70 p-3">
          <div className="grid size-10 place-items-center rounded-full bg-rouge text-sm font-bold text-white">
            {prof.split(/\s+/).map((m) => m[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{prof}</div>
            <div className="text-xs text-brun-300">Enseignante</div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        {page === "tableau" && <TableauDeBord aller={aller} />}
        {page === "presence" && <Presence key={visite} groupeInitial={cible} />}
        {page === "eleves" && <Eleves key={visite} eleveInitial={cible} />}
        {page === "groupes" && <Groupes aller={aller} />}
        {page === "paiements" && <Paiements />}
        {page === "parametres" && <Parametres />}
      </main>
    </div>
  );
}
