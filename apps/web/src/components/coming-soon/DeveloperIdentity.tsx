'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeveloperIdentityProps {
  onClose: () => void;
}

export default function DeveloperIdentity({ onClose }: DeveloperIdentityProps) {
  // Scroll Lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 24px',
        background: 'rgba(5, 5, 5, 0.9)',
        backdropFilter: 'blur(20px)',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: '#050505',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '32px',
          padding: '48px',
          margin: 'auto 0',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Subtle Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            padding: '8px',
            zIndex: 10,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <header style={{ marginBottom: '40px' }}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#6366F1',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                marginBottom: '16px',
              }}
            >
              The Developer
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: '44px',
                fontWeight: 400,
                color: '#fff',
                letterSpacing: '-0.03em',
                margin: 0,
                fontFamily: 'var(--font-display)',
              }}
            >
              Subhankar
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.4)',
                marginTop: '6px',
                fontFamily: 'monospace',
              }}
            >
              aka @shinichiro-sano
            </motion.div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ marginBottom: '48px' }}
          >
            <p style={{
              fontSize: '17px',
              color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: 1.6,
              marginBottom: '24px',
              fontWeight: 400,
            }}>
              Subhankar is the designer and core engineer of Verlyn, publishing under his open-source handle <span style={{ color: '#fff' }}>Shinichiro Sano</span>.
            </p>
            <p style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.4)',
              lineHeight: 1.7,
            }}>
              Based in Kolkata, India, he is an 18-year-old developer focused on building high-performance, low-latency secure digital systems. Verlyn is an independent labor of love, developed transparently out in the open with a commitment to mathematical privacy integrity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              paddingTop: '32px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div>
              <span style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '8px',
              }}>
                Reach Out
              </span>
              <a
                href="mailto:dev@verlyn.in"
                style={{
                  fontSize: '14px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#6366F1'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
              >
                dev@verlyn.in
              </a>
            </div>
            <div>
              <span style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '8px',
              }}>
                Focus
              </span>
              <span style={{
                fontSize: '14px',
                color: '#fff',
                fontWeight: 500,
              }}>
                Systems & Interfaces
              </span>
            </div>
          </motion.div>
        </div>

        {/* Decorative Element */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent)',
        }} />
      </motion.div>
    </motion.div>
  );
}
