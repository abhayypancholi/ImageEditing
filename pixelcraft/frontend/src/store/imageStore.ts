import { create } from 'zustand';
import { ImageMetadata, SessionInfo } from '../types';

interface ImageStore {
  sessionId: string | null;
  metadata: ImageMetadata | null;
  workingImageBase64: string | null;
  originalImageBase64: string | null;
  isProcessing: boolean;
  processingLabel: string;

  initSession: (session: SessionInfo, originalBase64: string) => void;
  setWorkingImage: (base64: string, metadata: ImageMetadata) => void;
  setProcessing: (loading: boolean, label?: string) => void;
  clearSession: () => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  sessionId: null,
  metadata: null,
  workingImageBase64: null,
  originalImageBase64: null,
  isProcessing: false,
  processingLabel: '',

  initSession: (session, originalBase64) => {
    set({
      sessionId: session.sessionId,
      metadata: session.metadata,
      workingImageBase64: originalBase64,
      originalImageBase64: originalBase64,
      isProcessing: false,
      processingLabel: '',
    });
  },

  setWorkingImage: (base64, metadata) => {
    set({
      workingImageBase64: base64,
      metadata,
    });
  },

  setProcessing: (loading, label = '') => {
    set({
      isProcessing: loading,
      processingLabel: label,
    });
  },

  clearSession: () => {
    set({
      sessionId: null,
      metadata: null,
      workingImageBase64: null,
      originalImageBase64: null,
      isProcessing: false,
      processingLabel: '',
    });
  },
}));
