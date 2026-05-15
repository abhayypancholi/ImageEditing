import { create } from 'zustand';

interface UIStore {
  zoom: number;
  panX: number;
  panY: number;
  cursorX: number;
  cursorY: number;
  isHistoryOpen: boolean;
  isExportModalOpen: boolean;

  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  setCursor: (x: number, y: number) => void;
  fitToScreen: (imgW: number, imgH: number, canvasW: number, canvasH: number) => void;
  setHistoryOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  cursorX: 0,
  cursorY: 0,
  isHistoryOpen: false,
  isExportModalOpen: false,

  setZoom: (z) => {
    // Clamp zoom between 0.05 (5%) and 20 (2000%)
    const clampedZoom = Math.max(0.05, Math.min(20, z));
    
    // Snap to 100% if within 2%
    const finalZoom = Math.abs(clampedZoom - 1) < 0.02 ? 1 : clampedZoom;
    
    set({ zoom: finalZoom });
  },

  setPan: (x, y) => {
    set({ panX: x, panY: y });
  },

  setCursor: (x, y) => {
    set({ cursorX: x, cursorY: y });
  },

  fitToScreen: (imgW, imgH, canvasW, canvasH) => {
    const padding = 32;
    const availableW = canvasW - padding * 2;
    const availableH = canvasH - padding * 2;

    const scaleX = availableW / imgW;
    const scaleY = availableH / imgH;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    const finalZoom = Math.abs(scale - 1) < 0.02 ? 1 : scale;

    set({
      zoom: finalZoom,
      panX: (canvasW - imgW * finalZoom) / 2,
      panY: (canvasH - imgH * finalZoom) / 2,
    });
  },

  setHistoryOpen: (open) => {
    set({ isHistoryOpen: open });
  },

  setExportModalOpen: (open) => {
    set({ isExportModalOpen: open });
  },
}));
