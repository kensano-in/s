'use client';

import { useState, useTransition, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Eye, Edit2, Copy, Check,
  Search, ShieldAlert, Activity, FileText, Download, AlertTriangle,
  Layers, RotateCcw, CheckSquare,
  ExternalLink, ChevronDown, HelpCircle,
  Info, Sparkles, Image as ImageIcon, Video, Smile, Code2, AlignLeft,
  Heading1, Quote, Minus, Link2, Table, Terminal, Clock,
  BarChart2, Server, UploadCloud, X, Type,
  GripVertical, ChevronUp, Flame, Pin, Star, AlertCircle, RotateCw,
  TrendingUp, TrendingDown, Hash, ArrowRight, Undo2, Redo2, Files,
  Maximize2, Minimize2, Keyboard, Share2, Zap, FileDown, ChevronRight, ChevronLeft,
  BookOpen, Globe, Command, Sliders, ArrowUp, ArrowDown
} from 'lucide-react';
import { deleteUpdate, saveRichUpdate, type Update } from './actions';

// ============================================================
// TYPES
// ============================================================
export type BlockType =
  | 'hero' | 'title' | 'subtitle' | 'paragraph' | 'callout' | 'warning'
  | 'security_alert' | 'code_block' | 'image' | 'video' | 'gif'
  | 'before_after' | 'metrics' | 'timeline' | 'checklist' | 'quote'
  | 'divider' | 'faq' | 'links' | 'attachments' | 'table'
  | 'performance_graph' | 'system_status' | 'developer_notes' | 'changelog_list';

export interface Block { id: string; type: BlockType; data: any; }

export interface Customization {
  cover_layout: 'minimal' | 'banner' | 'gradient' | 'aurora';
  accent_color: string;
  typography: 'inter' | 'outfit' | 'mono' | 'serif';
  corner_radius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing_scale: 'compact' | 'normal' | 'relaxed';
  content_width: 'narrow' | 'medium' | 'wide';
  hero_alignment: 'left' | 'center' | 'right';
  background_pattern: 'none' | 'grid' | 'dots' | 'noise';
  theme_variant: 'dark' | 'oled' | 'glass';
}

export interface AdvancedReleaseOptions {
  codename: string;
  channel: 'stable' | 'beta' | 'canary' | 'internal';
  visibility: 'public' | 'internal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_pinned: boolean;
  is_featured: boolean;
  is_critical: boolean;
  rollback_ready: boolean;
  scheduled_at: string | null;
}

export interface RichReleaseData {
  is_rich_format: true;
  customization: Customization;
  options: AdvancedReleaseOptions;
  blocks: Block[];
  status: 'draft' | 'published' | 'scheduled' | 'archived';
}

const DEFAULT_CUSTOMIZATION: Customization = {
  cover_layout: 'gradient', accent_color: '#5e6ad2',
  typography: 'inter', corner_radius: 'lg', spacing_scale: 'normal',
  content_width: 'medium', hero_alignment: 'left',
  background_pattern: 'dots', theme_variant: 'dark',
};

const DEFAULT_OPTIONS: AdvancedReleaseOptions = {
  codename: '', channel: 'stable', visibility: 'public',
  priority: 'medium', is_pinned: false, is_featured: false,
  is_critical: false, rollback_ready: false, scheduled_at: null,
};

