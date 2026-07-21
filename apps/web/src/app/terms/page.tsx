import type { Metadata } from 'next';
import LegalPageLayout, { LegalSection, LegalNotice, LegalContact } from '@/components/coming-soon/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — Verlyn',
  description: 'Legal agreement governing access to and use of the Verlyn network.',
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal Documentation"
      title="Terms of Service"
      reference="VRL-TOS-2025-04 · Effective immediately upon access"
    >
      <LegalNotice>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Important Notice</p>
        <p style={{ fontSize: '13px', lineHeight: 1.65 }}>
          Access to Verlyn infrastructure is a privilege governed by this agreement. Your continued use constitutes full acceptance of these terms. Violation results in immediate, permanent access revocation.
        </p>
      </LegalNotice>

      <LegalSection title="1. Identity Verification">
        Access to Verlyn requires stringent identity confirmation through secure channels prior to credential issuance. We prohibit disposable emails, anonymizing proxies during registration, and falsified credentials. Circumvention of identity verification constitutes a critical protocol violation and grounds for permanent removal.
      </LegalSection>

      <LegalSection title="2. Network Behavior Standards">
        While message content remains end-to-end encrypted and opaque to Verlyn infrastructure, network metadata—including connection timing, packet volume, and routing paths—is monitored by automated anomaly detection. This monitoring identifies DoS patterns, Sybil activity, and protocol abuse without compromising cryptographic confidentiality.
      </LegalSection>

      <LegalSection title="3. Data Retention Doctrine">
        Verlyn adheres to aggressive data minimization. Cryptographic session keys are ephemeral. System logs follow a 7-day rolling purge cycle. Pre-registration data is retained solely for queue management and destroyed upon queue closure. No historical archives of user activity are maintained.
      </LegalSection>

      <LegalSection title="4. Enforcement">
        Enforcement is automated and final. Upon violation detection, credential revocation executes immediately. There is no appeal process. Revoked identity keys are permanently blacklisted across all global routing nodes.
      </LegalSection>

      <LegalSection title="5. Abuse Classification">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { level: 'Level I', name: 'Operational Abuse', desc: 'Automated registration attempts, API over-polling.', consequence: '24-hour IP suspension' },
            { level: 'Level II', name: 'Identity Fraud', desc: 'Compromised domains, credential falsification.', consequence: 'Permanent identity ban' },
            { level: 'Level III', name: 'Infrastructure Attack', desc: 'Packet manipulation, routing exploitation, DoS.', consequence: 'Global blocklist + legal referral' },
          ].map(item => (
            <div key={item.level} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{item.level} · </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.consequence}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="6. Data Sovereignty">
        You retain absolute ownership of cryptographic keys generated on your device. Verlyn does not claim ownership over, nor possess technical capability to access, content transmitted through our infrastructure. We do not monetize network traffic under any circumstances.
      </LegalSection>

      <LegalSection title="7. Legal Jurisdiction">
        This agreement is governed by the laws of the Republic of India. Exclusive jurisdiction rests with the courts of Bengaluru, India. Verlyn reserves the right to seek injunctive relief in any jurisdiction where infrastructure abuse originates.
      </LegalSection>

      <LegalSection title="8. Contact">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <LegalContact email="legal@verlyn.in" label="Legal Department" description="Terms disputes, compliance inquiries, and formal legal correspondence." />
          <LegalContact email="support@verlyn.in" label="General Support" description="User-facing inquiries and access-related questions." />
        </div>
      </LegalSection>

      <div style={{ marginTop: '48px', padding: '32px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#fff', marginBottom: '28px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Version History & Changelog</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { date: 'May 09, 2026', version: 'v1.2', change: 'Revised Abuse Classification Level III definitions for infrastructure security.' },
            { date: 'Jan 28, 2026', version: 'v1.1', change: 'Expanded Network Behavior Standards to include metadata anomaly detection.' },
            { date: 'Sep 15, 2025', version: 'v1.0', change: 'Initial Terms of Service publication for early access cohort.' },
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
