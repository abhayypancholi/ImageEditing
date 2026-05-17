import { create } from 'zustand';
import { ToolType } from '../types';

interface ToolStore {
  activeTool: ToolType | null;
  toolOptions: Record<string, unknown>;

  setTool: (tool: ToolType | null) => void;
  updateToolOptions: (options: Partial<Record<string, unknown>>) => void;
}

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: null,
  toolOptions: {},

  setTool: (tool) => {
    set({
      activeTool: tool,
      toolOptions: {}, // Reset options when switching tools
    });
  },

  updateToolOptions: (options) => {
    set((state) => ({
      toolOptions: { ...state.toolOptions, ...options },
    }));
  },
}));
