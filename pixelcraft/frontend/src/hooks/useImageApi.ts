import { useState } from 'react';
import toast from 'react-hot-toast';
import { useImageStore } from '../store/imageStore';
import { apiClient } from '../api/client';

export const useImageApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setProcessing, sessionId, setWorkingImage, metadata } = useImageStore();

  const callApi = async <T,>(
    apiFunction: () => Promise<T>,
    loadingMessage: string = 'Processing...',
    successMessage?: string
  ): Promise<T | null> => {
    setIsLoading(true);
    setProcessing(true, loadingMessage);

    try {
      const result = await apiFunction();
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
      console.error('API Error:', error);
      return null;
    } finally {
      setIsLoading(false);
      setProcessing(false);
    }
  };

  const applyOperation = async (endpoint: string, params: Record<string, any>) => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    setIsLoading(true);
    setProcessing(true, 'Processing...');

    try {
      const response = await apiClient.post(endpoint, {
        session_id: sessionId,
        ...params,
      });

      if (response.data.success) {
        await refreshImage();
        toast.success(response.data.message || 'Operation completed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
      console.error('Operation Error:', error);
    } finally {
      setIsLoading(false);
      setProcessing(false);
    }
  };

  const refreshImage = async () => {
    if (!sessionId || !metadata) return;
    
    try {
      const response = await apiClient.get<{ imageBase64: string }>(
        `/api/session/${sessionId}/image`
      );
      
      // Store raw base64 (ImageCanvas adds the data URI prefix itself)
      setWorkingImage(response.data.imageBase64, metadata);
    } catch (error) {
      console.error('Failed to refresh image:', error);
    }
  };

  return {
    callApi,
    applyOperation,
    isLoading,
    refreshImage,
  };
};