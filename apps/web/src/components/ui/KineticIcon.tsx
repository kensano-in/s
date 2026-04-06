'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KineticIconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
  pulse?: boolean;
  active?: boolean;
  glow?: boolean;
}

export default function KineticIcon({ 
  icon: Icon, 
  size = 16, 
  color = 'currentColor', 
  className,
  pulse = false,
  active = false,
  glow = false
}: KineticIconProps) {
  return (
    <motion.div
      className={clsx('relative flex items-center justify-center p-1', className)}
      whileHover={{ scale: 1.25, rotate: 10 }}
      whileTap={{ scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
    >
      {/* Neural Signal Ripples (Active/Glow) */}
      {(active || glow) && (
        <>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [1, 1.8], opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={clsx('absolute inset-0 rounded-full bg-current opacity-20 pointer-events-none')}
          />
          <motion.div 
            initial={{ scale: 1, opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={clsx('absolute inset-[-10px] rounded-full blur-[10px] bg-current pointer-events-none')}
          />
        </>
      )}

      {/* The Actual Icon with Signal Pulse */}
      <motion.div
        animate={pulse ? { 
          opacity: [0.3, 0.9, 0.3],
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="relative z-10"
      >
        <Icon 
            size={size} 
            strokeWidth={2.5} 
            color={color} 
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
        />
      </motion.div>

      {/* Advanced Glint (Scanning Line) */}
      <motion.div 
        animate={{
          left: ['-100%', '200%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'linear',
          delay: Math.random() * 2
        }}
        className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent pointer-events-none z-20"
      />
    </motion.div>
  );
}
