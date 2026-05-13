import React, { useState, useRef, useEffect } from 'react';
// motion imports removed because they were unused
import { ChevronsLeftRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Trước',
  afterLabel = 'Sau'
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    // Support both mouse and touch events
    let clientX = 0;
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || 0;
    } else {
      clientX = (event as MouseEvent).clientX;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => handleDrag(e);
    const handleTouchMove = (e: TouchEvent) => handleDrag(e);

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  return (
    <div 
      className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group select-none bg-slate-900"
      ref={containerRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleDrag(e);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleDrag(e);
      }}
    >
      {/* After Image: Background (Right side) */}
      <img
        src={afterImage}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none filter saturate-110"
        referrerPolicy="no-referrer"
      />
      
      {/* After Label (Always on the right, fades out if slider goes past 80%) */}
      <div 
        className="absolute top-4 right-4 px-3 py-1 bg-blue-600/80 backdrop-blur text-white text-xs font-bold rounded-lg pointer-events-none z-10"
        style={{ opacity: sliderPosition > 80 ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        {afterLabel}
      </div>

      {/* Before Image: Foreground (Left side, clipped) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none filter grayscale-[30%] brightness-75"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%' }}
        />
        {/* Before Label (Inside clipped div, fades out if slider goes below 20%) */}
        <div 
          className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-bold rounded-lg pointer-events-none z-10"
          style={{ opacity: sliderPosition < 20 ? 0 : 1, transition: 'opacity 0.2s' }}  
        >
          {beforeLabel}
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 flex items-center justify-center transform -translate-x-1/2"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white text-blue-900 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110">
          <ChevronsLeftRight className="w-5 h-5 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
