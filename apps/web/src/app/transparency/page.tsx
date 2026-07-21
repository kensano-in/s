import type { Metadata } from 'next';
import Link from 'next/link';
import NetworkGraphClient from '@/components/coming-soon/NetworkGraphClient';

export const metadata: Metadata = {
  title: 'Transparency — Verlyn',
  description: 'Verlyn transparency notice: data handling, privacy controls, session visibility, and what we never do.',
};

const COMMITMENTS = [
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-pulse">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>
      </svg>
    ), 
    title: 'No Data Brokerage', 
    desc: 'Your data is never sold, rented, bartered, or traded — not under any commercial arrangement, court order exception, or legal fiction. We do not participate in the data economy.' 
  },
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-float">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="2" x2="22" y2="22"/>
      </svg>
    ), 
    title: 'No Behavioral Tracking', 
    desc: 'There are no analytics SDKs, session recording tools, tracking pixels, or behavioral fingerprinting systems anywhere in this infrastructure.' 
  },
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-spin">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ), 
    title: 'No Algorithmic Manipulation', 
    desc: 'Content delivery is deterministic. There is no engagement algorithm, no feed manipulation, no nudging, and no perception engineering.' 
  },
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-pulse">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ), 
    title: 'No Silent Fallbacks', 
    desc: 'If encryption fails, communication stops. We do not silently downgrade to plaintext. Degraded security is treated as a full outage.' 
  },
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-bounce">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M8 14l11-11"/><path d="M3 11l6 6"/>
      </svg>
    ), 
    title: 'No False Scarcity', 
    desc: 'Access restrictions are operational and technical constraints, not marketing tactics. We will not use manufactured urgency to drive behavior.' 
  },
  { 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="vrl-icon-float">
        <path d="M18 8A3 3 0 1 0 15.28 13.1a3 3 0 1 0 4.14 0A3 3 0 0 0 18 8Z"/><path d="M6 16a3 3 0 1 0 2.72-5.1a3 3 0 1 0-4.14 0A3 3 0 0 0 6 16Z"/><path d="M18 16a3 3 0 1 0-2.72-5.1a3 3 0 1 0-4.14 0A3 3 0 0 0 18 16Z"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ), 
    title: 'No Third-Party Data Sharing', 
    desc: 'Your email, IP hash, and submission data are never shared with third-party services, advertising networks, or data aggregators.' 
  },
];

const DATA_FLOWS = [
  {
    step: '01',
    event: 'Pre-Registration Submit',
    stored: 'Hashed email, domain, SHA-256 IP hash, agreement timestamp, session fingerprint',
    notStored: 'Raw IP address, name, phone number, location data',
    retention: 'Until access invitation is issued or registration is purged',
  },
  {
    step: '02',
    event: 'Support Ticket Filed',
    stored: 'Name, email, subject, description, SHA-256 IP hash, session fingerprint, risk score',
    notStored: 'Payment data, social profiles, location beyond IP hash',
    retention: '12 months after resolution, then permanently deleted',
  },
  {
    step: '03',
    event: 'OTP Verification',
    stored: 'One-time code hash, expiry timestamp',
    notStored: 'Code in plaintext after verification',
    retention: '15 minutes, auto-expired',
  },
  {
    step: '04',
    event: 'Audit Event Logged',
    stored: 'Action category, actor IP hash, target resource ID, severity',
    notStored: 'Full request bodies, passwords, tokens',
    retention: '90 days rolling window',
  },
];

const PRIVACY_CONTROLS = [
  { title: 'Data Deletion Request', desc: 'Submit a support ticket with type "Account" to request full deletion of your pre-registration record. We will confirm deletion within 72 hours.', action: 'Request deletion' },
  { title: 'Data Access Request', desc: 'You may request a copy of all data we hold about you via the support portal. We will respond within 7 business days.', action: 'Request data copy' },
  { title: 'Opt-Out of Communications', desc: 'Every email we send contains an unsubscribe link. You may also request communication cessation via the support portal.', action: 'Manage preferences' },
  { title: 'Session Visibility', desc: 'We do not store persistent session tokens beyond your active browser session. Each visit creates a fresh, short-lived fingerprint.', action: null },
];

