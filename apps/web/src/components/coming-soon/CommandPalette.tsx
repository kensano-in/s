'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const ITEMS = [
  { id: 'home', title: 'Home', desc: 'Return to landing', category: 'Navigation', href: '/' },
  { id: 'support', title: 'Support Center', desc: 'Get help or open a case', category: 'Support', href: '/support' },

  { id: 'status', title: 'System Status', desc: 'Live infrastructure telemetry', category: 'Infrastructure', href: '/status' },
  { id: 'access', title: 'Access Model', desc: 'Zero-knowledge architecture', category: 'Infrastructure', href: '/access-model' },
  { id: 'privacy', title: 'Privacy Policy', desc: 'Data handling standards', category: 'Legal', href: '/privacy' },
  { id: 'terms', title: 'Terms of Service', desc: 'Governance & standards', category: 'Legal', href: '/terms' },
  { id: 'transparency', title: 'Transparency Notice', desc: 'Platform integrity details', category: 'Infrastructure', href: '/transparency' },
];

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(ITEMS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mobile/screen size for trigger visibility
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Toggle palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Handle focus and reset when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Debounced Search Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      const filtered = ITEMS.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
    }, 250); // 250ms debounce to prevent logic spam

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  // Handle keyboard navigation globally when open
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (results.length > 0 ? (i + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (results.length > 0 ? (i - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].href);
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isOpen, results, selectedIndex]);


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ 
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(12px)', zIndex: 9998, WebkitBackdropFilter: 'blur(12px)'
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.98, y: -20, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed', top: '15vh', left: '50%',
              width: 'clamp(340px, 92vw, 640px)', zIndex: 9999,
              background: '#080808', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '22px', overflow: 'hidden', 
              boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '22px 26px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands or jump to..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: '15px', fontWeight: 500, paddingLeft: '18px', letterSpacing: '-0.01em'
                }}
              />
              {!isMobile ? (
                <div style={{ 
                  fontSize: '10px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)', 
                  padding: '5px 9px', borderRadius: '7px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.07)',
                  fontFamily: 'monospace'
                }}>ESC</div>
              ) : (
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ 
                    fontSize: '11px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.1)',
                    border: '1px solid rgba(129,140,248,0.2)', padding: '5px 12px', borderRadius: '8px'
                  }}
                >
                  CLOSE
                </button>
              )}
            </div>

            <div style={{ maxHeight: isMobile ? '35dvh' : '420px', overflowY: 'auto', padding: '10px' }} className="scrollbar-hide">
              {results.length > 0 ? (
                results.map((item, idx) => (
                  <div
                    key={item.id} onMouseEnter={() => setSelectedIndex(idx)} onClick={() => handleSelect(item.href)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', borderRadius: '14px', cursor: 'pointer',
                      background: selectedIndex === idx ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                      <div style={{ 
                        width: '38px', height: '38px', borderRadius: '11px', 
                        background: selectedIndex === idx ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.015)', 
                        border: selectedIndex === idx ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(255,255,255,0.04)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: selectedIndex === idx ? '#818cf8' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.2s'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: '14.5px', fontWeight: 600, color: selectedIndex === idx ? '#fff' : 'rgba(255,255,255,0.7)', letterSpacing: '-0.01em' }}>{item.title}</p>
                        <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{item.desc}</p>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '9.5px', color: selectedIndex === idx ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.15)', 
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: selectedIndex === idx ? 'rgba(99,102,241,0.05)' : 'transparent',
                      padding: '3px 8px', borderRadius: '5px', transition: 'all 0.2s'
                    }}>{item.category}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" style={{ marginBottom: '12px' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.01em' }}>No results found</p>
                </div>
              )}
            </div>

            {!isMobile && (
              <div style={{ 
                padding: '14px 26px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.04)', 
                display: 'flex', gap: '20px', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ fontSize: '9px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>↑</div>
                    <div style={{ fontSize: '9px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>↓</div>
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.04em' }}>NAVIGATE</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '9px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>↵</div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.04em' }}>OPEN</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Mobile/Touch Trigger */}
      {!isOpen && isMobile && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            zIndex: 9997,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
