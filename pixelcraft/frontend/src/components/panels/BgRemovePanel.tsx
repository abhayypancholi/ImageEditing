import React, { useState } from 'react';
import { useImageApi } from '../../hooks/useImageApi';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/SectionLabel';
import { Dropdown } from '../ui/Dropdown';
import { Eraser } from 'lucide-react';

export const BgRemovePanel: React.FC = () => {
  const [mode, setMode] = useState('auto');
  const [replaceMode, setReplaceMode] = useState('transparent');
  const [replaceColor, setReplaceColor] = useState('#FFFFFF');

  const { applyOperation, isLoading } = useImageApi();

  const handleRemove = () => {
    applyOperation('/api/background/remove', {
      mode,
      seed_color: null,
      selection_bbox: null,
      replace_mode: replaceMode,
      replace_color: replaceMode === 'color' 
        ? [
            parseInt(replaceColor.slice(1, 3), 16),
            parseInt(replaceColor.slice(3, 5), 16),
            parseInt(replaceColor.slice(5, 7), 16),
          ]
        : null,
    });
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Background Removal</SectionLabel>

      <div className="space-y-2">
        <label className="text-xs text-[var(--text-2)]">Removal Mode</label>
        <Dropdown
          value={mode}
          onChange={setMode}
          options={[
            { value: 'auto', label: 'Auto Remove (AI)' },
            { value: 'color_select', label: 'Color-Select Remove' },
            { value: 'object_select', label: 'Object-Select Remove' },
          ]}
        />
        <p className="text-xs text-[var(--text-3)]">
          {mode === 'auto' && 'AI-powered background removal (best quality)'}
          {mode === 'color_select' && 'Remove background by color similarity'}
          {mode === 'object_select' && 'Keep only selected region'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-[var(--text-2)]">Replace With</label>
        <Dropdown
          value={replaceMode}
          onChange={setReplaceMode}
          options={[
            { value: 'transparent', label: 'Keep Transparent' },
            { value: 'color', label: 'Solid Color' },
            { value: 'blur', label: 'Blurred Background' },
          ]}
        />
      </div>

      {replaceMode === 'color' && (
        <div className="space-y-2">
          <label className="text-xs text-[var(--text-2)]">Background Color</label>
          <input
            type="color"
            value={replaceColor}
            onChange={(e) => setReplaceColor(e.target.value)}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
      )}

      <Button
        variant="primary"
        fullWidth
        onClick={handleRemove}
        disabled={isLoading}
      >
        <Eraser size={16} />
        Remove Background
      </Button>

      <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
        <p className="text-xs text-[var(--text-2)]">
          <strong>Tip:</strong> Auto Remove uses AI for best results. Color-Select works well for solid backgrounds.
        </p>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <SectionLabel>Preview</SectionLabel>
        <div className="aspect-video bg-[var(--bg-panel)] rounded border border-[var(--border)] flex items-center justify-center">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px',
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-[var(--text-3)] text-sm">
              Checkerboard shows transparent areas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
