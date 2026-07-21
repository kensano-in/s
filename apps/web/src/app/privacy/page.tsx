import type { Metadata } from 'next';
import LegalPageLayout, { LegalSection, LegalNotice, LegalContact } from '@/components/coming-soon/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Verlyn',
  description: 'How Verlyn handles, protects, and does not store your personal information.',
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Data & Privacy"
      title="Privacy Policy"
      reference="VRL-PRIV-2025-02 · GDPR & DPDPA Compliant"
    >
      <LegalNotice>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Our Commitment</p>
        <p style={{ fontSize: '13px', lineHeight: 1.65 }}>
          Verlyn was designed from the ground up with privacy as a core architectural property — not a compliance checkbox. We minimize data collection to what is strictly necessary for operations. We do not sell, share, or monetize user data under any circumstances.
        </p>
      </LegalNotice>

      <LegalSection title="1. Data We Collect">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { category: 'Registration', items: ['Email address (hashed after verification)', 'Provider domain (for whitelist validation)', 'Agreement timestamp'] },
            { category: 'Technical', items: ['IP address (hashed, used only for rate limiting)', 'User agent string (for fraud detection)', 'Session tokens (ephemeral, never stored)'] },
            { category: 'We Do NOT Collect', items: ['Message content', 'Contact lists', 'Behavioral profiles', 'Location data', 'Device fingerprints beyond session'] },
          ].map(c => (
            <div key={c.category} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{c.category}</p>
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {c.items.map(i => <li key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="2. Zero-Knowledge Architecture">
        Verlyn's core infrastructure is built on zero-knowledge principles. Message content is encrypted client-side using keys that exist exclusively on user devices. Verlyn servers act as routing infrastructure only — we are technically incapable of reading your communications. This is not a policy claim; it is an architectural guarantee.
      </LegalSection>

      <LegalSection title="3. Data Retention Schedule">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            ['Session tokens', 'Destroyed on logout'],
            ['System logs', '7-day rolling purge'],
            ['IP hashes (rate limiting)', '24 hours'],
            ['Pre-registration data', 'Destroyed on queue closure'],
            ['Message routing metadata', 'Never persisted'],
          ].map(([field, retention]) => (
            <div key={field} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{field}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{retention}</span>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="4. Your Rights">
        You may request access to any personal data we hold, request deletion of pre-registration data, request correction of inaccurate data, and object to processing at any time. Requests are processed within 72 hours. As our architecture minimizes data retention, most deletion requests are automatically fulfilled by our systems.
      </LegalSection>

      <LegalSection title="5. Third-Party Services">
        Verlyn uses Supabase for database infrastructure (EU data residency options available). Verlyn does not use advertising networks, analytics trackers, or social media pixels. All third-party integrations are contractually bound to our data minimization standards.
      </LegalSection>

      <LegalSection title="6. Contact">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <LegalContact email="privacy@verlyn.in" label="Privacy Requests" description="GDPR/DPDPA requests, data deletion, and privacy inquiries." />
          <LegalContact email="legal@verlyn.in" label="Legal Department" description="Formal data protection authority correspondence." />
          <LegalContact email="security@verlyn.in" label="Security Disclosures" description="Privacy-related vulnerability reports." />
        </div>
      </LegalSection>

      <div style={{ marginTop: '48px', padding: '32px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#fff', marginBottom: '28px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Version History & Changelog</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { date: 'May 09, 2026', version: 'v1.4', change: 'Updated support retention policy to 12 months for better audit trail integrity.' },
            { date: 'Feb 12, 2026', version: 'v1.3', change: 'Implemented IP hashing for all rate-limiting logs to further protect anonymity.' },
            { date: 'Nov 02, 2025', version: 'v1.2', change: 'Added specific clauses regarding Supabase EU data residency.' },
            { date: 'Aug 14, 2025', version: 'v1.1', change: 'Initial Zero-Knowledge policy publication.' },
          ].map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
               <div style={{ flexShrink: 0, width: '100px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{log.date}</p>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }}>{log.version}</span>
               </div>
               <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, paddingTop: '2px' }}>{log.change}</p>
            </div>
          ))}
        </div>
      </div>
    </LegalPageLayout>
  );
}
