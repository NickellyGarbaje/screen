
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GlitchParams, AsciiParams, HalftoneParams, BlendParams, GlobalParams, TextParams, Tab, ProcessingState, ActiveLayers, AppMode, User } from './types';
import Controls from './components/Controls';
import AIPanel from './components/AIPanel';
import Auth from './components/Auth';
import Profile from './components/Profile';
import { processImage, applyThreshold } from './utils/glitchAlgorithms';
import { renderAscii } from './utils/asciiAlgorithms';
import { renderHalftone } from './utils/halftoneAlgorithms';
import { renderBlend } from './utils/blendAlgorithms';
import { renderText } from './utils/textRenderer';
import { generateAIGlitch } from './services/geminiService';
import { getCurrentUser, logoutUser, createPost } from './utils/storage';

// Default Parameters
const DEFAULT_GLOBAL: GlobalParams = {
  brightness: 1.0,
  blur: 0,
  colormatrix: 0,
  vibration: 0,
  saturation: 1.0,
  scaleX: 1.0,
  scaleY: 1.0,
  threshold: 0
};

const DEFAULT_GLITCH: GlitchParams = {
  amount: 50, seed: 12345, iterations: 1, quality: 90,
  rgbShift: 5, blockShift: 10, scanlines: 2, pixelSort: 0,
};

const NEUTRAL_GLITCH: GlitchParams = {
  amount: 0, seed: 0, iterations: 1, quality: 100,
  rgbShift: 0, blockShift: 0, scanlines: 0, pixelSort: 0,
};

const DEFAULT_ASCII: AsciiParams = {
  scale: 8, contrast: 1.2, colorMode: false, inverted: false, chars: 'complex',
  backgroundColor: '#ffffff', textColor: '#000000'
};

const DEFAULT_HALFTONE: HalftoneParams = {
  radius: 6, angle: 45, contrast: 1.2, shape: 'circle', colorMode: false,
  backgroundColor: '#ffffff', color: '#000000'
};

const DEFAULT_BLEND: BlendParams = {
  mode: 'displacement', mix: 50, threshold: 128, scale: 20
};

const DEFAULT_TEXT: TextParams = {
  content: 'SCREEN_',
  font: 'Helvetica',
  size: 20,
  x: 50,
  y: 50,
  color: '#ff0000',
  isBold: true
};

const DEFAULT_ACTIVE_LAYERS: ActiveLayers = {
  [Tab.MANUAL]: true,
  [Tab.TEXT]: false,
  [Tab.BLEND]: false,
  [Tab.ASCII]: false,
  [Tab.HALFTONE]: false,
};

// Helper to determine best video mime type
const getSupportedMimeType = () => {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')) {
    return 'video/mp4';
  }
  return 'video/webm';
};

