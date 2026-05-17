import React, { useState } from 'react';
import { useImageApi } from '../../hooks/useImageApi';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Move } from 'lucide-react';

export const ExtendPanel: React.FC = () => {
  const [extendLeft, setExtendLeft] = useState(0);
  const [extendRight, setExtendRight] = useState(0);
  const [extendTop, setExtendTop] = useState(0);
  const [extendBottom, setExtendBottom] = useState(0);

  const { applyOperation, isLoading } = useImageApi();

  const handleExtend = () => {
    if (extendLeft === 0 && extendRight === 0 && extendTop === 0 && extendBottom === 0) {
      return;
    }

    applyOperation('/api/extend/', {
      extend_left: extendLeft,
      extend_right: extendRight,
      extend_top: extendTop,
      extend_bottom: extendBottom,
    });
  };

  const totalExtension = extendLeft + extendRight + extendTop + extendBottom;

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Image Extension</SectionLabel>

      <p className="text-xs text-[var(--text-3)]">
        Extend the canvas in any direction using pattern recognition and edge extrapolation
      </p>

      <div className="space-y-3">
        <Slider
          label={`Extend Left: ${extendLeft}px`}
          value={extendLeft}
          onChange={setExtendLeft}
          min={0}
          max={500}
          step={10}
        />

        <Slider
          label={`Extend Right: ${extendRight}px`}
          value={extendRight}
          onChange={setExtendRight}
          min={0}
          max={500}
          step={10}
        />

        <Slider
          label={`Extend Top: ${extendTop}px`}
          value={extendTop}
          onChange={setExtendTop}
          min={0}
          max={500}
          step={10}
        />

        <Slider
          label={`Extend Bottom: ${extendBottom}px`}
          value={extendBottom}
          onChange={setExtendBottom}
          min={0}
          max={500}
          step={10}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setExtendLeft(100);
            setExtendRight(100);
            setExtendTop(100);
            setExtendBottom(100);
          }}
        >
          All 100px
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setExtendLeft(0);
            setExtendRight(0);
            setExtendTop(0);
            setExtendBottom(0);
          }}
        >
          Reset
        </Button>
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={handleExtend}
        disabled={isLoading || totalExtension === 0}
      >
        <Move size={16} />
        Apply Extension
      </Button>

      {totalExtension > 0 && (
        <div className="p-2 rounded bg-[var(--bg-hover)] border border-[var(--border)] text-xs text-[var(--text-2)]">
          Total extension: {totalExtension}px
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-4">
        <SectionLabel>Extension Preview</SectionLabel>
        <div className="relative aspect-video bg-[var(--bg-panel)] rounded border border-[var(--border)] overflow-hidden">
          {/* Center box representing original image */}
          <div
            className="absolute bg-[var(--accent)]/20 border-2 border-[var(--accent)]"
            style={{
              left: `${(extendLeft / (extendLeft + 200 + extendRight)) * 100}%`,
              right: `${(extendRight / (extendLeft + 200 + extendRight)) * 100}%`,
              top: `${(extendTop / (extendTop + 150 + extendBottom)) * 100}%`,
              bottom: `${(extendBottom / (extendTop + 150 + extendBottom)) * 100}%`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-2)]">
              Original
            </div>
          </div>

          {/* Extension indicators */}
          {extendLeft > 0 && (
            <div className="absolute left-0 top-0 bottom-0 bg-[var(--text-3)]/10 flex items-center justify-center text-xs text-[var(--text-3)]"
              style={{ width: `${(extendLeft / (extendLeft + 200 + extendRight)) * 100}%` }}>
              ←
            </div>
          )}
          {extendRight > 0 && (
            <div className="absolute right-0 top-0 bottom-0 bg-[var(--text-3)]/10 flex items-center justify-center text-xs text-[var(--text-3)]"
              style={{ width: `${(extendRight / (extendLeft + 200 + extendRight)) * 100}%` }}>
              →
            </div>
          )}
          {extendTop > 0 && (
            <div className="absolute top-0 left-0 right-0 bg-[var(--text-3)]/10 flex items-center justify-center text-xs text-[var(--text-3)]"
              style={{ height: `${(extendTop / (extendTop + 150 + extendBottom)) * 100}%` }}>
              ↑
            </div>
          )}
          {extendBottom > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-[var(--text-3)]/10 flex items-center justify-center text-xs text-[var(--text-3)]"
              style={{ height: `${(extendBottom / (extendTop + 150 + extendBottom)) * 100}%` }}>
              ↓
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
        <p className="text-xs text-[var(--text-2)]">
          <strong>Algorithm:</strong> Pattern Recognition with Edge Extrapolation
        </p>
        <p className="text-xs text-[var(--text-3)] mt-1">
          Analyzes edge pixels and extends them naturally with smooth blending
        </p>
      </div>
    </div>
  );
};
