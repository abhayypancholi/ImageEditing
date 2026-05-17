import React from 'react';
import { useImageStore } from '../../store/imageStore';
import { useUIStore } from '../../store/uiStore';
import { formatFileSize } from '../../utils/fileUtils';

export const BottomBar: React.FC = () => {
  const { metadata } = useImageStore();
  const { cursorX, cursorY, zoom } = useUIStore();

  return (
    <div
      className="flex items-center justify-between px-4 bg-[var(--bg-panel)] border-t border-[var(--border)]"
      style={{ height: 'var(--bottombar-h)' }}
    >
      {/* Left: Image info */}
      <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-2)]">
        {metadata ? (
          <>
            <span>
              W: {metadata.width}px
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              H: {metadata.height}px
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              Format: {metadata.format}
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              Size: {formatFileSize(metadata.fileSizeBytes)}
            </span>
          </>
        ) : (
          <span>No image loaded</span>
        )}
      </div>

      {/* Right: Cursor position and zoom */}
      <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-2)]">
        {metadata && (
          <>
            <span>
              X: {cursorX}
            </span>
            <span className="text-[var(--border)]">|</span>
            <span>
              Y: {cursorY}
            </span>
            <span className="text-[var(--border)]">|</span>
          </>
        )}
        <span>
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
};
