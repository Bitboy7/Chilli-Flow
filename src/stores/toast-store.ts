import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  messages: ToastMessage[];
  push: (message: Omit<ToastMessage, "id">) => void;
  remove: (id: number) => void;
}

let nextToastId = 1;

export const useToastStore = create<ToastState>((set) => ({
  messages: [],
  push: (message) =>
    set((state) => ({
      messages: [...state.messages, { ...message, id: nextToastId++ }],
    })),
  remove: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),
}));
