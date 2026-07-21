'use client';

import React from 'react';
import { motion } from 'framer-motion';

// --- PREMIUM SVG ICON SYSTEM ---
// Designed for Verlyn Command Center.
// Focus: Crisp, 1.25px strokes, sophisticated path-drawing animations,
// and subtle continuous motion for a "live" feel (Resend/Stripe aesthetic).

interface IconProps {
  color?: string;
  size?: number;
  className?: string;
}

// ---------------------------------------------------------
// Core Animated Wrappers
// ---------------------------------------------------------

const IconContainer = ({ children, size = 24, className }: { children: React.ReactNode, size?: number, className?: string }) => (
  <motion.svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    className={className}
    style={{ overflow: 'visible' }}
    initial="initial" animate="animate" whileHover="hover"
  >
    {children}
  </motion.svg>
);

const sharedTransition = { duration: 1.5, ease: [0.25, 1, 0.5, 1] };

// ---------------------------------------------------------
// Icons
// ---------------------------------------------------------

export const IconChat = ({ color = '#6366f1', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    {/* Background soft glow */}
    <motion.circle cx="12" cy="12" r="10" fill={color} opacity="0.05" 
      variants={{ hover: { scale: 1.1, opacity: 0.1 } }} transition={{ duration: 0.3 }} />
      
    {/* Main bubble */}
    <motion.path 
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
      }}
      transition={sharedTransition}
    />
    
    {/* Typing dots */}
    <motion.circle cx="8" cy="12" r="1" fill={color}
      animate={{ y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
    <motion.circle cx="12" cy="12" r="1" fill={color}
      animate={{ y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
    <motion.circle cx="16" cy="12" r="1" fill={color}
      animate={{ y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
  </IconContainer>
);

export const IconWrench = ({ color = '#3b82f6', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="12" cy="12" r="10" fill={color} opacity="0.05" variants={{ hover: { scale: 1.1, opacity: 0.1 } }} />
    
    <motion.g variants={{
      initial: { rotate: -45, transformOrigin: '12px 12px' },
      animate: { rotate: 0 },
      hover: { rotate: 15 }
    }} transition={sharedTransition}>
      <motion.path 
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" 
        stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
        variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
      />
    </motion.g>
    
    {/* Glowing fix spark */}
    <motion.path d="M7 7l2 2M5 9l2 2" stroke={color} strokeWidth="1" strokeLinecap="round"
      variants={{ initial: { opacity: 0, scale: 0 }, animate: { opacity: [0, 1, 0], scale: [0.5, 1, 0.5] } }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
    />
  </IconContainer>
);

export const IconShield = ({ color = '#8b5cf6', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
      fill={`${color}10`}
    />
    <motion.path 
      d="M9 12l2 2 4-4" 
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ ...sharedTransition, delay: 0.5 }}
    />
    {/* Subtle radar sweep inside shield */}
    <motion.path d="M12 5v7" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.3"
      animate={{ rotate: 360, transformOrigin: '12px 12px' }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    />
  </IconContainer>
);

export const IconUserPlus = ({ color = '#10b981', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="12" cy="12" r="10" fill={color} opacity="0.05" variants={{ hover: { scale: 1.1, opacity: 0.1 } }} />
    <motion.path 
      d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0, y: 5, opacity: 0 }, animate: { pathLength: 1, y: 0, opacity: 1 } }} transition={sharedTransition}
    />
    <motion.circle cx="8.5" cy="9" r="3" stroke={color} strokeWidth="1.25"
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ ...sharedTransition, delay: 0.2 }}
    />
    <motion.line x1="19" y1="8" x2="19" y2="14" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.6 }} />
    <motion.line x1="22" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.6 }} />
  </IconContainer>
);

export const IconCreditCard = ({ color = '#f59e0b', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="1.25"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} fill={`${color}08`} />
    <motion.line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="1.25"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.4 }} />
    {/* Animated NFC chip lines */}
    <motion.path d="M6 14h3M6 16h2" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }} transition={{ delay: 0.8 }} />
    
    <motion.path d="M16 14a2 2 0 0 1 2-2 2 2 0 0 1 2 2" stroke={color} strokeWidth="1" opacity="0"
      animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
  </IconContainer>
);

export const IconAlertTri = ({ color = '#ef4444', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill={`${color}10`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
    />
    <motion.line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.5 }} />
    <motion.circle cx="12" cy="17" r="1" fill={color}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ delay: 0.8 }} />
      
    {/* Danger Pulse */}
    <motion.path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={color} strokeWidth="1" fill="none" opacity="0.3"
      animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '12px 14px' }} />
  </IconContainer>
);

