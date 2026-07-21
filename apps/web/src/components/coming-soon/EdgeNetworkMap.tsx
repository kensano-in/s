'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NODES = [
  { id: 'nyc', name: 'Manhattan', x: '25%', y: '35%', code: 'US-E1', load: '0.14' },
  { id: 'lon', name: 'London', x: '48%', y: '28%', code: 'UK-L2', load: '0.09' },
  { id: 'tky', name: 'Tokyo', x: '88%', y: '35%', code: 'JP-T1', load: '0.05' },
  { id: 'sfo', name: 'Bay Area', x: '15%', y: '38%', code: 'US-W4', load: '0.22' },
  { id: 'sin', name: 'Singapore', x: '78%', y: '58%', code: 'SG-S1', load: '0.42' },
  { id: 'gru', name: 'São Paulo', x: '35%', y: '75%', code: 'BR-G1', load: '0.27' },
];

const CONNECTIONS = [
  ['nyc', 'lon'], ['lon', 'tky'], ['tky', 'sin'], ['sin', 'gru'], ['gru', 'nyc'], ['sfo', 'nyc']
];

export default function EdgeNetworkMap() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => {
      window.removeEventListener('resize', check);
      clearInterval(t);
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      background: '#020202',
      borderRadius: isMobile ? '0' : '32px',
      border: '1px solid rgba(255,255,255,0.03)',
      overflow: 'hidden',
      boxShadow: '0 100px 200px -50px rgba(0,0,0,1)',
      fontFamily: '"JetBrains Mono", monospace'
    }}>
      
      {/* Premium Noise Overlay */}
      <div style={{
        position: 'absolute', inset: 0, 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        opacity: 0.03, pointerEvents: 'none'
      }} />

      {/* Atmospheric Radial Gradients */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      {/* Header HUD */}
      <div style={{ padding: isMobile ? '32px 24px' : '48px 56px', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ width: '4px', height: '4px', background: '#818cf8', borderRadius: '1px', boxShadow: '0 0 10px #818cf8' }} />
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em' }}>NETWORK.CORE</span>
          </div>
          <h2 style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 400, color: '#fff', letterSpacing: '-0.04em', margin: 0, textTransform: 'uppercase' }}>
            Lattice <span style={{ opacity: 0.3 }}>v4.0</span>
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 800, letterSpacing: '0.1em' }}>LOCAL_SIGNAL</p>
          <p style={{ fontSize: '14px', color: '#fff', fontWeight: 500, marginTop: '4px' }}>
            {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </p>
        </div>
      </div>

      {/* Main Interactive Map Area */}
      <div style={{ position: 'relative', width: '100%', height: isMobile ? '500px' : '650px', cursor: 'crosshair' }}>
        
        {/* Topographic Lines */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx="50%" cy="50%" r={`${10 + i * 12}%`} fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="1 10" />
          ))}
        </svg>

        {/* Global Connections Lattice */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {CONNECTIONS.map(([s, e], i) => {
            const start = NODES.find(n => n.id === s);
            const end = NODES.find(n => n.id === e);
            if (!start || !end) return null;
            return (
              <React.Fragment key={i}>
                <motion.path
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="0.1"
                  fill="none"
                />
                <motion.path
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  stroke="url(#beamGrad)"
                  strokeWidth="0.2"
                  strokeDasharray="2, 20"
                  animate={{ strokeDashoffset: [0, -22] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                  fill="none"
                />
              </React.Fragment>
            );
          })}
          <defs>
            <linearGradient id="beamGrad" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes */}
        {NODES.map((node) => (
          <div 
            key={node.id} 
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
            style={{
              position: 'absolute', left: node.x, top: node.y,
              transform: 'translate(-50%, -50%)', zIndex: 20
            }}
          >
            <div style={{ position: 'relative' }}>
              
              {/* Complex Marker */}
              <div style={{
                width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  style={{ position: 'absolute', width: '24px', height: '24px', border: '1px solid rgba(129,140,248,0.1)', borderRadius: '4px' }}
                />
                <div style={{ width: '4px', height: '4px', background: '#fff', borderRadius: '50%', boxShadow: '0 0 15px #818cf8' }} />
              </div>

              {/* Node Detail HUD */}
              <AnimatePresence>
                {(activeNode === node.id || (!isMobile && activeNode === null)) && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: activeNode === node.id ? 1 : 0.15, x: 15 }}
                    style={{ position: 'absolute', top: '-10px', left: '100%', whiteSpace: 'nowrap', pointerEvents: 'none' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{node.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{node.code}</span>
                        <div style={{ width: '30px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden' }}>
                          <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: '100%', height: '100%', background: '#818cf8' }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {/* Floating Technical Data Bits */}
        {!isMobile && Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
            animate={{ y: [null, '-10%'], opacity: [0, 0.2, 0] }}
            transition={{ duration: 10 + Math.random() * 20, repeat: Infinity, ease: "linear" }}
            style={{ position: 'absolute', fontSize: '8px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
          >
            {Math.random().toString(16).substr(2, 8).toUpperCase()}
          </motion.div>
        ))}
      </div>

      {/* Footer System Panel */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: isMobile ? '32px 24px' : '40px 56px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: '40px'
      }}>
        {[
          { label: 'BANDWIDTH_TX', val: '1.24', unit: 'PB/S', status: 'optimal' },
          { label: 'ACTIVE_LATTICE', val: '1,482', unit: 'NODES', status: 'sync' },
          { label: 'ENC_STRENGTH', val: '4096', unit: 'BITS', status: 'secure' },
          { label: 'MESH_INTEGRITY', val: '100', unit: '%', status: 'locked' }
        ].map((item, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '12px' }}>
              {item.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 400, color: '#fff' }}>{item.val}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{item.unit}</span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '8px', color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Technical Bar */}
      <div style={{ padding: '12px 56px', borderTop: '1px solid rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.3 }}>
        <span style={{ fontSize: '8px', letterSpacing: '0.1em' }}>VERLYN_BACKBONE_PROTOCOL_v4.2.0-STABLE</span>
        <span style={{ fontSize: '8px', letterSpacing: '0.1em' }}>[ ACCESS_LEVEL: RESTRICTED ]</span>
      </div>
    </div>
  );
}
