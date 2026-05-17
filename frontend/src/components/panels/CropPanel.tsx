import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/SectionLabel';
import { useImageStore } from '../../store/imageStore';
import { cropImage, rotateImage, perspectiveTransform } from '../../api/endpoints/tools';
import toast from 'react-hot-toast';

type TabType = 'crop' | 'rotate' | 'perspective';
type AspectRatio = 'free' | '1:1' | '4:3' | '16:9' | '9:16';

export const CropPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('crop');
  const { sessionId, setWorkingImage, setProcessing } = useImageStore();

  // Crop state
  const [cropWidth, setCropWidth] = useState(800);
  const [cropHeight, setCropHeight] = useState(600);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');

  // Rotate state
  const [rotationAngle, setRotationAngle] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const handleApplyCrop = async () => {
    if (!sessionId) return;

    try {
      setProcessing(true, 'Applying crop...');

      const response = await cropImage({
        session_id: sessionId,
        x: 0,
        y: 0,
        width: cropWidth,
        height: cropHeight,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        toast.success('Crop applied');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Crop failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyRotate = async () => {
    if (!sessionId) return;

    try {
      setProcessing(true, 'Applying rotation...');

      const response = await rotateImage({
        session_id: sessionId,
        angle: rotationAngle,
        flip_h: flipH,
        flip_v: flipV,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        toast.success('Rotation applied');
        setRotationAngle(0);
        setFlipH(false);
        setFlipV(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rotation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickRotate = (angle: number) => {
    setRotationAngle((prev) => (prev + angle) % 360);
  };

  const handleApplyPerspective = async () => {
    if (!sessionId) return;

    try {
      setProcessing(true, 'Applying perspective...');

      // Default perspective points (identity transform)
      const srcPoints = [[0, 0], [800, 0], [800, 600], [0, 600]];
      const dstPoints = [[0, 0], [800, 0], [800, 600], [0, 600]];

      const response = await perspectiveTransform({
        session_id: sessionId,
        src_points: srcPoints,
        dst_points: dstPoints,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        toast.success('Perspective applied');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Perspective failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('crop')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'crop'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          Crop
        </button>
        <button
          onClick={() => setActiveTab('rotate')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'rotate'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          Rotate
        </button>
        <button
          onClick={() => setActiveTab('perspective')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'perspective'
              ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
          }`}
        >
          Perspective
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'crop' && (
          <>
            <div>
              <SectionLabel>Dimensions</SectionLabel>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-[var(--text-2)]">Width (px)</label>
                  <input
                    type="number"
                    value={cropWidth}
                    onChange={(e) => setCropWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 mt-1 bg-[var(--bg-card)] text-[var(--text-1)] rounded border border-[var(--border)] focus:border-[var(--accent)] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-2)]">Height (px)</label>
                  <input
                    type="number"
                    value={cropHeight}
                    onChange={(e) => setCropHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 mt-1 bg-[var(--bg-card)] text-[var(--text-1)] rounded border border-[var(--border)] focus:border-[var(--accent)] outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Aspect Ratio</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {(['free', '1:1', '4:3', '16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-2 text-xs rounded transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleApplyCrop} className="flex-1">
                Apply Crop
              </Button>
              <Button variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </>
        )}

        {activeTab === 'rotate' && (
          <>
            <div>
              <SectionLabel>Rotation</SectionLabel>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-2)]">Angle</span>
                  <span className="text-xs font-mono text-[var(--text-1)]">{rotationAngle}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <SectionLabel>Quick Rotate</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => handleQuickRotate(-90)}>
                  ↺ 90°
                </Button>
                <Button variant="secondary" onClick={() => handleQuickRotate(90)}>
                  ↻ 90°
                </Button>
              </div>
            </div>

            <div>
              <SectionLabel>Flip</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={flipH ? 'primary' : 'secondary'}
                  onClick={() => setFlipH(!flipH)}
                >
                  ↔ Flip H
                </Button>
                <Button
                  variant={flipV ? 'primary' : 'secondary'}
                  onClick={() => setFlipV(!flipV)}
                >
                  ↕ Flip V
                </Button>
              </div>
            </div>

            <Button variant="primary" onClick={handleApplyRotate} className="w-full">
              Apply
            </Button>
          </>
        )}

        {activeTab === 'perspective' && (
          <>
            <div>
              <SectionLabel>Perspective Transform</SectionLabel>
              <p className="text-xs text-[var(--text-3)] mb-4">
                Drag corner handles on canvas to adjust perspective
              </p>
            </div>

            <div>
              <SectionLabel>Presets</SectionLabel>
              <div className="space-y-2">
                <Button variant="secondary" className="w-full">
                  Correct Keystone ↕
                </Button>
                <Button variant="secondary" className="w-full">
                  Correct Keystone ↔
                </Button>
              </div>
            </div>

            <Button variant="primary" onClick={handleApplyPerspective} className="w-full">
              Apply Perspective
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
