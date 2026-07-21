// DrawingEngine.ts — Professional Core Canvas & Vector Creative Engine
// Handles low-level rendering: stroke interpolation, custom brush jitters, smudge, liquify, layer tree compositing, vectors, selections, and filters.

import { BrushPreset, BrushSettings, BlendMode } from './BrushPresets';
import { hexToRgb, rgbToString, rgbToHex } from './ColorSystem';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PointerSample {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export type LayerType = 'paint' | 'vector' | 'text' | 'group' | 'adjustment';

export interface VectorShape {
  id: string;
  type: 'rect' | 'ellipse' | 'polygon' | 'path';
  points: {
    x: number;
    y: number;
    h1x?: number; // Bezier handle 1
    h1y?: number;
    h2x?: number; // Bezier handle 2
    h2y?: number;
    smooth?: boolean;
  }[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number; // for rects
  polygonSides?: number; // for stars/polygons
  isStar?: boolean;
  starInnerRadiusRatio?: number; // for stars
  rotation?: number;
  opacity?: number;
}

export interface DrawLayer {
  id: string;
  name: string;
  type: LayerType;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  opacity: number; // 0–100
  visible: boolean;
  locked: boolean;
  blendMode: GlobalCompositeOperation;
  thumbnailUrl?: string;
  alphaLocked?: boolean;
  
  // Transform properties
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;

  // Vector Layer fields
  shapes?: VectorShape[];
  
  // Text Layer fields
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textDecoration?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textX?: number;
  textY?: number;
  
  // Adjustment Layer fields
  adjustmentType?: 'blur' | 'glitch' | 'cyberpunk' | 'invert' | 'grayscale' | 'contrast' | 'brightness';
  adjustmentStrength?: number;

  // Group Hierarchy
  parentId?: string | null;
  expanded?: boolean;
}

export interface HistorySnapshot {
  timestamp: number;
  label: string;
  layers: {
    id: string;
    name: string;
    type: LayerType;
    opacity: number;
    visible: boolean;
    locked: boolean;
    blendMode: GlobalCompositeOperation;
    alphaLocked?: boolean;
    shapes?: VectorShape[];
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;
    textBold?: boolean;
    textItalic?: boolean;
    letterSpacing?: number;
    textX?: number;
    textY?: number;
    adjustmentType?: DrawLayer['adjustmentType'];
    adjustmentStrength?: number;
    parentId?: string | null;
    expanded?: boolean;
    pixelDataUrl?: string; // Raster layer state backup
  }[];
}

// ─── Drawing Engine Class ─────────────────────────────────────────────────────

export class DrawingEngine {
  width: number;
  height: number;
  devicePixelRatio: number;

  // Layers Tree
  layers: DrawLayer[] = [];
  activeLayerId: string = '';

  // Selection mask path
  selectionPath: { x: number; y: number }[] | null = null;
  isSelectionActive = false;

  // Undo/Redo Timeline
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxHistory = 100;

  // Stroke state
  private isDrawing = false;
  private strokeSamples: PointerSample[] = [];
  private strokeCanvas: HTMLCanvasElement;
  private strokeCtx: CanvasRenderingContext2D;

  // Smudge buffer
  private smudgeCanvas: HTMLCanvasElement | null = null;
  private smudgeCtx: CanvasRenderingContext2D | null = null;
  private isSmudging = false;

  // Current tool settings
  private brush: BrushPreset | null = null;
  private settings: BrushSettings | null = null;
  private color: string = '#ffffff';
  private isEraser = false;

  // Stabilizer (lazy brush)
  private lazyX = 0;
  private lazyY = 0;

  // Output canvas (composite)
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D;

  constructor(outputCanvas: HTMLCanvasElement, width: number, height: number) {
    this.outputCanvas = outputCanvas;
    this.width = width;
    this.height = height;
    this.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.outputCtx = ctx;

    // Stroke canvas (temporary buffer)
    this.strokeCanvas = document.createElement('canvas');
    this.strokeCanvas.width = width;
    this.strokeCanvas.height = height;
    const sctx = this.strokeCanvas.getContext('2d');
    if (!sctx) throw new Error('Could not get stroke context');
    this.strokeCtx = sctx;

    // Create initial paint layer
    this.addLayer('Background', 'paint');
    this.fillActiveLayer('#130f24'); // default dark void background
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.strokeCanvas.width = width;
    this.strokeCanvas.height = height;
    this.layers.forEach(l => {
      if (l.type === 'paint') {
        const temp = document.createElement('canvas');
        temp.width = l.canvas.width;
        temp.height = l.canvas.height;
        temp.getContext('2d')?.drawImage(l.canvas, 0, 0);
        
        l.canvas.width = width;
        l.canvas.height = height;
        l.ctx.drawImage(temp, 0, 0);
      } else {
        l.canvas.width = width;
        l.canvas.height = height;
      }
    });
    this.composite();
  }

  // ─── Layer Management ───────────────────────────────────────────────────────

  addLayer(name: string, type: LayerType = 'paint', parentId: string | null = null): DrawLayer {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: type === 'paint' });
    if (!ctx) throw new Error('Layer context failed');

    const layer: DrawLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      canvas,
      ctx,
      opacity: 100,
      visible: true,
      locked: false,
      blendMode: 'source-over',
      parentId,
      expanded: true,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    };

    if (type === 'vector') {
      layer.shapes = [];
    } else if (type === 'text') {
      layer.text = 'Double-click to Edit';
      layer.fontFamily = 'Inter';
      layer.fontSize = 48;
      layer.textColor = '#ffffff';
      layer.textBold = false;
      layer.textItalic = false;
      layer.letterSpacing = 0;
      layer.lineHeight = 1.2;
      layer.textX = this.width / 2;
      layer.textY = this.height / 2;
    } else if (type === 'adjustment') {
      layer.adjustmentType = 'blur';
      layer.adjustmentStrength = 10;
    }

    this.layers.push(layer);
    this.activeLayerId = layer.id;
    
    this.composite();
    this.updateThumbnails();
    return layer;
  }

  deleteLayer(id: string) {
    if (this.layers.length <= 1) return;
    this._saveHistory(`Delete ${this.layers.find(l => l.id === id)?.name || 'Layer'}`);
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    this.layers.splice(idx, 1);
    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[Math.max(0, idx - 1)].id;
    }
    this.composite();
  }

  duplicateLayer(id: string) {
    const src = this.layers.find(l => l.id === id);
    if (!src) return;
    this._saveHistory(`Duplicate ${src.name}`);
    const idx = this.layers.indexOf(src);
    const newLayer = this.addLayer(src.name + ' Copy', src.type, src.parentId);
    
    if (src.type === 'paint') {
      newLayer.ctx.drawImage(src.canvas, 0, 0);
    } else if (src.type === 'vector' && src.shapes) {
      newLayer.shapes = JSON.parse(JSON.stringify(src.shapes));
    } else if (src.type === 'text') {
      newLayer.text = src.text;
      newLayer.fontFamily = src.fontFamily;
      newLayer.fontSize = src.fontSize;
      newLayer.textColor = src.textColor;
      newLayer.textBold = src.textBold;
      newLayer.textItalic = src.textItalic;
      newLayer.letterSpacing = src.letterSpacing;
      newLayer.textX = src.textX;
      newLayer.textY = src.textY;
    } else if (src.type === 'adjustment') {
      newLayer.adjustmentType = src.adjustmentType;
      newLayer.adjustmentStrength = src.adjustmentStrength;
    }
    
    newLayer.opacity = src.opacity;
    newLayer.blendMode = src.blendMode;
    
    this.composite();
    this.updateThumbnails();
  }

  mergeDown(id: string) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    const top = this.layers[idx];
    const bottom = this.layers[idx - 1];
    
    if (top.type !== 'paint' || bottom.type !== 'paint') {
      this.rasterizeLayer(top.id);
      this.rasterizeLayer(bottom.id);
    }
    
    this._saveHistory(`Merge ${top.name} Down`);
    bottom.ctx.save();
    bottom.ctx.globalAlpha = top.opacity / 100;
    bottom.ctx.globalCompositeOperation = top.blendMode;
    bottom.ctx.drawImage(top.canvas, 0, 0);
    bottom.ctx.restore();
    
    this.deleteLayer(id);
  }

  rasterizeLayer(id: string) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer || layer.type === 'paint') return;
    
    this._saveHistory(`Rasterize ${layer.name}`);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    
    if (layer.type === 'vector') {
      this._renderVectorShapes(tempCtx, layer.shapes || []);
    } else if (layer.type === 'text') {
      this._renderText(tempCtx, layer);
    }
    
    layer.type = 'paint';
    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.drawImage(tempCanvas, 0, 0);
    layer.shapes = undefined;
    layer.text = undefined;
    
    this.composite();
    this.updateThumbnails();
  }

  reorderLayer(fromIndex: number, toIndex: number) {
    const [layer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, layer);
    this.composite();
  }

  setActiveLayer(id: string) {
    this.activeLayerId = id;
  }

  updateLayer(id: string, updates: Partial<DrawLayer>) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    Object.assign(layer, updates);
    
    if (layer.type === 'vector' || layer.type === 'text') {
      layer.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    this.composite();
  }

  getActiveLayer(): DrawLayer | undefined {
    return this.layers.find(l => l.id === this.activeLayerId);
  }

  updateThumbnails() {
    this.layers.forEach(layer => {
      const thumb = document.createElement('canvas');
      thumb.width = 64;
      thumb.height = 64;
      const tctx = thumb.getContext('2d')!;
      
      const s = 8;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          tctx.fillStyle = (r + c) % 2 === 0 ? '#1b162f' : '#0e0a1b';
          tctx.fillRect(c * s, r * s, s, s);
        }
      }
      
      if (layer.type === 'paint') {
        tctx.drawImage(layer.canvas, 0, 0, 64, 64);
      } else if (layer.type === 'vector') {
        const scale = 64 / Math.max(this.width, this.height);
        tctx.save();
        tctx.scale(scale, scale);
        this._renderVectorShapes(tctx, layer.shapes || []);
        tctx.restore();
      } else if (layer.type === 'text') {
        tctx.fillStyle = '#ffffff';
        tctx.font = 'bold 36px sans-serif';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.fillText('T', 32, 32);
      } else if (layer.type === 'adjustment') {
        tctx.fillStyle = 'rgba(139,92,246,0.3)';
        tctx.fillRect(8, 8, 48, 48);
        tctx.strokeStyle = '#8b5cf6';
        tctx.lineWidth = 2;
        tctx.strokeRect(8, 8, 48, 48);
      }
      
      layer.thumbnailUrl = thumb.toDataURL();
    });
  }

  // ─── Tool Settings ──────────────────────────────────────────────────────────

  setBrush(brush: BrushPreset, settings: BrushSettings, color: string) {
    this.brush = brush;
    this.settings = settings;
    this.isEraser = brush.eraser ?? false;
    this.color = color;
  }

  // ─── Selection Mask ─────────────────────────────────────────────────────────

  setSelection(path: { x: number; y: number }[] | null) {
    this.selectionPath = path;
    this.isSelectionActive = !!path && path.length > 2;
    this.composite();
  }

  clearSelection() {
    this.selectionPath = null;
    this.isSelectionActive = false;
    this.composite();
  }

  private _applySelectionClip(ctx: CanvasRenderingContext2D) {
    if (!this.isSelectionActive || !this.selectionPath || this.selectionPath.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(this.selectionPath[0].x, this.selectionPath[0].y);
    for (let i = 1; i < this.selectionPath.length; i++) {
      ctx.lineTo(this.selectionPath[i].x, this.selectionPath[i].y);
    }
    ctx.closePath();
    ctx.clip();
  }

  // ─── Smudge buffer logic ───────────────────────────────────────────────────

  private _initSmudge(x: number, y: number, radius: number) {
    const layer = this.getActiveLayer();
    if (!layer || layer.type !== 'paint') return;
    
    if (!this.smudgeCanvas) {
      this.smudgeCanvas = document.createElement('canvas');
      this.smudgeCanvas.width = 128;
      this.smudgeCanvas.height = 128;
      this.smudgeCtx = this.smudgeCanvas.getContext('2d');
    }
    
    const size = radius * 2;
    this.smudgeCtx?.clearRect(0, 0, 128, 128);
    this.smudgeCtx?.drawImage(
      layer.canvas,
      x - radius, y - radius, size, size,
      0, 0, 128, 128
    );
    this.isSmudging = true;
  }

  // ─── Liquify Engine ─────────────────────────────────────────────────────────

  applyLiquify(cx: number, cy: number, radius: number, strength: number, mode: 'push' | 'twirl' | 'pinch' | 'bulge', dx = 0, dy = 0) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked || layer.type !== 'paint') return;

    if (!this.isDrawing) {
      this._saveHistory('Liquify');
      this.isDrawing = true;
    }

    const ctx = layer.ctx;
    const size = Math.round(radius * 2.5);
    const startX = Math.round(cx - size / 2);
    const startY = Math.round(cy - size / 2);

    if (startX < 0 || startY < 0 || startX + size > this.width || startY + size > this.height) return;

    const imgData = ctx.getImageData(startX, startY, size, size);
    const pixels = imgData.data;
    const copy = new Uint8ClampedArray(pixels);

    const r2 = (size / 2) * (size / 2);
    const str = strength / 100;
    const centerOffset = size / 2;

    for (let y = 0; y < size; y++) {
      const dy_pixel = y - centerOffset;
      for (let x = 0; x < size; x++) {
        const dx_pixel = x - centerOffset;
        const dist2 = dx_pixel * dx_pixel + dy_pixel * dy_pixel;

        if (dist2 < r2) {
          const dist = Math.sqrt(dist2);
          const influence = Math.pow(1 - dist / (size / 2), 2);

          let srcX = x;
          let srcY = y;

          if (mode === 'push') {
            srcX -= dx * influence * str * 1.5;
            srcY -= dy * influence * str * 1.5;
          } else if (mode === 'twirl') {
            const angle = influence * str * 0.4;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            srcX = centerOffset + (dx_pixel * cos - dy_pixel * sin);
            srcY = centerOffset + (dx_pixel * sin + dy_pixel * cos);
          } else if (mode === 'pinch') {
            srcX = centerOffset + dx_pixel * (1 + influence * str * 0.4);
            srcY = centerOffset + dy_pixel * (1 + influence * str * 0.4);
          } else if (mode === 'bulge') {
            srcX = centerOffset + dx_pixel * (1 - influence * str * 0.3);
            srcY = centerOffset + dy_pixel * (1 - influence * str * 0.3);
          }

          const ix = Math.floor(srcX);
          const iy = Math.floor(srcY);
          const fx = srcX - ix;
          const fy = srcY - iy;

          if (ix >= 0 && ix < size - 1 && iy >= 0 && iy < size - 1) {
            const i1 = (iy * size + ix) * 4;
            const i2 = (iy * size + ix + 1) * 4;
            const i3 = ((iy + 1) * size + ix) * 4;
            const i4 = ((iy + 1) * size + ix + 1) * 4;

            const destIdx = (y * size + x) * 4;
            for (let c = 0; c < 4; c++) {
              const c1 = copy[i1 + c];
              const c2 = copy[i2 + c];
              const c3 = copy[i3 + c];
              const c4 = copy[i4 + c];

              const top = c1 + (c2 - c1) * fx;
              const bottom = c3 + (c4 - c3) * fx;
              pixels[destIdx + c] = top + (bottom - top) * fy;
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, startX, startY);
    this.composite();
  }

  endLiquify() {
    this.isDrawing = false;
    this.updateThumbnails();
    this.redoStack = [];
  }

  // ─── Stroke Lifecycle ───────────────────────────────────────────────────────

  startStroke(x: number, y: number, pressure: number) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked || !this.settings || !this.brush) return;

    this.isDrawing = true;
    this.strokeSamples = [{ x, y, pressure, timestamp: performance.now() }];
    this.lazyX = x;
    this.lazyY = y;

    this._saveHistory(this.brush.name);

    if (this.brush.algorithm === 'wet' && this.brush.id === 'smudge-brush') {
      this._initSmudge(x, y, this.settings.size / 2);
    }

    this.strokeCtx.clearRect(0, 0, this.width, this.height);
  }

  continueStroke(x: number, y: number, pressure: number) {
    if (!this.isDrawing || !this.settings || !this.brush) return;

    const stab = this.settings.stabilization / 100;
    if (stab > 0) {
      this.lazyX += (x - this.lazyX) * (1 - stab * 0.95);
      this.lazyY += (y - this.lazyY) * (1 - stab * 0.95);
      x = this.lazyX;
      y = this.lazyY;
    }

    this.strokeSamples.push({ x, y, pressure, timestamp: performance.now() });
    this._renderStroke();
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const layer = this.getActiveLayer();
    if (layer && this.settings) {
      const ctx = layer.ctx;
      ctx.save();
      this._applySelectionClip(ctx);
      
      if (layer.alphaLocked) {
        ctx.globalCompositeOperation = 'source-in';
      } else if (this.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = this.settings.opacity / 100;
      } else {
        ctx.globalCompositeOperation = this.settings.blendMode as GlobalCompositeOperation;
        ctx.globalAlpha = 1;
      }
      
      ctx.drawImage(this.strokeCanvas, 0, 0);
      ctx.restore();
    }

    this.strokeCtx.clearRect(0, 0, this.width, this.height);
    this.strokeSamples = [];
    this.isSmudging = false;
    
    this.composite();
    this.updateThumbnails();
    this.redoStack = [];
  }

  // ─── Stroke Rendering ───────────────────────────────────────────────────────

  private _renderStroke() {
    if (!this.settings || !this.brush || this.strokeSamples.length < 2) return;

    const s = this.settings;
    const ctx = this.strokeCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    this._applySelectionClip(ctx);

    const points = this._interpolateSamples(this.strokeSamples, s.smoothing / 100);
    const algo = this.brush.algorithm;

    if (algo === 'stamp') {
      this._renderStampStroke(ctx, points, s);
    } else if (algo === 'flow') {
      this._renderFlowStroke(ctx, points, s);
    } else if (algo === 'wet') {
      this._renderWetStroke(ctx, points, s);
    } else {
      this._renderSpecialStroke(ctx, points, s);
    }

    ctx.restore();
  }

  private _interpolateSamples(samples: PointerSample[], smoothing: number): PointerSample[] {
    if (samples.length <= 2) return samples;
    const result: PointerSample[] = [];
    const steps = Math.max(2, Math.round(4 + smoothing * 8));

    for (let i = 0; i < samples.length - 1; i++) {
      const p0 = samples[Math.max(0, i - 1)];
      const p1 = samples[i];
      const p2 = samples[i + 1];
      const p3 = samples[Math.min(samples.length - 1, i + 2)];

      for (let t = 0; t < steps; t++) {
        const tt = t / steps;
        const x = 0.5 * (
          2 * p1.x +
          (-p0.x + p2.x) * tt +
          (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * tt*tt +
          (-p0.x + 3*p1.x - 3*p2.x + p3.x) * tt*tt*tt
        );
        const y = 0.5 * (
          2 * p1.y +
          (-p0.y + p2.y) * tt +
          (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * tt*tt +
          (-p0.y + 3*p1.y - 3*p2.y + p3.y) * tt*tt*tt
        );
        const pressure = p1.pressure + (p2.pressure - p1.pressure) * tt;
        result.push({ x, y, pressure, timestamp: p1.timestamp });
      }
    }
    result.push(samples[samples.length - 1]);
    return result;
  }

  private _getBrushSize(basePx: number, pressure: number, pressureSensitivity: number): number {
    const pFactor = 1 + (pressure - 0.5) * (pressureSensitivity / 100) * 1.5;
    return Math.max(1, basePx * pFactor);
  }

  private _buildBrushGradient(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, s: BrushSettings): CanvasGradient {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const rgb = hexToRgb(this.color);
    const hardEdge = s.hardness / 100;
    const alpha = s.opacity / 100;

    grad.addColorStop(0, rgbToString(rgb, alpha));
    grad.addColorStop(hardEdge * 0.8, rgbToString(rgb, alpha));
    grad.addColorStop(1, rgbToString(rgb, 0));
    return grad;
  }

  private _renderStampStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    const basePx = s.size / 2;
    const spacing = Math.max(1, s.size * (s.spacing / 100));
    let distAcc = 0;
    let prevX = points[0]?.x ?? 0, prevY = points[0]?.y ?? 0;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const dx = pt.x - prevX, dy = pt.y - prevY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      distAcc += dist;

      if (distAcc >= spacing || i === 0) {
        distAcc = 0;
        const radius = this._getBrushSize(basePx, pt.pressure, s.pressure);
        const jx = (Math.random() - 0.5) * s.jitter;
        const jy = (Math.random() - 0.5) * s.jitter;
        const nx = pt.x + jx, ny = pt.y + jy;

        const fade = s.fade > 0 ? Math.max(0, 1 - (i / points.length) * (s.fade / 100)) : 1;

        if (s.scatter > 0) {
          const count = Math.ceil(1 + (s.scatter / 100) * 4);
          for (let sc = 0; sc < count; sc++) {
            const sa = Math.random() * Math.PI * 2;
            const sd = Math.random() * s.scatter;
            const sx = nx + Math.cos(sa) * sd, sy = ny + Math.sin(sa) * sd;
            this._stampDot(ctx, sx, sy, radius * (0.5 + Math.random() * 0.5), s, fade);
          }
        } else {
          this._stampDot(ctx, nx, ny, radius, s, fade);
        }
      }
      prevX = pt.x; prevY = pt.y;
    }
  }

  private _stampDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, s: BrushSettings, opacity: number) {
    ctx.save();

    if (s.textureStrength > 0 && this.brush?.noiseFrequency) {
      const noiseMask = this._noiseAlpha(x, y, radius, s.textureStrength / 100, this.brush.noiseFrequency);
      if (Math.random() > noiseMask) { ctx.restore(); return; }
    }

    ctx.globalAlpha = (s.opacity / 100) * opacity;

    if (s.hardness >= 95) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    } else {
      const grad = this._buildBrushGradient(ctx, x, y, radius, s);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  private _noiseAlpha(x: number, y: number, _r: number, strength: number, freq: number): number {
    const n = Math.sin(x * freq * 0.3 + y * freq * 0.7) * 0.5 + 0.5;
    return 1 - strength * n;
  }

  private _renderFlowStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    if (points.length < 2) return;
    ctx.save();

    const radius = s.size / 2;
    const alpha = (s.flow / 100) * (s.opacity / 100) * 0.08;

    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const prev = points[i - 1];
      const r = this._getBrushSize(radius, pt.pressure, s.pressure);

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = rgbToString(hexToRgb(this.color), alpha);
      ctx.lineWidth = r * 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private _renderWetStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    if (points.length < 2) return;
    
    if (this.isSmudging && this.smudgeCanvas) {
      const radius = s.size / 2;
      for (const pt of points) {
        ctx.save();
        ctx.globalAlpha = (s.colorMixing / 100) * 0.4;
        ctx.drawImage(
          this.smudgeCanvas,
          0, 0, 128, 128,
          pt.x - radius, pt.y - radius, radius * 2, radius * 2
        );
        
        ctx.globalAlpha = (1 - s.colorMixing / 100) * 0.1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    const radius = s.size / 2;
    const rgb = hexToRgb(this.color);
    const baseAlpha = (s.opacity / 100) * 0.15;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const pt = points[i], prev = points[i - 1];
      const r = this._getBrushSize(radius, pt.pressure, s.pressure);

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = rgbToString(rgb, baseAlpha);
      ctx.lineWidth = r * 2;
      ctx.stroke();

      if (s.wetness > 20 && this.brush?.wetEdges) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = rgbToString(rgb, baseAlpha * (s.wetness / 100) * 0.5);
        ctx.lineWidth = r * 2.3;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private _renderSpecialStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    if (!this.brush) return;

    if (this.brush.glowRadius) {
      this._renderGlowStroke(ctx, points, s);
    } else if (this.brush.particleCount) {
      this._renderParticleStroke(ctx, points, s);
    } else if (this.brush.id === 'blur-brush') {
      this._renderBlurStroke(ctx, points, s);
    } else {
      this._renderStampStroke(ctx, points, s);
    }
  }

  private _renderGlowStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    if (points.length < 2) return;
    const radius = s.size / 2;
    const glowR = (this.brush?.glowRadius ?? 10) * (radius / 10);
    const rgb = hexToRgb(this.color);

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = glowR * 2.5;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = s.opacity / 100;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const mid = { x: (points[i].x + points[i-1].x) / 2, y: (points[i].y + points[i-1].y) / 2 };
      ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, mid.x, mid.y);
    }
    ctx.strokeStyle = rgbToString(rgb, 1);
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.restore();
  }

  private _renderParticleStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    const count = this.brush?.particleCount ?? 20;
    const rgb = hexToRgb(this.color);

    for (const pt of points) {
      ctx.save();
      ctx.globalAlpha = (s.opacity / 100) * 0.7;
      for (let p = 0; p < count / points.length; p++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * s.size;
        const px = pt.x + Math.cos(angle) * dist;
        const py = pt.y + Math.sin(angle) * dist;
        const size = 1 + Math.random() * 3.5;

        const pyFinal = this.brush?.id === 'fire-brush' ? py - Math.random() * 12 : py;

        ctx.beginPath();
        ctx.arc(px, pyFinal, size, 0, Math.PI * 2);
        ctx.fillStyle = rgbToString(rgb, Math.random() * 0.8 + 0.2);
        ctx.fill();

        if (this.brush?.glowRadius) {
          ctx.shadowColor = this.color;
          ctx.shadowBlur = this.brush.glowRadius;
        }
      }
      ctx.restore();
    }
  }

  private _renderBlurStroke(ctx: CanvasRenderingContext2D, points: PointerSample[], s: BrushSettings) {
    const radius = s.size / 2;
    const active = this.getActiveLayer();
    if (!active) return;
    
    ctx.save();
    points.forEach(pt => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${s.size / 8}px)`;
      ctx.drawImage(active.canvas, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  // ─── Compositing Layer Tree ────────────────────────────────────────────────

  composite() {
    const ctx = this.outputCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    this._drawCheckerboard(ctx);

    const renderList = this._buildRenderTree(this.layers);

    for (const layer of renderList) {
      if (!layer.visible) continue;
      
      if (layer.type === 'vector') {
        layer.ctx.clearRect(0, 0, this.width, this.height);
        this._renderVectorShapes(layer.ctx, layer.shapes || []);
      } else if (layer.type === 'text') {
        layer.ctx.clearRect(0, 0, this.width, this.height);
        this._renderText(layer.ctx, layer);
      }
      
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      
      ctx.translate(layer.x ?? 0, layer.y ?? 0);
      ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
      ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
      
      if (layer.type === 'adjustment' && layer.adjustmentType) {
        ctx.filter = this._getCanvasFilter(layer.adjustmentType, layer.adjustmentStrength ?? 10);
      }
      
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }

    if (this.isDrawing) {
      ctx.save();
      if (this.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else if (this.settings) {
        ctx.globalCompositeOperation = this.settings.blendMode as GlobalCompositeOperation;
      }
      ctx.drawImage(this.strokeCanvas, 0, 0);
      ctx.restore();
    }
  }

  private _buildRenderTree(layers: DrawLayer[]): DrawLayer[] {
    const roots = layers.filter(l => !l.parentId);
    const result: DrawLayer[] = [];
    
    const visit = (node: DrawLayer) => {
      result.push(node);
      const children = layers.filter(l => l.parentId === node.id);
      children.forEach(visit);
    };
    
    roots.forEach(visit);
    return result;
  }

  private _drawCheckerboard(ctx: CanvasRenderingContext2D) {
    const size = 16;
    const cols = Math.ceil(this.width / size);
    const rows = Math.ceil(this.height / size);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#100c1e' : '#0a0715';
        ctx.fillRect(c * size, r * size, size, size);
      }
    }
  }

  private _getCanvasFilter(type: DrawLayer['adjustmentType'], strength: number): string {
    switch (type) {
      case 'blur': return `blur(${strength / 2}px)`;
      case 'invert': return `invert(${strength}%)`;
      case 'grayscale': return `grayscale(${strength}%)`;
      case 'contrast': return `contrast(${100 + strength}%)`;
      case 'brightness': return `brightness(${100 + strength}%)`;
      default: return 'none';
    }
  }

  // ─── Vectors & Shapes Rendering ─────────────────────────────────────────────

  private _renderVectorShapes(ctx: CanvasRenderingContext2D, shapes: VectorShape[]) {
    shapes.forEach(shape => {
      ctx.save();
      ctx.globalAlpha = (shape.opacity ?? 100) / 100;
      
      ctx.beginPath();
      
      if (shape.type === 'rect') {
        const p1 = shape.points[0];
        const p2 = shape.points[1] || p1;
        const w = p2.x - p1.x;
        const h = p2.y - p1.y;
        const rad = shape.cornerRadius || 0;
        ctx.roundRect(p1.x, p1.y, w, h, rad);
      } else if (shape.type === 'ellipse') {
        const p1 = shape.points[0];
        const p2 = shape.points[1] || p1;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (shape.type === 'polygon' && shape.points.length > 2) {
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.closePath();
      } else if (shape.type === 'path' && shape.points.length > 0) {
        const p0 = shape.points[0];
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < shape.points.length; i++) {
          const pt = shape.points[i];
          const prev = shape.points[i - 1];
          if (prev.h2x !== undefined && pt.h1x !== undefined) {
            ctx.bezierCurveTo(prev.h2x, prev.h2y!, pt.h1x, pt.h1y!, pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }

      if (shape.fillColor && shape.fillColor !== 'transparent') {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      
      if (shape.strokeColor && shape.strokeColor !== 'transparent' && shape.strokeWidth) {
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  private _renderText(ctx: CanvasRenderingContext2D, layer: DrawLayer) {
    if (!layer.text) return;
    ctx.save();
    ctx.fillStyle = layer.textColor || '#ffffff';
    ctx.font = `${layer.textItalic ? 'italic' : ''} ${layer.textBold ? 'bold' : ''} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (layer.letterSpacing) {
      ctx.letterSpacing = `${layer.letterSpacing}px`;
    }
    
    ctx.fillText(layer.text, layer.textX ?? 200, layer.textY ?? 200);
    ctx.restore();
  }

  // ─── Undo / Redo Timeline ───────────────────────────────────────────────────

  private _saveHistory(label: string = 'Action') {
    const snapshot: HistorySnapshot = {
      timestamp: Date.now(),
      label,
      layers: this.layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        opacity: l.opacity,
        visible: l.visible,
        locked: l.locked,
        blendMode: l.blendMode,
        alphaLocked: l.alphaLocked,
        shapes: l.shapes ? JSON.parse(JSON.stringify(l.shapes)) : undefined,
        text: l.text,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
        textColor: l.textColor,
        textBold: l.textBold,
        textItalic: l.textItalic,
        letterSpacing: l.letterSpacing,
        textX: l.textX,
        textY: l.textY,
        parentId: l.parentId,
        expanded: l.expanded,
        adjustmentType: l.adjustmentType,
        adjustmentStrength: l.adjustmentStrength,
        pixelDataUrl: l.type === 'paint' ? l.canvas.toDataURL() : undefined
      }))
    };
    
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const current: HistorySnapshot = {
      timestamp: Date.now(),
      label: 'Redo',
      layers: this.layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        opacity: l.opacity,
        visible: l.visible,
        locked: l.locked,
        blendMode: l.blendMode,
        alphaLocked: l.alphaLocked,
        shapes: l.shapes ? JSON.parse(JSON.stringify(l.shapes)) : undefined,
        text: l.text,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
        textColor: l.textColor,
        textBold: l.textBold,
        textItalic: l.textItalic,
        letterSpacing: l.letterSpacing,
        textX: l.textX,
        textY: l.textY,
        parentId: l.parentId,
        expanded: l.expanded,
        adjustmentType: l.adjustmentType,
        adjustmentStrength: l.adjustmentStrength,
        pixelDataUrl: l.type === 'paint' ? l.canvas.toDataURL() : undefined
      }))
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this._applyHistorySnapshot(prev);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const current: HistorySnapshot = {
      timestamp: Date.now(),
      label: 'Undo',
      layers: this.layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        opacity: l.opacity,
        visible: l.visible,
        locked: l.locked,
        blendMode: l.blendMode,
        alphaLocked: l.alphaLocked,
        shapes: l.shapes ? JSON.parse(JSON.stringify(l.shapes)) : undefined,
        text: l.text,
        fontFamily: l.fontFamily,
        fontSize: l.fontSize,
        textColor: l.textColor,
        textBold: l.textBold,
        textItalic: l.textItalic,
        letterSpacing: l.letterSpacing,
        textX: l.textX,
        textY: l.textY,
        parentId: l.parentId,
        expanded: l.expanded,
        adjustmentType: l.adjustmentType,
        adjustmentStrength: l.adjustmentStrength,
        pixelDataUrl: l.type === 'paint' ? l.canvas.toDataURL() : undefined
      }))
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this._applyHistorySnapshot(next);
    return true;
  }

  private _applyHistorySnapshot(snapshot: HistorySnapshot) {
    this.layers = [];
    
    snapshot.layers.forEach(item => {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      const ctx = canvas.getContext('2d')!;
      
      const layer: DrawLayer = {
        id: item.id,
        name: item.name,
        type: item.type,
        canvas,
        ctx,
        opacity: item.opacity,
        visible: item.visible,
        locked: item.locked,
        blendMode: item.blendMode,
        alphaLocked: item.alphaLocked,
        shapes: item.shapes,
        text: item.text,
        fontFamily: item.fontFamily,
        fontSize: item.fontSize,
        textColor: item.textColor,
        textBold: item.textBold,
        textItalic: item.textItalic,
        letterSpacing: item.letterSpacing,
        textX: item.textX,
        textY: item.textY,
        parentId: item.parentId,
        expanded: item.expanded,
        adjustmentType: item.adjustmentType,
        adjustmentStrength: item.adjustmentStrength
      };
      
      if (item.pixelDataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          this.composite();
        };
        img.src = item.pixelDataUrl;
      }
      
      this.layers.push(layer);
    });
    
    this.composite();
    this.updateThumbnails();
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get historyTimeline() { return this.undoStack.map(s => s.label); }

  // ─── Canvas Operations ───────────────────────────────────────────────────────

  clearActiveLayer() {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked) return;
    this._saveHistory(`Clear ${layer.name}`);
    layer.ctx.clearRect(0, 0, this.width, this.height);
    this.composite();
    this.updateThumbnails();
  }

  fillActiveLayer(color: string) {
    const layer = this.getActiveLayer();
    if (!layer || layer.locked || layer.type !== 'paint') return;
    this._saveHistory(`Fill ${layer.name}`);
    layer.ctx.fillStyle = color;
    layer.ctx.fillRect(0, 0, this.width, this.height);
    this.composite();
    this.updateThumbnails();
  }

  // ─── Selection marching ants visualizer ──────────────────────────────────────

  drawSelectionOutline(overlayCtx: CanvasRenderingContext2D, dashOffset: number) {
    if (!this.isSelectionActive || !this.selectionPath || this.selectionPath.length < 3) return;
    overlayCtx.save();
    overlayCtx.beginPath();
    overlayCtx.moveTo(this.selectionPath[0].x, this.selectionPath[0].y);
    for (let i = 1; i < this.selectionPath.length; i++) {
      overlayCtx.lineTo(this.selectionPath[i].x, this.selectionPath[i].y);
    }
    overlayCtx.closePath();
    
    overlayCtx.strokeStyle = '#000000';
    overlayCtx.lineWidth = 1;
    overlayCtx.setLineDash([4, 4]);
    overlayCtx.lineDashOffset = dashOffset;
    overlayCtx.stroke();
    
    overlayCtx.strokeStyle = '#ffffff';
    overlayCtx.lineWidth = 1;
    overlayCtx.setLineDash([4, 4]);
    overlayCtx.lineDashOffset = dashOffset + 4;
    overlayCtx.stroke();
    
    overlayCtx.restore();
  }

  // ─── Export ──────────────────────────────────────────────────────────────────

  exportPNG(transparent = true): Promise<Blob> {
    return new Promise(resolve => {
      const exp = document.createElement('canvas');
      exp.width = this.width;
      exp.height = this.height;
      const ctx = exp.getContext('2d')!;

      if (!transparent) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);
      }

      const list = this._buildRenderTree(this.layers);
      for (const layer of list) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        
        ctx.translate(layer.x ?? 0, layer.y ?? 0);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }

      exp.toBlob(b => resolve(b!), 'image/png');
    });
  }

  exportJPG(quality = 0.92): Promise<Blob> {
    return new Promise(resolve => {
      const exp = document.createElement('canvas');
      exp.width = this.width;
      exp.height = this.height;
      const ctx = exp.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);

      const list = this._buildRenderTree(this.layers);
      for (const layer of list) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        
        ctx.translate(layer.x ?? 0, layer.y ?? 0);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }

      exp.toBlob(b => resolve(b!), 'image/jpeg', quality);
    });
  }

  exportWebP(quality = 0.92): Promise<Blob> {
    return new Promise(resolve => {
      const exp = document.createElement('canvas');
      exp.width = this.width;
      exp.height = this.height;
      const ctx = exp.getContext('2d')!;

      const list = this._buildRenderTree(this.layers);
      for (const layer of list) {
        if (!layer.visible) continue;
        ctx.save();
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        
        ctx.translate(layer.x ?? 0, layer.y ?? 0);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        
        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }

      exp.toBlob(b => resolve(b!), 'image/webp', quality);
    });
  }

  destroy() {
    this.layers = [];
  }
}
