import React from 'react';
import { ImageCanvas } from './ImageCanvas';
import { AnnotationLayer } from './AnnotationLayer';
import { useImageStore } from '../../store/imageStore';
import { useUIStore } from '../../store/uiStore';
import { useToolStore } from '../../store/toolStore';

export const CanvasWorkspace: React.FC = () => {
  const { sessionId } = useImageStore();
  const { zoom, panX, panY } = useUIStore();
  const { activeTool } = useToolStore();

  // We need the canvas dimensions to size the annotation layer
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dims, setDims] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {sessionId ? (
        <>
          <ImageCanvas />
          {/* Annotation layer overlays the canvas when annotate tool is active */}
          {activeTool === 'annotate' && dims.width > 0 && (
            <AnnotationLayer
              width={dims.width}
              height={dims.height}
              scale={zoom}
              offsetX={panX}
              offsetY={panY}
            />
          )}
        </>
      ) : (
        <div className="w-full h-full bg-[var(--bg-canvas)]" />
      )}
    </div>
  );
};