import React from 'react';

interface TimelineProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const Timeline: React.FC<TimelineProps> = ({ isPlaying, currentTime, duration, onPlayPause, onSeek }) => {
  return (
    <div className="w-full bg-canvas border-t border-current p-4 flex items-center gap-4 z-20">
      <button 
        onClick={onPlayPause}
        className="w-10 h-10 flex items-center justify-center border border-current hover:bg-current hover:text-canvas transition-colors"
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-current"></div>
            <div className="w-1 h-4 bg-current"></div>
          </div>
        ) : (
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-current border-b-[6px] border-b-transparent ml-1"></div>
        )}
      </button>

      <div className="flex-grow flex flex-col gap-1">
        <input 
          type="range"
          min={0}
          max={duration || 100} // Fallback to 100 if no duration
          step={0.01}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-800 appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono opacity-60">
           <span>{formatTime(currentTime)}</span>
           <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;