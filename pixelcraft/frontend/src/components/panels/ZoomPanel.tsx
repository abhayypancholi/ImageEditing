import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Dropdown } from '../ui/Dropdown';
import { useImageStore } from '../../store/imageStore';
import { enhanceResolution } from '../../api/endpoints/tools';
import toast from 'react-hot-toast';

type TabType = 'magnify' | 'enhance';

export const ZoomPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('enhance');
  const { sessionId, metadata, setWorkingImage, setProcessing } = useImageStore();

  // Enhance state
  const [scale, setScale] = useState(2);
  const [algorithm, setAlgorithm] = useState('lanczos');

  const estimatedSize = metadata
    ? `${metadata.width * scale} × ${metadata.height * scale}`
    : 'N/A';

  const handleEnhance = async () => {
    if (!sessionId) return;

    if (metadata && (metadata.width * scale > 8000 || metadata.height * scale > 8000)) {
      toast.error('Output size would exceed 8000px limit');
      return;
    }

    try {
      setProcessing(true, `Enhancing resolution ${scale}×...`);

      const response = await enhanceResolution({
        session_id: sessionId,
        scale,
        algorithm,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        toast.success(`Resolution enhanced ${scale}×`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enhancement failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('magnify')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'magnify'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          Magnify
        </button>
        <button
          onClick={() => setActiveTab('enhance')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'enhance'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          Enhance
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'magnify' && (
          <>
            <div>
              <SectionLabel>Magnify Region</SectionLabel>
              <p className="text-xs text-[var(--text-3)] mb-4">
                Draw a rectangle on canvas to magnify a specific region
              </p>
            </div>

            <div>
              <Slider
                label="Magnification"
                value={2}
                onChange={() => {}}
                min={1}
                max={8}
                step={0.5}
              />
            </div>

            <Button variant="primary" className="w-full">
              Apply Zoom-in Crop
            </Button>
          </>
        )}

        {activeTab === 'enhance' && (
          <>
            <div>
              <SectionLabel>Resolution Enhancement</SectionLabel>
              <p className="text-xs text-[var(--text-3)] mb-4">
                Increase image resolution using advanced algorithms
              </p>
            </div>

            <div>
              <SectionLabel>Scale Factor</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`px-3 py-2 text-xs rounded transition-colors ${
                      scale === s
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Algorithm</SectionLabel>
              <Dropdown
                options={[
                  { label: 'Lanczos (Fast)', value: 'lanczos' },
                  { label: 'Bicubic', value: 'bicubic' },
                  { label: 'EDSR (Best)', value: 'edsr' },
                ]}
                value={algorithm}
                onChange={setAlgorithm}
              />
            </div>

            <div className="p-3 bg-[var(--bg-card)] rounded">
              <div className="text-xs text-[var(--text-2)] mb-1">Estimated Output Size</div>
              <div className="text-sm font-mono text-[var(--text-1)]">{estimatedSize}</div>
              {metadata && metadata.width * scale > 8000 && (
                <div className="text-xs text-[var(--accent-red)] mt-2">
                  ⚠ Exceeds 8000px limit
                </div>
              )}
            </div>

            <div className="text-xs text-[var(--text-3)]">
              Processing time: ~{scale === 1 ? '1' : scale === 2 ? '3' : '10'}s
            </div>

            <Button variant="primary" onClick={handleEnhance} className="w-full">
              Enhance Resolution
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
