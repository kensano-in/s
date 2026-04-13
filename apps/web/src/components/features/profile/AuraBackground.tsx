'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface AuraBackgroundProps {
  securityScore?: number; // 0-100
  karmaScore?: number;    // 0-1000+
  isVerified?: boolean;
}

export default function AuraBackground({ 
  securityScore = 100, 
  karmaScore = 0, 
  isVerified = false 
}: AuraBackgroundProps) {
  
  // Calculate Aura Characteristics
  const auraConfig = useMemo(() => {
    // Hue mapping (Karma)
    // 0 = Slate/Gray
    // 500 = Sapphire Blue
    // 1000+ = Emerald/Gold
    let primaryHue = 220; // Default Blue
    if (karmaScore < 100) primaryHue = 210; // Slate
    else if (karmaScore > 800) primaryHue = 160; // Emerald

    // Intensity/Chaos (Security)
    // Lower score = faster, more erratic "jitter"
    const jitterSpeed = Math.max(2, 15 * (securityScore / 100)); // Seconds for one pulse
    const blurAmount = isVerified ? 'blur-[100px]' : 'blur-[80px]';

    return {
      primaryHue,
      jitterSpeed,
      blurAmount,
      opacity: 0.15 // Stealth Luxury - subtle
    };
  }, [securityScore, karmaScore, isVerified]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-[#0A0A0A]">
      <AnimatePresence mode="wait">
        <motion.div
          key="aura-mesh"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Main Behavioral Blob 1 */}
          <motion.div
            animate={{
              x: ['-10%', '10%', '-10%'],
              y: ['-10%', '10%', '-10%'],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: auraConfig.jitterSpeed * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: `radial-gradient(circle, hsla(${auraConfig.primaryHue}, 70%, 50%, ${auraConfig.opacity}) 0%, transparent 70%)`,
            }}
            className={`absolute top-0 left-0 w-[80vw] h-[80vw] ${auraConfig.blurAmount} rounded-full`}
          />

          {/* Secondary Behavioral Blob 2 */}
          <motion.div
            animate={{
              x: ['10%', '-10%', '10%'],
              y: ['10%', '-10%', '10%'],
              scale: [1.2, 1, 1.2],
            }}
            transition={{
              duration: auraConfig.jitterSpeed * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: `radial-gradient(circle, hsla(${auraConfig.primaryHue + 40}, 60%, 40%, ${auraConfig.opacity * 0.8}) 0%, transparent 70%)`,
            }}
            className={`absolute bottom-0 right-0 w-[70vw] h-[70vw] ${auraConfig.blurAmount} rounded-full`}
          />

          {/* Verified Shimmer Layer */}
          {isVerified && (
            <motion.div
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 mix-blend-overlay"
            />
          )}

          {/* Content Guard (prevents too much wash out) */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
