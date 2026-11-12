/**
 * Transient draft store — tracks in-progress shapes during mouse drag.
 * Kept completely outside the main undo/redo history to prevent re-render storms.
 */
import { create } from 'zustand';
import type { DraftShape } from './tool';

interface DraftStore {
  draft: DraftShape | null;
  setDraft: (draft: DraftShape | null) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
