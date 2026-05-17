import React, { useState, useEffect } from 'react';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { SectionLabel } from '../ui/SectionLabel';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import { Pipette, Copy, Check } from 'lucide-react';

// Color names database
const colorNames: Array<{ name: string; hex: string }> = [
  {"name": "Black", "hex": "#000000"},
  {"name": "Navy", "hex": "#000080"},
  {"name": "Dark Blue", "hex": "#00008B"},
  {"name": "Medium Blue", "hex": "#0000CD"},
  {"name": "Blue", "hex": "#0000FF"},
  {"name": "Dark Green", "hex": "#006400"},
  {"name": "Green", "hex": "#008000"},
  {"name": "Teal", "hex": "#008080"},
  {"name": "Dark Cyan", "hex": "#008B8B"},
  {"name": "Deep Sky Blue", "hex": "#00BFFF"},
  {"name": "Dark Turquoise", "hex": "#00CED1"},
  {"name": "Lime", "hex": "#00FF00"},
  {"name": "Spring Green", "hex": "#00FF7F"},
  {"name": "Aqua", "hex": "#00FFFF"},
  {"name": "Cyan", "hex": "#00FFFF"},
  {"name": "Midnight Blue", "hex": "#191970"},
  {"name": "Dodger Blue", "hex": "#1E90FF"},
  {"name": "Forest Green", "hex": "#228B22"},
  {"name": "Sea Green", "hex": "#2E8B57"},
  {"name": "Lime Green", "hex": "#32CD32"},
  {"name": "Turquoise", "hex": "#40E0D0"},
  {"name": "Royal Blue", "hex": "#4169E1"},
  {"name": "Steel Blue", "hex": "#4682B4"},
  {"name": "Indigo", "hex": "#4B0082"},
  {"name": "Cadet Blue", "hex": "#5F9EA0"},
  {"name": "Cornflower Blue", "hex": "#6495ED"},
  {"name": "Dim Gray", "hex": "#696969"},
  {"name": "Slate Blue", "hex": "#6A5ACD"},
  {"name": "Olive Drab", "hex": "#6B8E23"},
  {"name": "Slate Gray", "hex": "#708090"},
  {"name": "Lawn Green", "hex": "#7CFC00"},
  {"name": "Chartreuse", "hex": "#7FFF00"},
  {"name": "Aquamarine", "hex": "#7FFFD4"},
  {"name": "Maroon", "hex": "#800000"},
  {"name": "Purple", "hex": "#800080"},
  {"name": "Olive", "hex": "#808000"},
  {"name": "Gray", "hex": "#808080"},
  {"name": "Sky Blue", "hex": "#87CEEB"},
  {"name": "Blue Violet", "hex": "#8A2BE2"},
  {"name": "Dark Red", "hex": "#8B0000"},
  {"name": "Dark Magenta", "hex": "#8B008B"},
  {"name": "Saddle Brown", "hex": "#8B4513"},
  {"name": "Light Green", "hex": "#90EE90"},
  {"name": "Medium Purple", "hex": "#9370DB"},
  {"name": "Dark Violet", "hex": "#9400D3"},
  {"name": "Pale Green", "hex": "#98FB98"},
  {"name": "Dark Orchid", "hex": "#9932CC"},
  {"name": "Yellow Green", "hex": "#9ACD32"},
  {"name": "Sienna", "hex": "#A0522D"},
  {"name": "Brown", "hex": "#A52A2A"},
  {"name": "Dark Gray", "hex": "#A9A9A9"},
  {"name": "Light Blue", "hex": "#ADD8E6"},
  {"name": "Green Yellow", "hex": "#ADFF2F"},
  {"name": "Powder Blue", "hex": "#B0E0E6"},
  {"name": "Fire Brick", "hex": "#B22222"},
  {"name": "Dark Goldenrod", "hex": "#B8860B"},
  {"name": "Medium Orchid", "hex": "#BA55D3"},
  {"name": "Rosy Brown", "hex": "#BC8F8F"},
  {"name": "Dark Khaki", "hex": "#BDB76B"},
  {"name": "Silver", "hex": "#C0C0C0"},
  {"name": "Indian Red", "hex": "#CD5C5C"},
  {"name": "Peru", "hex": "#CD853F"},
  {"name": "Chocolate", "hex": "#D2691E"},
  {"name": "Tan", "hex": "#D2B48C"},
  {"name": "Light Gray", "hex": "#D3D3D3"},
  {"name": "Thistle", "hex": "#D8BFD8"},
  {"name": "Orchid", "hex": "#DA70D6"},
  {"name": "Goldenrod", "hex": "#DAA520"},
  {"name": "Crimson", "hex": "#DC143C"},
  {"name": "Gainsboro", "hex": "#DCDCDC"},
  {"name": "Plum", "hex": "#DDA0DD"},
  {"name": "Lavender", "hex": "#E6E6FA"},
  {"name": "Dark Salmon", "hex": "#E9967A"},
  {"name": "Violet", "hex": "#EE82EE"},
  {"name": "Light Coral", "hex": "#F08080"},
  {"name": "Khaki", "hex": "#F0E68C"},
  {"name": "Alice Blue", "hex": "#F0F8FF"},
  {"name": "Honeydew", "hex": "#F0FFF0"},
  {"name": "Azure", "hex": "#F0FFFF"},
  {"name": "Sandy Brown", "hex": "#F4A460"},
  {"name": "Wheat", "hex": "#F5DEB3"},
  {"name": "Beige", "hex": "#F5F5DC"},
  {"name": "White Smoke", "hex": "#F5F5F5"},
  {"name": "Mint Cream", "hex": "#F5FFFA"},
  {"name": "Ghost White", "hex": "#F8F8FF"},
  {"name": "Salmon", "hex": "#FA8072"},
  {"name": "Antique White", "hex": "#FAEBD7"},
  {"name": "Linen", "hex": "#FAF0E6"},
  {"name": "Old Lace", "hex": "#FDF5E6"},
  {"name": "Red", "hex": "#FF0000"},
  {"name": "Fuchsia", "hex": "#FF00FF"},
  {"name": "Magenta", "hex": "#FF00FF"},
  {"name": "Deep Pink", "hex": "#FF1493"},
  {"name": "Orange Red", "hex": "#FF4500"},
  {"name": "Tomato", "hex": "#FF6347"},
  {"name": "Hot Pink", "hex": "#FF69B4"},
  {"name": "Coral", "hex": "#FF7F50"},
  {"name": "Dark Orange", "hex": "#FF8C00"},
  {"name": "Light Salmon", "hex": "#FFA07A"},
  {"name": "Orange", "hex": "#FFA500"},
  {"name": "Light Pink", "hex": "#FFB6C1"},
  {"name": "Pink", "hex": "#FFC0CB"},
  {"name": "Gold", "hex": "#FFD700"},
  {"name": "Peach Puff", "hex": "#FFDAB9"},
  {"name": "Navajo White", "hex": "#FFDEAD"},
  {"name": "Moccasin", "hex": "#FFE4B5"},
  {"name": "Bisque", "hex": "#FFE4C4"},
  {"name": "Misty Rose", "hex": "#FFE4E1"},
  {"name": "Blanched Almond", "hex": "#FFEBCD"},
  {"name": "Papaya Whip", "hex": "#FFEFD5"},
  {"name": "Lavender Blush", "hex": "#FFF0F5"},
  {"name": "Seashell", "hex": "#FFF5EE"},
  {"name": "Cornsilk", "hex": "#FFF8DC"},
  {"name": "Lemon Chiffon", "hex": "#FFFACD"},
  {"name": "Floral White", "hex": "#FFFAF0"},
  {"name": "Snow", "hex": "#FFFAFA"},
  {"name": "Yellow", "hex": "#FFFF00"},
  {"name": "Light Yellow", "hex": "#FFFFE0"},
  {"name": "Ivory", "hex": "#FFFFF0"},
  {"name": "White", "hex": "#FFFFFF"}
];

