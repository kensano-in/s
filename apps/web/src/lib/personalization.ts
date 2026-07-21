/**
 * Visual Personalization 2.0 - S+ Tier Theme and Personalization Engine
 * Contains definitions for premium themes, accessibility filters, typography and geometry.
 */

export interface VisualConfigV2 {
  themeId: string;
  accentColor: string;
  secondaryColor: string;
  isGradientAccent: boolean;
  gradientAngle: number;
  
  // Glass density
  glassOpacity: number;
  glassBlur: number;
  glassNoise: number;
  glassReflection: number;
  glassBorderBrightness: number;
  glassGlowStrength: number;
  glassDepth: number;
  
  // Corner geometry
  cornerProfile: 'rounded' | 'apple' | 'discord' | 'windows11' | 'sharp' | 'developer' | 'ultra_rounded' | 'custom';
  cornerCustomRadius: number;
  
  // Background modes
  bgMode: 'static' | 'gradient' | 'animated-gradient' | 'mesh-gradient' | 'aurora' | 'noise' | 'particles' | 'constellation' | 'nebula' | 'abstract-waves' | 'liquid' | 'glass';
  bgCustomColors: string[];
  
  // Typography
  fontScale: 'small' | 'default' | 'large' | 'extra_large' | 'reading' | 'developer';
  fontLetterSpacing: 'tight' | 'normal' | 'wide';
  fontLineHeight: 'snug' | 'normal' | 'loose';
  fontWeightScale: 'light' | 'normal' | 'medium' | 'bold';
  fontRounded: boolean;
  fontFamilyStyle: 'sans' | 'serif' | 'mono' | 'dyslexic';
  
  // Animation profiles
  animationProfile: 'none' | 'minimal' | 'balanced' | 'expressive' | 'luxury' | 'gaming' | 'performance' | 'accessibility';
  
  // Accessibility
  accessibilityHighContrast: boolean;
  accessibilityMotionReduce: boolean;
  accessibilityReducedTransparency: boolean;
  accessibilityColorBlind: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  accessibilityLargeClickTargets: boolean;
  
  // Sync
  syncPreference: 'cross-device' | 'local-only' | 'mobile-desktop-independent';
}

export interface PremiumTheme {
  id: string;
  name: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  foreground: string;
  foregroundMuted: string;
  primary: string;
  secondary: string;
  border: string;
  glow: string;
  glassOpacity: number;
  glassBlur: number;
  bgMode: VisualConfigV2['bgMode'];
}

