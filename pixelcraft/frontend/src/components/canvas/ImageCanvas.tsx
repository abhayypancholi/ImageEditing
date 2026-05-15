import React, { useRef, useEffect } from 'react';
import { useImageStore } from '../../store/imageStore';
import { useUIStore } from '../../store/uiStore';
import { useCanvas } from '../../hooks/useCanvas';
import { drawImage, screenToImageCoords } from '../../utils/canvasUtils';

export const ImageCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { workingImageBase64, metadata } = useImageStore();
  const { zoom, panX, panY, setCursor, fitToScreen } = useUIStore();
  
  // Use canvas hook for pan/zoom
  useCanvas(canvasRef);

  // Load image when workingImageBase64 changes
  useEffect(() => {
    if (!workingImageBase64) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      
      // Fit to screen on first load
      if (canvasRef.current && metadata) {
        const canvas = canvasRef.current;
        fitToScreen(metadata.width, metadata.height, canvas.width, canvas.height);
      }
    };
    img.src = `data:image/png;base64,${workingImageBase64}`;
  }, [workingImageBase64, metadata, fitToScreen]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container with device pixel ratio
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;

      // Set bitmap size (accounting for DPR)
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      // Set CSS size
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';

      // Scale context for crisp rendering on retina displays
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    let animationFrameId: number;
    const render = () => {
      if (imageRef.current) {
        drawImage(ctx, imageRef.current, zoom, panX, panY, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      } else {
        // Clear canvas if no image
        ctx.fillStyle = 'var(--bg-canvas)';
        ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [zoom, panX, panY]);

  // Track cursor position
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !metadata) return;

    const rect = canvas.getBoundingClientRect();
    const coords = screenToImageCoords(
      e.clientX,
      e.clientY,
      rect,
      zoom,
      panX,
      panY,
      metadata.width,
      metadata.height,
      canvas // Pass canvas element for DPR handling
    );

    setCursor(coords.x, coords.y);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full"
      style={{ background: 'var(--bg-canvas)' }}
    />
  );
};
