import { createContext, useContext } from "react";

export type Page = "dashboard" | "groups" | "students" | "attendance" | "payments";

export interface NavParams {
  groupId?: number;
  year?: number;
  month?: number;
  date?: string;
  /** Ouvre directement le formulaire de création. */
  create?: boolean;
}

export interface AppContextValue {
  page: Page;
  params: NavParams;
  navigate: (page: Page, params?: NavParams) => void;
  notify: (message: string, kind?: "success" | "error") => void;
  /** Ouvre la fiche d'un élève (historique paiements/présences). */
  openStudent: (studentId: number) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext manquant");
  return ctx;
}
