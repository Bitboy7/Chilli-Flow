import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { useFoldersStore } from "../stores/folders-store";
import { useScanStore } from "../stores/scan-store";
import { useToastStore } from "../stores/toast-store";
import type {
  ScanFinished,
  ScanProgress,
} from "../types/scanning";

export function useScanEvents() {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    const unlisteners: UnlistenFn[] = [];

    Promise.all([
      listen<ScanProgress>("scan://progress", ({ payload }) => {
        useScanStore.getState().receiveProgress(payload);
      }),
      listen<ScanFinished>("scan://finished", ({ payload }) => {
        useScanStore.getState().receiveFinished(payload);
        void useFoldersStore.getState().load();
        window.dispatchEvent(new CustomEvent("chilli:library-changed"));

        const push = useToastStore.getState().push;
        if (payload.status === "failed") {
          push({
            kind: "error",
            title: "El escaneo falló",
            description: payload.errorMessage ?? undefined,
          });
        } else if (payload.status === "cancelled") {
          push({
            kind: "info",
            title: "Escaneo cancelado",
            description: `${payload.projectsFound} proyectos encontrados antes de cancelar.`,
          });
        } else {
          push({
            kind: "success",
            title: "Escaneo completado",
            description: `${payload.projectsCreated} nuevos · ${payload.projectsUpdated} actualizados`,
          });
        }
      }),
    ]).then((registered) => {
      if (disposed) {
        registered.forEach((unlisten) => unlisten());
      } else {
        unlisteners.push(...registered);
      }
    });

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);
}
