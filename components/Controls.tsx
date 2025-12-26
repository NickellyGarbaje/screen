import React from 'react';
import { GlitchParams, AsciiParams, HalftoneParams, BlendParams, GlobalParams, TextParams, Tab, ActiveLayers } from '../types';

interface ControlsProps {
  activeTab: Tab;
  activeLayers: ActiveLayers;
  glitchParams: GlitchParams;
  asciiParams: AsciiParams;
  halftoneParams: HalftoneParams;
  blendParams: BlendParams;
  globalParams: GlobalParams;
  textParams: TextParams;
  onGlitchChange: (newParams: GlitchParams) => void;
  onAsciiChange: (newParams: AsciiParams) => void;
  onHalftoneChange: (newParams: HalftoneParams) => void;
  onBlendChange: (newParams: BlendParams) => void;
  onGlobalChange: (newParams: GlobalParams) => void;
  onTextChange: (newParams: TextParams) => void;
  onToggleLayer: (tab: Tab) => void;
  onRandomize: () => void;
  onUploadSecondImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasSecondImage: boolean;
  onCaptureLoop: () => void;
  isCapturingLoop: boolean;
}

const Slider = ({ label, value, min, max, onChange, unit = "", step = 1 }: { 
  label: string, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void,
  unit?: string,
  step?: number
}) => (
  <div className="mb-5">
    <div className="flex justify-between mb-1 text-[10px] uppercase font-bold tracking-wider opacity-70">
      <label>{label}</label>
      <span className="font-mono">{value?.toFixed(2)}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
  </div>
);

const Section = ({ title, children, isActive, onToggle }: { title: string, children?: React.ReactNode, isActive?: boolean, onToggle?: () => void }) => (
  <div className="mb-8 border-b border-current pb-6 last:border-0 animate-in fade-in duration-300">
    <div className="flex items-center justify-between mb-4">
       <h3 className="text-xs uppercase font-bold tracking-widest">{title}</h3>
       {onToggle && (
         <button 
           onClick={onToggle}
           className={`w-8 h-4 rounded-full border border-current flex items-center px-0.5 transition-colors ${isActive ? 'bg-current' : 'bg-transparent'}`}
         >
           <div className={`w-2.5 h-2.5 rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'bg-canvas translate-x-4' : 'bg-current translate-x-0'}`}></div>
         </button>
       )}
    </div>
    {children}
  </div>
);

