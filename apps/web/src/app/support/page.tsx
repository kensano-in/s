'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ─── Animated Support Network Background ─────────────────────── */
function SupportGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    // Node colors — indigo, violet, teal (support palette)
    const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#3b82f6', '#a78bfa'];

    interface Node {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      color: string;
      alpha: number;
      pulseT: number;   // timer for ping ring
      pingR: number;    // current ping radius
      pingAlpha: number;
    }

    let nodes: Node[] = [];

    const spawn = () => {
      nodes = Array.from({ length: 55 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.8 + 0.8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.5 + 0.3,
        pulseT: Math.random() * 400,
        pingR: 0,
        pingAlpha: 0,
      }));
    };

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      spawn();
    };

    window.addEventListener('resize', resize);
    resize();

    const MAX_DIST = 160;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      tick++;

      // Move & bounce
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;

        // Occasional ping — every ~300 ticks per node
        n.pulseT--;
        if (n.pulseT <= 0) {
          n.pulseT = 200 + Math.random() * 400;
          n.pingR = 0;
          n.pingAlpha = 0.6;
        }
        if (n.pingAlpha > 0) {
          n.pingR += 1.2;
          n.pingAlpha -= 0.012;
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const lineAlpha = (1 - dist / MAX_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            // Blend the two node colors
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, a.color + Math.round(lineAlpha * 255).toString(16).padStart(2,'0'));
            grad.addColorStop(1, b.color + Math.round(lineAlpha * 255).toString(16).padStart(2,'0'));
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw nodes & pings
      for (const n of nodes) {
        // Ping ring
        if (n.pingAlpha > 0) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.pingR, 0, Math.PI * 2);
          ctx.strokeStyle = n.color + Math.round(n.pingAlpha * 80).toString(16).padStart(2,'0');
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        // Node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + Math.round(n.alpha * 255).toString(16).padStart(2,'0');
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
}
import { motion, AnimatePresence } from 'framer-motion';
import SupportCenter from '@/components/coming-soon/SupportCenter';
import { useRouter } from 'next/navigation';

import { IconChat, IconWrench, IconLock, IconShield, IconUserPlus, IconCreditCard, IconAlertTri, IconZap, IconBadge, IconArchive, IconShieldOff } from '@/components/coming-soon/Icons3D';

const CATEGORIES = [
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="10" r="1" fill={c}/><circle cx="12" cy="10" r="1" fill={c}/><circle cx="15" cy="10" r="1" fill={c}/></svg>,
    label: 'General', sub: 'Questions & Inquiries', color: '#6366f1', type: 'general'
  },
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><path d="M15 5l3 3"/></svg>,
    label: 'Technical', sub: 'Bugs & Connectivity', color: '#3b82f6', type: 'tech'
  },
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    label: 'Security', sub: 'Privacy & Access', color: '#8b5cf6', type: 'security'
  },
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    label: 'Registration', sub: 'Access & Sign-up Help', color: '#10b981', type: 'registration'
  },
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="15" r="1" fill={c}/><line x1="11" y1="15" x2="14" y2="15" strokeWidth="2"/></svg>,
    label: 'Billing', sub: 'Payments & Plans', color: '#f59e0b', type: 'billing'
  },
  {
    icon: (c: string) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill={c} stroke={c}/></svg>,
    label: 'Emergency', sub: 'Critical · Strict Policy', color: '#ef4444', type: 'emergency'
  },
];

const GUARANTEES = [
  {
    Icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5" fill="#6366f1"/></svg>,
    color: '#6366f1', title: 'End-to-End Encrypted', body: 'Every support conversation is encrypted in transit and at rest. Not even our team can read your messages without you.'
  },
  {
    Icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    color: '#f59e0b', title: 'Response under 2 hours', body: 'We commit to a first response within 2 hours for all standard cases. Emergency protocol cases get immediate attention.'
  },
  {
    Icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    color: '#10b981', title: 'Verified Agents Only', body: 'Every agent on our team passes identity verification. You will always know who you are talking to.'
  },
  {
    Icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    color: '#8b5cf6', title: 'Persistent Case History', body: 'Your Case ID is permanent. Even months later you can recover your conversation and status using the same ID.'
  },
  {
    Icon: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
    color: '#ef4444', title: 'Zero Spam Tolerance', body: 'Abuse, spam, and bad-faith submissions are permanently blacklisted at the network level. We protect our users.'
  },
];

