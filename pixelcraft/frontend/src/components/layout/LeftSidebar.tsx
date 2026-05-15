import React from 'react';
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
import { useToolStore } from '../../store/toolStore';
import { ToolType } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface ToolButton {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
}

const toolGroups: { tools: ToolButton[]; divider?: boolean }[] = [
  {
    tools: [{ id: 'upload', icon: <FolderOpen size={20} />, label: 'Upload/Open' }],
    divider: true,
  },
  {
    tools: [
      { id: 'crop', icon: <Crop size={20} />, label: 'Crop' },
      { id: 'zoom', icon: <ZoomIn size={20} />, label: 'Zoom' },
      { id: 'rotate', icon: <RotateCcw size={20} />, label: 'Rotate' },
    ],
    divider: true,
  },
  {
    tools: [
      { id: 'enhance', icon: <Sparkles size={20} />, label: 'Enhance' },
      { id: 'filters', icon: <Palette size={20} />, label: 'Filters' },
    ],
    divider: true,
  },
  {
    tools: [
      { id: 'annotate', icon: <PenTool size={20} />, label: 'Annotate' },
      { id: 'ocr', icon: <Type size={20} />, label: 'OCR' },
    ],
    divider: true,
  },
  {
    tools: [
      { id: 'face', icon: <Smile size={20} />, label: 'Face Detection' },
      { id: 'bgremove', icon: <Eraser size={20} />, label: 'Remove Background' },
      { id: 'objremove', icon: <Scissors size={20} />, label: 'Remove Object' },
      { id: 'colorspot', icon: <Pipette size={20} />, label: 'Color Spot' },
      { id: 'count', icon: <Hash size={20} />, label: 'Count Objects' },
    ],
    divider: true,
  },
  {
    tools: [
      { id: 'extend', icon: <Move size={20} />, label: 'Extend Canvas' },
      { id: 'compress', icon: <Package size={20} />, label: 'Compress' },
      { id: 'straighten', icon: <Compass size={20} />, label: 'Auto Straighten' },
      { id: 'history', icon: <Clock size={20} />, label: 'History' },
      { id: 'export', icon: <Download size={20} />, label: 'Export' },
    ],
  },
];

export const LeftSidebar: React.FC = () => {
  const { activeTool, setTool } = useToolStore();

  const handleToolClick = (toolId: ToolType) => {
    setTool(activeTool === toolId ? null : toolId);
  };

  return (
    <div
      className="flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)] overflow-y-auto"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {toolGroups.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {group.tools.map((tool) => (
            <Tooltip key={tool.id} content={tool.label} position="right">
              <button
                onClick={() => handleToolClick(tool.id)}
                className={`
                  w-full h-12 flex items-center justify-center
                  transition-colors relative
                  ${
                    activeTool === tool.id
                      ? 'bg-[var(--accent-glow)] text-[var(--accent)]'
                      : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)]'
                  }
                `}
              >
                {activeTool === tool.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)]" />
                )}
                {tool.icon}
              </button>
            </Tooltip>
          ))}
          {group.divider && (
            <div className="h-px bg-[var(--border)] mx-2 my-1" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
