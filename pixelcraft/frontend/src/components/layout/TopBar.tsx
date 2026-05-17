import React, { useState } from 'react';
import {
  Undo,
  Redo,
  Clock,
  ZoomOut,
  ZoomIn,
  Save,
  FolderOpen,
} from 'lucide-react';
import { useImageStore } from '../../store/imageStore';
import { useUIStore } from '../../store/uiStore';
import { useHistory } from '../../hooks/useHistory';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ExportModal } from '../modals/ExportModal';
import { SessionManager } from '../modals/SessionManager';
import toast from 'react-hot-toast';

export const TopBar: React.FC = () => {
  const { metadata } = useImageStore();
  const { zoom, setZoom, fitToScreen } = useUIStore();
  const { handleUndo, handleRedo, canUndo, canRedo } = useHistory();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);

  const handleZoomIn = () => {
    setZoom(zoom * 1.2);
  };

  const handleZoomOut = () => {
    setZoom(zoom / 1.2);
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const handleFitToScreen = () => {
    if (metadata) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        fitToScreen(metadata.width, metadata.height, canvas.width, canvas.height);
      }
    }
  };

  const handleSave = () => {
    toast.success('Saved ✓');
  };

  return (
    <div
      className="flex items-center justify-between px-4 bg-[var(--bg-panel)] border-b border-[var(--border)]"
      style={{ height: 'var(--topbar-h)' }}
    >
      {/* Left: Logo and app name */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--accent)] to-[var(--accent-pink)]" />
        <span className="text-sm font-semibold text-[var(--text-1)]">PixelCraft</span>
      </div>

      {/* Center: History controls and filename */}
      <div className="flex items-center gap-2">
        <Tooltip content="Undo (Ctrl+Z)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            className="gap-1"
          >
            <Undo size={16} />
          </Button>
        </Tooltip>

        <Tooltip content="Redo (Ctrl+Shift+Z)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            className="gap-1"
          >
            <Redo size={16} />
          </Button>
        </Tooltip>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        <Tooltip content="History">
          <Button variant="ghost" size="sm" className="gap-1">
            <Clock size={16} />
          </Button>
        </Tooltip>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        {metadata && (
          <span className="text-xs text-[var(--text-2)] px-2 max-w-xs truncate">
            {metadata.fileName}
          </span>
        )}
      </div>

      {/* Right: Zoom controls, save, export */}
      <div className="flex items-center gap-2">
        <Tooltip content="Session Manager">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSessionManager(true)}
            className="gap-1"
          >
            <FolderOpen size={16} />
          </Button>
        </Tooltip>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        <Tooltip content="Zoom Out">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut size={16} />
          </Button>
        </Tooltip>

        <Tooltip content="Reset Zoom (Ctrl+1) / Fit to Screen (Ctrl+0)">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomReset}
            onDoubleClick={handleFitToScreen}
            className="min-w-[60px] font-mono"
          >
            {Math.round(zoom * 100)}%
          </Button>
        </Tooltip>

        <Tooltip content="Zoom In">
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn size={16} />
          </Button>
        </Tooltip>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        <Tooltip content="Save (Ctrl+S)">
          <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1">
            <Save size={16} />
          </Button>
        </Tooltip>

        <Tooltip content="Export (Ctrl+E)">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="gap-1"
          >
            Export
          </Button>
        </Tooltip>
      </div>

      {/* Modals */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
      <SessionManager
        isOpen={showSessionManager}
        onClose={() => setShowSessionManager(false)}
      />
    </div>
  );
};
