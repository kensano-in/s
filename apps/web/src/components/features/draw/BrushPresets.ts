// BrushPresets.ts — Professional Drawing Engine
// 37 brush presets with full parameter definitions

export type BrushAlgorithm =
  | 'stamp'      // Discrete stamp placement (pencil, marker, pixel)
  | 'flow'       // Continuous flow (airbrush, soft brush)
  | 'wet'        // Wet media simulation (watercolor, oil, smudge)
  | 'special';   // FX brushes (neon, fire, glitter, etc.)

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type BrushCategory =
  | 'Basic'
  | 'Sketch'
  | 'Painting'
  | 'Calligraphy'
  | 'Graffiti'
  | 'Illustration'
  | 'Pixel Art'
  | 'Neon'
  | 'Texture'
  | 'FX'
  | 'Anime'
  | 'Comic'
  | 'Professional'
  | 'Favorite'
  | 'Recent'
  | 'Downloaded';

export interface BrushSettings {
  size: number;          // 1–500 px
  opacity: number;       // 0–100
  hardness: number;      // 0–100 (edge sharpness)
  softness: number;      // 0–100 (feather/blur)
  flow: number;          // 0–100 (ink flow rate)
  spacing: number;       // 0–500 (% of brush size between stamps)
  pressure: number;      // 0–100 (pressure sensitivity strength)
  smoothing: number;     // 0–100 (stroke smoothing)
  stabilization: number; // 0–100 (Lazy Nezumi-style stabilizer)
  jitter: number;        // 0–100 (random position offset)
  angle: number;         // 0–360 degrees
  roundness: number;     // 0–100 (circle → line)
  fade: number;          // 0–100 (stroke fade at end)
  scatter: number;       // 0–100 (multi-stamp scatter)
  wetness: number;       // 0–100 (for wet media)
  colorMixing: number;   // 0–100 (bleed/mix with underlying)
  blendMode: BlendMode;
  edgeFeather: number;   // 0–100
  rotation: number;      // 0–360 (auto-rotate with stroke direction)
  textureStrength: number; // 0–100
}

export interface BrushPreset {
  id: string;
  name: string;
  category: BrushCategory;
  emoji: string;         // Icon character for UI
  algorithm: BrushAlgorithm;
  defaults: BrushSettings;
  // Special rendering hints
  glowRadius?: number;       // For neon/glow brushes
  particleCount?: number;    // For scatter/glitter
  noiseFrequency?: number;   // For noise/chalk/charcoal
  wetEdges?: boolean;        // Watercolor wet edge simulation
  smudgeStrength?: number;   // For smudge/blend
  eraser?: boolean;          // If true, clears pixels
}

const BASE: BrushSettings = {
  size: 20,
  opacity: 100,
  hardness: 100,
  softness: 0,
  flow: 100,
  spacing: 5,
  pressure: 80,
  smoothing: 50,
  stabilization: 30,
  jitter: 0,
  angle: 0,
  roundness: 100,
  fade: 0,
  scatter: 0,
  wetness: 0,
  colorMixing: 0,
  blendMode: 'source-over',
  edgeFeather: 0,
  rotation: 0,
  textureStrength: 0,
};

