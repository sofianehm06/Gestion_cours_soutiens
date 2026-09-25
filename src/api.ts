import type { SoutienProApi } from "../shared/types";

declare global {
  interface Window {
    api?: SoutienProApi;
  }
}

function missingApi(): never {
  throw new Error("SoutienPro doit être lancé dans l'application Electron.");
}

/** Accès à la base via le processus principal. */
export const api: SoutienProApi = new Proxy({} as SoutienProApi, {
  get(_target, prop: string) {
    const bridge = window.api;
    if (!bridge) return missingApi;
    return bridge[prop as keyof SoutienProApi];
  },
});

/** Extrait un message lisible d'une erreur IPC. */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}
