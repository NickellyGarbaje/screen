import { TextParams } from '../types';

export const renderText = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: TextParams
) => {
  if (!params.content) return;

  ctx.save();
  
  // Map internal font names to CSS font strings
  let fontStack = 'sans-serif';
  if (params.font === 'Helvetica') fontStack = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  if (params.font === 'Comic Sans MS') fontStack = '"Comic Sans MS", "Comic Sans", cursive';
  if (params.font === 'Arial') fontStack = 'Arial, sans-serif';

  const fontSize = (params.size / 100) * (height * 0.5); // Size relative to canvas height roughly
  const fontWeight = params.isBold ? 'bold' : 'normal';

  ctx.font = `${fontWeight} ${Math.max(10, fontSize)}px ${fontStack}`;
  ctx.fillStyle = params.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const xPos = (params.x / 100) * width;
  const yPos = (params.y / 100) * height;

  // Add a slight blend mode for better integration if desired, 
  // currently using source-over (default)
  ctx.fillText(params.content, xPos, yPos);

  ctx.restore();
};