
import { AsciiParams, GlobalParams } from '../types';

const CHAR_SETS = {
  simple: " .:-=+*#%@",
  complex: " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█"
};

export const renderAscii = (
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource, 
  width: number,
  height: number,
  params: AsciiParams,
  globalParams: GlobalParams,
  helperCanvas?: HTMLCanvasElement // Optional helper canvas for performance
) => {
  // Use helper if provided, otherwise create (fallback for safety)
  const offCanvas = helperCanvas || document.createElement('canvas');
  // Setting dimensions clears the canvas automatically
  offCanvas.width = width;
  offCanvas.height = height;
  
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;

  const fontWidth = params.scale;
  const fontHeight = params.scale * 1.6;
  
  const cols = Math.floor(width / fontWidth);
  const rows = Math.floor(height / fontHeight);

  if (cols <= 0 || rows <= 0) return;

  offCtx.drawImage(img, 0, 0, cols, rows);
  const data = offCtx.getImageData(0, 0, cols, rows).data;

  // 2. Clear Main Canvas
  // Using user defined colors
  let bgColor = params.backgroundColor || '#ffffff';
  let textColor = params.textColor || '#000000';

  if (params.inverted) {
      // Swap BG and Text color if inverted
      [bgColor, textColor] = [textColor, bgColor];
  }

  // Draw background solid color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 3. Configure Font
  // Using standard monospace
  ctx.font = `bold ${params.scale}px "Courier New", monospace`;
  ctx.textBaseline = 'top';

  // @ts-ignore
  const chars = CHAR_SETS[params.chars] || CHAR_SETS.simple;
  const charLen = chars.length;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      brightness = (brightness - 0.5) * params.contrast + 0.5;
      brightness = Math.max(0, Math.min(1, brightness));

      /**
       * Mapping Logic:
       * By default, we want bright areas to be "blank" (index 0 which is ' ').
       * So we use (1 - brightness) to invert the mapping.
       * Bright (1.0) -> index 0 (' ')
       * Dark (0.0) -> index len-1 ('@')
       */
      const charIndex = Math.floor((1 - brightness) * (charLen - 1));
      const char = chars[charIndex];

      if (params.colorMode) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        ctx.fillStyle = textColor;
      }

      ctx.fillText(char, x * fontWidth, y * fontHeight);
    }
  }
};
