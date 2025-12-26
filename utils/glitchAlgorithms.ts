import { GlitchParams } from '../types';

// Helper to get random integer between min and max
const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Apply Threshold (Silhouette Effect)
export const applyThreshold = (data: Uint8ClampedArray, threshold: number) => {
  if (threshold <= 0) return;
  
  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    // Calculate average brightness
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    // Binary threshold: If brighter than threshold -> White, else -> Black
    const val = brightness >= threshold ? 255 : 0;

    data[i] = val;     // R
    data[i + 1] = val; // G
    data[i + 2] = val; // B
    // Alpha (data[i+3]) remains unchanged
  }
};

// Apply simple RGB Shift
const applyRGBShift = (data: Uint8ClampedArray, width: number, height: number, offset: number) => {
  if (offset === 0) return;
  
  // Creating a copy is expensive, but necessary for the shift to not smear recursively
  // Optimization: Only copy the RED channel? No, TypedArray copy is fast.
  const buffer = new Uint8ClampedArray(data);
  const len = data.length;
  
  for (let i = 0; i < len; i += 4) {
    const pixelIndex = i >>> 2; 
    const x = pixelIndex % width;
    const y = (pixelIndex - x) / width;
    
    const newX = (x + offset) % width;
    const newIndex = (y * width + newX) << 2; // * 4

    if (newIndex < len) {
      data[i] = buffer[newIndex]; 
    }
  }
};

const applyBlockShift = (data: Uint8ClampedArray, width: number, height: number, intensity: number, seed: number) => {
  if (intensity === 0) return;

  const numBlocks = Math.floor((intensity / 100) * 30); // Reduced max blocks for performance
  const maxBlockSize = Math.floor(width / 4);

  for (let b = 0; b < numBlocks; b++) {
    const blockW = randomInt(10, maxBlockSize);
    const blockH = randomInt(2, 50);
    
    const srcX = randomInt(0, width - blockW);
    const srcY = randomInt(0, height - blockH);
    
    const shiftX = randomInt(-50, 50);
    const shiftY = randomInt(-10, 10);
    
    const destX = Math.min(width - blockW, Math.max(0, srcX + shiftX));
    const destY = Math.min(height - blockH, Math.max(0, srcY + shiftY));

    // Optimization: Copy row by row using subarray/set for massive speedup over pixel iteration
    for (let y = 0; y < blockH; y++) {
      const srcStart = ((srcY + y) * width + srcX) * 4;
      const destStart = ((destY + y) * width + destX) * 4;
      
      // Calculate valid length to copy
      const len = blockW * 4;
      
      // Check bounds
      if (srcStart + len < data.length && destStart + len < data.length && srcStart >= 0 && destStart >= 0) {
          const rowData = data.subarray(srcStart, srcStart + len);
          data.set(rowData, destStart);
      }
    }
  }
};

const applyScanlines = (data: Uint8ClampedArray, width: number, height: number, intensity: number) => {
  if (intensity === 0) return;
  
  const lineSkip = 2 + Math.floor((10 - intensity) / 2);
  const factor = 0.5 + ((10 - intensity) / 20);
  const noiseChance = intensity * 0.01;
  
  // Optimization: Loop by ROW, not by pixel
  for (let y = 0; y < height; y++) {
    if (y % lineSkip === 0) {
       const rowStart = y * width * 4;
       const rowEnd = rowStart + (width * 4);
       
       for (let i = rowStart; i < rowEnd; i += 4) {
          data[i] = data[i] * factor;
          data[i+1] = data[i+1] * factor;
          data[i+2] = data[i+2] * factor;

          if (Math.random() < noiseChance) {
             const noise = (Math.random() - 0.5) * 50;
             data[i] += noise;
             data[i+1] += noise;
             data[i+2] += noise;
          }
       }
    }
  }
  };

const applyPixelSort = (data: Uint8ClampedArray, width: number, height: number, threshold: number) => {
  if (threshold === 0) return;
  
  const rowsToSort = Math.floor(height * (threshold / 100));
  
  for (let r = 0; r < rowsToSort; r++) {
    const y = randomInt(0, height - 1);
    const rowStart = (y * width) * 4;
    // const rowEnd = rowStart + (width * 4);
    
    // Extract pixels efficiently
    const pixels = new Int32Array(width);
    // Use a DataView or just manual calculation to pack pixels for sorting
    // Actually, simple object array is easier to read, optimizing the sort itself
    
    // Optimized: Pack RGB into single integer for sorting
    // This assumes alpha is 255 mostly, but we handle it.
    
    // 1. Read row
    const rowIndices: number[] = new Array(width);
    for(let k=0; k<width; k++) rowIndices[k] = k;

    // 2. Sort indices based on brightness
    rowIndices.sort((a, b) => {
        const idxA = rowStart + (a * 4);
        const idxB = rowStart + (b * 4);
        // Simple Brightness
        const brA = data[idxA] + data[idxA+1] + data[idxA+2];
        const brB = data[idxB] + data[idxB+1] + data[idxB+2];
        return brA - brB;
    });

    // 3. Reconstruct row in a buffer to avoid overwriting while reading
    const tempRow = new Uint8ClampedArray(width * 4);
    for (let i = 0; i < width; i++) {
        const originalIdx = rowStart + (rowIndices[i] * 4);
        const targetIdx = i * 4;
        tempRow[targetIdx] = data[originalIdx];
        tempRow[targetIdx+1] = data[originalIdx+1];
        tempRow[targetIdx+2] = data[originalIdx+2];
        tempRow[targetIdx+3] = data[originalIdx+3];
    }

    // 4. Write back
    data.set(tempRow, rowStart);
  }
}

export const processImage = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  params: GlitchParams
) => {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Order optimized for visual impact vs performance
  applyPixelSort(data, width, height, params.pixelSort);
  applyBlockShift(data, width, height, params.blockShift, params.seed);
  applyRGBShift(data, width, height, params.rgbShift);
  applyScanlines(data, width, height, params.scanlines);

  ctx.putImageData(imgData, 0, 0);
};