const ACCENT_PRESETS = [
  { name: 'Linear Violet', value: '#5e6ad2' },
  { name: 'Sky Blue', value: '#38bdf8' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Slate', value: '#94a3b8' },
];

const CATEGORY_META: Record<string, { label: string; color: string; dot: string }> = {
  general: { label: 'General', color: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/50', dot: 'bg-zinc-500' },
  feature: { label: 'Feature', color: 'text-blue-400 bg-blue-950/40 border-blue-800/50', dot: 'bg-blue-500' },
  fix: { label: 'Bug Fix', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50', dot: 'bg-emerald-500' },
  security: { label: 'Security', color: 'text-red-400 bg-red-950/40 border-red-800/50', dot: 'bg-red-500' },
  performance: { label: 'Performance', color: 'text-amber-400 bg-amber-950/40 border-amber-800/50', dot: 'bg-amber-500' },
  breaking: { label: 'Breaking', color: 'text-orange-400 bg-orange-950/40 border-orange-800/50', dot: 'bg-orange-500' },
};

// Syntax token coloring (basic, no external dep)
const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  bash: '#4eaa25', go: '#00add8', rust: '#ce422b', sql: '#336791',
  json: '#292929', html: '#e34c26', css: '#1572b6', yaml: '#cc1018',
  jsx: '#61dafb', tsx: '#3178c6',
};

function parseReleaseContent(content: string, fallbackTitle: string): RichReleaseData {
  try {
    const data = JSON.parse(content);
    if (data?.is_rich_format) return data as RichReleaseData;
  } catch {}
  return {
    is_rich_format: true,
    customization: { ...DEFAULT_CUSTOMIZATION, cover_layout: 'minimal' },
    options: { ...DEFAULT_OPTIONS },
    status: 'published',
    blocks: [
      { id: 'legacy-hero', type: 'hero', data: { title: fallbackTitle } },
      { id: 'legacy-text', type: 'paragraph', data: { text: content } },
    ],
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}

// ============================================================
// PREMIUM SUB-COMPONENTS
// ============================================================

// Animated number counter
function AnimatedNumber({ value }: { value: string }) {
  return <span>{value}</span>;
}

// Before/After slider
function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel, afterLabel }: any) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSliderPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
    const touch = (e: TouchEvent) => { if (isDragging.current && e.touches[0]) handleMove(e.touches[0].clientX); };
    const stop = () => { isDragging.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', touch);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', touch);
      window.removeEventListener('touchend', stop);
    };
  }, [handleMove]);

  if (!beforeUrl && !afterUrl) {
    return (
      <div className="relative w-full h-48 rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center gap-2">
        <Layers className="w-6 h-6 text-zinc-700" />
        <span className="text-[10px] text-zinc-600 font-mono">Add Before & After URLs in the block editor</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => { isDragging.current = true; handleMove(e.clientX); }}
      onTouchStart={(e) => { isDragging.current = true; if (e.touches[0]) handleMove(e.touches[0].clientX); }}
      className="relative w-full h-72 rounded-xl overflow-hidden select-none cursor-ew-resize border border-zinc-800"
    >
      <div className="absolute inset-0 bg-zinc-950" />
      {beforeUrl && <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-mono text-zinc-300 border border-white/10">
        {beforeLabel || 'BEFORE'}
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <div className="absolute inset-0 bg-zinc-900" />
        {afterUrl && <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-mono text-emerald-400 border border-emerald-800/40">
          {afterLabel || 'AFTER'}
        </div>
      </div>
      <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${sliderPos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-xl flex items-center justify-center">
          <span className="text-[8px] text-zinc-800 font-bold select-none">◀▶</span>
        </div>
      </div>
    </div>
  );
}

// Slideshow / Image Carousel Block
function ImageBlockRenderer({ data }: { data: any }) {
  const urls = Array.isArray(data.urls) ? data.urls.filter(Boolean) : [];
  const singleUrl = data.url;
  const caption = data.caption;
  const [currentIdx, setCurrentIdx] = useState(0);

  if (urls.length === 0 && !singleUrl) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 h-40 flex flex-col items-center justify-center gap-2">
        <ImageIcon className="w-6 h-6 text-zinc-700" />
        <span className="text-[10px] text-zinc-600 font-mono">Paste or upload images in the block editor</span>
      </div>
    );
  }

  if (urls.length > 1) {
    return (
      <div className="space-y-2">
        <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-zinc-800/50 bg-[#050507]/30 group/carousel">
          <div
            className="absolute inset-0 flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIdx * 100}%)` }}
          >
            {urls.map((url: string, i: number) => {
              const isVideo = url.match(/\.(mp4|webm|mov|m4v|ogg)$/i) || url.includes('data:video');
              return (
                <div key={i} className="relative w-full h-full flex-shrink-0 select-none bg-zinc-950 flex items-center justify-center">
                  {isVideo ? (
                    <video src={url} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={url} alt={`slide-${i}`} className="w-full h-full object-contain" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Top-Right Index Pill */}
          <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black font-mono tracking-wider text-white select-none">
            {currentIdx + 1}/{urls.length}
          </div>

          {/* Navigation Arrows */}
          {currentIdx > 0 && (
            <button
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 opacity-0 group-hover/carousel:opacity-100"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {currentIdx < urls.length - 1 && (
            <button
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 opacity-0 group-hover/carousel:opacity-100"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {/* Dots */}
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5 pointer-events-none">
            {urls.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIdx ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
        {caption && <p className="text-[11px] text-center text-zinc-600 font-mono">{caption}</p>}
      </div>
    );
  }

  // Single url fallback
  const finalUrl = singleUrl || urls[0];
  const isVideo = finalUrl.match(/\.(mp4|webm|mov|m4v|ogg)$/i) || finalUrl.includes('data:video');
  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-950">
        {isVideo ? (
          <video src={finalUrl} controls className="w-full h-auto max-h-[500px] object-contain" />
        ) : (
          <img src={finalUrl} alt={caption || ''} className="w-full h-auto max-h-[500px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
      </div>
      {caption && <p className="text-[11px] text-center text-zinc-600 font-mono">{caption}</p>}
    </div>
  );
}

// Code Block with language badge
function CodeBlock({ code, language, filename }: any) {
  const [copied, setCopied] = useState(false);
  const lang = (language || 'text').toLowerCase();
  const langColor = LANG_COLORS[lang] || '#888';

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800/80 bg-[#0d0d10] font-mono">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: langColor }} />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{lang}</span>
          {filename && <span className="text-zinc-600 text-[10px]">/ {filename}</span>}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
        >
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /> copied</> : <><Copy className="w-3 h-3" /> copy</>}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[12px] leading-relaxed text-zinc-300 max-h-[380px]">
        <code>{code || '// No code yet'}</code>
      </pre>
    </div>
  );
}

// Animated metrics bento grid
function MetricsPanel({ items }: any) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {(items || []).map((item: any, idx: number) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
          className="relative border border-zinc-800/60 rounded-xl p-4 bg-zinc-900/30 overflow-hidden group hover:border-zinc-700/80 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent" />
          <span className="text-[9px] uppercase tracking-widest text-zinc-600 block mb-2 truncate font-semibold">{item.label}</span>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-zinc-100 leading-none tabular-nums">
              <AnimatedNumber value={item.value || '0'} />
            </span>
          </div>
          {item.change && (
            <div className={`mt-2 flex items-center gap-1 text-[10px] font-semibold ${item.isGood ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.isGood ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Animated timeline
function TimelineBlock({ items }: any) {
  return (
    <div className="relative pl-5 space-y-5">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gradient-to-b from-zinc-700 via-zinc-800 to-transparent" />
      {(items || []).map((item: any, idx: number) => (
        <motion.div key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.08 }} className="relative">
          <div className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full bg-zinc-700 border border-zinc-600 ring-2 ring-zinc-950" />
          {item.date && <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-1">{item.date}</div>}
          <h4 className="text-[13px] font-semibold text-zinc-200 mb-1">{item.title}</h4>
          {item.description && <p className="text-[12px] text-zinc-500 leading-relaxed">{item.description}</p>}
        </motion.div>
      ))}
    </div>
  );
}

// Checklist
function ChecklistBlock({ items }: any) {
  const [list, setList] = useState(() => (items || []).map((i: any) => ({ ...i })));
  const done = list.filter((i: any) => i.checked).length;
  const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0;

  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-900/20">
      {list.length > 0 && (
        <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-zinc-500">{done}/{list.length} complete</span>
          <div className="flex-1 mx-4 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-500">{pct}%</span>
        </div>
      )}
      <div className="p-3 space-y-1">
        {list.map((item: any, idx: number) => (
          <button
            key={idx}
            onClick={() => setList((prev: any[]) => prev.map((x, i) => i === idx ? { ...x, checked: !x.checked } : x))}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors text-left"
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'}`}>
              {item.checked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
            </div>
            <span className={`text-[12px] leading-none transition-all ${item.checked ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// System status
function SystemStatusPanel({ items }: any) {
  const statusConfig = {
    operational: { color: 'text-emerald-400', dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]', label: 'operational' },
    degraded: { color: 'text-amber-400', dot: 'bg-amber-500', label: 'degraded' },
    down: { color: 'text-red-400', dot: 'bg-red-500', label: 'outage' },
  };
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
        <Server className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Infrastructure Status</span>
      </div>
      <div className="divide-y divide-zinc-800/40">
        {(items || []).map((item: any, idx: number) => {
          const conf = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.operational;
          return (
            <div key={idx} className="flex items-center justify-between px-4 py-3">
              <span className="text-[12px] text-zinc-300 font-medium">{item.name || 'Service'}</span>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                <span className={`text-[10px] font-mono uppercase ${conf.color}`}>{conf.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Performance graph
function PerformanceGraph({ title, labels, datasets }: any) {
  const datasetArray = datasets || [];
  const allValues = datasetArray.flatMap((d: any) => d.data || []);
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 1) : 100;
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-900/20">
      {title && (
        <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
        </div>
      )}
      <div className="p-4 space-y-3">
        {(labels || []).map((label: string, li: number) => (
          <div key={li} className="grid grid-cols-[80px_1fr_40px] gap-3 items-center">
            <span className="text-[10px] font-mono text-zinc-500 truncate text-right">{label}</span>
            <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden">
              {datasetArray.map((ds: any, di: number) => {
                const val = parseFloat(ds.data?.[li]) || 0;
                const pct = Math.min(100, (val / maxVal) * 100);
                return (
                  <motion.div
                    key={di}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: li * 0.05, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{ backgroundColor: ds.color || '#5e6ad2' }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] font-mono text-zinc-600 text-right">
              {parseFloat(datasetArray[0]?.data?.[li] || 0)}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Security alert
function SecurityAlertCard({ title, cvss, cve, affected, mitigation }: any) {
  const score = parseFloat(cvss) || 0;
  const isCritical = score >= 9.0;
  const isHigh = score >= 7.0;
  const color = isCritical ? { border: 'border-red-900/50', bg: 'bg-red-950/10', header: 'bg-red-950/30', badge: 'text-red-400 bg-red-950/40 border-red-900/40' }
    : isHigh ? { border: 'border-orange-900/40', bg: 'bg-orange-950/5', header: 'bg-orange-950/20', badge: 'text-orange-400 bg-orange-950/30 border-orange-900/40' }
    : { border: 'border-amber-900/30', bg: 'bg-zinc-950/10', header: 'bg-zinc-950/40', badge: 'text-amber-400 bg-amber-950/20 border-amber-900/30' };
  return (
    <div className={`border rounded-xl overflow-hidden ${color.border} ${color.bg}`}>
      <div className={`px-4 py-2.5 flex items-center justify-between border-b ${color.border} ${color.header}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-3.5 h-3.5 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Security Advisory</span>
        </div>
        <div className="flex items-center gap-2">
          {cve && <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 bg-zinc-900/60">{cve}</span>}
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${color.badge}`}>CVSS {score.toFixed(1)}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h4 className="text-[13px] font-semibold text-zinc-200">{title || 'Vulnerability disclosure'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[{ label: 'Affected', value: affected }, { label: 'Mitigation', value: mitigation }].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 p-3">
              <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-1.5">{label}</div>
              <div className="text-[11px] text-zinc-300 font-mono">{value || 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Developer notes
function DeveloperNotesBlock({ title, notes }: any) {
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden bg-[#0d0d10] font-mono">
      <div className="px-4 py-2.5 border-b border-zinc-800/40 flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title || 'Developer Notes'}</span>
      </div>
      <pre className="p-4 text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{notes || ''}</pre>
    </div>
  );
}

// Changelog list (Linear-style chip tags)
function ChangelogList({ items }: any) {
  const tagConfig: Record<string, string> = {
    new: 'text-blue-400 bg-blue-950/40 border-blue-800/50',
    fixed: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    improved: 'text-violet-400 bg-violet-950/40 border-violet-800/50',
    breaking: 'text-red-400 bg-red-950/40 border-red-800/50',
    removed: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50',
  };
  return (
    <div className="space-y-2">
      {(items || []).map((item: any, idx: number) => (
        <div key={idx} className="flex items-start gap-3 py-1.5">
          <span className={`mt-0.5 shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${tagConfig[item.tag?.toLowerCase()] || tagConfig.new}`}>
            {item.tag || 'New'}
          </span>
          <span className="text-[13px] text-zinc-300 leading-snug">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// Markdown link & variable interpolator
function renderFormattedText(text: string, username: string | null, isFirst50: boolean = false) {
  if (!text) return '';
  
  // Interpolate username
  const name = username ? `@${username}` : 'friend';
  const first50Name = isFirst50 && username ? `@${username}` : 'friend';
  const interpolated = text
    .replace(/\{\{username\}\}/g, name)
    .replace(/@username/g, name)
    .replace(/\{\{first50_username\}\}/g, first50Name)
    .replace(/@first50_username/g, first50Name);
  
  // Match [Label](URL) markdown pattern
  const parts = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(interpolated)) !== null) {
    const textBefore = interpolated.substring(lastIndex, match.index);
    if (textBefore) parts.push(textBefore);
    
    const label = match[1];
    const url = match[2];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#5e6ad2] hover:text-[#7a87e8] underline underline-offset-4 transition-colors font-semibold"
      >
        {label}
      </a>
    );
    lastIndex = regex.lastIndex;
  }
  
  const textAfter = interpolated.substring(lastIndex);
  if (textAfter) parts.push(textAfter);
  
  return parts.length > 0 ? parts : interpolated;
}

// ============================================================
// BLOCK RENDERER
// ============================================================
function BlockRenderer({ block, currentUsername, isFirst50 }: { block: Block; currentUsername?: string | null; isFirst50?: boolean }) {
  const { type, data } = block;
  const username = currentUsername || null;
  const f50 = isFirst50 || false;

  switch (type) {
    case 'hero': return null;

    case 'title':
      return <h2 className="text-2xl font-bold text-zinc-100 tracking-tight leading-tight">{renderFormattedText(data.text, username, f50)}</h2>;

    case 'subtitle':
      return <h3 className="text-base font-medium text-zinc-400 tracking-tight">{renderFormattedText(data.text, username, f50)}</h3>;

    case 'paragraph':
      return <p className="text-[14px] text-zinc-400 leading-7 whitespace-pre-wrap">{renderFormattedText(data.text, username, f50)}</p>;

    case 'callout':
      return (
        <div className="flex gap-3 p-4 rounded-xl border border-blue-900/30 bg-blue-950/10">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[13px] text-zinc-300 leading-relaxed">{renderFormattedText(data.text, username, f50)}</p>
        </div>
      );

    case 'warning':
      return (
        <div className="flex gap-3 p-4 rounded-xl border border-amber-900/30 bg-amber-950/10">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[13px] text-zinc-300 leading-relaxed">{renderFormattedText(data.text, username, f50)}</p>
        </div>
      );

    case 'quote':
      return (
        <blockquote className="relative pl-5 py-1">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-zinc-500 to-transparent rounded-full" />
          <p className="text-[14px] text-zinc-300 italic leading-relaxed">&ldquo;{renderFormattedText(data.text, username, f50)}&rdquo;</p>
          {data.author && <footer className="mt-2 text-[11px] font-mono text-zinc-600">— {data.author}</footer>}
        </blockquote>
      );

    case 'divider':
      return <div className="border-t border-zinc-800/60" />;

    case 'security_alert': return <SecurityAlertCard {...data} />;
    case 'code_block': return <CodeBlock {...data} />;

    case 'image':
      return <ImageBlockRenderer data={data} />;

    case 'video':
      if (!data.url) return (
        <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 h-40 flex flex-col items-center justify-center gap-2">
          <Video className="w-6 h-6 text-zinc-700" />
          <span className="text-[10px] text-zinc-600 font-mono">Paste a video URL in the block editor</span>
        </div>
      );
      return (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-zinc-800/50 aspect-video bg-zinc-950">
            <video src={data.url} controls className="w-full h-full object-contain" />
          </div>
          {data.caption && <p className="text-[11px] text-center text-zinc-600 font-mono">{data.caption}</p>}
        </div>
      );

    case 'gif':
      if (!data.url) return (
        <div className="rounded-xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 h-40 flex flex-col items-center justify-center gap-2">
          <Smile className="w-6 h-6 text-zinc-700" />
          <span className="text-[10px] text-zinc-600 font-mono">Paste a GIF URL in the block editor</span>
        </div>
      );
      return (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-zinc-800/50 max-w-sm mx-auto">
            <img src={data.url} alt={data.caption || 'GIF'} className="w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          {data.caption && <p className="text-[11px] text-center text-zinc-600 font-mono">{data.caption}</p>}
        </div>
      );

    case 'before_after': return <BeforeAfterSlider {...data} />;
    case 'metrics': return <MetricsPanel {...data} />;
    case 'timeline': return <TimelineBlock {...data} />;
    case 'checklist': return <ChecklistBlock {...data} />;
    case 'performance_graph': return <PerformanceGraph {...data} />;
    case 'system_status': return <SystemStatusPanel {...data} />;
    case 'developer_notes': return <DeveloperNotesBlock {...data} />;
    case 'changelog_list': return <ChangelogList {...data} />;

    case 'faq':
      return (
        <div className="space-y-1.5">
          {(data.items || []).map((item: any, idx: number) => (
            <details key={idx} className="group border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-900/20">
              <summary className="flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-zinc-300 cursor-pointer select-none hover:bg-zinc-800/30 transition-colors list-none">
                {item.title || item.question}
                <ChevronDown className="w-4 h-4 text-zinc-600 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-zinc-800/40 text-[13px] text-zinc-400 leading-relaxed">
                {item.content || item.answer}
              </div>
            </details>
          ))}
        </div>
      );

    case 'links':
      return (
        <div className="flex flex-wrap gap-2">
          {(data.items || []).map((link: any, idx: number) => (
            <a key={idx} href={link.url || '#'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-700/50 bg-zinc-900/60 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all">
              {link.label || 'Link'}<ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      );

    case 'attachments':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(data.items || []).map((file: any, idx: number) => (
            <a key={idx} href={file.url || '#'} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-all group">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-zinc-300 truncate">{file.name || 'Attachment'}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">{file.size || ''}</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
            </a>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-zinc-900/60 border-b border-zinc-800/60">
                  {(data.headers || []).map((h: string, i: number) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row: string[], ri: number) => (
                  <tr key={ri} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-zinc-300">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    default: return null;
  }
}

// ============================================================
// RELEASE CARD (public view)
// ============================================================
export function ReleaseCard({
  data, created_at, category, version, isPreview = false, onEdit, onDelete, isAdmin = false, currentUsername = null, isFirst50 = false,
}: {
  data: RichReleaseData; created_at?: string; category?: string;
  version?: string | null; isPreview?: boolean; onEdit?: () => void; onDelete?: () => void; isAdmin?: boolean; currentUsername?: string | null; isFirst50?: boolean;
}) {
  const { customization, options, blocks } = data;
  const custom = customization || DEFAULT_CUSTOMIZATION;
  const opts = options || DEFAULT_OPTIONS;
  const [isExpanded, setIsExpanded] = useState(isPreview);

  const heroBlock = blocks.find(b => b.type === 'hero');
  const bodyBlocks = blocks.filter(b => b.type !== 'hero');
  const catMeta = CATEGORY_META[category || 'general'] || CATEGORY_META.general;

  const widthMap = { narrow: 'max-w-[580px]', medium: 'max-w-[740px]', wide: 'max-w-[960px]' };
  const radiusMap = { none: '0', sm: '8px', md: '12px', lg: '16px', xl: '24px' };
  const spacingMap = { compact: 'gap-4', normal: 'gap-6', relaxed: 'gap-9' };

  const accent = custom.accent_color || '#5e6ad2';
  const radius = radiusMap[custom.corner_radius] || '16px';

  const cardStyle = { '--accent': accent, '--radius': radius } as React.CSSProperties;

  const bgCover = () => {
    if (custom.cover_layout === 'gradient') return (
      <div className="h-24 w-full pointer-events-none" style={{ background: `linear-gradient(135deg, ${accent}25 0%, transparent 70%)` }} />
    );
    if (custom.cover_layout === 'aurora') return (
      <div className="h-28 w-full pointer-events-none overflow-hidden relative">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, ${accent}30 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${accent}15 0%, transparent 50%)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
      </div>
    );
    if (custom.cover_layout === 'banner' && heroBlock?.data?.coverUrl) return (
      <div className="h-36 w-full pointer-events-none overflow-hidden">
        <img src={heroBlock.data.coverUrl} alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
      </div>
    );
    return null;
  };

  const bgPattern = () => {
    if (custom.background_pattern === 'dots') return (
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `radial-gradient(${accent}15 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
    );
    if (custom.background_pattern === 'grid') return (
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${accent}08 1px, transparent 1px), linear-gradient(90deg, ${accent}08 1px, transparent 1px)`, backgroundSize: '28px 28px' }} />
    );
    if (custom.background_pattern === 'noise') return (
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
    );
    return null;
  };

  const themeClass = {
    dark: 'bg-[#0d0d10] border-zinc-800/60 text-zinc-100',
    oled: 'bg-black border-zinc-900/80 text-zinc-100',
    glass: 'bg-zinc-900/30 backdrop-blur-xl border-white/[0.07] text-zinc-100',
  }[custom.theme_variant] || 'bg-[#0d0d10] border-zinc-800/60 text-zinc-100';

  const fontClass = {
    inter: '', outfit: 'tracking-tight', mono: 'font-mono', serif: 'font-serif',
  }[custom.typography] || '';

  const alignClass = {
    left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end',
  }[custom.hero_alignment] || 'text-left items-start';

  return (
    <div className={`relative w-full border overflow-hidden ${themeClass} ${fontClass}`} style={{ '--accent': accent, borderRadius: radius } as React.CSSProperties}>
      {bgPattern()}
      {bgCover()}

      <div className="relative px-7 pt-6 pb-7">
        {/* Meta row */}
        <div className={`flex flex-wrap items-center gap-2 mb-5 ${custom.hero_alignment === 'center' ? 'justify-center' : custom.hero_alignment === 'right' ? 'justify-end' : ''}`}>
          {category && (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${catMeta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${catMeta.dot}`} />
              {catMeta.label}
            </span>
          )}
          {opts.channel && opts.channel !== 'stable' && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-700/40 text-zinc-500 bg-zinc-900/40">
              {opts.channel}
            </span>
          )}
          {opts.is_critical && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-900/50 text-red-400 bg-red-950/20 animate-pulse">
              ⚠ CRITICAL
            </span>
          )}
          {opts.is_pinned && (
            <span className="text-[10px] px-2.5 py-1 rounded-full border border-blue-900/40 text-blue-400 bg-blue-950/20">
              📌 PINNED
            </span>
          )}
          {created_at && !isPreview && (
            <time className="ml-auto text-[11px] text-zinc-600 font-mono">{formatRelative(created_at)}</time>
          )}
        </div>

        {/* Hero */}
        <div className={`flex flex-col gap-2 mb-5 ${alignClass}`}>
          {opts.codename && (
            <span className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: accent }}>
              ⬡ {opts.codename}
            </span>
          )}
          {version && (
            <span className="text-[11px] font-mono text-zinc-600">{version}</span>
          )}
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-[1.1]">
            {heroBlock?.data?.title || 'Untitled Release'}
          </h1>
          {heroBlock?.data?.subtitle && (
            <p className="text-[15px] text-zinc-400 max-w-xl">{heroBlock.data.subtitle}</p>
          )}
        </div>

        {/* Expand / collapse */}
        {!isExpanded && !isPreview && (
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/40">
            <button
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 transition-colors group"
            >
              Read full notes
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            {isAdmin && (
              <div className="flex items-center gap-3">
                <button onClick={onEdit} className="text-[10px] text-zinc-600 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={onDelete} className="text-[10px] text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Full content */}
        {isExpanded && bodyBlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`border-t border-zinc-800/40 pt-6 mx-auto ${widthMap[custom.content_width] || widthMap.medium}`}
          >
            <div className={`flex flex-col ${spacingMap[custom.spacing_scale]}`}>
              {bodyBlocks.map(block => (
                <div key={block.id}>
                  <BlockRenderer block={block} currentUsername={currentUsername} isFirst50={isFirst50} />
                </div>
              ))}
            </div>
            {!isPreview && (
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-800/40">
                <button onClick={() => setIsExpanded(false)} className="text-[11px] text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
                  <ChevronUp className="w-3.5 h-3.5" /> Collapse
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <button onClick={onEdit} className="text-[10px] text-zinc-600 hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      <Edit2 className="w-3 h-3" /> Edit in Studio
                    </button>
                    <button onClick={onDelete} className="text-[10px] text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STABLE EDITOR FORM HELPERS  (MUST be outside BlockInlineEditor)
// Defining these inside the editor causes React to unmount/remount
// on every keystroke, making all inputs appear unresponsive.
// ============================================================

function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block">{label}</label>
      {children}
    </div>
  );
}

function EditorInput({ value, onChange, placeholder, mono = false }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors ${mono ? 'font-mono' : ''}`}
    />
  );
}

function EditorTextarea({ value, onChange, rows = 3, placeholder, mono = false }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean }) {
  return (
    <textarea
      rows={rows}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors resize-none ${mono ? 'font-mono text-[11px]' : ''}`}
    />
  );
}

function EditorMediaZone({ url, onChange, mediaType }: { url: string; onChange: (v: string) => void; mediaType: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const icons: Record<string, any> = { image: ImageIcon, video: Video, gif: Smile };
  const Icon = icons[mediaType] || ImageIcon;
  const accept = mediaType === 'video' ? 'video/*' : 'image/*,image/gif';

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) onChange(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden group ${
          url ? 'border-zinc-700/50 bg-zinc-900/20' : 'border-zinc-800 hover:border-[#5e6ad2]/60 hover:bg-zinc-900/30 cursor-pointer'
        }`}
        onClick={() => !url && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[#5e6ad2]/60'); }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-[#5e6ad2]/60'); }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-[#5e6ad2]/60');
          const text = e.dataTransfer.getData('text/plain');
          if (text) { onChange(text); return; }
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {url ? (
          <div className="relative">
            {mediaType === 'video'
              ? <video src={url} className="w-full max-h-36 object-cover" />
              : <img src={url} alt="" className="w-full max-h-36 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            }
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 border border-red-800/60 rounded-lg text-[10px] text-red-300 font-medium backdrop-blur-sm"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2 select-none">
            <div className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-center mb-1">
              <Icon className="w-5 h-5 text-zinc-600" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-500">Drop file or click to upload</span>
            <span className="text-[9px] text-zinc-700 font-mono">or paste a URL below</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* URL input */}
      <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-3 py-2 focus-within:border-zinc-600 transition-colors">
        <UploadCloud className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        <input
          type="text"
          placeholder="https://example.com/image.png"
          value={url || ''}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 placeholder:text-zinc-700 outline-none"
        />
        {url && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
      </div>
    </div>
  );
}

function EditorMultipleMediaZone({ urls = [], onChange }: { urls: string[]; onChange: (v: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  
  const handleFiles = (files: FileList) => {
    const promises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => { if (e.target?.result) resolve(e.target.result as string); };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(newUrls => {
      onChange([...urls, ...newUrls]);
    });
  };

  const handleAddUrl = (newUrl: string) => {
    if (!newUrl.trim()) return;
    onChange([...urls, newUrl.trim()]);
  };

  const handleRemove = (idx: number) => {
    onChange(urls.filter((_, i) => i !== idx));
  };

  const moveItem = (idx: number, dir: 'left' | 'right') => {
    const target = dir === 'left' ? idx - 1 : idx + 1;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className="relative rounded-xl border-2 border-dashed border-zinc-800 hover:border-[#5e6ad2]/60 hover:bg-zinc-900/30 cursor-pointer transition-all p-5 text-center"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[#5e6ad2]/60'); }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-[#5e6ad2]/60'); }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-[#5e6ad2]/60');
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
        <span className="text-[11px] font-semibold text-zinc-400 block">Upload multiple media files</span>
        <span className="text-[9px] text-zinc-600 font-mono">Drag & drop or click to browse</span>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => { if (e.target.files) handleFiles(e.target.files); }} />
      </div>

      {/* Manual URL Paste */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste image/video URL..."
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddUrl(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600"
        />
        <button
          onClick={e => {
            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
            handleAddUrl(input.value);
            input.value = '';
          }}
          className="px-3 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] text-zinc-300 transition-colors"
        >
          Add
        </button>
      </div>

      {/* Grid of uploaded thumbnails */}
      {urls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 border border-zinc-800/50 p-2 rounded-xl bg-zinc-955/40">
          {urls.map((url, i) => {
            const isVideo = url.match(/\.(mp4|webm|mov|m4v|ogg)$/i) || url.includes('data:video');
            return (
              <div key={i} className="relative aspect-square rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900 group">
                {isVideo ? (
                  <video src={url} className="w-full h-full object-cover" />
                ) : (
                  <img src={url} className="w-full h-full object-cover" alt="" />
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={() => moveItem(i, 'left')}
                    disabled={i === 0}
                    className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1 text-zinc-400 hover:text-red-400 transition-all"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(i, 'right')}
                    disabled={i === urls.length - 1}
                    className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BLOCK INLINE EDITOR
// ============================================================
function BlockInlineEditor({ block, onUpdate }: { block: Block; onUpdate: (data: any) => void }) {
  const { type, data } = block;

  if (type === 'hero') return (
    <div className="space-y-3">
      <EditorField label="Subtitle"><EditorInput value={data.subtitle || ''} onChange={(v: string) => onUpdate({ ...data, subtitle: v })} placeholder="One-line release summary..." /></EditorField>
      <EditorField label="Cover Image URL (Banner layout)"><EditorInput value={data.coverUrl || ''} onChange={(v: string) => onUpdate({ ...data, coverUrl: v })} placeholder="https://..." mono /></EditorField>
    </div>
  );

  if (['title', 'subtitle', 'paragraph', 'callout', 'warning'].includes(type)) return (
    <EditorField label="Content">
      <EditorTextarea value={data.text || ''} rows={type === 'paragraph' ? 4 : 2} onChange={(v: string) => onUpdate({ ...data, text: v })} placeholder="Write content..." />
    </EditorField>
  );

  if (type === 'quote') return (
    <div className="space-y-3">
      <EditorField label="Quote"><EditorTextarea value={data.text || ''} rows={2} onChange={(v: string) => onUpdate({ ...data, text: v })} /></EditorField>
      <EditorField label="Attribution"><EditorInput value={data.author || ''} onChange={(v: string) => onUpdate({ ...data, author: v })} placeholder="Author name" /></EditorField>
    </div>
  );

  if (type === 'code_block') return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <EditorField label="Language">
          <select value={data.language || 'javascript'} onChange={e => onUpdate({ ...data, language: e.target.value })}
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 focus:bg-zinc-900 cursor-pointer">
            {['javascript', 'typescript', 'python', 'go', 'rust', 'bash', 'sql', 'json', 'html', 'css', 'yaml', 'tsx', 'jsx'].map(l => (
              <option key={l} value={l} className="bg-zinc-950">{l}</option>
            ))}
          </select>
        </EditorField>
        <EditorField label="Filename"><EditorInput value={data.filename || ''} onChange={(v: string) => onUpdate({ ...data, filename: v })} placeholder="main.ts" mono /></EditorField>
      </div>
      <EditorField label="Code"><EditorTextarea value={data.code || ''} rows={6} onChange={(v: string) => onUpdate({ ...data, code: v })} mono placeholder="// paste code..." /></EditorField>
    </div>
  );

  if (type === 'image') return (
    <div className="space-y-3">
      <EditorMultipleMediaZone urls={data.urls || []} onChange={(v: string[]) => onUpdate({ ...data, urls: v })} />
      <EditorField label="Caption"><EditorInput value={data.caption || ''} onChange={(v: string) => onUpdate({ ...data, caption: v })} placeholder="Optional caption..." /></EditorField>
    </div>
  );

  if (['video', 'gif'].includes(type)) return (
    <div className="space-y-3">
      <EditorMediaZone url={data.url || ''} onChange={(v: string) => onUpdate({ ...data, url: v })} mediaType={type} />
      <EditorField label="Caption"><EditorInput value={data.caption || ''} onChange={(v: string) => onUpdate({ ...data, caption: v })} placeholder="Optional caption..." /></EditorField>
    </div>
  );

  if (type === 'before_after') return (
    <div className="space-y-3">
      <EditorField label="Before URL"><EditorInput value={data.beforeUrl || ''} onChange={(v: string) => onUpdate({ ...data, beforeUrl: v })} placeholder="https://..." mono /></EditorField>
      <EditorField label="After URL"><EditorInput value={data.afterUrl || ''} onChange={(v: string) => onUpdate({ ...data, afterUrl: v })} placeholder="https://..." mono /></EditorField>
      <div className="grid grid-cols-2 gap-2">
        <EditorField label="Before Label"><EditorInput value={data.beforeLabel || ''} onChange={(v: string) => onUpdate({ ...data, beforeLabel: v })} placeholder="Before" /></EditorField>
        <EditorField label="After Label"><EditorInput value={data.afterLabel || ''} onChange={(v: string) => onUpdate({ ...data, afterLabel: v })} placeholder="After" /></EditorField>
      </div>
    </div>
  );

  if (type === 'security_alert') return (
    <div className="space-y-3">
      <EditorField label="Advisory Title"><EditorInput value={data.title || ''} onChange={(v: string) => onUpdate({ ...data, title: v })} /></EditorField>
      <div className="grid grid-cols-2 gap-2">
        <EditorField label="CVE Code"><EditorInput value={data.cve || ''} onChange={(v: string) => onUpdate({ ...data, cve: v })} placeholder="CVE-2024-..." mono /></EditorField>
        <EditorField label="CVSS Score"><EditorInput value={data.cvss || ''} onChange={(v: string) => onUpdate({ ...data, cvss: v })} placeholder="9.8" mono /></EditorField>
      </div>
      <EditorField label="Affected Component"><EditorInput value={data.affected || ''} onChange={(v: string) => onUpdate({ ...data, affected: v })} /></EditorField>
      <EditorField label="Mitigation"><EditorInput value={data.mitigation || ''} onChange={(v: string) => onUpdate({ ...data, mitigation: v })} /></EditorField>
    </div>
  );

  if (type === 'developer_notes') return (
    <div className="space-y-3">
      <EditorField label="Title"><EditorInput value={data.title || ''} onChange={(v: string) => onUpdate({ ...data, title: v })} /></EditorField>
      <EditorField label="Notes"><EditorTextarea value={data.notes || ''} rows={5} onChange={(v: string) => onUpdate({ ...data, notes: v })} mono /></EditorField>
    </div>
  );

  if (type === 'metrics') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Metric Cards</div>
        {items.map((item: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_80px_60px] gap-2 items-center">
            <EditorInput value={item.label} onChange={(v: string) => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, label: v } : x) })} placeholder="Label" />
            <EditorInput value={item.value} onChange={(v: string) => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, value: v } : x) })} placeholder="+45%" mono />
            <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { label: 'Metric', value: '0', change: '', isGood: true }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add metric
        </button>
      </div>
    );
  }

  if (type === 'changelog_list') {
    const items = data.items || [];
    const tags = ['New', 'Fixed', 'Improved', 'Breaking', 'Removed'];
    return (
      <div className="space-y-2">
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Changelog Entries</div>
        {items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 items-start">
            <select value={item.tag || 'New'} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, tag: e.target.value } : x) })}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-2 text-[11px] text-zinc-400 outline-none shrink-0">
              {tags.map(t => <option key={t} value={t} className="bg-zinc-950">{t}</option>)}
            </select>
            <input type="text" value={item.text || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, text: e.target.value } : x) })} placeholder="Description..."
              className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors" />
            <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-2 text-zinc-700 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { tag: 'New', text: '' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add entry
        </button>
      </div>
    );
  }

  if (type === 'timeline') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="space-y-1.5 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
            <div className="grid grid-cols-[80px_1fr] gap-2">
              <input type="text" value={item.date || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, date: e.target.value } : x) })} placeholder="Q1 2025"
                className="bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[10px] font-mono text-zinc-400 outline-none" />
              <div className="flex gap-1">
                <input type="text" value={item.title || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, title: e.target.value } : x) })} placeholder="Title"
                  className="flex-1 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[12px] text-zinc-300 outline-none" />
                <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-all"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <input type="text" value={item.description || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, description: e.target.value } : x) })} placeholder="Description..."
              className="w-full bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-400 outline-none" />
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { date: '', title: '', description: '' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add milestone
        </button>
      </div>
    );
  }

  if (type === 'checklist') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="w-4 h-4 rounded border border-zinc-700 shrink-0" />
            <input type="text" value={item.text || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, text: e.target.value } : x) })} placeholder="Task description..."
              className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600" />
            <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-all"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { text: '', checked: false }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add item
        </button>
      </div>
    );
  }

  if (type === 'system_status') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" value={item.name || ''} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, name: e.target.value } : x) })} placeholder="Service name"
              className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[12px] text-zinc-300 outline-none focus:border-zinc-600" />
            <select value={item.status || 'operational'} onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, status: e.target.value } : x) })}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-400 outline-none">
              {['operational', 'degraded', 'down'].map(s => <option key={s} value={s} className="bg-zinc-950">{s}</option>)}
            </select>
            <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { name: 'Service', status: 'operational' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add service
        </button>
      </div>
    );
  }

  if (type === 'faq') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">FAQ Items</div>
        {items.map((item: any, i: number) => (
          <div key={i} className="space-y-1.5 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
            <div className="flex gap-2">
              <input type="text" value={item.title || item.question || ''}
                onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, title: e.target.value, question: e.target.value } : x) })}
                placeholder="Question..."
                className="flex-1 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[12px] text-zinc-300 outline-none focus:border-zinc-600" />
              <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-all"><X className="w-3.5 h-3.5" /></button>
            </div>
            <textarea rows={2} value={item.content || item.answer || ''}
              onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, content: e.target.value, answer: e.target.value } : x) })}
              placeholder="Answer..."
              className="w-full bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-400 outline-none focus:border-zinc-600 resize-none" />
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { title: '', content: '' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add question
        </button>
      </div>
    );
  }

  if (type === 'links') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" value={item.label || ''}
              onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, label: e.target.value } : x) })}
              placeholder="Label" className="w-24 shrink-0 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-600" />
            <input type="text" value={item.url || ''}
              onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, url: e.target.value } : x) })}
              placeholder="https://..." className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-zinc-600" />
            <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-all"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { label: 'Link', url: 'https://' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add link
        </button>
      </div>
    );
  }

  if (type === 'attachments') {
    const items = data.items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="space-y-1.5 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
            <div className="flex gap-2">
              <input type="text" value={item.name || ''}
                onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, name: e.target.value } : x) })}
                placeholder="filename.pdf" className="flex-1 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 outline-none" />
              <input type="text" value={item.size || ''}
                onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, size: e.target.value } : x) })}
                placeholder="1.2 MB" className="w-20 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[10px] font-mono text-zinc-400 outline-none" />
              <button onClick={() => onUpdate({ ...data, items: items.filter((_: any, xi: number) => xi !== i) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800"><X className="w-3.5 h-3.5" /></button>
            </div>
            <input type="text" value={item.url || ''}
              onChange={e => onUpdate({ ...data, items: items.map((x: any, xi: number) => xi === i ? { ...x, url: e.target.value } : x) })}
              placeholder="Download URL (https://...)" className="w-full bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] font-mono text-zinc-400 outline-none" />
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, items: [...items, { name: 'file.zip', size: '', url: '' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add attachment
        </button>
      </div>
    );
  }

  if (type === 'table') {
    const headers = data.headers || ['Col 1', 'Col 2'];
    const rows = data.rows || [];
    return (
      <div className="space-y-3">
        <EditorField label="Column Headers (comma-separated)">
          <EditorInput
            value={headers.join(', ')}
            onChange={(v: string) => onUpdate({ ...data, headers: v.split(',').map((s: string) => s.trim()) })}
            placeholder="Feature, Status, Version"
          />
        </EditorField>
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Rows</div>
        {rows.map((row: string[], ri: number) => (
          <div key={ri} className="flex gap-1.5 items-center">
            {headers.map((_: string, ci: number) => (
              <input key={ci} type="text" value={row[ci] || ''}
                onChange={e => {
                  const newRows = rows.map((r: string[], rri: number) => rri === ri ? r.map((c: string, cci: number) => cci === ci ? e.target.value : c) : r);
                  onUpdate({ ...data, rows: newRows });
                }}
                placeholder={`Col ${ci + 1}`}
                className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-zinc-600 min-w-0" />
            ))}
            <button onClick={() => onUpdate({ ...data, rows: rows.filter((_: string[], rri: number) => rri !== ri) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, rows: [...rows, Array(headers.length).fill('')] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add row
        </button>
      </div>
    );
  }

  if (type === 'performance_graph') {
    const datasets = data.datasets || [];
    return (
      <div className="space-y-3">
        <EditorField label="Chart Title"><EditorInput value={data.title || ''} onChange={(v: string) => onUpdate({ ...data, title: v })} placeholder="Latency" /></EditorField>
        <EditorField label="Labels (comma-separated)">
          <EditorInput value={(data.labels || []).join(', ')} onChange={(v: string) => onUpdate({ ...data, labels: v.split(',').map((s: string) => s.trim()) })} placeholder="P50, P95, P99" />
        </EditorField>
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Datasets</div>
        {datasets.map((ds: any, di: number) => (
          <div key={di} className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40 space-y-2">
            <div className="flex gap-2 items-center">
              <input type="color" value={ds.color || '#5e6ad2'} onChange={e => onUpdate({ ...data, datasets: datasets.map((d: any, dii: number) => dii === di ? { ...d, color: e.target.value } : d) })} className="w-7 h-7 rounded border border-zinc-800 bg-transparent cursor-pointer p-0.5" />
              <input type="text" value={ds.label || ''} onChange={e => onUpdate({ ...data, datasets: datasets.map((d: any, dii: number) => dii === di ? { ...d, label: e.target.value } : d) })} placeholder="Series name"
                className="flex-1 bg-zinc-900 border border-zinc-800/60 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 outline-none" />
              <button onClick={() => onUpdate({ ...data, datasets: datasets.filter((_: any, dii: number) => dii !== di) })} className="p-1.5 text-zinc-700 hover:text-red-400 rounded-lg hover:bg-zinc-800"><X className="w-3 h-3" /></button>
            </div>
            <EditorInput value={(ds.data || []).join(', ')} onChange={(v: string) => onUpdate({ ...data, datasets: datasets.map((d: any, dii: number) => dii === di ? { ...d, data: v.split(',').map((s: string) => parseFloat(s.trim()) || 0) } : d) })} placeholder="12, 45, 120" mono />
          </div>
        ))}
        <button onClick={() => onUpdate({ ...data, datasets: [...datasets, { label: 'Series', data: [], color: '#5e6ad2' }] })}
          className="w-full py-1.5 rounded-lg border border-dashed border-zinc-800 text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all">
          + Add dataset
        </button>
      </div>
    );
  }

  return <p className="text-[10px] text-zinc-600 font-mono italic">Select a block to edit its content.</p>;
}

// ============================================================
// RELEASE STUDIO
// ============================================================
const BLOCK_PALETTE = [
  {
    group: 'Content', items: [
      { type: 'title' as BlockType, icon: Heading1, label: 'Heading' },
      { type: 'paragraph' as BlockType, icon: AlignLeft, label: 'Text' },
      { type: 'quote' as BlockType, icon: Quote, label: 'Quote' },
      { type: 'callout' as BlockType, icon: Info, label: 'Callout' },
      { type: 'warning' as BlockType, icon: AlertTriangle, label: 'Warning' },
      { type: 'divider' as BlockType, icon: Minus, label: 'Divider' },
    ]
  },
  {
    group: 'Media', items: [
      { type: 'image' as BlockType, icon: ImageIcon, label: 'Image' },
      { type: 'video' as BlockType, icon: Video, label: 'Video' },
      { type: 'gif' as BlockType, icon: Smile, label: 'GIF' },
      { type: 'before_after' as BlockType, icon: Layers, label: 'Compare' },
      { type: 'code_block' as BlockType, icon: Code2, label: 'Code' },
    ]
  },
  {
    group: 'Data', items: [
      { type: 'metrics' as BlockType, icon: BarChart2, label: 'Metrics' },
      { type: 'performance_graph' as BlockType, icon: Activity, label: 'Graph' },
      { type: 'system_status' as BlockType, icon: Server, label: 'Status' },
      { type: 'table' as BlockType, icon: Table, label: 'Table' },
      { type: 'timeline' as BlockType, icon: Clock, label: 'Timeline' },
      { type: 'changelog_list' as BlockType, icon: Hash, label: 'Changelog' },
    ]
  },
  {
    group: 'Interactive', items: [
      { type: 'checklist' as BlockType, icon: CheckSquare, label: 'Checklist' },
      { type: 'faq' as BlockType, icon: HelpCircle, label: 'FAQ' },
      { type: 'links' as BlockType, icon: Link2, label: 'Links' },
      { type: 'attachments' as BlockType, icon: Download, label: 'Files' },
      { type: 'security_alert' as BlockType, icon: ShieldAlert, label: 'CVE' },
      { type: 'developer_notes' as BlockType, icon: Terminal, label: 'Dev Notes' },
    ]
  },
];

const BLOCK_ICONS: Partial<Record<BlockType, any>> = {
  hero: Flame, title: Heading1, subtitle: Type, paragraph: AlignLeft,
  callout: Info, warning: AlertTriangle, security_alert: ShieldAlert,
  code_block: Code2, image: ImageIcon, video: Video, gif: Smile,
  before_after: Layers, metrics: BarChart2, timeline: Clock,
  checklist: CheckSquare, quote: Quote, divider: Minus,
  faq: HelpCircle, links: Link2, attachments: Download, table: Table,
  performance_graph: Activity, system_status: Server,
  developer_notes: Terminal, changelog_list: Hash,
};

const DEFAULT_DATA: Partial<Record<BlockType, any>> = {
  title: { text: 'New Section' },
  subtitle: { text: 'Subheading' },
  paragraph: { text: '' },
  callout: { text: 'Key information to highlight.' },
  warning: { text: 'Important warning or breaking change.' },
  quote: { text: 'A great quote.', author: '' },
  code_block: { code: '', language: 'typescript', filename: '' },
  image: { url: '', caption: '' },
  video: { url: '', caption: '' },
  gif: { url: '', caption: '' },
  before_after: { beforeUrl: '', afterUrl: '', beforeLabel: 'Before', afterLabel: 'After' },
  metrics: { items: [{ label: 'Response Time', value: '-45%', change: '-45%', isGood: true }, { label: 'Error Rate', value: '0.01%', change: '-99%', isGood: true }] },
  timeline: { items: [{ date: 'Q1 2025', title: 'Launch', description: 'Initial release.' }] },
  checklist: { items: [{ text: 'Verify deployment', checked: false }, { text: 'Clear cache', checked: false }] },
  divider: {},
  faq: { items: [{ title: 'Question', content: 'Answer here.' }] },
  links: { items: [{ label: 'Documentation', url: 'https://' }, { label: 'GitHub', url: 'https://github.com' }] },
  attachments: { items: [{ name: 'release_notes.pdf', size: '1.2 MB', url: '#' }] },
  table: { headers: ['Feature', 'Status', 'Version'], rows: [['New Feature', 'Released', 'v2.4']] },
  performance_graph: { title: 'Latency', labels: ['P50', 'P95', 'P99'], datasets: [{ label: 'After', data: [12, 45, 120], color: '#10b981' }, { label: 'Before', data: [80, 320, 900], color: '#ef4444' }] },
  system_status: { items: [{ name: 'API Gateway', status: 'operational' }, { name: 'Auth Service', status: 'operational' }, { name: 'Database', status: 'operational' }] },
  developer_notes: { title: 'SDK Changes', notes: '// Breaking: removed deprecated methods\n// Action: update to new API' },
  changelog_list: { items: [{ tag: 'New', text: '' }, { tag: 'Fixed', text: '' }] },
  security_alert: { title: '', cvss: '', cve: '', affected: '', mitigation: 'Upgrade to latest version' },
};

function ReleaseStudio({ initialUpdate, onClose, onSaved, currentUsername, isFirst50 }: { initialUpdate: Update | null; onClose: () => void; onSaved: () => void; currentUsername: string | null; isFirst50: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState<'idle' | 'saving' | 'saved'>('idle');

  const parsed = useMemo(() => initialUpdate
    ? parseReleaseContent(initialUpdate.content, initialUpdate.title)
    : { is_rich_format: true as const, customization: { ...DEFAULT_CUSTOMIZATION }, options: { ...DEFAULT_OPTIONS }, status: 'draft' as const, blocks: [{ id: 'hero-init', type: 'hero' as BlockType, data: { title: 'New Release', subtitle: '' } }] }, [initialUpdate]);

  const [title, setTitle] = useState(initialUpdate?.title || 'New Release');
  const [version, setVersion] = useState(initialUpdate?.version || '');
  const [category, setCategory] = useState(initialUpdate?.category || 'feature');
  const [customization, setCustomization] = useState<Customization>(parsed.customization);
  const [options, setOptions] = useState<AdvancedReleaseOptions>(parsed.options);
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'archived'>(parsed.status);
  const [tab, setTab] = useState<'blocks' | 'style' | 'options'>('blocks');
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Undo/redo history
  const [blocks, setBlocksRaw] = useState<Block[]>(parsed.blocks);
  const historyRef = useRef<Block[][]>([parsed.blocks]);
  const historyIdx = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Advanced feature state
  const [blockSearch, setBlockSearch] = useState('');
  const [recentBlockTypes, setRecentBlockTypes] = useState<BlockType[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Word count + read time
  const wordCount = useMemo(() => {
    const text = blocks.map(b => {
      const d = b.data || {};
      return [d.text, d.title, d.subtitle, d.notes, d.code, d.question, d.answer]
        .filter(Boolean).join(' ');
    }).join(' ');
    return text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
  }, [blocks]);
  const readTime = Math.max(1, Math.round(wordCount / 200));

  // Filtered block palette for search
  const filteredPalette = useMemo(() => {
    if (!blockSearch.trim()) return BLOCK_PALETTE;
    const q = blockSearch.toLowerCase();
    return BLOCK_PALETTE
      .map(g => ({ ...g, items: g.items.filter(item => item.label.toLowerCase().includes(q) || item.type.includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [blockSearch]);

  // Export to Markdown
  const exportMarkdown = useCallback(() => {
    const lines: string[] = [
      `---`,
      `title: "${title}"`,
      `version: "${version}"`,
      `category: "${category}"`,
      `date: "${new Date().toISOString()}"`,
      `---`, ``,
    ];
    blocks.forEach(b => {
      const d = b.data || {};
      switch (b.type) {
        case 'hero': lines.push(`# ${d.title || 'Untitled'}`, d.subtitle ? `\n${d.subtitle}` : '', ''); break;
        case 'title': lines.push(`## ${d.text || ''}`, ''); break;
        case 'subtitle': lines.push(`### ${d.text || ''}`, ''); break;
        case 'paragraph': lines.push(d.text || '', ''); break;
        case 'quote': lines.push(`> ${d.text || ''}`, d.author ? `> — ${d.author}` : '', ''); break;
        case 'callout': lines.push(`> 💡 **Note:** ${d.text || ''}`, ''); break;
        case 'warning': lines.push(`> ⚠️ **Warning:** ${d.text || ''}`, ''); break;
        case 'divider': lines.push('---', ''); break;
        case 'code_block': lines.push(`\`\`\`${d.language || ''}${d.filename ? ` // ${d.filename}` : ''}`, d.code || '', '\`\`\`', ''); break;
        case 'image': lines.push(`![${d.caption || 'image'}](${d.url || ''})`, d.caption ? `*${d.caption}*` : '', ''); break;
        case 'changelog_list':
          (d.items || []).forEach((item: any) => lines.push(`- **[${item.tag}]** ${item.text}`));
          lines.push('');
          break;
        case 'checklist':
          (d.items || []).forEach((item: any) => lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`));
          lines.push('');
          break;
        case 'faq':
          (d.items || []).forEach((item: any) => { lines.push(`**Q: ${item.title || item.question}**`, `A: ${item.content || item.answer}`, ''); });
          break;
        case 'links':
          (d.items || []).forEach((item: any) => lines.push(`- [${item.label}](${item.url})`));
          lines.push('');
          break;
        default: break;
      }
    });
    const md = lines.join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'release').replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [blocks, title, version, category]);

  // Copy release JSON to clipboard
  const copyAsJSON = useCallback(() => {
    const richData: RichReleaseData = { is_rich_format: true, customization, options, blocks, status };
    navigator.clipboard.writeText(JSON.stringify(richData, null, 2));
  }, [customization, options, blocks, status]);

  const setBlocks = useCallback((updater: Block[] | ((prev: Block[]) => Block[]), pushHistory = true) => {
    setBlocksRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (pushHistory) {
        historyRef.current = historyRef.current.slice(0, historyIdx.current + 1);
        historyRef.current.push(next);
        if (historyRef.current.length > 50) historyRef.current.shift();
        historyIdx.current = historyRef.current.length - 1;
        setCanUndo(historyIdx.current > 0);
        setCanRedo(false);
        // Trigger auto-save
        setAutoSaveStatus('pending');
      }
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    setBlocksRaw(historyRef.current[historyIdx.current]);
    setCanUndo(historyIdx.current > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyRef.current.length - 1) return;
    historyIdx.current += 1;
    setBlocksRaw(historyRef.current[historyIdx.current]);
    setCanUndo(true);
    setCanRedo(historyIdx.current < historyRef.current.length - 1);
  }, []);

  // Auto-save debounce (3s after last change)
  useEffect(() => {
    if (autoSaveStatus !== 'pending') return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saving');
      const richData: RichReleaseData = { is_rich_format: true, customization, options, blocks, status };
      startTransition(async () => {
        const result = await saveRichUpdate(initialUpdate?.id || null, title, version, category, JSON.stringify(richData));
        setAutoSaveStatus(result.success ? 'saved' : 'idle');
        if (result.success) setTimeout(() => setAutoSaveStatus('idle'), 3000);
      });
    }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [autoSaveStatus, blocks, title, version, category, customization, options, status, initialUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (ctrl && e.key === 's') { e.preventDefault(); handlePublish('draft'); }
      if (ctrl && e.key === 'Enter') { e.preventDefault(); handlePublish('published'); }
      if (ctrl && e.key === '/') { e.preventDefault(); setShowShortcutsModal(p => !p); }
      if (e.key === 'Escape' && !isInput) { setActiveBlockId(null); setShowShortcutsModal(false); }
      if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Sync title into hero block
  const handleTitleChange = (v: string) => {
    setTitle(v);
    setBlocks(prev => prev.map(b => b.type === 'hero' ? { ...b, data: { ...b.data, title: v } } : b));
  };

  const addBlock = (type: BlockType) => {
    const id = `blk-${Date.now()}`;
    setBlocks(prev => [...prev, { id, type, data: { ...(DEFAULT_DATA[type] || {}) } }]);
    setActiveBlockId(id);
    setRecentBlockTypes(prev => [type, ...prev.filter(t => t !== type)].slice(0, 4));
    setTimeout(() => document.getElementById(`block-editor-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  };

  const removeBlock = (id: string) => {
    setBlocks(p => p.filter(b => b.id !== id));
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const newId = `blk-${Date.now()}`;
    const newBlock: Block = { ...block, id: newId, data: JSON.parse(JSON.stringify(block.data)) };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setActiveBlockId(newId);
  };

  const moveBlock = (idx: number, dir: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const to = dir === 'up' ? idx - 1 : idx + 1;
    if (to < 0 || to >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[to]] = [newBlocks[to], newBlocks[idx]];
    setBlocks(newBlocks);
  };

  const updateBlockData = (id: string, data: any) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data } : b));

  const handlePublish = (targetStatus: 'published' | 'draft') => {
    setError(null);
    setSaveLabel('saving');
    const richData: RichReleaseData = { is_rich_format: true, customization, options, blocks, status: targetStatus };
    startTransition(async () => {
      const result = await saveRichUpdate(initialUpdate?.id || null, title, version, category, JSON.stringify(richData));
      if (result.success) { setSaveLabel('saved'); setTimeout(() => { setSaveLabel('idle'); onSaved(); }, 800); }
      else { setError(result.error || 'Failed to save'); setSaveLabel('idle'); }
    });
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);
  const bgCanvas = { desktop: 'max-w-4xl', tablet: 'max-w-lg', mobile: 'max-w-sm' }[previewWidth];

  // Keyboard Shortcuts Modal
  const SHORTCUTS = [
    { key: 'Ctrl+Z', desc: 'Undo last change' },
    { key: 'Ctrl+Y', desc: 'Redo' },
    { key: 'Ctrl+S', desc: 'Save as Draft' },
    { key: 'Ctrl+Enter', desc: 'Publish release' },
    { key: 'Ctrl+/', desc: 'Toggle shortcuts panel' },
    { key: 'F11', desc: 'Toggle fullscreen preview' },
    { key: 'Esc', desc: 'Close block editor / modal' },
  ];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-[60]' : 'fixed inset-0 z-50'} bg-[#060608] flex flex-col`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Keyboard shortcuts modal */}
      <AnimatePresence>
        {showShortcutsModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowShortcutsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0f0f13] border border-zinc-800 rounded-2xl p-6 w-[400px] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-[#5e6ad2]" />
                  <span className="text-[13px] font-bold text-zinc-200">Keyboard Shortcuts</span>
                </div>
                <button onClick={() => setShowShortcutsModal(false)} className="w-6 h-6 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {SHORTCUTS.map(({ key, desc }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-zinc-800/40 last:border-0">
                    <span className="text-[12px] text-zinc-400">{desc}</span>
                    <kbd className="px-2 py-1 bg-zinc-900 border border-zinc-700/60 rounded-lg text-[9px] font-mono text-zinc-300 tracking-wide">{key}</kbd>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[9px] text-zinc-700 text-center font-mono">Press Ctrl+/ to toggle this panel</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-11 border-b border-white/[0.05] bg-black/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5e6ad2] shadow-[0_0_6px_rgba(94,106,210,0.8)]" />
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-zinc-300">Release Studio</span>
          <span className="text-zinc-700 text-[10px] font-mono border-l border-zinc-800 pl-2.5">{title || 'Untitled'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className={`w-1.5 h-1.5 rounded-full transition-all ${
              autoSaveStatus === 'saved' ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' :
              autoSaveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
              autoSaveStatus === 'pending' ? 'bg-zinc-600 animate-pulse' : 'bg-zinc-800'
            }`} />
            <span className="text-[9px] font-mono text-zinc-700">
              {autoSaveStatus === 'saved' ? 'autosaved' : autoSaveStatus === 'saving' ? 'saving…' : autoSaveStatus === 'pending' ? 'unsaved' : ''}
            </span>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0 border border-zinc-800/60 rounded-lg overflow-hidden">
            <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-20 transition-all">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-20 transition-all">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Export + tools */}
          <button onClick={exportMarkdown} title="Export as Markdown" className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
            <FileDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={copyAsJSON} title="Copy as JSON" className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowShortcutsModal(true)} title="Keyboard Shortcuts (Ctrl+/)" className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
            <Keyboard className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(p => !p)} title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen preview (F11)'} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Status badge */}
          <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            status === 'published' ? 'border-emerald-800/60 text-emerald-400 bg-emerald-950/30' : 'border-zinc-800 text-zinc-600 bg-zinc-950/60'
          }`}>
            {saveLabel === 'saving' ? 'saving…' : saveLabel === 'saved' ? '✓ saved' : status}
          </span>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Save / Publish */}
          <button onClick={() => handlePublish('draft')} disabled={isPending}
            title="Save Draft (Ctrl+S)"
            className="px-3 h-7 border border-zinc-800 rounded-lg text-[10px] font-semibold text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all disabled:opacity-40">
            Draft <span className="text-zinc-700 ml-1">⌘S</span>
          </button>
          <button onClick={() => handlePublish('published')} disabled={isPending}
            title="Publish (Ctrl+Enter)"
            className="px-4 h-7 bg-[#5e6ad2] hover:bg-[#6b78e5] rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-40 shadow-lg shadow-[#5e6ad2]/25 flex items-center gap-1.5">
            {isPending ? <><RotateCw className="w-3 h-3 animate-spin" />Saving</> : <><Sparkles className="w-3 h-3" />Publish</>}
          </button>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar */}
        <aside className="w-[340px] shrink-0 border-r border-white/[0.04] flex flex-col bg-[#09090c] overflow-hidden">

          {/* Tab bar */}
          <div className="flex gap-1 p-2 bg-[#0c0c0f] border-b border-white/[0.04] shrink-0">
            {(['blocks', 'style', 'options'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${tab === t ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50'}`}>
                {t === 'style' ? 'Styling' : t === 'options' ? 'Options' : 'Blocks'}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {error && <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-[11px] font-mono text-red-400">{error}</div>}

            {/* ── BLOCKS TAB ── */}
            {tab === 'blocks' && (
              <div className="space-y-5">
                {/* Meta */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">Release Title</label>
                    <input type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
                      className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-600 outline-none py-1.5 text-[14px] font-semibold text-zinc-200 transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">Version</label>
                      <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="v2.5.0"
                        className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-600 outline-none py-1 text-[12px] text-zinc-400 font-mono transition-colors" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-800 outline-none py-1 text-[12px] text-zinc-400 cursor-pointer">
                        {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k} className="bg-zinc-950">{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-3 py-2 px-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-zinc-700" />
                    <span className="text-[10px] font-mono text-zinc-600">{wordCount} words</span>
                  </div>
                  <div className="w-px h-3 bg-zinc-800" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-700" />
                    <span className="text-[10px] font-mono text-zinc-600">{readTime} min read</span>
                  </div>
                  <div className="w-px h-3 bg-zinc-800" />
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-zinc-700" />
                    <span className="text-[10px] font-mono text-zinc-600">{blocks.length} blocks</span>
                  </div>
                </div>

                {/* Layers */}
                <div className="border-t border-white/[0.04] pt-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Layers</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded-full">{blocks.length}</span>
                    </div>
                  </div>
                  {blocks.map((block, idx) => {
                    const Icon = BLOCK_ICONS[block.type] || FileText;
                    const isActive = activeBlockId === block.id;
                    return (
                      <div key={block.id}
                        onClick={() => setActiveBlockId(isActive ? null : block.id)}
                        className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-[#5e6ad2]/10 border-[#5e6ad2]/30' : 'border-transparent hover:border-zinc-800/60 hover:bg-zinc-900/40'}`}>
                        <GripVertical className="w-3 h-3 text-zinc-800 shrink-0" />
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#5e6ad2]' : 'text-zinc-600'}`} />
                        <span className={`flex-1 text-[11px] font-medium capitalize truncate ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {block.type === 'hero' ? '⭑ Hero' : block.type.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); moveBlock(idx, 'up'); }} disabled={idx === 0} title="Move up"
                            className="p-1 text-zinc-700 hover:text-zinc-300 disabled:opacity-20 rounded transition-colors"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); moveBlock(idx, 'down'); }} disabled={idx === blocks.length - 1} title="Move down"
                            className="p-1 text-zinc-700 hover:text-zinc-300 disabled:opacity-20 rounded transition-colors"><ArrowDown className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }} disabled={block.type === 'hero'} title="Duplicate"
                            className="p-1 text-zinc-700 hover:text-blue-400 disabled:opacity-10 rounded transition-colors"><Files className="w-3 h-3" /></button>
                          <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} disabled={block.type === 'hero'} title="Delete"
                            className="p-1 text-zinc-700 hover:text-red-400 disabled:opacity-10 rounded transition-colors"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Block palette with search */}
                <div className="border-t border-white/[0.04] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Insert Block</div>
                    <span className="text-[9px] text-zinc-700 font-mono">{BLOCK_PALETTE.flatMap(g => g.items).length} types</span>
                  </div>

                  {/* Block search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-700" />
                    <input
                      type="text"
                      placeholder="Search blocks…"
                      value={blockSearch}
                      onChange={e => setBlockSearch(e.target.value)}
                      className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors"
                    />
                    {blockSearch && (
                      <button onClick={() => setBlockSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Recently used */}
                  {recentBlockTypes.length > 0 && !blockSearch && (
                    <div className="mb-4">
                      <div className="text-[8px] uppercase tracking-widest text-zinc-700 mb-2 font-bold">Recently Used</div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentBlockTypes.map(type => {
                          const Icon = BLOCK_ICONS[type] || FileText;
                          const label = BLOCK_PALETTE.flatMap(g => g.items).find(i => i.type === type)?.label || type;
                          return (
                            <button key={type} onClick={() => addBlock(type)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-lg text-[10px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all">
                              <Icon className="w-3 h-3" />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Filtered palette */}
                  {filteredPalette.length === 0 ? (
                    <p className="text-[10px] text-zinc-700 text-center py-4 font-mono">No blocks match "{blockSearch}"</p>
                  ) : (
                    filteredPalette.map(group => (
                      <div key={group.group} className="mb-4">
                        <div className="text-[8px] uppercase tracking-widest text-zinc-700 mb-2 font-bold px-0.5">{group.group}</div>
                        <div className="grid grid-cols-3 gap-1">
                          {group.items.map(({ type, icon: Icon, label }) => (
                            <button key={type} onClick={() => addBlock(type)}
                              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-transparent hover:border-zinc-800/60 hover:bg-zinc-900/50 transition-all group/btn active:scale-95">
                              <Icon className="w-4 h-4 text-zinc-600 group-hover/btn:text-zinc-200 transition-colors" />
                              <span className="text-[9px] text-zinc-600 group-hover/btn:text-zinc-200 transition-colors font-medium leading-none text-center">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── STYLE TAB ── */}
            {tab === 'style' && (
              <div className="space-y-5">
                {/* Accent */}
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-2">Accent Color</label>
                  <div className="flex items-center gap-2 mb-3">
                    <input type="color" value={customization.accent_color}
                      onChange={e => setCustomization(p => ({ ...p, accent_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg border border-zinc-800 bg-transparent cursor-pointer p-0.5" />
                    <input type="text" value={customization.accent_color}
                      onChange={e => setCustomization(p => ({ ...p, accent_color: e.target.value }))}
                      className="flex-1 bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 font-mono outline-none focus:border-zinc-600" />
                  </div>
                  <div className="flex gap-2">
                    {ACCENT_PRESETS.map(p => (
                      <button key={p.value} onClick={() => setCustomization(prev => ({ ...prev, accent_color: p.value }))}
                        title={p.name}
                        className="w-5 h-5 rounded-full border-2 hover:scale-110 transition-transform"
                        style={{ backgroundColor: p.value, borderColor: customization.accent_color === p.value ? 'white' : 'transparent' }} />
                    ))}
                  </div>
                </div>

                {/* Grid of select dropdowns */}
                {([
                  { key: 'cover_layout', label: 'Cover Layout', opts: [['minimal', 'Minimal'], ['gradient', 'Gradient'], ['aurora', 'Aurora Glow'], ['banner', 'Image Banner']] },
                  { key: 'typography', label: 'Typography', opts: [['inter', 'Inter'], ['outfit', 'Outfit'], ['mono', 'Mono'], ['serif', 'Serif']] },
                  { key: 'hero_alignment', label: 'Title Alignment', opts: [['left', 'Left'], ['center', 'Center'], ['right', 'Right']] },
                  { key: 'corner_radius', label: 'Corner Radius', opts: [['none', 'None'], ['sm', '8px'], ['md', '12px'], ['lg', '16px'], ['xl', '24px']] },
                  { key: 'content_width', label: 'Content Width', opts: [['narrow', 'Narrow 580px'], ['medium', 'Medium 740px'], ['wide', 'Wide 960px']] },
                  { key: 'background_pattern', label: 'Background Pattern', opts: [['none', 'None'], ['dots', 'Dot Grid'], ['grid', 'Line Grid'], ['noise', 'Noise Texture']] },
                  { key: 'spacing_scale', label: 'Spacing', opts: [['compact', 'Compact'], ['normal', 'Normal'], ['relaxed', 'Relaxed']] },
                  { key: 'theme_variant', label: 'Theme', opts: [['dark', 'Dark Slate'], ['oled', 'Pure OLED'], ['glass', 'Frosted Glass']] },
                ] as const).map(({ key, label, opts }) => (
                  <div key={key}>
                    <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">{label}</label>
                    <select value={(customization as any)[key]} onChange={e => setCustomization(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 cursor-pointer">
                      {opts.map(([v, l]) => <option key={v} value={v} className="bg-zinc-950">{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* ── OPTIONS TAB ── */}
            {tab === 'options' && (
              <div className="space-y-5">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">Release Codename</label>
                  <input type="text" placeholder="e.g. Aether, Kronos…" value={options.codename}
                    onChange={e => setOptions(p => ({ ...p, codename: e.target.value }))}
                    className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 font-mono placeholder:text-zinc-700 outline-none focus:border-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'channel', label: 'Channel', opts: [['stable', 'Stable'], ['beta', 'Beta'], ['canary', 'Canary'], ['internal', 'Internal']] },
                    { key: 'priority', label: 'Priority', opts: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']] },
                    { key: 'visibility', label: 'Visibility', opts: [['public', 'Public'], ['internal', 'Internal Only']] },
                  ] as const).map(({ key, label, opts }) => (
                    <div key={key} className={key === 'visibility' ? 'col-span-2' : ''}>
                      <label className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold block mb-1.5">{label}</label>
                      <select value={(options as any)[key]} onChange={e => setOptions(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-[12px] text-zinc-300 outline-none focus:border-zinc-600 cursor-pointer">
                        {opts.map(([v, l]) => <option key={v} value={v} className="bg-zinc-950">{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.04] pt-4 space-y-1.5">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-3">Flags</div>
                  {([
                    { key: 'is_pinned', label: 'Pin to Top', desc: 'Keep at top of timeline', icon: Pin, color: 'bg-blue-500' },
                    { key: 'is_featured', label: 'Featured', desc: 'Highlight with special banner', icon: Star, color: 'bg-amber-500' },
                    { key: 'is_critical', label: 'Critical Alert', desc: 'Flash danger indicator', icon: AlertCircle, color: 'bg-red-500' },
                    { key: 'rollback_ready', label: 'Rollback Ready', desc: 'Deprecation safe', icon: RotateCcw, color: 'bg-purple-500' },
                  ] as const).map(({ key, label, desc, icon: Icon, color }) => {
                    const on = options[key as keyof typeof options] as boolean;
                    return (
                      <button key={key} onClick={() => setOptions(p => ({ ...p, [key]: !on }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${on ? 'border-zinc-700/60 bg-zinc-800/40' : 'border-transparent hover:border-zinc-800/50 hover:bg-zinc-900/30'}`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${on ? 'text-zinc-300' : 'text-zinc-600'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-[11px] font-semibold ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</div>
                          <div className="text-[9px] text-zinc-700">{desc}</div>
                        </div>
                        <div className={`w-8 h-4 rounded-full transition-all relative ${on ? color : 'bg-zinc-800'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Block inline editor — pinned at bottom */}
          <AnimatePresence>
            {activeBlock && (
              <motion.div
                id={`block-editor-${activeBlock.id}`}
                key={activeBlock.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="border-t border-white/[0.04] bg-[#0c0c10] shrink-0"
              >
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between sticky top-0 bg-[#0c0c10] pb-2 -mt-1 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 rounded-full bg-[#5e6ad2]" />
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                        {activeBlock.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <button onClick={() => setActiveBlockId(null)} className="w-5 h-5 flex items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <BlockInlineEditor block={activeBlock} onUpdate={(d) => updateBlockData(activeBlock.id, d)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Preview canvas */}
        <main className="flex-1 flex flex-col bg-[#050507] overflow-hidden">
          {/* Preview bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-white/[0.04] bg-black/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Live Preview</span>
              </div>
              <div className="w-px h-3 bg-zinc-800" />
              <span className="text-[9px] font-mono text-zinc-700">{wordCount}w &middot; {readTime}min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-0.5 gap-0.5">
                {(['desktop', 'tablet', 'mobile'] as const).map(w => (
                  <button key={w} onClick={() => setPreviewWidth(w)}
                    className={`px-3 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all ${previewWidth === w ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            <div className={`w-full transition-all duration-300 ${bgCanvas}`}>
              <ReleaseCard
                data={{ is_rich_format: true, customization, options, blocks, status }}
                category={category} version={version} isPreview
                currentUsername={currentUsername}
                isFirst50={isFirst50}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PUBLIC PAGE
// ============================================================
export default function UpdatesList({ initialUpdates, isAdmin, currentUsername, isFirst50 = false, initialError }: {
  initialUpdates: Update[]; isAdmin: boolean; currentUsername: string | null; isFirst50?: boolean; initialError?: string;
}) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [activeToEdit, setActiveToEdit] = useState<Update | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const filtered = useMemo(() => updates.filter(u => {
    const data = parseReleaseContent(u.content, u.title);
    if (filterChannel !== 'all' && data.options?.channel !== filterChannel) return false;
    if (filterCategory !== 'all' && u.category !== filterCategory) return false;
    if (filterPriority !== 'all' && data.options?.priority !== filterPriority) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches = [u.title, u.version || '', data.options?.codename || ''].some(s => s.toLowerCase().includes(q));
      const bodyMatch = data.blocks.some(b => (b.data?.text || '').toLowerCase().includes(q));
      if (!matches && !bodyMatch) return false;
    }
    return true;
  }), [updates, filterChannel, filterCategory, filterPriority, search]);

  const pinned = filtered.filter(u => parseReleaseContent(u.content, u.title).options?.is_pinned);
  const standard = filtered.filter(u => !parseReleaseContent(u.content, u.title).options?.is_pinned);

  const openStudio = (u: Update | null = null) => { setActiveToEdit(u); setIsStudioOpen(true); };
  const closeStudio = () => { setIsStudioOpen(false); setActiveToEdit(null); };
  const onSaved = () => { closeStudio(); window.location.reload(); };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this release update? This action cannot be undone.')) return;
    const res = await deleteUpdate(id);
    if (res.success) {
      setUpdates(prev => prev.filter(u => u.id !== id));
    } else {
      alert(res.error || 'Failed to delete update');
    }
  };

  const activeFilterCount = [filterChannel !== 'all', filterCategory !== 'all', filterPriority !== 'all', search.trim() !== ''].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#070709] text-zinc-300" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Ambient top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[#5e6ad2]/40 to-transparent pointer-events-none" />

      {/* Jump-to-top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 shadow-xl transition-all"
            title="Back to top"
          >
            <ArrowRight className="w-4 h-4 -rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-6 py-20 relative">

        {/* Header */}
        <header className="mb-16 border-b border-zinc-800/40 pb-10">
          <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-[9px] uppercase tracking-[0.35em] text-zinc-600 font-bold">Verlyn Enterprise</span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[9px] font-mono text-zinc-700">Release Center</span>
              </div>
              <h1 className="text-[42px] font-bold text-zinc-100 tracking-[-0.02em] leading-tight mb-3">
                Release Notes
              </h1>
              <p className="text-[14px] text-zinc-500 max-w-lg leading-relaxed">
                Precision-engineered updates, security advisories, and infrastructure changes.
              </p>
            </div>
            {isAdmin && (
              <button onClick={() => openStudio()}
                className="shrink-0 flex items-center gap-2 px-4 h-9 border border-zinc-800 rounded-xl bg-zinc-900/60 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all">
                <Plus className="w-3.5 h-3.5" /> New Release
              </button>
            )}
          </div>
        </header>

        {initialError && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-[12px] font-mono text-red-400">{initialError}</div>
        )}

        {/* Toolbar */}
        <div className="mb-10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700" />
            <input type="text" placeholder="Search releases, codenames, versions…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800/60 rounded-xl py-2.5 pl-10 pr-4 text-[12px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-700 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {([
              { val: filterChannel, set: setFilterChannel, opts: [['all', 'All Channels'], ['stable', 'Stable'], ['beta', 'Beta'], ['canary', 'Canary']] },
              { val: filterCategory, set: setFilterCategory, opts: [['all', 'All Types'], ...Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label] as [string, string])] },
              { val: filterPriority, set: setFilterPriority, opts: [['all', 'All Priority'], ['critical', 'Critical'], ['high', 'High'], ['medium', 'Medium']] },
            ] as const).map((sel, i) => (
              <select key={i} value={sel.val} onChange={e => (sel.set as any)(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-500 cursor-pointer outline-none focus:border-zinc-700 transition-colors">
                {sel.opts.map(([v, l]) => <option key={v} value={v} className="bg-zinc-950">{l}</option>)}
              </select>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilterChannel('all'); setFilterCategory('all'); setFilterPriority('all'); setSearch(''); }}
                className="px-3 py-2 text-[10px] font-mono text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 rounded-xl transition-all flex items-center gap-1.5">
                <X className="w-3 h-3" /> Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        {(search || activeFilterCount > 0) && (
          <div className="mb-6 text-[11px] text-zinc-600 font-mono">
            {filtered.length} release{filtered.length !== 1 ? 's' : ''} found
          </div>
        )}

        {/* Feed */}
        <div className="space-y-14">
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-5 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                <Pin className="w-3 h-3" /> Pinned
              </div>
              <div className="space-y-6">
                {pinned.map(u => (
                  <ReleaseCard key={u.id} data={parseReleaseContent(u.content, u.title)}
                    created_at={u.created_at} category={u.category} version={u.version}
                    isAdmin={isAdmin} onEdit={() => openStudio(u)} onDelete={() => handleDelete(u.id)}
                    currentUsername={currentUsername} isFirst50={isFirst50} />
                ))}
              </div>
            </section>
          )}

          {standard.length === 0 && pinned.length === 0 && (
            <div className="py-24 text-center border border-zinc-800/40 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-5 h-5 text-zinc-700" />
              </div>
              <p className="text-[13px] text-zinc-600">No releases match your filters</p>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFilterChannel('all'); setFilterCategory('all'); setFilterPriority('all'); setSearch(''); }}
                  className="mt-4 text-[11px] text-zinc-600 hover:text-zinc-300 underline underline-offset-2 transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {standard.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-5 text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                  <Clock className="w-3 h-3" /> Timeline
                </div>
              )}
              <div className="space-y-6">
                {standard.map(u => (
                  <ReleaseCard key={u.id} data={parseReleaseContent(u.content, u.title)}
                    created_at={u.created_at} category={u.category} version={u.version}
                    isAdmin={isAdmin} onEdit={() => openStudio(u)} onDelete={() => handleDelete(u.id)}
                    currentUsername={currentUsername} isFirst50={isFirst50} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">Verlyn System Platform</p>
          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>All Systems Operational</span>
          </div>
        </footer>
      </div>

      {isStudioOpen && (
        <ReleaseStudio initialUpdate={activeToEdit} onClose={closeStudio} onSaved={onSaved} currentUsername={currentUsername} isFirst50={isFirst50} />
      )}
    </main>
  );
}
