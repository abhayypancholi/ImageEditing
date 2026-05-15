import React, { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { apiClient } from '../../api/client';
import { useImageApi } from '../../hooks/useImageApi';
import toast from 'react-hot-toast';
import { Compass } from 'lucide-react';

export const StraightenPanel: React.FC = () => {
  const [manualRotation, setManualRotation] = useState(0);
  const [detectedAngle, setDetectedAngle] = useState<number | null>(null);
  const [useManual, setUseManual] = useState(false);

  const { sessionId } = useImageStore();
  const { refreshImage, isLoading } = useImageApi();

  const handleAutoStraighten = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    try {
      const response = await apiClient.post('/api/straighten/', {
        session_id: sessionId,
        manual_override: useManual ? manualRotation : null,
      });

      if (response.data.success) {
        await refreshImage();
        setDetectedAngle(response.data.data.detected_angle);
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error('Auto-straighten failed');
      console.error(error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Auto-Straighten</SectionLabel>

      <p className="text-xs text-[var(--text-3)]">
        Automatically detect and correct image skew using Hough line detection
      </p>

      <Button
        variant="primary"
        fullWidth
        onClick={handleAutoStraighten}
        disabled={isLoading}
      >
        <Compass size={16} />
        Auto-Analyze & Straighten
      </Button>

      {detectedAngle !== null && (
        <div className="p-3 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30">
          <p className="text-sm font-semibold text-[var(--text-1)]">
            Detected Skew: {detectedAngle.toFixed(2)}°
          </p>
          <p className="text-xs text-[var(--text-3)] mt-1">
            Image has been automatically corrected
          </p>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-4">
        <SectionLabel>Manual Override</SectionLabel>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="manual"
            checked={useManual}
            onChange={(e) => setUseManual(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="manual" className="text-sm text-[var(--text-2)]">
            Use manual rotation adjustment
          </label>
        </div>

        {useManual && (
          <>
            <Slider
              label={`Rotation: ${manualRotation.toFixed(1)}°`}
              value={manualRotation}
              onChange={setManualRotation}
              min={-15}
              max={15}
              step={0.1}
            />

            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setManualRotation(-5)}
              >
                -5°
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setManualRotation(0)}
              >
                0°
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setManualRotation(5)}
              >
                +5°
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <SectionLabel>Preview</SectionLabel>
        <div className="relative aspect-video bg-[var(--bg-panel)] rounded border border-[var(--border)] overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Rule of thirds grid */}
              <line
                x1="33.33%"
                y1="0"
                x2="33.33%"
                y2="100%"
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.3"
              />
              <line
                x1="66.66%"
                y1="0"
                x2="66.66%"
                y2="100%"
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.3"
              />
              <line
                x1="0"
                y1="33.33%"
                x2="100%"
                y2="33.33%"
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.3"
              />
              <line
                x1="0"
                y1="66.66%"
                x2="100%"
                y2="66.66%"
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.3"
              />
              {/* Horizon line */}
              <line
                x1="0"
                y1="50%"
                x2="100%"
                y2="50%"
                stroke="var(--accent)"
                strokeWidth="2"
                opacity="0.5"
              />
            </svg>
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-3)]">
            Rule of thirds grid overlay
          </div>
        </div>
      </div>

      <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
        <p className="text-xs text-[var(--text-2)]">
          <strong>How it works:</strong>
        </p>
        <ul className="text-xs text-[var(--text-3)] mt-2 space-y-1 list-disc list-inside">
          <li>Detects dominant lines using Hough Transform</li>
          <li>Calculates horizon angle from horizontal lines</li>
          <li>Rotates image to correct skew</li>
          <li>Auto-crops to remove border artifacts</li>
        </ul>
      </div>
    </div>
  );
};
