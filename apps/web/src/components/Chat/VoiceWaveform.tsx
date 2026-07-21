"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VoiceWaveformProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
  peaks?: number[];
  color?: string;
  activeColor?: string;
}

export default function VoiceWaveform({
  isPlaying,
  progress,
  peaks = [],
  color = "rgba(255, 255, 255, 0.15)",
  activeColor = "var(--primary-hex, #6366f1)"
}: VoiceWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedPeaks, setRenderedPeaks] = useState<number[]>([]);

  useEffect(() => {
    if (peaks.length > 0) {
      setRenderedPeaks(peaks);
    } else {
      // Generate synthetic peaks if none provided
      const p = Array.from({ length: 40 }, () => 0.1 + Math.random() * 0.8);
      setRenderedPeaks(p);
    }
  }, [peaks]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center gap-[2px] h-8 w-full min-w-[120px] select-none"
    >
      {renderedPeaks.map((peak, i) => {
        const isActive = (i / renderedPeaks.length) <= progress;
        return (
          <motion.div
            key={i}
            initial={{ scaleY: 0.1 }}
            animate={{ 
              scaleY: peak,
              backgroundColor: isActive ? activeColor : color,
              opacity: isActive ? 1 : 0.6
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              delay: i * 0.01 
            }}
            className="flex-1 rounded-full origin-center"
            style={{ height: "100%" }}
          />
        );
      })}
    </div>
  );
}
