import { invoke } from "@tauri-apps/api/core";

import type {
  CreateWorkspaceInput,
  DawInstallation,
  ProjectDetail,
} from "../types/projects";

export function listDawInstallations(): Promise<DawInstallation[]> {
  return invoke<DawInstallation[]>("list_daw_installations");
}

export function selectWorkspaceParent(): Promise<string | null> {
  return invoke<string | null>("select_workspace_parent");
}

export function selectWorkspaceTemplate(extension: string): Promise<string | null> {
  return invoke<string | null>("select_workspace_template", { extension });
}

export function createWorkspace(input: CreateWorkspaceInput): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("create_workspace", { input });
}
