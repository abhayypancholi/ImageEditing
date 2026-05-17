import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';

export const useCanvas = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const { zoom, panX, panY, setZoom, setPan } = useUIStore();
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Keyboard handlers for space key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        canvas.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        canvas.style.cursor = 'default';
        setIsPanning(false);
      }
    };

    // Mouse handlers
    const handleMouseDown = (e: MouseEvent) => {
      if (isSpacePressed || e.button === 1) { // Space + click or middle mouse
        e.preventDefault();
        setIsPanning(true);
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPosRef.current.x;
        const deltaY = e.clientY - lastPosRef.current.y;
        
        setPan(panX + deltaX, panY + deltaY);
        
        lastPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        canvas.style.cursor = isSpacePressed ? 'grab' : 'default';
      }
    };

    // Wheel handler for zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom delta
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = zoom * delta;
        
        // Adjust pan to zoom towards mouse position
        const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
        const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);
        
        setZoom(newZoom);
        setPan(newPanX, newPanY);
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [canvasRef, zoom, panX, panY, isPanning, isSpacePressed, setZoom, setPan]);

  return { zoom, panX, panY };
};
