import { invoke } from "@tauri-apps/api/core";

import type {
  CreateHandoffInput,
  HandoffExportResult,
  HandoffPreview,
} from "../types/projects";

export function getHandoffPreview(projectId: number): Promise<HandoffPreview> {
  return invoke<HandoffPreview>("get_handoff_preview", { projectId });
}

export function selectHandoffDestination(): Promise<string | null> {
  return invoke<string | null>("select_handoff_destination");
}

export function createHandoff(
  projectId: number,
  input: CreateHandoffInput,
): Promise<HandoffExportResult> {
  return invoke<HandoffExportResult>("create_handoff", { projectId, input });
}

export function openHandoffDestination(projectId: number, path: string): Promise<void> {
  return invoke<void>("open_handoff_destination", { projectId, path });
}
