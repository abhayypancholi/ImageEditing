import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { Dropdown } from '../ui/Dropdown';
import { useImageStore } from '../../store/imageStore';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'quick' | 'advanced' | 'batch';

const formatOptions = [
  { value: 'png', label: 'PNG (Lossless)' },
  { value: 'jpeg', label: 'JPEG (Compressed)' },
  { value: 'webp', label: 'WebP (Modern)' },
  { value: 'bmp', label: 'BMP (Uncompressed)' },
  { value: 'tiff', label: 'TIFF (Professional)' },
];

const watermarkPositions = [
  { value: 'TL', label: 'Top Left' },
  { value: 'TC', label: 'Top Center' },
  { value: 'TR', label: 'Top Right' },
  { value: 'ML', label: 'Middle Left' },
  { value: 'MC', label: 'Middle Center' },
  { value: 'MR', label: 'Middle Right' },
  { value: 'BL', label: 'Bottom Left' },
  { value: 'BC', label: 'Bottom Center' },
  { value: 'BR', label: 'Bottom Right' },
];

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { sessionId, metadata } = useImageStore();
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [isExporting, setIsExporting] = useState(false);

  // Quick export state
  const [quickFormat, setQuickFormat] = useState('png');

  // Advanced export state
  const [advFormat, setAdvFormat] = useState('png');
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState(300);
  const [stripExif, setStripExif] = useState(false);
  const [enableResize, setEnableResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(metadata?.width || 1920);
  const [resizeHeight, setResizeHeight] = useState(metadata?.height || 1080);
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('PixelCraft');
  const [watermarkPosition, setWatermarkPosition] = useState('BR');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkSize, setWatermarkSize] = useState(24);

  // Batch export state
  const [includeHistory, setIncludeHistory] = useState(true);

  const handleQuickExport = async () => {
    if (!sessionId) {
      toast.error('No image loaded');
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiClient.post(
        '/api/storage/export',
        {
          session_id: sessionId,
          format: quickFormat,
          quality: 90,
        },
        { responseType: 'blob' }
      );

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelcraft_export.${quickFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Image exported successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedExport = async () => {
    if (!sessionId) {
      toast.error('No image loaded');
      return;
    }

    setIsExporting(true);
    try {
      const payload: Record<string, unknown> = {
        session_id: sessionId,
        format: advFormat,
        quality,
        strip_exif: stripExif,
      };

      if (enableResize) {
        payload.resize = {
          width: resizeWidth,
          height: resizeHeight,
        };
      }

      if (dpi > 0) {
        payload.dpi = dpi;
      }

      if (enableWatermark && watermarkText) {
        payload.watermark = {
          text: watermarkText,
          position: watermarkPosition,
          opacity: watermarkOpacity,
          font_size: watermarkSize,
        };
      }

      const response = await apiClient.post('/api/storage/export', payload, {
        responseType: 'blob',
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelcraft_export.${advFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Image exported successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBatchExport = async () => {
    if (!sessionId) {
      toast.error('No image loaded');
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiClient.post(
        '/api/storage/export/zip',
        {
          session_id: sessionId,
          include_history: includeHistory,
        },
        { responseType: 'blob' }
      );

      // Download ZIP file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixelcraft_batch_export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Batch export completed');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Image">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('quick')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'quick'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Quick Export
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'advanced'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Advanced
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'batch'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Batch Export
          </button>
        </div>

        {/* Quick Export Tab */}
        {activeTab === 'quick' && (
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <Dropdown
                options={formatOptions}
                value={quickFormat}
                onChange={setQuickFormat}
              />
            </div>
            <Button
              onClick={handleQuickExport}
              variant="primary"
              fullWidth
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Now'}
            </Button>
          </div>
        )}

        {/* Advanced Export Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-4 py-2 max-h-96 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <Dropdown
                options={formatOptions}
                value={advFormat}
                onChange={setAdvFormat}
              />
            </div>

            {(advFormat === 'jpeg' || advFormat === 'webp') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quality: {quality}%
                </label>
                <Slider
                  min={1}
                  max={100}
                  value={quality}
                  onChange={setQuality}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                DPI: {dpi}
              </label>
              <Slider min={72} max={600} value={dpi} onChange={setDpi} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stripExif"
                checked={stripExif}
                onChange={(e) => setStripExif(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="stripExif" className="text-sm text-gray-300">
                Strip EXIF metadata
              </label>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="enableResize"
                  checked={enableResize}
                  onChange={(e) => setEnableResize(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="enableResize" className="text-sm font-medium text-gray-300">
                  Resize Image
                </label>
              </div>
              {enableResize && (
                <div className="grid grid-cols-2 gap-3 ml-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Width</label>
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="enableWatermark"
                  checked={enableWatermark}
                  onChange={(e) => setEnableWatermark(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="enableWatermark" className="text-sm font-medium text-gray-300">
                  Add Watermark
                </label>
              </div>
              {enableWatermark && (
                <div className="space-y-3 ml-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Position</label>
                    <Dropdown
                      options={watermarkPositions}
                      value={watermarkPosition}
                      onChange={setWatermarkPosition}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Opacity: {Math.round(watermarkOpacity * 100)}%
                    </label>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={watermarkOpacity}
                      onChange={setWatermarkOpacity}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Font Size: {watermarkSize}px
                    </label>
                    <Slider
                      min={12}
                      max={72}
                      value={watermarkSize}
                      onChange={setWatermarkSize}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleAdvancedExport}
              variant="primary"
              fullWidth
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export with Options'}
            </Button>
          </div>
        )}

        {/* Batch Export Tab */}
        {activeTab === 'batch' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-400">
              Export current image and all history snapshots as a ZIP archive.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeHistory"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="includeHistory" className="text-sm text-gray-300">
                Include all history snapshots
              </label>
            </div>
            <Button
              onClick={handleBatchExport}
              variant="primary"
              fullWidth
              disabled={isExporting}
            >
              {isExporting ? 'Creating ZIP...' : 'Export as ZIP'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
