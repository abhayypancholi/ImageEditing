import { create } from 'zustand';
import { HistoryEntry } from '../types';

interface HistoryStore {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  history: HistoryEntry[]; // Combined history for display
  currentIndex: number; // Current position in history

  pushToHistory: (entry: HistoryEntry) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  history: [],
  currentIndex: -1,

  pushToHistory: (entry) => {
    set((state) => {
      const newHistory = [...state.undoStack, entry];
      return {
        undoStack: [...state.undoStack, entry],
        redoStack: [], // Clear redo stack on new operation
        history: newHistory,
        currentIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const entry = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const newCurrentIndex = newUndoStack.length - 1;
    
    set({
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, entry],
      currentIndex: newCurrentIndex,
    });
    
    return newUndoStack[newCurrentIndex] || null;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const entry = state.redoStack[state.redoStack.length - 1];
    const newUndoStack = [...state.undoStack, entry];
    
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: newUndoStack,
      currentIndex: newUndoStack.length - 1,
    });
    
    return entry;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      history: [],
      currentIndex: -1,
    });
  },
}));
