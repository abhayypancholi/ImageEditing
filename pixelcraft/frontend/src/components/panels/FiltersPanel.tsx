import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Spinner } from '../ui/Spinner';
import { useImageStore } from '../../store/imageStore';
import { previewAllFilters, applyFilter } from '../../api/endpoints/tools';
import toast from 'react-hot-toast';

interface FilterInfo {
  name: string;
  displayName: string;
}

const FILTERS: FilterInfo[] = [
  { name: 'vivid', displayName: 'Vivid' },
  { name: 'fair', displayName: 'Fair' },
  { name: 'soft_gray', displayName: 'Soft Gray' },
  { name: 'background_blur', displayName: 'Background Blur' },
  { name: 'hdr', displayName: 'HDR' },
  { name: 'vintage', displayName: 'Vintage' },
  { name: 'portrait', displayName: 'Portrait' },
  { name: 'sepia', displayName: 'Sepia' },
  { name: 'cinematic', displayName: 'Cinematic' },
  { name: 'bokeh', displayName: 'Bokeh' },
  { name: 'ai_enhance', displayName: 'AI Enhance' },
  { name: 'smooth_skin', displayName: 'Smooth Skin' },
];

export const FiltersPanel: React.FC = () => {
  const { sessionId, setWorkingImage, setProcessing } = useImageStore();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(1.0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && Object.keys(previews).length === 0) {
      loadPreviews();
    }
  }, [sessionId]);

  const loadPreviews = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await previewAllFilters({ session_id: sessionId });

      if (response.success && response.data) {
        setPreviews(response.data.previews);
      }
    } catch (error) {
      toast.error('Failed to load filter previews');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    if (!sessionId || !selectedFilter) return;

    try {
      setProcessing(true, `Applying ${selectedFilter} filter...`);

      const response = await applyFilter({
        session_id: sessionId,
        filter_name: selectedFilter,
        intensity,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        toast.success('Filter applied');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Filter failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <SectionLabel>Select Filter</SectionLabel>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.name}
                  onClick={() => setSelectedFilter(filter.name)}
                  className={`flex flex-col items-center p-2 rounded transition-all ${
                    selectedFilter === filter.name
                      ? 'bg-[var(--accent-glow)] border-2 border-[var(--accent)]'
                      : 'bg-[var(--bg-card)] border-2 border-transparent hover:border-[var(--border)]'
                  }`}
                >
                  {previews[filter.name] ? (
                    <img
                      src={`data:image/png;base64,${previews[filter.name]}`}
                      alt={filter.displayName}
                      className="w-full h-20 object-cover rounded mb-1"
                    />
                  ) : (
                    <div className="w-full h-20 bg-[var(--bg-hover)] rounded mb-1 flex items-center justify-center">
                      <Spinner size="sm" />
                    </div>
                  )}
                  <span className="text-xs text-[var(--text-1)] text-center">
                    {filter.displayName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedFilter && (
          <div className="border-t border-[var(--border)] pt-4">
            <SectionLabel>Intensity</SectionLabel>
            <Slider
              value={intensity * 100}
              onChange={(val) => setIntensity(val / 100)}
              min={0}
              max={100}
              step={1}
              showValue={false}
            />
            <div className="flex justify-between text-xs text-[var(--text-2)] mt-1">
              <span>0%</span>
              <span>{Math.round(intensity * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border)]">
        <Button
          variant="primary"
          onClick={handleApplyFilter}
          disabled={!selectedFilter}
          className="w-full"
        >
          Apply Selected Filter
        </Button>
      </div>
    </div>
  );
};
