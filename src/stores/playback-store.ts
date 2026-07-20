import { create } from "zustand";

import type { PlaybackSession, PlayableTrack, RepeatMode } from "../types/playback";

interface PlaybackState {
  queue: PlayableTrack[];
  currentIndex: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  isQueueOpen: boolean;
  isRestored: boolean;
  restore: (session: PlaybackSession) => void;
  markRestored: () => void;
  playTrack: (track: PlayableTrack, context?: PlayableTrack[]) => void;
  addToQueue: (track: PlayableTrack) => void;
  addNext: (track: PlayableTrack) => void;
  removeAt: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  next: () => void;
  previous: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVolume: (volume: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  toggleQueue: () => void;
}

const sameTrack = (left: PlayableTrack, right: PlayableTrack) =>
  left.projectId === right.projectId && left.fileId === right.fileId;

export const usePlaybackStore = create<PlaybackState>((set) => ({
  queue: [],
  currentIndex: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  repeatMode: "off",
  shuffle: false,
  isQueueOpen: false,
  isRestored: false,
  restore: (session) => set({
    queue: session.queue,
    currentIndex: session.currentIndex,
    currentTime: session.positionSeconds,
    volume: session.volume,
    repeatMode: session.repeatMode,
    shuffle: session.shuffle,
    isPlaying: false,
    isRestored: true,
  }),
  markRestored: () => set({ isRestored: true }),
  playTrack: (track, context) => set((state) => {
    const queue = context?.length ? context : state.queue;
    const existing = queue.findIndex((item) => sameTrack(item, track));
    if (existing >= 0) {
      return { queue, currentIndex: existing, currentTime: 0, duration: 0, isPlaying: true };
    }
    const nextQueue = [...queue, track];
    return { queue: nextQueue, currentIndex: nextQueue.length - 1, currentTime: 0, duration: 0, isPlaying: true };
  }),
  addToQueue: (track) => set((state) =>
    state.queue.some((item) => sameTrack(item, track)) ? state : { queue: [...state.queue, track] }),
  addNext: (track) => set((state) => {
    if (state.queue.some((item) => sameTrack(item, track))) return state;
    const insertAt = state.currentIndex === null ? state.queue.length : state.currentIndex + 1;
    const queue = [...state.queue];
    queue.splice(insertAt, 0, track);
    return { queue };
  }),
  removeAt: (index) => set((state) => {
    if (index < 0 || index >= state.queue.length) return state;
    const queue = state.queue.filter((_, itemIndex) => itemIndex !== index);
    if (!queue.length) return { queue, currentIndex: null, isPlaying: false, currentTime: 0, duration: 0 };
    if (state.currentIndex === null) return { queue };
    if (index < state.currentIndex) return { queue, currentIndex: state.currentIndex - 1 };
    if (index === state.currentIndex) {
      return { queue, currentIndex: Math.min(index, queue.length - 1), currentTime: 0, duration: 0 };
    }
    return { queue };
  }),
  moveInQueue: (from, to) => set((state) => {
    if (from === to || from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length) return state;
    const queue = [...state.queue];
    const [track] = queue.splice(from, 1);
    queue.splice(to, 0, track);
    const current = state.currentIndex;
    let currentIndex = current;
    if (current === from) currentIndex = to;
    else if (current !== null && from < current && to >= current) currentIndex = current - 1;
    else if (current !== null && from > current && to <= current) currentIndex = current + 1;
    return { queue, currentIndex };
  }),
  clearQueue: () => set({ queue: [], currentIndex: null, isPlaying: false, currentTime: 0, duration: 0 }),
  next: () => set((state) => {
    if (state.currentIndex === null || !state.queue.length) return state;
    if (state.shuffle && state.queue.length > 1) {
      let nextIndex = state.currentIndex;
      while (nextIndex === state.currentIndex) nextIndex = Math.floor(Math.random() * state.queue.length);
      return { currentIndex: nextIndex, currentTime: 0, duration: 0, isPlaying: true };
    }
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.queue.length) return { currentIndex: nextIndex, currentTime: 0, duration: 0, isPlaying: true };
    if (state.repeatMode === "all") return { currentIndex: 0, currentTime: 0, duration: 0, isPlaying: true };
    return { isPlaying: false, currentTime: state.duration };
  }),
  previous: () => set((state) => ({
    currentIndex: state.currentIndex === null ? null : Math.max(0, state.currentIndex - 1),
    currentTime: 0,
    duration: 0,
    isPlaying: state.currentIndex !== null,
  })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  cycleRepeat: () => set((state) => ({
    repeatMode: state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off",
  })),
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
}));

export function playbackSessionInput() {
  const state = usePlaybackStore.getState();
  return {
    queue: state.queue.map((track) => ({ projectId: track.projectId, fileId: track.fileId })),
    currentIndex: state.currentIndex,
    positionSeconds: Math.max(0, state.currentTime),
    volume: state.volume,
    repeatMode: state.repeatMode,
    shuffle: state.shuffle,
  };
}
