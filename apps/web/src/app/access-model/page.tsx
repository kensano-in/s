'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/coming-soon/NetworkGraph'), { ssr: false });


const metadata = {
  title: 'Access Model — Verlyn',
  description: 'How moderation works, how support operates, how data flows, and how Verlyn protects users at every layer.',
};

const ROLES = [
  { role: 'Super Admin', badge: '#a78bfa', level: '5', description: 'Full platform control. Manages roles, system configuration, and audit trail access. Held by core infrastructure team only.', permissions: ['All ticket operations + delete','System configuration','Audit log access','Role assignment & revocation','User ban & deletion'] },
  { role: 'Admin', badge: '#6366f1', level: '4', description: 'Platform administration and ticket management. Cannot delete audit logs or assign super-admin level roles.', permissions: ['Full ticket management','User oversight','Audit log read','System metric access','Escalation handling'] },
  { role: 'Support Agent', badge: '#3b82f6', level: '3', description: 'Handles incoming support tickets, responds to users, and escalates issues requiring admin review.', permissions: ['Read & reply to tickets','Close resolved cases','Flag suspicious content','View system metrics'] },
  { role: 'Moderator', badge: '#10b981', level: '2', description: 'Reviews flagged submissions and manages user trust signals. Cannot reply to tickets or access admin configuration.', permissions: ['Review flagged content','Ban users for violations','Escalate to admin','Read-only ticket access'] },
  { role: 'Viewer', badge: '#94a3b8', level: '1', description: 'Read-only access to tickets and metrics. Suitable for analysts and auditors.', permissions: ['Read tickets (limited fields)','View system metrics'] },
];

const DATA_FLOW_STEPS = [
  { step: '01', title: 'User Submits', desc: 'Pre-registration or support ticket arrives at the API layer.', action: 'Rate limiter checks IP hash → Spam engine scores content → Validation layer enforces rules.' },
  { step: '02', title: 'Security Screening', desc: 'Submission passes through automated security layers.', action: 'Risk score computed (0–100) → Submissions ≥60 rejected silently → Borderline flagged for review.' },
  { step: '03', title: 'Database Write', desc: 'Approved data is written with RLS enforcement.', action: 'Service role key required → RLS policies applied → Audit event logged with full metadata.' },
  { step: '04', title: 'Ticket Assignment', desc: 'Support tickets enter the agent queue.', action: 'Agent reviews ticket → Assigns priority (normal/high/critical) → Sends reply or escalates.' },
  { step: '05', title: 'Resolution', desc: 'Ticket is resolved and archived.', action: 'Status set to Resolved → resolved_at timestamp recorded → Data retained for 12 months then purged.' },
];

const MODERATION_LAYERS = [
  { layer: 'Automated', title: 'Pre-Submit Screening', desc: 'Every submission is scored by the anti-spam engine before reaching the database. Spam score ≥60 = silent rejection. Score 30–59 = flagged for human review.' },
  { layer: 'Automated', title: 'Rate Limit Enforcement', desc: 'IP-based sliding window prevents flooding. Violations trigger time-based blocks — not CAPTCHAs. Legitimate users are never penalized.' },
  { layer: 'Human', title: 'Agent Review', desc: 'Support agents review flagged tickets, respond to genuine users, and escalate security-type reports to senior staff within 24 hours.' },
  { layer: 'Human', title: 'Admin Oversight', desc: 'Admins have visibility into risk scores, spam signals, and session fingerprints for every ticket. Nothing is hidden from the audit trail.' },
  { layer: 'System', title: 'Audit Logging', desc: 'Every moderation action by every human is logged with actor, timestamp, target, and metadata. Logs are append-only and immutable.' },
];

