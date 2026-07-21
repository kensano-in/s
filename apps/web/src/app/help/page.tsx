'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Icons
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconBook = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const IconCpu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
    <rect x="9" y="9" width="6" height="6"></rect>
    <line x1="9" y1="1" x2="9" y2="4"></line>
    <line x1="15" y1="1" x2="15" y2="4"></line>
    <line x1="9" y1="20" x2="9" y2="23"></line>
    <line x1="15" y1="20" x2="15" y2="23"></line>
    <line x1="20" y1="9" x2="23" y2="9"></line>
    <line x1="20" y1="15" x2="23" y2="15"></line>
    <line x1="1" y1="9" x2="4" y2="9"></line>
    <line x1="1" y1="15" x2="4" y2="15"></line>
  </svg>
);

const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const IconChevronDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// Content
const CATEGORIES = [
  { id: 'all', label: 'All Resources', icon: IconBook, color: '#9ca3af' },
  { id: 'getting-started', label: 'Onboarding & Setup', icon: IconZap, color: '#818cf8' },
  { id: 'security', label: 'Security & Privacy', icon: IconShield, color: '#10b981' },
  { id: 'architecture', label: 'Backbone & Nodes', icon: IconCpu, color: '#a78bfa' },
];

const GUIDES = [
  {
    category: 'getting-started',
    q: 'How do I complete the Verification Flow?',
    a: 'The Verification Flow consists of 4 strict security stages: \n\n1. **Enlistment Code Verification**: Enter your secure invitation code.\n2. **Agreements Gateway**: Read and legally execute the 13 foundational policies.\n3. **Email Association**: Connect your legal entity or professional email address.\n4. **OTP Handshake**: Complete the verification using the temporal verification token sent to your inbox.',
  },
  {
    category: 'getting-started',
    q: 'What should I do if my Invitation Code is rejected?',
    a: 'Invitation codes are tied cryptographically to specific routing pipelines. If yours is invalid, verify you copied it without trailing spaces. If it continues to fail, contact your system administrator or file a priority report at verlyn.in/report.',
  },
  {
    category: 'security',
    q: 'How does Verlyn secure my sessions?',
    a: 'Verlyn enforces a zero-knowledge hardware-bound session model. Session states are stored in isolated encrypted cookies on the client side, signed server-side via cryptographic HSMs. If client manipulation is detected, the session token is revoked across all global edge routing nodes instantly.',
  },
  {
    category: 'security',
    q: 'What is the "Zero-Knowledge Architecture" promise?',
    a: 'Verlyn operates under a absolute privacy model: we cannot view your decrypted payload or message metadata. Everything is encrypted using the Signal protocol using a double ratchet mechanism, ensuring perfect forward secrecy.',
  },
  {
    category: 'architecture',
    q: 'What is the target node latency?',
    a: 'Verlyn routing nodes target a p95 latency profile of sub-120ms globally. We use dedicated edge routers to bypass public peering points and maintain stable traffic acceleration even in heavy congestion environments.',
  },
  {
    category: 'architecture',
    q: 'How do I verify the integrity of the whitepaper?',
    a: 'The official Verlyn system architecture and whitepaper can be inspected at verlyn.in/whitepaper. The document signature and checksum are verifiable on-chain to prevent unauthorized document tampering.',
  },
];

