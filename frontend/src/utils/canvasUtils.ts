export const drawCheckerboard = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  squareSize: number = 12
): void => {
  const color1 = '#2a2a2a';
  const color2 = '#1a1a1a';

  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
      ctx.fillStyle = isEven ? color1 : color2;
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }
};

export const drawImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  zoom: number,
  panX: number,
  panY: number,
  canvasWidth: number,
  canvasHeight: number
): void => {
  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw checkerboard background
  drawCheckerboard(ctx, canvasWidth, canvasHeight);

  // Enable smooth scaling for zoomed out images
  ctx.imageSmoothingEnabled = zoom < 1;
  ctx.imageSmoothingQuality = 'high';

  // Calculate scaled dimensions
  const scaledWidth = image.width * zoom;
  const scaledHeight = image.height * zoom;

  // Draw image
  ctx.drawImage(image, panX, panY, scaledWidth, scaledHeight);
};

export const screenToImageCoords = (
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  zoom: number,
  panX: number,
  panY: number,
  imageWidth: number,
  imageHeight: number,
  canvasElement?: HTMLCanvasElement
): { x: number; y: number; canvasX: number; canvasY: number } => {
  // CSS pixels relative to canvas element
  const cssX = screenX - canvasRect.left;
  const cssY = screenY - canvasRect.top;

  let canvasX = cssX;
  let canvasY = cssY;

  // If canvas element provided, account for bitmap size vs CSS size
  if (canvasElement) {
    const scaleX = canvasElement.width / canvasRect.width;
    const scaleY = canvasElement.height / canvasRect.height;
    canvasX = cssX * scaleX;
    canvasY = cssY * scaleY;
  }

  // Image-space coordinates (accounting for zoom and pan)
  const imageX = Math.floor((canvasX - panX) / zoom);
  const imageY = Math.floor((canvasY - panY) / zoom);

  // Clamped to image bounds
  return {
    x: Math.max(0, Math.min(imageWidth - 1, imageX)),
    y: Math.max(0, Math.min(imageHeight - 1, imageY)),
    canvasX,
    canvasY,
  };
};

export const calculateFitToScreen = (
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 32
): { zoom: number; panX: number; panY: number } => {
  const availableW = canvasWidth - padding * 2;
  const availableH = canvasHeight - padding * 2;

  const scaleX = availableW / imageWidth;
  const scaleY = availableH / imageHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  const zoom = Math.abs(scale - 1) < 0.02 ? 1 : scale;

  return {
    zoom,
    panX: (canvasWidth - imageWidth * zoom) / 2,
    panY: (canvasHeight - imageHeight * zoom) / 2,
  };
};