function App() {
  // --- App Mode State ---
  const [appMode, setAppMode] = useState<AppMode>('LANDING');
  
  // Initialize lazily from storage to prevent login flicker on reload
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  
  // --- Editor State ---
  const [darkMode, setDarkMode] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null); // This holds the URL for display logic
  const [sourceType, setSourceType] = useState<'image' | 'video'>('image');
  
  const [imageSrc2, setImageSrc2] = useState<string | null>(null);
  const [blendType, setBlendType] = useState<'image' | 'video' | null>(null);

  const [globalParams, setGlobalParams] = useState<GlobalParams>(DEFAULT_GLOBAL);
  const [glitchParams, setGlitchParams] = useState<GlitchParams>(DEFAULT_GLITCH);
  const [asciiParams, setAsciiParams] = useState<AsciiParams>(DEFAULT_ASCII);
  const [halftoneParams, setHalftoneParams] = useState<HalftoneParams>(DEFAULT_HALFTONE);
  const [blendParams, setBlendParams] = useState<BlendParams>(DEFAULT_BLEND);
  const [textParams, setTextParams] = useState<TextParams>(DEFAULT_TEXT);
  
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MANUAL);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>(DEFAULT_ACTIVE_LAYERS);
  
  // Camera State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // AI Results
  const [aiImage, setAiImage] = useState<string | null>(null);
  
  const [processingState, setProcessingState] = useState<ProcessingState>({ isProcessing: false, message: '' });
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturingLoop, setIsCapturingLoop] = useState(false);
  const [isPostingVideo, setIsPostingVideo] = useState(false);

  // Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCaption, setExportCaption] = useState('');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Optimization: Single offscreen canvas for algorithms to reduce GC pressure
  const helperCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Sources
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement | null>(null); // New ref for main uploaded video
  const videoRef = useRef<HTMLVideoElement | null>(null); // For Camera/Webcam
  
  // Blend Sources
  const blendImgRef = useRef<HTMLImageElement | null>(null);
  const blendVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Animation
  const animationFrameIdRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup Refs
  const objectUrlsRef = useRef<string[]>([]);

  // --- Utility: Track and Revoke URLs to prevent memory leaks ---
  const registerUrl = (url: string) => {
    objectUrlsRef.current.push(url);
    return url;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup all URLs on unmount
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  // --- Effects ---

  // Dark Mode
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Load Initial Placeholder for Image Mode
  useEffect(() => {
    if (appMode === 'IMAGE' && !imageSrc) {
      const img = new Image();
      img.src = 'https://picsum.photos/800/600?grayscale';
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        setImageSrc(img.src);
        setSourceType('image');
        originalImgRef.current = img;
        renderCanvas();
      };
    }
  }, [appMode, imageSrc]);

  // Camera Setup
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (appMode === 'CAMERA') {
      const startCamera = async () => {
        // Stop existing tracks if any (important for switching cameras)
        if (videoRef.current && videoRef.current.srcObject) {
           const oldStream = videoRef.current.srcObject as MediaStream;
           oldStream.getTracks().forEach(track => track.stop());
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1920 }, // Prefer high resolution for better quality
              height: { ideal: 1080 },
              facingMode: facingMode
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(e => console.error("Video play error:", e));
            };
          }
        } catch (err) {
          console.error("Camera access denied:", err);
          alert("Camera access denied or failed to switch. Returning to menu.");
          setAppMode('LANDING');
        }
      };
      startCamera();
    }

    // Cleanup when leaving camera mode or switching facingMode
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [appMode, facingMode]); // Re-run when appMode or facingMode changes

  // Render Logic (Sequential Pipeline)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize Helper Canvas Once
    if (!helperCanvasRef.current) {
        helperCanvasRef.current = document.createElement('canvas');
    }
    
    // Determine Source
    let source: HTMLImageElement | HTMLVideoElement | null = null;
    
    if (appMode === 'CAMERA') {
      source = videoRef.current;
    } else if (appMode === 'IMAGE') {
      source = sourceType === 'video' ? uploadedVideoRef.current : originalImgRef.current;
    }

    // Determine if source is ready
    const isVideoReady = (source instanceof HTMLVideoElement) && (source.readyState >= 2);
    const isImageReady = (source instanceof HTMLImageElement) && (source.complete && source.naturalWidth > 0);

    if (!source || (!isVideoReady && !isImageReady)) {
      return;
    }

    // AI Mode Overrides Canvas
    if (activeTab === Tab.AI) {
      return; 
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Dimensions
    let w = (source instanceof HTMLVideoElement) ? source.videoWidth : source.width;
    let h = (source instanceof HTMLVideoElement) ? source.videoHeight : source.height;
    
    // High Quality Limit: 2K (2048px) to keep details sharp without crashing browser
    const MAX_DIM = 2048; 
    if (w > MAX_DIM || h > MAX_DIM) {
      const ratio = w / h;
      if (w > h) { w = MAX_DIM; h = MAX_DIM / ratio; } 
      else { h = MAX_DIM; w = MAX_DIM * ratio; }
    }

    // Ensure integers
    w = Math.floor(w);
    h = Math.floor(h);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // --- PIPELINE RENDERING ---
    // 1. Draw Base
    
    // Clear canvas to avoid vibration trails
    ctx.clearRect(0, 0, w, h);

    // Reset filter state to be safe
    ctx.filter = 'none';

    // Calculate Vibration
    let vibX = 0;
    let vibY = 0;
    if (globalParams.vibration > 0) {
      vibX = (Math.random() - 0.5) * globalParams.vibration;
      vibY = (Math.random() - 0.5) * globalParams.vibration;
    }

    // Apply Global Filter dynamically to ensure validity
    const filters: string[] = [];
    if (globalParams.blur > 0) filters.push(`blur(${globalParams.blur}px)`);
    if (globalParams.brightness !== 1) filters.push(`brightness(${globalParams.brightness})`);
    if (globalParams.colormatrix !== 0) filters.push(`hue-rotate(${globalParams.colormatrix}deg)`);
    if (globalParams.saturation !== 1) filters.push(`saturate(${globalParams.saturation})`);
    
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Matrix Transformation (Scale & Mirror)
    ctx.save();
    
    // Move origin to center for scaling
    ctx.translate(w / 2, h / 2);
    
    // Apply Independent Scale
    ctx.scale(globalParams.scaleX, globalParams.scaleY);
    
    // Mirror effect if using user-facing camera for natural feel
    if (appMode === 'CAMERA' && facingMode === 'user') {
      ctx.scale(-1, 1);
    } 

    // Draw Image (Offset by half dimensions to draw centered, apply vibration here)
    ctx.drawImage(source, -w / 2 + vibX, -h / 2 + vibY, w, h);

    ctx.restore();
    
    // Reset filter for subsequent layers
    ctx.filter = 'none';

    // 1.5 Apply Silhouette Threshold (if active)
    if (globalParams.threshold > 0) {
        const imgData = ctx.getImageData(0, 0, w, h);
        applyThreshold(imgData.data, globalParams.threshold);
        ctx.putImageData(imgData, 0, 0);
    }

    // 2. Blend Layer
    if (activeLayers[Tab.BLEND]) {
      const secondSource = blendType === 'video' ? blendVideoRef.current : blendImgRef.current;
      // We pass the canvas itself as the first image to blend against source2
      // We also pass the helper canvas to avoid creating new ones
      renderBlend(ctx, canvas, secondSource, w, h, blendParams, globalParams, helperCanvasRef.current);
    }
    
    // 3. Text Layer (Before corruption to allow glitching the text)
    if (activeLayers[Tab.TEXT]) {
       renderText(ctx, w, h, textParams);
    }

    // 4. Glitch Layer
    if (activeLayers[Tab.MANUAL]) {
      processImage(ctx, w, h, glitchParams);
    }

    // 5. Halftone Layer
    if (activeLayers[Tab.HALFTONE]) {
      // Pass the current canvas state as the source image for halftone calculation
      // Pass helper canvas
      renderHalftone(ctx, canvas, w, h, halftoneParams, globalParams, helperCanvasRef.current);
    }

    // 6. ASCII Layer
    if (activeLayers[Tab.ASCII]) {
      // Pass the current canvas state as the source image for ASCII calculation
      // Pass helper canvas
      renderAscii(ctx, canvas, w, h, asciiParams, globalParams, helperCanvasRef.current);
    }

  }, [appMode, sourceType, activeTab, activeLayers, glitchParams, asciiParams, halftoneParams, blendParams, textParams, blendType, globalParams, facingMode]);

  // Loop Management
  useEffect(() => {
    const shouldLoop = 
      appMode === 'CAMERA' || 
      (appMode === 'IMAGE' && sourceType === 'video') ||
      (activeLayers[Tab.BLEND] && blendType === 'video') ||
      globalParams.vibration > 0; // Loop if vibration is active to animate it
    
    const loop = () => {
      if (shouldLoop) {
        renderCanvas();
        animationFrameIdRef.current = requestAnimationFrame(loop);
      }
    };

    if (shouldLoop) {
      loop();
    }

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [appMode, sourceType, activeTab, activeLayers, blendType, renderCanvas, globalParams.vibration]); 

  // Static Image Update Trigger
  useEffect(() => {
    const isLooping = appMode === 'CAMERA' || (appMode === 'IMAGE' && sourceType === 'video') || (activeLayers[Tab.BLEND] && blendType === 'video') || globalParams.vibration > 0;
    if (appMode === 'IMAGE' && !isLooping) {
      requestAnimationFrame(renderCanvas);
    }
  }, [appMode, renderCanvas, imageSrc, activeTab, activeLayers, blendType, sourceType, globalParams]); 

  // Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        const url = registerUrl(URL.createObjectURL(file));
        setImageSrc(url);
        setSourceType('video');
        if (uploadedVideoRef.current) {
          uploadedVideoRef.current.src = url;
          uploadedVideoRef.current.play().catch(err => console.error("Source video play error", err));
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageSrc(event.target?.result as string);
          setSourceType('image');
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            originalImgRef.current = img;
            renderCanvas();
          };
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileUpload2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        const url = registerUrl(URL.createObjectURL(file));
        setImageSrc2(url); // Used to track presence
        setBlendType('video');
        if (blendVideoRef.current) {
            blendVideoRef.current.src = url;
            blendVideoRef.current.play().catch(e => console.error("Blend video play error", e));
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageSrc2(event.target?.result as string);
          setBlendType('image');
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            blendImgRef.current = img;
            if (appMode === 'IMAGE') renderCanvas();
          };
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCaptureLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas || isCapturingLoop) return;

    setIsCapturingLoop(true);

    try {
      const stream = canvas.captureStream(30); // 30 FPS
      const mimeType = getSupportedMimeType();
      // Use higher bitrate for high quality video loops (8Mbps)
      const recorder = new MediaRecorder(stream, { 
        mimeType, 
        videoBitsPerSecond: 8000000 
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = registerUrl(URL.createObjectURL(blob));
        
        // Update State to use this new video as main source
        setSourceType('video');
        setImageSrc(url);
        if (uploadedVideoRef.current) {
          uploadedVideoRef.current.src = url;
          uploadedVideoRef.current.play().catch(e => console.error("Loop play error", e));
        }
        
        // Reset state
        setIsCapturingLoop(false);
        setActiveTab(Tab.MANUAL); // Switch to manual so user can edit the result
        setAppMode('IMAGE'); // Ensure we are in image/video mode, not camera
      };

      recorder.start();
      
      // Stop after 3 seconds
      setTimeout(() => {
        recorder.stop();
      }, 3000);

    } catch (err) {
      console.error("Failed to capture loop", err);
      setIsCapturingLoop(false);
      alert("Could not capture loop.");
    }
  };

  const handleRandomize = () => {
    setGlobalParams({ 
      brightness: 0.8 + Math.random() * 0.4, 
      blur: Math.random() * 2,
      colormatrix: Math.floor(Math.random() * 360),
      vibration: Math.random() > 0.8 ? Math.random() * 20 : 0,
      saturation: 0.5 + Math.random() * 3, // Randomize saturation
      scaleX: 0.5 + Math.random() * 1.5,
      scaleY: 0.5 + Math.random() * 1.5,
      threshold: Math.random() > 0.7 ? Math.floor(Math.random() * 200) : 0
    });
    
    // Randomize active text but keep content
    setTextParams(prev => ({
        ...prev,
        x: Math.floor(Math.random() * 80) + 10,
        y: Math.floor(Math.random() * 80) + 10,
        size: Math.floor(Math.random() * 50) + 10,
        color: ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#ffff00'][Math.floor(Math.random() * 5)]
    }));

    if (activeTab === Tab.ASCII) {
      setAsciiParams(prev => ({ 
        ...prev, 
        scale: Math.floor(Math.random() * 12) + 4, 
        contrast: 0.8 + Math.random(), 
        inverted: Math.random() > 0.5,
        backgroundColor: '#ffffff',
        textColor: '#000000'
      }));
    } else if (activeTab === Tab.HALFTONE) {
      setHalftoneParams(prev => ({ 
          ...prev, 
          radius: Math.floor(Math.random() * 10) + 2, 
          angle: Math.floor(Math.random() * 90), 
          shape: Math.random() > 0.6 ? 'circle' : (Math.random() > 0.5 ? 'line' : 'diamond'),
          backgroundColor: '#ffffff',
          color: '#000000'
      }));
    } else if (activeTab === Tab.BLEND) {
      setBlendParams(prev => ({ ...prev, mix: Math.floor(Math.random() * 100), scale: Math.floor(Math.random() * 100), threshold: Math.floor(Math.random() * 255), mode: ['displacement', 'difference', 'hard-mix', 'interlace'][Math.floor(Math.random() * 4)] as any }))
    } else {
      setGlitchParams(prev => ({ ...prev, seed: Math.random() * 1000, rgbShift: Math.floor(Math.random() * 20), blockShift: Math.floor(Math.random() * 50), scanlines: Math.floor(Math.random() * 5), pixelSort: Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0 }));
    }
  };

  const handlePrintLayer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // If there is an AI image, use that
    if (activeTab === Tab.AI && aiImage) {
        const newImg = new Image();
        newImg.src = aiImage;
        newImg.onload = () => {
            originalImgRef.current = newImg;
            const url = registerUrl(aiImage); // Assuming aiImage is dataURL but treating generally
            setImageSrc(url);
            setSourceType('image');
            setAiImage(null); // Clear overlay
            setActiveTab(Tab.MANUAL);
            renderCanvas();
        };
        return;
    }

    const newImageSrc = canvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.src = newImageSrc;
    newImg.onload = () => {
      originalImgRef.current = newImg;
      // We don't revoke data URLs created by toDataURL usually, but we could if we converted to Blob
      setImageSrc(newImageSrc); 
      setSourceType('image'); // Force back to static image
      
      if (appMode === 'CAMERA') {
        if (videoRef.current && videoRef.current.srcObject) {
           (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        setAppMode('IMAGE');
      }

      if (activeTab === Tab.MANUAL) setGlitchParams(NEUTRAL_GLITCH);
      renderCanvas();
    };
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (activeTab === Tab.AI && aiImage) {
      link.download = `screen_ai_${Date.now()}.png`;
      link.href = aiImage;
    } else if (canvasRef.current) {
      link.download = `screen_${Date.now()}.png`;
      // Lossless PNG for high quality download
      link.href = canvasRef.current.toDataURL('image/png');
    }
    link.click();
    setShowExportModal(false);
  };
  
  const handlePostToProfile = async (type: 'image' | 'video') => {
    if (!currentUser) {
        setShowExportModal(false);
        setAppMode('AUTH');
        return;
    }
    
    let mediaToSave = '';

    if (type === 'video') {
         // RECORD VIDEO LOOP
         const canvas = canvasRef.current;
         if (!canvas) return;

         setIsPostingVideo(true);

         try {
             // Quick Capture
             const stream = canvas.captureStream(30);
             const mimeType = getSupportedMimeType();
             // High bitrate for video posts (10Mbps)
             const recorder = new MediaRecorder(stream, { 
               mimeType,
               videoBitsPerSecond: 10000000
             });
             const chunks: Blob[] = [];

             recorder.ondataavailable = (e) => {
                 if (e.data.size > 0) chunks.push(e.data);
             };

             recorder.onstop = async () => {
                 const blob = new Blob(chunks, { type: mimeType });
                 try {
                    const base64Data = await blobToBase64(blob);
                    
                    try {
                        createPost(currentUser, base64Data, exportCaption || 'UNTITLED SIGNAL', 'video');
                        alert("VIDEO POSTED TO NETWORK");
                        setShowExportModal(false);
                        setAppMode('PROFILE');
                    } catch(err: any) {
                        alert(err.message || "Failed to save video.");
                    }
                 } catch (e) {
                     alert("Encoding Failed");
                 } finally {
                     setIsPostingVideo(false);
                 }
             };

             recorder.start();
             // Record for 3 seconds
             setTimeout(() => {
                 recorder.stop();
             }, 3000);
         } catch(err) {
             console.error(err);
             setIsPostingVideo(false);
             alert("Video Capture Failed");
         }

         return; // Async handled above
    }
    
    // HANDLE IMAGE
    if (activeTab === Tab.AI && aiImage) {
        mediaToSave = aiImage;
    } else if (canvasRef.current) {
        // High Quality Lossless PNG for Profile Save
        mediaToSave = canvasRef.current.toDataURL('image/png');
    }
    
    if (mediaToSave) {
        try {
            createPost(currentUser, mediaToSave, exportCaption || 'UNTITLED SIGNAL', 'image');
            alert("UPLOAD COMPLETE");
            setShowExportModal(false);
            setAppMode('PROFILE');
        } catch(err: any) {
            // Note: PNGs are large, this might hit storage limits faster.
            alert(err.message || "Failed to save post. Storage might be full due to high-quality PNGs.");
        }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const stream = canvas.captureStream(30);
        const mimeType = getSupportedMimeType();
        // High quality 12Mbps recording
        const mediaRecorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 12000000 
        });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = registerUrl(URL.createObjectURL(blob));
          const a = document.createElement('a');
          a.href = url;
          const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm';
          a.download = `screen_rec_${Date.now()}.${ext}`;
          a.click();
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Recording failed", err);
        alert("Recording failed.");
      }
    }
  };

  const handleAIGenerate = async (promptModifier: string) => {
    if (activeTab !== Tab.AI) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentApiKey = process.env.API_KEY;
    if (!currentApiKey) { alert("API_KEY missing from environment."); return; }

    cancelAnimationFrame(animationFrameIdRef.current);

    setProcessingState({ isProcessing: true, message: 'PROCESSING IMAGE...' });
    setAiImage(null);

    try {
      const currentImageBase64 = canvas.toDataURL('image/png');
      const result = await generateAIGlitch(currentImageBase64, promptModifier, currentApiKey);
      setAiImage(result);
    } catch (err: any) {
      console.error(err);
      alert(`AI Processing Failed: ${err.message || 'Unknown Error'}`);
      if (appMode === 'CAMERA') renderCanvas();
    } finally {
      setProcessingState({ isProcessing: false, message: '' });
    }
  };


  // --- AUTH RENDER ---
  if (appMode === 'AUTH') {
    return (
        <div className={`flex flex-col h-screen w-full transition-colors duration-500 ${darkMode ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
             <Auth 
                onSuccess={(user) => {
                    setCurrentUser(user);
                    setAppMode('PROFILE');
                }} 
                onCancel={() => setAppMode('LANDING')}
             />
        </div>
    );
  }

  // --- PROFILE RENDER ---
  if (appMode === 'PROFILE' && currentUser) {
      return (
         <div className={`flex flex-col h-screen w-full transition-colors duration-500 overflow-y-auto ${darkMode ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
            <Profile 
                user={currentUser} 
                onLogout={() => {
                    logoutUser();
                    setCurrentUser(null);
                    setAppMode('LANDING');
                }}
                onBack={() => setAppMode('LANDING')}
                onCreate={() => setAppMode('LANDING')}
            />
         </div>
      );
  }

  // --- LANDING PAGE RENDER ---
  if (appMode === 'LANDING') {
    return (
      <div className={`flex flex-col h-screen w-full items-center justify-center font-sans transition-colors duration-500 ${darkMode ? 'dark bg-black text-white' : 'bg-white text-black'}`}>
        <div className="absolute top-6 right-6 flex gap-4">
             {currentUser ? (
                <button 
                  onClick={() => setAppMode('PROFILE')}
                  className="px-4 py-1 border border-current font-bold uppercase text-xs hover:bg-current hover:text-canvas transition-colors"
                >
                  {currentUser.username}
                </button>
             ) : (
                <button 
                  onClick={() => setAppMode('AUTH')}
                  className="px-4 py-1 border border-current font-bold uppercase text-xs hover:bg-current hover:text-canvas transition-colors"
                >
                  Login
                </button>
             )}

             <button 
                onClick={() => setDarkMode(!darkMode)}
                className="w-8 h-8 rounded-full border border-current flex items-center justify-center hover:opacity-50"
              >
                 <div className={`w-4 h-4 rounded-full bg-current ${darkMode ? 'opacity-0' : 'opacity-100'}`}></div>
              </button>
        </div>

        <div className="text-center space-y-12 animate-in fade-in duration-700">
           <div className="space-y-2">
             <h1 className="text-6xl md:text-8xl font-bold tracking-tighter">SCREEN_</h1>
             <p className="font-mono text-sm tracking-[0.5em] uppercase opacity-60">Visual Signal Processor</p>
           </div>

           <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
              <label 
                className="group w-64 h-32 border border-current flex flex-col items-center justify-center gap-4 hover:bg-current hover:text-canvas transition-all cursor-pointer"
              >
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => {
                    handleFileUpload(e);
                    setAppMode('IMAGE');
                  }} 
                  className="hidden" 
                />
                <span className="text-2xl font-bold uppercase tracking-wider group-hover:scale-110 transition-transform">Upload</span>
                <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100">Image or Video</span>
              </label>

              <button 
                onClick={() => setAppMode('CAMERA')}
                className="group w-64 h-32 border border-current flex flex-col items-center justify-center gap-4 hover:bg-current hover:text-canvas transition-all"
              >
                 <span className="text-2xl font-bold uppercase tracking-wider group-hover:scale-110 transition-transform">Camera</span>
                 <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100">Live Video Datamosh</span>
              </button>
           </div>

           <div className="fixed bottom-6 text-[10px] font-mono opacity-40">
              EST. 2025 // SYSTEM READY
           </div>
        </div>
      </div>
    );
  }

  // --- EDITOR RENDER ---
  return (
    <div className="flex flex-col h-screen w-full font-sans text-sm selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Hidden Video Elements */}
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />
      <video ref={uploadedVideoRef} className="hidden" muted loop playsInline autoPlay crossOrigin="anonymous"/>
      <video ref={blendVideoRef} className="hidden" muted loop playsInline autoPlay crossOrigin="anonymous"/>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-current bg-canvas z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setAppMode('LANDING')} className="font-bold text-lg tracking-tighter hover:opacity-50 transition-opacity">
            SCREEN_
          </button>
          <span className="text-[10px] uppercase border px-1 border-current opacity-70">
            {appMode} MODE
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-4 mr-4">
             {[Tab.MANUAL, Tab.TEXT, Tab.BLEND, Tab.ASCII, Tab.HALFTONE, Tab.AI].map(tab => (
               <button
                key={tab}
                onClick={() => {
                   setActiveTab(tab);
                }}
                className={`uppercase text-xs font-bold tracking-wider hover:underline underline-offset-4 ${activeTab === tab ? 'underline' : 'opacity-50'}`}
               >
                 {tab}
               </button>
             ))}
          </div>
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="w-6 h-6 rounded-full border border-current flex items-center justify-center overflow-hidden hover:opacity-50 transition-opacity"
          >
             <div className={`w-3 h-3 rounded-full bg-current ${darkMode ? 'opacity-0' : 'opacity-100'}`}></div>
          </button>

          {activeTab !== Tab.AI && (
             <button onClick={handlePrintLayer} className="uppercase text-xs border border-current px-3 py-1 hover:bg-current hover:text-canvas transition-colors">
               {appMode === 'CAMERA' ? 'Snapshot' : 'Layer'}
             </button>
          )}

          {activeTab === Tab.AI && aiImage && (
             <button onClick={handlePrintLayer} className="uppercase text-xs border border-current px-3 py-1 hover:bg-current hover:text-canvas transition-colors animate-pulse">
               Use Result as Layer
             </button>
          )}

           {activeTab !== Tab.AI && (
            <button onClick={toggleRecording} className={`uppercase text-xs border border-current px-3 py-1 hover:bg-current hover:text-canvas transition-colors ${isRecording ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : ''}`}>
              {isRecording ? 'Stop' : 'Rec'}
            </button>
          )}

          {/* Unified Export Button - Solid Style for Visibility */}
          <button 
            onClick={() => setShowExportModal(true)} 
            className="uppercase text-xs border border-current px-6 py-2 bg-current text-canvas font-bold tracking-widest hover:opacity-80 transition-opacity shadow-[4px_4px_0px_0px_currentColor] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            Export Signal
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-grow flex overflow-hidden">
        
        {/* Left: Viewport */}
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#111] relative">
          
          <div className="relative border border-current shadow-xl bg-black">
             {(appMode === 'IMAGE' && !imageSrc) && (
               <div className="w-[400px] h-[300px] flex items-center justify-center border-dashed border-2 border-white opacity-30 text-white">
                 <span className="uppercase tracking-widest">No Signal</span>
               </div>
             )}
             
             {/* Main Canvas */}
             <canvas 
               ref={canvasRef} 
               className={`max-w-full max-h-[75vh] block ${activeTab === Tab.AI && aiImage ? 'hidden' : 'block'}`}
             />

             {/* AI Image Overlay */}
             {activeTab === Tab.AI && aiImage && (
               <img 
                 src={aiImage} 
                 alt="AI Result" 
                 className="max-w-full max-h-[75vh] block"
               />
             )}
          </div>

          {/* Footer controls for viewport */}
          <div className="absolute bottom-6 left-6 flex gap-4">
            {appMode === 'IMAGE' && (
              <label className="cursor-pointer uppercase text-xs font-bold border-b border-current pb-1 hover:opacity-50 transition-opacity">
                + Change Image / Video
                <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
            
            {appMode === 'CAMERA' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                   <span className="text-xs uppercase font-bold opacity-70">LIVE SIGNAL</span>
                </div>
                
                <button 
                  onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="cursor-pointer uppercase text-xs font-bold border-b border-current pb-1 hover:opacity-50 transition-opacity"
                >
                  ↻ Switch Cam
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <aside className="w-80 flex-shrink-0 border-l border-current overflow-y-auto bg-canvas">
           {activeTab === Tab.AI ? (
             <AIPanel 
               onGenerate={handleAIGenerate} 
               processingState={processingState} 
             />
           ) : (
             <Controls 
               activeTab={activeTab}
               activeLayers={activeLayers}
               glitchParams={glitchParams} 
               asciiParams={asciiParams}
               halftoneParams={halftoneParams}
               blendParams={blendParams}
               globalParams={globalParams}
               textParams={textParams}
               onGlitchChange={setGlitchParams} 
               onAsciiChange={setAsciiParams}
               onHalftoneChange={setHalftoneParams}
               onBlendChange={setBlendParams}
               onGlobalChange={setGlobalParams}
               onTextChange={setTextParams}
               onToggleLayer={(tab) => setActiveLayers(prev => ({...prev, [tab]: !prev[tab]}))}
               onRandomize={handleRandomize}
               onUploadSecondImage={handleFileUpload2}
               hasSecondImage={!!imageSrc2 || !!blendImgRef.current || !!blendVideoRef.current}
               onCaptureLoop={handleCaptureLoop}
               isCapturingLoop={isCapturingLoop}
             />
           )}
        </aside>

      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="w-[400px] bg-canvas border border-current p-8 shadow-2xl">
              <h2 className="text-xl font-bold uppercase tracking-tighter mb-6">Export Signal</h2>
              
              <div className="mb-6">
                 <input 
                   type="text"
                   value={exportCaption}
                   onChange={(e) => setExportCaption(e.target.value)}
                   placeholder="ADD CAPTION (OPTIONAL)..."
                   className="w-full bg-transparent border-b-2 border-current p-2 font-mono text-sm focus:outline-none placeholder:opacity-50"
                 />
              </div>

              <div className="space-y-4">
                 <button 
                   onClick={handleDownload}
                   className="w-full py-4 border border-current text-sm font-bold uppercase tracking-widest hover:bg-current hover:text-canvas transition-colors flex items-center justify-center gap-3"
                 >
                   <span>↓ Download High Quality PNG</span>
                 </button>
                 
                 <div className="relative space-y-2">
                    <button 
                       onClick={() => handlePostToProfile('image')}
                       className="w-full py-4 border border-current text-sm font-bold uppercase tracking-widest hover:bg-current hover:text-canvas transition-colors flex items-center justify-center gap-3"
                    >
                       <span>🌐 Publish High Quality PNG</span>
                    </button>

                    {/* Post Video Option (Only if video source is active) */}
                    {(appMode === 'CAMERA' || sourceType === 'video') && (
                        <button 
                            onClick={() => handlePostToProfile('video')}
                            disabled={isPostingVideo}
                            className={`w-full py-4 border border-current text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-3 ${
                                isPostingVideo 
                                ? 'bg-red-600 text-white animate-pulse border-red-600' 
                                : 'hover:bg-red-600 hover:text-white hover:border-red-600'
                            }`}
                        >
                            <span>{isPostingVideo ? 'RECORDING 3S LOOP...' : '📹 Publish 3s High Quality Loop'}</span>
                        </button>
                    )}

                    {!currentUser && (
                       <div className="text-[9px] font-mono text-center mt-1 opacity-60">
                          (REQUIRES LOGIN)
                       </div>
                    )}
                 </div>
              </div>

              <button 
                onClick={() => setShowExportModal(false)}
                className="mt-6 w-full text-xs font-mono uppercase opacity-50 hover:opacity-100"
              >
                Cancel
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
