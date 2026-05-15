import React from 'react';
import { useToolStore } from '../../store/toolStore';
import { DefaultPanel } from '../panels/DefaultPanel';
import { CropPanel } from '../panels/CropPanel';
import { ZoomPanel } from '../panels/ZoomPanel';
import { EnhancePanel } from '../panels/EnhancePanel';
import { FiltersPanel } from '../panels/FiltersPanel';
import { AnnotationPanel } from '../panels/AnnotationPanel';
import { CountPanel } from '../panels/CountPanel';
import { ColorPanel } from '../panels/ColorPanel';
import { CompressPanel } from '../panels/CompressPanel';
import { HistoryPanel } from '../panels/HistoryPanel';
import { OcrPanel } from '../panels/OcrPanel';
import { FacePanel } from '../panels/FacePanel';
import { BgRemovePanel } from '../panels/BgRemovePanel';
import { ObjRemovePanel } from '../panels/ObjRemovePanel';
import { ExtendPanel } from '../panels/ExtendPanel';
import { StraightenPanel } from '../panels/StraightenPanel';
import {
  FolderOpen,
  Crop,
  ZoomIn,
  RotateCcw,
  Sparkles,
  Palette,
  PenTool,
  Type,
  Smile,
  Eraser,
  Scissors,
  Pipette,
  Hash,
  Move,
  Package,
  Compass,
  Download,
  Clock,
} from 'lucide-react';

const toolIcons: Record<string, React.ReactNode> = {
  upload: <FolderOpen size={18} />,
  crop: <Crop size={18} />,
  zoom: <ZoomIn size={18} />,
  rotate: <RotateCcw size={18} />,
  enhance: <Sparkles size={18} />,
  filters: <Palette size={18} />,
  annotate: <PenTool size={18} />,
  ocr: <Type size={18} />,
  face: <Smile size={18} />,
  bgremove: <Eraser size={18} />,
  objremove: <Scissors size={18} />,
  colorspot: <Pipette size={18} />,
  count: <Hash size={18} />,
  extend: <Move size={18} />,
  compress: <Package size={18} />,
  straighten: <Compass size={18} />,
  export: <Download size={18} />,
  history: <Clock size={18} />,
};

const toolNames: Record<string, string> = {
  upload: 'Upload/Open',
  crop: 'Crop',
  zoom: 'Zoom',
  rotate: 'Rotate',
  enhance: 'Enhance',
  filters: 'Filters',
  annotate: 'Annotate',
  ocr: 'OCR',
  face: 'Face Detection',
  bgremove: 'Remove Background',
  objremove: 'Remove Object',
  colorspot: 'Color Spot',
  count: 'Count Objects',
  extend: 'Extend Canvas',
  compress: 'Compress',
  straighten: 'Auto Straighten',
  export: 'Export',
  history: 'History',
};

export const RightPanel: React.FC = () => {
  const { activeTool } = useToolStore();

  return (
    <div
      className="flex flex-col bg-[var(--bg-panel)] border-l border-[var(--border)] overflow-hidden"
      style={{ width: 'var(--rightpanel-w)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        {activeTool && toolIcons[activeTool]}
        <h2 className="text-sm font-semibold text-[var(--text-1)]">
          {activeTool ? toolNames[activeTool] : 'Properties'}
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTool ? (
          <>
            {activeTool === 'crop' && <CropPanel />}
            {activeTool === 'rotate' && <CropPanel />}
            {activeTool === 'zoom' && <ZoomPanel />}
            {activeTool === 'enhance' && <EnhancePanel />}
            {activeTool === 'filters' && <FiltersPanel />}
            {activeTool === 'annotate' && <AnnotationPanel />}
            {activeTool === 'count' && <CountPanel />}
            {activeTool === 'colorspot' && <ColorPanel />}
            {activeTool === 'compress' && <CompressPanel />}
            {activeTool === 'history' && <HistoryPanel />}
            {activeTool === 'ocr' && <OcrPanel />}
            {activeTool === 'face' && <FacePanel />}
            {activeTool === 'bgremove' && <BgRemovePanel />}
            {activeTool === 'objremove' && <ObjRemovePanel />}
            {activeTool === 'extend' && <ExtendPanel />}
            {activeTool === 'straighten' && <StraightenPanel />}
            {!['crop', 'rotate', 'zoom', 'enhance', 'filters', 'annotate', 'count', 'colorspot', 'compress', 'history', 'ocr', 'face', 'bgremove', 'objremove', 'extend', 'straighten'].includes(activeTool) && (
              <div className="p-4 text-center text-[var(--text-3)]">
                <p className="text-sm">
                  {toolNames[activeTool]} Panel coming in Prompt 5...
                </p>
              </div>
            )}
          </>
        ) : (
          <DefaultPanel />
        )}
      </div>
    </div>
  );
};
