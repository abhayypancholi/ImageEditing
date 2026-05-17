import React, { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Dropdown } from '../ui/Dropdown';
import { apiClient } from '../../api/client';
import { useImageApi } from '../../hooks/useImageApi';
import toast from 'react-hot-toast';
import { Scissors } from 'lucide-react';

export const ObjRemovePanel: React.FC = () => {
  const [brushSize, setBrushSize] = useState(20);
  const [fillMode, setFillMode] = useState('inpaint');
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPoints, setMaskPoints] = useState<number[]>([]);

  const { sessionId } = useImageStore();
  const { refreshImage, isLoading } = useImageApi();

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setMaskPoints([]);
    toast.success('Draw on the image to select object to remove');
  };

  const handleRemove = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    if (maskPoints.length < 4) {
      toast.error('Please draw a selection first');
      return;
    }

    try {
      const response = await apiClient.post('/api/objects/remove', {
        session_id: sessionId,
        mask_points: maskPoints,
        brush_size: brushSize,
        fill_mode: fillMode,
        fill_color: fillMode === 'solid'
          ? [
              parseInt(fillColor.slice(1, 3), 16),
              parseInt(fillColor.slice(3, 5), 16),
              parseInt(fillColor.slice(5, 7), 16),
            ]
          : [255, 255, 255],
      });

      if (response.data.success) {
        await refreshImage();
        toast.success(response.data.message);
        setMaskPoints([]);
        setIsDrawing(false);
      }
    } catch (error) {
      toast.error('Object removal failed');
      console.error(error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Object Removal</SectionLabel>

      <div className="space-y-2">
        <p className="text-sm text-[var(--text-2)]">
          Step 1: Draw over the object you want to remove
        </p>
        <Button
          variant={isDrawing ? 'primary' : 'secondary'}
          fullWidth
          onClick={handleStartDrawing}
        >
          <Scissors size={16} />
          {isDrawing ? 'Drawing Mode Active' : 'Start Drawing Selection'}
        </Button>
      </div>

      <div className="space-y-2">
        <Slider
          label={`Brush Size: ${brushSize}px`}
          value={brushSize}
          onChange={setBrushSize}
          min={5}
          max={50}
          step={1}
        />
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="text-sm text-[var(--text-2)] mb-2">
          Step 2: Choose fill method
        </p>

        <div className="space-y-2">
          <Dropdown
            value={fillMode}
            onChange={setFillMode}
            options={[
              { value: 'inpaint', label: 'Content-Aware Fill (Best)' },
              { value: 'blur', label: 'Blur Fill (Fast)' },
              { value: 'solid', label: 'Solid Color Fill' },
            ]}
          />

          {fillMode === 'solid' && (
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-2)]">Fill Color</label>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={handleRemove}
        disabled={isLoading || maskPoints.length < 4}
      >
        <Scissors size={16} />
        Remove & Fill
      </Button>

      {maskPoints.length > 0 && (
        <div className="p-2 rounded bg-[var(--bg-hover)] border border-[var(--border)] text-xs text-[var(--text-2)]">
          Selection: {Math.floor(maskPoints.length / 2)} points drawn
        </div>
      )}

      <div className="p-3 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30">
        <p className="text-xs text-[var(--text-2)]">
          <strong>How it works:</strong>
        </p>
        <ul className="text-xs text-[var(--text-3)] mt-2 space-y-1 list-disc list-inside">
          <li><strong>Content-Aware:</strong> AI fills using surrounding pixels</li>
          <li><strong>Blur Fill:</strong> Fast blur-based filling</li>
          <li><strong>Solid Color:</strong> Fill with chosen color</li>
        </ul>
      </div>
    </div>
  );
};
