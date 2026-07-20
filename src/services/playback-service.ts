import { invoke } from "@tauri-apps/api/core";

import type { PlaybackSession, PlaybackSessionInput } from "../types/playback";

export function getPlaybackSession(): Promise<PlaybackSession> {
  return invoke<PlaybackSession>("get_playback_session");
}

export function savePlaybackSession(input: PlaybackSessionInput): Promise<void> {
  return invoke<void>("save_playback_session", { input });
}
