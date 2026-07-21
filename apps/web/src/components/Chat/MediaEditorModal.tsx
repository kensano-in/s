"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  RotateCw, Pencil, Type, Smile, Sparkles, X, Check, Undo, Eye, EyeOff
} from "lucide-react";

interface MediaEditorModalProps {
  file: File;
  onSave: (editedFile: File) => void;
  onClose: () => void;
}

const FILTERS = [
  { name: "Normal", value: "none" },
  { name: "B&W", value: "grayscale(100%)" },
  { name: "Sepia", value: "sepia(100%)" },
  { name: "Vintage", value: "contrast(110%) sepia(30%) saturate(90%)" },
  { name: "Warm", value: "sepia(25%) saturate(130%) hue-rotate(-10deg)" },
  { name: "Cool", value: "saturate(110%) hue-rotate(10deg) brightness(95%)" },
  { name: "Invert", value: "invert(100%)" }
];

const COLORS = ["#ff3b30", "#34c759", "#007aff", "#ffcc00", "#af52de", "#ffffff", "#000000"];

export default function MediaEditorModal({ file, onSave, onClose }: MediaEditorModalProps) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [activeFilter, setActiveFilter] = useState("none");
  const [mode, setMode] = useState<"none" | "draw" | "markup" | "text" | "emoji">("none");
  const [brushColor, setBrushColor] = useState("#ff3b30");
  
  // Custom overlays
  const [drawings, setDrawings] = useState<{ type: "draw" | "markup"; color: string; points: { x: number; y: number }[] }[]>([]);
  const [texts, setTexts] = useState<{ text: string; x: number; y: number; color: string }[]>([]);
  const [stampedEmojis, setStampedEmojis] = useState<{ char: string; x: number; y: number }[]>([]);

  // Editor states
  const [textInput, setTextInput] = useState("");
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      setImgElement(img);
    };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Render Canvas Workspace
  const drawWorkspace = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate dimensions based on container and rotation
    const isRotated = rotation === 90 || rotation === 270;
    const MAX_SIZE = 1080;
    let imgW = imgElement.naturalWidth;
    let imgH = imgElement.naturalHeight;
    
    if (imgW > imgH) {
      if (imgW > MAX_SIZE) {
        imgH = Math.round(imgH * MAX_SIZE / imgW);
        imgW = MAX_SIZE;
      }
    } else {
      if (imgH > MAX_SIZE) {
        imgW = Math.round(imgW * MAX_SIZE / imgH);
        imgH = MAX_SIZE;
      }
    }

    // Set canvas dimensions
    canvas.width = isRotated ? imgH : imgW;
    canvas.height = isRotated ? imgW : imgH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // 1. Position and Rotate
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-imgW / 2, -imgH / 2);

    // 2. Filter
    ctx.filter = activeFilter;
    ctx.drawImage(imgElement, 0, 0);
    ctx.restore();

    // 3. Draw overlays in original rotated coordinates
    ctx.save();
    
    // Helper to translate coordinate from raw viewport to canvas space depending on rotation
    const mapCoords = (pt: { x: number; y: number }) => {
      // Coordinates are saved in percentage coordinates [0..1] relative to current layout width/height
      return {
        x: pt.x * canvas.width,
        y: pt.y * canvas.height
      };
    };

    // Render Drawings
    drawings.forEach((drawing) => {
      if (drawing.points.length < 2) return;
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      if (drawing.type === "markup") {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)"; // solid black censor bar
        ctx.lineWidth = canvas.height * 0.04; // thick brush
      } else {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = canvas.height * 0.01; // normal brush
      }

      const p0 = mapCoords(drawing.points[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < drawing.points.length; i++) {
        const p = mapCoords(drawing.points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });

    // Render Texts
    texts.forEach((t) => {
      const pos = mapCoords(t);
      const fontSize = Math.max(16, Math.round(canvas.height * 0.045));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Text border for readability
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.round(fontSize * 0.2);
      ctx.strokeText(t.text, pos.x, pos.y);
      ctx.fillText(t.text, pos.x, pos.y);
    });

    // Render Emojis
    stampedEmojis.forEach((em) => {
      const pos = mapCoords(em);
      const fontSize = Math.max(28, Math.round(canvas.height * 0.075));
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(em.char, pos.x, pos.y);
    });

    ctx.restore();
  };

  useEffect(() => {
    drawWorkspace();
  }, [imgElement, rotation, activeFilter, drawings, texts, stampedEmojis]);

  // Pointer drawing events
  const getCanvasMousePos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw" && mode !== "markup") return;
    setIsDrawing(true);
    const pos = getCanvasMousePos(e);
    setDrawings(prev => [...prev, {
      type: mode,
      color: brushColor,
      points: [pos]
    }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (mode !== "draw" && mode !== "markup")) return;
    const pos = getCanvasMousePos(e);
    setDrawings(prev => {
      const copy = [...prev];
      if (copy.length === 0) return prev;
      const last = { ...copy[copy.length - 1] };
      last.points = [...last.points, pos];
      copy[copy.length - 1] = last;
      return copy;
    });
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pctX = (e.clientX - rect.left) / rect.width;
    const pctY = (e.clientY - rect.top) / rect.height;

    if (mode === "text") {
      const text = prompt("Enter text overlay:");
      if (text && text.trim()) {
        setTexts(prev => [...prev, { text: text.trim(), x: pctX, y: pctY, color: brushColor }]);
      }
      setMode("none");
    }
  };

  const stampEmoji = (emoji: string) => {
    setStampedEmojis(prev => [...prev, { char: emoji, x: 0.5, y: 0.5 }]);
    setShowEmojiGrid(false);
    setMode("none");
  };

  const handleSaveClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], file.name, { type: "image/jpeg" });
        onSave(editedFile);
      }
    }, "image/jpeg", 0.65);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#050508]/98 backdrop-blur-2xl text-white select-none">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-[#0a0a0f]/80">
        <button 
          onClick={onClose} 
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors outline-none cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Action Modes */}
        <div className="flex items-center gap-2">
          {/* Rotate */}
          <button
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:text-indigo-400 transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw size={15} />
          </button>

          {/* Pencil */}
          <button
            onClick={() => setMode(mode === "draw" ? "none" : "draw")}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${mode === "draw" ? "bg-indigo-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
            title="Draw pencil"
          >
            <Pencil size={15} />
          </button>

          {/* Markup/Blur (Black censor) */}
          <button
            onClick={() => setMode(mode === "markup" ? "none" : "markup")}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${mode === "markup" ? "bg-indigo-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
            title="Censor bar"
          >
            <EyeOff size={15} />
          </button>

          {/* Text overlay */}
          <button
            onClick={() => setMode(mode === "text" ? "none" : "text")}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${mode === "text" ? "bg-indigo-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
            title="Add text overlay"
          >
            <Type size={15} />
          </button>

          {/* Emoji Stamp */}
          <button
            onClick={() => setShowEmojiGrid(v => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${showEmojiGrid ? "bg-indigo-500 text-white" : "bg-white/5 hover:bg-white/10"}`}
            title="Add emoji sticker"
          >
            <Smile size={15} />
          </button>

          {/* Undo */}
          <button
            onClick={() => {
              if (drawings.length > 0) setDrawings(d => d.slice(0, -1));
              else if (texts.length > 0) setTexts(t => t.slice(0, -1));
              else if (stampedEmojis.length > 0) setStampedEmojis(e => e.slice(0, -1));
            }}
            disabled={drawings.length === 0 && texts.length === 0 && stampedEmojis.length === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:text-indigo-400 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Undo"
          >
            <Undo size={14} />
          </button>
        </div>

        <button 
          onClick={handleSaveClick}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-indigo-500 hover:bg-indigo-600 transition-colors cursor-pointer outline-none"
        >
          <Check size={13} strokeWidth={2.5} />
          Done
        </button>
      </div>

      {/* Editor Main Canvas workspace */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#07070b]"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleCanvasClick}
          className={`max-w-full max-h-[70vh] object-contain rounded-xl border border-white/5 shadow-2xl ${
            mode === "draw" || mode === "markup" ? "cursor-crosshair touch-none" : mode === "text" ? "cursor-text" : "cursor-default"
          }`}
        />

        {/* Inline Emoji Selector Grid Overlay */}
        {showEmojiGrid && (
          <div className="absolute inset-x-6 bottom-6 top-6 z-[1100] p-5 rounded-2xl bg-[#0f0f15]/95 border border-white/10 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Choose Emoji Sticker</span>
              <button onClick={() => setShowEmojiGrid(false)} className="text-neutral-400 hover:text-white">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 overflow-y-auto text-3xl pb-4 custom-scrollbar">
              {["😀","😂","😍","😎","👍","🔥","🎉","❤️","🎂","🚀","🤔","👀","💩","👻","💀","🌟","💡","💥","💯","🎨","🍕","🍺","✈️","🎮","🚗","🤖","🌈","🐱"].map((em) => (
                <button 
                  key={em} 
                  onClick={() => stampEmoji(em)}
                  className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all outline-none"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer controls: Brush colors or filters */}
      <div className="border-t border-white/5 bg-[#0a0a0f]/90 p-4 flex flex-col gap-4">
        {/* Colors selector (shown in draw / text modes) */}
        {(mode === "draw" || mode === "text") && (
          <div className="flex items-center justify-center gap-3">
            {COLORS.map((col) => (
              <button
                key={col}
                onClick={() => setBrushColor(col)}
                className={`w-7 h-7 rounded-full border transition-all scale-95 hover:scale-100 ${
                  brushColor === col ? "border-indigo-400 scale-105 ring-2 ring-indigo-500/20" : "border-transparent"
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        )}

        {/* Filters Carousel */}
        {mode === "none" && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 px-1">Swipe Photo Filters</span>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFilter(f.value)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition-all shrink-0 cursor-pointer ${
                    activeFilter === f.value ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
