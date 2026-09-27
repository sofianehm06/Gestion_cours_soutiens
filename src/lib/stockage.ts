import type { Donnees } from "./types";

interface ApiElectron {
  lire(): Promise<unknown>;
  ecrire(d: Donnees): Promise<boolean>;
  dossier(): Promise<string>;
  ouvrirDossier(): Promise<string>;
  enregistrerFichier(o: { nomParDefaut: string; contenu: string; filtres: { name: string; extensions: string[] }[] }): Promise<boolean>;
  ouvrirFichier(o: { filtres: { name: string; extensions: string[] }[] }): Promise<string | null>;
  licence: {
    etat(): Promise<EtatLicence>;
    activer(cle: string): Promise<boolean>;
  };
}

export interface EtatLicence {
  requise: boolean; // false tant que la clé publique n'est pas installée
  active: boolean;
  code: string; // code de cet ordinateur, à envoyer au vendeur
  nom?: string; // enseignant(e) à qui la licence a été délivrée
}

declare global {
  interface Window {
    api?: ApiElectron;
  }
}

const CLE = "gestion-soutien";
export const estElectron = () => typeof window !== "undefined" && !!window.api;

export async function charger(): Promise<unknown> {
  if (window.api) return window.api.lire();
  const brut = localStorage.getItem(CLE);
  return brut ? JSON.parse(brut) : null;
}

export async function sauver(d: Donnees): Promise<void> {
  if (window.api) await window.api.ecrire(d);
  else localStorage.setItem(CLE, JSON.stringify(d));
}

type Filtre = { name: string; extensions: string[] };

export async function enregistrerFichier(nomParDefaut: string, contenu: string, filtres: Filtre[]): Promise<boolean> {
  if (window.api) return window.api.enregistrerFichier({ nomParDefaut, contenu, filtres });
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomParDefaut;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function ouvrirFichier(filtres: Filtre[]): Promise<string | null> {
  if (window.api) return window.api.ouvrirFichier({ filtres });
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = filtres.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(",");
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve);
    };
    input.click();
  });
}