const TUTORIALS = [
  {
    title: 'Connecting Decentrilized Identity (DID)',
    step: '01',
    desc: 'Verify and map your cryptographic identity proofs onto the Verlyn backbone in less than 3 minutes.',
  },
  {
    title: 'Configuring Node Relays',
    step: '02',
    desc: 'Optimize your routing speeds by manually configuring custom peering endpoints and proxy rings.',
  },
  {
    title: 'Setting up Administrator MFA',
    step: '03',
    desc: 'Secure command line interfaces by initializing hardware keys and authenticator app loops.',
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filter guides based on category & search term
  const filteredGuides = GUIDES.filter(g => {
    const matchesCat = activeCat === 'all' || g.category === activeCat;
    const matchesSearch = g.q.toLowerCase().includes(search.toLowerCase()) || 
                          g.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{
      background: '#030303',
      color: '#fff',
      height: '100dvh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background Ambience */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '500px', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '80px 24px 120px' }}>
        
        {/* Back Link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255,255,255,0.4)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '40px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
            <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
          </svg>
          Back to Terminal
        </Link>

        {/* Hero Headers */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#818cf8', letterSpacing: '0.25em', textTransform: 'uppercase', display: 'block', marginBottom: '16px' }}>Help Center & Guides</span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', marginBottom: '24px', lineHeight: 1.1 }}>
            How can we help you?
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.45)', maxWidth: '640px', margin: '0 auto 40px', lineHeight: 1.6 }}>
            Browse official platform documentation, setup tutorials, and technical guidelines engineered to secure your early access.
          </p>

          {/* Search Box */}
          <div style={{
            position: 'relative',
            maxWidth: '560px',
            margin: '0 auto',
          }}>
            <div style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
              <IconSearch />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documentation, guides, FAQs..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '18px 24px 18px 56px',
                fontSize: '15px',
                color: '#fff',
                outline: 'none',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '64px',
        }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCat === cat.id;
            const CatIcon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: '12px',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  }
                }}
              >
                <span style={{ display: 'flex', color: isActive ? '#818cf8' : 'rgba(255,255,255,0.4)' }}><CatIcon /></span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* FAQ & GUIDES SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '80px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '24px', letterSpacing: '-0.02em' }}>
              Frequently Answered Inquiries
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredGuides.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '16px', color: 'rgba(255,255,255,0.4)' }}>
                  No matching documentation articles found. Try searching for other terms.
                </div>
              ) : (
                filteredGuides.map((guide, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        transition: 'background 0.2s',
                      }}
                    >
                      <button
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        style={{
                          width: '100%',
                          padding: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          gap: '16px',
                        }}
                      >
                        <span>{guide.q}</span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: 'rgba(255,255,255,0.3)', display: 'flex' }}
                        >
                          <IconChevronDown />
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                          >
                            <div style={{
                              padding: '0 24px 24px',
                              fontSize: '14px',
                              lineHeight: 1.7,
                              color: 'rgba(255,255,255,0.45)',
                              borderTop: '1px solid rgba(255,255,255,0.03)',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {guide.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* QUICK TUTORIALS GRID */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Interface & Platform Tutorials
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {TUTORIALS.map((t, idx) => (
              <div
                key={idx}
                style={{
                  padding: '32px 28px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                }}
              >
                <div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#818cf8',
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                    display: 'block',
                    marginBottom: '20px',
                  }}>
                    GUIDE {t.step}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px', lineHeight: 1.4 }}>
                    {t.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>
                    {t.desc}
                  </p>
                </div>
                
                <a href="/report" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  textDecoration: 'none',
                  marginTop: 'auto',
                  transition: 'gap 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.gap = '12px'}
                onMouseLeave={e => e.currentTarget.style.gap = '8px'}
                >
                  Request Tutorial Access <IconArrowRight />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* CTA CONCIERGE CARD */}
        <div style={{
          padding: '48px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(0,0,0,0) 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: '28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '250px', height: '250px', background: 'rgba(99,102,241,0.05)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />
          
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Still need assistance?
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '32px', maxWidth: '440px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Our verified system concierge is ready to handle account recovery, policy appeals, and security events directly.
          </p>

          <button
            onClick={() => window.location.href = '/report'}
            style={{
              padding: '16px 36px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              boxShadow: '0 8px 30px rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,255,255,0.1)';
            }}
          >
            Open Secure Ticket
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.03)', padding: '32px 24px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          © {new Date().getFullYear()} Verlyn ·{' '}
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Privacy</a> ·{' '}
          <a href="/terms"   style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Terms</a> ·{' '}
          <a href="/report"  style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Report Center</a>
        </p>
      </footer>
    </div>
  );
}
