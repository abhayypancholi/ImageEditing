import { apiClient } from '../client';
import { ApiResponse, SessionInfo, ImageMetadata } from '../../types';

export interface UploadResponse {
  sessionId: string;
  metadata: ImageMetadata;
}

export interface SessionImageResponse {
  imageBase64: string;
}

export const uploadImage = async (file: File): Promise<ApiResponse<UploadResponse>> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ApiResponse<UploadResponse>>(
    '/api/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export const getSessionImage = async (sessionId: string): Promise<string> => {
  const response = await apiClient.get<SessionImageResponse>(
    `/api/session/${sessionId}/image`
  );
  return response.data.imageBase64;
};

export const getSession = async (sessionId: string): Promise<SessionInfo> => {
  const response = await apiClient.get<SessionInfo>(`/api/session/${sessionId}`);
  return response.data;
};
