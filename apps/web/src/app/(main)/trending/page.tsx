'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, Flame, Hash, Loader2, Users, 
  ArrowUpRight, ArrowRight, MessageSquare, Heart,
  Layers, Music, Gamepad2, Cpu, Scissors, Film, Camera, Brain, Rocket, Leaf, Activity,
  Search, X, Star, CheckCircle, Sparkles, Compass, CornerDownRight, AlertTriangle,
  Pin, Trash2, Flag
} from 'lucide-react';
import type { Post, Community } from '@/lib/types';
import PostCard from '@/components/features/feed/PostCard';
import { toggleLikeDB, getCommentsDB, submitCommentDB, pinCommentDB, deleteCommentDB, reportCommentDB, submitPost } from '@/app/(main)/feed/actions';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import { getAvatarUrl, getCommunityIconUrl } from '@/lib/utils';

// ─── Avatar & Icon Fallback Helpers ───────────────────────────────────────────

function getCustomAestheticAvatar(username: string): string {
  const name = username.toLowerCase().trim();
  let svg = '';

  if (name === 'kunal') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#EADCC9"/><circle cx="50" cy="40" r="18" fill="#1C1A17"/><path d="M25 85 C25 65, 35 60, 50 60 C65 60, 75 65, 75 85 Z" fill="#1C1A17"/><path d="M43 35 Q50 30 57 35" stroke="#EADCC9" stroke-width="2" fill="none"/></svg>`;
  } else if (name === 'riya') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#A3B19B"/><circle cx="50" cy="45" r="16" fill="#1F2421"/><path d="M30 85 C30 68, 40 62, 50 62 C60 62, 70 68, 70 85 Z" fill="#1F2421"/><circle cx="44" cy="44" r="5" stroke="#A3B19B" stroke-width="1.5" fill="none"/><circle cx="56" cy="44" r="5" stroke="#A3B19B" stroke-width="1.5" fill="none"/><line x1="49" y1="44" x2="51" y2="44" stroke="#A3B19B" stroke-width="1.5"/></svg>`;
  } else if (name === 'shinichiro') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#121212"/><circle cx="50" cy="50" r="42" stroke="#3b82f6" stroke-width="1" stroke-opacity="0.3" fill="none"/><circle cx="50" cy="42" r="15" fill="#EEEEEE"/><path d="M28 85 C28 65, 38 60, 50 60 C62 60, 72 65, 72 85 Z" fill="#EEEEEE"/></svg>`;
  } else if (name === 'nahoya') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#D4A373"/><circle cx="50" cy="42" r="16" fill="#4A3B32"/><circle cx="40" cy="32" r="8" fill="#4A3B32"/><circle cx="60" cy="32" r="8" fill="#4A3B32"/><circle cx="50" cy="28" r="9" fill="#4A3B32"/><path d="M28 85 C28 68, 38 62, 50 62 C62 62, 72 68, 72 85 Z" fill="#4A3B32"/></svg>`;
  } else if (name === 'souta') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#457B9D"/><circle cx="50" cy="42" r="15" fill="#F1FAEE"/><path d="M28 85 C28 70, 40 60, 50 65 C60 70, 72 60, 72 85 Z" fill="#F1FAEE"/></svg>`;
  } else if (name === 'mitsuya') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#E6E1C5"/><circle cx="50" cy="42" r="15" fill="#4A3E3D"/><path d="M30 85 C30 68, 40 62, 50 62 C60 62, 70 68, 70 85 Z" fill="#4A3E3D"/><line x1="50" y1="20" x2="50" y2="80" stroke="#F4A261" stroke-width="1.5" stroke-dasharray="4 4"/></svg>`;
  } else if (name === 'chifuyu') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2E4057"/><circle cx="50" cy="42" r="14" fill="#F4D35E"/><path d="M38 32 L44 38 L38 38 Z" fill="#F4D35E"/><path d="M62 32 L56 38 L62 38 Z" fill="#F4D35E"/><path d="M30 85 C30 68, 40 62, 50 62 C60 62, 70 68, 70 85 Z" fill="#F4D35E"/></svg>`;
  } else if (name === 'baji') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1D2021"/><circle cx="50" cy="42" r="15" fill="#FB4934"/><path d="M35 30 Q30 50 35 70" stroke="#EBDBB2" stroke-width="3" fill="none"/><path d="M65 30 Q70 50 65 70" stroke="#EBDBB2" stroke-width="3" fill="none"/><path d="M30 85 C30 68, 40 62, 50 62 C60 62, 70 68, 70 85 Z" fill="#FB4934"/></svg>`;
  }

  if (svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return '';
}

function getCustomCommunityIcon(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  let svg = '';

  if (cleanName === 'uidesigners' || cleanName === 'uicircle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-design" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#0369a1" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-design)"/>
      <circle cx="50" cy="50" r="28" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" fill="none"/>
      <circle cx="50" cy="50" r="18" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" fill="none"/>
      <text x="50" y="56" font-family="serif" font-size="24" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">U</text>
    </svg>`;
  } else if (cleanName === 'animecircle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-anime" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e11d48" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#be123c" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-anime)"/>
      <circle cx="50" cy="50" r="24" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25"/>
      <text x="50" y="56" font-family="sans-serif" font-size="20" font-weight="900" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">A</text>
    </svg>`;
  } else if (cleanName === 'indiemusic' || cleanName === 'soundlounge') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-music" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#db2777" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-music)"/>
      <circle cx="50" cy="50" r="30" fill="#111111" fill-opacity="0.25" stroke="#ffffff" stroke-opacity="0.1" stroke-width="3"/>
      <circle cx="50" cy="50" r="20" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="50" cy="50" r="4" fill="#ffffff" fill-opacity="0.4"/>
      <text x="50" y="56" font-family="serif" font-size="22" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">S</text>
    </svg>`;
  } else if (cleanName === 'productlab') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-product" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d946ef" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#a21caf" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-product)"/>
      <rect x="34" y="34" width="32" height="32" rx="6" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2"/>
      <text x="50" y="56" font-family="sans-serif" font-size="20" font-weight="900" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">P</text>
    </svg>`;
  } else if (cleanName === 'photographyclub') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-photo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#334155" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-photo)"/>
      <circle cx="50" cy="50" r="22" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2" fill="none"/>
      <circle cx="50" cy="50" r="10" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5" fill="none"/>
    </svg>`;
  } else if (cleanName === 'devcircle' || cleanName === 'securitylab') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-tech" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#047857" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-tech)"/>
      <path d="M35 42 L25 50 L35 58" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" fill="none"/>
      <path d="M65 42 L75 50 L65 58" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" fill="none"/>
      <text x="50" y="56" font-family="serif" font-size="22" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">S</text>
    </svg>`;
  } else if (cleanName === 'aestheticmode' || cleanName === 'fashion') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-fashion" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#d97706" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-fashion)"/>
      <path d="M32 45 L50 35 L68 45" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" fill="none"/>
      <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2"/>
    </svg>`;
  } else if (cleanName === 'latenightvision' || cleanName === 'cinemanoir') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="g-cinema" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.95"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="16" fill="url(#g-cinema)"/>
      <path d="M30 55 Q50 38 70 42 Q52 50 30 55 Z" fill="#ffffff" fill-opacity="0.2"/>
      <text x="50" y="56" font-family="serif" font-size="22" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">C</text>
    </svg>`;
  }

  if (svg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return '';
}

// ─── Sparklines & Cozy Card Vector Export Engine ─────────────────────────────

function Sparkline({ seed, color = '#fbbf24' }: { seed: string; color?: string }) {
  const points = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const val = Math.abs((hash >> (i * 4)) & 15); // value between 0 and 15
      pts.push(val);
    }
    return pts;
  }, [seed]);

  const path = useMemo(() => {
    const width = 45;
    const height = 15;
    const padding = 2;
    const step = width / (points.length - 1);
    
    let d = `M 0,${height - padding - (points[0] / 15) * (height - padding * 2)}`;
    for (let i = 1; i < points.length; i++) {
      const x = i * step;
      const y = height - padding - (points[i] / 15) * (height - padding * 2);
      const prevX = (i - 1) * step;
      const prevY = height - padding - (points[i - 1] / 15) * (height - padding * 2);
      const cpX1 = prevX + step / 2;
      const cpY1 = prevY;
      const cpX2 = prevX + step / 2;
      const cpY2 = y;
      d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${x},${y}`;
    }
    return d;
  }, [points]);

  return (
    <svg width="45" height="15" className="opacity-45 group-hover:opacity-95 transition-opacity duration-500 shrink-0">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function downloadCustomQuoteCard(
  author: string,
  content: string,
  stream: string,
  theme: 'noir' | 'neon' | 'aura' | 'sunset' | 'slate' | 'cyber' | 'forest' | 'crimson' | 'royal' | 'lavender',
  size: 'widescreen' | 'square' | 'story' | 'landscape' | 'portrait' | 'ultrawide' | 'classic',
  font: 'serif' | 'mono' | 'modern' | 'display' | 'handwriting' | 'condensed',
  watermark: boolean,
  fontSize: number,
  glowStrength: 'off' | 'low' | 'high',
  borderStyle: 'thin' | 'glow' | 'none',
  textAlign: 'left' | 'center' | 'right' = 'left',
  quoteStyle: 'mark' | 'line' | 'bar' | 'none' = 'mark',
  cornerRadius: 'sharp' | 'rounded' | 'pill' = 'rounded',
  grain: boolean = false,
  glassRefraction: boolean = true,
  format: 'png' | 'jpeg' | 'pdf' | 'svg' = 'png',
  resolutionScale: number = 8,
  customWatermarkText: string = 'VERLYN NETWORK',
  lineHeight: number = 1.4,
  letterSpacing: number = 0,
  gradientAngle: number = 135,
  blurStrength: number = 20,
  backgroundStyle: 'solid' | 'gradient' | 'glass' | 'cyberGrid' | 'iridescent' = 'gradient',
  textCase: 'normal' | 'uppercase' | 'lowercase' = 'normal',
  chromatic: boolean = false,
  neonP: boolean = false,
  hud: boolean = false,
  waveform: boolean = false,
  leak: boolean = false,
  emphasis: boolean = false
) {
  let cleanContent = content.replace(/["<>]/g, '').trim();
  if (textCase === 'uppercase') {
    cleanContent = cleanContent.toUpperCase();
  } else if (textCase === 'lowercase') {
    cleanContent = cleanContent.toLowerCase();
  }

  const dimensions = {
    widescreen: { w: 600, h: 350, wrap: 42, maxLines: 5 },
    square:     { w: 500, h: 500, wrap: 32, maxLines: 8 },
    story:      { w: 400, h: 700, wrap: 24, maxLines: 12 },
    landscape:  { w: 800, h: 450, wrap: 55, maxLines: 6 },
    portrait:   { w: 480, h: 640, wrap: 30, maxLines: 10 },
    ultrawide:  { w: 900, h: 320, wrap: 65, maxLines: 4 },
    classic:    { w: 560, h: 420, wrap: 38, maxLines: 7 },
  };
  const dim = dimensions[size];

  const rx = cornerRadius === 'sharp' ? 4 : cornerRadius === 'pill' ? 40 : 20;

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const lines = wrapText(cleanContent, dim.wrap).slice(0, dim.maxLines);

  const themeColors = {
    noir:     { bgStart: '#070709', bgEnd: '#121215', accent: '#fbbf24', glow: '#fbbf24', opacity: '0.02' },
    neon:     { bgStart: '#0a0415', bgEnd: '#16082a', accent: '#c084fc', glow: '#a855f7', opacity: '0.025' },
    aura:     { bgStart: '#020f12', bgEnd: '#051f24', accent: '#2dd4bf', glow: '#2dd4bf', opacity: '0.025' },
    sunset:   { bgStart: '#0f030a', bgEnd: '#250718', accent: '#f43f5e', glow: '#f43f5e', opacity: '0.025' },
    slate:    { bgStart: '#18181b', bgEnd: '#27272a', accent: '#ffffff', glow: '#ffffff', opacity: '0.02' },
    cyber:    { bgStart: '#050510', bgEnd: '#140c2a', accent: '#f59e0b', glow: '#6366f1', opacity: '0.03' },
    forest:   { bgStart: '#021810', bgEnd: '#062e20', accent: '#34d399', glow: '#10b981', opacity: '0.035' },
    crimson:  { bgStart: '#0f0202', bgEnd: '#28050e', accent: '#f87171', glow: '#ef4444', opacity: '0.03' },
    royal:    { bgStart: '#020212', bgEnd: '#09092d', accent: '#60a5fa', glow: '#3b82f6', opacity: '0.03' },
    lavender: { bgStart: '#080510', bgEnd: '#1d0c32', accent: '#e879f9', glow: '#a855f7', opacity: '0.03' }
  };
  const tc = themeColors[theme];

  const fontFamilies = {
    serif:       'Georgia, serif',
    mono:        'Courier New, Monaco, monospace',
    modern:      'system-ui, -apple-system, sans-serif',
    display:     'Impact, "Arial Black", sans-serif',
    handwriting: '"Comic Sans MS", cursive, sans-serif',
    condensed:   '"Arial Narrow", "Helvetica Condensed", sans-serif',
  };
  const ff = fontFamilies[font];

  const opacityMultiplier = glowStrength === 'off' ? 0 : glowStrength === 'low' ? 0.4 : 1.0;
  const opacityVal = parseFloat(tc.opacity) * opacityMultiplier;

  let borderStroke = 'white';
  let borderOpacity = '0.03';
  if (borderStyle === 'glow') { borderStroke = tc.accent; borderOpacity = '0.15'; }
  else if (borderStyle === 'none') { borderOpacity = '0'; }

  const rad = (gradientAngle * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50) + '%';
  const y1 = Math.round(50 - Math.sin(rad) * 50) + '%';
  const x2 = Math.round(50 + Math.cos(rad) * 50) + '%';
  const y2 = Math.round(50 + Math.sin(rad) * 50) + '%';

  const textX = textAlign === 'center' ? dim.w / 2 : textAlign === 'right' ? dim.w - 40 : 40;
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';

  const contentTop = watermark ? 145 : 105;

  const quoteDecoration = quoteStyle === 'mark'
    ? `<text x="${textX}" y="${contentTop - 40}" font-family="serif" font-size="64" font-weight="bold" fill="${tc.accent}" fill-opacity="0.08" text-anchor="${anchor}">"</text>`
    : quoteStyle === 'line'
    ? `<line x1="40" y1="${contentTop - 20}" x2="${dim.w - 40}" y2="${contentTop - 20}" stroke="${tc.accent}" stroke-opacity="0.15" stroke-width="1" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : quoteStyle === 'bar'
    ? `<rect x="40" y="${contentTop - 24}" width="4" height="${lines.length * Math.round(fontSize * lineHeight) + 8}" rx="2" fill="${tc.accent}" fill-opacity="0.5" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : '';

  const grainFilter = grain
    ? `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="overlay" result="blend"/></filter><rect width="${dim.w}" height="${dim.h}" rx="${rx}" filter="url(#grain)" opacity="0.04" fill="white" pointer-events="none"/>`
    : '';

  const borderFilter = neonP ? 'filter="url(#neon-glow)"' : '';

  // Background style setups
  let backgroundRect = '';
  if (backgroundStyle === 'solid') {
    backgroundRect = `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="${tc.bgStart}"/>`;
  } else if (backgroundStyle === 'gradient') {
    backgroundRect = `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>`;
  } else if (backgroundStyle === 'glass') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="#16161a" fill-opacity="0.45"/>
      ${glassRefraction ? `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#glass-shine)" fill-opacity="0.1"/>` : ''}
    `;
  } else if (backgroundStyle === 'cyberGrid') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#grid-pat)"/>
    `;
  } else if (backgroundStyle === 'iridescent') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#irid-bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="black" fill-opacity="0.65"/>
    `;
  }

  // Generate dynamic waveform path
  let waveD = `M 40,${dim.h - 85}`;
  const steps = 40;
  const stepWidth = (dim.w - 80) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = 40 + i * stepWidth;
    const offset = Math.sin(i * 0.5) * Math.cos(i * 0.2) * 18;
    const y = (dim.h - 85) + (i === 0 || i === steps ? 0 : offset);
    waveD += ` L ${x},${y}`;
  }
  const waveformOverlaySVG = waveform
    ? `<path d="${waveD}" fill="none" stroke="${tc.accent}" stroke-width="1.2" stroke-opacity="0.22" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : '';

  // Generate technical HUD overlay
  const hudOverlaySVG = hud
    ? `
      <path d="M 25 45 L 25 25 L 45 25" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M ${dim.w - 25} 45 L ${dim.w - 25} 25 L ${dim.w - 45} 25" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M 25 ${dim.h - 45} L 25 ${dim.h - 25} L 45 ${dim.h - 25}" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M ${dim.w - 25} ${dim.h - 45} L ${dim.w - 25} ${dim.h - 25} L ${dim.w - 45} ${dim.h - 25}" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <text x="35" y="38" font-family="monospace" font-size="6" font-weight="bold" fill="${tc.accent}" fill-opacity="0.4" letter-spacing="1">SYS_STATUS: ACTIVE</text>
      <text x="${dim.w - 35}" y="38" font-family="monospace" font-size="6" font-weight="bold" fill="${tc.accent}" fill-opacity="0.4" text-anchor="end" letter-spacing="1">COORD: [${dim.w}x${dim.h}]</text>
      <line x1="${dim.w / 2}" y1="20" x2="${dim.w / 2}" y2="28" stroke="${tc.accent}" stroke-opacity="0.2" stroke-width="1"/>
      <line x1="${dim.w / 2 - 4}" y1="24" x2="${dim.w / 2 + 4}" y2="24" stroke="${tc.accent}" stroke-opacity="0.2" stroke-width="1"/>
    `
    : '';

  // Generate light leak rainbow refraction
  const leakOverlaySVG = leak
    ? `
      <linearGradient id="prism-leak" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff007f" stop-opacity="0.14"/>
        <stop offset="30%" stop-color="#7f00ff" stop-opacity="0.04"/>
        <stop offset="70%" stop-color="#00ffff" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#ffaa00" stop-opacity="0.14"/>
      </linearGradient>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#prism-leak)" pointer-events="none"/>
    `
    : '';

  // Emphasis highlighting parser
  const renderLineText = (lineText: string) => {
    if (!emphasis || !lineText.includes('*')) {
      return lineText;
    }
    const parts = lineText.split('*');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return `<tspan fill="${tc.accent}" font-weight="bold">${part}</tspan>`;
      }
      return part;
    }).join('');
  };

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim.w} ${dim.h}" width="${dim.w}" height="${dim.h}">
      <defs>
        <linearGradient id="bg" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="${tc.bgStart}" />
          <stop offset="100%" stop-color="${tc.bgEnd}" />
        </linearGradient>
        <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="white" stop-opacity="0.15" />
          <stop offset="40%" stop-color="white" stop-opacity="0" />
          <stop offset="100%" stop-color="black" stop-opacity="0.3" />
        </linearGradient>
        <linearGradient id="irid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff7eb3"/>
          <stop offset="25%" stop-color="#ff758c"/>
          <stop offset="50%" stop-color="#ac73ff"/>
          <stop offset="75%" stop-color="#00f2fe"/>
          <stop offset="100%" stop-color="#4facfe"/>
        </linearGradient>
        <pattern id="grid-pat" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${tc.accent}" stroke-width="0.6" stroke-opacity="0.08"/>
          <circle cx="24" cy="0" r="1.2" fill="${tc.accent}" fill-opacity="0.2"/>
        </pattern>
        ${chromatic ? `
        <filter id="chromatic-aberration">
          <feOffset dx="-1.5" dy="0" in="SourceGraphic" result="redChan"/>
          <feOffset dx="1.5" dy="0" in="SourceGraphic" result="blueChan"/>
          <feColorMatrix in="redChan" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redSplit"/>
          <feColorMatrix in="blueChan" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blueSplit"/>
          <feBlend mode="screen" in="redSplit" in2="blueSplit" result="aberration"/>
          <feBlend mode="normal" in="SourceGraphic" in2="aberration"/>
        </filter>
        ` : ''}
        ${neonP ? `
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur1"/>
          <feGaussianBlur stdDeviation="7" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        ` : ''}
      </defs>
      ${backgroundRect}
      <rect x="1" y="1" width="${dim.w - 2}" height="${dim.h - 2}" rx="${rx - 1}" fill="none" stroke="${borderStroke}" stroke-opacity="${borderOpacity}" stroke-width="1" ${borderFilter}/>
      <circle cx="50" cy="50" r="90" fill="${tc.glow}" fill-opacity="${opacityVal}" filter="blur(${blurStrength}px)"/>
      <circle cx="${dim.w - 50}" cy="${dim.h - 50}" r="90" fill="#6366f1" fill-opacity="${opacityVal}" filter="blur(${blurStrength}px)"/>
      ${grainFilter}
      ${waveformOverlaySVG}
      ${hudOverlaySVG}
      ${leakOverlaySVG}
      ${watermark ? `
      <text x="40" y="52" font-family="monospace" font-size="10" font-weight="900" fill="${tc.accent}" letter-spacing="3.5">${customWatermarkText.toUpperCase()}</text>
      <text x="40" y="70" font-family="sans-serif" font-size="8" font-weight="bold" fill="white" fill-opacity="0.3" letter-spacing="1">TRENDING SPOTLIGHT</text>
      ` : ''}
      ${quoteDecoration}
      
      <g ${chromatic ? 'filter="url(#chromatic-aberration)"' : ''}>
        <text x="${textX}" y="${contentTop}" font-family="${ff}" font-size="${fontSize}px" font-style="italic" fill="#e4e4e7" font-weight="300" text-anchor="${anchor}" letter-spacing="${letterSpacing}px">
          ${lines.map((line, idx) => {
            const dy = idx === 0 ? 0 : Math.round(fontSize * lineHeight);
            return `<tspan x="${textX}" dy="${dy}">${renderLineText(line)}</tspan>`;
          }).join('')}
        </text>
      </g>

      <line x1="40" y1="${dim.h - 70}" x2="${dim.w - 40}" y2="${dim.h - 70}" stroke="white" stroke-opacity="0.04" stroke-width="0.8"/>
      <text x="40" y="${dim.h - 42}" font-family="monospace" font-size="10" font-weight="bold" fill="${tc.accent}" letter-spacing="1">@${author.toUpperCase()}</text>
      <text x="${dim.w - 40}" y="${dim.h - 55}" font-family="monospace" font-size="7.5" font-weight="900" fill="${tc.accent}" fill-opacity="0.4" text-anchor="end" letter-spacing="1.5">VERLYN.IN</text>
      <text x="${dim.w - 40}" y="${dim.h - 42}" font-family="monospace" font-size="8" font-weight="bold" fill="white" fill-opacity="0.3" text-anchor="end" letter-spacing="0.5">STREAM: ${stream.toUpperCase()}</text>
    </svg>
  `.trim();

  if (format === 'svg') {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `verlyn-${theme}-${author}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(svgUrl);
    return;
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = dim.w * resolutionScale;
    canvas.height = dim.h * resolutionScale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(resolutionScale, resolutionScale);
      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const extension = format === 'jpeg' ? 'jpg' : format === 'pdf' ? 'pdf' : 'png';

      canvas.toBlob((blobResult) => {
        if (blobResult) {
          const blobUrl = URL.createObjectURL(blobResult);

          if (format === 'pdf') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Export Quote Card PDF</title>
                    <style>
                      @page { size: auto; margin: 0mm; }
                      body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; }
                      img { max-width: 100%; max-height: 100%; object-fit: contain; }
                    </style>
                  </head>
                  <body>
                    <img src="${blobUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 300);" />
                  </body>
                </html>
              `);
              printWindow.document.close();
            }
          } else {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `verlyn-${theme}-${author}.${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 5000);
        }
      }, mimeType, 1.0);
    }
    URL.revokeObjectURL(url);
  };
  img.onerror = (e) => {
    console.error("Failed to load SVG into Image object inside downloadCustomQuoteCard:", e);
    window.dispatchEvent(new CustomEvent('verlyn:toast', {
      detail: { message: 'Image render failed. Try exporting as Vector SVG instead.', type: 'error' }
    }));
  };
  img.src = url;
}

