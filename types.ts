
export interface GlobalParams {
  brightness: number;
  blur: number;
  colormatrix: number; // Hue rotation in degrees
  vibration: number;   // Shake intensity
  saturation: number;  // Color saturation intensity
  scaleX: number;      // Horizontal Scale
  scaleY: number;      // Vertical Scale
  threshold: number;   // 0-255, 0 is disabled. Controls Silhouette effect.
}

export interface GlitchParams {
  amount: number;
  seed: number;
  iterations: number;
  quality: number;
  rgbShift: number;
  blockShift: number;
  scanlines: number;
  pixelSort: number;
}

export interface AsciiParams {
  scale: number;
  contrast: number;
  colorMode: boolean;
  inverted: boolean;
  chars: string;
  backgroundColor: string;
  textColor: string;
}

export interface HalftoneParams {
  radius: number;
  angle: number;
  contrast: number;
  shape: 'circle' | 'line' | 'diamond';
  colorMode: boolean;
  backgroundColor: string;
  color: string;
}

export interface BlendParams {
  mode: 'displacement' | 'difference' | 'hard-mix' | 'interlace';
  mix: number;
  threshold: number;
  scale: number;
}

export interface TextParams {
  content: string;
  font: 'Helvetica' | 'Comic Sans MS' | 'Arial';
  size: number;
  x: number;
  y: number;
  color: string;
  isBold: boolean;
}

export interface ChromaParams {
  enabled: boolean;
  keyColor: string;
  similarity: number;
  smoothness: number;
  spill: number;
}

export enum Tab {
  MANUAL = 'MANUAL',
  TEXT = 'TEXT',
  BLEND = 'BLEND',
  ASCII = 'ASCII',
  HALFTONE = 'HALFTONE',
  AI = 'AI'
}

export interface ActiveLayers {
  [Tab.MANUAL]: boolean;
  [Tab.TEXT]: boolean;
  [Tab.BLEND]: boolean;
  [Tab.ASCII]: boolean;
  [Tab.HALFTONE]: boolean;
}

export interface ProcessingState {
  isProcessing: boolean;
  message: string;
}

// --- Social Features ---

export interface User {
  username: string;
  joinedAt: string;
  avatar?: string; // Base64 or generated
}

export interface Post {
  id: string;
  username: string;
  image: string; // Base64 data (Image or Video Data URL)
  type: 'image' | 'video'; // New field
  caption: string;
  timestamp: number;
  likes: number;
}

export type AppMode = 'LANDING' | 'IMAGE' | 'CAMERA' | 'AUTH' | 'PROFILE';