import React, { useState } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { Hash, MousePointer, Layers } from 'lucide-react';

interface CountResult {
  count: number;
  color: [number, number, number];
  position: { x: number; y: number };
}

interface ObjectInfo {
  count: number;
  color: [number, number, number];
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
}

export const CountPanel: React.FC = () => {
  const [tolerance, setTolerance] = useState(30);
  const [countResult, setCountResult] = useState<CountResult | null>(null);
  const [allObjects, setAllObjects] = useState<ObjectInfo[]>([]);
  const [isCountingMode, setIsCountingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { sessionId } = useImageStore();

  const handleCountClick = (x: number, y: number) => {
    if (!sessionId || !isCountingMode) return;

    setIsLoading(true);
    apiClient
      .post('/api/objects/count', {
        session_id: sessionId,
        x: Math.round(x),
        y: Math.round(y),
        tolerance,
      })
      .then((response) => {
        const data = response.data.data;
        setCountResult(data);
        
        // FIX C1: Animate the count number
        const countEl = document.getElementById('count-big-number');
        if (countEl) {
          countEl.textContent = data.count.toString();
          countEl.animate(
            [
              { transform: 'scale(0.8)', opacity: 0 },
              { transform: 'scale(1.0)', opacity: 1 }
            ],
            { duration: 300, easing: 'ease-out' }
          );
        }
        
        toast.success(`Counted ${data.count} pixels`);
      })
      .catch((error) => {
        toast.error('Failed to count objects');
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCountAll = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/objects/count-all', null, {
        params: {
          session_id: sessionId,
          tolerance,
        },
      });

      setAllObjects(response.data.data.objects);
      toast.success(`Found ${response.data.data.total_objects} objects`);
    } catch (error) {
      toast.error('Failed to count all objects');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const rgbToHex = (rgb: [number, number, number]) => {
    return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
  };

  // Set up canvas click listener
  React.useEffect(() => {
    if (!isCountingMode) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Account for canvas scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      handleCountClick(x * scaleX, y * scaleY);
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.cursor = 'crosshair';
      canvas.addEventListener('click', handleCanvasClick);
    }

    return () => {
      if (canvas) {
        canvas.style.cursor = 'default';
        canvas.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [isCountingMode, tolerance, sessionId]);

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Object Counting</SectionLabel>

      <div className="space-y-2">
        <Slider
          label="Color Tolerance"
          value={tolerance}
          onChange={setTolerance}
          min={0}
          max={100}
          step={1}
        />
        <p className="text-xs text-[var(--text-3)]">
          Higher tolerance groups more similar colors together
        </p>
      </div>

      <div className="space-y-2">
        <Button
          variant={isCountingMode ? 'primary' : 'secondary'}
          fullWidth
          onClick={() => {
            setIsCountingMode(!isCountingMode);
            if (!isCountingMode) {
              toast.success('Click on the image to count connected pixels');
            } else {
              toast.success('Counting mode disabled');
            }
          }}
        >
          <MousePointer size={16} />
          {isCountingMode ? 'Counting Mode Active' : 'Enable Click to Count'}
        </Button>

        <Button
          variant="secondary"
          fullWidth
          onClick={handleCountAll}
          disabled={isLoading}
        >
          <Layers size={16} />
          Count All Objects
        </Button>
      </div>

      {countResult && (
        <>
          <SectionLabel>Click Result</SectionLabel>
          
          {/* FIX C1: Big number display */}
          <div className="text-center py-4">
            <div
              id="count-big-number"
              className="text-6xl font-bold text-[var(--accent)] font-mono leading-none"
            >
              {countResult.count.toLocaleString()}
            </div>
            <div className="text-sm text-[var(--text-2)] mt-2">
              objects detected
            </div>
          </div>
          
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Color:</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-[var(--border)]"
                  style={{ backgroundColor: rgbToHex(countResult.color) }}
                />
                <span className="text-xs font-mono text-[var(--text-3)]">
                  {rgbToHex(countResult.color)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Position:</span>
              <span className="text-xs font-mono text-[var(--text-3)]">
                ({countResult.position.x}, {countResult.position.y})
              </span>
            </div>
          </div>
        </>
      )}

      {allObjects.length > 0 && (
        <>
          <SectionLabel>All Objects ({allObjects.length})</SectionLabel>
          
          {/* FIX C1: Objects table with proper formatting */}
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-2 text-[var(--text-2)]">#</th>
                  <th className="text-right py-2 px-2 text-[var(--text-2)]">Size px²</th>
                  <th className="text-right py-2 px-2 text-[var(--text-2)]">X</th>
                  <th className="text-right py-2 px-2 text-[var(--text-2)]">Y</th>
                </tr>
              </thead>
              <tbody>
                {allObjects.map((obj, index) => (
                  <tr key={index} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
                    <td className="py-2 px-2 text-[var(--text-1)]">{index + 1}</td>
                    <td className="text-right py-2 px-2 text-[var(--text-2)]">
                      {obj.count.toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-2 text-[var(--text-2)]">
                      {obj.centroid.x}
                    </td>
                    <td className="text-right py-2 px-2 text-[var(--text-2)]">
                      {obj.centroid.y}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!countResult && allObjects.length === 0 && (
        <div className="text-center py-8 text-[var(--text-3)]">
          <Hash size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            Click "Enable Click to Count" and click on the image to count connected pixels
          </p>
          <p className="text-xs mt-2">
            Or use "Count All Objects" to find all distinct objects
          </p>
        </div>
      )}
    </div>
  );
};