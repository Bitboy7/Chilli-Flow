import { invoke, isTauri } from "@tauri-apps/api/core";

import type { AppStatus } from "../types/app";

export async function getAppStatus(): Promise<AppStatus> {
  if (!isTauri()) {
    throw new Error(
      "SQLite no está disponible en la vista web. Inicia la aplicación con “pnpm tauri dev”.",
    );
  }

  return invoke<AppStatus>("get_app_status");
}
