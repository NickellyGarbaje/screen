import React, { useState } from 'react';
import { ProcessingState } from '../types';

interface AIPanelProps {
  onGenerate: (prompt: string) => void;
  processingState: ProcessingState;
}

const AIPanel: React.FC<AIPanelProps> = ({ onGenerate, processingState }) => {
  const [prompt, setPrompt] = useState('');

  const suggestions = [
    "Digital Decay",
    "VHS Tracking Error",
    "Broken LCD Screen",
    "Melting Pixels",
    "Data Compression Artifacts"
  ];

  return (
    <div className="p-6 h-full flex flex-col">
       <div className="mb-8 border-b border-current pb-4">
        <h2 className="text-xl font-bold tracking-tighter uppercase">AI Processor</h2>
       </div>

      <div className="flex-grow space-y-6">
        <div className="relative">
          <label className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the corruption style..."
            className="w-full bg-transparent border border-current p-3 font-mono text-xs h-32 focus:outline-none focus:ring-1 focus:ring-current resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-2">Presets</label>
          <div className="flex flex-col gap-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setPrompt(s)}
                className="text-left text-xs py-2 px-2 border border-transparent hover:border-current transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={processingState.isProcessing}
          className={`w-full py-3 font-bold text-xs uppercase tracking-widest border border-current transition-all ${
            processingState.isProcessing 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-current hover:text-canvas'
          }`}
        >
          {processingState.isProcessing ? 'PROCESSING IMAGE...' : 'EXECUTE'}
        </button>
      </div>
    </div>
  );
};

export default AIPanel;