import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";
import { useApp } from "./app-context";

/** Charge des données de façon asynchrone et permet de les recharger. */
export function useLoader<T>(load: () => Promise<T>, deps: unknown[]) {
  const { notify } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await run();
      if (id === requestId.current) setData(result);
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [run, notify]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, reload, setData };
}

/** Exécute une action et affiche l'erreur éventuelle. Renvoie true si elle a réussi. */
export function useAction() {
  const { notify } = useApp();
  return useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) notify(successMessage, "success");
        return true;
      } catch (error) {
        notify(errorMessage(error), "error");
        return false;
      }
    },
    [notify],
  );
}
