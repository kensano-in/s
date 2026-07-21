'use client';
import './coming-soon.css';
import React from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import PreRegisterForm from '@/components/coming-soon/PreRegisterForm';
import Logo from '@/components/coming-soon/Logo';
import IntroScreen from '@/components/coming-soon/IntroScreen';
import AdminGateway from '@/components/coming-soon/AdminGateway';
import { IconBan, IconGlobe, IconZap, IconShield, IconLock, IconUsers } from '@/components/coming-soon/Icons';
// Lazy-load heavy 3D scene
const NetworkGraph = dynamic(() => import('@/components/coming-soon/NetworkGraph'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        border: '1px solid rgba(99,102,241,0.3)',
        borderTopColor: '#818cf8',
        animation: 'spin 0.9s linear infinite',
      }} />
    </div>
  ),
});

/* ── Animation variants ─────────────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const rise = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Feature Card ────────────────────────────────────────────────── */
function FeatureCard({ num, title, desc, index }: { num: string; title: string; desc: string; index: number }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.08, duration: 0.65 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 'clamp(28px, 4vw, 44px)',
        background: hovered ? 'rgba(99,102,241,0.04)' : 'rgba(0,0,0,0.01)',
        cursor: 'default',
        transition: 'background 0.35s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top border accent on hover */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: hovered ? 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)' : 'transparent',
        transition: 'background 0.35s ease',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: hovered ? 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.03) 0%, transparent 70%)' : 'transparent',
        transition: 'background 0.35s ease',
      }} />
      <span style={{
        display: 'block', fontSize: '10px', letterSpacing: '0.18em',
        color: hovered ? 'rgba(129,140,248,0.8)' : 'rgba(255,255,255,0.2)',
        fontWeight: 600, marginBottom: '22px',
        transition: 'color 0.3s ease',
      }}>{num}</span>
      <h3 style={{
        fontSize: '17px', fontWeight: 600, color: '#fff',
        marginBottom: '12px', letterSpacing: '-0.02em',
        lineHeight: 1.25,
      }}>{title}</h3>
      <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{desc}</p>
    </motion.div>
  );
}

/* ── Step Row ────────────────────────────────────────────────────── */
function StepRow({ step, i, total }: { step: { title: string; desc: string }; i: number; total: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: i * 0.09, duration: 0.55 }}
      style={{
        display: 'flex', gap: '24px', alignItems: 'flex-start',
        padding: '28px 0',
        borderBottom: i < total - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
      }}
    >
      <span style={{
        fontSize: '11px', color: 'rgba(255,255,255,0.2)',
        fontWeight: 700, letterSpacing: '0.1em',
        minWidth: '28px', paddingTop: '2px',
        fontFamily: 'var(--font-mono, monospace)',
      }}>0{i + 1}</span>
      <div>
        <h3 style={{ fontSize: '15px', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>{step.title}</h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{step.desc}</p>
      </div>
    </motion.div>
  );
}

