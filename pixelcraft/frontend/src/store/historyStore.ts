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

    // Pop the current operation from undo stack
    const currentEntry = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    
    // Push to redo stack
    const newRedoStack = [...state.redoStack, currentEntry];
    
    // The entry to restore is the NEW top of undo stack (state BEFORE the popped operation)
    // If undo stack is now empty, return null (restore to original)
    const restoreEntry = newUndoStack.length > 0 ? newUndoStack[newUndoStack.length - 1] : null;
    
    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      currentIndex: newUndoStack.length - 1,
    });
    
    return restoreEntry;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    // Pop from redo stack
    const entry = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    
    // Push to undo stack
    const newUndoStack = [...state.undoStack, entry];
    
    set({
      redoStack: newRedoStack,
      undoStack: newUndoStack,
      currentIndex: newUndoStack.length - 1,
    });
    
    // Return the entry to restore TO (the one we just redid)
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
