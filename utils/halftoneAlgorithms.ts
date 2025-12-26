import { HalftoneParams, GlobalParams } from '../types';

export const renderHalftone = (
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource, 
  width: number,
  height: number,
  params: HalftoneParams,
  globalParams: GlobalParams,
  helperCanvas?: HTMLCanvasElement
) => {
  const offCanvas = helperCanvas || document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return;
  
  offCtx.drawImage(img, 0, 0, width, height);
  const imgData = offCtx.getImageData(0, 0, width, height).data;

  // Background
  ctx.fillStyle = params.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const radian = (params.angle * Math.PI) / 180;
  const sin = Math.sin(radian);
  const cos = Math.cos(radian);

  const step = params.radius * 1.5; 

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radian);
  ctx.translate(-width / 2, -height / 2);

  const extra = Math.max(width, height); 
  
  for (let y = -extra; y < height + extra; y += step) {
    for (let x = -extra; x < width + extra; x += step) {
      
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      
      const srcX = Math.floor(dx * cos + dy * sin + cx);
      const srcY = Math.floor(dy * cos - dx * sin + cy);

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const i = (srcY * width + srcX) * 4;
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        
        let brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        brightness = (brightness - 0.5) * params.contrast + 0.5;
        brightness = Math.max(0, Math.min(1, brightness));
        
        const size = (1 - brightness) * params.radius;

        if (size > 0.5) {
            if (params.colorMode) {
               ctx.fillStyle = `rgb(${r},${g},${b})`;
            } else {
               ctx.fillStyle = params.color || '#000000';
            }

            ctx.beginPath();
            if (params.shape === 'circle') {
                ctx.arc(x, y, size, 0, Math.PI * 2);
            } else if (params.shape === 'diamond') {
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size, y);
                ctx.lineTo(x, y + size);
                ctx.lineTo(x - size, y);
            } else if (params.shape === 'line') {
                ctx.rect(x - params.radius/2, y - size, params.radius, size * 2);
            }
            ctx.fill();
        }
      }
    }
  }
  ctx.restore();
};