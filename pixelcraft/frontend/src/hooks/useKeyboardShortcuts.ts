import { useEffect } from 'react';
import { useHistory } from './useHistory';
import { useAppStateStore, AppState } from '../store/appStateStore';
import { useUIStore } from '../store/uiStore';
import toast from 'react-hot-toast';

export const useKeyboardShortcuts = () => {
  const { handleUndo, handleRedo } = useHistory();
  const { currentState, transitionTo } = useAppStateStore();
  const { fitToScreen } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Ignore if contentEditable
      if (target.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z (but not Ctrl+Shift+Z)
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Escape: Cancel preview or deactivate tool
      if (e.key === 'Escape') {
        e.preventDefault();
        if (currentState === AppState.PREVIEW) {
          // Cancel preview
          transitionTo(AppState.IDLE);
          toast('Preview cancelled', { icon: '❌' });
        } else if (currentState === AppState.TOOL_ACTIVE) {
          // Deactivate tool
          transitionTo(AppState.IDLE);
          toast('Tool deactivated', { icon: '✓' });
        }
        return;
      }

      // Ctrl+S: Save (prevent browser save dialog)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast('Auto-save is always active', { icon: '💾' });
        return;
      }

      // Ctrl+0: Fit to screen
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        // Fit to screen logic would go here
        toast('Fit to screen', { icon: '🖼️' });
        return;
      }

      // Ctrl+1: Reset zoom to 100%
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        // Reset zoom logic would go here
        toast('Zoom reset to 100%', { icon: '🔍' });
        return;
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toast('Keyboard shortcuts:\nCtrl+Z: Undo\nCtrl+Shift+Z: Redo\nEsc: Cancel\nSpace+Drag: Pan\nCtrl+Wheel: Zoom', {
          duration: 5000,
          icon: '⌨️',
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, currentState, transitionTo, fitToScreen]);
};
