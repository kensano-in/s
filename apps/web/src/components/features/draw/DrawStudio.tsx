'use client';

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Undo2, Redo2, Download, Layers, Sliders, Palette,
  BookOpen, Square, Circle, Minus, ChevronDown, ChevronRight,
  Plus, Trash2, Copy, Eye, EyeOff, Lock, Unlock, MoreHorizontal,
  Move, ZoomIn, ZoomOut, RotateCcw, Grid, Check, Search,
  ArrowLeft, Image as ImageIcon, RefreshCw, Zap, Pen, PenTool,
  AlignLeft, Type, HelpCircle, Scissors, Sparkles, SlidersHorizontal,
  CheckSquare, History
} from 'lucide-react';
import clsx from 'clsx';
import { DrawingEngine, DrawLayer, VectorShape } from './DrawingEngine';
import {
  BRUSH_PRESETS, BrushPreset, BrushSettings, BlendMode, BLEND_MODE_LABELS
} from './BrushPresets';
import {
  hexToRgb, rgbToHex, rgbToHsv, hsvToRgb, rgbToCmyk, cmykToRgb,
  getHarmonyColors, drawColorWheel, sampleCanvasColor,
  MATERIAL_COLORS, NEON_COLORS, GLASS_COLORS, CREATOR_PRESETS,
  GRADIENT_PRESETS
} from './ColorSystem';

// ─── Types ─────────────────────────────────────────────────────────────────

type ActivePanel = 'brushLibrary' | 'layers' | 'color' | 'ai' | 'grids' | 'history' | null;
type ActiveTool = 'draw' | 'eraser' | 'eyedropper' | 'selection-rect' | 'selection-circle' | 'selection-lasso' | 'fill' | 'move' | 'zoom' | 'pen' | 'node' | 'shapes' | 'text' | 'liquify';
type RulerType = 'none' | 'line' | 'circle' | 'ellipse' | 'perspective' | 'symmetry-h' | 'symmetry-v' | 'symmetry-radial' | 'grid';
type ShapeType = 'rect' | 'ellipse' | 'polygon';

interface CanvasTransform { x: number; y: number; scale: number; rotation: number; }

