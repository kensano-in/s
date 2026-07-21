'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Undo2, Redo2, Check, RotateCcw, Trash2, Pencil, PenTool, 
  Eraser, Sliders, Layers, Eye, EyeOff, Lock, Unlock, Settings, 
  Ruler, Sparkles, ZoomIn, ZoomOut, RotateCw, Plus, Copy, Palette, 
  Pipette, CornerUpLeft, CornerUpRight
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface BasicDrawProps {
  onClose: () => void;
  onExport: (blob: Blob) => void;
  initialWidth?: number;
  initialHeight?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface BrushConfig {
  id: 'pencil' | 'pen' | 'marker' | 'neon' | 'glow' | 'eraser';
  name: string;
  icon: any;
  description: string;
  size: number;
  opacity: number; // 0 to 1
  flow: number; // 0 to 1
  hardness: number; // 0 to 1
  smoothing: number; // 0 to 1
  spacing: number;
  blendMode: GlobalCompositeOperation;
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 100
}

const DEFAULT_BRUSHES: Record<string, BrushConfig> = {
  pencil: {
    id: 'pencil',
    name: 'Pencil',
    icon: Pencil,
    description: 'Textured, pressure-sensitive sketching graphite.',
    size: 8,
    opacity: 0.85,
    flow: 0.9,
    hardness: 0.5,
    smoothing: 0.4,
    spacing: 1,
    blendMode: 'source-over'
  },
  pen: {
    id: 'pen',
    name: 'Calligraphy Pen',
    icon: PenTool,
    description: 'Clean solid vector-like ink strokes.',
    size: 10,
    opacity: 1,
    flow: 1,
    hardness: 0.9,
    smoothing: 0.5,
    spacing: 1,
    blendMode: 'source-over'
  },
  marker: {
    id: 'marker',
    name: 'Chisel Marker',
    icon: Palette,
    description: 'Semi-translucent overlapping creative marker.',
    size: 26,
    opacity: 0.55,
    flow: 0.6,
    hardness: 0.4,
    smoothing: 0.3,
    spacing: 2,
    blendMode: 'multiply'
  },
  neon: {
    id: 'neon',
    name: 'Neon Glowing Tube',
    icon: Sparkles,
    description: 'Bright electric outer glow with solid white core.',
    size: 16,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    smoothing: 0.5,
    spacing: 1,
    blendMode: 'source-over'
  },
  glow: {
    id: 'glow',
    name: 'Orion Glow Ribbon',
    icon: Sparkles,
    description: 'Diffuse light radial gradient path blending.',
    size: 45,
    opacity: 0.3,
    flow: 0.4,
    hardness: 0.1,
    smoothing: 0.6,
    spacing: 3,
    blendMode: 'screen'
  },
  eraser: {
    id: 'eraser',
    name: 'Eraser',
    icon: Eraser,
    description: 'Pixel-level destructive alpha clearing.',
    size: 28,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    smoothing: 0.2,
    spacing: 1,
    blendMode: 'destination-out'
  }
};

const PALETTE_PAGES = [
  // Page 1: Classic Instagram swatches
  ['#ffffff', '#000000', '#ff2d55', '#ff9500', '#ffcc00', '#4cd964', '#5ac8fa', '#5856d6', '#af52de', '#ef5777'],
  // Page 2: Soft Aesthetics / Pastels
  ['#ffcccc', '#ffe9cc', '#ffffcc', '#d5fcc2', '#c2f9fc', '#c2d5fc', '#ebd0fc', '#fcc2f8', '#eceff1', '#cfd8dc'],
  // Page 3: Electric Neons / Cyberpunk
  ['#ff0055', '#ff5e00', '#e5ff00', '#39ff14', '#00f5ff', '#0033ff', '#bd00ff', '#ff00cc', '#9d00ff', '#3d0066']
];

export default function BasicDraw({ 
  onClose, 
  onExport, 
  initialWidth = 1080, 
  initialHeight = 1350,
  mediaUrl,
  mediaType = 'image'
}: BasicDrawProps) {
  // Core Drawing States
  const [activeBrush, setActiveBrush] = useState<BrushConfig['id']>('pen');
  const [brushes, setBrushes] = useState<Record<string, BrushConfig>>(DEFAULT_BRUSHES);
  const currentBrush = brushes[activeBrush];
  const [brushColor, setBrushColor] = useState('#ffffff');
  
  // Viewport Sizing (matches media dimensions dynamically)
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
  // History & Layers
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: 'Drawing Layer', visible: true, locked: false, opacity: 100 }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [history, setHistory] = useState<{ layers: { id: string; dataUrl: string }[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Multi-page Palette & Symmetry Mode states
  const [activePalettePage, setActivePalettePage] = useState(0);
  const [symmetryMode, setSymmetryMode] = useState<'none' | 'vertical' | 'horizontal'>('none');

  // Panel States
  const [showBrushSelectorSheet, setShowBrushSelectorSheet] = useState(false);
  const [showLayersSheet, setShowLayersSheet] = useState(false);
  const [stabilizerLevel, setStabilizerLevel] = useState<'off' | 'low' | 'med' | 'high' | 'pro'>('med');
  const [shapeRecognition, setShapeRecognition] = useState(true);
  
  // Eyedropper & Drag Sizer
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const [eyedropperColor, setEyedropperColor] = useState('#ffffff');
  const [eyedropperCoords, setEyedropperCoords] = useState({ x: 0, y: 0 });
  
  const [isResizingBrush, setIsResizingBrush] = useState(false);
  const sizeSliderRef = useRef<HTMLDivElement>(null);
  
  // HUD
  const [hudMessage, setHudMessage] = useState('');
  const [hudVisible, setHudVisible] = useState(false);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // References
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);

  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number; p: number } | null>(null);
  const strokePoints = useRef<{ x: number; y: number; p: number }[]>([]);
  const pointerDownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStartCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Trigger HUD message
  const triggerHud = (message: string) => {
    setHudMessage(message);
    setHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHudVisible(false);
    }, 1800);
  };

  // Adjust canvas size to fit window viewport and match media aspect ratio
  const recalculateCanvasSize = () => {
    const marginW = 32;
    const marginH = 180; // top & bottom bar paddings
    const maxW = window.innerWidth - marginW;
    const maxH = window.innerHeight - marginH;

    let mediaAspect = 4 / 5; // default Instagram aspect ratio
    if (mediaRef.current) {
      if (mediaType === 'video') {
        const v = mediaRef.current as HTMLVideoElement;
        if (v.videoWidth) mediaAspect = v.videoWidth / v.videoHeight;
      } else {
        const img = mediaRef.current as HTMLImageElement;
        if (img.naturalWidth) mediaAspect = img.naturalWidth / img.naturalHeight;
      }
    }

    let w = maxW;
    let h = maxW / mediaAspect;

    if (h > maxH) {
      h = maxH;
      w = maxH * mediaAspect;
    }

    setCanvasSize({ width: Math.round(w), height: Math.round(h) });
  };

  useEffect(() => {
    recalculateCanvasSize();
    window.addEventListener('resize', recalculateCanvasSize);
    return () => window.removeEventListener('resize', recalculateCanvasSize);
  }, [mediaLoaded]);

  // Load handler
  const handleMediaLoad = () => {
    setMediaLoaded(true);
    recalculateCanvasSize();
    setTimeout(() => {
      saveHistoryState();
    }, 100);
  };

  // History states
  const saveHistoryState = () => {
    const layerSnapshots = layers.map(layer => {
      const canvas = canvasRefs.current[layer.id];
      return {
        id: layer.id,
        dataUrl: canvas ? canvas.toDataURL() : ''
      };
    });
    
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, { layers: layerSnapshots }].slice(-20);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    restoreHistoryState(prevIndex);
    setHistoryIndex(prevIndex);
    triggerHud('Undo');
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    restoreHistoryState(nextIndex);
    setHistoryIndex(nextIndex);
    triggerHud('Redo');
  };

  const restoreHistoryState = (index: number) => {
    const state = history[index];
    if (!state) return;
    state.layers.forEach(snap => {
      const canvas = canvasRefs.current[snap.id];
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && snap.dataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = snap.dataUrl;
      }
    });
  };

  // Coordinates helper
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (overlay.width / rect.width),
      y: (clientY - rect.top) * (overlay.height / rect.height)
    };
  };

  // Stabilizer formula
  const getStabilizedPoint = (
    nextPoint: { x: number; y: number; p: number },
    points: { x: number; y: number; p: number }[]
  ): { x: number; y: number; p: number } => {
    if (stabilizerLevel === 'off' || points.length === 0) return nextPoint;
    let weight = 0.5; // low
    if (stabilizerLevel === 'med') weight = 0.35;
    if (stabilizerLevel === 'high') weight = 0.18;
    if (stabilizerLevel === 'pro') weight = 0.08;

    const last = points[points.length - 1];
    return {
      x: last.x + (nextPoint.x - last.x) * weight,
      y: last.y + (nextPoint.y - last.y) * weight,
      p: last.p + (nextPoint.p - last.p) * weight
    };
  };

  // Render segments
  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    p1: { x: number; y: number; p: number },
    p2: { x: number; y: number; p: number },
    brush: BrushConfig,
    color: string
  ) => {
    const drawStroke = (
      pt1: { x: number; y: number; p: number },
      pt2: { x: number; y: number; p: number }
    ) => {
      ctx.save();
      ctx.globalAlpha = brush.opacity;
      ctx.globalCompositeOperation = brush.blendMode;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const size = brush.size * (pt2.p || 0.6);

      if (brush.id === 'neon') {
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 1.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.3;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      } else if (brush.id === 'glow') {
        const grad = ctx.createRadialGradient(pt2.x, pt2.y, 0, pt2.x, pt2.y, size);
        grad.addColorStop(0, color);
        grad.addColorStop(0.3, color + 'cc');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      } else if (brush.id === 'pencil') {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
        
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = color;
        for (let i = 0; i < 4; i++) {
          const gx = pt2.x + (Math.random() - 0.5) * size;
          const gy = pt2.y + (Math.random() - 0.5) * size;
          ctx.fillRect(gx, gy, 1.5, 1.5);
        }
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
      ctx.restore();
    };

    // Draw main stroke
    drawStroke(p1, p2);

    // Apply mirror reflection symmetry
    if (symmetryMode === 'vertical') {
      const mirrorP1 = { ...p1, x: canvasSize.width - p1.x };
      const mirrorP2 = { ...p2, x: canvasSize.width - p2.x };
      drawStroke(mirrorP1, mirrorP2);
    } else if (symmetryMode === 'horizontal') {
      const mirrorP1 = { ...p1, y: canvasSize.height - p1.y };
      const mirrorP2 = { ...p2, y: canvasSize.height - p2.y };
      drawStroke(mirrorP1, mirrorP2);
    }
  };

  // Shape Snapping
  const recognizeShapeAndDraw = (points: { x: number; y: number; p: number }[]) => {
    if (points.length < 12) return false;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    const start = points[0];
    const end = points[points.length - 1];
    const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y);

    let pathLen = 0;
    for (let i = 1; i < points.length; i++) {
      pathLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }

    const activeLayerCanvas = canvasRefs.current[activeLayerId];
    const ctx = activeLayerCanvas?.getContext('2d');
    if (!activeLayerCanvas || !ctx) return false;

    // Circle
    const averageRadius = (w + h) / 4;
    let deviationSum = 0;
    points.forEach(p => {
      const r = Math.hypot(p.x - cx, p.y - cy);
      deviationSum += Math.abs(r - averageRadius);
    });
    const avgDeviation = deviationSum / points.length;
    const circularity = avgDeviation / averageRadius;

    if (circularity < 0.12 && distStartEnd < averageRadius * 0.9) {
      ctx.save();
      ctx.globalAlpha = currentBrush.opacity;
      ctx.globalCompositeOperation = currentBrush.blendMode;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = currentBrush.size;
      ctx.beginPath();
      ctx.arc(cx, cy, averageRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      triggerHud('Perfect Circle Auto-Recognized');
      return true;
    }

    // Rectangle
    const perimeter = 2 * (w + h);
    const boxDifference = Math.abs(pathLen - perimeter) / perimeter;
    if (boxDifference < 0.18 && distStartEnd < (w + h) * 0.25) {
      ctx.save();
      ctx.globalAlpha = currentBrush.opacity;
      ctx.globalCompositeOperation = currentBrush.blendMode;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = currentBrush.size;
      ctx.beginPath();
      ctx.rect(minX, minY, w, h);
      ctx.stroke();
      ctx.restore();
      triggerHud('Rectangle Auto-Recognized');
      return true;
    }

    // Arrow
    if (distStartEnd > (w + h) * 0.6) {
      const arrowLineAngle = Math.atan2(end.y - start.y, end.x - start.x);
      let arrowHeadCount = 0;
      const headPoints = points.slice(-Math.floor(points.length * 0.35));
      for (let i = 1; i < headPoints.length; i++) {
        const segAngle = Math.atan2(headPoints[i].y - headPoints[i - 1].y, headPoints[i].x - headPoints[i - 1].x);
        const diff = Math.abs(arrowLineAngle - segAngle);
        if (diff > Math.PI * 0.65 && diff < Math.PI * 1.35) {
          arrowHeadCount++;
        }
      }
      if (arrowHeadCount > 1) {
        ctx.save();
        ctx.globalAlpha = currentBrush.opacity;
        ctx.globalCompositeOperation = currentBrush.blendMode;
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = currentBrush.size;
        ctx.lineJoin = 'miter';
        
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const headLength = Math.min(22, Math.hypot(w, h) * 0.22);
        const angle1 = arrowLineAngle - Math.PI * 0.83;
        const angle2 = arrowLineAngle + Math.PI * 0.83;
        ctx.beginPath();
        ctx.moveTo(end.x + headLength * Math.cos(angle1), end.y + headLength * Math.sin(angle1));
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(end.x + headLength * Math.cos(angle2), end.y + headLength * Math.sin(angle2));
        ctx.stroke();
        ctx.restore();
        triggerHud('Arrow Auto-Recognized');
        return true;
      }
    }

    return false;
  };

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);

    // Eyedropper action overrides drawing
    if (isEyedropperActive) {
      sampleColorAtCursor(e.clientX, e.clientY);
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    isDrawing.current = true;
    const initialPoint = { x: coords.x, y: coords.y, p: e.pressure || 0.55 };
    lastPoint.current = initialPoint;
    strokePoints.current = [initialPoint];

    // Long press setup for Instagram-style canvas flood-fill
    pointerStartCoordsRef.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (isDrawing.current && lastPoint.current) {
        const activeLayerCanvas = canvasRefs.current[activeLayerId];
        const ctx = activeLayerCanvas?.getContext('2d');
        if (activeLayerCanvas && ctx) {
          ctx.save();
          if (activeBrush === 'eraser') {
            ctx.clearRect(0, 0, activeLayerCanvas.width, activeLayerCanvas.height);
            triggerHud('Canvas Cleared via Eraser Fill');
          } else {
            ctx.fillStyle = brushColor;
            ctx.globalCompositeOperation = currentBrush.blendMode;
            ctx.globalAlpha = activeBrush === 'marker' ? 0.55 : currentBrush.opacity;
            ctx.fillRect(0, 0, activeLayerCanvas.width, activeLayerCanvas.height);
            triggerHud(`Canvas Filled: ${brushColor}`);
          }
          ctx.restore();
          saveHistoryState();
          
          // Terminate current drawing stroke immediately
          isDrawing.current = false;
          lastPoint.current = null;
          strokePoints.current = [];
          if (pointerDownTimeoutRef.current) clearTimeout(pointerDownTimeoutRef.current);
          const overlay = overlayCanvasRef.current;
          const octx = overlay?.getContext('2d');
          octx?.clearRect(0, 0, overlay?.width || 0, overlay?.height || 0);
        }
      }
    }, 750);

    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const octx = overlay.getContext('2d');
      octx?.clearRect(0, 0, overlay.width, overlay.height);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isEyedropperActive) {
      sampleColorAtCursor(e.clientX, e.clientY);
      return;
    }

    if (!isDrawing.current || !lastPoint.current) return;

    // If moved more than 6px, cancel the long press flood-fill trigger
    if (pointerStartCoordsRef.current) {
      const dist = Math.hypot(e.clientX - pointerStartCoordsRef.current.x, e.clientY - pointerStartCoordsRef.current.y);
      if (dist > 6) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    const rawPoint = { x: coords.x, y: coords.y, p: e.pressure || 0.55 };
    const smoothPoint = getStabilizedPoint(rawPoint, strokePoints.current);
    strokePoints.current.push(smoothPoint);

    const overlay = overlayCanvasRef.current;
    const octx = overlay?.getContext('2d');
    if (overlay && octx) {
      drawSegment(octx, lastPoint.current, smoothPoint, currentBrush, brushColor);
    }

    // Straight line snapping hold check
    if (pointerDownTimeoutRef.current) clearTimeout(pointerDownTimeoutRef.current);
    pointerDownTimeoutRef.current = setTimeout(() => {
      if (isDrawing.current && strokePoints.current.length > 2) {
        const start = strokePoints.current[0];
        const last = strokePoints.current[strokePoints.current.length - 1];
        if (overlay && octx) {
          octx.clearRect(0, 0, overlay.width, overlay.height);
          drawSegment(octx, start, last, currentBrush, brushColor);
          triggerHud('Straight Line Snapped');
        }
      }
    }, 700);

    lastPoint.current = smoothPoint;
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartCoordsRef.current = null;

    if (isEyedropperActive) {
      setIsEyedropperActive(false);
      triggerHud(`Selected: ${brushColor}`);
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (pointerDownTimeoutRef.current) clearTimeout(pointerDownTimeoutRef.current);

    const activeLayerCanvas = canvasRefs.current[activeLayerId];
    const ctx = activeLayerCanvas?.getContext('2d');
    const overlay = overlayCanvasRef.current;

    if (activeLayerCanvas && ctx && strokePoints.current.length > 0) {
      const octx = overlay?.getContext('2d');
      octx?.clearRect(0, 0, overlay?.width || 0, overlay?.height || 0);

      let shapeRecognized = false;
      if (shapeRecognition) {
        shapeRecognized = recognizeShapeAndDraw(strokePoints.current);
      }

      if (!shapeRecognized) {
        let pPrev = strokePoints.current[0];
        for (let i = 1; i < strokePoints.current.length; i++) {
          const pCurr = strokePoints.current[i];
          drawSegment(ctx, pPrev, pCurr, currentBrush, brushColor);
          pPrev = pCurr;
        }
      }
      saveHistoryState();
    }

    lastPoint.current = null;
    strokePoints.current = [];
  };

  // Color Sampler / Eyedropper code
  const sampleColorAtCursor = (clientX: number, clientY: number) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();

    // Map screen pixel to canvas coordinates
    const cx = Math.round((clientX - rect.left) * (overlay.width / rect.width));
    const cy = Math.round((clientY - rect.top) * (overlay.height / rect.height));

    // Sample color
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasSize.width;
    tempCanvas.height = canvasSize.height;
    const tCtx = tempCanvas.getContext('2d');
    
    if (tCtx) {
      // 1. Draw media item to temp canvas
      if (mediaRef.current) {
        tCtx.drawImage(mediaRef.current, 0, 0, canvasSize.width, canvasSize.height);
      }
      
      // 2. Draw drawing layers on top
      layers.forEach(layer => {
        if (!layer.visible) return;
        const layerCanvas = canvasRefs.current[layer.id];
        if (layerCanvas) {
          tCtx.drawImage(layerCanvas, 0, 0);
        }
      });

      try {
        const pixel = tCtx.getImageData(Math.max(0, Math.min(canvasSize.width - 1, cx)), Math.max(0, Math.min(canvasSize.height - 1, cy)), 1, 1).data;
        const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
        setBrushColor(hex);
        setEyedropperColor(hex);
        setEyedropperCoords({ x: clientX, y: clientY });
      } catch (err) {
        console.error("Eyedropper sampling error", err);
      }
    }
  };

  // Custom vertical slider drag handlers
  const handleVerticalSliderPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    adjustSizeFromSlider(e.clientY);
    setIsResizingBrush(true);
  };

  const handleVerticalSliderPointerMove = (e: React.PointerEvent) => {
    if (!isResizingBrush) return;
    adjustSizeFromSlider(e.clientY);
  };

  const handleVerticalSliderPointerUp = () => {
    setIsResizingBrush(false);
  };

  const adjustSizeFromSlider = (clientY: number) => {
    const slider = sizeSliderRef.current;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    // Calculate percentage from top to bottom
    const pct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    // Max brush size 100, min size 2. We invert the slider Y so sliding UP makes it LARGER (Instagram UI)
    const newSize = Math.round((1 - pct) * 118 + 2);
    
    setBrushes(prev => ({
      ...prev,
      [activeBrush]: {
        ...prev[activeBrush],
        size: newSize
      }
    }));
  };

  const handleBrushClick = (brushId: BrushConfig['id']) => {
    if (activeBrush === brushId) {
      setShowBrushSelectorSheet(true);
    } else {
      setActiveBrush(brushId);
      triggerHud(`Brush: ${brushes[brushId].name}`);
    }
  };

  // Compile export transparent PNG
  const handleFinalCheckmark = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvasSize.width;
    exportCanvas.height = canvasSize.height;
    const eCtx = exportCanvas.getContext('2d');
    
    if (!eCtx) return;

    // Draw only user strokes, leaving background fully transparent
    const reversedLayers = [...layers].reverse();
    reversedLayers.forEach(layer => {
      if (!layer.visible) return;
      const layerCanvas = canvasRefs.current[layer.id];
      if (layerCanvas) {
        eCtx.save();
        eCtx.globalAlpha = layer.opacity / 100;
        eCtx.drawImage(layerCanvas, 0, 0);
        eCtx.restore();
      }
    });

    exportCanvas.toBlob(blob => {
      if (blob) {
        onExport(blob);
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black select-none overflow-hidden flex flex-col items-center justify-between p-0 text-slate-100">
      
      {/* ── BACKGROUND FULL-SCREEN MEDIA VIEWPORT ── */}
      <div 
        ref={workspaceContainerRef}
        className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#000000] z-[10] overflow-hidden"
      >
        <div 
          className="relative transition-transform duration-75 ease-out shadow-2xl flex items-center justify-center"
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`
          }}
        >
          {/* Centered Media Tag */}
          {mediaUrl && (
            mediaType === 'video' ? (
              <video 
                ref={el => { mediaRef.current = el; }}
                src={mediaUrl} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-[12]" 
                autoPlay 
                loop 
                muted 
                onLoadedMetadata={handleMediaLoad}
              />
            ) : (
              <img 
                ref={el => { mediaRef.current = el; }}
                src={mediaUrl} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-[12]" 
                alt="Draw Background" 
                onLoad={handleMediaLoad}
              />
            )
          )}

          {/* Stacked Paint Layers */}
          {layers.map((layer, index) => (
            <canvas
              key={layer.id}
              ref={el => { canvasRefs.current[layer.id] = el; }}
              width={canvasSize.width}
              height={canvasSize.height}
              className={clsx(
                "absolute inset-0 w-full h-full pointer-events-none select-none",
                !layer.visible && "hidden"
              )}
              style={{
                zIndex: (layers.length - index) * 20 + 20,
                opacity: layer.opacity / 100
              }}
            />
          ))}

          {/* Active Overlay Draw Pointer Canvas */}
          <canvas
            ref={overlayCanvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 w-full h-full cursor-pencil z-[500]"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>

      {/* ── TOP BAR: INSTAGRAM CIRCULAR BRUSH BUTTONS ── */}
      <header className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/85 via-black/45 to-transparent flex items-center justify-between px-6 z-[10020]">
        
        {/* Undo/Redo/Cancel Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full hover:bg-white/10 active:scale-95 text-white transition-all"
            title="Cancel Drawing"
          >
            <X size={20} />
          </button>
          
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className={clsx(
              'p-2 rounded-full transition-all active:scale-95',
              historyIndex > 0 ? 'text-white hover:bg-white/10' : 'text-white/20 cursor-not-allowed'
            )}
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
        </div>

        {/* Circular Brush Type Swaps */}
        <div className="flex items-center gap-3">
          {/* Mirror Symmetry drawing mode toggle */}
          <button
            onClick={() => {
              const modes: ('none' | 'vertical' | 'horizontal')[] = ['none', 'vertical', 'horizontal'];
              const nextIdx = (modes.indexOf(symmetryMode) + 1) % modes.length;
              setSymmetryMode(modes[nextIdx]);
              triggerHud(`Symmetry: ${modes[nextIdx].toUpperCase()}`);
            }}
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 mr-2",
              symmetryMode !== 'none'
                ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                : "bg-transparent border-white/60 text-white hover:bg-white/10"
            )}
            title="Toggle Symmetry Drawing Mode"
          >
            {symmetryMode === 'none' && <span className="text-[10px] font-mono font-bold">SYM</span>}
            {symmetryMode === 'vertical' && <span className="text-[10px] font-mono font-bold">V-SYM</span>}
            {symmetryMode === 'horizontal' && <span className="text-[10px] font-mono font-bold">H-SYM</span>}
          </button>

          {Object.values(brushes).map(b => {
            const isAct = b.id === activeBrush;
            const IconComp = b.icon;
            return (
              <button
                key={b.id}
                onClick={() => handleBrushClick(b.id)}
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95",
                  isAct 
                    ? "bg-white border-white text-black shadow-lg"
                    : "bg-transparent border-white/60 text-white hover:bg-white/10"
                )}
                title={b.name}
              >
                <IconComp size={16} />
              </button>
            );
          })}
        </div>

        {/* Done Checkmark */}
        <div className="flex items-center gap-1">
          {/* Quick Clear Trash */}
          <button
            onClick={() => {
              const canvas = canvasRefs.current[activeLayerId];
              const ctx = canvas?.getContext('2d');
              if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                saveHistoryState();
                triggerHud('Canvas Cleared');
              }
            }}
            className="p-2.5 rounded-full hover:bg-white/10 text-white mr-1"
            title="Clear strokes"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={handleFinalCheckmark}
            className="p-2.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-md"
            title="Done"
          >
            <Check size={20} className="stroke-[3]" />
          </button>
        </div>
      </header>

      {/* ── LEFT-SIDE BRUSH SIZE VERTICAL SLIDER ── */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-[10020]">
        
        {/* Sliding Size value preview */}
        <span className="text-[10px] font-mono font-bold text-white shadow-sm">{currentBrush.size}px</span>
        
        {/* Drag vertical track */}
        <div 
          ref={sizeSliderRef}
          onPointerDown={handleVerticalSliderPointerDown}
          onPointerMove={handleVerticalSliderPointerMove}
          onPointerUp={handleVerticalSliderPointerUp}
          className="relative w-7 h-48 flex items-center justify-center cursor-ns-resize group"
          title="Drag vertically to change size"
        >
          {/* Central Track Line */}
          <div className="absolute w-1 h-full bg-white/25 rounded-full" />
          
          {/* Color Fill Level indicator */}
          <div 
            className="absolute w-1 bg-white/60 rounded-full bottom-0"
            style={{
              height: `${Math.min(100, Math.max(0, ((currentBrush.size - 2) / 118) * 100))}%`
            }}
          />

          {/* Slider Knob */}
          <div 
            className="absolute w-5 h-5 rounded-full bg-white border border-black/10 shadow-lg left-1/2 -translate-x-1/2 transition-shadow group-hover:shadow-[0_0_10px_rgba(255,255,255,0.4)]"
            style={{
              // Inverse Y offset positioning
              bottom: `${Math.min(92, Math.max(0, ((currentBrush.size - 2) / 118) * 100 - 4))}%`
            }}
          />
        </div>
        
        {/* Toggle stabilizer levels */}
        <button
          onClick={() => {
            const levels: typeof stabilizerLevel[] = ['off', 'low', 'med', 'high', 'pro'];
            const nextIdx = (levels.indexOf(stabilizerLevel) + 1) % levels.length;
            setStabilizerLevel(levels[nextIdx]);
            triggerHud(`Stabilizer: ${levels[nextIdx].toUpperCase()}`);
          }}
          className="px-1 py-0.5 rounded bg-black/40 text-white/60 text-[8px] font-mono hover:text-white"
        >
          S: {stabilizerLevel.toUpperCase()}
        </button>
      </div>

      {/* ── EYEDROPPER MAGNIFYING GLASS OVERLAY ── */}
      <AnimatePresence>
        {isEyedropperActive && (
          <div className="fixed inset-0 z-[10070] pointer-events-none">
            {/* Color sampling loupe lens */}
            <div 
              className="absolute w-16 h-16 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${eyedropperCoords.x}px`,
                top: `${eyedropperCoords.y - 40}px`, // offset slightly above finger
                backgroundColor: eyedropperColor
              }}
            >
              {/* Inner ring marker */}
              <div className="w-full h-full rounded-full border border-black/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/40 border border-black/30" />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FLOATING HUD STICKY MESSAGE ── */}
      <AnimatePresence>
        {hudVisible && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[10020] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="px-4 py-1.5 rounded-full bg-black/85 border border-white/10 text-[10px] font-mono text-purple-300 shadow-xl"
            >
              {hudMessage}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DRAG SIZE FLOATING CIRCLE PREVIEW ── */}
      <AnimatePresence>
        {isResizingBrush && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[10030]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-28 h-28 bg-black/70 backdrop-blur-sm border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-2xl"
            >
              <div 
                className="rounded-full border border-white/40 flex items-center justify-center bg-white/10"
                style={{
                  width: `${Math.max(4, Math.min(80, currentBrush.size))}px`,
                  height: `${Math.max(4, Math.min(80, currentBrush.size))}px`
                }}
              />
              <span className="text-[10px] font-mono font-bold text-white">{currentBrush.size}px</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM PALETTE DOCK: INSTAGRAM PALETTE ── */}
      <footer className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col items-center justify-center gap-2 z-[10020] px-6">
        
        {/* Colors Row */}
        <div className="flex items-center gap-3 w-full max-w-lg justify-center">
          
          {/* Eyedropper Sampler */}
          <button
            onClick={() => {
              setIsEyedropperActive(true);
              triggerHud('Hold & drag to sample color');
            }}
            className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center border transition-all active:scale-95 mr-1 shadow-md",
              isEyedropperActive 
                ? "bg-white border-white text-black" 
                : "bg-black/45 border-white/20 text-white hover:bg-white/10"
            )}
            title="Eyedropper Color Sampler"
          >
            <Pipette size={14} />
          </button>

          {/* Curated Swatches Row */}
          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-1">
            {PALETTE_PAGES[activePalettePage].map((c, idx) => {
              const isSelected = brushColor === c;
              return (
                <button
                  key={`${c}-${idx}`}
                  onClick={() => {
                    setBrushColor(c);
                    triggerHud(`Active Color: ${c}`);
                  }}
                  className={clsx(
                    "w-8.5 h-8.5 rounded-xl border transition-all hover:scale-105 active:scale-95 shadow-lg relative flex-shrink-0",
                    isSelected 
                      ? "border-white scale-110 shadow-white/10" 
                      : "border-white/10 hover:border-white/30"
                  )}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>

          {/* Brush advanced config trigger */}
          <button
            onClick={() => setShowBrushSelectorSheet(true)}
            className="w-9 h-9 rounded-xl bg-black/45 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 shadow-md ml-1 active:scale-95 transition-all"
            title="Brush configurations"
          >
            <Sliders size={14} />
          </button>
        </div>

        {/* Three pagination dots mimicking Instagram Story */}
        <div className="flex items-center gap-2 mt-0.5">
          {PALETTE_PAGES.map((_, pageIdx) => (
            <button
              key={pageIdx}
              onClick={() => setActivePalettePage(pageIdx)}
              className={clsx(
                "w-1.5 h-1.5 rounded-full transition-all",
                activePalettePage === pageIdx ? "bg-white scale-125" : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      </footer>

      {/* ── FLOATING BOTTOM SHEET: BRUSH SETTINGS ── */}
      <AnimatePresence>
        {showBrushSelectorSheet && (
          <div className="fixed inset-0 z-[10080] bg-black/60 backdrop-blur-sm flex items-end justify-center">
            <div className="absolute inset-0" onClick={() => setShowBrushSelectorSheet(false)} />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md bg-[#0a0813]/95 border-t border-white/[0.08] rounded-t-3xl p-6 shadow-2xl z-10 flex flex-col gap-5 text-slate-200"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-slate-400 font-mono uppercase">// {currentBrush.name} config</h3>
                  <p className="text-[10px] text-slate-500 mt-1">{currentBrush.description}</p>
                </div>
                <button 
                  onClick={() => setShowBrushSelectorSheet(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 hide-scrollbar">
                
                {/* Size */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">BRUSH RADIUS</span>
                    <span className="text-white font-bold">{currentBrush.size}px</span>
                  </div>
                  <input
                    type="range" min={1} max={150} value={currentBrush.size}
                    onChange={e => setBrushes(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], size: parseInt(e.target.value) }
                    }))}
                    className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-white"
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">FLOW STRENGTH / OPACITY</span>
                    <span className="text-white font-bold">{Math.round(currentBrush.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range" min={1} max={100} value={currentBrush.opacity * 100}
                    onChange={e => setBrushes(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], opacity: parseFloat(e.target.value) / 100 }
                    }))}
                    className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-white"
                  />
                </div>

                {/* Smoothing */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">STROKE SMOOTHING</span>
                    <span className="text-white font-bold">{Math.round(currentBrush.smoothing * 100)}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={currentBrush.smoothing * 100}
                    onChange={e => setBrushes(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], smoothing: parseFloat(e.target.value) / 100 }
                    }))}
                    className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-white"
                  />
                </div>

                {/* Hardness */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">BRUSH HARDNESS</span>
                    <span className="text-white font-bold">{Math.round(currentBrush.hardness * 100)}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={currentBrush.hardness * 100}
                    onChange={e => setBrushes(prev => ({
                      ...prev,
                      [activeBrush]: { ...prev[activeBrush], hardness: parseFloat(e.target.value) / 100 }
                    }))}
                    className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-white"
                  />
                </div>

                {/* Reset button */}
                <button
                  onClick={() => setBrushes(prev => ({
                    ...prev,
                    [activeBrush]: DEFAULT_BRUSHES[activeBrush]
                  }))}
                  className="w-full py-2 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/5 text-[9px] font-mono font-black uppercase text-slate-400 hover:text-white transition-colors mt-2"
                >
                  Reset Brush Defaults
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