/* ── Advance Access Section ──────────────────────────────────────────────── */
function AdvanceAccessSection() {
  const [hovered, setHovered] = React.useState(false);

  return (
    <section
      id="advance-access"
      style={{
        position: 'relative', zIndex: 1,
        padding: 'clamp(48px, 7vw, 80px) var(--gutter)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.7 }}
        style={{ maxWidth: '860px', margin: '0 auto' }}
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            padding: 'clamp(36px, 5vw, 56px) clamp(32px, 5vw, 60px)',
            background: hovered
              ? 'rgba(99,102,241,0.04)'
              : 'rgba(8,8,8,0.6)',
            border: `1px solid ${hovered ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '20px',
            transition: 'all 0.4s ease',
            overflow: 'hidden',
            cursor: 'default',
          }}
        >
          {/* Accent bar — top edge */}
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
            background: hovered
              ? 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)'
              : 'transparent',
            transition: 'background 0.4s ease',
          }} />

          {/* Ambient glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: hovered
              ? 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 70%)'
              : 'transparent',
            transition: 'background 0.4s ease',
          }} />

          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '32px',
          }}>
            {/* Left: Text */}
            <div style={{ flex: '1 1 320px', maxWidth: '520px' }}>
              {/* Label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
              }}>
                {/* Lock icon */}
                <div style={{
                  width: '28px', height: '28px',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '7px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(129,140,248,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span style={{
                  fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(129,140,248,0.7)', fontWeight: 700,
                }}>
                  Advance Access
                </span>
              </div>

              <h2 style={{
                fontSize: 'clamp(20px, 2.8vw, 28px)',
                fontWeight: 700, color: '#fff',
                letterSpacing: '-0.025em', lineHeight: 1.2,
                marginBottom: '12px',
              }}>
                Already have an invitation?
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.38)',
                lineHeight: 1.72,
              }}>
                Already have an invitation code? Continue to the private testing program.
                Access is granted exclusively to invited individuals by the Verlyn Engineering Team.
              </p>
            </div>

            {/* Right: CTA */}
            <div style={{ flexShrink: 0 }}>
              <motion.a
                href="/verify"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 28px',
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '12px',
                  color: '#c7d2fe',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(99,102,241,0.2)';
                  el.style.borderColor = 'rgba(99,102,241,0.5)';
                  el.style.color = '#e0e7ff';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(99,102,241,0.12)';
                  el.style.borderColor = 'rgba(99,102,241,0.3)';
                  el.style.color = '#c7d2fe';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enter Invitation Code
              </motion.a>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default function HomePage() {
  const [introComplete, setIntroComplete] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const [isMaint, setIsMaint] = React.useState(false);
  const [adminClicks, setAdminClicks]           = React.useState(0);
  const [showAdminGateway, setShowAdminGateway] = React.useState(false);
  const [transparencyMode, setTransparencyMode] = React.useState(false);
  const adminClickTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // After mount, check if intro was already seen this session
  React.useEffect(() => {
    if (sessionStorage.getItem('vrl_intro_done') === '1') {
      setIntroComplete(true);
    }
  }, []);

  // Restore scrolling on HTML/Body specifically for the coming-soon view
  React.useEffect(() => {
    document.documentElement.style.setProperty('overflow', 'auto', 'important');
    document.body.style.setProperty('overflow', 'auto', 'important');
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    document.body.style.setProperty('overflow-x', 'hidden', 'important');
    
    return () => {
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow-x');
      document.body.style.removeProperty('overflow-x');
    };
  }, []);

  const handleAdminClick = () => {
    setAdminClicks(prev => {
      const n = prev + 1;
      if (n >= 10) { setShowAdminGateway(true); return 0; }
      return n;
    });
    if (adminClickTimeout.current) clearTimeout(adminClickTimeout.current);
    adminClickTimeout.current = setTimeout(() => setAdminClicks(0), 2000);
  };

  React.useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/public-config');
        const data = await res.json();
        if (data.announcement) setAnnouncement(data.announcement);
        else setAnnouncement('');
        if (data.maintenance) setIsMaint(data.maintenance);
        else setIsMaint(false);
      } catch (e) {}
    };
    init();
    const interval = setInterval(init, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem('vrl_intro_done', '1');
    setIntroComplete(true);
  };

  const features = [
    { num: '01', title: 'Private Social Space', desc: 'Share and connect without exposure. Your social circle, entirely private and truly yours.' },
    { num: '02', title: 'Secure Messaging',      desc: 'Conversations designed to stay yours. End-to-end encrypted, zero server storage.' },
    { num: '03', title: 'Controlled Access',     desc: 'Real people, verified presence. Quality connections over viral metrics and follower counts.' },
    { num: '04', title: 'No Noise',              desc: 'No spam, no tracking, no algorithm chaos. A calm, chronological feed that respects your time.' },
  ];

  const steps = [
    { title: 'You enter your email',       desc: 'We save your address securely so we can contact you when your turn arrives.' },
    { title: 'Gradual onboarding',         desc: 'We admit new members in waves to make sure our servers and security hold up under load.' },
    { title: 'Your invite code arrives',   desc: 'You\'ll receive a secure code to set up your device-level key pair and enter the network.' },
  ];

  const footerLinks = [
    { label: 'Trust Center', href: '/trust-center' },
    { label: 'Terms',        href: '/terms' },
    { label: 'Privacy',      href: '/privacy' },
    { label: 'Security',     href: '/security' },
    { label: 'Access Model', href: '/access-model' },
    { label: 'Transparency', href: '/transparency' },
    { label: 'Status',       href: '/status' },
    { label: 'Whitepaper',   href: '/whitepaper' },
  ];

  return (
    <main style={{
      background: '#080808',
      minHeight: '100dvh',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── CINEMATIC INTRO ── only shows if not seen this session */}
      {!introComplete && <IntroScreen onComplete={handleIntroComplete} />}

      {/* ── GLOBAL ANNOUNCEMENT BANNER ── */}
      <AnimatePresence>
        {(announcement || isMaint) && introComplete && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
              background: isMaint ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
              backdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${isMaint ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
              padding: '10px 24px',
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
            }}
          >
            <div style={{ 
              width: '6px', height: '6px', borderRadius: '50%', 
              background: isMaint ? '#ef4444' : '#6366f1',
              boxShadow: `0 0 10px ${isMaint ? '#ef4444' : '#6366f1'}`,
              animation: 'pulse 2s infinite'
            }} />
            <span style={{ 
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', 
              textTransform: 'uppercase', color: isMaint ? '#f87171' : '#a5b4fc' 
            }}>
              {isMaint ? 'SYSTEM ALERT: GLOBAL MAINTENANCE IN PROGRESS' : announcement}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: introComplete ? 'auto' : 'none' }}
      >

        {/* ── BACKGROUND 3D ── */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            style={{ width: '100%', height: '100%' }}
          >
            <NetworkGraph />
          </motion.div>
        </div>


        {/* ════════════════════════════════════════════════════════════
            HERO — Full Screen
        ════════════════════════════════════════════════════════════ */}
        <section style={{
          position: 'relative', minHeight: '100dvh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1,
        }}>
          <div style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
            width: '100%', maxWidth: '820px',
            padding: 'clamp(40px, 6vw, 100px) clamp(24px, 5vw, 40px)',
            marginTop: '60px',
          }}>
            <motion.div variants={stagger} initial="hidden" animate="show"
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Logo */}
              <motion.div variants={rise} style={{ marginBottom: '44px' }}>
                <Logo size={76} />
              </motion.div>

              {/* Hero Title */}
              <motion.div variants={rise} style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {/* Ghost outline — editorial depth */}
                  <h1 aria-hidden="true" style={{
                    position: 'absolute', top: 0, left: 0,
                    fontSize: 'clamp(56px, 11.5vw, 176px)',
                    fontFamily: 'var(--font-bebas)',
                    fontWeight: 400,
                    letterSpacing: '0.18em', lineHeight: 1,
                    WebkitTextStroke: '1.5px rgba(255,255,255,0.1)',
                    color: 'transparent',
                    transform: 'translate(4px, 4px)',
                    marginRight: '-0.18em',
                    pointerEvents: 'none', userSelect: 'none',
                    whiteSpace: 'nowrap', zIndex: 1,
                  }}>VERLYN</h1>

                  {/* Main title */}
                  <h1 style={{
                    fontSize: 'clamp(56px, 11.5vw, 176px)',
                    fontFamily: 'var(--font-bebas)',
                    fontWeight: 400,
                    letterSpacing: '0.18em', lineHeight: 1,
                    color: '#ffffff',
                    position: 'relative', zIndex: 2,
                    cursor: 'default', margin: 0,
                    marginRight: '-0.18em',
                    userSelect: 'none', whiteSpace: 'nowrap',
                    transition: 'all 0.7s cubic-bezier(0.22,1,0.36,1)',
                    textShadow: '0 0 40px rgba(255,255,255,0.1)',
                  }}
                    onMouseEnter={e => { 
                      e.currentTarget.style.letterSpacing = '0.26em'; 
                      e.currentTarget.style.marginRight = '-0.26em';
                      e.currentTarget.style.filter = 'drop-shadow(0 0 20px rgba(99,102,241,0.4))';
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.letterSpacing = '0.18em'; 
                      e.currentTarget.style.marginRight = '-0.18em';
                      e.currentTarget.style.filter = 'none';
                    }}
                  >VERLYN</h1>
                </div>

                {/* Editorial hairline + year */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', justifyContent: 'center' }}>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12))', maxWidth: '80px' }} />
                  <span style={{ fontSize: '9px', letterSpacing: '0.32em', color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Est. 2025
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.12), transparent)', maxWidth: '80px' }} />
                </div>
              </motion.div>

              {/* Tagline */}
              <motion.div variants={rise} style={{ marginBottom: '44px', maxWidth: '520px' }}>
                <p style={{
                  fontSize: 'clamp(19px, 2.4vw, 27px)',
                  color: '#ffffff', fontWeight: 600, lineHeight: 1.28,
                  marginBottom: '14px', letterSpacing: '-0.015em',
                  textShadow: '0 4px 20px rgba(0,0,0,0.7)',
                }}>
                  A private, simple place to message and connect.
                </p>
                <p style={{
                  fontSize: '14px', color: 'rgba(255,255,255,0.5)',
                  fontWeight: 400, lineHeight: 1.7,
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                }}>
                  Verlyn encrypts messages on your device to keep them strictly between you and your circle. No algorithmic feeds, no tracking, and no corporate surveillance.
                </p>
              </motion.div>
              {/* Registration form — glass container */}
              <motion.div variants={rise} style={{
                width: '100%', maxWidth: '460px',
                background: 'rgba(10,10,10,0.65)',
                backdropFilter: 'saturate(180%) blur(40px)',
                WebkitBackdropFilter: 'saturate(180%) blur(40px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px', padding: '32px',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.01)',
                position: 'relative',
                overflow: 'hidden',
                marginTop: '24px'
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)',
                  pointerEvents: 'none'
                }} />
                
                <PreRegisterForm />

                {/* Softened Transparency Toggle */}
                <div style={{
                  marginTop: '22px', paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Transparency Mode
                  </span>
                  <button
                    onClick={() => setTransparencyMode(!transparencyMode)}
                    aria-label="Toggle transparency mode"
                    style={{
                      width: '34px', height: '20px', borderRadius: '10px',
                      background: transparencyMode ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      position: 'relative', cursor: 'pointer', border: 'none',
                      transition: 'background 0.28s ease', flexShrink: 0,
                    }}
                  >
                    <motion.div
                      animate={{ x: transparencyMode ? 14 : 2 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: '2px', left: '0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {transparencyMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{
                        marginTop: '14px', padding: '16px',
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '10px', textAlign: 'left',
                      }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
                          <strong>Data Handling:</strong> Emails are encrypted client-side before transmission. No raw data is stored.{' '}
                          <strong>System Behavior:</strong> Access simulation uses deterministic delays to prevent timing attacks.{' '}
                          <strong>Privacy:</strong> Zero third-party tracking. Zero analytics. Zero compromise.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            ADVANCE ACCESS — Invitation Portal
        ════════════════════════════════════════════════════════════ */}
        <AdvanceAccessSection />

        {/* ════════════════════════════════════════════════════════════
            WHY VERLYN
        ════════════════════════════════════════════════════════════ */}
        <section style={{
          position: 'relative', zIndex: 1,
          padding: 'clamp(80px, 10vw, 140px) var(--gutter)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            style={{ marginBottom: '64px', maxWidth: '600px' }}
          >
            <p style={{
              fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginBottom: '18px',
            }}>The Platform</p>
            <h2 style={{
              fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: '#fff', marginBottom: '20px', lineHeight: 1.05,
            }}>
              Why Verlyn?
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.75 }}>
              A space where connections are real, data is encrypted, and interactions are deliberate — not engineered by an algorithm.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '0px',
            overflow: 'hidden',
          }}>
            {features.map((f, i) => (
              <FeatureCard key={i} index={i} num={f.num} title={f.title} desc={f.desc} />
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            WHAT HAPPENS NEXT
        ════════════════════════════════════════════════════════════ */}
        <section style={{
          position: 'relative', zIndex: 1,
          padding: 'clamp(60px, 8vw, 100px) var(--gutter)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.65 }}
            style={{ maxWidth: '600px' }}
          >
            <p style={{
              fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginBottom: '18px',
            }}>Onboarding</p>
            <h2 style={{
              fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700,
              color: '#fff', marginBottom: '40px', letterSpacing: '-0.025em', lineHeight: 1.1,
            }}>
              What happens next?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map((step, i) => (
                <StepRow key={i} step={step} i={i} total={steps.length} />
              ))}
            </div>
          </motion.div>
        </section>



        {/* ════════════════════════════════════════════════════════════
            WHAT IS VERLYN — Plain Language Explainer
        ════════════════════════════════════════════════════════════ */}
        <section style={{
          position: 'relative', zIndex: 1,
          padding: 'clamp(80px, 10vw, 140px) var(--gutter)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7 }}
            style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', marginBottom: '72px' }}
          >
            <p style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginBottom: '18px' }}>The Basics</p>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', marginBottom: '20px', lineHeight: 1.08 }}>
              What is Verlyn?
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75 }}>
              In plain words — Verlyn is a private, secure place to message and connect with real people online. Think of it like a social network, but one that genuinely respects you.
            </p>
          </motion.div>

          {/* Big explainer cards */}
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '72px' }}>
            {[
              {
                icon: <IconLock color="#6366f1" size={28} />,
                title: 'Your messages stay private',
                body: 'When you send a message on Verlyn, only you and the person you\'re talking to can read it. Nobody else — not even us. This is called end-to-end encryption, and it\'s the same technology banks use.'
              },
              {
                icon: <IconUsers color="#8b5cf6" size={28} />,
                title: 'Real people only',
                body: 'Verlyn is invite-only. You can\'t just sign up with a fake email and a made-up name. Every person on the platform is verified, which means less spam, no bots, and better conversations.'
              },
              {
                icon: <IconBan color="#10b981" size={28} />,
                title: 'No algorithm, no ads',
                body: 'Verlyn does not track what you look at, sell your data to advertisers, or show you content designed to make you anxious. You see what matters to you, in the order it happened.'
              },
              {
                icon: <IconGlobe color="#0891b2" size={28} />,
                title: 'Built for everyone',
                body: 'Whether you\'re a professional, a creator, or just someone who wants a quieter corner of the internet — Verlyn works for you. No technical knowledge required.'
              },
              {
                icon: <IconZap color="#f59e0b" size={28} />,
                title: 'Fast and reliable',
                body: 'Verlyn is engineered for speed. Messages arrive instantly. The platform stays online. There are no frustrating delays or unexpected outages during important conversations.'
              },
              {
                icon: <IconShield color="#ef4444" size={28} />,
                title: 'We can\'t sell what we don\'t have',
                body: 'Most platforms make money by collecting everything about you. Verlyn is different — our architecture is designed so that we never store sensitive data in a form we can read or share.'
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.07, duration: 0.55 }}
                style={{
                  padding: '32px 28px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  transition: 'border-color 0.25s',
                }}
                whileHover={{ borderColor: 'rgba(255,255,255,0.14)' }}
              >
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '10px', lineHeight: 1.3 }}>{card.title}</h3>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.72 }}>{card.body}</p>
              </motion.div>
            ))}
          </div>
          
          {/* WHAT IS VERLYN EXPLAINER */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.8 }}
            style={{
              maxWidth: '860px', margin: '120px auto 120px',
              padding: '60px',
              background: 'linear-gradient(180deg, rgba(20,20,20,0.4) 0%, rgba(10,10,10,0.8) 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Glows Removed */}
            
            <p style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '24px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
              The Verlyn Protocol
            </p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '32px', color: '#fff' }}>
              What exactly is <span style={{ background: 'linear-gradient(90deg, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Verlyn?</span>
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, fontWeight: 500 }}>
                In simple terms, Verlyn is a secure digital infrastructure designed for human connection, entirely stripped of the corporate surveillance that powers the modern web.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginTop: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#6366f1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '4px', background: '#6366f1', borderRadius: '50%' }}/> How it works
                  </h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                    When you communicate through Verlyn, your device creates a cryptographic lock and key. The message is locked before it leaves your phone or computer. Only the person you are sending it to has the key to unlock it. Our servers simply pass the locked box along. We cannot look inside.
                  </p>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '4px', background: '#10b981', borderRadius: '50%' }}/> Who it is for
                  </h4>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                    Verlyn is built for everyone. You don't need to understand cryptography or networks to use it. It is for families who want private photo sharing, for businesses discussing confidential strategy, and for anyone exhausted by algorithms dictating their digital life.
                  </p>
                </div>
              </div>
              
              <div style={{ marginTop: '24px', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>The Three Pillars of Verlyn:</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 800 }}>01.</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}><b>Data Minimization:</b> No ads, no third-party trackers, and no algorithmic feed manipulation. Your data is not the product.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 800 }}>02.</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}><b>Sovereign Connections:</b> What you write remains yours. You have the mechanical ability to delete your data history permanently.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#8b5cf6', fontWeight: 800 }}>03.</span>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}><b>Optimized Performance:</b> Built on a highly responsive network of edge nodes to transfer payloads quickly around the globe without server bottlenecks.</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Q&A strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6 }}
            style={{ maxWidth: '720px', margin: '0 auto' }}
          >
            <p style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', fontWeight: 600, marginBottom: '32px', textAlign: 'center' }}>Common Questions</p>
            {[
              { q: 'Is Verlyn free to use?', a: 'Yes. Verlyn is free for everyone during the early access period. We may introduce optional premium features in the future, but the core product will always remain accessible.' },
              { q: 'Who built Verlyn?', a: 'Verlyn is built by a focused team of engineers and designers who believe the internet deserves better tools — ones that put users first rather than advertisers.' },
              { q: 'When can I join?', a: 'Verlyn is currently in a controlled pre-launch phase. Pre-register above with your email to secure your spot. Access is released in deliberate waves to maintain quality.' },
              { q: 'Is my data safe?', a: 'Yes. All data in transit is encrypted. We use zero-knowledge principles wherever possible, meaning we are technically unable to access your private messages.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                style={{
                  padding: '24px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '32px', alignItems: 'start'
                }}
              >
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{item.q}</p>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{item.a}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Support CTA strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              maxWidth: '720px', margin: '64px auto 0',
              padding: '32px 40px',
              background: 'rgba(99,102,241,0.04)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '20px',
            }}
          >
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Still have questions?</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Our concierge team is here to help — any time.</p>
            </div>
            <button
              onClick={() => { window.location.href = '/report'; }}
              style={{
                padding: '14px 28px',
                background: '#fff', color: '#000',
                border: 'none', borderRadius: '10px',
                fontSize: '12px', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              Contact Support
            </button>
          </motion.div>
        </section>



        <footer style={{ position: 'relative', zIndex: 10, padding: '120px 24px 80px', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '60px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            
            {/* Left side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div 
                onClick={handleAdminClick}
                style={{
                  fontSize: '16px', fontWeight: 800, letterSpacing: '0.15em',
                  color: '#fff', cursor: 'default', userSelect: 'none'
                }}
              >
                VERLYN
              </div>
              
              <nav style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                {footerLinks.map(l => (
                  <button 
                    key={l.label} 
                    onClick={() => {
                      if (l.href) {
                        window.location.href = l.href;
                      }
                    }} 
                    style={{
                      fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s'
                    }} 
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'} 
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                  >
                    {l.label}
                  </button>
                ))}
                <button onClick={() => window.location.href = '/support'} style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'color 0.2s'
                }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
                  Support
                </button>
              </nav>

              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '32px' }}>
                © 2026 Verlyn · Secure Digital Infrastructure
              </p>
            </div>

          </div>
        </footer>

      </motion.div>{/* end intro-gated content */}

      {/* Admin Gateway */}
      <AnimatePresence>
        {showAdminGateway && <AdminGateway onClose={() => setShowAdminGateway(false)} />}
      </AnimatePresence>


    </main>
  );
}
