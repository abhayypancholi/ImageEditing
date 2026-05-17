import React, { useState } from 'react';
import { useAnnotationStore, AnnotationType } from '../../store/annotationStore';
import { useImageStore } from '../../store/imageStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { SectionLabel } from '../ui/SectionLabel';
import { Dropdown } from '../ui/Dropdown';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';
import {
  Square,
  Circle,
  Minus,
  Pentagon,
  Pencil,
  Trash2,
  Download,
  Plus,
  X,
} from 'lucide-react';

export const AnnotationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'draw' | 'manage' | 'labels'>('draw');
  const [newLabel, setNewLabel] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'coco' | 'yolo'>('json');

  const {
    annotations,
    selectedAnnotationId,
    drawingState,
    labels,
    removeAnnotation,
    selectAnnotation,
    setDrawingColor,
    setDrawingStrokeWidth,
    setDrawingOpacity,
    setDrawingFilled,
    addLabel,
    removeLabel,
    clearAnnotations,
    cancelDrawing,
  } = useAnnotationStore();

  const { sessionId, metadata } = useImageStore();

  const shapeButtons: { type: AnnotationType; icon: React.ReactNode; label: string }[] = [
    { type: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
    { type: 'circle', icon: <Circle size={18} />, label: 'Circle' },
    { type: 'line', icon: <Minus size={18} />, label: 'Line' },
    { type: 'polygon', icon: <Pentagon size={18} />, label: 'Polygon' },
    { type: 'freehand', icon: <Pencil size={18} />, label: 'Freehand' },
  ];

  const presetColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF',
  ];

  const handleSaveAnnotations = async () => {
    if (!sessionId) {
      toast.error('No active session');
      return;
    }

    try {
      await apiClient.post('/api/annotations/save', {
        session_id: sessionId,
        annotations,
      });
      toast.success('Annotations saved');
    } catch (error) {
      toast.error('Failed to save annotations');
      console.error(error);
    }
  };

  const handleExportAnnotations = async () => {
    if (!sessionId || !metadata) {
      toast.error('No active session');
      return;
    }

    try {
      const response = await apiClient.post('/api/annotations/export', {
        session_id: sessionId,
        annotations,
        format: exportFormat,
        image_width: metadata.width,
        image_height: metadata.height,
        filename: metadata.fileName,
      });

      // Download the exported data
      const dataStr = JSON.stringify(response.data.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `annotations_${exportFormat}.${exportFormat === 'yolo' ? 'txt' : 'json'}`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export annotations');
      console.error(error);
    }
  };

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      addLabel(newLabel.trim());
      setNewLabel('');
      toast.success(`Added label: ${newLabel.trim()}`);
    }
  };

  const handleDeleteAnnotation = (id: string) => {
    removeAnnotation(id);
    toast.success('Annotation deleted');
  };

  const handleClearAll = () => {
    if (confirm('Delete all annotations?')) {
      clearAnnotations();
      toast.success('All annotations cleared');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('draw')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'draw'
              ? 'text-[var(--text-1)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Draw
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'manage'
              ? 'text-[var(--text-1)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Manage
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'labels'
              ? 'text-[var(--text-1)] border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          Labels
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'draw' && (
          <>
            <SectionLabel>Shape Tools</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {shapeButtons.map((shape) => (
                <Button
                  key={shape.type}
                  variant={drawingState.currentType === shape.type ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    if (drawingState.currentType === shape.type) {
                      cancelDrawing();
                      toast.success(`${shape.label} tool deactivated`);
                    } else {
                      useAnnotationStore.setState((s) => ({
                        drawingState: {
                          ...s.drawingState,
                          currentType: shape.type,
                          isDrawing: false,
                          currentPoints: [],
                        },
                      }));
                      toast.success(`${shape.label} tool active — click on canvas to draw`);
                    }
                  }}
                  className="flex flex-col items-center gap-1 py-3"
                >
                  {shape.icon}
                  <span className="text-xs">{shape.label}</span>
                </Button>
              ))}
            </div>

            <SectionLabel>Drawing Style</SectionLabel>
            
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-2)]">Color</label>
              <div className="grid grid-cols-6 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setDrawingColor(color)}
                    className={`w-full aspect-square rounded border-2 transition-all ${
                      drawingState.currentColor === color
                        ? 'border-[var(--accent)] scale-110'
                        : 'border-[var(--border)] hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <input
                type="color"
                value={drawingState.currentColor}
                onChange={(e) => setDrawingColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <Slider
                label="Stroke Width"
                value={drawingState.currentStrokeWidth}
                onChange={setDrawingStrokeWidth}
                min={1}
                max={20}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Slider
                label="Opacity"
                value={drawingState.currentOpacity}
                onChange={setDrawingOpacity}
                min={0.1}
                max={1}
                step={0.1}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="filled"
                checked={drawingState.currentFilled}
                onChange={(e) => setDrawingFilled(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="filled" className="text-sm text-[var(--text-2)]">
                Fill Shape
              </label>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={handleSaveAnnotations}
              disabled={annotations.length === 0}
            >
              Save Annotations
            </Button>
          </>
        )}

        {activeTab === 'manage' && (
          <>
            <div className="flex items-center justify-between">
              <SectionLabel>Annotations ({annotations.length})</SectionLabel>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearAll}
                disabled={annotations.length === 0}
              >
                <Trash2 size={14} />
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {annotations.length === 0 ? (
                <p className="text-sm text-[var(--text-3)] text-center py-4">
                  No annotations yet
                </p>
              ) : (
                annotations.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => selectAnnotation(ann.id)}
                    className={`p-3 rounded border cursor-pointer transition-colors ${
                      selectedAnnotationId === ann.id
                        ? 'border-[var(--accent)] bg-[var(--bg-hover)]'
                        : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: ann.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--text-1)]">
                            {ann.label}
                          </p>
                          <p className="text-xs text-[var(--text-3)]">
                            {ann.type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(ann.id);
                        }}
                        className="p-1 hover:bg-[var(--bg-panel)] rounded"
                      >
                        <Trash2 size={14} className="text-[var(--text-3)]" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <SectionLabel>Export</SectionLabel>
            <Dropdown
              value={exportFormat}
              onChange={(value) => setExportFormat(value as 'json' | 'coco' | 'yolo')}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'coco', label: 'COCO Dataset' },
                { value: 'yolo', label: 'YOLO Format' },
              ]}
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={handleExportAnnotations}
              disabled={annotations.length === 0}
            >
              <Download size={16} />
              Export Annotations
            </Button>
          </>
        )}

        {activeTab === 'labels' && (
          <>
            <SectionLabel>Label Library</SectionLabel>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                placeholder="New label name"
                className="flex-1 px-3 py-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded text-sm text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddLabel}
                disabled={!newLabel.trim()}
              >
                <Plus size={16} />
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {labels.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-2 rounded border border-[var(--border)] hover:bg-[var(--bg-hover)]"
                >
                  <span className="text-sm text-[var(--text-1)]">{label}</span>
                  <button
                    onClick={() => {
                      removeLabel(label);
                      toast.success(`Removed label: ${label}`);
                    }}
                    className="p-1 hover:bg-[var(--bg-panel)] rounded"
                  >
                    <X size={14} className="text-[var(--text-3)]" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-[var(--text-3)] mt-4">
              Labels are used to categorize annotations. Add custom labels for your workflow.
            </p>
          </>
        )}
      </div>
    </div>
  );
};