interface ColorResult {
  rgb: [number, number, number];
  hex: string;
  position: { x: number; y: number };
}

export const ColorPanel: React.FC = () => {
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [colorResult, setColorResult] = useState<ColorResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [closestColorName, setClosestColorName] = useState<string>('');

  const { sessionId } = useImageStore();

  const handlePickColor = (x: number, y: number) => {
    if (!sessionId || !isPickerMode) return;

    apiClient
      .post('/api/objects/pick-color', {
        session_id: sessionId,
        x: Math.round(x),
        y: Math.round(y),
      })
      .then((response) => {
        setColorResult(response.data.data);
        toast.success('Color picked');
      })
      .catch((error) => {
        toast.error('Failed to pick color');
        console.error(error);
      });
  };

  const findClosestColorName = (hex: string): string => {
    const hexToRgb = (h: string): [number, number, number] => {
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return [r, g, b];
    };

    const colorDistance = (c1: [number, number, number], c2: [number, number, number]) => {
      return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
      );
    };

    const targetRgb = hexToRgb(hex);
    let minDistance = Infinity;
    let closestName = '';

    colorNames.forEach((color) => {
      const colorRgb = hexToRgb(color.hex);
      const distance = colorDistance(targetRgb, colorRgb);
      if (distance < minDistance) {
        minDistance = distance;
        closestName = color.name;
      }
    });

    return closestName;
  };

  useEffect(() => {
    if (colorResult) {
      setClosestColorName(findClosestColorName(colorResult.hex));
    }
  }, [colorResult]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(`Copied ${field}`);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // Set up canvas click listener
  useEffect(() => {
    if (!isPickerMode) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Account for canvas scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      handlePickColor(x * scaleX, y * scaleY);
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
  }, [isPickerMode, sessionId]);

  return (
    <div className="p-4 space-y-4">
      <SectionLabel>Color Picker</SectionLabel>

      <Button
        variant={isPickerMode ? 'primary' : 'secondary'}
        fullWidth
        onClick={() => {
          setIsPickerMode(!isPickerMode);
          if (!isPickerMode) {
            toast.success('Click on the image to pick a color');
          } else {
            toast.success('Color picker disabled');
          }
        }}
      >
        <Pipette size={16} />
        {isPickerMode ? 'Picker Mode Active' : 'Enable Color Picker'}
      </Button>

      {colorResult && (
        <>
          <SectionLabel>Picked Color</SectionLabel>

          {/* Color Preview */}
          <div
            className="w-full h-32 rounded-lg border-2 border-[var(--border)] shadow-lg"
            style={{ backgroundColor: colorResult.hex }}
          />

          {/* Color Name */}
          <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)]">
            <div className="text-center">
              <p className="text-xs text-[var(--text-3)] mb-1">Closest Color Name</p>
              <p className="text-lg font-semibold text-[var(--text-1)]">
                {closestColorName}
              </p>
            </div>
          </div>

          {/* Color Values */}
          <div className="space-y-2">
            {/* HEX */}
            <div className="flex items-center justify-between p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)]">
              <div>
                <p className="text-xs text-[var(--text-3)]">HEX</p>
                <p className="text-sm font-mono font-semibold text-[var(--text-1)]">
                  {colorResult.hex.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(colorResult.hex, 'HEX')}
                className="p-2 hover:bg-[var(--bg-panel)] rounded transition-colors"
              >
                {copiedField === 'HEX' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-[var(--text-3)]" />
                )}
              </button>
            </div>

            {/* RGB */}
            <div className="flex items-center justify-between p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)]">
              <div>
                <p className="text-xs text-[var(--text-3)]">RGB</p>
                <p className="text-sm font-mono font-semibold text-[var(--text-1)]">
                  rgb({colorResult.rgb[0]}, {colorResult.rgb[1]}, {colorResult.rgb[2]})
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `rgb(${colorResult.rgb[0]}, ${colorResult.rgb[1]}, ${colorResult.rgb[2]})`,
                    'RGB'
                  )
                }
                className="p-2 hover:bg-[var(--bg-panel)] rounded transition-colors"
              >
                {copiedField === 'RGB' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} className="text-[var(--text-3)]" />
                )}
              </button>
            </div>

            {/* Individual RGB Values */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded border border-[var(--border)] bg-[var(--bg-hover)] text-center">
                <p className="text-xs text-[var(--text-3)]">R</p>
                <p className="text-lg font-bold text-red-500">{colorResult.rgb[0]}</p>
              </div>
              <div className="p-2 rounded border border-[var(--border)] bg-[var(--bg-hover)] text-center">
                <p className="text-xs text-[var(--text-3)]">G</p>
                <p className="text-lg font-bold text-green-500">{colorResult.rgb[1]}</p>
              </div>
              <div className="p-2 rounded border border-[var(--border)] bg-[var(--bg-hover)] text-center">
                <p className="text-xs text-[var(--text-3)]">B</p>
                <p className="text-lg font-bold text-blue-500">{colorResult.rgb[2]}</p>
              </div>
            </div>

            {/* Position */}
            <div className="p-3 rounded border border-[var(--border)] bg-[var(--bg-hover)]">
              <p className="text-xs text-[var(--text-3)] mb-1">Position</p>
              <p className="text-sm font-mono text-[var(--text-1)]">
                X: {colorResult.position.x}, Y: {colorResult.position.y}
              </p>
            </div>
          </div>
        </>
      )}

      {!colorResult && (
        <div className="text-center py-8 text-[var(--text-3)]">
          <Pipette size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            Click "Enable Color Picker" and click on the image to pick a color
          </p>
          <p className="text-xs mt-2">
            Get HEX, RGB values and closest color name
          </p>
        </div>
      )}
    </div>
  );
};
