import React from 'react';
import { ImageCanvas } from './ImageCanvas';
import { useImageStore } from '../../store/imageStore';
import { Spinner } from '../ui/Spinner';
import { UploadZone } from './UploadZone';

export const CanvasWorkspace: React.FC = () => {
  const { sessionId, isProcessing, processingLabel } = useImageStore();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {sessionId ? (
        <>
          <ImageCanvas />
          {/* Annotation layer will overlay the canvas */}
          <div className="absolute inset-0 pointer-events-none">
            {/* AnnotationLayer size will be set dynamically */}
          </div>
        </>
      ) : (
        <UploadZone />
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-[var(--bg-panel)] rounded-lg p-8 flex flex-col items-center gap-4 shadow-[var(--shadow-lg)]">
            <div className="relative w-16 h-16">
              <Spinner size="lg" />
            </div>
            <p className="text-[var(--text-1)] font-medium">{processingLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
};
