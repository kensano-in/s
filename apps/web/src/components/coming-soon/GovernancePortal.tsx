'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type GovernanceView = 'terms' | 'privacy' | 'security' | 'access' | 'transparency' | 'status' | 'whitepaper';

interface GovernanceCenterProps {
  onClose: () => void;
  initialView?: GovernanceView;
}

export default function GovernanceCenter({ onClose, initialView = 'terms' }: GovernanceCenterProps) {
  const [view, setView] = React.useState<GovernanceView>(initialView);

  // Scroll Lock
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const sections = {
    terms: {
      title: 'Terms of Service',
      lastUpdated: 'May 08, 2026',
      content: `
        ## 1. Governance Overview
        By accessing the Verlyn digital infrastructure, you agree to adhere to our cryptographically enforced operational standards. Our systems are designed for high-integrity operations and require total compliance with our automated governance protocols.

        ## 2. Infrastructure Access
        Access to the Verlyn Command Center and associated secure endpoints is restricted to authorized entities. Any attempt to bypass security layers will result in permanent hardware-level blacklisting.

        ## 3. Liability & Performance
        Verlyn provides sub-120ms latency guarantees for established tunnels. We are not liable for latency introduced by non-compliant client-side configurations or intermediate network failures.
      `
    },
    privacy: {
      title: 'Privacy Protocol',
      lastUpdated: 'May 08, 2026',
      content: `
        ## 1. Zero-Knowledge Architecture
        Verlyn operates on a zero-knowledge basis. We do not store, view, or have the capacity to decrypt data traversing our tunnels. Your identity is your private key.

        ## 2. Metadata Handling
        Minimal operational metadata is processed for routing optimization and spam prevention. This data is non-persistent and automatically purged every 24 hours.

        ## 3. Cryptographic Privacy
        All communications are secured via AES-256-GCM and Curve25519. No backdoors exist. No tracking is permitted.
      `
    },
    security: {
      title: 'Security Architecture',
      lastUpdated: 'May 08, 2026',
      content: `
        ## 1. Threat Mitigation
        Our WAF employs real-time behavioral analysis to neutralize advanced persistent threats (APTs) before they reach the application layer.

        ## 2. Hardened Endpoints
        Every Verlyn endpoint is protected by biometric-linked 2FA and hardware security modules (HSMs).

        ## 3. Auditability
        Every system change is logged to an immutable, append-only ledger for total operational transparency.
      `
    },
    access: {
      title: 'Access Model',
      lastUpdated: 'May 08, 2026',
      content: `
        ## 1. Tiered Infrastructure
        Verlyn utilizes a reputation-based access model. Early adopters (Pre-Registered) receive priority bandwidth and lower-level kernel access.

        ## 2. API Distribution
        API keys are distributed based on organizational validation. We prioritize security researchers and infrastructure developers.

        ## 3. Revocation Policy
        Credentials can be revoked instantly upon detection of adversarial behavior or compromised entropy.
      `
    },
    transparency: {
      title: 'Transparency Report',
      lastUpdated: 'May 08, 2026',
      content: `
        ## 1. System Integrity
        Verlyn maintains a 100% verification rate for all cryptographic handshakes. No unauthorized access has been recorded since inception.

        ## 2. Uptime Statistics
        Our distributed mesh network has achieved 99.999% global availability.

        ## 3. Incident Logs
        All resolved security incidents are documented here. Currently, the system is in 'Nominal' state.
      `
    },
    status: {
      title: 'System Status',
      lastUpdated: 'Live',
      content: `
        ## Global Status: Operational
        - **Command Center:** ONLINE
        - **Tunneling Mesh:** NOMINAL
        - **Security Gateway:** ACTIVE
        - **API Subsystem:** OPTIMIZED

        Latency: 42ms (Global Avg)
      `
    },
    whitepaper: {
      title: 'Technical Whitepaper',
      lastUpdated: 'v1.0.4',
      content: `
        ## Verlyn: The New Standard for Digital Trust
        Verlyn is a high-performance identity and infrastructure layer built for the next era of digital interaction. By combining sub-120ms latency with absolute cryptographic security, we enable applications that were previously impossible.

        ## Architecture
        Our architecture leverages decentralized identity (DID) and zero-knowledge proofs to ensure that user data is never at risk.
      `
    }
  };

  const navItems: { id: GovernanceView; label: string }[] = [
    { id: 'terms', label: 'Terms' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'security', label: 'Security' },
    { id: 'access', label: 'Access' },
    { id: 'transparency', label: 'Transparency' },
    { id: 'status', label: 'Status' },
    { id: 'whitepaper', label: 'Whitepaper' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100000,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(40px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '40px 24px',
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ y: 20, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        style={{
          width: '100%', maxWidth: '1000px', height: '90dvh',
          margin: 'auto 0',
          background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '24px', display: 'flex', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.8)'
        }}
      >
        {/* Sidebar Nav */}
        <div style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.2em', color: '#fff', opacity: 0.5 }}>GOVERNANCE</div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  textAlign: 'left', padding: '12px 16px', borderRadius: '10px',
                  background: view === item.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  color: view === item.id ? '#fff' : 'rgba(255,255,255,0.3)',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase'
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.1em'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              Close Portal
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '60px 80px', overflowY: 'auto' }} className="scrollbar-hide">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{sections[view].title}</h1>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Revision Date</p>
                <p style={{ fontSize: '12px', color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{sections[view].lastUpdated}</p>
              </div>
            </div>

            <div style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, fontSize: '15px' }}>
              {sections[view].content.split('\n').map((line, i) => {
                if (line.startsWith('##')) {
                  return <h2 key={i} style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginTop: '40px', marginBottom: '16px' }}>{line.replace('##', '').trim()}</h2>;
                }
                if (line.startsWith('-')) {
                  return <li key={i} style={{ marginBottom: '8px' }}>{line.replace('-', '').trim()}</li>;
                }
                return <p key={i} style={{ marginBottom: '16px' }}>{line.trim()}</p>;
              })}
            </div>
          </motion.div>
        </div>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </motion.div>
    </motion.div>
  );
}