export const PREMIUM_THEMES: PremiumTheme[] = [
  {
    id: 'violet-nebula',
    name: 'Violet Nebula',
    background: '#0B001A',
    surface: '#120224',
    surfaceElevated: '#1A0332',
    foreground: '#F1E8FF',
    foregroundMuted: '#A68EC6',
    primary: '#A855F7',
    secondary: '#EC4899',
    border: '#311059',
    glow: 'rgba(168, 85, 247, 0.4)',
    glassOpacity: 0.15,
    glassBlur: 24,
    bgMode: 'nebula'
  },
  {
    id: 'crimson-eclipse',
    name: 'Crimson Eclipse',
    background: '#0F0202',
    surface: '#1A0505',
    surfaceElevated: '#280808',
    foreground: '#FFEBEB',
    foregroundMuted: '#C58E8E',
    primary: '#EF4444',
    secondary: '#F97316',
    border: '#3F0E0E',
    glow: 'rgba(239, 68, 68, 0.4)',
    glassOpacity: 0.2,
    glassBlur: 20,
    bgMode: 'aurora'
  },
  {
    id: 'cyan-ocean',
    name: 'Cyan Ocean',
    background: '#020B14',
    surface: '#041524',
    surfaceElevated: '#072138',
    foreground: '#E6F4FF',
    foregroundMuted: '#8EB0C5',
    primary: '#06B6D4',
    secondary: '#3B82F6',
    border: '#0C2D4D',
    glow: 'rgba(6, 182, 212, 0.4)',
    glassOpacity: 0.25,
    glassBlur: 32,
    bgMode: 'liquid'
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    background: '#020F0C',
    surface: '#041C16',
    surfaceElevated: '#072B22',
    foreground: '#E6FFFA',
    foregroundMuted: '#8EC5B6',
    primary: '#10B981',
    secondary: '#14B8A6',
    border: '#0C3E31',
    glow: 'rgba(16, 185, 129, 0.4)',
    glassOpacity: 0.18,
    glassBlur: 28,
    bgMode: 'abstract-waves'
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    background: '#020617',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    foreground: '#F8FAFC',
    foregroundMuted: '#94A3B8',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    border: '#1E293B',
    glow: 'rgba(59, 130, 246, 0.35)',
    glassOpacity: 0.3,
    glassBlur: 30,
    bgMode: 'constellation'
  },
  {
    id: 'gold-titanium',
    name: 'Gold Titanium',
    background: '#0A0A0A',
    surface: '#171717',
    surfaceElevated: '#262626',
    foreground: '#FAFAFA',
    foregroundMuted: '#A3A3A3',
    primary: '#F59E0B',
    secondary: '#D97706',
    border: '#2E2E2E',
    glow: 'rgba(245, 158, 11, 0.3)',
    glassOpacity: 0.12,
    glassBlur: 40,
    bgMode: 'mesh-gradient'
  },
  {
    id: 'sakura-pink',
    name: 'Sakura Pink',
    background: '#1F0B13',
    surface: '#2D0F1C',
    surfaceElevated: '#3F1527',
    foreground: '#FFF0F6',
    foregroundMuted: '#C58EA6',
    primary: '#EC4899',
    secondary: '#F472B6',
    border: '#4F1A32',
    glow: 'rgba(236, 72, 153, 0.4)',
    glassOpacity: 0.15,
    glassBlur: 20,
    bgMode: 'particles'
  },
  {
    id: 'arctic-white',
    name: 'Arctic White',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    foreground: '#0F172A',
    foregroundMuted: '#475569',
    primary: '#3B82F6',
    secondary: '#06B6D4',
    border: '#E2E8F0',
    glow: 'rgba(59, 130, 246, 0.2)',
    glassOpacity: 0.4,
    glassBlur: 32,
    bgMode: 'glass'
  },
  {
    id: 'obsidian-red',
    name: 'Obsidian Red',
    background: '#050505',
    surface: '#121212',
    surfaceElevated: '#1C1C1C',
    foreground: '#F5F5F5',
    foregroundMuted: '#737373',
    primary: '#EF4444',
    secondary: '#B91C1C',
    border: '#262626',
    glow: 'rgba(239, 68, 68, 0.2)',
    glassOpacity: 0.1,
    glassBlur: 48,
    bgMode: 'static'
  },
  {
    id: 'mantis-green',
    name: 'Mantis Green',
    background: '#0B0F0B',
    surface: '#141C14',
    surfaceElevated: '#1D2B1D',
    foreground: '#EBF5EB',
    foregroundMuted: '#8EC58E',
    primary: '#84CC16',
    secondary: '#22C55E',
    border: '#233723',
    glow: 'rgba(132, 204, 22, 0.4)',
    glassOpacity: 0.2,
    glassBlur: 24,
    bgMode: 'particles'
  }
];

export const DEFAULT_CONFIG: VisualConfigV2 = {
  themeId: 'midnight-blue',
  accentColor: '#3B82F6',
  secondaryColor: '#60A5FA',
  isGradientAccent: false,
  gradientAngle: 135,
  glassOpacity: 0.3,
  glassBlur: 30,
  glassNoise: 0.05,
  glassReflection: 0.15,
  glassBorderBrightness: 0.04,
  glassGlowStrength: 0,
  glassDepth: 2,
  cornerProfile: 'apple',
  cornerCustomRadius: 12,
  bgMode: 'constellation',
  bgCustomColors: ['#020617', '#0F172A'],
  fontScale: 'default',
  fontLetterSpacing: 'normal',
  fontLineHeight: 'normal',
  fontWeightScale: 'normal',
  fontRounded: false,
  fontFamilyStyle: 'sans',
  animationProfile: 'balanced',
  accessibilityHighContrast: false,
  accessibilityMotionReduce: false,
  accessibilityReducedTransparency: false,
  accessibilityColorBlind: 'none',
  accessibilityLargeClickTargets: false,
  syncPreference: 'cross-device'
};