export const IconZap = ({ color = '#f59e0b', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0, fill: 'transparent' }, animate: { pathLength: 1, fill: `${color}15` } }} transition={sharedTransition}
    />
    <motion.path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1" opacity="0.5"
      animate={{ pathOffset: [0, 1], pathLength: [0, 0.2, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
  </IconContainer>
);

export const IconBadge = ({ color = '#10b981', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill={`${color}10`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
    />
    <motion.path 
      d="M9.5 14L8 21l4-2 4 2-1.5-7" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill={`${color}10`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.5, ...sharedTransition }}
    />
    <motion.circle cx="12" cy="10" r="1.5" fill={color}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ delay: 1 }} />
  </IconContainer>
);

export const IconArchive = ({ color = '#8b5cf6', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.rect x="3" y="8" width="18" height="13" rx="1" stroke={color} strokeWidth="1.25" fill={`${color}05`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.path d="M2 3h20v5H2z" stroke={color} strokeWidth="1.25" strokeLinejoin="round" fill={`${color}15`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.2, ...sharedTransition }} />
    <motion.path d="M10 12h4 M12 12v4 M10 14l2 2 2-2" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { y: -5, opacity: 0 }, animate: { y: 0, opacity: 1 } }} transition={{ delay: 0.8 }} />
  </IconContainer>
);

export const IconShieldOff = ({ color = '#ef4444', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0, opacity: 0.5 }, animate: { pathLength: 1, opacity: 0.3 } }} transition={sharedTransition}
    />
    <motion.line x1="2" y1="2" x2="22" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.8 }} />
  </IconContainer>
);

export const IconMail = ({ color = '#818cf8', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" fill={`${color}08`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
    />
    <motion.path 
      d="M3 7l9 6 9-6" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.5, ...sharedTransition }}
    />
  </IconContainer>
);

export const IconLock = ({ color = '#6366f1', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.25" fill={`${color}10`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.path 
      d="M7 11V7a5 5 0 0 1 10 0v4" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0, y: -5 }, animate: { pathLength: 1, y: 0 } }} transition={{ delay: 0.4, ...sharedTransition }}
    />
    <motion.circle cx="12" cy="16" r="1.5" fill={color}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ delay: 1 }} />
    <motion.circle cx="12" cy="16" r="4" stroke={color} strokeWidth="0.5" opacity="0"
      animate={{ scale: [1, 2], opacity: [0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }} />
  </IconContainer>
);

export const IconGlobe = ({ color = '#0891b2', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.25" fill={`${color}05`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.ellipse cx="12" cy="12" rx="4" ry="10" stroke={color} strokeWidth="1.25"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.4, ...sharedTransition }} />
    <motion.line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.25"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.8 }} />
    {/* Scanning data dot */}
    <motion.circle cx="12" cy="2" r="1.5" fill={color}
      animate={{ rotate: 360, transformOrigin: '12px 12px' }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
  </IconContainer>
);

export const IconActivity = ({ color = '#6366f1', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.path 
      d="M22 12h-4l-3 9L9 3l-3 9H2" 
      stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition}
    />
    <motion.path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"
      animate={{ pathOffset: [0, 1], pathLength: [0, 0.2, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
  </IconContainer>
);

export const IconCheckCircle = ({ color = '#10b981', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.25" fill={`${color}08`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.path 
      d="M8 12.5l3 3 5-6" 
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.6, duration: 0.8 }}
    />
    <motion.circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1" fill="none" opacity="0"
      animate={{ scale: [1, 1.2], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} />
  </IconContainer>
);

export const IconGrid = ({ color = '#9ca3af', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.25" fill={`${color}10`}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ duration: 0.5 }} />
    <motion.rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.25" fill={`${color}10`}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ duration: 0.5, delay: 0.1 }} />
    <motion.rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.25" fill={`${color}10`}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ duration: 0.5, delay: 0.2 }} />
    <motion.rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.25" fill={`${color}10`}
      variants={{ initial: { scale: 0 }, animate: { scale: 1 } }} transition={{ duration: 0.5, delay: 0.3 }} />
  </IconContainer>
);

export const IconBar = ({ color = '#3b82f6', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ duration: 0.8 }} />
    <motion.line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ duration: 0.8, delay: 0.2 }} />
    <motion.line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ duration: 0.8, delay: 0.4 }} />
  </IconContainer>
);

export const IconSearch = ({ color = '#8b5cf6', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="11" cy="11" r="6" stroke={color} strokeWidth="1.25"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.line x1="21" y1="21" x2="15.5" y2="15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.8 }} />
  </IconContainer>
);

export const IconRisk = IconAlertTri;
export const IconUsers = IconUserPlus;
export const IconFlag = IconAlertTri;
export const IconBan = ({ color = '#ef4444', size = 24 }: IconProps) => (
  <IconContainer size={size}>
    <motion.circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.25" fill={`${color}05`}
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={sharedTransition} />
    <motion.line x1="5" y1="5" x2="19" y2="19" stroke={color} strokeWidth="1.25" strokeLinecap="round"
      variants={{ initial: { pathLength: 0 }, animate: { pathLength: 1 } }} transition={{ delay: 0.6 }} />
  </IconContainer>
);
