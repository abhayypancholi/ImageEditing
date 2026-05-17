import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { useImageStore } from '../../store/imageStore';
import { applyEnhancements } from '../../api/endpoints/tools';
import toast from 'react-hot-toast';

export const EnhancePanel: React.FC = () => {
  const { sessionId, setWorkingImage, setProcessing } = useImageStore();

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [noiseRemoval, setNoiseRemoval] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hueShift, setHueShift] = useState(0);
  const [edgeMode, setEdgeMode] = useState<'off' | 'subtle' | 'strong'>('off');
  const [regionStrength, setRegionStrength] = useState(0);
  const [livePreview, setLivePreview] = useState(false);

  // Debounced preview
  useEffect(() => {
    if (!livePreview) return;

    const timer = setTimeout(() => {
      handleApply(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [brightness, contrast, sharpness, noiseRemoval, saturation, hueShift, edgeMode, regionStrength, livePreview]);

  const handleApply = async (isPreview = false) => {
    if (!sessionId) return;

    try {
      if (!isPreview) {
        setProcessing(true, 'Applying enhancements...');
      }

      const response = await applyEnhancements({
        session_id: sessionId,
        brightness,
        contrast,
        sharpness,
        noise_removal: noiseRemoval,
        saturation,
        hue_shift: hueShift,
        edge_mode: edgeMode,
        region_strength: regionStrength,
      });

      if (response.success && response.data) {
        setWorkingImage(response.data.workingImageBase64, response.data.metadata);
        if (!isPreview) {
          toast.success('Enhancements applied');
        }
      }
    } catch (error) {
      if (!isPreview) {
        toast.error(error instanceof Error ? error.message : 'Enhancement failed');
      }
    } finally {
      if (!isPreview) {
        setProcessing(false);
      }
    }
  };

  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    setSharpness(0);
    setNoiseRemoval(0);
    setSaturation(0);
    setHueShift(0);
    setEdgeMode('off');
    setRegionStrength(0);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <SectionLabel>Basic Adjustments</SectionLabel>
          <div className="space-y-3">
            <Slider
              label="Brightness"
              value={brightness}
              onChange={setBrightness}
              min={-100}
              max={100}
              step={1}
            />
            <Slider
              label="Contrast"
              value={contrast}
              onChange={setContrast}
              min={-100}
              max={100}
              step={1}
            />
            <Slider
              label="Sharpness"
              value={sharpness}
              onChange={setSharpness}
              min={0}
              max={100}
              step={1}
            />
            <Slider
              label="Noise Removal"
              value={noiseRemoval}
              onChange={setNoiseRemoval}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <SectionLabel>Color Adjustments</SectionLabel>
          <div className="space-y-3">
            <Slider
              label="Saturation"
              value={saturation}
              onChange={setSaturation}
              min={-100}
              max={100}
              step={1}
            />
            <Slider
              label="Hue Shift"
              value={hueShift}
              onChange={setHueShift}
              min={-180}
              max={180}
              step={1}
            />
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <SectionLabel>Edge Detection</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {(['off', 'subtle', 'strong'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setEdgeMode(mode)}
                className={`px-3 py-2 text-xs rounded capitalize transition-colors ${
                  edgeMode === mode
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <SectionLabel>Region Enhance</SectionLabel>
          <Button variant="secondary" size="sm" className="w-full mb-2">
            Select Region
          </Button>
          <Slider
            label="Strength"
            value={regionStrength}
            onChange={setRegionStrength}
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel className="mb-0">Live Preview</SectionLabel>
            <button
              onClick={() => setLivePreview(!livePreview)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                livePreview
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-1)]'
              }`}
            >
              {livePreview ? 'On' : 'Off'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-3)]">
            {livePreview
              ? 'Changes apply automatically (400ms delay)'
              : 'Click Apply to see changes'}
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--border)] space-y-2">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            Reset All
          </Button>
          <Button variant="primary" onClick={() => handleApply(false)} className="flex-1">
            Apply All
          </Button>
        </div>
      </div>
    </div>
  );
};