function InteractiveEncryption() {
  const [step, setStep] = useState(0);
  const stages = [
    { label: 'Origin', desc: 'Message exists in browser memory only. Completely accessible to you, but no one else.', color: '#fff' },
    { label: 'Encryption', desc: 'AES-256-GCM applied with your local key. The text becomes an encrypted blob.', color: '#6366f1' },
    { label: 'Transmission', desc: 'Secure ciphertext leaves your browser. Verlyn servers never see the key.', color: '#10b981' },
  ];

  useEffect(() => {
    const iv = setInterval(() => setStep(s => (s + 1) % 3), 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section style={{ marginBottom: '64px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>Interactive Privacy Logic</h2>
      <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '48px 24px', textAlign: 'center', minHeight: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, background: 'radial-gradient(circle at center, #6366f1 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center', marginBottom: '40px', position: 'relative' }}>
          {stages.map((_, i) => (
            <React.Fragment key={i}>
              <motion.div
                animate={{ 
                  scale: step === i ? 1.15 : 1,
                  background: step === i ? stages[i].color : 'rgba(255,255,255,0.03)',
                  borderColor: step === i ? stages[i].color : 'rgba(255,255,255,0.1)'
                }}
                transition={{ duration: 0.5 }}
                style={{ width: '60px', height: '60px', borderRadius: '14px', border: '1px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
              >
                {i === 0 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={step === 0 ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
                {i === 1 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={step === 1 ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>}
                {i === 2 && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={step === 2 ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>}
              </motion.div>
              {i < 2 && (
                <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
                   <motion.div 
                     animate={{ left: step === i ? '100%' : '0%', opacity: step === i ? [0, 1, 0] : 0 }}
                     transition={{ duration: 1.5, repeat: Infinity }}
                     style={{ position: 'absolute', top: '-1px', width: '10px', height: '3px', background: '#6366f1', borderRadius: '2px', filter: 'blur(2px)' }} 
                   />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>{stages[step].label}</h3>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', maxWidth: '340px', margin: '0 auto', lineHeight: 1.6 }}>{stages[step].desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default function AccessModelPage() {
  return (
    <main style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',position:'relative',zIndex:1}}>
      {/* ── BACKGROUND 3D NETWORK GRAPH ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NetworkGraph />
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
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'clamp(40px,6vw,88px) clamp(24px,5vw,80px) 40px'}}>
        <div style={{maxWidth:'1000px',margin:'0 auto'}}>
          <Link href="/" style={{fontSize:'12px',color:'#6366f1',textDecoration:'none',fontWeight:600,letterSpacing:'0.06em',display:'inline-flex',alignItems:'center',gap:'6px',marginBottom:'36px'}}>
            ← VERLYN
          </Link>
          <p style={{fontSize:'11px',letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginBottom:'12px'}}>Access Architecture</p>
          <h1 style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:700,letterSpacing:'-0.03em',lineHeight:1,marginBottom:'12px'}}>How Verlyn Works</h1>
          <p style={{fontSize:'15px',color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:'560px'}}>
            A plain-language explanation of how moderation, support, data flows, and access control actually function — without obfuscation.
          </p>
        </div>
      </div>

      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'56px clamp(16px,5vw,80px) 96px'}}>

        {/* Why invitation-only */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Gradual Onboarding Operations</h2>
          <div style={{padding:'28px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px'}}>
            <p style={{fontSize:'15px',color:'rgba(255,255,255,0.55)',lineHeight:1.75}}>
              Verlyn utilizes a phased pre-registration model to preserve server stability and security integrity during active development. High-velocity open networks often experience early infrastructure degradation, bot spam, and connection overflows that compromise security. By onboarding users in gradual waves, we can carefully verify our resource distribution, monitor edge node performance under load, and fix structural bugs without impacting our core cohort. Access restrictions are strictly operational constraints to ensure a reliable and secure experience.
            </p>
          </div>
        </section>

        {/* Role system */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Role System</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'1px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {ROLES.map((r, i, arr) => (
              <div key={i} style={{padding:'24px',background:'#0a0a0a',borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'10px',fontWeight:700,background:r.badge,color:'#000',padding:'3px 10px',borderRadius:'20px',letterSpacing:'0.06em'}}>{r.role.toUpperCase()}</span>
                  <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:'monospace'}}>Level {r.level}</span>
                </div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:1.6,marginBottom:'12px'}}>{r.description}</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                  {r.permissions.map((p, j) => (
                    <span key={j} style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',padding:'3px 10px',borderRadius:'4px'}}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Moderation layers */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>How Moderation Works</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {MODERATION_LAYERS.map((m, i) => (
              <div key={i} style={{padding:'20px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'10px',display:'flex',flexDirection:'column',gap:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.08em',padding:'3px 8px',borderRadius:'4px',flexShrink:0,
                    background: m.layer === 'Automated' ? 'rgba(99,102,241,0.15)' : m.layer === 'Human' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.12)',
                    color: m.layer === 'Automated' ? '#818cf8' : m.layer === 'Human' ? '#34d399' : '#94a3b8',
                  }}>
                    {m.layer.toUpperCase()}
                  </span>
                  <h3 style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{m.title}</h3>
                </div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data flow */}
        <section style={{marginBottom:'64px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>How Data Flows</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'0',borderLeft:'1px solid rgba(255,255,255,0.08)',paddingLeft:'24px',marginLeft:'4px'}}>
            {DATA_FLOW_STEPS.map((s, i) => (
              <div key={i} style={{paddingBottom:'32px',position:'relative'}}>
                <div style={{position:'absolute',left:'-32px',top:'2px',width:'14px',height:'14px',borderRadius:'50%',background:'#6366f1',border:'2px solid #080808',boxShadow:'0 0 8px rgba(99,102,241,0.5)'}} />
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                  <span style={{fontSize:'11px',color:'#6366f1',fontWeight:700,fontFamily:'monospace'}}>{s.step}</span>
                  <h3 style={{fontSize:'15px',fontWeight:700,color:'#fff'}}>{s.title}</h3>
                </div>
                <p style={{fontSize:'13px',color:'rgba(255,255,255,0.45)',marginBottom:'8px',lineHeight:1.5}}>{s.desc}</p>
                <p style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',fontFamily:'monospace',lineHeight:1.6,borderLeft:'2px solid rgba(99,102,241,0.3)',paddingLeft:'12px'}}>{s.action}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tier table */}
        <section style={{marginBottom:'56px'}}>
          <h2 style={{fontSize:'13px',fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'20px'}}>Access Tiers</h2>
          <div style={{display:'flex',flexDirection:'column',gap:'1px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {[
              {tier:'Tier 0 — Core',access:'Founding participants, infrastructure contributors',status:'Closed',c:'#a78bfa'},
              {tier:'Tier 1 — Early Access',access:'Early pre-registration network cohort',status:'Open Registration',c:'#10b981'},
              {tier:'Tier 2 — General Queue',access:'Verified referral queue from Tier 1',status:'Not Yet Open',c:'rgba(255,255,255,0.3)'},
              {tier:'Tier 3 — Public',access:'General access (if and when announced)',status:'Not Announced',c:'rgba(255,255,255,0.2)'},
            ].map((row, i, arr) => (
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',gap:'16px',padding:'20px 24px',background:'#0a0a0a',borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'}}>
                <div>
                  <p style={{fontSize:'14px',color:'#fff',fontWeight:600,marginBottom:'3px'}}>{row.tier}</p>
                  <p style={{fontSize:'13px',color:'rgba(255,255,255,0.4)'}}>{row.access}</p>
                </div>
                <span style={{fontSize:'12px',fontWeight:700,color:row.c,whiteSpace:'nowrap'}}>{row.status}</span>
              </div>
            ))}
          </div>
        </section>

        <InteractiveEncryption />

        <div style={{padding:'24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',marginBottom:'48px'}}>
          <p style={{fontSize:'14px',color:'#fff',fontWeight:600,marginBottom:'6px'}}>Admissions are metered by server resources.</p>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>To maintain protocol speed, cryptographic performance, and system stability under load, user onboarding is strictly metered based on infrastructure capacity and physical server scaling timelines. We appreciate your patience as we scale resources.</p>
        </div>

        <div style={{paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>Questions? <Link href="/support" style={{color:'rgba(255,255,255,0.35)',textDecoration:'none'}}>Contact support →</Link></p>
          <div style={{display:'flex',gap:'16px'}}>
            <Link href="/security" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Security</Link>
            <Link href="/transparency" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Transparency</Link>
            <Link href="/status" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>System Status</Link>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
