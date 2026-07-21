// ColorSystem.ts — Professional Color Engine for Draw Studio

export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface HSV { h: number; s: number; v: number; }

// ─── Conversions ──────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0, s = max === 0 ? 0 : d / max, v = max;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const hn = h / 360, sn = s / 100, vn = v / 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);
  switch (i % 6) {
    case 0: r = vn; g = t; b = p; break;
    case 1: r = q; g = vn; b = p; break;
    case 2: r = p; g = vn; b = t; break;
    case 3: r = p; g = q; b = vn; break;
    case 4: r = t; g = p; b = vn; break;
    case 5: r = vn; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = h / 360, sn = s / 100, ln = l / 100;
  if (sn === 0) { const v = Math.round(ln * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1/3) * 255),
  };
}

export function rgbToString({ r, g, b }: RGB, alpha = 1): string {
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

// ─── Color Wheel Renderer ─────────────────────────────────────────────────────

/** Draw an HSV color wheel onto a canvas context. */
export function drawColorWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const imageData = ctx.createImageData(radius * 2, radius * 2);
  const data = imageData.data;
  for (let y = 0; y < radius * 2; y++) {
    for (let x = 0; x < radius * 2; x++) {
      const dx = x - radius, dy = y - radius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
      const sat = dist / radius;
      const { r, g, b } = hsvToRgb({ h: angle, s: sat * 100, v: 100 });
      const i = (y * radius * 2 + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(imageData, cx - radius, cy - radius);
}

/** Draw a saturation/value square for the selected hue. */
export function drawSVSquare(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, hue: number) {
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const s = (px / size) * 100;
      const v = 100 - (py / size) * 100;
      const { r, g, b } = hsvToRgb({ h: hue, s, v });
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}

// ─── Eyedropper ───────────────────────────────────────────────────────────────

export function sampleCanvasColor(canvas: HTMLCanvasElement, px: number, py: number): RGB {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { r: 0, g: 0, b: 0 };
  const d = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
  return { r: d[0], g: d[1], b: d[2] };
}

// ─── Palette Libraries ────────────────────────────────────────────────────────

export const MATERIAL_COLORS = [
  '#F44336','#E91E63','#9C27B0','#673AB7','#3F51B5',
  '#2196F3','#03A9F4','#00BCD4','#009688','#4CAF50',
  '#8BC34A','#CDDC39','#FFEB3B','#FFC107','#FF9800',
  '#FF5722','#795548','#9E9E9E','#607D8B','#000000',
];

export const NEON_COLORS = [
  '#FF0090','#FF00FF','#BF00FF','#7F00FF','#0000FF',
  '#0080FF','#00FFFF','#00FF80','#00FF00','#80FF00',
  '#FFFF00','#FF8000','#FF0000','#FF007F','#FF1493',
  '#00FFFF','#7FFF00','#FF4500','#DA70D6','#ADFF2F',
];

export const GLASS_COLORS = [
  'rgba(255,255,255,0.15)','rgba(255,255,255,0.25)','rgba(255,255,255,0.35)',
  'rgba(100,200,255,0.2)','rgba(180,100,255,0.2)','rgba(255,100,180,0.2)',
  'rgba(100,255,180,0.2)','rgba(255,220,100,0.2)','rgba(50,150,255,0.3)',
  'rgba(255,50,100,0.2)','rgba(80,255,200,0.2)','rgba(200,100,255,0.3)',
];

export const CREATOR_PRESETS = [
  // Creator / brand palettes
  '#6C63FF','#7C3AED','#A855F7','#EC4899','#F43F5E',
  '#0EA5E9','#06B6D4','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#D946EF','#F97316','#14B8A6','#3B82F6',
  '#84CC16','#EAB308','#22D3EE','#A3E635','#FB923C',
];

export interface GradientStop { color: string; position: number; }
export interface GradientPreset { name: string; stops: GradientStop[]; angle: number; }

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: 'Violet Dream', angle: 135, stops: [{ color: '#7C3AED', position: 0 }, { color: '#EC4899', position: 100 }] },
  { name: 'Ocean Mist', angle: 135, stops: [{ color: '#0EA5E9', position: 0 }, { color: '#06B6D4', position: 100 }] },
  { name: 'Sunset', angle: 135, stops: [{ color: '#F97316', position: 0 }, { color: '#EC4899', position: 100 }] },
  { name: 'Forest', angle: 135, stops: [{ color: '#10B981', position: 0 }, { color: '#3B82F6', position: 100 }] },
  { name: 'Fire', angle: 135, stops: [{ color: '#EF4444', position: 0 }, { color: '#F59E0B', position: 100 }] },
  { name: 'Neon', angle: 135, stops: [{ color: '#FF00FF', position: 0 }, { color: '#00FFFF', position: 100 }] },
  { name: 'Midnight', angle: 180, stops: [{ color: '#0F172A', position: 0 }, { color: '#7C3AED', position: 100 }] },
  { name: 'Rose Gold', angle: 135, stops: [{ color: '#FDA4AF', position: 0 }, { color: '#F43F5E', position: 100 }] },
];

export interface CMYK { c: number; m: number; y: number; k: number; }

export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = Math.round(((1 - rn - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gn - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bn - k) / (1 - k)) * 100);
  return { c, m, y, k: Math.round(k * 100) };
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  const cn = c / 100, mn = m / 100, yn = y / 100, kn = k / 100;
  const r = Math.round(255 * (1 - cn) * (1 - kn));
  const g = Math.round(255 * (1 - mn) * (1 - kn));
  const b = Math.round(255 * (1 - yn) * (1 - kn));
  return { r, g, b };
}

export function getHarmonyColors(hex: string, mode: 'complementary' | 'triadic' | 'split' | 'monochromatic'): string[] {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb);
  const harmonies: string[] = [];

  switch (mode) {
    case 'complementary': {
      const opposite = hsvToRgb({ h: (hsv.h + 180) % 360, s: hsv.s, v: hsv.v });
      harmonies.push(hex, rgbToHex(opposite));
      break;
    }
    case 'triadic': {
      const t1 = hsvToRgb({ h: (hsv.h + 120) % 360, s: hsv.s, v: hsv.v });
      const t2 = hsvToRgb({ h: (hsv.h + 240) % 360, s: hsv.s, v: hsv.v });
      harmonies.push(hex, rgbToHex(t1), rgbToHex(t2));
      break;
    }
    case 'split': {
      const s1 = hsvToRgb({ h: (hsv.h + 150) % 360, s: hsv.s, v: hsv.v });
      const s2 = hsvToRgb({ h: (hsv.h + 210) % 360, s: hsv.s, v: hsv.v });
      harmonies.push(hex, rgbToHex(s1), rgbToHex(s2));
      break;
    }
    case 'monochromatic': {
      const m1 = hsvToRgb({ h: hsv.h, s: Math.max(0, hsv.s - 30), v: Math.min(100, hsv.v + 15) });
      const m2 = hsvToRgb({ h: hsv.h, s: Math.min(100, hsv.s + 20), v: Math.max(0, hsv.v - 25) });
      const m3 = hsvToRgb({ h: hsv.h, s: Math.max(0, hsv.s - 60), v: Math.min(100, hsv.v + 30) });
      harmonies.push(hex, rgbToHex(m1), rgbToHex(m2), rgbToHex(m3));
      break;
    }
  }
  return harmonies;
}