function copyCustomQuoteCardToClipboard(
  author: string,
  content: string,
  stream: string,
  theme: 'noir' | 'neon' | 'aura' | 'sunset' | 'slate' | 'cyber' | 'forest' | 'crimson' | 'royal' | 'lavender',
  size: 'widescreen' | 'square' | 'story' | 'landscape' | 'portrait' | 'ultrawide' | 'classic',
  font: 'serif' | 'mono' | 'modern' | 'display' | 'handwriting' | 'condensed',
  watermark: boolean,
  fontSize: number,
  glowStrength: 'off' | 'low' | 'high',
  borderStyle: 'thin' | 'glow' | 'none',
  textAlign: 'left' | 'center' | 'right' = 'left',
  quoteStyle: 'mark' | 'line' | 'bar' | 'none' = 'mark',
  cornerRadius: 'sharp' | 'rounded' | 'pill' = 'rounded',
  grain: boolean = false,
  glassRefraction: boolean = true,
  customWatermarkText: string = 'VERLYN NETWORK',
  lineHeight: number = 1.4,
  letterSpacing: number = 0,
  gradientAngle: number = 135,
  blurStrength: number = 20,
  backgroundStyle: 'solid' | 'gradient' | 'glass' | 'cyberGrid' | 'iridescent' = 'gradient',
  textCase: 'normal' | 'uppercase' | 'lowercase' = 'normal',
  chromatic: boolean = false,
  neonP: boolean = false,
  hud: boolean = false,
  waveform: boolean = false,
  leak: boolean = false,
  emphasis: boolean = false
) {
  let cleanContent = content.replace(/["<>]/g, '').trim();
  if (textCase === 'uppercase') {
    cleanContent = cleanContent.toUpperCase();
  } else if (textCase === 'lowercase') {
    cleanContent = cleanContent.toLowerCase();
  }

  const dimensions = {
    widescreen: { w: 600, h: 350, wrap: 42, maxLines: 5 },
    square:     { w: 500, h: 500, wrap: 32, maxLines: 8 },
    story:      { w: 400, h: 700, wrap: 24, maxLines: 12 },
    landscape:  { w: 800, h: 450, wrap: 55, maxLines: 6 },
    portrait:   { w: 480, h: 640, wrap: 30, maxLines: 10 },
    ultrawide:  { w: 900, h: 320, wrap: 65, maxLines: 4 },
    classic:    { w: 560, h: 420, wrap: 38, maxLines: 7 },
  };
  const dim = dimensions[size];
  const rx = cornerRadius === 'sharp' ? 4 : cornerRadius === 'pill' ? 40 : 20;

  const wrapText = (text: string, maxChars: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };
  const lines = wrapText(cleanContent, dim.wrap).slice(0, dim.maxLines);

  const themeColors = {
    noir:     { bgStart: '#070709', bgEnd: '#121215', accent: '#fbbf24', glow: '#fbbf24', opacity: '0.02' },
    neon:     { bgStart: '#0a0415', bgEnd: '#16082a', accent: '#c084fc', glow: '#a855f7', opacity: '0.025' },
    aura:     { bgStart: '#020f12', bgEnd: '#051f24', accent: '#2dd4bf', glow: '#2dd4bf', opacity: '0.025' },
    sunset:   { bgStart: '#0f030a', bgEnd: '#250718', accent: '#f43f5e', glow: '#f43f5e', opacity: '0.025' },
    slate:    { bgStart: '#18181b', bgEnd: '#27272a', accent: '#ffffff', glow: '#ffffff', opacity: '0.02' },
    cyber:    { bgStart: '#050510', bgEnd: '#140c2a', accent: '#f59e0b', glow: '#6366f1', opacity: '0.03' },
    forest:   { bgStart: '#021810', bgEnd: '#062e20', accent: '#34d399', glow: '#10b981', opacity: '0.035' },
    crimson:  { bgStart: '#0f0202', bgEnd: '#28050e', accent: '#f87171', glow: '#ef4444', opacity: '0.03' },
    royal:    { bgStart: '#020212', bgEnd: '#09092d', accent: '#60a5fa', glow: '#3b82f6', opacity: '0.03' },
    lavender: { bgStart: '#080510', bgEnd: '#1d0c32', accent: '#e879f9', glow: '#a855f7', opacity: '0.03' }
  };
  const tc = themeColors[theme];

  const fontFamilies = {
    serif:       'Georgia, serif',
    mono:        'Courier New, Monaco, monospace',
    modern:      'system-ui, -apple-system, sans-serif',
    display:     'Impact, "Arial Black", sans-serif',
    handwriting: '"Comic Sans MS", cursive, sans-serif',
    condensed:   '"Arial Narrow", "Helvetica Condensed", sans-serif',
  };
  const ff = fontFamilies[font];

  const opacityMultiplier = glowStrength === 'off' ? 0 : glowStrength === 'low' ? 0.4 : 1.0;
  const opacityVal = parseFloat(tc.opacity) * opacityMultiplier;

  let borderStroke = 'white';
  let borderOpacity = '0.03';
  if (borderStyle === 'glow') { borderStroke = tc.accent; borderOpacity = '0.15'; }
  else if (borderStyle === 'none') { borderOpacity = '0'; }

  const rad = (gradientAngle * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50) + '%';
  const y1 = Math.round(50 - Math.sin(rad) * 50) + '%';
  const x2 = Math.round(50 + Math.cos(rad) * 50) + '%';
  const y2 = Math.round(50 + Math.sin(rad) * 50) + '%';

  const textX = textAlign === 'center' ? dim.w / 2 : textAlign === 'right' ? dim.w - 40 : 40;
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
  const contentTop = watermark ? 145 : 105;

  const quoteDecoration = quoteStyle === 'mark'
    ? `<text x="${textX}" y="${contentTop - 40}" font-family="serif" font-size="64" font-weight="bold" fill="${tc.accent}" fill-opacity="0.08" text-anchor="${anchor}">"</text>`
    : quoteStyle === 'line'
    ? `<line x1="40" y1="${contentTop - 20}" x2="${dim.w - 40}" y2="${contentTop - 20}" stroke="${tc.accent}" stroke-opacity="0.15" stroke-width="1" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : quoteStyle === 'bar'
    ? `<rect x="40" y="${contentTop - 24}" width="4" height="${lines.length * Math.round(fontSize * lineHeight) + 8}" rx="2" fill="${tc.accent}" fill-opacity="0.5" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : '';

  const grainFilter = grain
    ? `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="overlay" result="blend"/></filter><rect width="${dim.w}" height="${dim.h}" rx="${rx}" filter="url(#grain)" opacity="0.04" fill="white" pointer-events="none"/>`
    : '';

  const borderFilter = neonP ? 'filter="url(#neon-glow)"' : '';

  let backgroundRect = '';
  if (backgroundStyle === 'solid') {
    backgroundRect = `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="${tc.bgStart}"/>`;
  } else if (backgroundStyle === 'gradient') {
    backgroundRect = `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>`;
  } else if (backgroundStyle === 'glass') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="#16161a" fill-opacity="0.45"/>
      ${glassRefraction ? `<rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#glass-shine)" fill-opacity="0.1"/>` : ''}
    `;
  } else if (backgroundStyle === 'cyberGrid') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#grid-pat)"/>
    `;
  } else if (backgroundStyle === 'iridescent') {
    backgroundRect = `
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#irid-bg)"/>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="black" fill-opacity="0.65"/>
    `;
  }

  // Generate dynamic waveform path
  let waveD = `M 40,${dim.h - 85}`;
  const steps = 40;
  const stepWidth = (dim.w - 80) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = 40 + i * stepWidth;
    const offset = Math.sin(i * 0.5) * Math.cos(i * 0.2) * 18;
    const y = (dim.h - 85) + (i === 0 || i === steps ? 0 : offset);
    waveD += ` L ${x},${y}`;
  }
  const waveformOverlaySVG = waveform
    ? `<path d="${waveD}" fill="none" stroke="${tc.accent}" stroke-width="1.2" stroke-opacity="0.22" ${neonP ? 'filter="url(#neon-glow)"' : ''}/>`
    : '';

  // Generate technical HUD overlay
  const hudOverlaySVG = hud
    ? `
      <path d="M 25 45 L 25 25 L 45 25" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M ${dim.w - 25} 45 L ${dim.w - 25} 25 L ${dim.w - 45} 25" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M 25 ${dim.h - 45} L 25 ${dim.h - 25} L 45 ${dim.h - 25}" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <path d="M ${dim.w - 25} ${dim.h - 45} L ${dim.w - 25} ${dim.h - 25} L ${dim.w - 45} ${dim.h - 25}" fill="none" stroke="${tc.accent}" stroke-width="1" stroke-opacity="0.3"/>
      <text x="35" y="38" font-family="monospace" font-size="6" font-weight="bold" fill="${tc.accent}" fill-opacity="0.4" letter-spacing="1">SYS_STATUS: ACTIVE</text>
      <text x="${dim.w - 35}" y="38" font-family="monospace" font-size="6" font-weight="bold" fill="${tc.accent}" fill-opacity="0.4" text-anchor="end" letter-spacing="1">COORD: [${dim.w}x${dim.h}]</text>
      <line x1="${dim.w / 2}" y1="20" x2="${dim.w / 2}" y2="28" stroke="${tc.accent}" stroke-opacity="0.2" stroke-width="1"/>
      <line x1="${dim.w / 2 - 4}" y1="24" x2="${dim.w / 2 + 4}" y2="24" stroke="${tc.accent}" stroke-opacity="0.2" stroke-width="1"/>
    `
    : '';

  // Generate light leak rainbow refraction
  const leakOverlaySVG = leak
    ? `
      <linearGradient id="prism-leak" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff007f" stop-opacity="0.14"/>
        <stop offset="30%" stop-color="#7f00ff" stop-opacity="0.04"/>
        <stop offset="70%" stop-color="#00ffff" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#ffaa00" stop-opacity="0.14"/>
      </linearGradient>
      <rect width="${dim.w}" height="${dim.h}" rx="${rx}" fill="url(#prism-leak)" pointer-events="none"/>
    `
    : '';

  // Emphasis highlighting parser
  const renderLineText = (lineText: string) => {
    if (!emphasis || !lineText.includes('*')) {
      return lineText;
    }
    const parts = lineText.split('*');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return `<tspan fill="${tc.accent}" font-weight="bold">${part}</tspan>`;
      }
      return part;
    }).join('');
  };

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim.w} ${dim.h}" width="${dim.w}" height="${dim.h}">
      <defs>
        <linearGradient id="bg" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="${tc.bgStart}" />
          <stop offset="100%" stop-color="${tc.bgEnd}" />
        </linearGradient>
        <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="white" stop-opacity="0.15" />
          <stop offset="40%" stop-color="white" stop-opacity="0" />
          <stop offset="100%" stop-color="black" stop-opacity="0.3" />
        </linearGradient>
        <linearGradient id="irid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff7eb3"/>
          <stop offset="25%" stop-color="#ff758c"/>
          <stop offset="50%" stop-color="#ac73ff"/>
          <stop offset="75%" stop-color="#00f2fe"/>
          <stop offset="100%" stop-color="#4facfe"/>
        </linearGradient>
        <pattern id="grid-pat" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${tc.accent}" stroke-width="0.6" stroke-opacity="0.08"/>
          <circle cx="24" cy="0" r="1.2" fill="${tc.accent}" fill-opacity="0.2"/>
        </pattern>
        ${chromatic ? `
        <filter id="chromatic-aberration">
          <feOffset dx="-1.5" dy="0" in="SourceGraphic" result="redChan"/>
          <feOffset dx="1.5" dy="0" in="SourceGraphic" result="blueChan"/>
          <feColorMatrix in="redChan" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redSplit"/>
          <feColorMatrix in="blueChan" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blueSplit"/>
          <feBlend mode="screen" in="redSplit" in2="blueSplit" result="aberration"/>
          <feBlend mode="normal" in="SourceGraphic" in2="aberration"/>
        </filter>
        ` : ''}
        ${neonP ? `
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur1"/>
          <feGaussianBlur stdDeviation="7" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur2"/>
            <feMergeNode in="blur1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        ` : ''}
      </defs>
      ${backgroundRect}
      <rect x="1" y="1" width="${dim.w - 2}" height="${dim.h - 2}" rx="${rx - 1}" fill="none" stroke="${borderStroke}" stroke-opacity="${borderOpacity}" stroke-width="1" ${borderFilter}/>
      <circle cx="50" cy="50" r="90" fill="${tc.glow}" fill-opacity="${opacityVal}" filter="blur(${blurStrength}px)"/>
      <circle cx="${dim.w - 50}" cy="${dim.h - 50}" r="90" fill="#6366f1" fill-opacity="${opacityVal}" filter="blur(${blurStrength}px)"/>
      ${grainFilter}
      ${waveformOverlaySVG}
      ${hudOverlaySVG}
      ${leakOverlaySVG}
      ${watermark ? `
      <text x="40" y="52" font-family="monospace" font-size="10" font-weight="900" fill="${tc.accent}" letter-spacing="3.5">${customWatermarkText.toUpperCase()}</text>
      <text x="40" y="70" font-family="sans-serif" font-size="8" font-weight="bold" fill="white" fill-opacity="0.3" letter-spacing="1">TRENDING SPOTLIGHT</text>
      ` : ''}
      ${quoteDecoration}
      
      <g ${chromatic ? 'filter="url(#chromatic-aberration)"' : ''}>
        <text x="${textX}" y="${contentTop}" font-family="${ff}" font-size="${fontSize}px" font-style="italic" fill="#e4e4e7" font-weight="300" text-anchor="${anchor}" letter-spacing="${letterSpacing}px">
          ${lines.map((line, idx) => {
            const dy = idx === 0 ? 0 : Math.round(fontSize * lineHeight);
            return `<tspan x="${textX}" dy="${dy}">${renderLineText(line)}</tspan>`;
          }).join('')}
        </text>
      </g>

      <line x1="40" y1="${dim.h - 70}" x2="${dim.w - 40}" y2="${dim.h - 70}" stroke="white" stroke-opacity="0.04" stroke-width="0.8"/>
      <text x="40" y="${dim.h - 42}" font-family="monospace" font-size="10" font-weight="bold" fill="${tc.accent}" letter-spacing="1">@${author.toUpperCase()}</text>
      <text x="${dim.w - 40}" y="${dim.h - 55}" font-family="monospace" font-size="7.5" font-weight="900" fill="${tc.accent}" fill-opacity="0.4" text-anchor="end" letter-spacing="1.5">VERLYN.IN</text>
      <text x="${dim.w - 40}" y="${dim.h - 42}" font-family="monospace" font-size="8" font-weight="bold" fill="white" fill-opacity="0.3" text-anchor="end" letter-spacing="0.5">STREAM: ${stream.toUpperCase()}</text>
    </svg>
  `.trim();

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = dim.w * 4; // 4x scale is high quality and safe for clipboard
    canvas.height = dim.h * 4;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(4, 4);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blobResult) => {
        if (blobResult) {
          try {
            if (typeof window !== 'undefined' && !document.hasFocus()) {
              window.focus();
            }
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blobResult })
            ]).then(() => {
              window.dispatchEvent(new CustomEvent('verlyn:toast', {
                detail: { message: 'Copied quote card to clipboard!', type: 'success' }
              }));
            }).catch((err) => {
              console.error("Clipboard write blocked:", err);
              window.dispatchEvent(new CustomEvent('verlyn:toast', {
                detail: { message: 'Clipboard access blocked. Please download instead.', type: 'error' }
              }));
            });
          } catch (clipboardErr) {
            console.error("Clipboard failure:", clipboardErr);
            window.dispatchEvent(new CustomEvent('verlyn:toast', {
              detail: { message: 'Clipboard api unsupported in this browser.', type: 'error' }
            }));
          }
        }
      }, 'image/png', 1.0);
    }
    URL.revokeObjectURL(url);
  };
  img.onerror = (e) => {
    console.error("Failed to load SVG into Image object inside copyCustomQuoteCardToClipboard:", e);
    window.dispatchEvent(new CustomEvent('verlyn:toast', {
      detail: { message: 'Failed to generate copy buffer.', type: 'error' }
    }));
  };
  img.src = url;
}

// ─── Typography-Tailored Components ──────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  return <span>{value.toLocaleString()}</span>;
}

function Avatar({ src, username, size = 36, className }: { src?: string | null; username?: string; size?: number; className?: string }) {
  const custom = username ? getCustomAestheticAvatar(username) : '';
  const fallback = custom || getAvatarUrl(username || 'user');
  const cleanSrc = (src && src !== 'null' && src !== 'undefined' && src.trim() !== '') ? src : null;

  return (
    <img
      src={cleanSrc || fallback}
      alt={username || 'user'}
      width={size}
      height={size}
      className={clsx("rounded-lg object-cover bg-neutral-900 flex-shrink-0 border border-white/5", className)}
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallback;
      }}
    />
  );
}

function CommunityIcon({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const custom = getCustomCommunityIcon(name);
  const fallback = custom || getCommunityIconUrl(name);
  const cleanSrc = (src && src !== 'null' && src !== 'undefined' && src.trim() !== '') ? src : null;

  return (
    <img
      src={cleanSrc || fallback}
      alt={name}
      width={size}
      height={size}
      className={clsx("rounded-lg object-cover bg-neutral-900 flex-shrink-0 border border-white/5", className)}
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallback;
      }}
    />
  );
}

function VisualTile({ vp, index }: { vp: any; index: number }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(vp.likes || 8);
  const cleanUrl = (vp.mediaUrl && vp.mediaUrl !== 'null' && vp.mediaUrl !== 'undefined' && vp.mediaUrl.trim() !== '') ? vp.mediaUrl : null;
  const isMock = !cleanUrl || cleanUrl.startsWith('https://images.unsplash.com');

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowLiked = !isLiked;
    setIsLiked(nowLiked);
    setLikeCount(prev => nowLiked ? prev + 1 : Math.max(0, prev - 1));
  };

  return (
    <div 
      onClick={() => {
        if (vp.postId) {
          router.push(`/feed/${vp.postId}`);
        }
      }}
      className="aspect-square relative rounded-2xl overflow-hidden border border-white/[0.04] bg-[#0c0c0e]/40 hover:border-white/10 hover:bg-[#0e0e11]/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.6)] group cursor-pointer transition-all duration-500 ease-out"
    >
      {!isMock && !imageError && cleanUrl ? (
        <div className="w-full h-full relative overflow-hidden">
          <img 
            src={cleanUrl} 
            alt="popular visual" 
            className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
            loading="lazy"
            onError={() => setImageError(true)}
          />
          {/* Subtle refraction shine layer overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
      ) : (
        /* Highly Stylized Typographic Serif Post Quote Card */
        <div className="w-full h-full p-4.5 flex flex-col justify-between relative overflow-hidden transition-all duration-500 select-none">
          {/* Subtle grid background blur */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
          
          {/* Giant subtle quote mark */}
          <span className="absolute -left-1 -top-3 text-[56px] font-serif text-white/[0.02] group-hover:text-white/[0.04] transition-colors pointer-events-none select-none">
            “
          </span>
          
          <span className="text-[10px] font-serif italic text-neutral-400 group-hover:text-neutral-200 transition-colors leading-relaxed font-light line-clamp-4 relative z-10 pt-2">
            “{vp.snippet || 'Form follows human dialogue.'}”
          </span>
          
          <span className="text-[8px] font-mono text-neutral-600 group-hover:text-neutral-500 transition-colors tracking-[0.15em] uppercase font-bold">
            @{vp.author}
          </span>
        </div>
      )}
      
      {/* Sliding Glass Like Interaction Overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-3 py-2 flex items-center justify-between opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out backdrop-blur-[1px]">
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1.5 text-[9px] text-white transition-transform active:scale-90 outline-none select-none"
        >
          <Heart 
            size={9.5} 
            className={isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-neutral-400 group-hover:text-rose-400'} 
          />
          <span className={isLiked ? 'text-rose-400 font-bold' : 'text-neutral-400'}>{likeCount}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Constant Curation ────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All', icon: TrendingUp },
  { id: 'design', label: 'Design', icon: Layers },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'technology', label: 'Technology', icon: Cpu },
  { id: 'fashion', label: 'Fashion', icon: Scissors },
  { id: 'cinema', label: 'Cinema', icon: Film },
  { id: 'anime', label: 'Anime', icon: Compass },
  { id: 'photography', label: 'Photography', icon: Camera },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'startups', label: 'Startups', icon: Rocket },
  { id: 'culture', label: 'Culture', icon: Leaf },
  { id: 'sports', label: 'Sports', icon: Activity }
];

// Per-icon unique personality animations (never the same)
const CATEGORY_ANIMATIONS: Record<string, { anim: any; trans: any }> = {
  all:          { anim: { scale: [1, 1.3, 0.9, 1.15, 1] },                    trans: { duration: 0.6, repeat: Infinity, repeatDelay: 2 } },
  design:       { anim: { rotate: [0, -8, 8, -4, 0], scale: [1, 1.1, 1] },    trans: { duration: 0.5, repeat: Infinity, repeatDelay: 3 } },
  music:        { anim: { y: [0, -4, 0, -2.5, 0] },                            trans: { duration: 0.55, repeat: Infinity, repeatDelay: 1.5 } },
  gaming:       { anim: { x: [0, -3, 3, -2, 2, 0] },                          trans: { duration: 0.4, repeat: Infinity, repeatDelay: 2 } },
  technology:   { anim: { scale: [1, 1.25, 1, 1.15, 1] },                     trans: { duration: 0.8, repeat: Infinity, repeatDelay: 1 } },
  fashion:      { anim: { rotate: [0, 20, 0, -10, 0], scale: [1, 1.1, 1] },   trans: { duration: 0.45, repeat: Infinity, repeatDelay: 2.5 } },
  cinema:       { anim: { rotate: [0, 360] },                                  trans: { duration: 0.7, repeat: Infinity, repeatDelay: 3 } },
  anime:        { anim: { rotate: [0, 360] },                                  trans: { duration: 0.5, ease: 'linear', repeat: Infinity, repeatDelay: 2 } },
  photography:  { anim: { scale: [1, 1.35, 0.9, 1.1, 1] },                    trans: { duration: 0.3, repeat: Infinity, repeatDelay: 3 } },
  ai:           { anim: { scale: [1, 1.1, 1], opacity: [1, 0.6, 1] },         trans: { duration: 1.2, repeat: Infinity, repeatDelay: 1 } },
  startups:     { anim: { y: [0, -6, -4, -7, 0], scale: [1, 1.1, 1] },       trans: { duration: 0.6, repeat: Infinity, repeatDelay: 2 } },
  culture:      { anim: { rotate: [0, -12, 12, -6, 0] },                      trans: { duration: 0.8, repeat: Infinity, repeatDelay: 3 } },
  sports:       { anim: { scaleX: [1, 1.3, 0.85, 1.1, 1], scaleY: [1, 0.85, 1.2, 0.95, 1] }, trans: { duration: 0.45, repeat: Infinity, repeatDelay: 2 } },
};

interface CategorySignatureVisualProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  shuffleMode: boolean;
  setShuffleMode: (val: boolean) => void;
}

function CategorySignatureVisual({ 
  selectedCategory, 
  setSelectedCategory,
  shuffleMode,
  setShuffleMode
}: CategorySignatureVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const buttonsRef = useRef<HTMLDivElement | null>(null);
  const hasBootedRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left;
      mouseRef.current.targetY = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    const particles: any[] = [];
    const maxParticles = 30;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.2 + 0.3,
        alpha: Math.random() * 0.4 + 0.1,
        color: i % 2 === 0 ? '#38bdf8' : '#a855f7'
      });
    }

    // Pre-calculated sphere vertices for 3D Neural Network (Technology / AI)
    const neuralNodes: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const theta = Math.acos(-1 + (2 * i) / 30);
      const phi = Math.sqrt(30 * Math.PI) * theta;
      neuralNodes.push({
        x: Math.cos(phi) * Math.sin(theta) * 22,
        y: Math.sin(phi) * Math.sin(theta) * 22,
        z: Math.cos(theta) * 22
      });
    }

    const bootDuration = 240;
    const transitionDuration = 45;
    const totalIntro = bootDuration + transitionDuration;
    let frame = hasBootedRef.current ? totalIntro : 0;
    // Premium cinematic timing:
    // frame < 240: Holographic 3D Typography Title & Beautiful Poetic Typewriter sequence (buttons hidden)
    // frame 240 to 285: Smooth sliding transition (buttons fade in)
    // frame > 285: Widescreen cursor-reactive 3D parallax ambient loop

    const render = () => {
      frame++;
      if (frame >= totalIntro) {
        hasBootedRef.current = true;
      }
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const originalFillText = ctx.fillText;
      ctx.fillText = function (text, x, y, maxWidth) {
        if (frame >= bootDuration && Math.abs(x - centerX) < 2) {
          return;
        }
        return originalFillText.call(this, text, x, y, maxWidth);
      };

      const cat = selectedCategory.toLowerCase();
      const bootProgress = Math.min(1, frame / bootDuration);

      // Direct DOM control for buttons fade and slide back in
      const buttonsEl = buttonsRef.current;
      if (buttonsEl) {
        if (frame < bootDuration) {
          buttonsEl.style.opacity = '0';
          buttonsEl.style.pointerEvents = 'none';
          buttonsEl.style.transform = 'translateY(12px)';
        } else if (frame < totalIntro) {
          const easeProgress = (frame - bootDuration) / transitionDuration;
          const t = easeProgress;
          const cubicEase = t * t * (3 - 2 * t);
          buttonsEl.style.opacity = String(cubicEase);
          buttonsEl.style.transform = `translateY(${12 - cubicEase * 12}px)`;
          if (cubicEase > 0.5) {
            buttonsEl.style.pointerEvents = 'auto';
          }
        } else {
          buttonsEl.style.opacity = '1';
          buttonsEl.style.pointerEvents = 'auto';
          buttonsEl.style.transform = 'translateY(0px)';
        }
      }

      const centerX = width / 2;
      const centerY = height / 2;
      
      // Determine themed color palette for current category
      let themeColor = '251, 191, 36'; // Gold
      let glowHex = '#fbbf24';
      
      switch (cat) {
        case 'design':
          themeColor = '56, 189, 248';
          glowHex = '#38bdf8';
          break;
        case 'music':
          themeColor = '244, 63, 94';
          glowHex = '#f43f5e';
          break;
        case 'gaming':
          themeColor = '168, 85, 247';
          glowHex = '#a855f7';
          break;
        case 'technology':
          themeColor = '56, 189, 248';
          glowHex = '#38bdf8';
          break;
        case 'fashion':
          themeColor = '217, 70, 239';
          glowHex = '#d946ef';
          break;
        case 'cinema':
          themeColor = '59, 130, 246';
          glowHex = '#3b82f6';
          break;
        case 'anime':
          themeColor = '239, 68, 68';
          glowHex = '#ef4444';
          break;
        case 'photography':
          themeColor = '255, 255, 255';
          glowHex = '#ffffff';
          break;
        case 'ai':
          themeColor = '45, 212, 191';
          glowHex = '#2dd4bf';
          break;
        case 'startups':
          themeColor = '251, 191, 36';
          glowHex = '#fbbf24';
          break;
        case 'culture':
          themeColor = '16, 185, 129';
          glowHex = '#10b981';
          break;
        case 'sports':
          themeColor = '249, 115, 22';
          glowHex = '#f97316';
          break;
      }

      ctx.save();

      // Interactive cursor-reactive ambient radial light aura
      if (mouse.active) {
        const radGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 130);
        radGrad.addColorStop(0, `rgba(${themeColor}, 0.04)`);
        radGrad.addColorStop(0.5, `rgba(${themeColor}, 0.008)`);
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Grid Background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.lineWidth = 0.5;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Elegant coordinates horizontal axis behind visualizer
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(20, centerY);
      ctx.lineTo(width - 20, centerY);
      ctx.stroke();

      // HUD markings removed for cleaner design

      // Sweeping grid scanner laser during boot phase
      if (frame < bootDuration) {
        const scanX = bootProgress * width;
        ctx.fillStyle = `rgba(${themeColor}, 0.005)`;
        ctx.fillRect(0, 0, scanX, height);
        ctx.strokeStyle = `rgba(${themeColor}, 0.15)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(scanX, 0);
        ctx.lineTo(scanX, height);
        ctx.stroke();
      }

      // Draw floating background particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // ─── 3D Perspective Projection Engine ───
      const project3D = (x: number, y: number, z: number, rx: number, ry: number, rz: number, customCenter = centerX - 120) => {
        // Roll (Z)
        let x1 = x * Math.cos(rz) - y * Math.sin(rz);
        let y1 = x * Math.sin(rz) + y * Math.cos(rz);
        let z1 = z;

        // Yaw (Y)
        let x2 = x1 * Math.cos(ry) - z1 * Math.sin(ry);
        let y2 = y1;
        let z2 = x1 * Math.sin(ry) + z1 * Math.cos(ry);

        // Pitch (X)
        let x3 = x2;
        let y3 = y2 * Math.cos(rx) - z2 * Math.sin(rx);
        let z3 = y2 * Math.sin(rx) + z2 * Math.cos(rx);

        // Perspective division
        const fov = 160;
        const scale = fov / (fov + z3);
        
        return {
          x: customCenter + x3 * scale,
          y: centerY + y3 * scale,
          scale: scale,
          depth: z3
        };
      };

      // Interactive mouse gravity parallax offsets
      const mouseParallaxX = mouse.active ? (mouse.x - (centerX - 120)) * 0.05 : 0;
      const mouseParallaxY = mouse.active ? (mouse.y - centerY) * 0.05 : 0;

      // ─── 3D Title Renderer during Intro ───
      const draw3DTitle = (text: string, rx: number, ry: number, rz: number, baseSize: number, color: string, glowCol: string, opacity: number) => {
        const chars = text.split('');
        const spacing = baseSize * 0.72;
        const totalW = (chars.length - 1) * spacing;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        chars.forEach((char, idx) => {
          const x = -totalW / 2 + idx * spacing;
          const y = 0;
          const z = 0;
          
          // Project character center directly in center of widescreen canvas during boot
          const pt = project3D(x, y, z, rx, ry, rz, centerX);
          
          const fontSize = Math.max(2, baseSize * pt.scale);
          ctx.shadowBlur = 10 * pt.scale;
          ctx.shadowColor = glowCol;
          
          ctx.font = `bold ${fontSize}px monospace`;
          
          // 3D Shadow Layers
          ctx.fillStyle = `rgba(255, 255, 255, ${0.05 * opacity})`;
          ctx.fillText(char, pt.x + 1.2 * pt.scale, pt.y + 1.2 * pt.scale);
          
          // Front layer
          ctx.fillStyle = `rgba(${color}, ${opacity})`;
          ctx.fillText(char, pt.x, pt.y);
        });
        ctx.restore();
      };

      const getCategoryIntroTitle = (c: string): string => {
        switch (c) {
          case 'design': return 'Design';
          case 'music': return 'Music';
          case 'gaming': return 'Gaming';
          case 'technology': return 'Tech';
          case 'ai': return 'AI';
          case 'fashion': return 'Fashion';
          case 'cinema': return 'Cinema';
          case 'photography': return 'Photography';
          case 'startups': return 'Startups';
          case 'anime': return 'Anime';
          case 'sports': return 'Sports';
          case 'culture': return 'Culture';
          default: return 'Discover';
        }
      };

      const getCategoryBootLogs = (c: string): string[] => {
        switch (c) {
          case 'music':
            return [
              'Setting up the music zone...',
              'Connecting to sweet audio waves...',
              'Finding cozy late-night lofi loops...',
              'Let the music play!'
            ];
          case 'gaming':
            return [
              'Powering up the retro game controllers...',
              'Setting up fast responses...',
              'Loading play zones...',
              'Welcome to the arcade! Let\'s play.'
            ];
          case 'design':
            return [
              'Perfecting layout grids and typography...',
              'Drawing gorgeous spacing lines...',
              'Setting up beautiful creative designs...',
              'Creative studio is ready. Let\'s build.'
            ];
          case 'technology':
            return [
              'Connecting fast nodes across the web...',
              'Optimizing quick routes...',
              'Securing your data...',
              'Verlyn Network is active.'
            ];
          case 'ai':
            return [
              'Connecting neural networks...',
              'Curating helpful custom feeds...',
              'Making search smart...',
              'Verlyn AI online. Hello, friend!'
            ];
          case 'fashion':
            return [
              'Finding style silhouettes...',
              'Weaving premium textures...',
              'Selecting visual styles...',
              'Verlyn Couture is ready.'
            ];
          case 'cinema':
            return [
              'Rolling cameras and viewports...',
              'Setting widescreen cinema frames...',
              'Capturing beautiful human stories...',
              'Verlyn Theatre online. Let\'s watch!'
            ];
          case 'photography':
            return [
              'Focusing camera lens...',
              'Balancing soft light and shadow...',
              'Capturing precious moments...',
              'Verlyn Aperture is active.'
            ];
          case 'startups':
            return [
              'Gathering ideas and project details...',
              'Launching builder dreams...',
              'Helping creative groups grow...',
              'Verlyn Ventures active. Start building.'
            ];
          case 'anime':
            return [
              'Drawing animation cells by hand...',
              'Setting up epic fantasy worlds...',
              'Loading gorgeous art screens...',
              'Verlyn Ink active. Enjoy the show.'
            ];
          case 'sports':
            return [
              'Stepping onto the sports field...',
              'Checking speedometers...',
              'Warming up...',
              'Verlyn Arena online. Go for it!'
            ];
          case 'culture':
            return [
              'Gathering global ideas...',
              'Celebrating shared human art...',
              'Opening welcoming chats...',
              'Verlyn Collective is active. Welcome!'
            ];
          default:
            return [
              'Connecting to your personal feed...',
              'Optimizing layout styling...',
              'Gathering active feeds...',
              'Welcome to Verlyn!'
            ];
        }
      };

      // Intro Typography Overlay rendering
      if (frame < bootDuration) {
        const introOpacity = bootProgress < 0.12 
          ? bootProgress / 0.12 
          : bootProgress > 0.85 
            ? (1 - bootProgress) / 0.15 
            : 1;

        const textRx = 0; // Flat Pitch
        const textRy = 0; // Flat Yaw
        const textRz = 0; // Flat Roll

        draw3DTitle(getCategoryIntroTitle(cat), textRx, textRy, textRz, 22, themeColor, glowHex, introOpacity);

        // Elegant Creative Additions: Glowing HUD Brackets around the title
        ctx.save();
        ctx.strokeStyle = `rgba(${themeColor}, ${introOpacity * 0.14})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const boxW = 85;
        const boxH = 16;
        // Top-left bracket corner
        ctx.moveTo(centerX - boxW, centerY - boxH + 5);
        ctx.lineTo(centerX - boxW, centerY - boxH);
        ctx.lineTo(centerX - boxW + 5, centerY - boxH);
        // Top-right bracket corner
        ctx.moveTo(centerX + boxW - 5, centerY - boxH);
        ctx.lineTo(centerX + boxW, centerY - boxH);
        ctx.lineTo(centerX + boxW, centerY - boxH + 5);
        // Bottom-left bracket corner
        ctx.moveTo(centerX - boxW, centerY + boxH - 5);
        ctx.lineTo(centerX - boxW, centerY + boxH);
        ctx.lineTo(centerX - boxW + 5, centerY + boxH);
        // Bottom-right bracket corner
        ctx.moveTo(centerX + boxW - 5, centerY + boxH);
        ctx.lineTo(centerX + boxW, centerY + boxH);
        ctx.lineTo(centerX + boxW, centerY + boxH - 5);
        ctx.stroke();

        // Oscilloscope Scanning Line gliding vertically inside the brackets
        const scanY = centerY - boxH + 2 + (boxH * 2 - 4) * bootProgress;
        ctx.strokeStyle = `rgba(${themeColor}, ${introOpacity * 0.35})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(centerX - boxW + 2, scanY);
        ctx.lineTo(centerX + boxW - 2, scanY);
        ctx.stroke();

        // Background Cyber Sparks drifting inside the visualizer
        for (let idx = 0; idx < 6; idx++) {
          const sparkSeed = idx * 65.5 + frame * 0.025;
          const sx = centerX - 120 + Math.sin(sparkSeed) * 90;
          const sy = centerY + Math.cos(sparkSeed * 1.4) * 22;
          const sAlpha = Math.max(0, Math.sin(frame * 0.04 + idx) * 0.22 * introOpacity);
          ctx.fillStyle = `rgba(${themeColor}, ${sAlpha})`;
          ctx.font = '5px monospace';
          ctx.fillText(idx % 2 === 0 ? '✦' : '•', sx, sy);
        }
        ctx.restore();

        const logs = getCategoryBootLogs(cat);
        const logsCount = logs.length;
        
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '7px monospace';

        logs.forEach((log, logIdx) => {
          const startProgress = logIdx / logsCount;
          const endProgress = (logIdx + 1) / logsCount;
          
          if (bootProgress >= endProgress) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * introOpacity})`;
            ctx.fillText(log, centerX + 110, centerY - 18 + logIdx * 9);
          } else if (bootProgress >= startProgress && bootProgress < endProgress) {
            const lineProgress = (bootProgress - startProgress) / (endProgress - startProgress);
            const charsToShow = Math.floor(lineProgress * log.length);
            const partialText = log.substring(0, charsToShow);
            const showCursor = Math.floor(frame / 6) % 2 === 0;
            
            ctx.fillStyle = `rgba(${themeColor}, ${1.0 * introOpacity})`;
            ctx.fillText(`${partialText}${showCursor ? '_' : ''}`, centerX + 110, centerY - 18 + logIdx * 9);
          }
        });
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(centerX - 100, centerY + 24, 200, 1.5);
        ctx.fillStyle = `rgba(${themeColor}, ${introOpacity * 0.85})`;
        ctx.fillRect(centerX - 100, centerY + 24, 200 * bootProgress, 1.5);
        ctx.restore();
      }

      const graphicOpacity = frame < bootDuration ? bootProgress * 0.35 : 1.0;

      // ─── 3D Object Rendering ───
      ctx.globalAlpha = graphicOpacity;

      if (cat === 'music') {
        const pitch = Math.PI / 4.5 + mouseParallaxY * 0.01;
        const yaw = frame * (frame < bootDuration ? 0.08 * (1 - bootProgress * 0.5) : 0.03) + mouseParallaxX * 0.01;
        const roll = 0;

        // Turntable chassis base box
        const bW = 24, bH = 3, bD = 24;
        const baseCorners = [
          { x: -bW, y: 10, z: -bD }, { x: bW, y: 10, z: -bD }, { x: bW, y: 10, z: bD }, { x: -bW, y: 10, z: bD },
          { x: -bW, y: 12, z: -bD }, { x: bW, y: 12, z: -bD }, { x: bW, y: 12, z: bD }, { x: -bW, y: 12, z: bD }
        ].map(v => project3D(v.x, v.y, v.z, pitch, yaw, roll));

        ctx.strokeStyle = 'rgba(244, 63, 94, 0.12)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(baseCorners[0].x, baseCorners[0].y);
        for(let i=1; i<4; i++) ctx.lineTo(baseCorners[i].x, baseCorners[i].y);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(baseCorners[4].x, baseCorners[4].y);
        for(let i=5; i<8; i++) ctx.lineTo(baseCorners[i].x, baseCorners[i].y);
        ctx.closePath(); ctx.stroke();
        for(let i=0; i<4; i++) {
          ctx.moveTo(baseCorners[i].x, baseCorners[i].y);
          ctx.lineTo(baseCorners[i+4].x, baseCorners[i+4].y);
        }
        ctx.stroke();

        // Vinyl record grooves
        const grooveCount = 6;
        ctx.lineWidth = 0.6;
        for (let g = 0; g < grooveCount; g++) {
          const r = 8 + g * 2.8;
          ctx.strokeStyle = g === 0 ? 'rgba(251, 191, 36, 0.35)' : `rgba(244, 63, 94, ${0.1 + (g / grooveCount) * 0.25})`;
          ctx.beginPath();
          for (let th = 0; th <= Math.PI * 2; th += 0.15) {
            const pt = project3D(r * Math.cos(th), 8, r * Math.sin(th), pitch, yaw, roll);
            if (th === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
        }

        // Turntable tonearm arm assembly
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const armPin = project3D(17, 3, 17, pitch, yaw, roll);
        const armJoint = project3D(10, 3, 12, pitch, yaw, roll);
        const armCartridge = project3D(6, 7, 7, pitch, yaw, roll);
        ctx.beginPath();
        ctx.moveTo(armPin.x, armPin.y);
        ctx.lineTo(armJoint.x, armJoint.y);
        ctx.lineTo(armCartridge.x, armCartridge.y);
        ctx.stroke();

        const barCount = 16;
        for (let i = 0; i < barCount; i++) {
          const proximity = mouse.active ? Math.max(0.1, 1 - Math.abs(((centerX - 120) + 40 + i * 4.5) - mouse.x) / 120) : 0.25;
          const h = Math.abs(Math.sin(frame * 0.06 + i * 0.3)) * (16 + proximity * 28);
          
          const x = (centerX - 120) + 40 + i * 4.5;
          const peakH = h + Math.sin(frame * 0.12 + i) * 2;
          ctx.fillStyle = `rgba(${themeColor}, 0.25)`;
          ctx.fillRect(x, centerY - peakH / 2 - 2, 2, 1);
          
          ctx.fillStyle = `hsla(${340 + i * 2.2}, 95%, 65%, ${graphicOpacity})`;
          ctx.fillRect(x, centerY - h / 2, 2, h);
        }

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Acoustic Session', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Now Playing • Random Mix' : 'Now Playing • Curated Playlist', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'gaming') {
        const rx = Math.PI / 8 + mouseParallaxY * 0.005;
        const ry = frame * 0.012 + mouseParallaxX * 0.005;
        const rz = 0;

        const gCenter = centerX - 120;
        const projG = (x: number, y: number, z: number) => project3D(x, y, z, rx, ry, rz, gCenter);

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)'; // Purple theme
        ctx.lineWidth = 1.0;

        // 3D Handheld Console Casing (width=24, height=10, depth=1.6)
        const w = 12, h = 5, d = 0.8;
        const body = [
          // Front face corners
          { x: -w, y: -h, z: d }, { x: w, y: -h, z: d }, { x: w, y: h, z: d }, { x: -w, y: h, z: d },
          // Back face corners
          { x: -w, y: -h, z: -d }, { x: w, y: -h, z: -d }, { x: w, y: h, z: -d }, { x: -w, y: h, z: -d }
        ].map(v => projG(v.x, v.y, v.z));

        // Draw Casing edges
        ctx.beginPath();
        ctx.moveTo(body[0].x, body[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(body[i].x, body[i].y);
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(body[4].x, body[4].y);
        for (let i = 5; i < 8; i++) ctx.lineTo(body[i].x, body[i].y);
        ctx.closePath(); ctx.stroke();

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(body[i].x, body[i].y);
          ctx.lineTo(body[i + 4].x, body[i + 4].y);
          ctx.stroke();
        }

        // 1. Central Widescreen display boundary on the front face (from x = -7.5 to 7.5, y = -4.0 to 4.0)
        const screenCorners = [
          { x: -7.5, y: -4.0, z: d + 0.05 }, { x: 7.5, y: -4.0, z: d + 0.05 },
          { x: 7.5, y: 4.0, z: d + 0.05 }, { x: -7.5, y: 4.0, z: d + 0.05 }
        ].map(v => projG(v.x, v.y, v.z));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
        ctx.closePath(); ctx.stroke();

        // 2. Left side Controls (at x = -9.8)
        // Left thumbstick (analog circle)
        const leftStick = projG(-9.8, -1.8, d + 0.1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(leftStick.x, leftStick.y, Math.max(0.6, 1.2 * leftStick.scale), 0, Math.PI * 2);
        ctx.stroke();

        // Left D-pad (small cross centered at x = -9.8, y = 1.8)
        const dpadSize = 1.2;
        const dpadC = { x: -9.8, y: 1.8, z: d + 0.1 };
        const dpadH = projG(dpadC.x - dpadSize, dpadC.y, dpadC.z);
        const dpadH2 = projG(dpadC.x + dpadSize, dpadC.y, dpadC.z);
        const dpadV = projG(dpadC.x, dpadC.y - dpadSize, dpadC.z);
        const dpadV2 = projG(dpadC.x, dpadC.y + dpadSize, dpadC.z);
        ctx.beginPath(); ctx.moveTo(dpadH.x, dpadH.y); ctx.lineTo(dpadH2.x, dpadH2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dpadV.x, dpadV.y); ctx.lineTo(dpadV2.x, dpadV2.y); ctx.stroke();

        // 3. Right side Controls (at x = 9.8)
        // Right Action buttons (A/B/X/Y cluster centered around x = 9.8, y = -1.8)
        const btnRadius = 0.5;
        const btns = [
          projG(9.8, -2.6, d + 0.1), // Y (top)
          projG(9.8, -1.0, d + 0.1), // A (bottom)
          projG(9.0, -1.8, d + 0.1), // X (left)
          projG(10.6, -1.8, d + 0.1) // B (right)
        ];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        btns.forEach(btn => {
          ctx.beginPath();
          ctx.arc(btn.x, btn.y, Math.max(0.4, btnRadius * btn.scale), 0, Math.PI * 2);
          ctx.fill();
        });

        // Right thumbstick (analog circle at x = 9.8, y = 1.8)
        const rightStick = projG(9.8, 1.8, d + 0.1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(rightStick.x, rightStick.y, Math.max(0.6, 1.2 * rightStick.scale), 0, Math.PI * 2);
        ctx.stroke();

        // 4. Retro Pong Game Screen Animation (inside screen bounds)
        // Left Paddle
        const lPaddleY = Math.sin(frame * 0.06) * 2.2;
        const lpTop = projG(-6.8, lPaddleY - 1.0, d + 0.1);
        const lpBot = projG(-6.8, lPaddleY + 1.0, d + 0.1);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(lpTop.x, lpTop.y); ctx.lineTo(lpBot.x, lpBot.y); ctx.stroke();

        // Right Paddle (tracking ball slightly)
        const rPaddleY = Math.sin(frame * 0.06 + Math.PI/2) * 2.0;
        const rpTop = projG(6.8, rPaddleY - 1.0, d + 0.1);
        const rpBot = projG(6.8, rPaddleY + 1.0, d + 0.1);
        ctx.beginPath(); ctx.moveTo(rpTop.x, rpTop.y); ctx.lineTo(rpBot.x, rpBot.y); ctx.stroke();

        // Bouncing Ball
        const ballX = Math.sin(frame * 0.04) * 6.3;
        const ballY = Math.sin(frame * 0.08) * 3.3;
        const ballPt = projG(ballX, ballY, d + 0.12);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballPt.x, ballPt.y, Math.max(0.6, 1.0 * ballPt.scale), 0, Math.PI * 2);
        ctx.fill();

        // Screen center net line (dashed division)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
        const netTop = projG(0, -4, d + 0.05);
        const netBot = projG(0, 4, d + 0.05);
        ctx.beginPath(); ctx.moveTo(netTop.x, netTop.y); ctx.lineTo(netBot.x, netBot.y); ctx.stroke();
        ctx.setLineDash([]);

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Retro Arcade', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Retro Arcade • Endless Challenge' : 'Retro Arcade • Campaign Play', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'design') {
        const rx = Math.PI / 8 + mouseParallaxY * 0.006;
        const ry = frame * 0.015 + mouseParallaxX * 0.008;
        const rz = 0;

        // Desktop Monitor platform base
        const basePoints = [
          { x: -8, y: 16, z: -6 }, { x: 8, y: 16, z: -6 },
          { x: 8, y: 16, z: 6 },  { x: -8, y: 16, z: 6 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(basePoints[0].x, basePoints[0].y);
        for(let i=1; i<4; i++) ctx.lineTo(basePoints[i].x, basePoints[i].y);
        ctx.closePath(); ctx.stroke();

        // Monitor support stand stem line
        const pStemBottom = project3D(0, 16, 0, rx, ry, rz);
        const pStemTop = project3D(0, 4, -2, rx, ry, rz);
        ctx.beginPath(); ctx.moveTo(pStemBottom.x, pStemBottom.y); ctx.lineTo(pStemTop.x, pStemTop.y); ctx.stroke();

        // Monitor outer display chassis
        const screenCorners = [
          { x: -22, y: -12, z: -2 }, { x: 22, y: -12, z: -2 },
          { x: 22, y: 4, z: -2 },  { x: -22, y: 4, z: -2 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(screenCorners[0].x, screenCorners[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(screenCorners[i].x, screenCorners[i].y);
        ctx.closePath(); ctx.stroke();

        // Inner bezel/screen face detail
        const screenInner = [
          { x: -20, y: -10, z: -2 }, { x: 20, y: -10, z: -2 },
          { x: 20, y: 2, z: -2 },  { x: -20, y: 2, z: -2 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
        ctx.beginPath();
        ctx.moveTo(screenInner[0].x, screenInner[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(screenInner[i].x, screenInner[i].y);
        ctx.closePath(); ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Creative Canvas', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Creative Canvas • Random Inspiration' : 'Creative Canvas • Grid Guidelines', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'technology') {
        const rx = Math.PI / 8 + mouseParallaxY * 0.006;
        const ry = frame * 0.015 + mouseParallaxX * 0.008;
        const rz = 0;

        // Folding Laptop Keyboard deck platform
        const pBase = [
          { x: -22, y: 10, z: -15 }, { x: 22, y: 10, z: -15 },
          { x: 22, y: 12, z: 12 },  { x: -22, y: 12, z: 12 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        // Angled back folding display Screen
        const pScreen = [
          { x: -22, y: 10, z: -15 }, { x: 22, y: 10, z: -15 },
          { x: 22, y: -16, z: -24 }, { x: -22, y: -16, z: -24 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.moveTo(pBase[0].x, pBase[0].y);
        ctx.lineTo(pBase[1].x, pBase[1].y);
        ctx.lineTo(pBase[2].x, pBase[2].y);
        ctx.lineTo(pBase[3].x, pBase[3].y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pScreen[0].x, pScreen[0].y);
        ctx.lineTo(pScreen[1].x, pScreen[1].y);
        ctx.lineTo(pScreen[2].x, pScreen[2].y);
        ctx.lineTo(pScreen[3].x, pScreen[3].y);
        ctx.closePath();
        ctx.stroke();

        // Inner bezel LCD detail
        const pBezel = [
          { x: -19, y: 7, z: -16 }, { x: 19, y: 7, z: -16 },
          { x: 19, y: -13, z: -22 }, { x: -19, y: -13, z: -22 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(pBezel[0].x, pBezel[0].y);
        ctx.lineTo(pBezel[1].x, pBezel[1].y);
        ctx.lineTo(pBezel[2].x, pBezel[2].y);
        ctx.lineTo(pBezel[3].x, pBezel[3].y);
        ctx.closePath();
        ctx.stroke();

        // Keyboard Touchpad deck detail
        const pTrackpad = [
          { x: -5, y: 11.2, z: 2 }, { x: 5, y: 11.2, z: 2 },
          { x: 5, y: 11.8, z: 9 },  { x: -5, y: 11.8, z: 9 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pTrackpad[0].x, pTrackpad[0].y);
        ctx.lineTo(pTrackpad[1].x, pTrackpad[1].y);
        ctx.lineTo(pTrackpad[2].x, pTrackpad[2].y);
        ctx.lineTo(pTrackpad[3].x, pTrackpad[3].y);
        ctx.closePath();
        ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Developer Workspace', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.fillText(shuffleMode ? 'Systems Matrix • Exploration Node' : 'Systems Matrix • Secure Core', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'ai') {
        const rx = Math.PI / 6 + mouseParallaxY * 0.005;
        const ry = frame * 0.01 + mouseParallaxX * 0.005;
        const rz = 0;

        const aiCenter = centerX - 120;
        const projAI = (x: number, y: number, z: number) => project3D(x, y, z, rx, ry, rz, aiCenter);

        ctx.strokeStyle = 'rgba(45, 212, 191, 0.65)'; // Teal theme
        ctx.lineWidth = 1.0;

        // Substrate plate (CPU PCB Board) - Width = 26, Length = 26, Thickness = 2
        const w = 13, d = 1.2;
        const pcb = [
          // Front face corners
          { x: -w, y: -w, z: d }, { x: w, y: -w, z: d }, { x: w, y: w, z: d }, { x: -w, y: w, z: d },
          // Back face corners
          { x: -w, y: -w, z: -d }, { x: w, y: -w, z: -d }, { x: w, y: w, z: -d }, { x: -w, y: w, z: -d }
        ].map(v => projAI(v.x, v.y, v.z));

        // Draw PCB Board outline
        ctx.beginPath();
        ctx.moveTo(pcb[0].x, pcb[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(pcb[i].x, pcb[i].y);
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pcb[4].x, pcb[4].y);
        for (let i = 5; i < 8; i++) ctx.lineTo(pcb[i].x, pcb[i].y);
        ctx.closePath(); ctx.stroke();

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(pcb[i].x, pcb[i].y);
          ctx.lineTo(pcb[i + 4].x, pcb[i + 4].y);
          ctx.stroke();
        }

        // Central metal heat die (Processor Die) - Width = 7, Length = 7, Height = 1.5
        const dw = 6.5, dh = 1.5;
        const die = [
          { x: -dw, y: -dw, z: d + dh }, { x: dw, y: -dw, z: d + dh },
          { x: dw, y: dw, z: d + dh }, { x: -dw, y: dw, z: d + dh }
        ].map(v => projAI(v.x, v.y, v.z));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(die[0].x, die[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(die[i].x, die[i].y);
        ctx.closePath(); ctx.stroke();

        // Pulsing core light in the center of the die
        const pulse = 1.5 + Math.sin(frame * 0.08) * 0.8;
        const corePt = projAI(0, 0, d + dh + 0.1);
        ctx.fillStyle = `rgba(45, 212, 191, ${0.45 + Math.sin(frame * 0.08) * 0.25})`;
        ctx.beginPath();
        ctx.arc(corePt.x, corePt.y, Math.max(1, pulse * corePt.scale), 0, Math.PI * 2);
        ctx.fill();

        // Connect trace lines (circuits) running from center to the edges
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.25)';
        ctx.lineWidth = 0.6;
        const traceOffsets = [-10, -5, 0, 5, 10];
        traceOffsets.forEach(offset => {
          // Top edge traces
          const topStart = projAI(offset * 0.5, -dw, d + 0.1);
          const topMid = projAI(offset * 0.5, -dw - 1.5, d + 0.1);
          const topEnd = projAI(offset, -w, d + 0.1);
          ctx.beginPath(); ctx.moveTo(topStart.x, topStart.y); ctx.lineTo(topMid.x, topMid.y); ctx.lineTo(topEnd.x, topEnd.y); ctx.stroke();

          // Bottom edge traces
          const botStart = projAI(offset * 0.5, dw, d + 0.1);
          const botMid = projAI(offset * 0.5, dw + 1.5, d + 0.1);
          const botEnd = projAI(offset, w, d + 0.1);
          ctx.beginPath(); ctx.moveTo(botStart.x, botStart.y); ctx.lineTo(botMid.x, botMid.y); ctx.lineTo(botEnd.x, botEnd.y); ctx.stroke();

          // Left edge traces
          const leftStart = projAI(-dw, offset * 0.5, d + 0.1);
          const leftMid = projAI(-dw - 1.5, offset * 0.5, d + 0.1);
          const leftEnd = projAI(-w, offset, d + 0.1);
          ctx.beginPath(); ctx.moveTo(leftStart.x, leftStart.y); ctx.lineTo(leftMid.x, leftMid.y); ctx.lineTo(leftEnd.x, leftEnd.y); ctx.stroke();

          // Right edge traces
          const rightStart = projAI(dw, offset * 0.5, d + 0.1);
          const rightMid = projAI(dw + 1.5, offset * 0.5, d + 0.1);
          const rightEnd = projAI(w, offset, d + 0.1);
          ctx.beginPath(); ctx.moveTo(rightStart.x, rightStart.y); ctx.lineTo(rightMid.x, rightMid.y); ctx.lineTo(rightEnd.x, rightEnd.y); ctx.stroke();
        });

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Silicon Brain', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Silicon Brain • Generative Mode' : 'Silicon Brain • Static Model', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'fashion') {
        const rx = frame * 0.008 + mouseParallaxY * 0.008;
        const ry = frame * 0.012 + mouseParallaxX * 0.008;
        const rz = 0;

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
        ctx.lineWidth = 1.0;

        // Clothing hanger top hook arc
        ctx.beginPath();
        for (let th = -Math.PI/2; th <= Math.PI/2; th += 0.2) {
          const rH = 4;
          const pt = project3D(rH * Math.cos(th), -8 + rH * Math.sin(th), 0, rx, ry, rz);
          if (th === -Math.PI/2) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Shoulder triangle outline
        const pHanger = [
          { x: 0, y: -4, z: 0 },
          { x: -22, y: 7, z: 0 },
          { x: 22, y: 7, z: 0 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.beginPath();
        ctx.moveTo(pHanger[0].x, pHanger[0].y);
        ctx.lineTo(pHanger[1].x, pHanger[1].y);
        ctx.lineTo(pHanger[2].x, pHanger[2].y);
        ctx.closePath();
        ctx.stroke();

        // Crossbar
        ctx.beginPath();
        ctx.moveTo(pHanger[1].x, pHanger[1].y);
        ctx.lineTo(pHanger[2].x, pHanger[2].y);
        ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Design Atelier', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Design Atelier • Seasonal Mix' : 'Design Atelier • Lookbook Collection', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'cinema') {
        const rx = Math.PI / 8 + mouseParallaxY * 0.005;
        const ry = frame * 0.006 + mouseParallaxX * 0.006;
        const rz = -0.05; // Gentle tilt

        const cCenter = centerX - 120;
        const projC = (x: number, y: number, z: number) => project3D(x, y, z, rx, ry, rz, cCenter);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)'; // Blue theme
        ctx.lineWidth = 1.0;

        // Base Board (Slate) - Width = 26, Height = 14, Depth = 2
        // We render it from y = 0 to 14
        const w = 13, hTop = 0, hBot = 12, d = 1;
        const baseBoard = [
          // Front face corners
          { x: -w, y: hTop, z: d }, { x: w, y: hTop, z: d }, { x: w, y: hBot, z: d }, { x: -w, y: hBot, z: d },
          // Back face corners
          { x: -w, y: hTop, z: -d }, { x: w, y: hTop, z: -d }, { x: w, y: hBot, z: -d }, { x: -w, y: hBot, z: -d }
        ].map(v => projC(v.x, v.y, v.z));

        // Draw Base Board
        ctx.beginPath();
        ctx.moveTo(baseBoard[0].x, baseBoard[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(baseBoard[i].x, baseBoard[i].y);
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(baseBoard[4].x, baseBoard[4].y);
        for (let i = 5; i < 8; i++) ctx.lineTo(baseBoard[i].x, baseBoard[i].y);
        ctx.closePath(); ctx.stroke();

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(baseBoard[i].x, baseBoard[i].y);
          ctx.lineTo(baseBoard[i + 4].x, baseBoard[i + 4].y);
          ctx.stroke();
        }

        // Draw details/text markings on the front of the slate board
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.8;
        // Text slots
        const slots = [
          { x1: -10, y1: 3.5, x2: -4, y2: 3.5 }, // SCENE
          { x1: -2, y1: 3.5, x2: 4, y2: 3.5 },   // TAKE
          { x1: 6, y1: 3.5, x2: 10, y2: 3.5 },   // ROLL
          { x1: -10, y1: 7.5, x2: 10, y2: 7.5 }  // TITLE
        ];
        slots.forEach(s => {
          const p1 = projC(s.x1, s.y1, d + 0.1);
          const p2 = projC(s.x2, s.y2, d + 0.1);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        });

        // Hinge point at the top left edge: x = -13, y = 0
        // Timed clapper flapping animation (every 3 seconds = 180 frames)
        const cycle = (frame + 30) % 180;
        let clapAngle = -0.35; // Default open
        if (cycle < 12) {
          const t = cycle / 12;
          clapAngle = -0.35 * (1 - t); // Clapping down to 0
        } else if (cycle >= 12 && cycle < 35) {
          clapAngle = 0; // Stay closed
        } else if (cycle >= 35 && cycle < 55) {
          const t = (cycle - 35) / 20;
          clapAngle = -0.35 * t; // Reopening to -0.35
        }

        // Upper Clapping Stick (hinged at x = -13, y = 0)
        // Width = 26, Height = 2.4, Depth = 2
        // We define unrotated points relative to pivot: dx = x + 13, dy = y - 0
        const rotateClapper = (x: number, y: number, z: number) => {
          const dx = x + 13;
          const dy = y;
          const rx_pivot = dx * Math.cos(clapAngle) - dy * Math.sin(clapAngle);
          const ry_pivot = dx * Math.sin(clapAngle) + dy * Math.cos(clapAngle);
          return projC(rx_pivot - 13, ry_pivot, z);
        };

        const clapperVerts = [
          // Front face
          rotateClapper(-13, -2.4, d), rotateClapper(13, -2.4, d), rotateClapper(13, 0, d), rotateClapper(-13, 0, d),
          // Back face
          rotateClapper(-13, -2.4, -d), rotateClapper(13, -2.4, -d), rotateClapper(13, 0, -d), rotateClapper(-13, 0, -d)
        ];

        // Draw Clapping Stick
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(clapperVerts[0].x, clapperVerts[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(clapperVerts[i].x, clapperVerts[i].y);
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(clapperVerts[4].x, clapperVerts[4].y);
        for (let i = 5; i < 8; i++) ctx.lineTo(clapperVerts[i].x, clapperVerts[i].y);
        ctx.closePath(); ctx.stroke();

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(clapperVerts[i].x, clapperVerts[i].y);
          ctx.lineTo(clapperVerts[i + 4].x, clapperVerts[i + 4].y);
          ctx.stroke();
        }

        // Draw alternating clapperboard stripes on the clapping stick
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.8;
        for (let idx = 0; idx < 5; idx++) {
          const sx = -10 + idx * 5;
          const p1 = rotateClapper(sx, 0, d + 0.1);
          const p2 = rotateClapper(sx + 2.5, -2.4, d + 0.1);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText("Director's Cut", (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? "Director's Cut • Anthology Mode" : "Director's Cut • Linear Storyline", (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'photography') {
        const rx = frame * 0.008 + mouseParallaxY * 0.008;
        const ry = frame * 0.012 + mouseParallaxX * 0.008;
        const rz = 0;

        // DSLR Camera body outline corners
        const cW = 20, cH = 12, cD = 8;
        const corners = [
          { x: -cW, y: cH, z: -cD }, { x: cW, y: cH, z: -cD }, { x: cW, y: cH, z: cD }, { x: -cW, y: cH, z: cD },
          { x: -cW, y: -cH, z: -cD }, { x: cW, y: -cH, z: -cD }, { x: cW, y: -cH, z: cD }, { x: -cW, y: -cH, z: cD }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1.0;

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for(let i=1; i<4; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(corners[4].x, corners[4].y);
        for(let i=5; i<8; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath(); ctx.stroke();

        for(let i=0; i<4; i++) {
          ctx.moveTo(corners[i].x, corners[i].y);
          ctx.lineTo(corners[i+4].x, corners[i+4].y);
        }
        ctx.stroke();

        // Top Viewfinder chassis block
        const vPoints = [
          { x: -6, y: -cH, z: -4 }, { x: 6, y: -cH, z: -4 }, { x: 6, y: -cH, z: 4 }, { x: -6, y: -cH, z: 4 },
          { x: -6, y: -cH - 3, z: -4 }, { x: 6, y: -cH - 3, z: -4 }, { x: 6, y: -cH - 3, z: 4 }, { x: -6, y: -cH - 3, z: 4 }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.moveTo(vPoints[0].x, vPoints[0].y);
        for(let i=1; i<4; i++) ctx.lineTo(vPoints[i].x, vPoints[i].y);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(vPoints[4].x, vPoints[4].y);
        for(let i=5; i<8; i++) ctx.lineTo(vPoints[i].x, vPoints[i].y);
        ctx.closePath(); ctx.stroke();
        for(let i=0; i<4; i++) {
          ctx.moveTo(vPoints[i].x, vPoints[i].y);
          ctx.lineTo(vPoints[i+4].x, vPoints[i+4].y);
        }
        ctx.stroke();

        // Extended forward camera lens barrel rings
        const lRadius = 9;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let th = 0; th <= Math.PI * 2; th += 0.2) {
          const pt = project3D(lRadius * Math.cos(th), lRadius * Math.sin(th), 8, rx, ry, rz);
          if (th === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath(); ctx.stroke();

        ctx.beginPath();
        for (let th = 0; th <= Math.PI * 2; th += 0.2) {
          const pt = project3D(lRadius * Math.cos(th), lRadius * Math.sin(th), 14, rx, ry, rz);
          if (th === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath(); ctx.stroke();

        // Lens body spokes/ribs
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 0.8;
        const spokes = [0, Math.PI/2, Math.PI, Math.PI*1.5];
        spokes.forEach(th => {
          const p1 = project3D(lRadius * Math.cos(th), lRadius * Math.sin(th), 8, rx, ry, rz);
          const p2 = project3D(lRadius * Math.cos(th), lRadius * Math.sin(th), 14, rx, ry, rz);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        });

        if (frame > 45 && frame < 65) {
          const age = (frame - 45) / 20;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * (1 - age)})`;
          ctx.fillRect(0, 0, width, height);
        }

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Camera Aperture', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Camera Aperture • Dynamic Focus' : 'Camera Aperture • Manual Exposure', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'startups') {
        const rx = Math.PI / 8 + mouseParallaxY * 0.005;
        const ry = frame * 0.015 + mouseParallaxX * 0.008;
        const rz = 0;

        const r = 5.5;
        const yTop = -8;
        const yBot = 10;
        
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.0;

        // Spacesuit rocket capsule tip cone
        const pTip = project3D(0, -20, 0, rx, ry, rz);

        const drawBodyRing = (hVal: number, alpha: number) => {
          ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
          ctx.beginPath();
          for (let th = 0; th <= Math.PI * 2; th += 0.2) {
            const pt = project3D(r * Math.cos(th), hVal, r * Math.sin(th), rx, ry, rz);
            if (th === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath(); ctx.stroke();
        };

        drawBodyRing(yTop, 0.7);
        drawBodyRing(0, 0.4);
        drawBodyRing(yBot, 0.7);

        // Core cylinder body lines
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        for (let th = 0; th < Math.PI * 2; th += Math.PI / 2) {
          const pRing = project3D(r * Math.cos(th), yTop, r * Math.sin(th), rx, ry, rz);
          ctx.beginPath(); ctx.moveTo(pTip.x, pTip.y); ctx.lineTo(pRing.x, pRing.y); ctx.stroke();

          const pRingBot = project3D(r * Math.cos(th), yBot, r * Math.sin(th), rx, ry, rz);
          ctx.beginPath(); ctx.moveTo(pRing.x, pRing.y); ctx.lineTo(pRingBot.x, pRingBot.y); ctx.stroke();
        }

        // Space booster wings
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.2;
        const finAngles = [0, Math.PI * 2/3, Math.PI * 4/3];
        finAngles.forEach(th => {
          const p1 = project3D(r * Math.cos(th), yBot - 8, r * Math.sin(th), rx, ry, rz);
          const p2 = project3D((r + 6) * Math.cos(th), yBot + 4, (r + 2) * Math.sin(th), rx, ry, rz);
          const p3 = project3D(r * Math.cos(th), yBot, r * Math.sin(th), rx, ry, rz);
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
        });

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Startup Accelerator', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(shuffleMode ? 'Startup Accelerator • Dynamic Pitch' : 'Startup Accelerator • Stable Seed', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'anime') {
        const rx = Math.PI / 6 + mouseParallaxY * 0.005;
        const ry = frame * 0.012 + mouseParallaxX * 0.008;
        const rz = 0;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
        ctx.lineWidth = 1.2;

        // Torii Gate left pillar
        const pL1 = project3D(-14, 14, 0, rx, ry, rz);
        const pL2 = project3D(-14, -6, 0, rx, ry, rz);
        ctx.beginPath(); ctx.moveTo(pL1.x, pL1.y); ctx.lineTo(pL2.x, pL2.y); ctx.stroke();

        // Right pillar
        const pR1 = project3D(14, 14, 0, rx, ry, rz);
        const pR2 = project3D(14, -6, 0, rx, ry, rz);
        ctx.beginPath(); ctx.moveTo(pR1.x, pR1.y); ctx.lineTo(pR2.x, pR2.y); ctx.stroke();

        // Curving upper lintel beam
        const steps = 14;
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          const xVal = -22 + ratio * 44;
          const yVal = -10 - Math.pow(Math.abs(ratio - 0.5) * 2, 2) * 2.5;
          const pt = project3D(xVal, yVal, 0, rx, ry, rz);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Lower support tie beam horizontal line
        const pT1 = project3D(-18, -2, 0, rx, ry, rz);
        const pT2 = project3D(18, -2, 0, rx, ry, rz);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath(); ctx.moveTo(pT1.x, pT1.y); ctx.lineTo(pT2.x, pT2.y); ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Studio Animation', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Studio Animation • Showcase Reels' : 'Studio Animation • Main Timeline', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'sports') {
        const rx = Math.PI / 10 + mouseParallaxY * 0.005;
        const ry = frame * 0.006 + mouseParallaxX * 0.005;
        const rz = 0;

        const sCenter = centerX - 120;
        const projS = (x: number, y: number, z: number) => project3D(x, y, z, rx, ry, rz, sCenter);

        ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)'; // Orange theme
        ctx.lineWidth = 1.0;

        // 1. Backboard (centered at 0, -6, -4)
        const backboard = [
          { x: -9, y: -12, z: -4 }, { x: 9, y: -12, z: -4 },
          { x: 9, y: 0, z: -4 }, { x: -9, y: 0, z: -4 }
        ].map(v => projS(v.x, v.y, v.z));

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(backboard[0].x, backboard[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(backboard[i].x, backboard[i].y);
        ctx.closePath(); ctx.stroke();

        // Inner target square on the backboard
        const target = [
          { x: -3.5, y: -6, z: -3.9 }, { x: 3.5, y: -6, z: -3.9 },
          { x: 3.5, y: -1, z: -3.9 }, { x: -3.5, y: -1, z: -3.9 }
        ].map(v => projS(v.x, v.y, v.z));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(target[0].x, target[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(target[i].x, target[i].y);
        ctx.closePath(); ctx.stroke();

        // 2. Hoop Rim (circle centered at x = 0, y = 0, z = 1)
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
        ctx.lineWidth = 1.2;
        const rRim = 4.2;
        const rimPoints: any[] = [];
        ctx.beginPath();
        for (let th = 0; th <= Math.PI * 2; th += 0.2) {
          const pt = projS(rRim * Math.cos(th), 0, 1 + rRim * Math.sin(th));
          rimPoints.push(pt);
          if (th === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath(); ctx.stroke();

        // Connection bracket to backboard
        const bracketStart = projS(0, 0, -4);
        const bracketEnd = projS(0, 0, 1 - rRim);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
        ctx.beginPath(); ctx.moveTo(bracketStart.x, bracketStart.y); ctx.lineTo(bracketEnd.x, bracketEnd.y); ctx.stroke();

        // 3. Hoop Net (mesh lines hanging down to y = 5.5, z = 1, radius = 2.6)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 0.8;
        const rNetBot = 2.6;
        const netY = 5.5;
        const netBotPoints: any[] = [];
        
        // Compute bottom net ring points
        for (let th = 0; th <= Math.PI * 2; th += 0.2) {
          netBotPoints.push(projS(rNetBot * Math.cos(th), netY, 1 + rNetBot * Math.sin(th)));
        }

        // Draw vertical net guide lines connecting rim to bottom ring
        const numStrings = 10;
        for (let i = 0; i < numStrings; i++) {
          const angle = (i * Math.PI * 2) / numStrings;
          const rimPt = projS(rRim * Math.cos(angle), 0, 1 + rRim * Math.sin(angle));
          const netPt = projS(rNetBot * Math.cos(angle), netY, 1 + rNetBot * Math.sin(angle));
          
          // Draw zigzag mesh pattern
          const nextAngle = ((i + 1) * Math.PI * 2) / numStrings;
          const midPt = projS(((rRim + rNetBot)/2) * Math.cos(angle + (Math.PI / numStrings)), netY / 2, 1 + ((rRim + rNetBot)/2) * Math.sin(angle + (Math.PI / numStrings)));
          
          ctx.beginPath();
          ctx.moveTo(rimPt.x, rimPt.y);
          ctx.lineTo(midPt.x, midPt.y);
          ctx.lineTo(netPt.x, netPt.y);
          ctx.stroke();

          // Connect in the other direction for grid/mesh look
          const rimPtNext = projS(rRim * Math.cos(nextAngle), 0, 1 + rRim * Math.sin(nextAngle));
          ctx.beginPath();
          ctx.moveTo(rimPtNext.x, rimPtNext.y);
          ctx.lineTo(midPt.x, midPt.y);
          ctx.stroke();
        }

        // 4. Basketball (orange ball bouncing through hoop)
        // Y goes from -15 (high above backboard) down to 9 (fully through the net)
        const bounceCycle = (frame * 0.05) % Math.PI; // Full cycle on positive sine wave
        const ballY = -15 + Math.abs(Math.sin(bounceCycle)) * 24;
        const ballPt = projS(0, ballY, 1);
        const ballRadius = Math.max(1.8, 3.4 * ballPt.scale);

        // Draw ball silhouette background to hide net lines behind it
        ctx.fillStyle = '#050505'; // Match background/transparent container blend
        ctx.beginPath();
        ctx.arc(ballPt.x, ballPt.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw orange ball
        ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
        ctx.beginPath();
        ctx.arc(ballPt.x, ballPt.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw black seams
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(ballPt.x - ballRadius, ballPt.y); ctx.lineTo(ballPt.x + ballRadius, ballPt.y);
        ctx.moveTo(ballPt.x, ballPt.y - ballRadius); ctx.lineTo(ballPt.x, ballPt.y + ballRadius);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ballPt.x - ballRadius * 0.45, ballPt.y, ballRadius * 0.85, -Math.PI/3.2, Math.PI/3.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ballPt.x + ballRadius * 0.45, ballPt.y, ballRadius * 0.85, Math.PI*2.2/3.2, Math.PI*3.8/3.2);
        ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Arena Stadium', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Arena Stadium • Multi-Game Focus' : 'Arena Stadium • Match Play', (centerX - 120) + 120, centerY + 8);
        }

      } else if (cat === 'culture') {
        const rx = Math.PI / 6 + mouseParallaxY * 0.005;
        const ry = frame * 0.01 + mouseParallaxX * 0.008;
        const rz = 0;

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = 1.0;

        // Zen platform foundation base
        const bW = 16, bH = 4, bD = 16;
        const base = [
          { x: -bW, y: 12, z: -bD }, { x: bW, y: 12, z: -bD }, { x: bW, y: 12, z: bD }, { x: -bW, y: 12, z: bD },
          { x: -bW, y: 15, z: -bD }, { x: bW, y: 15, z: -bD }, { x: bW, y: 15, z: bD }, { x: -bW, y: 15, z: bD }
        ].map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.beginPath();
        ctx.moveTo(base[0].x, base[0].y);
        for(let i=1; i<4; i++) ctx.lineTo(base[i].x, base[i].y);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(base[4].x, base[4].y);
        for(let i=5; i<8; i++) ctx.lineTo(base[i].x, base[i].y);
        ctx.closePath(); ctx.stroke();
        for(let i=0; i<4; i++) {
          ctx.moveTo(base[i].x, base[i].y);
          ctx.lineTo(base[i+4].x, base[i+4].y);
        }
        ctx.stroke();

        // Lower Pagoda multi-tier roof
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        const roofSteps = 12;
        ctx.beginPath();
        for(let i=0; i<=roofSteps; i++) {
          const ratio = i / roofSteps;
          const xVal = -22 + ratio * 44;
          const yVal = 4 - Math.pow(Math.abs(ratio - 0.5) * 2, 2) * 3;
          const pt = project3D(xVal, yVal, 0, rx, ry, rz);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Upper Pagoda roof tier
        ctx.beginPath();
        for(let i=0; i<=roofSteps; i++) {
          const ratio = i / roofSteps;
          const xVal = -15 + ratio * 30;
          const yVal = -4 - Math.pow(Math.abs(ratio - 0.5) * 2, 2) * 2.2;
          const pt = project3D(xVal, yVal, 0, rx, ry, rz);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Humanities Index', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(shuffleMode ? 'Humanities Index • Global Mosaic' : 'Humanities Index • Selected Heritage', (centerX - 120) + 120, centerY + 8);
        }

      } else {
        const rx = frame * 0.008 + mouseParallaxY * 0.008;
        const ry = frame * 0.012 + mouseParallaxX * 0.008;
        const rz = Math.sin(frame * 0.004) * 0.1;

        const size = 20 * bootProgress;
        const octaVertices = [
          { x: 0, y: -size, z: 0 }, { x: 0, y: size, z: 0 },
          { x: size, y: 0, z: 0 },  { x: -size, y: 0, z: 0 },
          { x: 0, y: 0, z: size },  { x: 0, y: 0, z: -size }
        ];

        const projected = octaVertices.map(v => project3D(v.x, v.y, v.z, rx, ry, rz));

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.3)';

        ctx.beginPath();
        for (let i = 2; i < 6; i++) {
          ctx.moveTo(projected[0].x, projected[0].y);
          ctx.lineTo(projected[i].x, projected[i].y);
        }
        for (let i = 2; i < 6; i++) {
          ctx.moveTo(projected[1].x, projected[1].y);
          ctx.lineTo(projected[i].x, projected[i].y);
        }
        ctx.moveTo(projected[2].x, projected[2].y);
        ctx.lineTo(projected[4].x, projected[4].y);
        ctx.lineTo(projected[3].x, projected[3].y);
        ctx.lineTo(projected[5].x, projected[5].y);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        for (let th = 0; th <= Math.PI * 2; th += 0.25) {
          const pt = project3D((size + 4) * Math.cos(th), 0, (size + 4) * Math.sin(th), rx, ry, rz);
          if (th === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.stroke();

        if (frame >= bootDuration) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.font = '7.5px monospace';
          ctx.fillText('Trending Center', (centerX - 120) + 120, centerY - 8);
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(shuffleMode ? 'Curated Feed • Mixed Streams' : 'Curated Feed • Direct Feed', (centerX - 120) + 120, centerY + 8);
        }
      }

      ctx.restore();
      ctx.fillText = originalFillText;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [selectedCategory, shuffleMode]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-24 relative rounded-2xl overflow-hidden border border-white/[0.03] bg-white/[0.015] backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] select-none group transition-all duration-500 hover:border-white/[0.06] mb-6 flex items-center px-6"
      style={{ touchAction: 'pan-y' }}
      onWheel={(e) => {
        // Let wheel events propagate so the page can scroll
        const scrollEl = document.querySelector('.page-scroll') || document.querySelector('main');
        if (scrollEl) {
          scrollEl.scrollBy({ top: e.deltaY, behavior: 'auto' });
        }
      }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 block" 
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Floating Category Filter Buttons Bar */}
      <div 
        ref={buttonsRef}
        className="relative z-10 w-full flex items-center gap-2 overflow-x-auto scrollbar-none pr-36 select-none transition-all duration-300 ease-out"
        style={{ opacity: 0, pointerEvents: 'none', transform: 'translateY(12px)', touchAction: 'pan-x' }}
        onWheel={(e) => {
          // Only forward vertical scroll — horizontal stays for the chip bar
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.stopPropagation();
            const scrollEl = document.querySelector('.page-scroll') || document.querySelector('main');
            if (scrollEl) {
              scrollEl.scrollBy({ top: e.deltaY, behavior: 'auto' });
            }
          }
        }}
      >
        {(() => {
          const categoryColors: Record<string, { glow: string; text: string; border: string; bg: string }> = {
            all: {
              glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
              text: 'text-violet-200',
              border: 'border-violet-500/25',
              bg: 'bg-violet-500/[0.06] backdrop-blur-md'
            },
            design: {
              glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
              text: 'text-sky-200',
              border: 'border-sky-500/25',
              bg: 'bg-sky-500/[0.06] backdrop-blur-md'
            },
            music: {
              glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
              text: 'text-rose-200',
              border: 'border-rose-500/25',
              bg: 'bg-rose-500/[0.06] backdrop-blur-md'
            },
            gaming: {
              glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
              text: 'text-purple-200',
              border: 'border-purple-500/25',
              bg: 'bg-purple-500/[0.06] backdrop-blur-md'
            },
            technology: {
              glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
              text: 'text-cyan-200',
              border: 'border-cyan-500/25',
              bg: 'bg-cyan-500/[0.06] backdrop-blur-md'
            },
            fashion: {
              glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
              text: 'text-fuchsia-200',
              border: 'border-fuchsia-500/25',
              bg: 'bg-fuchsia-500/[0.06] backdrop-blur-md'
            },
            cinema: {
              glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
              text: 'text-blue-200',
              border: 'border-blue-500/25',
              bg: 'bg-blue-500/[0.06] backdrop-blur-md'
            },
            anime: {
              glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
              text: 'text-red-200',
              border: 'border-red-500/25',
              bg: 'bg-red-500/[0.06] backdrop-blur-md'
            },
            photography: {
              glow: 'shadow-[0_0_15px_rgba(255,255,255,0.1)]',
              text: 'text-white',
              border: 'border-white/20',
              bg: 'bg-white/[0.06] backdrop-blur-md'
            },
            ai: {
              glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
              text: 'text-teal-200',
              border: 'border-teal-500/25',
              bg: 'bg-teal-500/[0.06] backdrop-blur-md'
            },
            startups: {
              glow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]',
              text: 'text-yellow-200',
              border: 'border-yellow-500/25',
              bg: 'bg-yellow-500/[0.06] backdrop-blur-md'
            },
            culture: {
              glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
              text: 'text-emerald-200',
              border: 'border-emerald-500/25',
              bg: 'bg-emerald-500/[0.06] backdrop-blur-md'
            },
            sports: {
              glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]',
              text: 'text-orange-200',
              border: 'border-orange-500/25',
              bg: 'bg-orange-500/[0.06] backdrop-blur-md'
            }
          };

          return CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            const style = categoryColors[cat.id] || categoryColors.all;
            const iconAnim = CATEGORY_ANIMATIONS[cat.id] || CATEGORY_ANIMATIONS.all;

            return (
              <motion.button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
                className={clsx(
                  "px-4 py-2 rounded-full text-[11px] font-semibold border transition-all duration-500 flex-shrink-0 flex items-center gap-1.5 backdrop-blur-md shadow-md",
                  isActive
                    ? clsx(style.bg, style.text, style.border, style.glow)
                    : "bg-black/45 text-neutral-400 border-white/[0.04] hover:text-white hover:border-white/20 hover:bg-black/60"
                )}
              >
                <motion.span
                  animate={isActive ? iconAnim.anim : {}}
                  transition={isActive ? iconAnim.trans : {}}
                >
                  <Icon size={11} className={clsx("transition-opacity duration-300", isActive ? "opacity-100" : "opacity-60")} />
                </motion.span>
                {cat.label}
              </motion.button>
            );
          });
        })()}
      </div>

      {/* Hide native scrollbar in WebKit browsers */}
      <style>{`
        .scrollbar-none::-webkit-scrollbar {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

// ─── Preset High-Fidelity Human Seed Data ──────────────────────────────────────

const PRESET_COMMUNITIES: Community[] = [];

const PRESET_POSTS: Post[] = [];

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TrendingTopic {
  tag: string;
  title: string;
  posts: number;
  change: string;
  trend: 'up' | 'stable' | 'down';
  description: string;
  activeUsers: string;
  communities: string[];
  participants: { username: string; avatarUrl?: string | null }[];
  reactionSnippet?: {
    author: string;
    avatarUrl?: string | null;
    text: string;
  };
}

// ─── Constant Curation ────────────────────────────────────────────────────────

const categoryKeywords: Record<string, string[]> = {
  all: [],
  design: ['design', 'ui', 'ux', 'typography', 'minimalism', 'interface', 'layout', 'font', 'spacing'],
  music: ['music', 'indie', 'synthwave', 'vinyl', 'song', 'track', 'playlist', 'album', 'synth', 'drum'],
  gaming: ['gaming', 'game', 'coop', 'retro', 'console', 'play', 'player', 'multiplayer', 'pixels'],
  technology: ['tech', 'programming', 'web3', 'privacy', 'coding', 'developer', 'software', 'protocol', 'database', 'encryption'],
  fashion: ['fashion', 'wear', 'luxury', 'style', 'clothing', 'stitching', 'cuts', 'garment', 'textile'],
  cinema: ['cinema', 'film', 'movie', 'a24', 'noir', 'director', 'scene', 'screenplay', 'actor'],
  anime: ['anime', 'ghibli', 'manga', 'otaku', 'episode', 'animation', 'cosplay'],
  photography: ['photography', 'photo', '35mm', 'film', 'streetphoto', 'lens', 'shutter', 'grain', 'camera'],
  ai: ['ai', 'llm', 'deeplearning', 'gpt', 'artificial', 'intelligence', 'generation', 'model', 'agent'],
  startups: ['startup', 'founder', 'bootstrap', 'saas', 'indiehackers', 'mrr', 'product', 'ship'],
  culture: ['culture', 'lofi', 'aesthetic', 'garden', 'lifestyle', 'meditation', 'reading', 'vibes'],
  sports: ['sports', 'football', 'climbing', 'cycling', 'workout', 'bouldering', 'soccer', 'bike'],
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INITIAL_PRESET_REPLIES: Record<string, any[]> = {};

export default function TrendingPage() {
  useEffect(() => {
    console.log("[FORENSICS] TrendingPage MOUNTED");
    return () => {
      console.log("[FORENSICS] TrendingPage UNMOUNTED");
    };
  }, []);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'topics' | 'communities' | 'posts'>('topics');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom states for Interactive Rebuilt Drawer and Spotlight Endorsement
  const [expandedTopicTag, setExpandedTopicTag] = useState<string | null>(null);
  const [customReplies, setCustomReplies] = useState<Record<string, string[]>>({});
  const [repliesCache, setRepliesCache] = useState<Record<string, any[]>>(INITIAL_PRESET_REPLIES);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [activeInputMode, setActiveInputMode] = useState<'comment' | 'feed'>('comment');
  const [activeReplyTarget, setActiveReplyTarget] = useState<{ postId: string; commentId?: string; username: string } | null>(null);
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

  const handleToggleReplies = useCallback(async (postId: string) => {
    const isExpanded = !!expandedReplies[postId];
    setExpandedReplies(prev => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !repliesCache[postId]) {
      setLoadingReplies(prev => ({ ...prev, [postId]: true }));
      try {
        const res = await getCommentsDB(postId);
        if (res.success && res.data) {
          setRepliesCache(prev => ({ ...prev, [postId]: res.data as any[] }));
        }
      } catch (err) {
        console.warn("Failed to load replies:", err);
      } finally {
        setLoadingReplies(prev => ({ ...prev, [postId]: false }));
      }
    }
  }, [expandedReplies, repliesCache]);

  const handlePinComment = useCallback(async (postId: string, commentId: string, isPinned: boolean) => {
    try {
      const res = await pinCommentDB(commentId, isPinned);
      if (res.success) {
        setRepliesCache(prev => {
          const list = prev[postId] || [];
          const updated = list.map(c => c.id === commentId ? { ...c, is_pinned: isPinned } : c);
          return {
            ...prev,
            [postId]: updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
          };
        });
      } else {
        alert(res.error || 'Failed to toggle pin');
      }
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const handleDeleteComment = useCallback(async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await deleteCommentDB(commentId);
      if (res.success) {
        setRepliesCache(prev => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.filter(c => c.id !== commentId)
          };
        });
        setTrendingPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) } : p));
      } else {
        alert(res.error || 'Failed to delete comment');
      }
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const handleReportComment = useCallback(async (postId: string, commentId: string) => {
    const reason = prompt('Please enter the reason for reporting this comment (e.g. spam, harassment, hate speech):');
    if (!reason || reason.trim() === '') return;
    try {
      const res = await reportCommentDB(commentId, reason.trim());
      if (res.success) {
        alert('Thank you. The comment has been flagged and reported successfully.');
        setRepliesCache(prev => {
          const list = prev[postId] || [];
          return {
            ...prev,
            [postId]: list.map(c => c.id === commentId ? { ...c, isFlagged: true, is_flagged: true } : c)
          };
        });
      } else {
        if (res.falseReport) {
          alert(`Warning: ${res.error}`);
        } else {
          alert(res.error || 'Failed to file report');
        }
      }
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const [endorsedCreators, setEndorsedCreators] = useState<Record<string, boolean>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [localLikeCounts, setLocalLikeCounts] = useState<Record<string, number>>({});

  // States for the Advanced Cozy Quote Card Customize Modal
  const [exportCardModal, setExportCardModal] = useState<{
    author: string;
    content: string;
    stream: string;
  } | null>(null);

    const [cardTheme, setCardTheme] = useState<'noir' | 'neon' | 'aura' | 'sunset' | 'slate' | 'cyber' | 'forest' | 'crimson' | 'royal' | 'lavender'>('noir');
  const [cardSize, setCardSize] = useState<'widescreen' | 'square' | 'story' | 'landscape' | 'portrait' | 'ultrawide' | 'classic'>('widescreen');
  const [cardFont, setCardFont] = useState<'serif' | 'mono' | 'modern' | 'display' | 'handwriting' | 'condensed'>('serif');
  const [showWatermark, setShowWatermark] = useState(true);
  const [cardFontSize, setCardFontSize] = useState<number>(18);
  const [glowStrength, setGlowStrength] = useState<'off' | 'low' | 'high'>('high');
  const [borderStyle, setBorderStyle] = useState<'thin' | 'glow' | 'none'>('thin');
  const [glassRefraction, setGlassRefraction] = useState<boolean>(true);
  const [cardTextAlign, setCardTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [cardQuoteStyle, setCardQuoteStyle] = useState<'mark' | 'line' | 'bar' | 'none'>('mark');
  const [cardCornerRadius, setCardCornerRadius] = useState<'sharp' | 'rounded' | 'pill'>('rounded');
  const [cardGrain, setCardGrain] = useState<boolean>(false);
  const [cardFormat, setCardFormat] = useState<'png' | 'jpeg' | 'pdf' | 'svg'>('png');
  const [resolutionScale, setResolutionScale] = useState<number>(8);
  const [customWatermark, setCustomWatermark] = useState<string>('VERLYN NETWORK');
  const [cardLineHeight, setCardLineHeight] = useState<number>(1.4);
  const [cardLetterSpacing, setCardLetterSpacing] = useState<number>(0);
  const [gradientRotation, setGradientRotation] = useState<number>(135);
  const [cardBlurStrength, setCardBlurStrength] = useState<number>(20);

  // New Premium Customizer States
  const [cardBackgroundStyle, setCardBackgroundStyle] = useState<'solid' | 'gradient' | 'glass' | 'cyberGrid' | 'iridescent'>('gradient');
  const [cardTextCase, setCardTextCase] = useState<'normal' | 'uppercase' | 'lowercase'>('normal');
  const [chromaticAberration, setChromaticAberration] = useState<boolean>(false);
  const [neonPulse, setNeonPulse] = useState<boolean>(false);
  const [previewTilt, setPreviewTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTilting, setIsTilting] = useState<boolean>(false);
  const [showHighResWarning, setShowHighResWarning] = useState<boolean>(false);
  const [hudOverlay, setHudOverlay] = useState<boolean>(false);
  const [waveformOverlay, setWaveformOverlay] = useState<boolean>(false);
  const [lightLeak, setLightLeak] = useState<boolean>(false);
  const [smartEmphasis, setSmartEmphasis] = useState<boolean>(false);

  // Dynamic hover coordinates for premium visual shine reflections
  const [heroMouse, setHeroMouse] = useState({ x: 0, y: 0 });
  const [heroHover, setHeroHover] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string; displayName: string | null; avatarUrl: string | null } | null>(null);

  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  // Fetch current user and profile — wrapped with catch to avoid uncaught promise rejections
  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      const data = res.data;
      const u = data?.user;
      if (u) {
        setCurrentUserId(u.id);
        supabase
          .from('users')
          .select('username, display_name, avatar_url')
          .eq('id', u.id)
          .single()
          .then((profileRes: any) => {
            const profile = profileRes.data;
            if (profile) {
              setCurrentUserProfile({
                username: profile.username,
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url
              });
            }
          })
          .catch(() => { /* profile fetch failed silently */ });
      }
    }).catch(() => { /* auth unavailable — user not logged in or offline */ });
  }, [supabase]);

  // Suppress Supabase's noisy AuthRetryableFetchError from polluting the dev overlay.
  // These are transient background auth refresh errors — harmless, expected when network drops.
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason || '');
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('AuthRetryableFetchError') ||
        msg.includes('Load failed') ||
        msg.includes('NetworkError') ||
        msg.includes('fetch')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);
  const [isMounted, setIsMounted] = useState(false);

  // Load local replies cache from localStorage on client side mount
  useEffect(() => {
    try {
      localStorage.removeItem('verlyn_trending_replies');
    } catch (err) {
      console.warn("Failed to clear local storage:", err);
    } finally {
      setIsMounted(true);
    }
  }, []);

  const loadTrendingData = useCallback(async (isAuto = false) => {
    if (isAuto) setIsRefreshing(true);

    try {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const [commsRes, postsRes, userRes] = await Promise.all([
        supabase
          .from('communities')
          .select('id, name, display_name, description, icon_url, member_count, is_private, boost_level, created_at')
          .order('member_count', { ascending: false })
          .limit(15),
        supabase
          .from('posts')
          .select(`
            id, content, media_urls, like_count, comment_count, share_count, created_at, community_id,
            author:users!posts_author_id_fkey ( id, username, display_name, avatar_url, is_verified, role )
          `)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.auth.getUser()
      ]);

      if (commsRes.data) {
        setTrendingCommunities(commsRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          displayName: c.display_name,
          description: c.description,
          iconUrl: c.icon_url,
          memberCount: c.member_count,
          isPrivate: c.is_private,
          boostLevel: c.boost_level,
          createdAt: c.created_at,
        })));
      }

      const posts = postsRes.data;
      if (posts) {
        posts.sort((a: any, b: any) =>
          ((b.like_count || 0) + (b.comment_count || 0) * 2 + (b.share_count || 0) * 3) -
          ((a.like_count || 0) + (a.comment_count || 0) * 2 + (a.share_count || 0) * 3)
        );

        const mappedPosts = posts.map((p: any) => ({
          id: p.id,
          content: p.content,
          mediaUrls: p.media_urls || [],
          postType: (p.media_urls && p.media_urls.length > 0 ? 'image' : 'text') as 'text' | 'image' | 'video' | 'poll',
          likeCount: p.like_count || 0,
          commentCount: p.comment_count || 0,
          shareCount: p.share_count || 0,
          createdAt: p.created_at,
          communityId: p.community_id || null,
          isLiked: false,
          isSaved: false,
          author: {
            id: p.author?.id || 'unknown',
            username: p.author?.username || 'unknown',
            displayName: p.author?.display_name || 'Unknown User',
            avatar: p.author?.avatar_url,
            isVerified: p.author?.is_verified || false,
            role: p.author?.role || 'PUBLIC',
          } as any
        }));

        setTrendingPosts(mappedPosts);

        const currentUser = userRes.data?.user;
        if (currentUser && mappedPosts.length > 0) {
          const postIds = mappedPosts.map((p: any) => p.id);
          const { data: likedRows } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds);
          if (likedRows && likedRows.length > 0) {
            const likedSet = new Set(likedRows.map((r: any) => r.post_id));
            setLikedPosts(prev => {
              const next = { ...prev };
              postIds.forEach((id: string) => {
                if (likedSet.has(id)) next[id] = true;
              });
              return next;
            });
          }
        }
      }
    } catch (e) {
      console.warn("Signal engine offline. Standard defaults loaded.", e);
    } finally {
      setLoading(false);
      if (isAuto) setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTrendingData();
    const interval = setInterval(() => {
      if (!document.hidden) loadTrendingData(true);
    }, 30000); // 30s refresh interval
    return () => clearInterval(interval);
  }, [loadTrendingData]);

  // Shuffle Mode timer loop effect
  useEffect(() => {
    if (!shuffleMode) return;
    const interval = setInterval(() => {
      setSelectedCategory(current => {
        const index = CATEGORIES.findIndex(c => c.id === current);
        const nextIndex = (index + 1) % CATEGORIES.length;
        return CATEGORIES[nextIndex].id;
      });
    }, 9000); // cycle every 9 seconds (intro 3s + ambient 6s)
    return () => clearInterval(interval);
  }, [shuffleMode]);

  const handleCategorySelect = useCallback((cat: string) => {
    setShuffleMode(false);
    setSelectedCategory(cat);
  }, []);

  const handleLikePost = useCallback(async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    
    const wasLiked = likedPosts[postId] ?? false;
    const isLiked = !wasLiked;
    
    setLikedPosts(prev => ({ ...prev, [postId]: isLiked }));
    const basePost = trendingPosts.find(p => p.id === postId);
    const currentCount = localLikeCounts[postId] ?? basePost?.likeCount ?? 0;
    setLocalLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, currentCount + (isLiked ? 1 : -1)) }));

    try {
      const res = await toggleLikeDB(postId, currentUserId, isLiked);
      if (!res.success) throw new Error(res.error || 'Failed to toggle like');
    } catch (err) {
      console.warn('Like toggle failed. Reverting:', err);
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
      setLocalLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
    }
  }, [likedPosts, localLikeCounts, trendingPosts, currentUserId]);

  // Spotlight Endorsement Event Loop
  const triggerSpotlightEndorsement = useCallback((e: React.MouseEvent, username: string) => {
    if (!username) return;
    const cleanName = username.toLowerCase();
    const alreadyEndorsed = endorsedCreators[cleanName] ?? false;

    setEndorsedCreators(prev => ({ ...prev, [cleanName]: !alreadyEndorsed }));

    if (alreadyEndorsed) return; // Only process positive endorsements

    supabase
      .from('users')
      .select('id, karma_score')
      .eq('username', username)
      .single()
      .then((creatorRes: any) => {
        const creatorUser = creatorRes.data;
        if (creatorUser) {
          supabase
            .from('users')
            .update({ karma_score: (creatorUser.karma_score || 0) + 1 })
            .eq('id', creatorUser.id)
            .then((updateRes: any) => {
              const updateErr = updateRes.error;
              if (!updateErr && currentUserId) {
                supabase
                  .from('users')
                  .select('display_name')
                  .eq('id', currentUserId)
                  .single()
                  .then((selfProfileRes: any) => {
                    const selfProfile = selfProfileRes.data;
                    const selfName = selfProfile?.display_name || 'Someone';
                    supabase.from('notifications').insert({
                      user_id: creatorUser.id,
                      actor_id: currentUserId,
                      type: 'award',
                      body: `${selfName} endorsed your creative profile from the Trending Spotlight!`,
                      priority: 'medium',
                      metadata: { title: 'Spotlight Endorsed ✦', endorser_username: username }
                    });
                  });
              }
            });
        }
      });
  }, [supabase, currentUserId, endorsedCreators]);

  // ─── Data Merging & Fallbacks ──────────────────────────────────────────────

  const allCommunities = useMemo(() => {
    const combined = [...trendingCommunities];
    PRESET_COMMUNITIES.forEach(pc => {
      if (!combined.some(c => c.id === pc.id || c.name.toLowerCase() === pc.name.toLowerCase())) {
        combined.push(pc);
      }
    });
    return combined;
  }, [trendingCommunities]);

  const allPosts = useMemo(() => {
    const combined = trendingPosts.map(p => {
      const cachedCount = (repliesCache[p.id] || []).length;
      return {
        ...p,
        commentCount: Math.max(p.commentCount || 0, cachedCount)
      };
    });
    PRESET_POSTS.forEach(pp => {
      if (!combined.some(p => p.id === pp.id || p.content.toLowerCase().trim() === pp.content.toLowerCase().trim())) {
        const cachedCount = (repliesCache[pp.id] || []).length;
        combined.push({
          ...pp,
          commentCount: Math.max(pp.commentCount || 0, cachedCount)
        });
      }
    });
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [trendingPosts, repliesCache]);

  // ─── Hashtag & Natural Language Word-Frequency Engine ───────────────────────

  const currentTopics = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    const tagToPosts: Record<string, Post[]> = {};
    
    allPosts.forEach(p => {
      if (!p.content) return;
      const hashtags = p.content.match(/#[a-zA-Z0-9_]+/g);
      if (hashtags) {
        hashtags.forEach(tag => {
          const hrsOld = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60);
          const weight = hrsOld < 12 ? 3 : hrsOld < 24 ? 2 : 1;
          tagCounts[tag] = (tagCounts[tag] || 0) + weight;
          
          if (!tagToPosts[tag]) tagToPosts[tag] = [];
          tagToPosts[tag].push(p);
        });
      }
    });

    const sortedRealTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1]);

    const realTopics: TrendingTopic[] = sortedRealTags.map(([tag, score]) => {
      const relatedPosts = tagToPosts[tag] || [];
      const count = relatedPosts.length;
      const title = tag.replace('#', '').replace(/([A-Z])/g, ' $1').trim();
      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
      
      const change = count > 5 ? 'Trending' : 'Popular';
      
      const participants = relatedPosts.map(p => ({
        username: p.author?.username || 'unknown',
        avatarUrl: p.author?.avatar || null,
      })).filter((v, idx, self) => v.username !== 'unknown' && self.findIndex(t => t.username === v.username) === idx);

      const bestPost = relatedPosts.reduce((prev, cur) => (cur.likeCount > prev.likeCount ? cur : prev), relatedPosts[0]);
      const reactionSnippet = bestPost ? {
        author: bestPost.author?.username || 'unknown',
        avatarUrl: bestPost.author?.avatar || null,
        text: bestPost.content,
      } : undefined;

      const communitiesSet = new Set<string>();
      relatedPosts.forEach(p => {
        if (p.communityId) {
          const comm = allCommunities.find(c => c.id === p.communityId);
          if (comm) {
            communitiesSet.add(comm.displayName);
          }
        }
      });
      const communities = communitiesSet.size > 0 ? Array.from(communitiesSet).slice(0, 2) : ['Verlyn Feed'];

      return {
        tag,
        title: cleanTitle,
        posts: count,
        change,
        trend: (count > 3 ? 'up' : 'stable') as 'up' | 'stable' | 'down',
        description: `Lots of people are chatting about ${tag} right now.`,
        activeUsers: `${count * 7 + 3} people talking`,
        communities,
        participants,
        reactionSnippet
      };
    });

    if (realTopics.length < 5) {
      const stopWords = new Set([
        'the', 'and', 'a', 'to', 'of', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as', 'this', 
        'your', 'you', 'my', 'me', 'i', 'we', 'are', 'was', 'were', 'have', 'has', 'had', 'been', 
        'doing', 'does', 'did', 'but', 'not', 'or', 'at', 'an', 'by', 'from', 'about', 'just', 'more',
        'this', 'these', 'those', 'their', 'them', 'they', 'our', 'out', 'into', 'up', 'down', 'about'
      ]);
      
      const keywordsToExtract: Record<string, { count: number; posts: Post[] }> = {};
      allPosts.forEach(p => {
        if (!p.content) return;
        const words = p.content.toLowerCase().match(/[a-zA-Z]+/g);
        if (words) {
          words.forEach(word => {
            if (word.length >= 4 && !stopWords.has(word)) {
              if (!keywordsToExtract[word]) {
                keywordsToExtract[word] = { count: 0, posts: [] };
              }
              keywordsToExtract[word].count += 1;
              if (!keywordsToExtract[word].posts.includes(p)) {
                keywordsToExtract[word].posts.push(p);
              }
            }
          });
        }
      });

      const sortedKeywords = Object.entries(keywordsToExtract)
        .sort((a, b) => b[1].count - a[1].count)
        .filter(([word]) => word.length > 3)
        .slice(0, 8);

      sortedKeywords.forEach(([word, data]) => {
        const tag = `#${word.charAt(0).toUpperCase() + word.slice(1)}`;
        if (!realTopics.some(rt => rt.tag.toLowerCase() === tag.toLowerCase())) {
          const title = word.charAt(0).toUpperCase() + word.slice(1);
          const relatedPosts = data.posts;
          const count = relatedPosts.length;
          const change = count > 3 ? 'Trending' : 'Popular';
          
          const participants = relatedPosts.map(p => ({
            username: p.author?.username || 'unknown',
            avatarUrl: p.author?.avatar || null,
          })).filter((v, idx, self) => v.username !== 'unknown' && self.findIndex(t => t.username === v.username) === idx);

          const bestPost = relatedPosts.reduce((prev, cur) => (cur.likeCount > prev.likeCount ? cur : prev), relatedPosts[0]);
          const reactionSnippet = bestPost ? {
            author: bestPost.author?.username || 'unknown',
            avatarUrl: bestPost.author?.avatar || null,
            text: bestPost.content,
          } : undefined;

          const communitiesSet = new Set<string>();
          relatedPosts.forEach(p => {
            if (p.communityId) {
              const comm = allCommunities.find(c => c.id === p.communityId);
              if (comm) {
                communitiesSet.add(comm.displayName);
              }
            }
          });
          const communities = communitiesSet.size > 0 ? Array.from(communitiesSet).slice(0, 2) : ['Verlyn Feed'];

          realTopics.push({
            tag,
            title,
            posts: count,
            change,
            trend: 'stable' as 'up' | 'stable' | 'down',
            description: `Seeing a lot of talk about ${word} in the feed right now.`,
            activeUsers: `${count * 4 + 2} people talking`,
            communities,
            participants,
            reactionSnippet
          });
        }
      });
    }

    return realTopics.slice(0, 10);
  }, [allPosts, allCommunities]);

  // ─── Interactive Real-time Search Filters ──────────────────────────────────

  const filteredTopics = useMemo(() => {
    let list = currentTopics;
    if (selectedCategory !== 'all') {
      const keywords = categoryKeywords[selectedCategory] || [];
      list = list.filter(t => {
        const text = (t.tag + ' ' + t.title + ' ' + t.description).toLowerCase();
        return keywords.some(k => text.includes(k));
      });
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.tag.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentTopics, selectedCategory, searchQuery]);

  const filteredCommunities = useMemo(() => {
    let list = allCommunities;
    if (selectedCategory !== 'all') {
      const keywords = categoryKeywords[selectedCategory] || [];
      list = list.filter(c => {
        const text = (c.displayName + ' ' + c.description).toLowerCase();
        return keywords.some(k => text.includes(k));
      });
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.displayName.toLowerCase().includes(q) || 
        (c.description && c.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allCommunities, selectedCategory, searchQuery]);

  const filteredPosts = useMemo(() => {
    let list = allPosts;
    if (selectedCategory !== 'all') {
      const keywords = categoryKeywords[selectedCategory] || [];
      list = list.filter(p => {
        if (!p.content) return false;
        const text = p.content.toLowerCase();
        return keywords.some(k => text.includes(k));
      });
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.content && p.content.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPosts, selectedCategory, searchQuery]);

  // ─── Sidebar Dynamic Aggregations ──────────────────────────────────────────

  const activeCreators = useMemo(() => {
    const creatorsMap: Record<string, { author: any; score: number }> = {};
    allPosts.forEach(p => {
      if (!p.author?.username) return;
      const username = p.author.username;
      const score = (p.likeCount || 0) + (p.commentCount || 0) * 2;
      if (!creatorsMap[username]) {
        creatorsMap[username] = { author: p.author, score: 0 };
      }
      creatorsMap[username].score += score;
    });

    const sortedCreators = Object.values(creatorsMap)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(c => c.author);

    const fallbackCreators: any[] = [];

    if (sortedCreators.length < 3) {
      const merged = [...sortedCreators];
      fallbackCreators.forEach(fc => {
        if (merged.length < 3 && !merged.some(c => c.username === fc.username)) {
          merged.push({
            id: fc.id,
            username: fc.username,
            displayName: fc.displayName,
            avatar: fc.avatarUrl,
            role: fc.role,
            isVerified: fc.isVerified,
          } as any);
        }
      });
      return merged;
    }
    return sortedCreators;
  }, [allPosts]);

  const visualPreviews = useMemo(() => {
    const withMedia = allPosts.filter(p => p.mediaUrls && p.mediaUrls.length > 0);
    
    const realPreviews = withMedia.map(p => ({
      postId: p.id,
      mediaUrl: p.mediaUrls?.[0] || '',
      likes: p.likeCount,
      author: p.author?.username || 'unknown',
      snippet: p.content
    }));

    const textPosts = allPosts.filter(p => !p.mediaUrls || p.mediaUrls.length === 0);
    const combined = [...realPreviews];
    
    textPosts.forEach((tp, idx) => {
      if (combined.length < 6) {
        combined.push({
          postId: tp.id,
          mediaUrl: '',
          likes: tp.likeCount,
          author: tp.author?.username || 'unknown',
          snippet: tp.content
        });
      }
    });

    return combined.slice(0, 6);
  }, [allPosts]);

  const expandedTopicActiveTopic = useMemo(() => {
    if (!expandedTopicTag) return null;
    return currentTopics.find(t => t.tag.toLowerCase() === expandedTopicTag.toLowerCase()) || null;
  }, [expandedTopicTag, currentTopics]);

  const expandedTopicPosts = useMemo(() => {
    if (!expandedTopicTag) return [];
    return allPosts.filter(p => {
      if (!p.content) return false;
      return p.content.toLowerCase().includes(expandedTopicTag.toLowerCase());
    });
  }, [expandedTopicTag, allPosts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-52 space-y-8 select-none font-sans relative">
        {/* Floating background glowing ambient shapes */}
        <div className="absolute w-[300px] h-[300px] rounded-full bg-violet-500/[0.03] blur-[120px] -translate-y-12 pointer-events-none" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-indigo-500/[0.02] blur-[80px] translate-y-12 pointer-events-none" />
        
        {/* Premium Glassmorphic Card Container */}
        <div className="relative max-w-sm w-full mx-auto p-10 rounded-2xl border border-white/[0.03] bg-[#0c0c0e]/30 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center space-y-6 overflow-hidden">
          {/* Radial flare backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_70%)] pointer-events-none" />
          
          {/* Gorgeous custom dual-ring spinner */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            {/* Outer animated gradient border */}
            <div 
              className="absolute inset-0 rounded-full border border-transparent border-t-violet-400 border-r-indigo-500 animate-spin"
              style={{ animationDuration: '1.2s' }}
            />
            {/* Inner animated gradient border spinning in reverse */}
            <div 
              className="absolute w-9 h-9 rounded-full border border-transparent border-b-cyan-400 border-l-violet-400 animate-spin"
              style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}
            />
            {/* Ultra bright glowing core dot */}
            <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_12px_#fff]" />
          </div>

          {/* Friendly, modern human text styling */}
          <div className="text-center space-y-2 relative z-10">
            <h3 className="text-sm font-semibold text-white/90 tracking-wide">Loading your feed</h3>
            <p className="text-[11px] text-neutral-500 leading-normal max-w-[200px] mx-auto font-medium">
              Just a moment while we get the latest updates ready for you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-32 space-y-10 animate-fade-in relative font-sans">
      
      {/* ─── Main Grid Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* LEFT COLUMN: Main Discovery Feed */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Integrated Interactive Category Selector Visualizer (Top Section) */}
          <CategorySignatureVisual 
            selectedCategory={selectedCategory} 
            setSelectedCategory={handleCategorySelect} 
            shuffleMode={shuffleMode}
            setShuffleMode={setShuffleMode}
          />

          {/* Premium Sub Tab Selector + Integrated Search row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.02] pb-1 select-none">
            <div className="flex gap-8 items-center">
              {(['topics', 'communities', 'posts'] as const).map(tab => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'pb-3 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 relative flex-shrink-0',
                    activeTab === tab ? 'text-white font-black' : 'text-neutral-600 hover:text-neutral-300'
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="trendingTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-violet-400 to-violet-200 z-10"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  {tab}
                </button>
              ))}
            </div>

            {/* Premium Glassmorphic Search Bar relocated to align perfectly with the tabs bar */}
            <div className="relative w-full sm:max-w-[200px] select-none self-end mb-1">
              <input
                type="text"
                placeholder="Search trending..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 bg-white/[0.01] border border-white/[0.04] rounded-full px-3.5 pl-8 text-[11px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-violet-500/30 focus:bg-white/[0.03] transition-all duration-300"
              />
              <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-[8px] font-mono tracking-widest uppercase px-1 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Tabs Content */}
          <div className="min-h-[450px]">
            <AnimatePresence mode="wait">
              
              {/* TOPICS TAB: Pure Borderless Editorial List */}
              {activeTab === 'topics' && (
                <motion.div
                  key="topics"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {filteredTopics.length === 0 ? (
                    <div className="py-20 text-center opacity-40 select-none">
                      <p className="text-xs uppercase tracking-widest font-mono">No topics match your filters</p>
                    </div>
                  ) : (
                    filteredTopics.map((t, i) => {
                      const isHero = i === 0 && searchQuery.trim() === '';
                      if (isHero) {
                        return (
                          <motion.div
                            key={t.tag}
                            onClick={() => setExpandedTopicTag(t.tag)}
                            onMouseEnter={() => setHeroHover(true)}
                            onMouseLeave={() => {
                              setHeroHover(false);
                              setHeroMouse({ x: 0, y: 0 });
                            }}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const y = e.clientY - rect.top;
                              setHeroMouse({ x, y });
                            }}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0c0c0e]/60 p-6 sm:p-7 hover:border-white/10 hover:bg-[#0e0e11]/85 transition-all duration-500 cursor-pointer shadow-2xl"
                          >
                            {/* Premium Interactive Hover Glare Shine Flare */}
                            {heroHover && (
                              <div 
                                className="absolute inset-0 pointer-events-none transition-opacity duration-500 z-20 mix-blend-screen"
                                style={{
                                  background: `radial-gradient(150px circle at ${heroMouse.x}px ${heroMouse.y}px, rgba(255, 255, 255, 0.045), transparent 80%)`
                                }}
                              />
                            )}

                            {/* Color Glow Backdrops */}
                            <div className="absolute -right-24 -top-24 w-52 h-52 rounded-full bg-violet-500/[0.04] blur-3xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 pointer-events-none" />
                            <div className="absolute -left-24 -bottom-24 w-52 h-52 rounded-full bg-indigo-500/[0.03] blur-3xl opacity-40 group-hover:opacity-60 pointer-events-none" />

                            <div className="relative z-10 space-y-4">
                              {/* Hero Badge Header */}
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                                  </span>
                                  <span className="text-[10px] font-mono tracking-[0.2em] text-violet-400 font-bold uppercase select-none">Spotlight Hero</span>
                                </div>
                                <div className="flex items-center gap-2 select-none">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExportCardModal({
                                        author: t.reactionSnippet?.author || 'shinichiro',
                                        content: t.reactionSnippet?.text || t.description,
                                        stream: t.title
                                      });
                                    }}
                                    className="flex items-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 rounded-full px-3 py-1 text-[9px] text-violet-300 font-mono transition-all duration-300 cursor-pointer"
                                  >
                                    <ArrowUpRight size={9} className="text-violet-400" />
                                    <span>Export Card</span>
                                  </button>
                                  <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.05] rounded-full px-3 py-1 text-[9px] text-neutral-400 font-mono">
                                    <Flame size={10} className="text-violet-500 fill-violet-500/20 animate-pulse shrink-0" />
                                    <span className="text-neutral-300 font-bold">Activity Spike</span>
                                  </div>
                                </div>
                              </div>

                              {/* Hero Description */}
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-violet-100 transition-colors">
                                    {t.title}
                                  </h2>
                                  <span className="text-xs text-neutral-500 font-mono font-medium">{t.tag}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-2xl font-medium">
                                  {t.description}
                                </p>
                              </div>

                              {/* Beautiful Editorial Serif Quote block */}
                              {t.reactionSnippet && (
                                <div className="relative bg-white/[0.01] border border-white/[0.02] rounded-xl p-4 sm:p-5 select-none pointer-events-none group-hover:border-white/[0.06] transition-all duration-300">
                                  <div className="absolute left-0 top-4 bottom-4 w-[2px] bg-gradient-to-b from-violet-500/60 to-transparent rounded" />
                                  <p className="text-xs sm:text-sm font-serif italic text-neutral-300 leading-relaxed font-light">
                                    "{t.reactionSnippet.text.slice(0, 160)}{t.reactionSnippet.text.length > 160 ? '...' : ''}"
                                  </p>
                                  <div className="flex items-center gap-2 mt-3">
                                    <Avatar 
                                      username={t.reactionSnippet.author} 
                                      src={t.reactionSnippet.avatarUrl} 
                                      size={18} 
                                    />
                                    <span className="text-[10px] font-mono text-neutral-500">
                                      @{t.reactionSnippet.author}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Hero Footer Meta */}
                              <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-white/[0.02]">
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 select-none">
                                  {t.participants && t.participants.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex -space-x-1.5 overflow-hidden">
                                        {t.participants.slice(0, 4).map((p, idx) => (
                                          <div 
                                            key={idx} 
                                            className="inline-block ring-2 ring-[#0c0c0e] rounded-md overflow-hidden shrink-0"
                                          >
                                            <Avatar username={p.username} src={p.avatarUrl} size={18} />
                                          </div>
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-neutral-400 font-mono font-medium">
                                        {t.activeUsers}
                                      </span>
                                    </div>
                                  )}

                                  {t.communities && t.communities.length > 0 && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-600 font-bold font-mono">Stream:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {t.communities.map((c, idx) => (
                                          <span key={idx} className="px-2 py-0.5 bg-white/[0.03] text-neutral-300 text-[9px] rounded font-medium border border-white/[0.01]">
                                            {c}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="text-right select-none font-mono">
                                  <span className="text-xs text-neutral-400 font-bold tracking-wider block">
                                    <AnimatedNumber value={t.posts} /> total posts
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div 
                          key={t.tag}
                          onClick={() => setExpandedTopicTag(t.tag)}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                          className="group relative flex items-start gap-5 py-5.5 cursor-pointer rounded-2xl px-5 -mx-5 hover:bg-white/[0.01] transition-all duration-300 border border-transparent hover:border-white/[0.02] overflow-hidden"
                        >
                          {/* Large Elegant Index */}
                          <div className="relative select-none pt-0.5 shrink-0 w-8">
                            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tighter text-neutral-800 group-hover:text-white/20 transition-all duration-500">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-500/5 to-transparent blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          </div>

                          {/* Content Column */}
                          <div className="flex-1 min-w-0 space-y-3.5">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-white/80 transition-colors">
                                  {t.title}
                                </h3>
                                <span className="text-[10px] text-neutral-500 font-mono font-medium">{t.tag}</span>
                              </div>
                              <p className="text-xs text-neutral-400 leading-relaxed max-w-xl font-medium">
                                {t.description}
                              </p>
                            </div>

                            {/* Quiet metadata and communities row */}

                            {/* Communities and Avatars Row */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 select-none">
                              {t.participants && t.participants.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex -space-x-1 overflow-hidden">
                                    {t.participants.slice(0, 3).map((p, idx) => (
                                      <div 
                                        key={idx} 
                                        className="inline-block ring-2 ring-[#050505] rounded-md overflow-hidden shrink-0"
                                      >
                                        <Avatar username={p.username} src={p.avatarUrl} size={15} />
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-[9px] text-neutral-500 font-mono">
                                    {t.activeUsers}
                                  </span>
                                </div>
                              )}

                              {t.communities && t.communities.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] uppercase tracking-wider text-neutral-600 font-bold font-mono">In:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {t.communities.map((c, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-white/[0.02] text-neutral-400 text-[9px] rounded font-medium border border-white/[0.01]">
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Velocity stats right column */}
                          <div className="flex-shrink-0 flex items-center gap-4.5 pt-1 select-none font-mono">
                            {/* Sparkline wave */}
                            <Sparkline seed={t.tag} color={t.change === 'Trending' ? '#fbbf24' : '#38bdf8'} />

                            <div className="text-right flex flex-col items-end justify-start">
                              <span className="text-[9px] font-bold uppercase tracking-wider border border-white/[0.04] bg-white/[0.01] rounded px-2 py-0.5 text-neutral-400 group-hover:border-white/10 group-hover:text-white transition-all">
                                {t.change}
                              </span>
                              <span className="text-[9px] text-neutral-500 mt-1.5">
                                <AnimatedNumber value={t.posts} /> posts
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}

              {/* COMMUNITIES TAB: Polished Premium List Cards */}
              {activeTab === 'communities' && (
                <motion.div
                  key="communities"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3 pt-1"
                >
                  {filteredCommunities.length === 0 ? (
                    <div className="py-20 text-center opacity-40 select-none">
                      <p className="text-xs uppercase tracking-widest font-mono">No active communities found</p>
                    </div>
                  ) : (
                    filteredCommunities.map((c, idx) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <Link 
                          href={`/communities`} 
                          className="group flex items-center gap-4 py-4.5 border-b border-white/[0.015] hover:bg-white/[0.005] hover:border-white/5 rounded-xl px-4 -mx-4 transition-all duration-300"
                        >
                          <CommunityIcon name={c.displayName} src={c.iconUrl} size={44} className="ring-2 ring-white/5 group-hover:ring-white/10 group-hover:scale-105 transition-all duration-300" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-sm truncate group-hover:text-white/80 transition-colors">
                                {c.displayName}
                              </h4>
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 group-hover:bg-violet-400 group-hover:shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all duration-300 shrink-0" />
                            </div>
                            <p className="text-[11px] text-neutral-500 truncate mt-0.5 max-w-lg font-medium">
                              {c.description ? c.description.split('||')[0].trim() : 'Creative circle sharing work.'}
                            </p>
                            <div className="text-[9px] font-mono text-neutral-500 mt-1.5 flex items-center gap-1.5 select-none">
                              <span className="text-neutral-400 font-bold"><AnimatedNumber value={c.memberCount} /></span> members
                            </div>
                          </div>
                          <div className="text-[10px] font-bold text-neutral-500 group-hover:text-white transition-colors flex items-center gap-1.5 font-mono select-none">
                            Enter <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* POSTS TAB: Clean Grid Layout */}
              {activeTab === 'posts' && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2"
                >
                  {filteredPosts.length === 0 ? (
                    <div className="col-span-2 py-20 text-center opacity-40 select-none">
                      <p className="text-xs uppercase tracking-widest font-mono">No posts found matching filter</p>
                    </div>
                  ) : (
                    filteredPosts.map((p) => (
                      <div key={p.id} className="h-fit">
                        <PostCard post={p} currentUserId={currentUserId} />
                      </div>
                    ))
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT COLUMN: Premium Discovery Sidebar */}
        <div className="lg:col-span-1 space-y-12 border-t lg:border-t-0 lg:border-l border-white/[0.02] pt-10 lg:pt-0 lg:pl-10 select-none">
          
          {/* Active Communities Widget */}
          <div className="space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 font-mono flex items-center gap-2">
              <Users size={11} className="text-violet-400/85 stroke-[2.5]" />
              Active Communities
            </h3>
            <div className="space-y-4">
              {filteredCommunities.slice(0, 3).map((c) => {
                const liveStatusOptions = [
                  'Active conversation',
                  'Fresh updates',
                  'Growing discussion',
                  'Most joined recently'
                ];
                const hashIndex = c.displayName.length % liveStatusOptions.length;
                const statusStr = c.memberCount > 4000 ? 'Highly active tonight' : liveStatusOptions[hashIndex];

                return (
                  <Link 
                    key={c.id} 
                    href={`/communities`} 
                    className="flex items-center gap-3.5 group transition-opacity duration-300 hover:opacity-90"
                  >
                    <CommunityIcon name={c.displayName} src={c.iconUrl} size={36} className="ring-2 ring-white/5 group-hover:ring-white/10 group-hover:scale-105 transition-all duration-300" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-white/80 transition-colors">
                        {c.displayName}
                      </h4>
                      <p className="text-[9px] text-neutral-500 font-mono mt-0.5 tracking-wide">
                        {statusStr}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {filteredCommunities.length === 0 && (
                <p className="text-xs text-neutral-600 font-mono">No active groups matching query.</p>
              )}
            </div>
          </div>

          {/* Conversations In Motion Widget */}
          <div className="space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 font-mono flex items-center gap-2">
              <MessageSquare size={11} className="text-indigo-400/85 stroke-[2.5]" />
              Conversations In Motion
            </h3>
            <div className="space-y-4">
              {filteredPosts.slice(0, 2).map((p) => (
                <div 
                  key={p.id}
                  onClick={() => router.push('/feed')}
                  className="block p-4.5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.02] hover:border-white/5 transition-all duration-500 group cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <Avatar username={p.author.username} src={p.author.avatar} size={18} className="ring-1 ring-white/5" />
                    <span className="text-[10px] font-bold text-neutral-400 group-hover:text-neutral-200 transition-colors truncate">
                      @{p.author.username}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium leading-relaxed mt-2.5 line-clamp-2 group-hover:text-white transition-colors">
                    {p.content}
                  </p>
                  <div className="flex items-center gap-4 text-[9px] text-neutral-500 font-mono mt-4 pt-2.5 border-t border-white/[0.02] select-none">
                    <button 
                      type="button"
                      onClick={(e) => handleLikePost(p.id, e)}
                      className={clsx(
                        "flex items-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 outline-none",
                        likedPosts[p.id] ? "text-rose-500 font-bold" : "text-neutral-500 hover:text-rose-400"
                      )}
                    >
                      <Heart 
                        size={10} 
                        className={clsx("transition-all duration-300", likedPosts[p.id] && "fill-rose-500 text-rose-500 scale-110")} 
                      /> {localLikeCounts[p.id] ?? p.likeCount}
                    </button>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={9} /> {p.commentCount}
                    </span>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.02]">
                  <p className="text-xs text-neutral-600 font-mono italic">No discussions found in feed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Creator Spotlight Widget */}
          <div className="space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 font-mono flex items-center gap-2">
              <Star size={11} className="text-emerald-400/85 stroke-[2.5]" />
              Creator Spotlight
            </h3>
            <div className="space-y-2">
              {activeCreators.map((creator) => {
                const specialties: Record<string, string> = {
                  kunal: 'Fine-tuning variable typography scales',
                  riya: 'Optimizing local LLM configurations',
                  shinichiro: 'Restoring retro hand-held devices',
                  souta: 'Recording physical ambient synth loops',
                  mitsuya: 'Drafting monochrome garment drapes',
                  chifuyu: 'Developing raw analogue street film',
                  baji: 'Assembling local GPU cluster designs'
                };
                
                const cleanName = creator.username.toLowerCase();
                const isEndorsed = !!endorsedCreators[cleanName];
                const specialty = specialties[cleanName] || 'Active in creative community';
                const statusText = isEndorsed ? 'Endorsed Spotlight ✦' : specialty;

                return (
                  <div 
                    key={creator.id || creator.username}
                    onClick={(e) => triggerSpotlightEndorsement(e, creator.username)}
                    className="flex items-center gap-3.5 cursor-pointer group relative p-2.5 rounded-xl hover:bg-white/[0.015] border border-transparent hover:border-white/[0.02] transition-all duration-300"
                  >
                    <div className="relative shrink-0 transition-transform group-hover:scale-105 duration-300">
                      <Avatar username={creator.username} src={creator.avatar} size={30} className="ring-2 ring-white/5 group-hover:ring-white/10 transition-all duration-300" />
                      {isEndorsed && (
                        <span className="absolute -bottom-1 -right-1 text-[8px] select-none text-emerald-400">
                          <CheckCircle size={10} className="fill-black" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-white group-hover:text-white/80 transition-colors flex items-center gap-1.5 truncate">
                        {creator.displayName || creator.username}
                        {creator.isVerified && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />}
                      </span>
                      <p className={clsx(
                        "text-[9px] truncate mt-0.5 transition-all duration-300 font-mono tracking-wide",
                        isEndorsed ? "text-emerald-400 font-bold" : "text-neutral-500"
                      )}>
                        {statusText}
                      </p>
                    </div>

                    {/* Subtle spotlight endorsement star icon */}
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 bg-white/[0.02] border border-white/[0.04] rounded-md hover:border-white/10 hover:bg-white/5 shrink-0"
                    >
                      <Star size={10} className={isEndorsed ? "fill-emerald-400 text-emerald-400" : "text-neutral-500"} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Visuals Grid */}
          <div className="space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 font-mono flex items-center gap-2">
              <Camera size={11} className="text-pink-400/85 stroke-[2.5]" />
              Popular Visuals
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {visualPreviews.map((vp, index) => (
                <VisualTile key={vp.postId + '-' + index} vp={vp} index={index} />
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ─── Premium Sliding Conversation Side-Sheet ─── */}
      <AnimatePresence>
        {expandedTopicTag && expandedTopicActiveTopic && (
          <motion.div
            key="topic-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedTopicTag(null)}
            className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
          />
        )}

        {expandedTopicTag && expandedTopicActiveTopic && (() => {
          const activeTopic = expandedTopicActiveTopic;
          const topicPosts = expandedTopicPosts;
          return (
            <motion.div
              key="topic-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#060608]/75 backdrop-blur-3xl border-l border-white/[0.04] z-50 p-6 flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden select-none"
            >
                {/* Floating ambient glow bubbles */}
                <div className="absolute w-[220px] h-[220px] rounded-full bg-violet-500/[0.03] blur-[80px] -right-20 -top-20 pointer-events-none" />
                <div className="absolute w-[220px] h-[220px] rounded-full bg-indigo-500/[0.02] blur-[80px] -left-20 -bottom-20 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01),transparent_70%)] pointer-events-none" />

                {/* Header Section */}
                <div className="space-y-5 flex-1 flex flex-col overflow-hidden relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                        Live conversation
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setExpandedTopicTag(null)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 transition-all outline-none"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 pb-2 border-b border-white/[0.02]">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      {activeTopic.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-violet-400 font-mono font-semibold uppercase tracking-wider">{activeTopic.change}</span>
                      <span className="text-neutral-600 font-mono text-[9px]">•</span>
                      <span className="text-[10px] text-neutral-500 font-mono font-medium">{activeTopic.tag}</span>
                    </div>
                  </div>

                  {/* Scrollable Conversation Stream */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                    {topicPosts.length > 0 ? (
                      topicPosts.map((tp) => (
                        <div key={tp.id} className="flex flex-col animate-fade-in p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.02] hover:border-white/[0.05] hover:bg-white/[0.025] transition-all duration-300 group/msg relative shadow-sm">
                          <div className="flex gap-3.5 items-start">
                            <Avatar username={tp.author.username} src={tp.author.avatar} size={22} className="ring-1 ring-white/5 shrink-0" />
                            <div className="flex-1 space-y-1 pr-6 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-neutral-400 truncate">
                                  @{tp.author.username}
                                </span>
                                <span className="text-[8px] text-neutral-600 font-mono">
                                  {new Date(tp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-200 leading-relaxed font-sans font-medium">{tp.content}</p>
                            </div>
                          </div>

                          {/* Premium Action Row underneath the message */}
                          <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-white/[0.02] select-none text-[9px] font-mono text-neutral-500">
                            <button
                              type="button"
                              onClick={() => handleToggleReplies(tp.id)}
                              className="flex items-center gap-1.5 hover:text-white/60 transition-colors"
                            >
                              <MessageSquare size={10} />
                              <span>
                                {expandedReplies[tp.id] ? 'Hide replies' : `View replies (${tp.commentCount || 0})`}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveInputMode('comment');
                                setActiveReplyTarget({ postId: tp.id, username: tp.author.username });
                              }}
                              className="flex items-center gap-1 hover:text-white/60 transition-colors cursor-pointer"
                            >
                              <CornerDownRight size={10} />
                              <span>Reply</span>
                            </button>
                          </div>

                          {/* Visual Indented Reply Thread for the post */}
                          {expandedReplies[tp.id] && (
                            <div className="pl-6 mt-3 space-y-3 relative border-l border-white/[0.04] w-full">
                              {loadingReplies[tp.id] ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 size={12} className="animate-spin text-neutral-600" />
                                </div>
                              ) : (repliesCache[tp.id] || []).length > 0 ? (
                                (repliesCache[tp.id] || []).map((reply) => (
                                  <div key={reply.id} className="flex gap-2.5 items-start animate-fade-in py-1.5 group/reply relative min-w-0 w-full">
                                    <Avatar username={reply.author?.username || 'user'} src={reply.author?.avatar_url} size={18} className="ring-1 ring-white/5 shrink-0" />
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap w-full">
                                        <span className="text-[10px] font-bold text-neutral-400 truncate flex items-center gap-1">
                                          @{reply.author?.username || 'user'}
                                          {reply.is_pinned && (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-violet-500/10 text-violet-500 px-1 py-0.5 rounded">
                                              <Pin size={6} className="fill-current" /> Pinned
                                            </span>
                                          )}
                                          {reply.is_flagged && (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-red-500/10 text-red-500 px-1 py-0.5 rounded">
                                              Flagged
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-[8px] text-neutral-600 font-mono">
                                          {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        
                                        {/* Action buttons (Pin, Delete, Report) */}
                                        <div className="flex items-center gap-2 ml-auto text-[8px] font-bold uppercase tracking-wider text-neutral-500 select-none">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveInputMode('comment');
                                              setActiveReplyTarget({ postId: tp.id, commentId: reply.id, username: reply.author?.username || 'user' });
                                            }}
                                            className="hover:text-white/60 transition-colors cursor-pointer"
                                          >
                                            Reply
                                          </button>

                                          {/* Post owner comment pinning control */}
                                          {tp.author.id === currentUserId && (
                                            <button
                                              type="button"
                                              onClick={() => handlePinComment(tp.id, reply.id, !reply.is_pinned)}
                                              className={clsx(
                                                "transition-colors cursor-pointer flex items-center gap-0.5",
                                                reply.is_pinned ? "text-violet-500 hover:text-violet-400" : "hover:text-white/60"
                                              )}
                                            >
                                              <Pin size={8} />
                                              <span>{reply.is_pinned ? 'Unpin' : 'Pin'}</span>
                                            </button>
                                          )}

                                          {/* Comment deletion control (Comment Author or Post Owner) */}
                                          {(reply.author_id === currentUserId || tp.author.id === currentUserId) && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteComment(tp.id, reply.id)}
                                              className="hover:text-red-400 transition-colors cursor-pointer flex items-center gap-0.5"
                                            >
                                              <Trash2 size={8} />
                                              <span>Delete</span>
                                            </button>
                                          )}

                                          {/* Report control for public comments */}
                                          {reply.author_id !== currentUserId && (
                                            <button
                                              type="button"
                                              onClick={() => handleReportComment(tp.id, reply.id)}
                                              className="hover:text-violet-500 transition-colors cursor-pointer flex items-center gap-0.5"
                                            >
                                              <Flag size={8} />
                                              <span>Report</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-neutral-300 leading-relaxed font-sans font-medium">{reply.content}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="py-2 text-center text-neutral-600 font-mono text-[10px]">
                                  No replies yet. Click reply above to be the first!
                                </div>
                              )}
                            </div>
                          )}

                          {/* Premium Micro-share download action */}
                          <button
                            type="button"
                            onClick={() => setExportCardModal({
                              author: tp.author.username,
                              content: tp.content,
                              stream: activeTopic.title
                            })}
                            className="absolute right-3 top-3.5 opacity-0 group-hover/msg:opacity-100 transition-all duration-300 p-1.5 bg-white/[0.02] border border-white/[0.04] rounded-lg hover:border-white/10 hover:bg-white/5 text-neutral-400 hover:text-violet-400 cursor-pointer"
                            title="Export Quote Card"
                          >
                            <ArrowUpRight size={10} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-neutral-600 font-mono text-xs">
                        No messages under this stream. Add yours below.
                      </div>
                    )}

                    {/* Optimistic locally updated posts */}
                    {(customReplies[activeTopic.tag] || []).map((reply, idx) => {
                      const replyUsername = currentUserProfile?.username || 'shinichiro';
                      const replyAvatar = currentUserProfile?.avatarUrl || null;
                      return (
                        <div key={idx} className="flex gap-3.5 items-start animate-fade-in p-3.5 rounded-xl bg-emerald-500/[0.01] border border-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.02)] transition-all duration-300">
                          <Avatar username={replyUsername} src={replyAvatar} size={22} className="ring-1 ring-emerald-400/20" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                @{replyUsername} <span className="text-[8px] bg-emerald-400/10 text-emerald-400 px-1 rounded font-mono font-normal">You</span>
                              </span>
                              <span className="text-[9px] text-emerald-500/40 font-mono">
                                Just now
                              </span>
                            </div>
                            <p className="text-xs text-neutral-200 leading-relaxed font-sans font-medium">{reply}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Input forms and Tab Selectors */}
                <div className="relative z-10 pt-4 border-t border-white/[0.02] flex flex-col">
                  {/* Selector Button Group */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/[0.015] border border-white/[0.03] rounded-xl self-start mb-3 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInputMode('comment');
                      }}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                        activeInputMode === 'comment' ? "bg-white/5 text-white border border-white/[0.06]" : "text-neutral-500 hover:text-neutral-300"
                      )}
                    >
                      <MessageSquare size={10} />
                      <span>Comment / Reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInputMode('feed');
                        setActiveReplyTarget(null);
                      }}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                        activeInputMode === 'feed' ? "bg-white/5 text-white border border-white/[0.06]" : "text-neutral-500 hover:text-neutral-300"
                      )}
                    >
                      <Compass size={10} />
                      <span>Post to Feed</span>
                    </button>
                  </div>

                  {/* Replying target active banner */}
                  {activeReplyTarget && (
                    <div className="flex items-center justify-between bg-white/[0.015] border border-white/[0.04] rounded-xl px-4 py-2 mb-3 text-[10px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        Replying to <strong className="text-violet-400">@{activeReplyTarget.username}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveReplyTarget(null)}
                        className="p-1 rounded-md text-neutral-500 hover:text-white transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}

                  {/* Input Form */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('comment') as HTMLInputElement;
                      const text = input.value.trim();
                      if (!text) return;
                      
                      if (!currentUserId) {
                        window.dispatchEvent(new CustomEvent('verlyn:toast', {
                          detail: { message: 'You must authenticate to share your thoughts', type: 'error' }
                        }));
                        return;
                      }

                      if (activeInputMode === 'comment') {
                        if (!activeReplyTarget) {
                          window.dispatchEvent(new CustomEvent('verlyn:toast', {
                            detail: { message: "Select a message's reply button above first", type: 'error' }
                          }));
                          return;
                        }

                        const { postId, commentId, username } = activeReplyTarget;
                        const isRealUUID = UUID_REGEX.test(postId);
                        
                        if (isRealUUID) {
                          const res = await submitCommentDB(postId, currentUserId, text, commentId);
                          if (res.error) {
                            window.dispatchEvent(new CustomEvent('verlyn:toast', {
                              detail: { message: res.error, type: 'error' }
                            }));
                            return;
                          }
                        }

                        window.dispatchEvent(new CustomEvent('verlyn:toast', {
                          detail: { message: 'Reply posted successfully!', type: 'success' }
                        }));

                        // Optimistically insert locally inside cache
                        const newComment = {
                          id: `opt-${Date.now()}`,
                          content: text,
                          created_at: new Date().toISOString(),
                          parent_id: commentId || null,
                          author_id: currentUserId,
                          author: {
                            id: currentUserId,
                            username: currentUserProfile?.username || 'shinichiro',
                            display_name: currentUserProfile?.displayName || currentUserProfile?.username || 'shinichiro',
                            avatar_url: currentUserProfile?.avatarUrl || null,
                          }
                        };

                        setRepliesCache(prev => ({
                          ...prev,
                          [postId]: [...(prev[postId] || []), newComment]
                        }));

                        setExpandedReplies(prev => ({ ...prev, [postId]: true }));
                        
                        // Increment local comment count for user visual updates
                        setTrendingPosts(prev => prev.map(p => {
                          if (p.id === postId) {
                            return { ...p, commentCount: (p.commentCount || 0) + 1 };
                          }
                          return p;
                        }));

                        setActiveReplyTarget(null);
                        input.value = '';
                        if (isRealUUID) {
                          loadTrendingData(true);
                        }
                      } else {
                        const finalContent = `${text} ${activeTopic.tag}`;
                        
                        // Optimistic update
                        setCustomReplies(prev => ({
                          ...prev,
                          [activeTopic.tag]: [...(prev[activeTopic.tag] || []), text]
                        }));
                        input.value = '';

                        const fd = new FormData();
                        fd.append('content', finalContent);

                        submitPost(fd).then((res: any) => {
                          if (res && res.error) {
                            console.warn("Failed to insert live stream post:", res.error);
                            window.dispatchEvent(new CustomEvent('verlyn:toast', {
                              detail: { message: res.error || 'Failed to record response in feed', type: 'error' }
                            }));
                            // Rollback
                            setCustomReplies(prev => ({
                              ...prev,
                              [activeTopic.tag]: (prev[activeTopic.tag] || []).filter(r => r !== text)
                            }));
                          } else {
                            window.dispatchEvent(new CustomEvent('verlyn:toast', {
                              detail: { message: 'Response active in live stream!', type: 'success' }
                            }));
                            loadTrendingData(true);
                          }
                        });
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      name="comment"
                      placeholder={
                        activeInputMode === 'comment'
                          ? activeReplyTarget
                            ? `Write reply to @${activeReplyTarget.username}...`
                            : "Select a message's reply button above..."
                          : "Share your thoughts..."
                      }
                      className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/20 focus:bg-white/[0.04] transition-all font-sans"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-gradient-to-r from-violet-400 to-violet-500 text-white font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </motion.div>
          );
        })()}

        {exportCardModal && (() => {
          const { author, content, stream } = exportCardModal;
          const styleDims = {
            widescreen: { aspect: 'aspect-[1.71]',  w: 600, h: 350, wrap: 42, maxLines: 5 },
            square:     { aspect: 'aspect-square',   w: 500, h: 500, wrap: 32, maxLines: 8 },
            story:      { aspect: 'aspect-[9/16]',   w: 400, h: 700, wrap: 24, maxLines: 12 },
            landscape:  { aspect: 'aspect-[16/9]',   w: 800, h: 450, wrap: 55, maxLines: 6 },
            portrait:   { aspect: 'aspect-[3/4]',    w: 480, h: 640, wrap: 30, maxLines: 10 },
            ultrawide:  { aspect: 'aspect-[21/9]',   w: 900, h: 320, wrap: 65, maxLines: 4 },
            classic:    { aspect: 'aspect-[4/3]',    w: 560, h: 420, wrap: 38, maxLines: 7 },
          };
          const sd = styleDims[cardSize];

          const wrapText = (text: string, maxChars: number) => {
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            words.forEach(word => {
              if ((currentLine + ' ' + word).trim().length <= maxChars) {
                currentLine = (currentLine + ' ' + word).trim();
              } else {
                lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);
            return lines;
          };

          let finalContent = content.replace(/[\"<>]/g, '').trim();
          if (cardTextCase === 'uppercase') {
            finalContent = finalContent.toUpperCase();
          } else if (cardTextCase === 'lowercase') {
            finalContent = finalContent.toLowerCase();
          }
          const lines = wrapText(finalContent, sd.wrap).slice(0, sd.maxLines);

          const themeColors = {
            noir:     { bgStart: '#070709', bgEnd: '#121215', accent: '#fbbf24', glow: '#fbbf24', opacity: '0.02' },
            neon:     { bgStart: '#0a0415', bgEnd: '#16082a', accent: '#c084fc', glow: '#a855f7', opacity: '0.025' },
            aura:     { bgStart: '#020f12', bgEnd: '#051f24', accent: '#2dd4bf', glow: '#2dd4bf', opacity: '0.025' },
            sunset:   { bgStart: '#0f030a', bgEnd: '#250718', accent: '#f43f5e', glow: '#f43f5e', opacity: '0.025' },
            slate:    { bgStart: '#18181b', bgEnd: '#27272a', accent: '#ffffff', glow: '#ffffff', opacity: '0.02' },
            cyber:    { bgStart: '#050510', bgEnd: '#140c2a', accent: '#f59e0b', glow: '#6366f1', opacity: '0.03' },
            forest:   { bgStart: '#021810', bgEnd: '#062e20', accent: '#34d399', glow: '#10b981', opacity: '0.035' },
            crimson:  { bgStart: '#0f0202', bgEnd: '#28050e', accent: '#f87171', glow: '#ef4444', opacity: '0.03' },
            royal:    { bgStart: '#020212', bgEnd: '#09092d', accent: '#60a5fa', glow: '#3b82f6', opacity: '0.03' },
            lavender: { bgStart: '#080510', bgEnd: '#1d0c32', accent: '#e879f9', glow: '#a855f7', opacity: '0.03' }
          };
          const tc = themeColors[cardTheme];

          const fontFamilies = {
            serif:       'Georgia, serif',
            mono:        'Courier New, Monaco, monospace',
            modern:      'system-ui, -apple-system, sans-serif',
            display:     'Impact, "Arial Black", sans-serif',
            handwriting: '"Comic Sans MS", cursive, sans-serif',
            condensed:   '"Arial Narrow", "Helvetica Condensed", sans-serif',
          };
          const ff = fontFamilies[cardFont];

          const previewRx = cardCornerRadius === 'sharp' ? 4 : cardCornerRadius === 'pill' ? 40 : 20;
          const previewTextX = cardTextAlign === 'center' ? sd.w / 2 : cardTextAlign === 'right' ? sd.w - 40 : 40;
          const previewAnchor = cardTextAlign === 'center' ? 'middle' : cardTextAlign === 'right' ? 'end' : 'start';
          const contentTop = showWatermark ? 145 : 105;

          // Define dynamic live gradient coordinates
          const previewRad = (gradientRotation * Math.PI) / 180;
          const px1 = Math.round(50 - Math.cos(previewRad) * 50) + '%';
          const py1 = Math.round(50 - Math.sin(previewRad) * 50) + '%';
          const px2 = Math.round(50 + Math.cos(previewRad) * 50) + '%';
          const py2 = Math.round(50 + Math.sin(previewRad) * 50) + '%';

          const borderFilter = neonPulse ? 'filter="url(#live-neon-glow)"' : '';

          // Generate dynamic waveform path for live preview
          let liveWaveD = `M 40,${sd.h - 85}`;
          const liveSteps = 40;
          const liveStepWidth = (sd.w - 80) / liveSteps;
          for (let i = 0; i <= liveSteps; i++) {
            const x = 40 + i * liveStepWidth;
            const offset = Math.sin(i * 0.5) * Math.cos(i * 0.2) * 18;
            const y = (sd.h - 85) + (i === 0 || i === liveSteps ? 0 : offset);
            liveWaveD += ` L ${x},${y}`;
          }

          return (
            <>
              {/* Full-screen overlay: backdrop + centered modal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.7)' }}
                onClick={(e) => { if (e.target === e.currentTarget) setExportCardModal(null); }}
              >
              {/* Center Modal Card Customize Panel */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-row gap-7 shadow-2xl overflow-hidden max-h-[90vh] select-none"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setExportCardModal(null)}
                  className="absolute right-5 top-5 w-8 h-8 rounded-xl text-neutral-500 hover:text-white hover:bg-white/[0.08] transition-all outline-none z-10 flex items-center justify-center"
                >
                  <X size={16} />
                </button>

                {/* LEFT PANEL: Interactive Live SVG Preview */}
                <div 
                  className="flex-1 flex flex-col items-center justify-center bg-black/50 rounded-2xl p-5 border border-white/[0.04] min-h-[260px] relative overflow-hidden group cursor-pointer"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    setPreviewTilt({ x: x * 20, y: -y * 20 });
                    setIsTilting(true);
                  }}
                  onMouseLeave={() => {
                    setIsTilting(false);
                    setPreviewTilt({ x: 0, y: 0 });
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] to-transparent pointer-events-none" />
                  
                  {/* Live Card Container scaled dynamically with 3D tilting */}
                  <div 
                    className={clsx("w-full max-w-md transition-all duration-500 relative rounded-xl overflow-hidden shadow-2xl")}
                    style={{
                      aspectRatio: sd.w / sd.h,
                      transform: isTilting 
                        ? `perspective(800px) rotateX(${previewTilt.y}deg) rotateY(${previewTilt.x}deg) scale3d(1.02, 1.02, 1.02)` 
                        : 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                      transition: isTilting ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
                    }}
                  >
                    <svg viewBox={`0 0 ${sd.w} ${sd.h}`} className="w-full h-full block">
                      <defs>
                        <linearGradient id={`live-bg-${cardTheme}`} x1={px1} y1={py1} x2={px2} y2={py2}>
                          <stop offset="0%" stopColor={tc.bgStart} />
                          <stop offset="100%" stopColor={tc.bgEnd} />
                        </linearGradient>
                        <linearGradient id="live-glass-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                          <stop offset="40%" stopColor="white" stopOpacity="0" />
                          <stop offset="100%" stopColor="black" stopOpacity="0.3" />
                        </linearGradient>
                        <linearGradient id="live-irid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff7eb3"/>
                          <stop offset="25%" stopColor="#ff758c"/>
                          <stop offset="50%" stopColor="#ac73ff"/>
                          <stop offset="75%" stopColor="#00f2fe"/>
                          <stop offset="100%" stopColor="#4facfe"/>
                        </linearGradient>
                        <pattern id="live-grid-pat" width="24" height="24" patternUnits="userSpaceOnUse">
                          <path d="M 24 0 L 0 0 0 24" fill="none" stroke={tc.accent} strokeWidth="0.6" strokeOpacity="0.08"/>
                          <circle cx="24" cy="0" r="1.2" fill={tc.accent} fillOpacity="0.2"/>
                        </pattern>
                        {cardGrain && (
                          <filter id="live-grain">
                            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
                            <feColorMatrix type="saturate" values="0"/>
                            <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
                          </filter>
                        )}
                        {chromaticAberration && (
                          <filter id="live-chromatic-aberration">
                            <feOffset dx="-1.5" dy="0" in="SourceGraphic" result="redChan"/>
                            <feOffset dx="1.5" dy="0" in="SourceGraphic" result="blueChan"/>
                            <feColorMatrix in="redChan" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="redSplit"/>
                            <feColorMatrix in="blueChan" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blueSplit"/>
                            <feBlend mode="screen" in="redSplit" in2="blueSplit" result="aberration"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="aberration"/>
                          </filter>
                        )}
                        {neonPulse && (
                          <filter id="live-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur1"/>
                            <feGaussianBlur stdDeviation="7" result="blur2"/>
                            <feMerge>
                              <feMergeNode in="blur2"/>
                              <feMergeNode in="blur1"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        )}
                        <linearGradient id="live-prism-leak" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff007f" stopOpacity="0.14"/>
                          <stop offset="30%" stopColor="#7f00ff" stopOpacity="0.04"/>
                          <stop offset="70%" stopColor="#00ffff" stopOpacity="0.04"/>
                          <stop offset="100%" stopColor="#ffaa00" stopOpacity="0.14"/>
                        </linearGradient>
                      </defs>

                      {/* Render background choices */}
                      {cardBackgroundStyle === 'solid' && (
                        <rect width={sd.w} height={sd.h} rx={previewRx} fill={tc.bgStart}/>
                      )}
                      {cardBackgroundStyle === 'gradient' && (
                        <rect width={sd.w} height={sd.h} rx={previewRx} fill={`url(#live-bg-${cardTheme})`}/>
                      )}
                      {cardBackgroundStyle === 'glass' && (
                        <>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill={`url(#live-bg-${cardTheme})`}/>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill="#16161a" fillOpacity="0.45"/>
                          {glassRefraction && (
                            <rect width={sd.w} height={sd.h} rx={previewRx} fill="url(#live-glass-shine)" fillOpacity="0.1"/>
                          )}
                        </>
                      )}
                      {cardBackgroundStyle === 'cyberGrid' && (
                        <>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill={`url(#live-bg-${cardTheme})`}/>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill="url(#live-grid-pat)"/>
                        </>
                      )}
                      {cardBackgroundStyle === 'iridescent' && (
                        <>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill="url(#live-irid-bg)"/>
                          <rect width={sd.w} height={sd.h} rx={previewRx} fill="black" fillOpacity="0.65"/>
                        </>
                      )}

                      {borderStyle !== 'none' && (
                        <rect x="1" y="1" width={sd.w - 2} height={sd.h - 2} rx={previewRx - 1} fill="none" stroke={borderStyle === 'glow' ? tc.accent : 'white'} strokeOpacity={borderStyle === 'glow' ? 0.15 : 0.03} strokeWidth="1" filter={neonPulse ? 'url(#live-neon-glow)' : undefined}/>
                      )}
                      
                      {glowStrength !== 'off' && (
                        <>
                          <circle cx="50" cy="50" r="90" fill={tc.glow} fillOpacity={parseFloat(tc.opacity) * (glowStrength === 'low' ? 0.4 : 1.0)} filter={`blur(${cardBlurStrength}px)`}/>
                          <circle cx={sd.w - 50} cy={sd.h - 50} r="90" fill="#6366f1" fillOpacity={parseFloat(tc.opacity) * (glowStrength === 'low' ? 0.4 : 1.0)} filter={`blur(${cardBlurStrength}px)`}/>
                        </>
                      )}

                      {cardGrain && (
                        <rect width={sd.w} height={sd.h} rx={previewRx} filter="url(#live-grain)" opacity="0.04" fill="white" pointerEvents="none"/>
                      )}

                      {waveformOverlay && (
                        <path d={liveWaveD} fill="none" stroke={tc.accent} strokeWidth="1.2" strokeOpacity="0.22" filter={neonPulse ? 'url(#live-neon-glow)' : undefined}/>
                      )}

                      {hudOverlay && (
                        <>
                          <path d={`M 25 45 L 25 25 L 45 25`} fill="none" stroke={tc.accent} strokeWidth="1" strokeOpacity="0.3"/>
                          <path d={`M ${sd.w - 25} 45 L ${sd.w - 25} 25 L ${sd.w - 45} 25`} fill="none" stroke={tc.accent} strokeWidth="1" strokeOpacity="0.3"/>
                          <path d={`M 25 ${sd.h - 45} L 25 ${sd.h - 25} L 45 ${sd.h - 25}`} fill="none" stroke={tc.accent} strokeWidth="1" strokeOpacity="0.3"/>
                          <path d={`M ${sd.w - 25} ${sd.h - 45} L ${sd.w - 25} ${sd.h - 25} L ${sd.w - 45} ${sd.h - 25}`} fill="none" stroke={tc.accent} strokeWidth="1" strokeOpacity="0.3"/>
                          <text x="35" y="38" fontFamily="monospace" fontSize="6" fontWeight="bold" fill={tc.accent} fillOpacity="0.4" letterSpacing="1">SYS_STATUS: ACTIVE</text>
                          <text x={sd.w - 35} y="38" fontFamily="monospace" fontSize="6" fontWeight="bold" fill={tc.accent} fillOpacity="0.4" textAnchor="end" letterSpacing="1">COORD: [{sd.w}x{sd.h}]</text>
                          <line x1={sd.w / 2} y1="20" x2={sd.w / 2} y2="28" stroke={tc.accent} strokeOpacity="0.2" strokeWidth="1"/>
                          <line x1={sd.w / 2 - 4} y1="24" x2={sd.w / 2 + 4} y2="24" stroke={tc.accent} strokeOpacity="0.2" strokeWidth="1"/>
                        </>
                      )}

                      {lightLeak && (
                        <rect width={sd.w} height={sd.h} rx={previewRx} fill="url(#live-prism-leak)" pointerEvents="none"/>
                      )}

                      {showWatermark && (
                        <>
                          <text x="40" y="52" fontFamily="monospace" fontSize="10" fontWeight="900" fill={tc.accent} letterSpacing="3.5">{customWatermark.toUpperCase()}</text>
                          <text x="40" y="70" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill="white" fillOpacity="0.3" letterSpacing="1">TRENDING SPOTLIGHT</text>
                        </>
                      )}

                      {cardQuoteStyle === 'mark' && (
                        <text x={previewTextX} y={contentTop - 15} fontFamily="serif" fontSize="64" fontWeight="bold" fill={tc.accent} fillOpacity="0.08" textAnchor={previewAnchor}>“</text>
                      )}
                      {cardQuoteStyle === 'line' && (
                        <line x1="40" y1={contentTop - 20} x2={sd.w - 40} y2={contentTop - 20} stroke={tc.accent} strokeOpacity="0.15" strokeWidth="1" filter={neonPulse ? 'url(#live-neon-glow)' : undefined}/>
                      )}
                      {cardQuoteStyle === 'bar' && (
                        <rect x="40" y="80" width="4" height={lines.length * Math.round(cardFontSize * cardLineHeight) + 8} rx="2" fill={tc.accent} fillOpacity="0.5" filter={neonPulse ? 'url(#live-neon-glow)' : undefined}/>
                      )}

                      <g filter={chromaticAberration ? 'url(#live-chromatic-aberration)' : undefined}>
                        <text x={previewTextX} y={contentTop} fontFamily={ff} fontSize={cardFontSize} fontStyle="italic" fill="#e4e4e7" fontWeight="300" textAnchor={previewAnchor} letterSpacing={cardLetterSpacing}>
                          {lines.map((line, idx) => {
                            if (!smartEmphasis || !line.includes('*')) {
                              return <tspan key={idx} x={previewTextX} dy={idx === 0 ? 0 : Math.round(cardFontSize * cardLineHeight)}>{line}</tspan>;
                            }
                            const parts = line.split('*');
                            return (
                              <tspan key={idx} x={previewTextX} dy={idx === 0 ? 0 : Math.round(cardFontSize * cardLineHeight)}>
                                {parts.map((part, pIdx) => {
                                  if (pIdx % 2 === 1) {
                                    return <tspan key={pIdx} fill={tc.accent} fontWeight="bold">{part}</tspan>;
                                  }
                                  return part;
                                })}
                              </tspan>
                            );
                          })}
                        </text>
                      </g>

                      <line x1="40" y1={sd.h - 70} x2={sd.w - 40} y2={sd.h - 70} stroke="white" strokeOpacity="0.04" strokeWidth="0.8"/>
                      <text x="40" y={sd.h - 42} fontFamily="monospace" fontSize="10" fontWeight="bold" fill={tc.accent} letterSpacing="1">@{author.toUpperCase()}</text>
                      <text x={sd.w - 40} y={sd.h - 55} fontFamily="monospace" fontSize="7.5" fontWeight="900" fill={tc.accent} fillOpacity="0.4" textAnchor="end" letterSpacing="1.5">VERLYN.IN</text>
                      <text x={sd.w - 40} y={sd.h - 42} fontFamily="monospace" fontSize="8" fontWeight="bold" fill="white" fillOpacity="0.3" textAnchor="end" letterSpacing="0.5">STREAM: {stream.toUpperCase()}</text>
                    </svg>
                  </div>
                  
                  <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase mt-4 select-none">Real-time vector preview</span>
                </div>

                {/* RIGHT PANEL: Customizer Options */}
                <div className="w-[340px] flex flex-col min-h-0 select-none">
                  <div className="space-y-1 pb-4 border-b border-white/[0.06] shrink-0 pr-8">
                    <h3 className="text-base font-bold text-white tracking-tight">Customize Card</h3>
                    <p className="text-xs text-neutral-500 font-medium">Style your quote card for social sharing.</p>
                  </div>

                  {/* Scrollable Customize Settings List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-5 px-1 min-h-0">
                    {/* Design Presets selector */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Style Presets</span>
                      <div className="grid grid-cols-5 gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['default', 'minimalist', 'cyberpunk', 'hologram', 'sunset'] as const).map(pr => {
                          const labels = { default: 'Default', minimalist: 'Minimal', cyberpunk: 'Cyber', hologram: 'Holo', sunset: 'Sunset' };
                          const applyPreset = (presetName: 'default' | 'minimalist' | 'cyberpunk' | 'hologram' | 'sunset') => {
                            const presets = {
                              default: {
                                theme: 'noir', font: 'serif', size: 'widescreen', corners: 'rounded', border: 'thin',
                                bg: 'gradient', casing: 'normal', chromatic: false, neonP: false, glow: 'high', fontSize: 18, blur: 20,
                                hud: false, waveform: false, leak: false, emphasis: false
                              },
                              minimalist: {
                                theme: 'slate', font: 'serif', size: 'classic', corners: 'sharp', border: 'none',
                                bg: 'solid', casing: 'normal', chromatic: false, neonP: false, glow: 'off', fontSize: 16, blur: 0,
                                hud: false, waveform: false, leak: false, emphasis: false
                              },
                              cyberpunk: {
                                theme: 'cyber', font: 'mono', size: 'story', corners: 'sharp', border: 'glow',
                                bg: 'cyberGrid', casing: 'uppercase', chromatic: true, neonP: true, glow: 'high', fontSize: 15, blur: 30,
                                hud: true, waveform: true, leak: false, emphasis: true
                              },
                              hologram: {
                                theme: 'lavender', font: 'modern', size: 'widescreen', corners: 'pill', border: 'glow',
                                bg: 'iridescent', casing: 'lowercase', chromatic: true, neonP: true, glow: 'high', fontSize: 20, blur: 40,
                                hud: false, waveform: false, leak: true, emphasis: false
                              },
                              sunset: {
                                theme: 'sunset', font: 'modern', size: 'landscape', corners: 'rounded', border: 'thin',
                                bg: 'glass', casing: 'normal', chromatic: false, neonP: false, glow: 'low', fontSize: 18, blur: 15,
                                hud: false, waveform: false, leak: false, emphasis: false
                              }
                            };
                            const p = presets[presetName];
                            setCardTheme(p.theme as any);
                            setCardFont(p.font as any);
                            setCardSize(p.size as any);
                            setCardCornerRadius(p.corners as any);
                            setBorderStyle(p.border as any);
                            setCardBackgroundStyle(p.bg as any);
                            setCardTextCase(p.casing as any);
                            setChromaticAberration(p.chromatic);
                            setNeonPulse(p.neonP);
                            setGlowStrength(p.glow as any);
                            setCardFontSize(p.fontSize);
                            setCardBlurStrength(p.blur);
                            setHudOverlay(p.hud);
                            setWaveformOverlay(p.waveform);
                            setLightLeak(p.leak);
                            setSmartEmphasis(p.emphasis);
                          };
                          return (
                            <button
                              type="button"
                              key={pr}
                              onClick={() => applyPreset(pr)}
                              className="py-1.5 text-[9px] font-bold tracking-wider uppercase rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all font-mono cursor-pointer select-none text-center"
                            >
                              {labels[pr]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 1. Theme Selection */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Theme</span>
                      <div className="flex flex-wrap gap-2.5">
                        {(['noir', 'neon', 'aura', 'sunset', 'slate', 'cyber', 'forest', 'crimson', 'royal', 'lavender'] as const).map(th => {
                          const gradients = {
                            noir: 'from-[#070709] to-[#121215] border-[#fbbf24]/30',
                            neon: 'from-[#0a0415] to-[#16082a] border-[#c084fc]/30',
                            aura: 'from-[#020f12] to-[#051f24] border-[#2dd4bf]/30',
                            sunset: 'from-[#0f030a] to-[#250718] border-[#f43f5e]/30',
                            slate: 'from-[#18181b] to-[#27272a] border-white/20',
                            cyber: 'from-[#050510] to-[#140c2a] border-[#f59e0b]/30',
                            forest: 'from-[#021810] to-[#062e20] border-[#34d399]/30',
                            crimson: 'from-[#0f0202] to-[#28050e] border-[#f87171]/30',
                            royal: 'from-[#020212] to-[#09092d] border-[#60a5fa]/30',
                            lavender: 'from-[#080510] to-[#1d0c32] border-[#e879f9]/30'
                          };
                          const labelColors = {
                            noir: 'text-[#fbbf24]',
                            neon: 'text-[#c084fc]',
                            aura: 'text-[#2dd4bf]',
                            sunset: 'text-[#f43f5e]',
                            slate: 'text-white',
                            cyber: 'text-[#f59e0b]',
                            forest: 'text-[#34d399]',
                            crimson: 'text-[#f87171]',
                            royal: 'text-[#60a5fa]',
                            lavender: 'text-[#e879f9]'
                          };
                          const isActive = cardTheme === th;
                          return (
                            <button
                              type="button"
                              key={th}
                              onClick={() => setCardTheme(th)}
                              className={clsx(
                                "w-10 h-10 rounded-xl bg-gradient-to-br border-2 transition-all duration-300 relative flex items-center justify-center shrink-0 cursor-pointer shadow-md",
                                gradients[th],
                                isActive ? "scale-105 border-white/50 ring-2 ring-white/20 shadow-lg" : "opacity-55 hover:opacity-90 hover:scale-[1.04]"
                              )}
                              title={th.charAt(0).toUpperCase() + th.slice(1)}
                            >
                              <span className={clsx("text-[10px] font-mono font-black capitalize select-none", labelColors[th])}>
                                {th.charAt(0).toUpperCase()}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Choose Aspect Ratio */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Aspect Ratio</span>
                      <div className="grid grid-cols-4 gap-1.5 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['widescreen', 'square', 'story', 'landscape', 'portrait', 'ultrawide', 'classic'] as const).map(sz => {
                          const labels = { 
                            widescreen: '16:9', 
                            square: '1:1', 
                            story: '9:16',
                            landscape: '4:3',
                            portrait: '3:4',
                            ultrawide: '21:9',
                            classic: '5:4'
                          };
                          const isActive = cardSize === sz;
                          return (
                            <button
                              type="button"
                              key={sz}
                              onClick={() => setCardSize(sz)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[sz]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Choose Typography */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Typography</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['serif', 'mono', 'modern', 'display', 'handwriting', 'condensed'] as const).map(fn => {
                          const labels = { 
                            serif: 'Serif', 
                            mono: 'Mono', 
                            modern: 'Sans',
                            display: 'Display',
                            handwriting: 'Script',
                            condensed: 'Narrow'
                          };
                          const isActive = cardFont === fn;
                          return (
                            <button
                              type="button"
                              key={fn}
                              onClick={() => setCardFont(fn)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[fn]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Font Size Adjuster */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Text Size</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCardFontSize(prev => Math.max(10, prev - 1))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono text-neutral-200 font-bold flex-1 text-center bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5">{cardFontSize}px</span>
                        <button
                          type="button"
                          onClick={() => setCardFontSize(prev => Math.min(36, prev + 1))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 4b. Text Alignment */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Text Alignment</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['left', 'center', 'right'] as const).map(align => {
                          const isActive = cardTextAlign === align;
                          return (
                            <button
                              type="button"
                              key={align}
                              onClick={() => setCardTextAlign(align)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {align}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4c. Quote Style */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Quote Ornament</span>
                      <div className="grid grid-cols-4 gap-1.5 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['mark', 'line', 'bar', 'none'] as const).map(qst => {
                          const labels = { mark: 'Quotes', line: 'Line', bar: 'Bar', none: 'None' };
                          const isActive = cardQuoteStyle === qst;
                          return (
                            <button
                              type="button"
                              key={qst}
                              onClick={() => setCardQuoteStyle(qst)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[qst]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4d. Corner Radius */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Corner Radius</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['sharp', 'rounded', 'pill'] as const).map(cr => {
                          const labels = { sharp: 'Sharp', rounded: 'Rounded', pill: 'Pill' };
                          const isActive = cardCornerRadius === cr;
                          return (
                            <button
                              type="button"
                              key={cr}
                              onClick={() => setCardCornerRadius(cr)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[cr]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. Glow Strength */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Backlight Glow</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['off', 'low', 'high'] as const).map(gl => {
                          const isActive = glowStrength === gl;
                          return (
                            <button
                              type="button"
                              key={gl}
                              onClick={() => setGlowStrength(gl)}
                              className={clsx(
                                "py-2.5 text-xs font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {gl}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6. Border Style */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Border Style</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['thin', 'glow', 'none'] as const).map(bd => {
                          const isActive = borderStyle === bd;
                          return (
                            <button
                              type="button"
                              key={bd}
                              onClick={() => setBorderStyle(bd)}
                              className={clsx(
                                "py-2.5 text-xs font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {bd}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* New Customizer Option: Background Style */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Background Style</span>
                      <div className="grid grid-cols-5 gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['solid', 'gradient', 'glass', 'cyberGrid', 'iridescent'] as const).map(bg => {
                          const labels = { solid: 'Solid', gradient: 'Grad', glass: 'Glass', cyberGrid: 'Grid', iridescent: 'Holo' };
                          const isActive = cardBackgroundStyle === bg;
                          return (
                            <button
                              type="button"
                              key={bg}
                              onClick={() => setCardBackgroundStyle(bg)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[bg]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* New Customizer Option: Text Casing */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Text Case</span>
                      <div className="grid grid-cols-3 gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['normal', 'uppercase', 'lowercase'] as const).map(tcCase => {
                          const labels = { normal: 'Normal', uppercase: 'AA', lowercase: 'aa' };
                          const isActive = cardTextCase === tcCase;
                          return (
                            <button
                              type="button"
                              key={tcCase}
                              onClick={() => setCardTextCase(tcCase)}
                              className={clsx(
                                "py-2 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg transition-all cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {labels[tcCase]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 7. Export Format Selection */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Export Format</span>
                      <div className="grid grid-cols-4 gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {(['png', 'jpeg', 'pdf', 'svg'] as const).map(fmt => {
                          const labels = { png: 'PNG Image', jpeg: 'JPG Image', pdf: 'PDF Document', svg: 'Vector SVG' };
                          const isActive = cardFormat === fmt;
                          return (
                            <button
                              type="button"
                              key={fmt}
                              onClick={() => setCardFormat(fmt)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {fmt.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 8. Resolution Scale Selection */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Image Quality / Resolution</span>
                      <div className="grid grid-cols-6 gap-1 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
                        {([4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const).map(res => {
                          const isActive = resolutionScale === res;
                          return (
                            <button
                              type="button"
                              key={res}
                              onClick={() => setResolutionScale(res)}
                              className={clsx(
                                "py-2 text-[9px] font-bold tracking-wider uppercase rounded-lg transition-all font-mono cursor-pointer select-none text-center",
                                isActive ? "bg-white text-black shadow-md" : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                              )}
                            >
                              {res}x
                            </button>
                          );
                        })}
                      </div>
                      {resolutionScale > 20 && (
                        <p className="text-[9px] text-amber-500 font-mono font-bold leading-normal">
                          ⚠️ Warning: {resolutionScale}x resolution scale requires high system memory. Lower this if browser allocation fails.
                        </p>
                      )}
                    </div>

                    {/* 8a. Custom Watermark Input */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Watermark Label</span>
                      <input
                        type="text"
                        value={customWatermark}
                        onChange={e => setCustomWatermark(e.target.value)}
                        placeholder="VERLYN NETWORK"
                        className="w-full h-10 px-3 bg-white/[0.02] border border-white/[0.08] text-white rounded-xl text-xs font-mono tracking-wider focus:outline-none focus:border-white/20 transition-all placeholder-neutral-700"
                      />
                    </div>

                    {/* 8b. Vertical Line Spacing */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Vertical Spacing (Line Height)</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCardLineHeight(prev => parseFloat(Math.max(1.0, prev - 0.1).toFixed(1)))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono text-neutral-200 font-bold flex-1 text-center bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5">{cardLineHeight}x</span>
                        <button
                          type="button"
                          onClick={() => setCardLineHeight(prev => parseFloat(Math.min(2.5, prev + 0.1).toFixed(1)))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 8c. Letter Spacing */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Letter Spacing</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCardLetterSpacing(prev => Math.max(-2, prev - 1))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono text-neutral-200 font-bold flex-1 text-center bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5">{cardLetterSpacing}px</span>
                        <button
                          type="button"
                          onClick={() => setCardLetterSpacing(prev => Math.min(10, prev + 1))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 8d. Background Gradient Angle */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Gradient Angle</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setGradientRotation(prev => (prev - 15 + 360) % 360)}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          ⟲
                        </button>
                        <span className="text-sm font-mono text-neutral-200 font-bold flex-1 text-center bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5">{gradientRotation}°</span>
                        <button
                          type="button"
                          onClick={() => setGradientRotation(prev => (prev + 15) % 360)}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          ⟳
                        </button>
                      </div>
                    </div>

                    {/* 8e. Blur Strength */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Backdrop Blur Strength</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCardBlurStrength(prev => Math.max(0, prev - 5))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono text-neutral-200 font-bold flex-1 text-center bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5">{cardBlurStrength}px</span>
                        <button
                          type="button"
                          onClick={() => setCardBlurStrength(prev => Math.min(100, prev + 5))}
                          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.1] active:scale-95 transition-all text-base font-bold font-mono cursor-pointer flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 8f. Analog Film Grain toggle */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Film Grain</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Add analog noise overlay</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCardGrain(!cardGrain)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          cardGrain ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          cardGrain ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* 8g. Glass Refraction Glow toggle */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Glass Glow Reflection</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Render dynamic light reflection</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGlassRefraction(!glassRefraction)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          glassRefraction ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          glassRefraction ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Chromatic Aberration */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Chromatic Splitting</span>
                        <p className="text-[10px] text-neutral-600 font-medium">RGB chromatic aberration channels</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChromaticAberration(!chromaticAberration)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          chromaticAberration ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          chromaticAberration ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Neon Pulse Glow */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Neon Glow Pulse</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Intense glow on lines and borders</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNeonPulse(!neonPulse)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          neonPulse ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          neonPulse ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Tech HUD Overlay */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Tech HUD Overlay</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Cybernetic borders & active telemetry coordinates</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHudOverlay(!hudOverlay)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          hudOverlay ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          hudOverlay ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Waveform Visualizer */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Waveform Visualizer</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Dynamic audio signal graph visualization</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaveformOverlay(!waveformOverlay)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          waveformOverlay ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          waveformOverlay ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Light Leak Refraction */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Light Leak Refraction</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Vibrant rainbow prism refraction overlay</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightLeak(!lightLeak)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          lightLeak ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          lightLeak ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* New Switch: Smart Emphasis Highlight */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Emphasis Parser</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Highlight *text inside asterisks* with accent color</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmartEmphasis(!smartEmphasis)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          smartEmphasis ? "bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.35)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          smartEmphasis ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {/* 9. Branding switch toggle */}
                    <div className="flex items-center justify-between py-2.5 px-1 border-t border-b border-white/[0.05]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Show Branding</span>
                        <p className="text-[10px] text-neutral-600 font-medium">Add Verlyn watermark</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWatermark(!showWatermark)}
                        className={clsx(
                          "w-12 h-6 rounded-full p-0.5 transition-all duration-300 cursor-pointer outline-none shrink-0 relative",
                          showWatermark ? "bg-[#fbbf24] shadow-[0_0_14px_rgba(251,191,36,0.45)]" : "bg-neutral-800 border border-white/[0.08]"
                        )}
                      >
                        <div className={clsx(
                          "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                          showWatermark ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM ACTION PANEL: Primary Download / Copy Call to Action */}
                  <div className="pt-4 shrink-0 border-t border-white/[0.06] space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (resolutionScale > 24) {
                            setShowHighResWarning(true);
                          } else {
                            downloadCustomQuoteCard(
                              author,
                              content,
                              stream,
                              cardTheme,
                              cardSize,
                              cardFont,
                              showWatermark,
                              cardFontSize,
                              glowStrength,
                              borderStyle,
                              cardTextAlign,
                              cardQuoteStyle,
                              cardCornerRadius,
                              cardGrain,
                              glassRefraction,
                              cardFormat,
                              resolutionScale,
                              customWatermark,
                              cardLineHeight,
                              cardLetterSpacing,
                              gradientRotation,
                              cardBlurStrength,
                              cardBackgroundStyle,
                              cardTextCase,
                              chromaticAberration,
                              neonPulse,
                              hudOverlay,
                              waveformOverlay,
                              lightLeak,
                              smartEmphasis
                            );
                            window.dispatchEvent(new CustomEvent('verlyn:toast', {
                              detail: { message: `Quote card exported as ${cardFormat.toUpperCase()}!`, type: 'success' }
                            }));
                          }
                        }}
                        className="flex-1 h-12 bg-white text-black font-mono font-black tracking-widest uppercase text-xs rounded-xl hover:bg-neutral-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
                      >
                        <ArrowUpRight size={15} className="shrink-0" />
                        <span>Export</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          copyCustomQuoteCardToClipboard(
                            author,
                            content,
                            stream,
                            cardTheme,
                            cardSize,
                            cardFont,
                            showWatermark,
                            cardFontSize,
                            glowStrength,
                            borderStyle,
                            cardTextAlign,
                            cardQuoteStyle,
                            cardCornerRadius,
                            cardGrain,
                            glassRefraction,
                            customWatermark,
                            cardLineHeight,
                            cardLetterSpacing,
                            gradientRotation,
                            cardBlurStrength,
                            cardBackgroundStyle,
                            cardTextCase,
                            chromaticAberration,
                            neonPulse,
                            hudOverlay,
                            waveformOverlay,
                            lightLeak,
                            smartEmphasis
                          );
                        }}
                        className="flex-1 h-12 bg-white/[0.05] border border-white/[0.08] text-white font-mono font-bold tracking-widest uppercase text-xs rounded-xl hover:bg-white/[0.08] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
                      >
                        <span>Copy Image</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExportCardModal(null)}
                      className="w-full h-9 bg-transparent text-neutral-500 hover:text-neutral-200 font-mono font-bold tracking-widest uppercase text-[9px] rounded-xl transition-all flex items-center justify-center cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
              </motion.div>

              <AnimatePresence>
                {showHighResWarning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ backdropFilter: 'blur(16px)', background: 'rgba(0,0,0,0.85)' }}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="w-full max-w-md bg-[#0d0d0d] border border-red-500/20 rounded-2xl p-6 shadow-2xl space-y-4"
                    >
                      <h4 className="text-sm font-mono font-black text-red-500 tracking-widest uppercase flex items-center gap-2">
                        <AlertTriangle size={15} className="shrink-0" />
                        <span>Warning: Extreme Resolution Demand</span>
                      </h4>
                      <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                        You have requested a high-fidelity <strong className="text-white">{resolutionScale}x</strong> scale multiplier.
                        Rendering this canvas size requires significant memory allocation. This may cause browser tab instability, canvas buffer exhaustion, or downscaling by hardware limitations.
                      </p>
                      <p className="text-[10px] text-neutral-600 font-mono leading-normal italic">
                        *By proceeding, you acknowledge that we are not responsible for browser crashes, system freezes, or temporary instability.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHighResWarning(false);
                            downloadCustomQuoteCard(
                              author,
                              content,
                              stream,
                              cardTheme,
                              cardSize,
                              cardFont,
                              showWatermark,
                              cardFontSize,
                              glowStrength,
                              borderStyle,
                              cardTextAlign,
                              cardQuoteStyle,
                              cardCornerRadius,
                              cardGrain,
                              glassRefraction,
                              cardFormat,
                              resolutionScale,
                              customWatermark,
                              cardLineHeight,
                              cardLetterSpacing,
                              gradientRotation,
                              cardBlurStrength,
                              cardBackgroundStyle,
                              cardTextCase,
                              chromaticAberration,
                              neonPulse,
                              hudOverlay,
                              waveformOverlay,
                              lightLeak,
                              smartEmphasis
                            );
                            window.dispatchEvent(new CustomEvent('verlyn:toast', {
                              detail: { message: `Initializing render at ${resolutionScale}x...`, type: 'success' }
                            }));
                          }}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer text-center"
                        >
                          Proceed Render
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowHighResWarning(false)}
                          className="flex-1 py-2.5 bg-neutral-900 border border-white/[0.08] hover:bg-white/[0.04] text-neutral-400 font-mono font-bold uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer text-center"
                        >
                          Adjust Quality
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
