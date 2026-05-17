export type ToolType =
  | 'upload'
  | 'crop'
  | 'zoom'
  | 'rotate'
  | 'enhance'
  | 'filters'
  | 'annotate'
  | 'ocr'
  | 'face'
  | 'bgremove'
  | 'objremove'
  | 'colorspot'
  | 'count'
  | 'extend'
  | 'compress'
  | 'straighten'
  | 'history'
  | 'export';

export interface ImageMetadata {
  width: number;
  height: number;
  fileSizeBytes: number;
  format: string; // 'PNG' | 'JPEG' | 'WEBP' | 'BMP'
  colorMode: string; // 'RGB' | 'RGBA' | 'L' | 'CMYK'
  fileName: string;
  hasAlpha: boolean;
}

export interface SessionInfo {
  sessionId: string;
  originalPath: string;
  workingPath: string;
  metadata: ImageMetadata;
  createdAt: string;
  lastModified: string;
}

export interface HistoryEntry {
  id: string; // uuid
  snapshotId: string; // snapshot identifier for restore
  timestamp: number;
  operationName: string; // e.g. "Crop", "Brightness +20"
  imagePath: string; // path in storage/history/
  thumbnailBase64: string; // 80×80 thumbnail for history panel
  parameters?: Record<string, any>; // Optional operation parameters
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProcessedImageResponse {
  workingImageBase64: string; // current state as base64 PNG
  historyEntry: HistoryEntry;
  metadata: ImageMetadata;
}
