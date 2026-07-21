'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import NetworkGraphClient from '@/components/coming-soon/NetworkGraphClient';

interface LegalPageProps {
  eyebrow: string;
  title: string;
  reference: string;
  children: ReactNode;
}

function BackArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: '44px' }}>
      <h2 className="vrl-legal-section-title" style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '14px', marginBottom: '20px' }}>{title}</h2>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

export function LegalNotice({ children }: { children: ReactNode }) {
  return (
    <div className="vrl-legal-notice" style={{ padding: '20px 24px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: '48px' }}>
      {children}
    </div>
  );
}

export function LegalContact({ email, label, description }: { email: string; label: string; description: string }) {
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
      <div>
        <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{description}</p>
      </div>
      <a href={`mailto:${email}`} style={{ fontSize: '13.5px', color: '#6366f1', textDecoration: 'none', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: '2px', transition: 'color 0.2s', fontWeight: 600 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#6366f1')}
      >{email}</a>
    </div>
  );
}

export default function LegalPageLayout({ eyebrow, title, reference, children }: LegalPageProps) {
  return (
    <div className="vrl-legal-page" style={{ 
      height: '100dvh', 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch', 
      position: 'relative', 
      background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',
      zIndex: 1,
      color: 'rgba(255,255,255,0.5)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ── BACKGROUND 3D NETWORK GRAPH ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NetworkGraphClient />
      </div>

      <div className="vrl-legal-container" style={{ 
        position: 'relative', 
        zIndex: 10,
        maxWidth: '720px',
        margin: '80px auto',
        padding: 'clamp(32px, 6vw, 64px)',
        background: 'rgba(6, 6, 8, 0.65)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        boxShadow: '0 30px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div className="vrl-legal-header" style={{ marginBottom: '48px' }}>
          <Link href="/" className="vrl-legal-back" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textDecoration: 'none', marginBottom: '40px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#6366f1'}
          >
            <BackArrow />
            VERLYN
          </Link>
          <p className="vrl-legal-eyebrow" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontWeight: 700, marginBottom: '12px' }}>{eyebrow}</p>
          <h1 className="vrl-legal-title" style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '14px' }}>{title}</h1>
          <p className="vrl-legal-subtitle" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>{reference}</p>
        </div>

        <article className="vrl-legal-article" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {children}
        </article>

        <footer style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Verlyn · Secure Digital Infrastructure</span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[{ label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }, { label: 'Security', href: '/security' }, { label: 'Status', href: '/status' }].map(l => (
              <Link key={l.href} href={l.href} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >{l.label}</Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
