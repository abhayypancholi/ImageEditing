import React, { useState } from 'react';
import { useImageApi } from '../../hooks/useImageApi';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Package, Zap, Palette } from 'lucide-react';

export const CompressPanel: React.FC = () => {
  const [jpegQuality, setJpegQuality] = useState(85);
  const [pcaComponents, setPcaComponents] = useState(50);
  const [paletteColors, setPaletteColors] = useState(256);

  const { applyOperation, isLoading } = useImageApi();

  const handleJPEGCompress = () => {
    applyOperation('/api/compress/jpeg', {
      quality: jpegQuality,
    });
  };

  const handlePCACompress = () => {
    applyOperation('/api/compress/pca', {
      components: pcaComponents,
    });
  };

  const handlePaletteReduce = () => {
    applyOperation('/api/compress/palette', {
      colors: paletteColors,
    });
  };

  return (
    <div className="p-4 space-y-6">
      {/* JPEG Compression */}
      <div className="space-y-3">
        <SectionLabel>JPEG Compression</SectionLabel>
        <p className="text-xs text-[var(--text-3)]">
          Reduce file size by adjusting JPEG quality. Lower quality = smaller file size.
        </p>
        
        <Slider
          label={`Quality: ${jpegQuality}%`}
          value={jpegQuality}
          onChange={setJpegQuality}
          min={1}
          max={100}
          step={1}
        />

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJpegQuality(95)}
          >
            High
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJpegQuality(85)}
          >
            Medium
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setJpegQuality(60)}
          >
            Low
          </Button>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={handleJPEGCompress}
          disabled={isLoading}
        >
          <Package size={16} />
          Apply JPEG Compression
        </Button>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* PCA Compression */}
      <div className="space-y-3">
        <SectionLabel>PCA Compression</SectionLabel>
        <p className="text-xs text-[var(--text-3)]">
          Advanced compression using Principal Component Analysis. Reduces data while preserving visual quality.
        </p>
        
        <Slider
          label={`Components: ${pcaComponents}`}
          value={pcaComponents}
          onChange={setPcaComponents}
          min={10}
          max={200}
          step={10}
        />

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPcaComponents(100)}
          >
            High
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPcaComponents(50)}
          >
            Medium
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPcaComponents(20)}
          >
            Low
          </Button>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={handlePCACompress}
          disabled={isLoading}
        >
          <Zap size={16} />
          Apply PCA Compression
        </Button>

        <div className="p-2 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-3)]">
            <strong>Note:</strong> PCA compression may take longer for large images. Fewer components = more compression but lower quality.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* Palette Reduction */}
      <div className="space-y-3">
        <SectionLabel>Color Palette Reduction</SectionLabel>
        <p className="text-xs text-[var(--text-3)]">
          Reduce the number of unique colors using K-means clustering. Great for creating posterized effects.
        </p>
        
        <Slider
          label={`Colors: ${paletteColors}`}
          value={paletteColors}
          onChange={setPaletteColors}
          min={2}
          max={256}
          step={1}
        />

        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteColors(256)}
          >
            256
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteColors(128)}
          >
            128
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteColors(64)}
          >
            64
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteColors(16)}
          >
            16
          </Button>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={handlePaletteReduce}
          disabled={isLoading}
        >
          <Palette size={16} />
          Reduce Color Palette
        </Button>

        <div className="p-2 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-3)]">
            <strong>Tip:</strong> Use 16-64 colors for artistic posterized effects, or 128-256 for subtle compression.
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30">
        <p className="text-xs text-[var(--text-2)]">
          <strong>Compression Methods:</strong>
        </p>
        <ul className="text-xs text-[var(--text-3)] mt-2 space-y-1 list-disc list-inside">
          <li><strong>JPEG:</strong> Standard lossy compression</li>
          <li><strong>PCA:</strong> Mathematical dimensionality reduction</li>
          <li><strong>Palette:</strong> Color quantization via clustering</li>
        </ul>
      </div>
    </div>
  );
};
