import { convertFileSrc, invoke } from "@tauri-apps/api/core";

import type {
  AudioAnalysis,
  CoverAsset,
  FolderSetupPlan,
  ProjectDetail,
  ProjectFacets,
  ProjectFile,
  ProjectFileCategory,
  ProjectFolderCategory,
  ProjectPage,
  ProjectQuery,
  UpdateProjectInput,
} from "../types/projects";
import type { PlayableTrack } from "../types/playback";

export function listProjects(query: ProjectQuery): Promise<ProjectPage> {
  return invoke<ProjectPage>("list_projects", { query });
}

export function getProjectFacets(): Promise<ProjectFacets> {
  return invoke<ProjectFacets>("get_project_facets");
}

export function getProject(projectId: number): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("get_project", { projectId });
}

export function updateProject(projectId: number, input: UpdateProjectInput): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("update_project", { projectId, input });
}

export function setProjectFavorite(projectId: number, favorite: boolean): Promise<void> {
  return invoke<void>("set_project_favorite", { projectId, favorite });
}

export function selectProjectCover(projectId: number): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("select_project_cover", { projectId });
}

export function clearProjectCover(projectId: number): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("clear_project_cover", { projectId });
}

export function getProjectCover(projectId: number): Promise<CoverAsset | null> {
  return invoke<CoverAsset | null>("get_project_cover", { projectId });
}

export function renameProjectFile(projectId: number, newStem: string): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("rename_project_file", { projectId, newStem });
}

export function openProject(projectId: number): Promise<void> {
  return invoke<void>("open_project", { projectId });
}

export function openProjectFolder(projectId: number): Promise<void> {
  return invoke<void>("open_project_folder", { projectId });
}

export function revealProject(projectId: number): Promise<void> {
  return invoke<void>("reveal_project", { projectId });
}

export function listProjectFiles(projectId: number): Promise<ProjectFile[]> {
  return invoke<ProjectFile[]>("list_project_files", { projectId });
}

export function selectProjectFiles(projectId: number, category: ProjectFileCategory): Promise<ProjectFile[]> {
  return invoke<ProjectFile[]>("select_project_files", { projectId, category });
}

export function removeProjectFile(projectId: number, fileId: number): Promise<void> {
  return invoke<void>("remove_project_file", { projectId, fileId });
}

export function setProjectFileCategory(projectId: number, fileId: number, category: ProjectFileCategory): Promise<ProjectFile[]> {
  return invoke<ProjectFile[]>("set_project_file_category", { projectId, fileId, category });
}

export function openProjectFile(projectId: number, fileId: number): Promise<void> {
  return invoke<void>("open_project_file", { projectId, fileId });
}

export function setProjectPreview(projectId: number, fileId: number | null): Promise<void> {
  return invoke<void>("set_project_preview", { projectId, fileId });
}

export function analyzeProjectAudio(projectId: number, fileId: number): Promise<AudioAnalysis> {
  return invoke<AudioAnalysis>("analyze_project_audio", { projectId, fileId });
}

export async function projectAudioUrl(projectId: number, fileId: number): Promise<string> {
  const path = await invoke<string>("authorize_project_audio", { projectId, fileId });
  return convertFileSrc(path);
}

export function playableTrack(project: ProjectDetail, file: ProjectFile): PlayableTrack {
  return {
    projectId: project.id,
    fileId: file.id,
    projectName: project.displayName,
    fileName: file.fileName,
    fileType: file.fileType,
    category: file.category,
    isMissing: file.isMissing,
  };
}

export function selectProjectAssetFolder(projectId: number, category: ProjectFolderCategory): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("select_project_asset_folder", { projectId, category });
}

export function clearProjectAssetFolder(projectId: number, category: ProjectFolderCategory): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("clear_project_asset_folder", { projectId, category });
}

export function openProjectAssetFolder(projectId: number, category: ProjectFolderCategory): Promise<void> {
  return invoke<void>("open_project_asset_folder", { projectId, category });
}

export function previewProjectFolderSetup(projectId: number): Promise<FolderSetupPlan> {
  return invoke<FolderSetupPlan>("preview_project_folder_setup", { projectId });
}

export function applyProjectFolderSetup(projectId: number, token: number): Promise<ProjectDetail> {
  return invoke<ProjectDetail>("apply_project_folder_setup", { projectId, token });
}
