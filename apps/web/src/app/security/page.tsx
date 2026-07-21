import type { Metadata } from 'next';
import Link from 'next/link';
import NetworkGraphClient from '@/components/coming-soon/NetworkGraphClient';

export const metadata: Metadata = {
  title: 'Security — Verlyn',
  description: 'How Verlyn protects your data with encryption, rate limiting, anti-spam, and audit trails.',
};

const SECURITY_PILLARS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    title: 'End-to-End Encryption',
    subtitle: 'Communication Layer',
    items: [
      'All data transmitted over TLS 1.3 — no exceptions.',
      'Messages encrypted at rest using AES-256-GCM.',
      'IP addresses are SHA-256 hashed with a server-side salt — never stored in plaintext.',
      'HTTPS enforced via Strict-Transport-Security with a 63,072,000-second max-age.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M8 12h8"></path></svg>,
    title: 'Rate Limiting & Anti-Abuse',
    subtitle: 'Traffic Protection',
    items: [
      'Sliding-window rate limiter on all API endpoints.',
      'Support submissions: 1 per IP per 6 hours, with automatic blocking.',
      'Pre-registration: 3 attempts per 10 minutes, 30-minute block on violation.',
      'OTP delivery: 5 codes per email per 15 minutes.',
      'Global brute-force shield: 200 requests/minute per IP before lockout.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    title: 'Anti-Spam Engine',
    subtitle: 'Content Integrity',
    items: [
      'Multi-signal spam detection on all user-submitted content.',
      'Pattern matching: URLs, excessive caps, repeated characters, keyboard mash.',
      'Shannon entropy analysis to detect low-quality filler content.',
      'Unique vocabulary ratio scoring — repetitive submissions are flagged.',
      'Risk score 0–100. Submissions scoring ≥60 are silently rejected.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    title: 'Audit Trail System',
    subtitle: 'Full Accountability',
    items: [
      'Every admin action is logged with actor, target, timestamp, and metadata.',
      'Logs are append-only — no modification or deletion at the app layer.',
      'Events categorized: auth, admin, support, registration, security, system.',
      'Severity levels: info, warn, critical.',
      'Failed authentication attempts trigger critical-severity audit events.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    title: 'Database Security (RLS)',
    subtitle: 'Row-Level Security',
    items: [
      'Row Level Security enabled on ALL tables — no exceptions.',
      'Anonymous users: INSERT only — they can never read other submissions.',
      'Admin data access requires service role key, never exposed to the client.',
      'Ticket data filtered by role (viewer, agent, admin, super_admin).',
      'Audit logs are completely inaccessible to non-service clients.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M9 14h6"></path><path d="M12 11v6"></path></svg>,
    title: 'Secure File Handling',
    subtitle: 'Upload Protection',
    items: [
      'Magic-byte verification: stated MIME type must match actual file signature.',
      'Dangerous signatures (PE executables, ELF binaries, macros) rejected before processing.',
      'File size limits enforced server-side: images ≤10MB, documents ≤25MB.',
      'Filename sanitization: only alphanumeric, dot, dash, underscore allowed.',
      'Extension-to-MIME consistency enforced — no extension spoofing.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>,
    title: 'Role-Based Access Control',
    subtitle: 'Principle of Least Privilege',
    items: [
      '5 distinct roles: Super Admin, Admin, Support Agent, Moderator, Viewer.',
      'Each role has an explicit, minimal permission set.',
      'API routes enforce permission checks before any data operation.',
      'Role is derived from auth headers — never from request body.',
      'Privilege escalation requires explicit ADMIN_PASSWORD + 2FA.',
    ],
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    title: 'HTTP Security Headers',
    subtitle: 'Browser Hardening',
    items: [
      'X-Content-Type-Options: nosniff — prevents MIME sniffing attacks.',
      'X-Frame-Options: DENY — prevents clickjacking.',
      'Content-Security-Policy restricts script, style, and connection sources.',
      'Permissions-Policy: camera, microphone, and geolocation disabled.',
      'Referrer-Policy: strict-origin-when-cross-origin.',
    ],
  },
];

export default function SecurityPage() {
  return (
    <main style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',overflowX:'hidden',position:'relative',zIndex:1}}>
      {/* ── BACKGROUND 3D NETWORK GRAPH ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NetworkGraphClient />
      </div>

      <div style={{
        maxWidth:'1000px',
        margin:'60px auto 96px',
        padding:'clamp(24px, 5vw, 64px)',
        background: 'rgba(6, 6, 8, 0.65)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        boxShadow: '0 30px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
      }}>
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'clamp(40px,6vw,88px) clamp(16px,5vw,80px) 40px',overflowX:'hidden'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <Link href="/" style={{fontSize:'12px',color:'#6366f1',textDecoration:'none',fontWeight:600,letterSpacing:'0.06em',display:'inline-flex',alignItems:'center',gap:'6px',marginBottom:'36px'}}>
            ← VERLYN
          </Link>
          <p style={{fontSize:'11px',letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginBottom:'12px'}}>Platform Security</p>
          <h1 style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:700,letterSpacing:'-0.03em',lineHeight:1,marginBottom:'12px'}}>Security Architecture</h1>
          <p style={{fontSize:'15px',color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:'560px'}}>
            A transparent breakdown of every security system protecting your data, sessions, and submissions on Verlyn.
          </p>
        </div>
      </div>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'56px clamp(16px,5vw,80px) 96px'}}>


        {/* Security pillars grid */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {SECURITY_PILLARS.map((p, i) => (
            <div key={i} style={{padding:'clamp(20px, 4vw, 32px)',background:'#0a0a0a',borderBottom:'1px solid rgba(255,255,255,0.03)',boxSizing:'border-box',width:'100%'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'14px',marginBottom:'20px'}}>
                <span style={{fontSize:'22px',lineHeight:1,flexShrink:0}}>{p.icon}</span>
                <div>
                  <h2 style={{fontSize:'17px',fontWeight:700,color:'#fff',letterSpacing:'-0.02em',marginBottom:'3px'}}>{p.title}</h2>
                  <p style={{fontSize:'11px',color:'#6366f1',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>{p.subtitle}</p>
                </div>
              </div>
              <ul style={{paddingLeft:'0',display:'flex',flexDirection:'column',gap:'10px',listStyle:'none',width:'100%'}}>
                {p.items.map((item, j) => (
                  <li key={j} style={{display:'flex',alignItems:'flex-start',gap:'10px',fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:1.55,width:'100%',boxSizing:'border-box'}}>
                    <span style={{color:'#6366f1',fontWeight:700,flexShrink:0,marginTop:'1px'}}>→</span>
                    <span style={{flex:1,minWidth:0,wordBreak:'break-word',overflowWrap:'anywhere'}}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Responsible Disclosure */}
        <div style={{marginTop:'56px',padding:'32px',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'12px'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
            <span style={{fontSize:'22px', color: '#818cf8', display: 'flex', marginTop: '2px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </span>
            <div>
              <h3 style={{fontSize:'17px',fontWeight:700,color:'#fff',marginBottom:'8px'}}>Responsible Disclosure</h3>
              <p style={{fontSize:'14px',color:'rgba(255,255,255,0.5)',lineHeight:1.6,maxWidth:'560px'}}>
                If you discover a security vulnerability in the Verlyn platform, please report it through our support portal using the <strong style={{color:'rgba(255,255,255,0.7)'}}>Security</strong> report type. Include a detailed description of the issue and steps to reproduce. We commit to acknowledging reports within 48 hours and resolving critical issues within 7 days.
              </p>
              <Link href="/support" style={{display:'inline-flex',alignItems:'center',gap:'6px',marginTop:'16px',fontSize:'13px',color:'#6366f1',fontWeight:600,textDecoration:'none'}}>
                Submit a security report →
              </Link>
            </div>
          </div>
        </div>

        <div style={{marginTop:'48px',paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>Security posture last reviewed: {new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
          <div style={{display:'flex',gap:'16px'}}>
            <Link href="/status" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>System Status</Link>
            <Link href="/transparency" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Transparency</Link>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
