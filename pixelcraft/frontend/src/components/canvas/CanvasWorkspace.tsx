import React from 'react';
import { ImageCanvas } from './ImageCanvas';
import { useImageStore } from '../../store/imageStore';

export const CanvasWorkspace: React.FC = () => {
  const { sessionId } = useImageStore();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {sessionId ? (
        <>
          <ImageCanvas />
          {/* Annotation layer will overlay the canvas */}
          <div className="absolute inset-0 pointer-events-none">
            {/* AnnotationLayer component will go here */}
          </div>
        </>
      ) : (
        // Placeholder when no image (upload overlay handles this now)
        <div className="w-full h-full bg-[var(--bg-canvas)]" />
      )}
    </div>
  );
};
