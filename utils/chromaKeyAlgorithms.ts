import { ChromaParams } from '../types';

// Helper to convert Hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 255, b: 0 };
};

export const applyChromaKey = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: ChromaParams
) => {
  if (!params.enabled) return;

  const frame = ctx.getImageData(0, 0, width, height);
  const l = frame.data.length / 4;
  const target = hexToRgb(params.keyColor);
  
  // Similarity threshold squared to avoid Math.sqrt in loop
  // Max distance in RGB (sqrt(255^2 * 3)) is approx 441.
  const distThreshold = params.similarity * 442;
  const distThresholdSq = distThreshold * distThreshold;
  
  // Smoothness fade range
  const smoothRange = params.smoothness * 100;

  for (let i = 0; i < l; i++) {
    const r = frame.data[i * 4 + 0];
    const g = frame.data[i * 4 + 1];
    const b = frame.data[i * 4 + 2];

    // Calculate Euclidean distance squared
    // Optimized color matching
    const dr = r - target.r;
    const dg = g - target.g;
    const db = b - target.b;
    
    // Simple RGB distance. 
    // Ideally we'd convert to YCrCb or HSL for better chroma keying, 
    // but RGB distance is faster for real-time video on CPU.
    const distSq = dr*dr + dg*dg + db*db;

    if (distSq < distThresholdSq) {
      // Full transparency
      frame.data[i * 4 + 3] = 0;
    } else if (smoothRange > 0 && distSq < distThresholdSq + (smoothRange * smoothRange)) {
       // Edge smoothing (Alpha ramp)
       // Calculate factor 0 to 1 based on how far past threshold we are
       // This is a rough approximation for speed
       const dist = Math.sqrt(distSq);
       const base = Math.sqrt(distThresholdSq);
       let alpha = (dist - base) / smoothRange;
       
       // Spill suppression: Desaturate the color if it's close to removal
       if (params.spill > 0) {
           const gray = (r * 0.299 + g * 0.587 + b * 0.114);
           frame.data[i*4] = r * (1-params.spill) + gray * params.spill;
           frame.data[i*4+1] = g * (1-params.spill) + gray * params.spill;
           frame.data[i*4+2] = b * (1-params.spill) + gray * params.spill;
       }

       frame.data[i * 4 + 3] = alpha * 255;
    }
  }
  
  ctx.putImageData(frame, 0, 0);
};