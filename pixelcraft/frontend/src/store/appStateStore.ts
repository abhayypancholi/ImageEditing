import { create } from 'zustand';

export enum AppState {
  AWAITING_UPLOAD = 'AWAITING_UPLOAD',
  IDLE = 'IDLE',
  TOOL_ACTIVE = 'TOOL_ACTIVE',
  PROCESSING = 'PROCESSING',
  PREVIEW = 'PREVIEW',
}

interface AppStateStore {
  currentState: AppState;
  activeTool: string | null;
  
  transitionTo: (newState: AppState, toolName?: string) => void;
  isState: (state: AppState) => boolean;
  canInteract: () => boolean;
}

export const useAppStateStore = create<AppStateStore>((set, get) => ({
  currentState: AppState.AWAITING_UPLOAD,
  activeTool: null,

  transitionTo: (newState, toolName) => {
    const prev = get().currentState;
    
    // Log state transitions in development
    if (import.meta.env.DEV) {
      console.log(`[State] ${prev} → ${newState}${toolName ? ` (${toolName})` : ''}`);
    }

    set({
      currentState: newState,
      activeTool: newState === AppState.TOOL_ACTIVE ? toolName || null : null,
    });
  },

  isState: (state) => get().currentState === state,

  canInteract: () => {
    const state = get().currentState;
    return state === AppState.IDLE || state === AppState.TOOL_ACTIVE;
  },
}));