import React from 'react';
import { useImageStore } from '../../store/imageStore';
import { SectionLabel } from '../ui/SectionLabel';
import { Badge } from '../ui/Badge';
import { formatFileSize } from '../../utils/fileUtils';

export const DefaultPanel: React.FC = () => {
  const { metadata } = useImageStore();

  if (!metadata) {
    return (
      <div className="p-4 text-center text-[var(--text-3)]">
        <p>No image loaded</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <SectionLabel>Image Information</SectionLabel>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Filename:</span>
            <span className="text-[var(--text-1)] font-medium truncate ml-2">
              {metadata.fileName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Dimensions:</span>
            <span className="text-[var(--text-1)] font-mono">
              {metadata.width} × {metadata.height}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Format:</span>
            <Badge variant="info">{metadata.format}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Color Mode:</span>
            <span className="text-[var(--text-1)]">{metadata.colorMode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">File Size:</span>
            <span className="text-[var(--text-1)] font-mono">
              {formatFileSize(metadata.fileSizeBytes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-2)]">Transparency:</span>
            <Badge variant={metadata.hasAlpha ? 'success' : 'default'}>
              {metadata.hasAlpha ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <SectionLabel>Quick Actions</SectionLabel>
        <p className="text-xs text-[var(--text-3)]">
          Select a tool from the left sidebar to begin editing
        </p>
      </div>
    </div>
  );
};