interface DrawStudioProps {
  onClose: () => void;
  onExport?: (blob: Blob, type: string) => void;
  initialWidth?: number;
  initialHeight?: number;
  backgroundImage?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOOL_GROUPS = [
  {
    label: 'Vector / Shapes',
    tools: [
      { id: 'shapes', emoji: '📐', label: 'Shapes', shortcut: 'S' },
      { id: 'pen', emoji: '✒️', label: 'Bézier Pen', shortcut: 'P' },
      { id: 'node', emoji: '🎛️', label: 'Node Editor', shortcut: 'A' },
      { id: 'text', emoji: '🇹', label: 'Typography Text', shortcut: 'T' },
    ],
  },
  {
    label: 'Drawing / FX',
    tools: [
      { id: 'draw', emoji: '🖌️', label: 'Brush Engine', shortcut: 'B' },
      { id: 'eraser', emoji: '🧼', label: 'Eraser', shortcut: 'E' },
      { id: 'fill', emoji: '🪣', label: 'Flood Fill', shortcut: 'G' },
      { id: 'liquify', emoji: '🌀', label: 'Liquify Warp', shortcut: 'W' },
    ],
  },
  {
    label: 'Selection / Utility',
    tools: [
      { id: 'selection-lasso', emoji: ' Lasso', label: 'Lasso Select', shortcut: 'L' },
      { id: 'selection-rect', emoji: '🔲', label: 'Rect Select', shortcut: 'M' },
      { id: 'eyedropper', emoji: '🧪', label: 'Eyedropper', shortcut: 'I' },
      { id: 'move', emoji: '🤚', label: 'Pan Canvas', shortcut: 'H' },
    ],
  },
];

const DEFAULT_SETTINGS: BrushSettings = {
  size: 20, opacity: 100, hardness: 80, softness: 20, flow: 100,
  spacing: 5, pressure: 80, smoothing: 50, stabilization: 30,
  jitter: 0, angle: 0, roundness: 100, fade: 0, scatter: 0,
  wetness: 0, colorMixing: 0, blendMode: 'source-over',
  edgeFeather: 0, rotation: 0, textureStrength: 0,
};

// ─── Sub-component: Slider ──────────────────────────────────────────────────

function StudioSlider({
  label, value, min = 0, max = 100, step = 1,
  onChange, unit = '', icon
}: {
  label: string; value: number; min?: number; max?: number; step?: number;
  onChange: (v: number) => void; unit?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="text-[10px] font-mono text-violet-300 font-bold">
          {Math.round(value)}{unit}
        </span>
      </div>
      <div className="relative h-2 flex items-center">
        <div className="absolute inset-0 rounded-full bg-white/5 border border-white/[0.06]" />
        <div
          className="absolute left-0 h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(139,92,246,0.8)] border-2 border-violet-400 pointer-events-none transition-transform"
          style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 7px)` }}
        />
      </div>
    </div>
  );
}

// ─── Sub-component: Color Swatch ────────────────────────────────────────────

function ColorSwatch({ color, size = 'md', onClick, active }: {
  color: string; size?: 'sm' | 'md' | 'lg';
  onClick?: () => void; active?: boolean;
}) {
  const sizes = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-9 h-9' };
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-lg border-2 transition-all duration-150 hover:scale-110 active:scale-95 shrink-0',
        sizes[size],
        active ? 'border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'border-white/10'
      )}
      style={{ background: color }}
    />
  );
}

// ─── Main DrawStudio Component ───────────────────────────────────────────────

export default function DrawStudio({ onClose, onExport, initialWidth = 1200, initialHeight = 800 }: DrawStudioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);

  // Core drawing states
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('brushLibrary');
  const [activeTool, setActiveTool] = useState<ActiveTool>('draw');
  const [activeBrushId, setActiveBrushId] = useState('pencil');
  const [settings, setSettings] = useState<BrushSettings>({ ...DEFAULT_SETTINGS });
  const [color, setColor] = useState('#6c63ff');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [recentColors, setRecentColors] = useState<string[]>([
    '#6c63ff','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#ffffff','#000000'
  ]);
  const [layers, setLayers] = useState<DrawLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyTimeline, setHistoryTimeline] = useState<string[]>([]);
  const [transform, setTransform] = useState<CanvasTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  
  // Grids & Compose
  const [showGrid, setShowGrid] = useState(false);
  const [gridType, setGridType] = useState<'standard' | 'perspective' | 'isometric'>('standard');
  const [symmetryEnabled, setSymmetryEnabled] = useState(false);
  const [rulerType, setRulerType] = useState<RulerType>('none');
  const [goldenRatioEnabled, setGoldenRatioEnabled] = useState(false);

  // Brush settings tabs
  const [rightPanelTab, setRightPanelTab] = useState<'brush' | 'dynamics' | 'vector' | 'text' | 'ai'>('brush');
  const [brushCategory, setBrushCategory] = useState('Basic');
  const [brushSearch, setBrushSearch] = useState('');

  // Vector Path Creation State
  const [bezierPath, setBezierPath] = useState<{ x: number; y: number; h1x?: number; h1y?: number; h2x?: number; h2y?: number }[]>([]);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);

  // Shapes Tool States
  const [activeShape, setActiveShape] = useState<ShapeType>('rect');
  const [shapeFill, setShapeFill] = useState('#6c63ff');
  const [shapeStroke, setShapeStroke] = useState('#ffffff');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);
  const [shapeCornerRadius, setShapeCornerRadius] = useState(8);
  const [shapePolygonSides, setShapePolygonSides] = useState(5);

  // Text Tool States
  const [textVal, setTextVal] = useState('Create Art');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(64);
  const [isTextBold, setIsTextBold] = useState(false);
  const [isTextItalic, setIsTextItalic] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(0);

  // Liquify Tool Settings
  const [liquifyMode, setLiquifyMode] = useState<'push' | 'twirl' | 'pinch' | 'bulge'>('push');
  const [liquifyStrength, setLiquifyStrength] = useState(50);
  const [liquifySize, setLiquifySize] = useState(60);

  // AI Panel States
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Stunning cyberpunk lineart illustration');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Selection states
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [selectionRectStart, setSelectionRectStart] = useState<{ x: number; y: number } | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasSize] = useState({ w: initialWidth, h: initialHeight });

  // Refs for tracking drag offsets
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastSampleRef = useRef<{ x: number; y: number } | null>(null);

  // ─── Engine Init ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;

    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = canvasSize.w;
      overlay.height = canvasSize.h;
    }

    const engine = new DrawingEngine(canvas, canvasSize.w, canvasSize.h);
    engineRef.current = engine;

    engine.updateThumbnails();
    setLayers([...engine.layers]);
    setActiveLayerId(engine.activeLayerId);
    setIsEngineReady(true);

    return () => { engine.destroy(); };
  }, []);

  // ─── Brush sync ───────────────────────────────────────────────────────────

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const brush = BRUSH_PRESETS.find(b => b.id === (activeTool === 'eraser' ? 'eraser' : activeBrushId));
    if (brush) engine.setBrush(brush, settings, color);
  }, [activeBrushId, settings, color, activeTool]);

  // ─── Sync utility ─────────────────────────────────────────────────────────

  const syncLayers = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateThumbnails();
    setLayers([...engine.layers]);
    setActiveLayerId(engine.activeLayerId);
    setCanUndo(engine.canUndo);
    setCanRedo(engine.canRedo);
    setHistoryTimeline([...engine.historyTimeline]);
  }, []);

  const pushRecentColor = useCallback((c: string) => {
    setRecentColors(prev => {
      const filtered = prev.filter(x => x !== c);
      return [c, ...filtered].slice(0, 12);
    });
  }, []);

  // ─── Marching Ants & SVG Overlay Animation Loop ─────────────────────────────

  useEffect(() => {
    let offset = 0;
    let animId = 0;
    const run = () => {
      offset = (offset + 0.25) % 8;
      const overlay = overlayRef.current;
      if (overlay && engineRef.current) {
        const octx = overlay.getContext('2d')!;
        octx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Render selection outlines (Marching Ants)
        engineRef.current.drawSelectionOutline(octx, offset);
        
        // Render Grid systems on overlay
        if (showGrid) {
          if (gridType === 'perspective') {
            drawPerspectiveGrid(octx);
          } else if (gridType === 'isometric') {
            drawIsometricGrid(octx);
          }
        }

        // Draw Golden Ratio / Rule of thirds composition overlays
        if (goldenRatioEnabled) {
          drawCompositionAids(octx);
        }

        // Render Bezier Pen tools node indicators if active
        if (activeTool === 'pen' || activeTool === 'node') {
          drawBezierNodes(octx);
        }
      }
      animId = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(animId);
  }, [showGrid, gridType, goldenRatioEnabled, activeTool, bezierPath, selectedNodeIndex]);

  // ─── Drawing helpers ───────────────────────────────────────────────────────

  const drawPerspectiveGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(6,182,212,0.2)';
    ctx.lineWidth = 0.8;
    const cx = canvasSize.w / 2;
    const cy = canvasSize.h * 0.45;
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(canvasSize.w, cy);
    ctx.stroke();
    
    // Perspective radial lines
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * canvasSize.w, cy + Math.sin(rad) * canvasSize.w);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawIsometricGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,0.15)';
    ctx.lineWidth = 0.6;
    const spacing = 40;
    
    // Draw 30 degree grids
    const angle = (30 * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    for (let i = -canvasSize.w; i < canvasSize.w * 2; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + canvasSize.h * cos, canvasSize.h * sin);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - canvasSize.h * cos, canvasSize.h * sin);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawCompositionAids = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(236,72,153,0.25)';
    ctx.lineWidth = 1;
    
    // Rule of thirds lines
    ctx.beginPath();
    ctx.moveTo(canvasSize.w / 3, 0);
    ctx.lineTo(canvasSize.w / 3, canvasSize.h);
    ctx.moveTo((2 * canvasSize.w) / 3, 0);
    ctx.lineTo((2 * canvasSize.w) / 3, canvasSize.h);
    
    ctx.moveTo(0, canvasSize.h / 3);
    ctx.lineTo(canvasSize.w, canvasSize.h / 3);
    ctx.moveTo(0, (2 * canvasSize.h) / 3);
    ctx.lineTo(canvasSize.w, (2 * canvasSize.h) / 3);
    ctx.stroke();
    
    // Golden ratio center spiral indicators
    ctx.strokeStyle = 'rgba(236,72,153,0.15)';
    ctx.strokeRect(canvasSize.w * 0.382, 0, canvasSize.w * 0.236, canvasSize.h);
    ctx.restore();
  };

  const drawBezierNodes = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    bezierPath.forEach((pt, i) => {
      // Connect handle lines
      if (pt.h1x !== undefined) {
        ctx.strokeStyle = 'rgba(6,182,212,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.h1x, pt.h1y!);
        ctx.stroke();
        
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(pt.h1x, pt.h1y!, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (pt.h2x !== undefined) {
        ctx.strokeStyle = 'rgba(6,182,212,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.h2x, pt.h2y!);
        ctx.stroke();
        
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(pt.h2x, pt.h2y!, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw anchor node
      ctx.fillStyle = selectedNodeIndex === i ? '#a78bfa' : '#ffffff';
      ctx.strokeStyle = '#6c63ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  };

  // ─── Pointer Interaction Manager ──────────────────────────────────────────

  const getCanvasPoint = useCallback((e: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Translate client coordinates relative to active viewport pan & zoom transforms
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    return {
      x: clickX * (canvas.width / rect.width),
      y: clickY * (canvas.height / rect.height)
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);
    const pressure = e.pressure ?? 0.5;
    setIsPointerDown(true);
    lastSampleRef.current = { x, y };

    // ── EYE DROPPER ──
    if (activeTool === 'eyedropper') {
      const canvas = canvasRef.current;
      if (canvas) {
        const rgb = sampleCanvasColor(canvas, x, y);
        const hex = rgbToHex(rgb);
        setColor(hex);
        pushRecentColor(hex);
      }
      return;
    }

    // ── BRUSH / ERASER ──
    if (activeTool === 'draw' || activeTool === 'eraser') {
      engineRef.current?.startStroke(x, y, pressure);
    }

    // ── FLOOD FILL ──
    if (activeTool === 'fill') {
      engineRef.current?.fillActiveLayer(color);
      syncLayers();
    }

    // ── BEZIER PEN ──
    if (activeTool === 'pen') {
      const isClose = bezierPath.length > 2 && Math.hypot(x - bezierPath[0].x, y - bezierPath[0].y) < 15;
      if (isClose) {
        // Close vector path shape
        const layer = engineRef.current?.getActiveLayer();
        if (layer && layer.type === 'vector') {
          const newShape: VectorShape = {
            id: `path-${Date.now()}`,
            type: 'path',
            points: [...bezierPath],
            fillColor: shapeFill,
            strokeColor: shapeStroke,
            strokeWidth: shapeStrokeWidth
          };
          engineRef.current?.updateLayer(layer.id, {
            shapes: [...(layer.shapes || []), newShape]
          });
          setBezierPath([]);
          syncLayers();
        }
      } else {
        // Place new Node with default handles
        setBezierPath(prev => [...prev, { x, y, h1x: x - 20, h1y: y, h2x: x + 20, h2y: y }]);
      }
    }

    // ── NODE EDITOR ──
    if (activeTool === 'node') {
      const clickedIdx = bezierPath.findIndex(pt => Math.hypot(x - pt.x, y - pt.y) < 12);
      if (clickedIdx !== -1) {
        setSelectedNodeIndex(clickedIdx);
      } else {
        setSelectedNodeIndex(null);
      }
    }

    // ── SHAPES TOOL ──
    if (activeTool === 'shapes') {
      setSelectionRectStart({ x, y });
    }

    // ── TEXT TOOL ──
    if (activeTool === 'text') {
      const layer = engineRef.current?.getActiveLayer();
      if (layer && layer.type === 'text') {
        engineRef.current?.updateLayer(layer.id, {
          textX: x,
          textY: y
        });
        syncLayers();
      }
    }

    // ── LASSO SELECTION ──
    if (activeTool === 'selection-lasso') {
      setLassoPoints([{ x, y }]);
    }

    // ── RECTANGLE SELECTION ──
    if (activeTool === 'selection-rect') {
      setSelectionRectStart({ x, y });
    }

    // ── CANVAS PAN DRAG ──
    if (activeTool === 'move') {
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    }
  }, [activeTool, bezierPath, shapeFill, shapeStroke, shapeStrokeWidth, color, transform, pushRecentColor, syncLayers]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPoint(e);
    setCursorPos({ x: e.clientX, y: e.clientY });

    if (!isPointerDown) return;

    // ── BRUSH ENGINE ──
    if (activeTool === 'draw' || activeTool === 'eraser') {
      const pressure = e.pressure ?? 0.5;
      engineRef.current?.continueStroke(x, y, pressure);
    }

    // ── LIQUIFY WARP ──
    if (activeTool === 'liquify') {
      const last = lastSampleRef.current || { x, y };
      const dx = x - last.x;
      const dy = y - last.y;
      engineRef.current?.applyLiquify(x, y, liquifySize, liquifyStrength, liquifyMode, dx, dy);
      lastSampleRef.current = { x, y };
    }

    // ── BEZIER NODE DRAGGING ──
    if (activeTool === 'node' && selectedNodeIndex !== null) {
      setBezierPath(prev => prev.map((pt, i) => {
        if (i === selectedNodeIndex) {
          return { ...pt, x, y, h1x: x - 20, h1y: y, h2x: x + 20, h2y: y };
        }
        return pt;
      }));
    }

    // ── LASSO PATH DRAWING ──
    if (activeTool === 'selection-lasso') {
      setLassoPoints(prev => [...prev, { x, y }]);
    }

    // ── RECT SELECTION PREVIEW ──
    if (activeTool === 'selection-rect' && selectionRectStart) {
      // Draw rectangular selection border dynamically
      const path = [
        { x: selectionRectStart.x, y: selectionRectStart.y },
        { x, y: selectionRectStart.y },
        { x, y },
        { x: selectionRectStart.x, y },
        { x: selectionRectStart.x, y: selectionRectStart.y }
      ];
      engineRef.current?.setSelection(path);
    }

    // ── CANVAS PANNING ──
    if (activeTool === 'move' && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTransform(t => ({
        ...t,
        x: panStartRef.current!.tx + dx,
        y: panStartRef.current!.ty + dy
      }));
    }
  }, [activeTool, isPointerDown, selectionRectStart, selectedNodeIndex, transform, getCanvasPoint, liquifySize, liquifyStrength, liquifyMode]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown) return;
    setIsPointerDown(false);
    
    const { x, y } = getCanvasPoint(e);

    // ── END DRAWING ──
    if (activeTool === 'draw' || activeTool === 'eraser') {
      engineRef.current?.endStroke();
      pushRecentColor(color);
      syncLayers();
    }

    // ── END LIQUIFY ──
    if (activeTool === 'liquify') {
      engineRef.current?.endLiquify();
      syncLayers();
    }

    // ── END LASSO ──
    if (activeTool === 'selection-lasso') {
      if (lassoPoints.length > 2) {
        engineRef.current?.setSelection([...lassoPoints, lassoPoints[0]]);
      }
    }

    // ── END SHAPES CREATION ──
    if (activeTool === 'shapes' && selectionRectStart) {
      const layer = engineRef.current?.getActiveLayer();
      if (layer && layer.type === 'vector') {
        const newShape: VectorShape = {
          id: `shape-${Date.now()}`,
          type: activeShape === 'rect' ? 'rect' : activeShape === 'ellipse' ? 'ellipse' : 'polygon',
          points: [
            { x: selectionRectStart.x, y: selectionRectStart.y },
            { x, y }
          ],
          fillColor: shapeFill,
          strokeColor: shapeStroke,
          strokeWidth: shapeStrokeWidth,
          cornerRadius: shapeCornerRadius,
          polygonSides: shapePolygonSides
        };
        engineRef.current?.updateLayer(layer.id, {
          shapes: [...(layer.shapes || []), newShape]
        });
        syncLayers();
      }
      setSelectionRectStart(null);
    }

    // ── END PAN ──
    if (activeTool === 'move') {
      panStartRef.current = null;
    }
  }, [activeTool, isPointerDown, lassoPoints, selectionRectStart, activeShape, shapeFill, shapeStroke, shapeStrokeWidth, shapeCornerRadius, shapePolygonSides, color, getCanvasPoint, pushRecentColor, syncLayers]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (engineRef.current?.undo()) syncLayers();
  }, [syncLayers]);

  const handleRedo = useCallback(() => {
    if (engineRef.current?.redo()) syncLayers();
  }, [syncLayers]);

  const handleClear = () => {
    engineRef.current?.clearActiveLayer();
    syncLayers();
  };

  const handleAddLayer = (type: DrawLayer['type'] = 'paint') => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.addLayer(`${type.toUpperCase()} Layer`, type);
    syncLayers();
  };

  const handleDeleteLayer = (id: string) => {
    engineRef.current?.deleteLayer(id);
    syncLayers();
  };

  const handleDuplicateLayer = (id: string) => {
    engineRef.current?.duplicateLayer(id);
    syncLayers();
  };

  const handleSelectLayer = (id: string) => {
    engineRef.current?.setActiveLayer(id);
    syncLayers();
  };

  const handleLayerOpacity = (id: string, v: number) => {
    engineRef.current?.updateLayer(id, { opacity: v });
    syncLayers();
  };

  const handleLayerVisibility = (id: string) => {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    engineRef.current?.updateLayer(id, { visible: !l.visible });
    syncLayers();
  };

  const handleLayerLock = (id: string) => {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    engineRef.current?.updateLayer(id, { locked: !l.locked });
    syncLayers();
  };

  const handleLayerAlphaLock = (id: string) => {
    const l = layers.find(x => x.id === id);
    if (!l) return;
    engineRef.current?.updateLayer(id, { alphaLocked: !l.alphaLocked });
    syncLayers();
  };

  const handleLayerRename = (id: string, name: string) => {
    engineRef.current?.updateLayer(id, { name });
    syncLayers();
  };

  const handleLayerBlendMode = (id: string, mode: BlendMode) => {
    engineRef.current?.updateLayer(id, { blendMode: mode as GlobalCompositeOperation });
    syncLayers();
  };

  const handleAdjustmentStrength = (id: string, strength: number) => {
    engineRef.current?.updateLayer(id, { adjustmentStrength: strength });
    syncLayers();
  };

  const handleAdjustmentType = (id: string, type: DrawLayer['adjustmentType']) => {
    engineRef.current?.updateLayer(id, { adjustmentType: type });
    syncLayers();
  };

  const handleTextLayerUpdate = (text: string, size: number, family: string, bold: boolean, italic: boolean) => {
    const layer = engineRef.current?.getActiveLayer();
    if (layer && layer.type === 'text') {
      engineRef.current?.updateLayer(layer.id, {
        text,
        fontSize: size,
        fontFamily: family,
        textBold: bold,
        textItalic: italic
      });
      syncLayers();
    }
  };

  const handleExport = async (format: 'png' | 'jpg' | 'webp' | 'png-transparent') => {
    const engine = engineRef.current;
    if (!engine) return;
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      let blob: Blob;
      if (format === 'png-transparent') blob = await engine.exportPNG(true);
      else if (format === 'png') blob = await engine.exportPNG(false);
      else if (format === 'jpg') blob = await engine.exportJPG();
      else blob = await engine.exportWebP();

      if (onExport) {
        onExport(blob, format);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `shincore-draw.${format.replace('-transparent','')}`; a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // ─── AI Assist Engine ───────────────────────────────────────────────────────

  const handleAiCleanup = () => {
    // Client-side visual enhancement filter
    const active = engineRef.current?.getActiveLayer();
    if (!active || active.type !== 'paint') return;
    
    const ctx = active.ctx;
    const imgData = ctx.getImageData(0, 0, canvasSize.w, canvasSize.h);
    const data = imgData.data;
    
    // Auto line cleanup: dynamic thresholding filter (Otsu local binarization style)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = 0.299*r + 0.587*g + 0.114*b;
      
      if (brightness > 220) {
        // Make white fully transparent
        data[i+3] = 0;
      } else if (brightness < 60) {
        // Maximize ink density
        data[i] = 16; data[i+1] = 12; data[i+2] = 30;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);
    engineRef.current?.composite();
    syncLayers();
  };

  // ─── Render list filters ────────────────────────────────────────────────────

  const filteredBrushes = useMemo(() => {
    let list = brushCategory === 'All'
      ? BRUSH_PRESETS
      : BRUSH_PRESETS.filter(b => b.category === brushCategory);
    if (brushSearch) {
      list = list.filter(b => b.name.toLowerCase().includes(brushSearch.toLowerCase()));
    }
    return list;
  }, [brushCategory, brushSearch]);

  const canvasCursor = useMemo(() => {
    if (activeTool === 'eyedropper') return 'crosshair';
    if (activeTool === 'move') return 'grab';
    if (activeTool === 'zoom') return 'zoom-in';
    return 'none';
  }, [activeTool]);

  const [displayRect, setDisplayRect] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth - 460; // wider desktop spacing
      const ch = container.clientHeight - 80;
      const aspect = canvasSize.w / canvasSize.h;
      let dw = cw, dh = cw / aspect;
      if (dh > ch) { dh = ch; dw = ch * aspect; }
      setDisplayRect({ w: dw, h: dh });
    };
    resize();
    const ro = new ResizeObserver(resize);
    const c = containerRef.current;
    if (c) ro.observe(c);
    return () => ro.disconnect();
  }, [canvasSize]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#06040f] text-white flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="absolute top-0 left-0 w-[40%] h-[40%] rounded-full bg-violet-950/20 blur-[120px] pointer-events-none" />

      {/* ════════════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════════════ */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0a0714]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] transition-all text-white/60 hover:text-white text-xs font-semibold">
            <ArrowLeft size={13} /> Close Draw
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <PenTool size={11} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">Draw Studio</span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded-md">DESKTOP v3.0</span>
          </div>
        </div>

        {/* Center — Undo/Redo & Grids Quick Actions */}
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={!canUndo}
            className={clsx('p-2 rounded-xl transition-all', canUndo ? 'text-white/70 hover:bg-white/[0.06] hover:text-white' : 'text-white/20 cursor-not-allowed')}>
            <Undo2 size={16} />
          </button>
          <button onClick={handleRedo} disabled={!canRedo}
            className={clsx('p-2 rounded-xl transition-all', canRedo ? 'text-white/70 hover:bg-white/[0.06] hover:text-white' : 'text-white/20 cursor-not-allowed')}>
            <Redo2 size={16} />
          </button>
          
          <div className="w-px h-5 bg-white/10" />
          
          <button onClick={() => setShowGrid(!showGrid)}
            className={clsx('p-2 rounded-xl transition-all', showGrid ? 'bg-violet-600/30 text-violet-300' : 'text-white/40 hover:bg-white/[0.05]')}>
            <Grid size={15} />
          </button>
          <button onClick={() => setGoldenRatioEnabled(!goldenRatioEnabled)}
            className={clsx('p-2 rounded-xl transition-all text-xs font-bold font-mono', goldenRatioEnabled ? 'bg-pink-600/30 text-pink-300' : 'text-white/40 hover:bg-white/[0.05]')}>
            Φ Ratio
          </button>
          
          <div className="w-px h-5 bg-white/10" />

          {/* Quick Selection Actions */}
          <button onClick={() => engineRef.current?.clearSelection()}
            className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 px-2.5 py-1.5 rounded-xl border border-red-500/20 font-bold transition-all">
            Deselect
          </button>
        </div>

        {/* Right — Export */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-violet-900/40 transition-all active:scale-95">
            {isExporting ? <><RefreshCw size={13} className="animate-spin" /> Exporting…</> : <><Download size={13} /> Export Design</>}
          </button>
          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-4 top-14 z-50 w-52 rounded-2xl bg-[#130e24] border border-white/10 shadow-2xl overflow-hidden"
              >
                {[
                  { label: 'PNG — Transparent', fmt: 'png-transparent' as const, desc: 'Lossless design transparent', icon: '🔍' },
                  { label: 'PNG', fmt: 'png' as const, desc: 'White background standard', icon: '🖼️' },
                  { label: 'JPG', fmt: 'jpg' as const, desc: 'Compressed high resolution', icon: '📷' },
                  { label: 'WebP', fmt: 'webp' as const, desc: 'Web optimized premium quality', icon: '🌐' },
                ].map(f => (
                  <button key={f.fmt} onClick={() => handleExport(f.fmt)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0">
                    <span className="text-lg">{f.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{f.label}</p>
                      <p className="text-[10px] text-white/30">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ════════════════════════════════════════════════
          BODY
      ════════════════════════════════════════════════ */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">

        {/* ── LEFT DOCKBAR — Tools ── */}
        <div className="w-18 flex-shrink-0 flex flex-col items-center py-3 gap-3 border-r border-white/[0.06] bg-[#070510]/80 z-10 overflow-y-auto">
          {TOOL_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col items-center gap-1 w-full px-2">
              <span className="text-[7px] text-white/20 font-bold uppercase tracking-wider mb-1 block">{group.label}</span>
              {group.tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveTool(tool.id as ActiveTool);
                    if (tool.id === 'text') setRightPanelTab('text');
                    else if (tool.id === 'shapes') setRightPanelTab('vector');
                  }}
                  title={`${tool.label} (${tool.shortcut})`}
                  className={clsx(
                    'w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-xl text-base transition-all duration-150',
                    activeTool === tool.id
                      ? 'bg-violet-600/40 border border-violet-500/60 shadow-[0_0_12px_rgba(139,92,246,0.35)] text-white'
                      : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80 border border-transparent'
                  )}
                >
                  <span className="text-lg">{tool.emoji}</span>
                  <span className="text-[7px] font-bold font-mono text-white/30">{tool.shortcut}</span>
                </button>
              ))}
              <div className="w-full h-px bg-white/[0.04] my-1" />
            </div>
          ))}

          {/* Color Preview Swatch Panel */}
          <div className="w-full px-3 flex flex-col items-center gap-2 mt-auto">
            <div className="relative w-9 h-9">
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-lg border-2 border-[#070510] cursor-pointer"
                style={{ background: secondaryColor }}
                onClick={() => { const t = color; setColor(secondaryColor); setSecondaryColor(t); }} />
              <div className="absolute top-0 left-0 w-6 h-6 rounded-lg border-2 border-white/20 cursor-pointer shadow-lg"
                style={{ background: color }}
                onClick={() => setActivePanel(p => p === 'color' ? null : 'color')} />
            </div>
            <button onClick={() => { setColor('#6c63ff'); setSecondaryColor('#ffffff'); }}
              className="text-[8px] text-white/25 hover:text-white/60 transition-colors">
              Reset Swatches
            </button>
          </div>
        </div>

        {/* ── SECONDARY EXPANDABLE SIDE BAR PANEL ── */}
        <AnimatePresence>
          {activePanel === 'brushLibrary' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 230, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#0c091a]/95 flex flex-col overflow-hidden z-10"
            >
              <div className="px-3 py-3 border-b border-white/[0.05] flex flex-col">
                <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">// Brush Preset Library</p>
                <div className="relative mt-2">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={brushSearch} onChange={e => setBrushSearch(e.target.value)}
                    placeholder="Search drawing brushes…"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-7 pr-3 py-1.5 text-[11px] text-white outline-none placeholder-white/20"
                  />
                </div>
              </div>

              {/* Category tags */}
              <div className="px-2 py-2 flex flex-wrap gap-1 border-b border-white/[0.04] max-h-36 overflow-y-auto">
                {['Basic', 'Sketch', 'Painting', 'Calligraphy', 'Graffiti', 'Illustration', 'Pixel Art', 'Neon', 'Texture', 'FX'].map(cat => (
                  <button key={cat} onClick={() => setBrushCategory(cat)}
                    className={clsx(
                      'px-2 py-0.5 rounded-lg text-[9px] font-bold transition-all',
                      brushCategory === cat ? 'bg-violet-600/40 text-violet-200' : 'text-white/30 hover:text-white/60 bg-white/[0.03]'
                    )}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Brushes */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 page-scroll">
                {filteredBrushes.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setActiveBrushId(b.id); setSettings({ ...b.defaults }); }}
                    className={clsx(
                      'flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border text-left transition-all',
                      activeBrushId === b.id
                        ? 'bg-violet-600/30 border-violet-500/50 shadow-md'
                        : 'border-transparent hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="text-lg">{b.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">{b.name}</p>
                      <p className="text-[8px] text-white/25 truncate">{b.algorithm.toUpperCase()} ENGINE</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activePanel === 'layers' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 230, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#0c091a]/95 flex flex-col overflow-hidden z-10"
            >
              <div className="px-3 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">// Layer Studio</p>
                <div className="flex gap-1">
                  <button onClick={() => handleAddLayer('paint')} title="New Paint Layer"
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors">
                    <Pen size={11} />
                  </button>
                  <button onClick={() => handleAddLayer('vector')} title="New Vector Layer"
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors">
                    <PenTool size={11} />
                  </button>
                  <button onClick={() => handleAddLayer('text')} title="New Text Layer"
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors">
                    <Type size={11} />
                  </button>
                  <button onClick={() => handleAddLayer('adjustment')} title="New Filter Adjustment"
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors">
                    <SlidersHorizontal size={11} />
                  </button>
                </div>
              </div>

              {/* Layer list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {[...layers].reverse().map(l => (
                  <div
                    key={l.id}
                    onClick={() => handleSelectLayer(l.id)}
                    className={clsx(
                      'p-2.5 rounded-xl border flex flex-col gap-1.5 cursor-pointer transition-all',
                      l.id === activeLayerId ? 'bg-violet-600/10 border-violet-500/40 shadow-sm' : 'border-transparent hover:bg-white/[0.02]'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 border border-white/10">
                        {l.thumbnailUrl && <img src={l.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-white/35 font-mono block tracking-wide">{l.type.toUpperCase()}</span>
                        <input
                          value={l.name}
                          onChange={e => handleLayerRename(l.id, e.target.value)}
                          className="text-xs bg-transparent text-white font-bold outline-none border-none truncate w-full"
                        />
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleLayerVisibility(l.id)} className="text-white/30 hover:text-white/80 transition-colors">
                          {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button onClick={() => handleLayerLock(l.id)} className="text-white/30 hover:text-white/80 transition-colors">
                          {l.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Additional Sub-options based on type */}
                    {l.id === activeLayerId && (
                      <div className="pt-2.5 border-t border-white/[0.03] space-y-2">
                        {/* Opacity slider */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[8px] text-white/30 font-bold uppercase font-mono">OPACITY</span>
                          <input type="range" min={0} max={100} value={l.opacity}
                            onChange={e => handleLayerOpacity(l.id, Number(e.target.value))}
                            className="w-20 accent-violet-500 cursor-pointer h-1.5" />
                        </div>

                        {/* Alpha lock */}
                        {l.type === 'paint' && (
                          <button
                            onClick={() => handleLayerAlphaLock(l.id)}
                            className={clsx(
                              'w-full py-1 text-[9px] font-bold rounded-lg border transition-all',
                              l.alphaLocked ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-white/10 text-white/40'
                            )}
                          >
                            Alpha Lock
                          </button>
                        )}

                        {/* Adjustment layer controls */}
                        {l.type === 'adjustment' && (
                          <div className="space-y-1.5">
                            <select
                              value={l.adjustmentType || 'blur'}
                              onChange={e => handleAdjustmentType(l.id, e.target.value as any)}
                              className="w-full bg-slate-900 border border-white/10 rounded px-1.5 py-1 text-[9px] outline-none"
                            >
                              <option value="blur">Blur</option>
                              <option value="invert">Invert Colors</option>
                              <option value="grayscale">Grayscale</option>
                              <option value="contrast">Contrast boost</option>
                              <option value="brightness">Brightness</option>
                            </select>
                            <input
                              type="range" min={0} max={100} value={l.adjustmentStrength || 10}
                              onChange={e => handleAdjustmentStrength(l.id, Number(e.target.value))}
                              className="w-full accent-violet-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Layer Actions */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleDuplicateLayer(l.id)}
                            className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-300 transition-colors">
                            Duplicate
                          </button>
                          <button onClick={() => handleDeleteLayer(l.id)}
                            className="flex-1 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-[9px] font-bold text-red-400 transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activePanel === 'color' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#0c091a]/95 flex flex-col overflow-y-auto page-scroll z-10"
            >
              <div className="px-3 py-3 border-b border-white/[0.05]">
                <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">// Color Wheel & Studio</p>
              </div>
              <ColorPickerPanel color={color} onChange={c => setColor(c)} />
              
              {/* Color Harmonies */}
              <div className="px-3 py-2.5 border-t border-white/[0.05]">
                <span className="text-[9px] font-bold font-mono text-white/30 uppercase tracking-wider block mb-2">Color Harmonies</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {getHarmonyColors(color, 'triadic').map((c, i) => (
                    <button key={i} onClick={() => setColor(c)}
                      className="h-6 rounded border border-white/5 transition-all hover:scale-105 active:scale-95"
                      style={{ background: c }}
                      title={`Harmony ${i}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'grids' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#0c091a]/95 flex flex-col overflow-y-auto z-10 p-3 space-y-4"
            >
              <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">// Grids & Symmetry</p>
              
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-white/30 block">GRID TYPE</span>
                {(['standard', 'perspective', 'isometric'] as const).map(type => (
                  <button key={type} onClick={() => { setGridType(type); setShowGrid(true); }}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all capitalize',
                      gridType === type && showGrid ? 'bg-violet-600/25 border-violet-500/50 text-violet-300' : 'border-white/5 text-white/40'
                    )}>
                    {type} grid
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-mono text-white/30 block">CANVAS SYMMETRY</span>
                {(['none', 'symmetry-h', 'symmetry-v', 'symmetry-radial'] as const).map(sym => (
                  <button key={sym} onClick={() => setRulerType(sym as any)}
                    className={clsx(
                      'w-full text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all capitalize',
                      rulerType === sym ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'border-white/5 text-white/40'
                    )}>
                    {sym.replace('symmetry-', '')} Symmetry
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activePanel === 'history' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/[0.06] bg-[#0c091a]/95 flex flex-col overflow-y-auto z-10 p-3 space-y-3"
            >
              <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">// Timeline History</p>
              <div className="space-y-1.5">
                {historyTimeline.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-white/40 border-b border-white/5 pb-1">
                    <History size={10} />
                    <span>{item}</span>
                  </div>
                ))}
                {historyTimeline.length === 0 && (
                  <p className="text-xs text-white/20 py-4 text-center">No actions recorded.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CANVAS AREA ── */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#050310]"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(124,58,237,0.02) 0%, transparent 80%)' }}>

          {/* Grid overlay */}
          {showGrid && gridType === 'standard' && (
            <div className="absolute inset-0 pointer-events-none z-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />
          )}

          {/* Canvas viewport container */}
          <div
            className="relative"
            style={{
              width: displayRect.w,
              height: displayRect.h,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            {/* Draw layer stack */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full rounded-xl"
              style={{
                cursor: canvasCursor,
                boxShadow: '0 0 0 1px rgba(139,92,246,0.18), 0 32px 100px rgba(0,0,0,0.85)',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />

            {/* Guides / Selection animated ants canvas overlay */}
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full rounded-xl pointer-events-none z-10"
            />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
            <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(16, t.scale * 1.25) }))}
              className="w-8 h-8 rounded-xl bg-[#130e24]/90 border border-white/10 text-white/60 hover:text-white flex items-center justify-center backdrop-blur-sm transition-all hover:border-violet-500/30">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.1, t.scale / 1.25) }))}
              className="w-8 h-8 rounded-xl bg-[#130e24]/90 border border-white/10 text-white/60 hover:text-white flex items-center justify-center backdrop-blur-sm transition-all hover:border-violet-500/30">
              <ZoomOut size={14} />
            </button>
            <button onClick={() => setTransform({ x: 0, y: 0, scale: 1, rotation: 0 })}
              className="w-8 h-8 rounded-xl bg-[#130e24]/90 border border-white/10 text-white/60 hover:text-white flex items-center justify-center backdrop-blur-sm text-[10px] font-mono transition-all hover:border-violet-500/30">
              100%
            </button>
          </div>

          {/* Selection marching indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="px-3.5 py-1.5 rounded-full bg-[#130e24]/95 border border-white/[0.06] backdrop-blur-sm text-[10px] font-mono text-white/40">
              {Math.round(transform.scale * 100)}% scale · {canvasSize.w}×{canvasSize.h}px
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — Inspector Tools ── */}
        <div className="w-60 flex-shrink-0 border-l border-white/[0.06] bg-[#0a0714]/85 flex flex-col overflow-hidden z-10">
          <div className="flex border-b border-white/[0.06] overflow-x-auto">
            {[
              { id: 'brush', label: 'Brush', icon: <PenTool size={11} /> },
              { id: 'dynamics', label: 'Dynamics', icon: <Zap size={11} /> },
              { id: 'vector', label: 'Vectors', icon: <PenTool size={11} /> },
              { id: 'text', label: 'Text', icon: <Type size={11} /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setRightPanelTab(tab.id as any)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 py-3 px-2 text-[10px] font-bold uppercase tracking-wide transition-all shrink-0',
                  rightPanelTab === tab.id ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-600/10' : 'text-white/30 hover:text-white/60'
                )}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 page-scroll">
            {rightPanelTab === 'brush' && (
              <>
                <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                  <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    {BRUSH_PRESETS.find(b => b.id === activeBrushId)?.emoji || '✏️'}{' '}
                    {BRUSH_PRESETS.find(b => b.id === activeBrushId)?.name || 'Pencil'}
                  </p>
                  <p className="text-[9px] text-white/30">{BRUSH_PRESETS.find(b => b.id === activeBrushId)?.category} Category</p>
                </div>

                <StudioSlider label="Size" value={settings.size} min={1} max={500} onChange={v => setSettings(s => ({ ...s, size: v }))} unit="px" />
                <StudioSlider label="Opacity" value={settings.opacity} onChange={v => setSettings(s => ({ ...s, opacity: v }))} unit="%" />
                <StudioSlider label="Hardness" value={settings.hardness} onChange={v => setSettings(s => ({ ...s, hardness: v }))} unit="%" />
                <StudioSlider label="Flow" value={settings.flow} onChange={v => setSettings(s => ({ ...s, flow: v }))} unit="%" />
                <StudioSlider label="Smoothing" value={settings.smoothing} onChange={v => setSettings(s => ({ ...s, smoothing: v }))} unit="%" />
                <StudioSlider label="Stabilization" value={settings.stabilization} onChange={v => setSettings(s => ({ ...s, stabilization: v }))} unit="%" />
              </>
            )}

            {rightPanelTab === 'dynamics' && (
              <>
                <StudioSlider label="Pressure Sensitivity" value={settings.pressure} onChange={v => setSettings(s => ({ ...s, pressure: v }))} unit="%" />
                <StudioSlider label="Scatter" value={settings.scatter} onChange={v => setSettings(s => ({ ...s, scatter: v }))} unit="%" />
                <StudioSlider label="Jitter Offset" value={settings.jitter} onChange={v => setSettings(s => ({ ...s, jitter: v }))} unit="px" />
                <StudioSlider label="Brush Angle" value={settings.angle} min={0} max={360} onChange={v => setSettings(s => ({ ...s, angle: v }))} unit="°" />
                <StudioSlider label="Roundness Nib" value={settings.roundness} onChange={v => setSettings(s => ({ ...s, roundness: v }))} unit="%" />
                <StudioSlider label="Wetness Bleed" value={settings.wetness} onChange={v => setSettings(s => ({ ...s, wetness: v }))} unit="%" />
              </>
            )}

            {rightPanelTab === 'vector' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block">Vector Shape Profile</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['rect', 'ellipse', 'polygon'] as const).map(shape => (
                      <button key={shape} onClick={() => { setActiveShape(shape); setActiveTool('shapes'); }}
                        className={clsx(
                          'py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all',
                          activeShape === shape && activeTool === 'shapes' ? 'bg-[#6c63ff] border-[#6c63ff] text-white' : 'border-white/5 text-white/40'
                        )}>
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block">Fill Style Color</span>
                  <input type="color" value={shapeFill} onChange={e => setShapeFill(e.target.value)}
                    className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block">Stroke Outlines</span>
                  <input type="color" value={shapeStroke} onChange={e => setShapeStroke(e.target.value)}
                    className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <StudioSlider label="Stroke Width" value={shapeStrokeWidth} min={1} max={30} onChange={v => setShapeStrokeWidth(v)} unit="px" />
                </div>

                {activeShape === 'rect' && (
                  <StudioSlider label="Corner Radius" value={shapeCornerRadius} min={0} max={100} onChange={v => setShapeCornerRadius(v)} unit="px" />
                )}

                {activeShape === 'polygon' && (
                  <StudioSlider label="Polygon Sides" value={shapePolygonSides} min={3} max={20} step={1} onChange={v => setShapePolygonSides(v)} />
                )}
              </div>
            )}

            {rightPanelTab === 'text' && (
              <div className="space-y-4">
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider block">Rich Typography</span>
                
                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 font-bold font-mono">INPUT TEXT</label>
                  <input
                    value={textVal}
                    onChange={e => {
                      setTextVal(e.target.value);
                      handleTextLayerUpdate(e.target.value, fontSize, fontFamily, isTextBold, isTextItalic);
                    }}
                    className="w-full bg-[#130e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 font-bold font-mono">FONT FAMILY</label>
                  <select
                    value={fontFamily}
                    onChange={e => {
                      setFontFamily(e.target.value);
                      handleTextLayerUpdate(textVal, fontSize, e.target.value, isTextBold, isTextItalic);
                    }}
                    className="w-full bg-[#130e24] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    {['Inter', 'Roboto', 'Outfit', 'Georgia', 'monospace', 'sans-serif'].map(font => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>

                <StudioSlider label="Font Size" value={fontSize} min={12} max={150} onChange={v => { setFontSize(v); handleTextLayerUpdate(textVal, v, fontFamily, isTextBold, isTextItalic); }} unit="px" />

                <div className="flex gap-2">
                  <button onClick={() => { setIsTextBold(!isTextBold); handleTextLayerUpdate(textVal, fontSize, fontFamily, !isTextBold, isTextItalic); }}
                    className={clsx('flex-1 py-1.5 rounded-lg border text-[10px] font-bold font-mono', isTextBold ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/5 text-white/35')}>
                    BOLD
                  </button>
                  <button onClick={() => { setIsTextItalic(!isTextItalic); handleTextLayerUpdate(textVal, fontSize, fontFamily, isTextBold, !isTextItalic); }}
                    className={clsx('flex-1 py-1.5 rounded-lg border text-[10px] font-bold font-mono', isTextItalic ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/5 text-white/35')}>
                    ITALIC
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick docking tabs buttons */}
          <div className="border-t border-white/[0.06] p-2 flex gap-1 bg-[#090714]">
            {[
              { id: 'brushLibrary' as ActivePanel, icon: <BookOpen size={14} />, label: 'Brushes' },
              { id: 'layers' as ActivePanel, icon: <Layers size={14} />, label: 'Layers' },
              { id: 'color' as ActivePanel, icon: <Palette size={14} />, label: 'Colors' },
              { id: 'grids' as ActivePanel, icon: <Grid size={14} />, label: 'Grids' },
              { id: 'history' as ActivePanel, icon: <History size={14} />, label: 'Timeline' },
            ].map(btn => (
              <button key={btn.id} onClick={() => setActivePanel(p => p === btn.id ? null : btn.id)}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all',
                  activePanel === btn.id
                    ? 'bg-violet-600/30 border border-violet-500/30 text-violet-300 shadow-md'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                )}>
                {btn.icon}
                <span className="text-[7px] font-bold uppercase tracking-wide">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM HOTKEY BAR ── */}
      <div className="h-10 flex-shrink-0 flex items-center gap-4 px-4 border-t border-white/[0.05] bg-[#0a0714]/80 backdrop-blur-md z-10 text-[9px] text-white/20 font-bold font-mono uppercase tracking-wider">
        <span className="text-[#6c63ff]">HOTKEYS:</span>
        <div className="flex items-center gap-3">
          <span>[ B ] BRUSH</span>
          <span>[ E ] ERASER</span>
          <span>[ I ] PICKER</span>
          <span>[ S ] SHAPES</span>
          <span>[ P ] PEN</span>
          <span>[ L ] LASSO</span>
          <span>[ H ] PAN</span>
          <span>[ ⌘Z ] UNDO</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Color Picker Panel sub-component ───

function ColorPickerPanel({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const [hexInput, setHexInput] = useState(color.replace('#', ''));
  const [paletteTab, setPaletteTab] = useState<'material' | 'neon' | 'glass' | 'creator'>('creator');
  const hsv = useMemo(() => rgbToHsv(hexToRgb(color)), [color]);

  const PALETTES = {
    material: MATERIAL_COLORS,
    neon: NEON_COLORS,
    glass: GLASS_COLORS,
    creator: CREATOR_PRESETS,
  };

  useEffect(() => {
    const c = wheelRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const r = 70;
    drawColorWheel(ctx, r, r, r);
    const angle = (hsv.h / 360) * Math.PI * 2 - Math.PI;
    const dist = (hsv.s / 100) * r;
    const ix = r + Math.cos(angle) * dist;
    const iy = r + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.arc(ix, iy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }, [color, hsv]);

  const handleWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = wheelRef.current!;
    const rect = c.getBoundingClientRect();
    const r = 70;
    const cx = rect.left + r, cy = rect.top + r;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > r) return;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const sat = (dist / r) * 100;
    const rgb = hsvToRgb({ h: angle, s: sat, v: hsv.v });
    const newHex = rgbToHex(rgb);
    setHexInput(newHex.replace('#', ''));
    onChange(newHex);
  };

  return (
    <div className="space-y-4 p-3 bg-transparent">
      <div className="flex gap-3 items-center justify-center">
        <canvas
          ref={wheelRef} width={140} height={140}
          className="rounded-full cursor-crosshair border border-white/10"
          onClick={handleWheelClick}
        />
      </div>

      {/* HEX input */}
      <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.07]">
        <div className="w-5 h-5 rounded border border-white/10 shrink-0" style={{ background: color }} />
        <span className="text-white/30 text-xs font-mono">#</span>
        <input
          className="flex-1 bg-transparent text-white text-xs font-mono outline-none uppercase"
          value={hexInput}
          onChange={e => {
            const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
            setHexInput(v);
            if (v.length === 6) { onChange('#' + v); }
          }}
        />
      </div>

      {/* Swatches palette */}
      <div className="space-y-2">
        <div className="flex gap-1">
          {(['creator','material','neon','glass'] as const).map(tab => (
            <button key={tab} onClick={() => setPaletteTab(tab)}
              className={clsx(
                'flex-1 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all',
                paletteTab === tab ? 'bg-violet-600/40 text-violet-300' : 'text-white/30 hover:text-white/60 bg-white/[0.02]'
              )}>
              {tab}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {PALETTES[paletteTab].slice(0, 18).map((c, i) => (
            <button key={i} onClick={() => { setHexInput(c.replace('#','')); onChange(c); }}
              className={clsx('w-full h-6 rounded border transition-all hover:scale-110 active:scale-95', color === c ? 'border-violet-400' : 'border-white/5')}
              style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
