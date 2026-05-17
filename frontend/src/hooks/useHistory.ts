import { useHistoryStore } from '../store/historyStore';
import { useImageStore } from '../store/imageStore';
import { getSessionImage } from '../api/endpoints/upload';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

export const useHistory = () => {
  const { undo, redo, canUndo, canRedo, pushToHistory } = useHistoryStore();
  const { setWorkingImage, metadata, sessionId } = useImageStore();

  const handleUndo = async () => {
    if (!canUndo()) {
      toast.error('Nothing to undo');
      return;
    }

    const entry = undo();
    if (entry && sessionId) {
      try {
        // Call restore API to restore the snapshot
        await apiClient.post('/api/history/restore', {
          session_id: sessionId,
          snapshot_id: entry.snapshotId,
        });

        // Fetch the restored image
        const imageBase64 = await getSessionImage(sessionId);
        if (metadata) {
          setWorkingImage(imageBase64, metadata);
        }
        toast.success(`Undone: ${entry.operationName}`);
      } catch (error) {
        toast.error('Failed to undo operation');
        console.error('Undo error:', error);
      }
    }
  };

  const handleRedo = async () => {
    if (!canRedo()) {
      toast.error('Nothing to redo');
      return;
    }

    const entry = redo();
    if (entry && sessionId) {
      try {
        // Call restore API to restore the snapshot
        await apiClient.post('/api/history/restore', {
          session_id: sessionId,
          snapshot_id: entry.snapshotId,
        });

        // Fetch the restored image
        const imageBase64 = await getSessionImage(sessionId);
        if (metadata) {
          setWorkingImage(imageBase64, metadata);
        }
        toast.success(`Redone: ${entry.operationName}`);
      } catch (error) {
        toast.error('Failed to redo operation');
        console.error('Redo error:', error);
      }
    }
  };

  return {
    handleUndo,
    handleRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    pushToHistory,
  };
};
