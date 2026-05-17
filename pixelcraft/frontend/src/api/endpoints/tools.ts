import { apiClient } from '../client';
import { ApiResponse, ImageMetadata } from '../../types';

export interface ProcessedImageResponse {
  workingImageBase64: string;
  metadata: ImageMetadata;
}

// Crop
export interface CropRequest {
  session_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const cropImage = async (request: CropRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/crop', request);
  return response.data;
};

// Rotate
export interface RotateRequest {
  session_id: string;
  angle: number;
  flip_h?: boolean;
  flip_v?: boolean;
}

export const rotateImage = async (request: RotateRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/rotate', request);
  return response.data;
};

// Perspective
export interface PerspectiveRequest {
  session_id: string;
  src_points: number[][];
  dst_points: number[][];
}

export const perspectiveTransform = async (request: PerspectiveRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/perspective', request);
  return response.data;
};

// Zoom/Enhance
export interface ZoomEnhanceRequest {
  session_id: string;
  scale: number;
  algorithm: string;
}

export const enhanceResolution = async (request: ZoomEnhanceRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/zoom/enhance', request);
  return response.data;
};

// Enhance
export interface EnhanceRequest {
  session_id: string;
  brightness?: number;
  contrast?: number;
  sharpness?: number;
  noise_removal?: number;
  saturation?: number;
  hue_shift?: number;
  edge_mode?: string;
  region_bbox?: number[];
  region_strength?: number;
}

export const applyEnhancements = async (request: EnhanceRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/enhance/apply', request);
  return response.data;
};

// Filters
export interface FilterPreviewRequest {
  session_id: string;
}

export interface FilterPreviewResponse {
  previews: Record<string, string>;
}

export const previewAllFilters = async (request: FilterPreviewRequest): Promise<ApiResponse<FilterPreviewResponse>> => {
  const response = await apiClient.post<ApiResponse<FilterPreviewResponse>>('/api/filters/preview_all', request);
  return response.data;
};

export interface FilterApplyRequest {
  session_id: string;
  filter_name: string;
  intensity?: number;
}

export const applyFilter = async (request: FilterApplyRequest): Promise<ApiResponse<ProcessedImageResponse>> => {
  const response = await apiClient.post<ApiResponse<ProcessedImageResponse>>('/api/filters/apply', request);
  return response.data;
};
