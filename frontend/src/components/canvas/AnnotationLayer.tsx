import React from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useAnnotationStore, Annotation } from '../../store/annotationStore';
import toast from 'react-hot-toast';

interface AnnotationLayerProps {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  width,
  height,
  scale,
  offsetX,
  offsetY,
}) => {
  const { annotations, selectedAnnotationId, selectAnnotation, drawingState, continueDrawing, finishDrawing } = useAnnotationStore();

  const handleMouseDown = (e: any) => {
    if (!drawingState.currentType) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    // Convert from screen to image coords (account for pan/zoom)
    const imgX = (pos.x - offsetX) / scale;
    const imgY = (pos.y - offsetY) / scale;
    useAnnotationStore.setState((s) => ({
      drawingState: {
        ...s.drawingState,
        isDrawing: true,
        currentPoints: [imgX, imgY],
      },
    }));
  };

  const handleMouseMove = (e: any) => {
    if (!drawingState.isDrawing || !drawingState.currentType) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const imgX = (pos.x - offsetX) / scale;
    const imgY = (pos.y - offsetY) / scale;
    continueDrawing(imgX, imgY);
  };

  const handleMouseUp = () => {
    if (!drawingState.isDrawing || !drawingState.currentType) return;
    const type = drawingState.currentType;
    // For freehand/polygon, only finish on double-click; for others finish on mouseup
    if (type === 'freehand' || type === 'polygon') return; // handled by dblclick
    const annotation = finishDrawing('Object');
    if (annotation) {
      toast.success(`${type} annotation added`);
    }
  };

  const handleDblClick = () => {
    if (!drawingState.isDrawing) return;
    const type = drawingState.currentType;
    if (type === 'freehand' || type === 'polygon') {
      const annotation = finishDrawing('Object');
      if (annotation) {
        toast.success(`${type} annotation added`);
      }
    }
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = annotation.id === selectedAnnotationId;
    const strokeColor = isSelected ? '#00FF00' : annotation.color;
    const strokeWidth = isSelected ? annotation.strokeWidth + 2 : annotation.strokeWidth;

    switch (annotation.type) {
      case 'rectangle': {
        if (annotation.points.length < 4) return null;
        const [x1, y1, x2, y2] = annotation.points;
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);

        return (
          <Rect
            key={annotation.id}
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            fill={annotation.filled ? annotation.color : undefined}
            opacity={annotation.opacity}
            onClick={() => selectAnnotation(annotation.id)}
            onTap={() => selectAnnotation(annotation.id)}
          />
        );
      }

      case 'circle': {
        if (annotation.points.length < 4) return null;
        const [cx, cy, px, py] = annotation.points;
        const radius = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

        return (
          <Circle
            key={annotation.id}
            x={cx}
            y={cy}
            radius={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            fill={annotation.filled ? annotation.color : undefined}
            opacity={annotation.opacity}
            onClick={() => selectAnnotation(annotation.id)}
            onTap={() => selectAnnotation(annotation.id)}
          />
        );
      }

      case 'line': {
        if (annotation.points.length < 4) return null;
        return (
          <Line
            key={annotation.id}
            points={annotation.points}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            opacity={annotation.opacity}
            lineCap="round"
            lineJoin="round"
            onClick={() => selectAnnotation(annotation.id)}
            onTap={() => selectAnnotation(annotation.id)}
          />
        );
      }

      case 'polygon': {
        if (annotation.points.length < 6) return null;
        return (
          <Line
            key={annotation.id}
            points={annotation.points}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            fill={annotation.filled ? annotation.color : undefined}
            opacity={annotation.opacity}
            closed
            lineCap="round"
            lineJoin="round"
            onClick={() => selectAnnotation(annotation.id)}
            onTap={() => selectAnnotation(annotation.id)}
          />
        );
      }

      case 'freehand': {
        if (annotation.points.length < 4) return null;
        return (
          <Line
            key={annotation.id}
            points={annotation.points}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            opacity={annotation.opacity}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            onClick={() => selectAnnotation(annotation.id)}
            onTap={() => selectAnnotation(annotation.id)}
          />
        );
      }

      default:
        return null;
    }
  };

  const renderCurrentDrawing = () => {
    if (!drawingState.isDrawing || !drawingState.currentType || drawingState.currentPoints.length < 2) {
      return null;
    }

    const { currentType, currentPoints, currentColor, currentStrokeWidth, currentOpacity, currentFilled } = drawingState;

    switch (currentType) {
      case 'rectangle': {
        if (currentPoints.length < 4) return null;
        const [x1, y1, x2, y2] = currentPoints;
        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const w = Math.abs(x2 - x1);
        const h = Math.abs(y2 - y1);

        return (
          <Rect
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth / scale}
            fill={currentFilled ? currentColor : undefined}
            opacity={currentOpacity}
            dash={[5 / scale, 5 / scale]}
          />
        );
      }

      case 'circle': {
        if (currentPoints.length < 4) return null;
        const [cx, cy, px, py] = currentPoints;
        const radius = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

        return (
          <Circle
            x={cx}
            y={cy}
            radius={radius}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth / scale}
            fill={currentFilled ? currentColor : undefined}
            opacity={currentOpacity}
            dash={[5 / scale, 5 / scale]}
          />
        );
      }

      case 'line': {
        if (currentPoints.length < 4) return null;
        return (
          <Line
            points={currentPoints}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth / scale}
            opacity={currentOpacity}
            lineCap="round"
            lineJoin="round"
            dash={[5 / scale, 5 / scale]}
          />
        );
      }

      case 'polygon': {
        if (currentPoints.length < 4) return null;
        return (
          <Line
            points={currentPoints}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth / scale}
            fill={currentFilled ? currentColor : undefined}
            opacity={currentOpacity}
            lineCap="round"
            lineJoin="round"
            dash={[5 / scale, 5 / scale]}
          />
        );
      }

      case 'freehand': {
        if (currentPoints.length < 4) return null;
        return (
          <Line
            points={currentPoints}
            stroke={currentColor}
            strokeWidth={currentStrokeWidth / scale}
            opacity={currentOpacity}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        );
      }

      default:
        return null;
    }
  };

  return (
    <Stage
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: drawingState.currentType ? 'crosshair' : 'default',
        pointerEvents: drawingState.currentType ? 'auto' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDblClick={handleDblClick}
    >
      <Layer
        scaleX={scale}
        scaleY={scale}
        x={offsetX}
        y={offsetY}
      >
        {annotations.map(renderAnnotation)}
        {renderCurrentDrawing()}
      </Layer>
    </Stage>
  );
};