const Controls: React.FC<ControlsProps> = ({ 
  activeTab, 
  activeLayers,
  glitchParams, 
  asciiParams,
  halftoneParams,
  blendParams,
  globalParams,
  textParams,
  onGlitchChange, 
  onAsciiChange,
  onHalftoneChange,
  onBlendChange,
  onGlobalChange,
  onTextChange,
  onToggleLayer,
  onRandomize,
  onUploadSecondImage,
  hasSecondImage,
  onCaptureLoop,
  isCapturingLoop
}) => {
  
  const updateGlitch = (key: keyof GlitchParams, value: number) => {
    onGlitchChange({ ...glitchParams, [key]: value });
  };

  const updateAscii = (key: keyof AsciiParams, value: any) => {
    onAsciiChange({ ...asciiParams, [key]: value });
  };

  const updateHalftone = (key: keyof HalftoneParams, value: any) => {
    onHalftoneChange({ ...halftoneParams, [key]: value });
  };

  const updateBlend = (key: keyof BlendParams, value: any) => {
    onBlendChange({ ...blendParams, [key]: value });
  }

  const updateGlobal = (key: keyof GlobalParams, value: any) => {
    onGlobalChange({ ...globalParams, [key]: value });
  }

  const updateText = (key: keyof TextParams, value: any) => {
    onTextChange({ ...textParams, [key]: value });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold tracking-tighter uppercase">Parameters</h2>
        <button 
          onClick={onRandomize}
          className="text-[10px] uppercase border border-current px-2 py-1 hover:bg-current hover:text-canvas transition-colors"
        >
          Random
        </button>
      </div>

      {/* Global Signal Controls - Always Visible */}
      <Section title="Global Signal">
         <Slider label="Input Brightness" value={globalParams.brightness} min={0} max={2} step={0.1} onChange={(v) => updateGlobal('brightness', v)} />
         <Slider label="Silhouette (B/W)" value={globalParams.threshold} min={0} max={255} onChange={(v) => updateGlobal('threshold', v)} />
         <Slider label="Input Blur" value={globalParams.blur} min={0} max={20} onChange={(v) => updateGlobal('blur', v)} unit="px"/>
         
         <div className="grid grid-cols-2 gap-4">
             <Slider label="Scale X" value={globalParams.scaleX} min={0.5} max={3.0} step={0.1} onChange={(v) => updateGlobal('scaleX', v)} />
             <Slider label="Scale Y" value={globalParams.scaleY} min={0.5} max={3.0} step={0.1} onChange={(v) => updateGlobal('scaleY', v)} />
         </div>

         <Slider label="Color Matrix" value={globalParams.colormatrix} min={0} max={360} onChange={(v) => updateGlobal('colormatrix', v)} unit="°"/>
         <Slider label="Color Vibration" value={globalParams.saturation} min={0} max={3} step={0.1} onChange={(v) => updateGlobal('saturation', v)} />
         <Slider label="Vibration (Shake)" value={globalParams.vibration} min={0} max={100} onChange={(v) => updateGlobal('vibration', v)} unit="px"/>
      </Section>

      {/* Text Layer */}
      {activeTab === Tab.TEXT && (
        <Section 
          title="Text Layer" 
          isActive={activeLayers[Tab.TEXT]} 
          onToggle={() => onToggleLayer(Tab.TEXT)}
        >
          <div className={`transition-opacity duration-300 ${activeLayers[Tab.TEXT] ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
             <div className="mb-4">
               <label className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-2">Content</label>
               <input 
                 type="text" 
                 value={textParams.content} 
                 onChange={(e) => updateText('content', e.target.value)}
                 className="w-full bg-transparent border border-current p-2 font-mono text-xs focus:outline-none"
                 placeholder="TYPE HERE..."
               />
             </div>

             <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-2">Font Family</label>
                <div className="flex flex-col gap-1">
                  {['Helvetica', 'Arial', 'Comic Sans MS'].map((font) => (
                    <button 
                      key={font}
                      onClick={() => updateText('font', font)}
                      className={`text-left text-[10px] uppercase py-2 px-2 border border-current transition-colors ${textParams.font === font ? 'bg-current text-canvas' : ''}`}
                    >
                      {font}
                    </button>
                  ))}
                </div>
             </div>

             <Slider label="Size" value={textParams.size} min={5} max={100} onChange={(v) => updateText('size', v)} />
             
             <div className="grid grid-cols-2 gap-4">
               <Slider label="Pos X" value={textParams.x} min={0} max={100} onChange={(v) => updateText('x', v)} unit="%"/>
               <Slider label="Pos Y" value={textParams.y} min={0} max={100} onChange={(v) => updateText('y', v)} unit="%"/>
             </div>

             <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 border border-current p-1 relative">
                     <input type="color" value={textParams.color} onChange={(e) => updateText('color', e.target.value)} className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" />
                     <div className="w-full h-full" style={{backgroundColor: textParams.color}}></div>
                  </div>
                  <span className="text-[10px] uppercase font-bold">Color</span>
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer gap-2">
                  <span className="uppercase opacity-70">Bold</span>
                  <input type="checkbox" checked={textParams.isBold} onChange={(e) => updateText('isBold', e.target.checked)} className="accent-current" />
                </label>
             </div>
          </div>
        </Section>
      )}

      {/* Blend Layer */}
      {activeTab === Tab.BLEND && (
        <Section 
          title="Blend Layer" 
          isActive={activeLayers[Tab.BLEND]} 
          onToggle={() => onToggleLayer(Tab.BLEND)}
        >
           <div className={`transition-opacity duration-300 ${activeLayers[Tab.BLEND] ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
             <div className="mb-6">
               <label className="block w-full cursor-pointer border border-dashed border-current p-4 text-center hover:bg-current hover:text-canvas transition-colors mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest">
                    {hasSecondImage ? "Replace Source 2" : "Upload Source 2"}
                  </span>
                  <input type="file" accept="image/*,video/*" onChange={onUploadSecondImage} className="hidden" />
               </label>
               {!hasSecondImage && <p className="text-[9px] opacity-60 text-center">Required for blend effects</p>}
             </div>

             {hasSecondImage && (
              <>
                <div className="mb-6">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-2">Algorithm</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['displacement', 'difference', 'hard-mix', 'interlace'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateBlend('mode', mode)}
                        className={`py-2 text-[9px] uppercase border border-current transition-colors ${
                          blendParams.mode === mode ? 'bg-current text-canvas' : ''
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <Slider 
                  label="Mix / Intensity" 
                  value={blendParams.mix} 
                  min={0} 
                  max={100} 
                  onChange={(v) => updateBlend('mix', v)} 
                  unit="%"
                />
                
                {blendParams.mode === 'displacement' && (
                  <Slider 
                    label="Distort Scale" 
                    value={blendParams.scale} 
                    min={0} 
                    max={100} 
                    onChange={(v) => updateBlend('scale', v)} 
                  />
                )}

                {blendParams.mode === 'hard-mix' && (
                   <Slider 
                    label="Threshold" 
                    value={blendParams.threshold} 
                    min={0} 
                    max={255} 
                    onChange={(v) => updateBlend('threshold', v)} 
                  />
                )}

                {blendParams.mode === 'interlace' && (
                   <Slider 
                    label="Line Height" 
                    value={blendParams.scale} 
                    min={2} 
                    max={100} 
                    onChange={(v) => updateBlend('scale', v)} 
                    unit="px"
                  />
                )}
              </>
             )}
           </div>
        </Section>
      )}

      {activeTab === Tab.ASCII && (
        <Section 
          title="ASCII Layer" 
          isActive={activeLayers[Tab.ASCII]} 
          onToggle={() => onToggleLayer(Tab.ASCII)}
        >
          <div className={`transition-opacity duration-300 ${activeLayers[Tab.ASCII] ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
            <Slider label="Resolution" value={asciiParams.scale} min={4} max={24} onChange={(v) => updateAscii('scale', v)} unit="px"/>
            <Slider label="Contrast" value={asciiParams.contrast} min={0.5} max={3} step={0.1} onChange={(v) => updateAscii('contrast', v)} />
          
            <div className="mt-6">
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="uppercase opacity-70">Color Print</span>
                  <input type="checkbox" checked={asciiParams.colorMode} onChange={(e) => updateAscii('colorMode', e.target.checked)} className="accent-current" />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="uppercase opacity-70">Invert Colors</span>
                  <input type="checkbox" checked={asciiParams.inverted} onChange={(e) => updateAscii('inverted', e.target.checked)} className="accent-current" />
                </label>

                {/* New Color Controls */}
                 <div className="flex items-center justify-between mt-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-8 h-8 border border-current p-1 relative">
                         <input type="color" value={asciiParams.backgroundColor || '#ffffff'} onChange={(e) => updateAscii('backgroundColor', e.target.value)} className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" />
                         <div className="w-full h-full" style={{backgroundColor: asciiParams.backgroundColor || '#ffffff'}}></div>
                      </div>
                      <span className="text-[10px] uppercase font-bold">BG Color</span>
                   </label>
                   
                   <label className={`flex items-center gap-2 cursor-pointer ${asciiParams.colorMode ? 'opacity-30 pointer-events-none' : ''}`}>
                      <div className="w-8 h-8 border border-current p-1 relative">
                         <input type="color" value={asciiParams.textColor || '#000000'} onChange={(e) => updateAscii('textColor', e.target.value)} className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" />
                         <div className="w-full h-full" style={{backgroundColor: asciiParams.textColor || '#000000'}}></div>
                      </div>
                      <span className="text-[10px] uppercase font-bold">Text Color</span>
                   </label>
                </div>

              </div>
              <div className="flex gap-2 mt-6">
                {['simple', 'complex', 'blocks'].map((set) => (
                  <button
                    key={set}
                    onClick={() => updateAscii('chars', set)}
                    className={`flex-1 py-1 text-[10px] uppercase border border-current transition-colors ${asciiParams.chars === set ? 'bg-current text-canvas' : ''}`}
                  >
                    {set}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {activeTab === Tab.HALFTONE && (
         <Section 
            title="Halftone Layer" 
            isActive={activeLayers[Tab.HALFTONE]} 
            onToggle={() => onToggleLayer(Tab.HALFTONE)}
         >
            <div className={`transition-opacity duration-300 ${activeLayers[Tab.HALFTONE] ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
              <Slider label="Dot Size" value={halftoneParams.radius} min={2} max={30} onChange={(v) => updateHalftone('radius', v)} unit="px"/>
              <Slider label="Angle" value={halftoneParams.angle} min={0} max={90} onChange={(v) => updateHalftone('angle', v)} unit="°"/>
              <Slider label="Threshold" value={halftoneParams.contrast} min={0.5} max={3.0} step={0.1} onChange={(v) => updateHalftone('contrast', v)} />

               <div className="mt-6">
                 <div className="flex gap-2 mb-4">
                  {['circle', 'diamond', 'line'].map((s) => (
                     <button
                      key={s}
                      onClick={() => updateHalftone('shape', s)}
                      className={`flex-1 py-1 text-[10px] uppercase border border-current transition-colors ${halftoneParams.shape === s ? 'bg-current text-canvas' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="uppercase opacity-70">Color Print</span>
                    <input type="checkbox" checked={halftoneParams.colorMode} onChange={(e) => updateHalftone('colorMode', e.target.checked)} className="accent-current" />
                </label>

                {/* Color Selection for Halftone */}
                 <div className="flex items-center justify-between mt-4">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <div className="w-8 h-8 border border-current p-1 relative">
                         <input type="color" value={halftoneParams.backgroundColor || '#ffffff'} onChange={(e) => updateHalftone('backgroundColor', e.target.value)} className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" />
                         <div className="w-full h-full" style={{backgroundColor: halftoneParams.backgroundColor || '#ffffff'}}></div>
                      </div>
                      <span className="text-[10px] uppercase font-bold">BG Color</span>
                   </label>
                   
                   <label className={`flex items-center gap-2 cursor-pointer ${halftoneParams.colorMode ? 'opacity-30 pointer-events-none' : ''}`}>
                      <div className="w-8 h-8 border border-current p-1 relative">
                         <input type="color" value={halftoneParams.color || '#000000'} onChange={(e) => updateHalftone('color', e.target.value)} className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" />
                         <div className="w-full h-full" style={{backgroundColor: halftoneParams.color || '#000000'}}></div>
                      </div>
                      <span className="text-[10px] uppercase font-bold">Dot Color</span>
                   </label>
                </div>
              </div>
            </div>
          </Section>
      )}

      {activeTab === Tab.MANUAL && (
        <Section 
           title="Glitch Layer" 
           isActive={activeLayers[Tab.MANUAL]} 
           onToggle={() => onToggleLayer(Tab.MANUAL)}
        >
          <div className={`transition-opacity duration-300 ${activeLayers[Tab.MANUAL] ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none'}`}>
             <Slider label="Block Shift" value={glitchParams.blockShift} min={0} max={100} onChange={(v) => updateGlitch('blockShift', v)} />
             <Slider label="Pixel Sort" value={glitchParams.pixelSort} min={0} max={50} onChange={(v) => updateGlitch('pixelSort', v)} />
             <Slider label="RGB Shift" value={glitchParams.rgbShift} min={0} max={50} onChange={(v) => updateGlitch('rgbShift', v)} unit="px"/>
             <Slider label="Scanlines" value={glitchParams.scanlines} min={0} max={10} onChange={(v) => updateGlitch('scanlines', v)} />
          </div>
        </Section>
      )}

      {/* Global Bake Loop - Always Visible */}
      <Section title="Master Output">
        <button
          onClick={onCaptureLoop}
          disabled={isCapturingLoop}
          className={`w-full py-3 font-bold text-xs uppercase tracking-widest border border-current transition-all ${
            isCapturingLoop 
              ? 'bg-red-500 text-white border-red-500 animate-pulse' 
              : 'hover:bg-current hover:text-canvas'
          }`}
        >
          {isCapturingLoop ? 'Recording 3s Loop...' : 'Bake Loop as Layer'}
        </button>
        <p className="text-[9px] opacity-60 mt-2 text-center">
          Records 3s of current effect and sets it as the main layer for further editing.
        </p>
      </Section>
    </div>
  );
};

export default Controls;