export const BRUSH_PRESETS: BrushPreset[] = [
  // ─── BASIC ───────────────────────────────────────────────────────────────────
  {
    id: 'pencil',
    name: 'Pencil',
    category: 'Basic',
    emoji: '✏️',
    algorithm: 'stamp',
    noiseFrequency: 0.4,
    defaults: {
      ...BASE,
      size: 6,
      opacity: 90,
      hardness: 75,
      softness: 25,
      flow: 70,
      spacing: 2,
      pressure: 90,
      smoothing: 40,
      jitter: 3,
      roundness: 95,
      textureStrength: 40,
    },
  },
  {
    id: 'pen',
    name: 'Pen',
    category: 'Basic',
    emoji: '🖊️',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 4,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 1,
      pressure: 70,
      smoothing: 60,
      jitter: 0,
      roundness: 100,
    },
  },
  {
    id: 'brush',
    name: 'Brush',
    category: 'Basic',
    emoji: '🖌️',
    algorithm: 'flow',
    defaults: {
      ...BASE,
      size: 30,
      opacity: 85,
      hardness: 50,
      softness: 50,
      flow: 80,
      spacing: 3,
      pressure: 85,
      smoothing: 65,
      roundness: 80,
    },
  },
  {
    id: 'marker',
    name: 'Marker',
    category: 'Basic',
    emoji: '🖍️',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 24,
      opacity: 85,
      hardness: 95,
      softness: 5,
      flow: 100,
      spacing: 2,
      pressure: 50,
      smoothing: 70,
      roundness: 90,
      blendMode: 'multiply',
    },
  },
  {
    id: 'eraser',
    name: 'Eraser',
    category: 'Basic',
    emoji: '🧹',
    algorithm: 'stamp',
    eraser: true,
    defaults: {
      ...BASE,
      size: 30,
      opacity: 100,
      hardness: 85,
      softness: 15,
      flow: 100,
      spacing: 2,
      pressure: 80,
      smoothing: 40,
    },
  },
  {
    id: 'magic-eraser',
    name: 'Magic Eraser',
    category: 'Basic',
    emoji: '✨',
    algorithm: 'special',
    eraser: true,
    defaults: {
      ...BASE,
      size: 40,
      opacity: 100,
      hardness: 50,
      softness: 50,
      flow: 100,
      spacing: 5,
      pressure: 60,
      smoothing: 80,
    },
  },

  // ─── SKETCH ──────────────────────────────────────────────────────────────────
  {
    id: 'fountain-pen',
    name: 'Fountain Pen',
    category: 'Sketch',
    emoji: '✒️',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 5,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 1,
      pressure: 95,
      smoothing: 55,
      jitter: 0,
    },
  },
  {
    id: 'ink-pen',
    name: 'Ink Pen',
    category: 'Sketch',
    emoji: '🔏',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 3,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 95,
      spacing: 1,
      pressure: 85,
      smoothing: 50,
      jitter: 1,
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    category: 'Sketch',
    emoji: '🫙',
    algorithm: 'stamp',
    noiseFrequency: 0.6,
    defaults: {
      ...BASE,
      size: 35,
      opacity: 70,
      hardness: 60,
      softness: 40,
      flow: 60,
      spacing: 3,
      pressure: 85,
      smoothing: 35,
      jitter: 5,
      scatter: 10,
      textureStrength: 70,
      blendMode: 'multiply',
    },
  },
  {
    id: 'chalk',
    name: 'Chalk',
    category: 'Sketch',
    emoji: '🖊️',
    algorithm: 'stamp',
    noiseFrequency: 0.5,
    defaults: {
      ...BASE,
      size: 28,
      opacity: 75,
      hardness: 65,
      softness: 35,
      flow: 65,
      spacing: 4,
      pressure: 80,
      smoothing: 30,
      jitter: 6,
      textureStrength: 65,
    },
  },
  {
    id: 'crayon',
    name: 'Crayon',
    category: 'Sketch',
    emoji: '🖍️',
    algorithm: 'stamp',
    noiseFrequency: 0.45,
    defaults: {
      ...BASE,
      size: 22,
      opacity: 80,
      hardness: 70,
      softness: 30,
      flow: 75,
      spacing: 3,
      pressure: 75,
      smoothing: 40,
      jitter: 4,
      textureStrength: 55,
    },
  },

  // ─── PAINTING ────────────────────────────────────────────────────────────────
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'Painting',
    emoji: '💧',
    algorithm: 'wet',
    wetEdges: true,
    defaults: {
      ...BASE,
      size: 45,
      opacity: 55,
      hardness: 20,
      softness: 80,
      flow: 50,
      spacing: 2,
      pressure: 80,
      smoothing: 70,
      wetness: 75,
      colorMixing: 60,
      edgeFeather: 70,
      blendMode: 'multiply',
    },
  },
  {
    id: 'oil-brush',
    name: 'Oil Brush',
    category: 'Painting',
    emoji: '🎨',
    algorithm: 'wet',
    defaults: {
      ...BASE,
      size: 40,
      opacity: 90,
      hardness: 55,
      softness: 45,
      flow: 80,
      spacing: 3,
      pressure: 85,
      smoothing: 55,
      wetness: 60,
      colorMixing: 45,
      textureStrength: 30,
    },
  },
  {
    id: 'acrylic-brush',
    name: 'Acrylic Brush',
    category: 'Painting',
    emoji: '🖌️',
    algorithm: 'wet',
    defaults: {
      ...BASE,
      size: 35,
      opacity: 95,
      hardness: 70,
      softness: 30,
      flow: 90,
      spacing: 2,
      pressure: 80,
      smoothing: 50,
      wetness: 35,
      colorMixing: 30,
      textureStrength: 20,
    },
  },
  {
    id: 'pastel',
    name: 'Pastel',
    category: 'Painting',
    emoji: '🎨',
    algorithm: 'stamp',
    noiseFrequency: 0.35,
    defaults: {
      ...BASE,
      size: 30,
      opacity: 70,
      hardness: 50,
      softness: 50,
      flow: 70,
      spacing: 4,
      pressure: 75,
      smoothing: 45,
      jitter: 3,
      scatter: 8,
      textureStrength: 45,
      blendMode: 'soft-light',
    },
  },
  {
    id: 'soft-brush',
    name: 'Soft Brush',
    category: 'Painting',
    emoji: '☁️',
    algorithm: 'flow',
    defaults: {
      ...BASE,
      size: 60,
      opacity: 50,
      hardness: 0,
      softness: 100,
      flow: 40,
      spacing: 1,
      pressure: 70,
      smoothing: 80,
      edgeFeather: 90,
    },
  },
  {
    id: 'hard-brush',
    name: 'Hard Brush',
    category: 'Painting',
    emoji: '🔲',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 25,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 2,
      pressure: 75,
      smoothing: 50,
    },
  },

  // ─── CALLIGRAPHY ─────────────────────────────────────────────────────────────
  {
    id: 'calligraphy-pen',
    name: 'Calligraphy Pen',
    category: 'Calligraphy',
    emoji: '🪶',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 18,
      opacity: 100,
      hardness: 90,
      softness: 10,
      flow: 90,
      spacing: 1,
      pressure: 95,
      smoothing: 60,
      angle: 45,
      roundness: 20,  // Flat nib
    },
  },
  {
    id: 'highlighter',
    name: 'Highlighter',
    category: 'Calligraphy',
    emoji: '🖊️',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 30,
      opacity: 60,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 1,
      pressure: 30,
      smoothing: 80,
      roundness: 30,  // Flat shape
      blendMode: 'multiply',
    },
  },

  // ─── GRAFFITI ────────────────────────────────────────────────────────────────
  {
    id: 'airbrush',
    name: 'Airbrush',
    category: 'Graffiti',
    emoji: '💨',
    algorithm: 'flow',
    defaults: {
      ...BASE,
      size: 70,
      opacity: 60,
      hardness: 0,
      softness: 100,
      flow: 30,
      spacing: 1,
      pressure: 75,
      smoothing: 70,
      jitter: 8,
      scatter: 15,
      edgeFeather: 95,
    },
  },
  {
    id: 'spray-paint',
    name: 'Spray Paint',
    category: 'Graffiti',
    emoji: '🎨',
    algorithm: 'special',
    particleCount: 80,
    defaults: {
      ...BASE,
      size: 80,
      opacity: 70,
      hardness: 0,
      softness: 100,
      flow: 50,
      spacing: 1,
      pressure: 60,
      smoothing: 40,
      jitter: 25,
      scatter: 50,
      edgeFeather: 80,
    },
  },

  // ─── ILLUSTRATION ─────────────────────────────────────────────────────────────
  {
    id: 'smudge-brush',
    name: 'Smudge Brush',
    category: 'Illustration',
    emoji: '👆',
    algorithm: 'wet',
    smudgeStrength: 0.85,
    defaults: {
      ...BASE,
      size: 35,
      opacity: 80,
      hardness: 30,
      softness: 70,
      flow: 70,
      spacing: 1,
      pressure: 70,
      smoothing: 60,
      wetness: 90,
      colorMixing: 80,
    },
  },
  {
    id: 'blend-brush',
    name: 'Blend Brush',
    category: 'Illustration',
    emoji: '🌫️',
    algorithm: 'wet',
    smudgeStrength: 0.6,
    defaults: {
      ...BASE,
      size: 40,
      opacity: 70,
      hardness: 10,
      softness: 90,
      flow: 60,
      spacing: 1,
      pressure: 65,
      smoothing: 75,
      wetness: 70,
      colorMixing: 55,
    },
  },
  {
    id: 'blur-brush',
    name: 'Blur Brush',
    category: 'Illustration',
    emoji: '💭',
    algorithm: 'special',
    defaults: {
      ...BASE,
      size: 50,
      opacity: 60,
      hardness: 0,
      softness: 100,
      flow: 50,
      spacing: 1,
      pressure: 60,
      smoothing: 80,
      edgeFeather: 100,
    },
  },

  // ─── PIXEL ART ───────────────────────────────────────────────────────────────
  {
    id: 'pixel-brush',
    name: 'Pixel Brush',
    category: 'Pixel Art',
    emoji: '🟦',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 8,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 100,  // pixel-by-pixel
      pressure: 0,   // no pressure sensitivity
      smoothing: 0,
      jitter: 0,
    },
  },

  // ─── NEON ─────────────────────────────────────────────────────────────────────
  {
    id: 'neon-brush',
    name: 'Neon Brush',
    category: 'Neon',
    emoji: '⚡',
    algorithm: 'special',
    glowRadius: 12,
    defaults: {
      ...BASE,
      size: 8,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 1,
      pressure: 50,
      smoothing: 70,
      blendMode: 'screen',
    },
  },
  {
    id: 'glow-brush',
    name: 'Glow Brush',
    category: 'Neon',
    emoji: '✨',
    algorithm: 'special',
    glowRadius: 20,
    defaults: {
      ...BASE,
      size: 20,
      opacity: 80,
      hardness: 50,
      softness: 50,
      flow: 70,
      spacing: 1,
      pressure: 60,
      smoothing: 70,
      edgeFeather: 60,
      blendMode: 'screen',
    },
  },
  {
    id: 'light-brush',
    name: 'Light Brush',
    category: 'Neon',
    emoji: '💡',
    algorithm: 'special',
    glowRadius: 25,
    defaults: {
      ...BASE,
      size: 50,
      opacity: 50,
      hardness: 0,
      softness: 100,
      flow: 30,
      spacing: 1,
      pressure: 60,
      smoothing: 80,
      edgeFeather: 100,
      blendMode: 'screen',
    },
  },

  // ─── TEXTURE ──────────────────────────────────────────────────────────────────
  {
    id: 'texture-brush',
    name: 'Texture Brush',
    category: 'Texture',
    emoji: '🧱',
    algorithm: 'stamp',
    noiseFrequency: 0.3,
    defaults: {
      ...BASE,
      size: 40,
      opacity: 85,
      hardness: 60,
      softness: 40,
      flow: 80,
      spacing: 5,
      pressure: 70,
      smoothing: 40,
      textureStrength: 80,
    },
  },
  {
    id: 'pattern-brush',
    name: 'Pattern Brush',
    category: 'Texture',
    emoji: '🔷',
    algorithm: 'stamp',
    defaults: {
      ...BASE,
      size: 30,
      opacity: 90,
      hardness: 90,
      softness: 10,
      flow: 100,
      spacing: 120,  // gaps between stamps
      pressure: 50,
      smoothing: 50,
      rotation: 0,
      scatter: 0,
    },
  },
  {
    id: 'mosaic-brush',
    name: 'Mosaic Brush',
    category: 'Texture',
    emoji: '🔲',
    algorithm: 'special',
    defaults: {
      ...BASE,
      size: 20,
      opacity: 100,
      hardness: 100,
      softness: 0,
      flow: 100,
      spacing: 110,
      pressure: 0,
      smoothing: 0,
    },
  },

  // ─── FX ───────────────────────────────────────────────────────────────────────
  {
    id: 'fire-brush',
    name: 'Fire Brush',
    category: 'FX',
    emoji: '🔥',
    algorithm: 'special',
    particleCount: 30,
    defaults: {
      ...BASE,
      size: 40,
      opacity: 85,
      hardness: 0,
      softness: 100,
      flow: 70,
      spacing: 2,
      pressure: 60,
      smoothing: 40,
      jitter: 20,
      scatter: 30,
      fade: 60,
      blendMode: 'screen',
    },
  },
  {
    id: 'smoke-brush',
    name: 'Smoke Brush',
    category: 'FX',
    emoji: '💨',
    algorithm: 'special',
    particleCount: 20,
    defaults: {
      ...BASE,
      size: 60,
      opacity: 40,
      hardness: 0,
      softness: 100,
      flow: 40,
      spacing: 2,
      pressure: 50,
      smoothing: 70,
      jitter: 15,
      scatter: 25,
      fade: 80,
      edgeFeather: 90,
    },
  },
  {
    id: 'spark-brush',
    name: 'Spark Brush',
    category: 'FX',
    emoji: '⚡',
    algorithm: 'special',
    particleCount: 50,
    glowRadius: 6,
    defaults: {
      ...BASE,
      size: 25,
      opacity: 90,
      hardness: 100,
      softness: 0,
      flow: 80,
      spacing: 30,
      pressure: 70,
      smoothing: 20,
      jitter: 40,
      scatter: 60,
      blendMode: 'screen',
    },
  },
  {
    id: 'glitter-brush',
    name: 'Glitter Brush',
    category: 'FX',
    emoji: '✨',
    algorithm: 'special',
    particleCount: 100,
    glowRadius: 4,
    defaults: {
      ...BASE,
      size: 50,
      opacity: 85,
      hardness: 100,
      softness: 0,
      flow: 70,
      spacing: 5,
      pressure: 50,
      smoothing: 30,
      jitter: 30,
      scatter: 70,
    },
  },
  {
    id: 'glass-brush',
    name: 'Glass Brush',
    category: 'FX',
    emoji: '🔮',
    algorithm: 'special',
    defaults: {
      ...BASE,
      size: 45,
      opacity: 30,
      hardness: 100,
      softness: 0,
      flow: 80,
      spacing: 3,
      pressure: 60,
      smoothing: 70,
      blendMode: 'overlay',
    },
  },
  {
    id: 'noise-brush',
    name: 'Noise Brush',
    category: 'FX',
    emoji: '📡',
    algorithm: 'special',
    noiseFrequency: 0.8,
    defaults: {
      ...BASE,
      size: 40,
      opacity: 75,
      hardness: 50,
      softness: 50,
      flow: 60,
      spacing: 2,
      pressure: 60,
      smoothing: 20,
      textureStrength: 100,
      scatter: 20,
    },
  },
];

// Helper: get brushes by category
export function getBrushesByCategory(category: BrushCategory): BrushPreset[] {
  return BRUSH_PRESETS.filter(b => b.category === category);
}

// Helper: get brush by ID
export function getBrushById(id: string): BrushPreset | undefined {
  return BRUSH_PRESETS.find(b => b.id === id);
}

// All unique categories
export const BRUSH_CATEGORIES: BrushCategory[] = [
  'Basic', 'Sketch', 'Painting', 'Calligraphy', 'Graffiti',
  'Illustration', 'Pixel Art', 'Neon', 'Texture', 'FX',
  'Anime', 'Comic', 'Professional', 'Favorite', 'Recent', 'Downloaded',
];

// Blend mode display labels
export const BLEND_MODE_LABELS: Record<BlendMode, string> = {
  'source-over': 'Normal',
  'multiply': 'Multiply',
  'screen': 'Screen',
  'overlay': 'Overlay',
  'darken': 'Darken',
  'lighten': 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  'difference': 'Difference',
  'exclusion': 'Exclusion',
  'hue': 'Hue',
  'saturation': 'Saturation',
  'color': 'Color',
  'luminosity': 'Luminosity',
};
