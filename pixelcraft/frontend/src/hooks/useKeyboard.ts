import { useEffect } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useToolStore } from '../store/toolStore';
import { useUIStore } from '../store/uiStore';
import { useImageStore } from '../store/imageStore';
import { useImageApi } from './useImageApi';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

export const useKeyboard = () => {
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const { setTool } = useToolStore();
  const { setZoom, fitToScreen, setExportModalOpen } = useUIStore();
  const { metadata, sessionId } = useImageStore();
  const { refreshImage } = useImageApi();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+Z - Undo
      if (ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          const entry = undo();
          if (entry && sessionId) {
            try {
              await apiClient.post('/api/history/restore', {
                session_id: sessionId,
                snapshot_id: entry.snapshotId,
              });
              await refreshImage();
              toast.success(`Undone: ${entry.operationName}`);
            } catch (error) {
              toast.error('Failed to undo');
              console.error(error);
            }
          }
        } else {
          toast.error('Nothing to undo');
        }
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((ctrlKey && e.key === 'z' && e.shiftKey) || (ctrlKey && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) {
          const entry = redo();
          if (entry && sessionId) {
            try {
              await apiClient.post('/api/history/restore', {
                session_id: sessionId,
                snapshot_id: entry.snapshotId,
              });
              await refreshImage();
              toast.success(`Redone: ${entry.operationName}`);
            } catch (error) {
              toast.error('Failed to redo');
              console.error(error);
            }
          }
        } else {
          toast.error('Nothing to redo');
        }
      }

      // Ctrl+S - Save
      if (ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.success('Saved ✓');
      }

      // Ctrl+E - Export
      if (ctrlKey && e.key === 'e') {
        e.preventDefault();
        setExportModalOpen(true);
      }

      // Ctrl+0 - Fit to screen
      if (ctrlKey && e.key === '0') {
        e.preventDefault();
        if (metadata) {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            fitToScreen(
              metadata.width,
              metadata.height,
              canvas.width,
              canvas.height
            );
            toast.success('Fit to screen');
          }
        }
      }

      // Ctrl+1 - Zoom to 100%
      if (ctrlKey && e.key === '1') {
        e.preventDefault();
        setZoom(1);
        toast.success('Zoom: 100%');
      }

      // Escape - Deactivate tool
      if (e.key === 'Escape') {
        e.preventDefault();
        setTool(null);
      }

      // Delete - Delete selected annotation
      if (e.key === 'Delete') {
        // TODO: Implement annotation deletion via store
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo, setTool, setZoom, fitToScreen, setExportModalOpen, metadata, sessionId, refreshImage]);
};
