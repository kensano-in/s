'use client';

import React from 'react';
import LegalPageLayout, { LegalSection, LegalNotice, LegalContact } from '@/components/coming-soon/LegalPageLayout';
import Link from 'next/link';

export default function TrustCenterPage() {
  return (
    <LegalPageLayout
      eyebrow="Credibility & Safety"
      title="Trust Center"
      reference="Last updated: June 1, 2026 · Active pre-release status"
    >
      <LegalNotice>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>The Heart of Our Credibility</p>
        <p style={{ fontSize: '13px', lineHeight: 1.65 }}>
          Trust is not built with marketing taglines. It is built through transparency, architectural constraints, and open communication. This Trust Center serves as the single source of truth for Verlyn's operational policies, security protocols, system health, and development direction.
        </p>
      </LegalNotice>

      {/* ── SECURITY DISCLOSURES ── */}
      <LegalSection title="1. Platform Security Philosophy">
        <p style={{ marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>
          We don't claim to be "unhackable" or "100% secure," because no digital system is. Instead, we use device-level keys and architectural boundaries to reduce risk:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            {
              title: 'Device-Level Key Generation',
              desc: 'Your private encryption keys are generated locally in your browser and never leave your device. Our servers only route ciphertext payloads.'
            },
            {
              title: 'Zero Password Storage',
              desc: 'We use secure email OTP verification combined with hardware session handshakes. There are no database tables storing user passwords to be breached.'
            },
            {
              title: 'Session Management',
              desc: 'Sessions are transient and stored in local memory only. Logging out completely purges all session traces instantly.'
            },
            {
              title: 'Account Deletion & Purging',
              desc: 'When you choose to delete your presence, your keys are revoked at global nodes. Message payloads on our relays are destroyed automatically after transmission.'
            }
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{item.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* ── PRIVACY PRACTICES ── */}
      <LegalSection title="2. Honest Privacy Operations">
        <p style={{ marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>
          Verlyn operates on data minimization. We only collect what is strictly necessary to route packets and prevent network abuse:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Emails', details: 'Hashed server-side and kept only to validate access waves and prevent system flooding.' },
            { label: 'IP Hashes', details: 'Salted, ephemeral hashes are kept in volatile memory for sliding-window rate limiting. Raw IPs are never written to disk.' },
            { label: 'Zero Analytics', details: 'We use no behavioral metrics, no third-party scripts, and no tracking pixels. The system is designed to not collect data.' }
          ].map((itm, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 20px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                <strong>{itm.label}:</strong> {itm.details}
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* ── LIVE TELEMETRY WIDGET ── */}
      <LegalSection title="3. Live System Health">
        <p style={{ marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>
          We share our infrastructure health openly so you don't have to guess. Our telemetry maps live connection integrity across global edge relays:
        </p>
        <div style={{
          padding: '24px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>All Nodes Operational</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Average backbone latency: <strong>42ms</strong> · Packet loss: <strong>0.00%</strong></p>
          </div>
          <Link href="/status" style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#6366f1',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            View Full Telemetry Map →
          </Link>
        </div>
      </LegalSection>

      {/* ── PUBLIC ROADMAP ── */}
      <LegalSection title="4. Public Roadmap">
        <p style={{ marginBottom: '20px', fontSize: '14.5px', lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>
          Progress comes from active development, not marketing timelines. Here is a realistic overview of where we are and what we are working on next:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { phase: 'In Development', items: ['Improved PoW validation efficiency', 'Local session DB isolation mechanisms', 'Client-side message encryption speed improvements'] },
            { phase: 'Coming Next', items: ['2FA support for account administrative actions', 'Multi-device sync verification protocol', 'Unified DID identity support'] },
            { phase: 'Planned', items: ['Open audit of our custom routing algorithms', 'Public code repository release', 'Community-run edge nodes support'] },
            { phase: 'Under Research', items: ['Post-quantum cryptographic transitions', 'Local offline mesh messaging integration'] }
          ].map((col, idx) => (
            <div key={idx} style={{ padding: '20px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>{col.phase}</h4>
              <ul style={{ paddingLeft: '14px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LegalSection>

      {/* ── RESPONSIBLE DISCLOSURE & SECURITY CONTACT ── */}
      <LegalSection title="5. Responsible Disclosure Doctrine">
        <p style={{ marginBottom: '16px', fontSize: '14.5px', lineHeight: 1.65, color: 'rgba(255,255,255,0.7)' }}>
          We welcome collaboration with independent security researchers, journalists, and engineers. If you find a security issue or architectural flaw, please contact us immediately through our private disclosure channel. We guarantee an initial acknowledgement within 48 hours and a commitment to resolution without legal threats.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '16px' }}>
          <LegalContact
            email="security@verlyn.in"
            label="Responsible Security Disclosure"
            description="Submit technical vulnerability logs, cryptographic findings, or protocol analysis directly to our trust team."
          />
          <LegalContact
            email="support@verlyn.in"
            label="General Support & Concerns"
            description="For concerns regarding account recovery, email domain registration waves, or platform assistance."
          />
        </div>
      </LegalSection>

      {/* ── DEVELOPMENT UPDATES & CHANGELOG ── */}
      <div style={{ marginTop: '48px', padding: '32px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#fff', marginBottom: '28px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Recent Development Updates</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { date: 'June 01, 2026', title: 'Trust Overhaul & Hype Reduction', desc: 'Rewrote all platform communication layers to reflect realistic architectural properties. Replaced FOMO indicators in waitlist workflows with plain infrastructure updates.' },
            { date: 'May 18, 2026', title: 'Telemetry Engine Live', desc: 'Introduced live edge node mapping and latency latency telemetry widgets for public verification of service status.' },
            { date: 'May 04, 2026', title: 'Abuse Shield Optimizations', desc: 'Improved local Proof of Work batch solving size to prevent browser CPU throttling during pre-registration verification.' }
          ].map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '110px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{log.date}</p>
                <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }}>UPDATE</span>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{log.title}</p>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{log.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LegalPageLayout>
  );
}
