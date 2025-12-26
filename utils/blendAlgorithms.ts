import { BlendParams, GlobalParams } from '../types';

export const renderBlend = (
  ctx: CanvasRenderingContext2D,
  img1: CanvasImageSource,
  img2: HTMLImageElement | HTMLVideoElement | null,
  width: number,
  height: number,
  params: BlendParams,
  globalParams: GlobalParams,
  helperCanvas?: HTMLCanvasElement
) => {
  // Optimization: Instead of creating a new canvas every frame, we assume img1 is already drawn on ctx by the parent
  // We just need to read it. But since we need to apply filters, we do need a temp pass.
  
  // 1. Snapshot current state (Base Image)
  // If img1 is the canvas itself, we can grab it.
  const srcData = ctx.getImageData(0, 0, width, height);
  const targetData = srcData.data;

  if (!img2) return;

  // 2. Get Data for Blend Image (img2)
  // Create a small temp canvas only to resize img2 to match dimensions
  const offCanvas = helperCanvas || document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  offCtx.drawImage(img2, 0, 0, width, height);
  const blendData = offCtx.getImageData(0, 0, width, height).data;

  const len = targetData.length;
  const mix = params.mix / 100;
  
  // Pre-calculate common variables
  const displacementScale = params.scale * 2;
  const thresh = params.threshold;
  const mix255 = mix * 255;
  const rowHeight = Math.max(1, Math.floor(params.scale / 10));

  // ALGORITHMS
  if (params.mode === 'displacement') {
    // Buffer strictly needed for displacement to avoid self-referential tearing
    const buffer = new Uint8ClampedArray(targetData);

    for (let i = 0; i < len; i += 4) {
      // Calculate brightness of blend image at this pixel
      const br = blendData[i];
      // Optimization: Skip G/B if not needed, or use them for Y
      
      const shiftX = Math.floor(((br / 127.5) - 1) * displacementScale);
      const shiftY = Math.floor(((blendData[i+1] / 127.5) - 1) * displacementScale);

      // Fast coordinate mapping
      const pixelIndex = i >>> 2; // i / 4
      const x = pixelIndex % width;
      const y = (pixelIndex - x) / width; // Integer division optimization

      let srcX = x + shiftX;
      let srcY = y + shiftY;

      // Clamp
      if (srcX < 0) srcX = 0; else if (srcX >= width) srcX = width - 1;
      if (srcY < 0) srcY = 0; else if (srcY >= height) srcY = height - 1;

      const srcIdx = (srcY * width + srcX) << 2; // * 4

      if (Math.random() > (1 - mix)) {
         targetData[i] = buffer[srcIdx];
         targetData[i+1] = buffer[srcIdx+1];
         targetData[i+2] = buffer[srcIdx+2];
      }
    }
  } 
  else if (params.mode === 'difference') {
    // Loop unrolled slightly via logic
    if (mix > 0) {
        for (let i = 0; i < len; i += 4) {
          if (Math.random() < mix) { 
             targetData[i] = Math.abs(targetData[i] - blendData[i]);
             targetData[i+1] = Math.abs(targetData[i+1] - blendData[i+1]);
             targetData[i+2] = Math.abs(targetData[i+2] - blendData[i+2]);
          }
        }
    }
  }
  else if (params.mode === 'hard-mix') {
    for (let i = 0; i < len; i += 4) {
       const r = (targetData[i] + blendData[i]) >> 1; // / 2
       const g = (targetData[i+1] + blendData[i+1]) >> 1;
       const b = (targetData[i+2] + blendData[i+2]) >> 1;
       
       targetData[i] = r > thresh ? Math.min(255, r + mix255) : Math.max(0, r - mix255);
       targetData[i+1] = g > thresh ? Math.min(255, g + mix255) : Math.max(0, g - mix255);
       targetData[i+2] = b > thresh ? Math.min(255, b + mix255) : Math.max(0, b - mix255);
    }
  }
  else if (params.mode === 'interlace') {
     for (let y = 0; y < height; y++) {
         const useImg2 = Math.floor(y / rowHeight) % 2 === 0;
         if (useImg2 && mix > 0.1) {
             const rowStart = y * width * 4;
             const rowEnd = rowStart + (width * 4);
             // Memory copy for whole row is faster than pixel loop
             // targetData is Uint8ClampedArray, we can use set method if we have views, 
             // but loop is fine here.
             for (let j = rowStart; j < rowEnd; j++) {
                 targetData[j] = blendData[j];
             }
         }
     }
  }

  ctx.putImageData(srcData, 0, 0);
};