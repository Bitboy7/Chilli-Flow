export type ProjectSort =
  | "name"
  | "modified"
  | "created"
  | "bpm"
  | "imported";

export type SortDirection = "asc" | "desc";

export interface ProjectQuery {
  page: number;
  pageSize: number;
  search: string | null;
  daw: string | null;
  extension: string | null;
  status: string | null;
  genre: string | null;
  tagId: number | null;
  favoriteOnly: boolean;
  sortBy: ProjectSort;
  sortDirection: SortDirection;
}

export interface ProjectListItem {
  id: number;
  displayName: string;
  originalName: string;
  filePath: string;
  extension: string;
  daw: string;
  coverPath: string | null;
  bpm: number | null;
  musicalKey: string | null;
  genre: string | null;
  status: string;
  statusLabel: string;
  statusColor: string | null;
  rating: number | null;
  isFavorite: boolean;
  fileCreatedAt: string | null;
  fileModifiedAt: string | null;
  indexedAt: string;
  isMissing: boolean;
  tags: string[];
}

export interface ProjectPage {
  items: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProjectStatusFacet {
  key: string;
  label: string;
  color: string | null;
}

export interface ProjectTagFacet {
  id: number;
  name: string;
}

export interface ProjectFacets {
  daws: string[];
  extensions: string[];
  statuses: ProjectStatusFacet[];
  genres: string[];
  tags: ProjectTagFacet[];
}

export interface ProjectDetail extends ProjectListItem {
  previewPath: string | null;
  notes: string | null;
  fileSize: number;
  updatedAt: string;
  folders: ProjectFolderPaths;
  workspaceRoot: string | null;
  sourceKind: "scanned" | "managed_pending" | "managed";
}

export type ProjectFolderCategory = "stems" | "mixes" | "masters" | "references";

export interface ProjectFolderPaths {
  stems: string | null;
  mixes: string | null;
  masters: string | null;
  references: string | null;
}

export interface UpdateProjectInput {
  displayName: string;
  bpm: number | null;
  musicalKey: string | null;
  genre: string | null;

  status: string;
  rating: number | null;
  notes: string | null;
  tags: string[];
}

export type ProjectVersionKind = "primary" | "backup" | "copy" | "version";
export type ProjectVersionConfidence = "high" | "suggested" | "confirmed" | null;

export interface ProjectVersionItem {
  id: number;
  fileName: string;
  filePath: string;
  kind: ProjectVersionKind;
  confidence: ProjectVersionConfidence;
  fileSize: number;
  fileModifiedAt: string | null;
  isMissing: boolean;
}

export interface ProjectVersionSet {
  projectId: number;
  primary: ProjectVersionItem;
  versions: ProjectVersionItem[];
}

export interface CoverAsset {
  dataUrl: string;
}

export type ProjectFileCategory =
  | "stem" | "mix" | "master" | "preview" | "reference"
  | "artwork" | "midi" | "preset" | "sample" | "other";

export interface ProjectFile {
  id: number;
  projectId: number;
  filePath: string;
  fileName: string;
  fileType: string;
  category: ProjectFileCategory;
  fileSize: number;
  createdAt: string;
  isMissing: boolean;
}

export interface AudioAnalysis {
  fileId: number;
  durationSeconds: number;
  sampleRate: number;
  bitDepth: number | null;
  channels: number;
  integratedLufs: number | null;
  loudnessRangeLu: number | null;
  truePeakDbfs: number | null;
  waveform: number[];
  analyzedAt: string;
  fromCache: boolean;
}

export interface FolderSetupPlan {
  token: number;
  projectId: number;
  daw: string;
  rootPath: string;
  items: Array<{ category: ProjectFolderCategory; path: string; exists: boolean }>;
}

export interface DawInstallation {
  daw: string;
  extension: string;
  installed: boolean;
  executablePath: string | null;
}

export interface CreateWorkspaceInput {
  name: string;
  daw: string;
  extension: string;
  parentDirectory: string;
  templatePath: string | null;
}

export interface HandoffSettings {
  dawVersion: string | null;
  timeSignature: string;
  commonStart: string;
  collaboratorNotes: string | null;
  plugins: string[];
}

export interface HandoffFileSelection {
  fileId: number;
  variant: "wet" | "dry" | "neutral";
}

export interface HandoffPreview {
  settings: HandoffSettings;
  files: ProjectFile[];
  warnings: string[];
  nextVersion: number;
}

export interface CreateHandoffInput {
  settings: HandoffSettings;
  selections: HandoffFileSelection[];
  includeProjectFile: boolean;
  destinationParent: string;
}

export interface HandoffExportResult {
  destinationPath: string;
  versionNumber: number;
  fileCount: number;
}