const STEPS = [
  { n: '01', title: 'Choose a Category', desc: 'Select the type of issue from the support menu to route your case correctly.' },
  { n: '02', title: 'Submit Your Case',  desc: 'Fill in your details. Our system issues a unique Case ID for tracking.' },
  { n: '03', title: 'Live Case Chat',    desc: 'An admin joins your encrypted channel. You get notified when they reply.' },
  { n: '04', title: 'Resolution',        desc: 'Once resolved, your case is archived. You can re-open any time.' },
];

const HERO_PHRASES = ['24/7', 'Always', "We're here", 'Ready', 'Genuinely', 'On standby', 'Humans', 'Truly'];

export default function SupportPage() {
  const router = useRouter();
  const [showWidget, setShowWidget] = useState(false);
  const [widgetView, setWidgetView] = useState<'menu'|'form'|'tracking'|'faq'|'chat'|'identity'>('menu');
  const [initialReportType, setInitialReportType] = useState<string | null>(null);
  const [utc, setUtc] = useState('');
  const [mounted, setMounted] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycle hero phrases: cinematic fade — 4.5s hold, 600ms crossfade
  useEffect(() => {
    const iv = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % HERO_PHRASES.length);
        setPhraseVisible(true);
      }, 600);
    }, 4500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().split('T')[1].slice(0,8));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const openWidget = (view: any = 'menu', type: string | null = null) => { 
    setWidgetView(view); 
    setInitialReportType(type);
    setShowWidget(true); 
  };

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: '#050505', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflowX: 'hidden' }}>

      {/* ── ANIMATED SUPPORT NETWORK BACKGROUND ── */}
      <SupportGraph />
      {/* Layered radial glows on top of canvas */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.06) 0%, transparent 65%)' }} />
      </div>

      {/* All content sits above the background */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', background: 'linear-gradient(180deg, rgba(8,8,12,0.98) 0%, rgba(5,5,8,0.95) 100%)', padding: '0 clamp(20px,5vw,60px)', boxShadow: '0 1px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <button onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            verlyn.in
          </button>

          {/* Center wordmark */}
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Support Center</span>

          <motion.button onClick={() => openWidget('menu')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '10px 22px', background: 'rgba(255,255,255,0.95)', color: '#000', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.06em', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}>
            Open Case
          </motion.button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) clamp(20px,5vw,60px) 60px', textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}>

          {/* Eyebrow */}
          <p style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', fontWeight: 600, marginBottom: '32px' }}>
            Verlyn &nbsp;·&nbsp; Support
          </p>

          {/* Animated cycling headline */}
          <h1 style={{ margin: '0 0 36px', letterSpacing: '-0.045em', fontWeight: 800 }}>
            <span style={{
              display: 'block',
              fontSize: 'clamp(48px,7vw,88px)',
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'rgba(255,255,255,0.45)',
              opacity: phraseVisible ? 1 : 0,
              transform: phraseVisible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}>
              {HERO_PHRASES[phraseIdx]}
            </span>
            <span style={{ display: 'block', fontSize: 'clamp(58px,9vw,108px)', fontWeight: 900, lineHeight: 0.95, color: '#ffffff' }}>
              to help.
            </span>
          </h1>


          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, maxWidth: '500px', margin: '0 auto 44px', fontWeight: 400 }}>
            Real people, encrypted conversations, guaranteed response times.
            No bots. No scripts. Just answers.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.02, boxShadow: '0 20px 60px rgba(255,255,255,0.18)' }} whileTap={{ scale: 0.97 }} onClick={() => openWidget('form', 'general')}
              style={{ padding: '16px 36px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em', boxShadow: '0 8px 32px rgba(255,255,255,0.1)', transition: 'box-shadow 0.3s' }}>
              Open a Support Case
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { setWidgetView('tracking'); setShowWidget(true); }}
              style={{ padding: '16px 36px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}>
              Track Existing Case
            </motion.button>
          </div>

        </motion.div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px clamp(20px,5vw,60px)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          {[
            { val: '< 2h',  label: 'Average Response', sub: 'Guaranteed SLA' },
            { val: '99.9%', label: 'Uptime',           sub: 'Last 90 days' },
            { val: 'E2E',   label: 'Encryption',       sub: 'Zero-knowledge protocol' },
            { val: '24/7',  label: 'Availability',     sub: 'Global agent coverage' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{ 
                textAlign: 'center', 
                padding: '16px 8px', 
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
              <p style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: '4px' }}>{s.val}</p>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
              <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.03em' }}>{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section style={{ padding: 'clamp(60px,6vw,90px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>Support Categories</p>
            <h2 style={{ fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 700, letterSpacing: '-0.03em' }}>What do you need help with?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '16px' }}>
            {CATEGORIES.map((cat, i) => (
              <motion.button key={i} onClick={() => openWidget('form', cat.type)}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.5 }}
                whileHover={{ scale: 1.02, borderColor: `${cat.color}44` }} whileTap={{ scale: 0.98 }}
                style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '22px 24px', background: `${cat.color}06`, border: `1px solid ${cat.color}22`, borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${cat.color}12`, border: `1px solid ${cat.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {cat.icon(cat.color)}
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px', letterSpacing: '-0.01em' }}>{cat.label}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>{cat.sub}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: 'clamp(60px,6vw,90px) clamp(20px,5vw,60px)', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>The Process</p>
            <h2 style={{ fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 700, letterSpacing: '-0.03em' }}>How support works</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '2px' }}>
            {STEPS.map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                style={{ padding: '32px 28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.06)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{step.n}</div>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '13px', fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>{step.n}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '10px', letterSpacing: '-0.01em' }}>{step.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEES ── */}
      <section style={{ padding: 'clamp(60px,6vw,90px) clamp(20px,5vw,60px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '12px' }}>Support Guarantees</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Our commitments to every person who contacts us.</p>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {GUARANTEES.map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.4 }}
                style={{ display: 'flex', gap: '18px', padding: '22px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '12px', background: `${item.color}12`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.Icon />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{item.title}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: 'clamp(60px,6vw,90px) clamp(20px,5vw,60px)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '56px 48px', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '28px', position: 'relative', overflow: 'hidden' }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />
          {/* Headset icon — represents real human support */}
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', position: 'relative' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #050505', boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '14px', position: 'relative' }}>Ready to get help?</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '36px', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 36px', position: 'relative' }}>A verified Verlyn agent will read your case and respond personally. No bots, no scripts, no waiting rooms.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => openWidget('form', 'general')}
              style={{ padding: '16px 36px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em', boxShadow: '0 8px 30px rgba(255,255,255,0.15)' }}>
              Start a Case
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => openWidget('faq')}
              style={{ padding: '16px 36px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Browse Knowledge Base
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '28px clamp(20px,5vw,60px)', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          © {new Date().getFullYear()} Verlyn ·{' '}
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Privacy</a> ·{' '}
          <a href="/terms"   style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Terms</a>
        </p>
      </footer>

      {/* ── WIDGET ── */}
      <AnimatePresence>
        {showWidget && <SupportCenter onClose={() => setShowWidget(false)} initialView={widgetView} initialReportType={initialReportType || undefined} />}
      </AnimatePresence>

      <style>{`
        @keyframes vrlPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.2)} }
      `}</style>
      </div>{/* end z-1 content wrapper */}
    </div>
  );
}