export default function TransparencyPage() {
  return (
    <main style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',position:'relative',zIndex:1}}>
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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vrl-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes vrl-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes vrl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vrl-bounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        .vrl-icon-pulse { animation: vrl-pulse 2s infinite ease-in-out; color: #ef4444; }
        .vrl-icon-float { animation: vrl-float 3s infinite ease-in-out; color: #6366f1; }
        .vrl-icon-spin { animation: vrl-spin 12s infinite linear; color: #10b981; }
        .vrl-icon-bounce { animation: vrl-bounce 2s infinite ease-in-out; color: #f59e0b; }
      `}} />
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'clamp(40px,6vw,88px) clamp(24px,5vw,80px) 40px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <Link href="/" style={{fontSize:'12px',color:'#6366f1',textDecoration:'none',fontWeight:600,letterSpacing:'0.06em',display:'inline-flex',alignItems:'center',gap:'6px',marginBottom:'36px'}}>
            ← VERLYN
          </Link>
          <p style={{fontSize:'11px',letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginBottom:'12px'}}>System Integrity</p>
          <h1 style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:700,letterSpacing:'-0.03em',lineHeight:1,marginBottom:'12px'}}>Transparency Notice</h1>
          <p style={{fontSize:'15px',color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:'540px'}}>
            A complete account of what data we collect, how it flows, what we never do, and how you can control your presence on this platform.
          </p>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)',marginTop:'16px',fontFamily:'monospace'}}>
            Last updated: {new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
          </p>
        </div>
      </div>

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'56px clamp(24px,5vw,80px) 96px'}}>

        {/* Commitments */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Our Commitments</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:'12px'}}>
            {COMMITMENTS.map((c, i) => (
              <div key={i} style={{padding:'24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.icon}
                  </div>
                  <h3 style={{fontSize:'15px',fontWeight:700,color:'#fff',letterSpacing:'-0.01em'}}>{c.title}</h3>
                </div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.45)',lineHeight:1.65}}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data flows */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Data Flow Breakdown</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'1px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {DATA_FLOWS.map((f, i, arr) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 1fr',gap:'20px',padding:'24px',background:'#0a0a0a',borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',alignItems:'start'}}>
                <span style={{fontSize:'11px',color:'#6366f1',fontWeight:700,paddingTop:'2px'}}>{f.step}</span>
                <div>
                  <p style={{fontSize:'13px',fontWeight:700,color:'#fff',marginBottom:'4px'}}>{f.event}</p>
                </div>
                <div>
                  <p style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.08em',color:'#10b981',marginBottom:'4px'}}>STORED</p>
                  <p style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>{f.stored}</p>
                  <p style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.08em',color:'#ef4444',marginTop:'8px',marginBottom:'4px'}}>NEVER STORED</p>
                  <p style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>{f.notStored}</p>
                </div>
                <div>
                  <p style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.08em',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>RETENTION</p>
                  <p style={{fontSize:'12px',color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>{f.retention}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{fontSize:'11px',color:'rgba(255,255,255,0.2)',marginTop:'10px',fontFamily:'monospace'}}>
            All columns are visible above. On mobile, scroll to view retention details.
          </p>
        </section>

        {/* Privacy controls */}
        <section style={{marginBottom:'56px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Your Privacy Controls</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'1px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {PRIVACY_CONTROLS.map((pc, i, arr) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'16px',padding:'20px 24px',background:'#0a0a0a',borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'}}>
                <div style={{flex:1,minWidth:'200px'}}>
                  <h3 style={{fontSize:'14px',fontWeight:600,color:'#fff',marginBottom:'4px'}}>{pc.title}</h3>
                  <p style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>{pc.desc}</p>
                </div>
                {pc.action && (
                  <Link href="/support" style={{fontSize:'12px',color:'#6366f1',fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
                    {pc.action} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Business model note */}
        <div style={{padding:'28px',borderLeft:'2px solid rgba(99,102,241,0.5)',marginBottom:'48px'}}>
          <p style={{fontSize:'14px',color:'rgba(255,255,255,0.6)',lineHeight:1.7}}>
            Verlyn&apos;s business model is based on direct infrastructure support — not the monetization of participant data. The platform&apos;s security posture and the platform&apos;s business model are inseparable: we have no financial incentive to collect or sell your data.
          </p>
        </div>

        <div style={{paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>Questions about this notice? <Link href="/support" style={{color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>Contact support →</Link></p>
          <div style={{display:'flex',gap:'16px'}}>
            <Link href="/security" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Security</Link>
            <Link href="/privacy" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Privacy Policy</Link>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
