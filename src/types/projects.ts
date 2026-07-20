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