// Color translation helpers
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hexToTailwindHsl(hex: string): string {
  try {
    const { h, s, l } = hexToHsl(hex);
    return `${h} ${s}% ${l}%`;
  } catch (e) {
    return '0 0% 0%';
  }
}

/**
 * Apply the S+ Personalization Config V2 directly to document.documentElement
 */
export function applyVisualConfigV2(config: Partial<VisualConfigV2>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Merge default config with requested config
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // 1. Theme and Core Palette Colors
  const matchedTheme = PREMIUM_THEMES.find(t => t.id === fullConfig.themeId);
  const primaryAccent = fullConfig.accentColor || matchedTheme?.primary || '#3B82F6';
  const secondaryAccent = fullConfig.secondaryColor || matchedTheme?.secondary || '#60A5FA';

  // Apply accent vars
  root.style.setProperty('--v-accent', primaryAccent);
  root.style.setProperty('--v-accent-secondary', secondaryAccent);
  root.style.setProperty('--v-accent-hsl', hexToTailwindHsl(primaryAccent));
  root.style.setProperty('--primary', hexToTailwindHsl(primaryAccent));

  // Determine base palette
  let bg = '#020617';
  let surface = '#0F172A';
  let surfaceElevated = '#1E293B';
  let border = '#1E293B';
  let foreground = '#F8FAFC';
  let foregroundMuted = '#94A3B8';

  if (matchedTheme) {
    bg = matchedTheme.background;
    surface = matchedTheme.surface;
    surfaceElevated = matchedTheme.surfaceElevated;
    border = matchedTheme.border;
    foreground = matchedTheme.foreground;
    foregroundMuted = matchedTheme.foregroundMuted;
  }

  // Override with custom colors if dynamic meshes/gradients are active
  if (fullConfig.bgMode === 'gradient' || fullConfig.bgMode === 'animated-gradient') {
    if (fullConfig.bgCustomColors && fullConfig.bgCustomColors.length > 0) {
      bg = fullConfig.bgCustomColors[0];
    }
  }

  // Handle AMOLED 2.0 true black override
  const isAmoled = root.classList.contains('amoled-mode');
  if (isAmoled && fullConfig.themeId !== 'arctic-white') {
    bg = '#000000';
    surface = '#000000';
    surfaceElevated = '#08080C';
    border = '#0C0C0C';
  }

  // Apply custom CSS properties for palette
  root.style.setProperty('--v-background-hex', bg);
  root.style.setProperty('--v-background-hsl', hexToTailwindHsl(bg));
  root.style.setProperty('--v-surface', surface);
  root.style.setProperty('--v-surface-hex', surface);
  root.style.setProperty('--v-surface-hsl', hexToTailwindHsl(surface));
  root.style.setProperty('--v-surface-elevated', surfaceElevated);
  root.style.setProperty('--v-surface-elevated-hex', surfaceElevated);
  root.style.setProperty('--v-surface-elevated-hsl', hexToTailwindHsl(surfaceElevated));
  root.style.setProperty('--v-border-hex', border);
  root.style.setProperty('--v-border-hsl', hexToTailwindHsl(border));
  root.style.setProperty('--v-foreground-hex', foreground);
  root.style.setProperty('--v-foreground-hsl', hexToTailwindHsl(foreground));
  root.style.setProperty('--v-foreground-muted-hex', foregroundMuted);
  root.style.setProperty('--v-foreground-muted-hsl', hexToTailwindHsl(foregroundMuted));

  // Also apply standard tailwind tokens
  root.style.setProperty('--background', hexToTailwindHsl(bg));
  root.style.setProperty('--foreground', hexToTailwindHsl(foreground));
  root.style.setProperty('--card', hexToTailwindHsl(surface));
  root.style.setProperty('--border', hexToTailwindHsl(border));
  root.style.setProperty('--muted', hexToTailwindHsl(surfaceElevated));
  root.style.setProperty('--muted-foreground', hexToTailwindHsl(foregroundMuted));

  // 2. Premium Glass Design Variables
  const opacity = fullConfig.glassOpacity;
  const blurVal = fullConfig.glassBlur;
  const reflectionVal = fullConfig.glassReflection;
  const borderBr = fullConfig.glassBorderBrightness;
  const glowStr = fullConfig.glassGlowStrength;
  const depthLevel = fullConfig.glassDepth;

  const rgbBg = hexToRgbValues(surface);
  root.style.setProperty('--v-glass-bg', `rgba(${rgbBg}, ${opacity})`);
  root.style.setProperty('--v-glass-blur', `blur(${blurVal}px) saturate(180%)`);
  root.style.setProperty('--v-glass-border', `1px solid rgba(255, 255, 255, ${borderBr})`);
  root.style.setProperty('--v-glass-shadow', `0 ${depthLevel * 8}px ${depthLevel * 16}px rgba(0, 0, 0, ${0.3 + depthLevel * 0.1})`);
  if (glowStr > 0) {
    root.style.setProperty('--v-glass-glow', `0 0 ${glowStr}px ${primaryAccent}`);
  } else {
    root.style.setProperty('--v-glass-glow', '0 0 0px transparent');
  }

  // 3. Corner Geometry
  let rSm = '4px', rMd = '8px', rLg = '12px', rXl = '16px';
  switch (fullConfig.cornerProfile) {
    case 'sharp':
      rSm = '0px'; rMd = '0px'; rLg = '0px'; rXl = '0px';
      break;
    case 'developer':
      rSm = '2px'; rMd = '4px'; rLg = '6px'; rXl = '10px';
      break;
    case 'apple':
      rSm = '6px'; rMd = '10px'; rLg = '14px'; rXl = '20px';
      break;
    case 'discord':
      rSm = '4px'; rMd = '8px'; rLg = '12px'; rXl = '16px';
      break;
    case 'windows11':
      rSm = '4px'; rMd = '7px'; rLg = '11px'; rXl = '15px';
      break;
    case 'ultra_rounded':
      rSm = '12px'; rMd = '20px'; rLg = '28px'; rXl = '36px';
      break;
    case 'custom':
      const customRad = fullConfig.cornerCustomRadius;
      rSm = `${Math.max(2, Math.round(customRad * 0.3))}px`;
      rMd = `${Math.max(4, Math.round(customRad * 0.6))}px`;
      rLg = `${customRad}px`;
      rXl = `${Math.round(customRad * 1.5)}px`;
      break;
    case 'rounded':
    default:
      rSm = '4px'; rMd = '8px'; rLg = '12px'; rXl = '16px';
      break;
  }
  root.style.setProperty('--v-radius-sm', rSm);
  root.style.setProperty('--v-radius-md', rMd);
  root.style.setProperty('--v-radius-lg', rLg);
  root.style.setProperty('--v-radius-xl', rXl);

  // 4. Advanced Typography
  let fontSize = '16px';
  switch (fullConfig.fontScale) {
    case 'small': fontSize = '14px'; break;
    case 'large': fontSize = '17.5px'; break;
    case 'extra_large': fontSize = '19px'; break;
    case 'reading': fontSize = '18px'; break;
    case 'developer': fontSize = '13.5px'; break;
    case 'default':
    default:
      fontSize = '16px';
      break;
  }
  root.style.fontSize = fontSize;

  // Font style families
  let fontMain = "'Plus Jakarta Sans', sans-serif";
  let fontSans = "'Inter', sans-serif";
  if (fullConfig.fontFamilyStyle === 'serif') {
    fontMain = "'Georgia', serif";
    fontSans = "'Georgia', serif";
  } else if (fullConfig.fontFamilyStyle === 'mono' || fullConfig.fontScale === 'developer') {
    fontMain = "'Courier New', Courier, monospace";
    fontSans = "'Courier New', Courier, monospace";
  } else if (fullConfig.fontFamilyStyle === 'dyslexic') {
    // Dyslexic-friendly sans fallback or direct styled
    fontMain = "Comic Sans MS, cursive, sans-serif";
    fontSans = "Comic Sans MS, cursive, sans-serif";
  }
  root.style.setProperty('--v-font-main', fontMain);
  root.style.setProperty('--v-font-sans', fontSans);

  // Rounded text class toggling
  if (fullConfig.fontRounded) {
    root.style.setProperty('--font-main', "var(--v-font-main)");
    root.style.setProperty('--font-sans', "var(--v-font-sans)");
  }

  // Spacing & Weights
  let letterSp = 'normal';
  if (fullConfig.fontLetterSpacing === 'tight') letterSp = '-0.025em';
  else if (fullConfig.fontLetterSpacing === 'wide') letterSp = '0.05em';
  root.style.setProperty('--v-letter-spacing', letterSp);

  let lineH = '1.5';
  if (fullConfig.fontLineHeight === 'snug') lineH = '1.25';
  else if (fullConfig.fontLineHeight === 'loose') lineH = '1.85';
  root.style.setProperty('--v-line-height', lineH);

  let fontWScale = '1';
  if (fullConfig.fontWeightScale === 'light') fontWScale = '0.85';
  else if (fullConfig.fontWeightScale === 'medium') fontWScale = '1.1';
  else if (fullConfig.fontWeightScale === 'bold') fontWScale = '1.25';
  root.style.setProperty('--v-font-weight-scale', fontWScale);

  // 5. Animation Profiles
  let durationMultiplier = '1';
  switch (fullConfig.animationProfile) {
    case 'none':
      durationMultiplier = '0';
      root.classList.add('no-animations');
      break;
    case 'minimal':
      durationMultiplier = '0.4';
      root.classList.remove('no-animations');
      break;
    case 'performance':
      durationMultiplier = '0.3';
      root.classList.remove('no-animations');
      break;
    case 'balanced':
      durationMultiplier = '0.75';
      root.classList.remove('no-animations');
      break;
    case 'expressive':
      durationMultiplier = '1.1';
      root.classList.remove('no-animations');
      break;
    case 'luxury':
      durationMultiplier = '1.6';
      root.classList.remove('no-animations');
      break;
    case 'gaming':
      durationMultiplier = '0.9';
      root.classList.remove('no-animations');
      break;
    case 'accessibility':
      durationMultiplier = '0';
      root.classList.add('no-animations');
      break;
  }
  root.style.setProperty('--v-animation-duration-multiplier', durationMultiplier);

  // Accessibility modes
  if (fullConfig.accessibilityHighContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  if (fullConfig.accessibilityMotionReduce) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // 6. Color Blind Modes (SVG/CSS Matrix Filter)
  applyColorBlindFilter(fullConfig.accessibilityColorBlind);
}

function hexToRgbValues(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyColorBlindFilter(mode: VisualConfigV2['accessibilityColorBlind']) {
  if (typeof document === 'undefined') return;
  const id = 'verlyn-cb-svg-filter';
  let el = document.getElementById(id);
  if (el) el.remove();

  if (mode === 'none') {
    document.documentElement.style.filter = '';
    return;
  }

  let values = '';
  switch (mode) {
    case 'protanopia':
      values = '0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0';
      break;
    case 'deuteranopia':
      values = '0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0';
      break;
    case 'tritanopia':
      values = '0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0';
      break;
    case 'achromatopsia':
      values = '0.299, 0.587, 0.114, 0, 0  0.299, 0.587, 0.114, 0, 0  0.299, 0.587, 0.114, 0, 0  0, 0, 0, 1, 0';
      break;
  }

  const svg = `
    <svg id="${id}" style="display:none" xmlns="http://www.w3.org/2000/svg">
      <filter id="verlyn-cb-filter">
        <feColorMatrix type="matrix" values="${values}"/>
      </filter>
    </svg>
  `;
  document.body.insertAdjacentHTML('beforeend', svg);
  document.documentElement.style.filter = 'url(#verlyn-cb-filter)';
}
