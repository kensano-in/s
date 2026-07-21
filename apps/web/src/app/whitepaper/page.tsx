import type { Metadata } from 'next';
import LegalPageLayout, { LegalSection, LegalNotice, LegalContact } from '@/components/coming-soon/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Whitepaper — Verlyn',
  description: 'Technical architecture paper for the Verlyn zero-knowledge network.',
};

export default function WhitepaperPage() {
  return (
    <LegalPageLayout
      eyebrow="Technical Documentation"
      title="Architecture Whitepaper"
      reference="VRL-WP-2025-v1.2 · Verlyn Zero-Knowledge Social Infrastructure"
    >
      <LegalNotice>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Active Architectural Design Plan</p>
        <p style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '8px' }}>
          This whitepaper serves as the active architectural design plan for the Verlyn network. During our current pre-registration and queue phase, these systems and cryptographic primitives are being actively implemented, audited, and optimized.
        </p>
        <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)' }}>
          Verlyn presents an approach to digital space: a zero-knowledge communication architecture designed so that the platform operator is technically incapable of accessing user content. This paper outlines the cryptographic foundations, routing model, and identity system underlying our platform.
        </p>
      </LegalNotice>

      <LegalSection title="1. The Problem With Existing Networks">
        Current social infrastructure is fundamentally broken. Every major platform operates as a surveillance intermediary: centralized storage, plaintext access to content, behavioral profiling, and monetization of private communications. Users trade privacy for convenience with no meaningful alternative. Verlyn was built to eliminate this trade-off entirely.
      </LegalSection>

      <LegalSection title="2. Zero-Knowledge Architecture">
        <p style={{ marginBottom: '20px' }}>The Verlyn architecture is built on three cryptographic primitives:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'E2EE', title: 'End-to-End Encryption', desc: 'All message content is encrypted on the sender\'s device using recipient\'s public key. Verlyn servers transmit ciphertext only. No plaintext ever transits our infrastructure.', algo: 'Signal Protocol (X3DH + Double Ratchet)' },
            { id: 'ZKP', title: 'Zero-Knowledge Proofs', desc: 'Identity claims (e.g., "I am a legitimate user") are verified without revealing the underlying credentials. Access control decisions are made on proofs, not data.', algo: 'Pedersen Commitments' },
            { id: 'PFS', title: 'Perfect Forward Secrecy', desc: 'Session keys are ephemeral and rotated continuously. Compromise of long-term keys does not expose historical communications.', algo: 'ECDH Ephemeral Key Exchange' },
          ].map(item => (
            <div key={item.id} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '16px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{item.title}</p>
                <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{item.algo}</code>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="3. Routing Infrastructure">
        Verlyn uses an onion-routing inspired model where messages traverse multiple relay nodes before delivery. Each relay node knows only its adjacent nodes — never the full path. Combined with E2EE, this ensures that neither message content nor sender/recipient metadata can be reconstructed by any single infrastructure node.
      </LegalSection>

      <LegalSection title="4. Identity & Access Control">
        <p style={{ marginBottom: '16px' }}>Verlyn's identity system separates authentication from identification:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          {[
            ['Cryptographic Identity', 'A device-generated keypair. The public key is your network identity. The private key never leaves your device.'],
            ['Verlyn Credential', 'A signed certificate issued upon access approval. Links cryptographic identity to a validated email without exposing the email to the network.'],
            ['Zero-Knowledge Login', 'Authentication proves possession of the private key without transmitting it. No password is ever sent to Verlyn servers.'],
          ].map(([title, desc]) => (
            <div key={String(title)} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', marginTop: '6px', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{title}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="5. Data Architecture">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            ['Message content', 'Never stored on Verlyn servers'],
            ['Encryption keys', 'Generated and stored on user devices exclusively'],
            ['Routing metadata', 'Aggregated and purged within 24 hours'],
            ['Identity certificates', 'Stored as hashed references, not plaintext'],
            ['Session tokens', 'Ephemeral, destroyed on session end'],
          ].map(([field, value]) => (
            <div key={String(field)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}>{field}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="6. Governance Model">
        Verlyn operates under a transparent governance model. Core protocol changes require published RFCs with a 30-day public comment period. Security-critical patches follow an expedited 48-hour review. The founding team retains emergency override capability for critical security incidents only, with post-hoc public disclosure required within 7 days.
      </LegalSection>

      <LegalSection title="Contact">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <LegalContact email="dev@verlyn.in" label="Technical Team" description="Protocol questions, cryptographic review, and architecture feedback." />
          <LegalContact email="press@verlyn.in" label="Press Inquiries" description="Media access to technical documentation and interview requests." />
          <LegalContact email="security@verlyn.in" label="Security Research" description="Cryptographic vulnerability disclosure and protocol analysis." />
        </div>
      </LegalSection>
    </LegalPageLayout>
  );
}
