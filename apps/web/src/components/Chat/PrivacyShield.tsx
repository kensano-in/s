'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyShieldProps {
  active: boolean;
  userId?: string;    // burned into watermark
  userLabel?: string; // e.g. "@username"
  children: React.ReactNode;
}

function WatermarkCanvas({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const text = `🔒 PRIVATE · ${label} · ${new Date().toLocaleTimeString()}`;
      ctx.save();
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = 'rgba(180,160,255,0.08)';
      ctx.textAlign = 'center';

      const step = 160;
      for (let y = -60; y < canvas.height + 100; y += step) {
        for (let x = -60; x < canvas.width + 200; x += step) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 6);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    const interval = setInterval(draw, 1000);
    return () => { ro.disconnect(); clearInterval(interval); };
  }, [label]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[40] opacity-100"
    />
  );
}

// ── Privacy Overlay Visuals ──────────────────────────────────────────────────
function ShieldOverlays({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      {/* Aesthetic Micro-Grain */}
      <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.08] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.05),rgba(0,255,0,0.01),rgba(0,0,255,0.05))] bg-[length:100%_2px,3px_100%]" />
      </div>
      {/* Texture */}
      <div className="absolute inset-0 pointer-events-none z-[5] opacity-[0.10] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Scanner Pulse */}
      <motion.div
        animate={{ top: ['110%', '-10%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[1.5px] bg-indigo-500/20 shadow-[0_0_15px_rgba(129,120,255,0.4)] z-[6] pointer-events-none"
      />

      {/* Internal Vignette */}
      <div className="absolute inset-0 pointer-events-none z-[7] shadow-[inset_0_0_120px_rgba(139,120,255,0.1)]" />
    </>
  );
}

export default function PrivacyShield({ active, userId, userLabel = 'user', children }: PrivacyShieldProps) {
  const [locked, setLocked]   = useState(false);
  const [warned, setWarned]   = useState(false);
  const originalGetDisplayMedia = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);

  const flashWarn = useCallback(() => {
    setWarned(true);
    setTimeout(() => setWarned(false), 2000);
  }, []);

  useEffect(() => {
    if (!active) { setLocked(false); return; }

    const onVisibility = () => { document.hidden ? setLocked(true) : setLocked(false); };
    const onWindowBlur  = () => setLocked(true);
    const onWindowFocus = () => setLocked(false);
    const onPageHide    = () => setLocked(true);
    const onPageShow    = () => setLocked(false);

    const blockClip = (e: ClipboardEvent) => { e.preventDefault(); e.stopPropagation(); flashWarn(); };

    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c','a','x','p','s','z'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation(); flashWarn(); return;
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        setLocked(true);
        setTimeout(() => setLocked(false), 3000);
        return;
      }
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (ctrl && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase())) { e.preventDefault(); return; }
      if (ctrl && e.key.toLowerCase() === 'u') { e.preventDefault(); return; }
    };

    const blockCtx  = (e: MouseEvent)    => { e.preventDefault(); e.stopPropagation(); };
    const blockDrag = (e: DragEvent)     => { e.preventDefault(); };
    const blockSel  = (e: Event)         => { e.preventDefault(); };

    if (navigator.mediaDevices?.getDisplayMedia) {
      originalGetDisplayMedia.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async (...args: Parameters<typeof navigator.mediaDevices.getDisplayMedia>) => {
        setLocked(true);
        setTimeout(() => setLocked(false), 4000);
        return originalGetDisplayMedia.current!(...args);
      };
    }

    document.addEventListener('visibilitychange',  onVisibility);
    window.addEventListener('blur',    onWindowBlur);
    window.addEventListener('focus',   onWindowFocus);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('copy',   blockClip, true);
    document.addEventListener('cut',    blockClip, true);
    document.addEventListener('paste',  blockClip, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', blockCtx, true);
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('selectstart', blockSel, true);

    return () => {
      document.removeEventListener('visibilitychange',  onVisibility);
      window.removeEventListener('blur',    onWindowBlur);
      window.removeEventListener('focus',   onWindowFocus);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('copy',   blockClip, true);
      document.removeEventListener('cut',    blockClip, true);
      document.removeEventListener('paste',  blockClip, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('contextmenu', blockCtx, true);
      document.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('selectstart', blockSel, true);
      if (navigator.mediaDevices && originalGetDisplayMedia.current) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia.current;
        originalGetDisplayMedia.current = null;
      }
    };
  }, [active, flashWarn]);

  return (
    <div 
      className={`relative h-full flex flex-col overflow-hidden ${active ? 'select-none' : ''}`}
      onContextMenu={(e) => active && e.preventDefault()}
      style={{
        userSelect: active ? 'none' : 'auto',
        WebkitUserSelect: active ? 'none' : 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .privacy-shield-zone { display: none !important; }
        }
      `}} />

      <div className="flex-1 flex flex-col min-h-0 relative privacy-shield-zone">
        <AnimatePresence>
          {active && locked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] backdrop-blur-[40px] bg-black/60 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <div className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
              </div>
              <p className="text-sm font-black text-indigo-100 uppercase tracking-[0.3em]">
                Privacy Shield Active
              </p>
              <p className="text-[10px] text-white/40 mt-2 uppercase tracking-widest font-bold">
                Interaction Restricted
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[45] pointer-events-none"
            >
              <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-400/30 backdrop-blur-xl shadow-[0_0_20px_rgba(129,120,255,0.3)]">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.3em]">
                  Privacy Shield Active
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {children}
        
        <ShieldOverlays active={active} />
        {active && <WatermarkCanvas label={userLabel} />}

        <AnimatePresence>
          {active && warned && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1000] bg-indigo-500/10 border-2 border-indigo-500/40 flex items-center justify-center pointer-events-none rounded-2xl"
            >
              <span className="text-white font-bold tracking-[0.2em] text-[11px] uppercase">
                Content Protected
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active && locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLocked(false)}
            className="fixed inset-0 z-[999999] bg-[#020208]/95 flex flex-col items-center justify-center gap-6 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 backdrop-blur-[100px] saturate-50" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [0.8, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute w-[180px] h-[180px] rounded-full border border-indigo-500/20"
                />
              ))}
            </div>

            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-7xl z-10"
            >
              🔒
            </motion.div>

            <div className="text-center z-10 space-y-2">
              <p className="text-white text-2xl font-black tracking-tight">Privacy Shield Active</p>
              <p className="text-white/40 text-sm font-medium tracking-wide">Tap anywhere to reveal content</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
