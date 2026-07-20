export type RepeatMode = "off" | "all" | "one";

export interface PlayableTrack {
  projectId: number;
  fileId: number;
  projectName: string;
  fileName: string;
  fileType: string;
  category: string;
  isMissing: boolean;
}

export interface ComparisonTrack {
  track: PlayableTrack;
  integratedLufs: number | null;
}

export interface PlaybackSession {
  queue: PlayableTrack[];
  currentIndex: number | null;
  positionSeconds: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
}

export interface PlaybackSessionInput {
  queue: Array<{ projectId: number; fileId: number }>;
  currentIndex: number | null;
  positionSeconds: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
}
