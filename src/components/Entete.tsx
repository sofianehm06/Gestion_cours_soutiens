import type { ReactNode } from "react";

export default function Entete({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children?: ReactNode }) {
  return (
    <header className="flex h-[76px] shrink-0 items-center justify-between gap-4 border-b border-creme-300/70 px-7">
      <div>
        <h1 className="text-[22px] font-bold leading-tight">{titre}</h1>
        {sousTitre && <p className="text-[13px] text-brun-400 first-letter:uppercase">{sousTitre}</p>}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}

export function Recherche({ valeur, onChange, placeholder, className }: { valeur: string; onChange(v: string): void; placeholder: string; className?: string }) {
  return (
    <label className={`flex h-10 items-center gap-2 rounded-full border border-creme-300 bg-white px-4 text-sm focus-within:border-vert focus-within:ring-4 focus-within:ring-vert/10 ${className ?? "w-72"}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-brun-400"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent outline-none placeholder:text-brun-300" />
    </label>
  );
}
