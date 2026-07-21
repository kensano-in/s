'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface AgreementModalProps {
  open: boolean;
  onAccept: (timestamp: string) => void;
  onClose: () => void;
}

export default function AgreementModal({ open, onAccept, onClose }: AgreementModalProps) {
  const [checked, setChecked] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when modal opens; always restore when it closes
  useEffect(() => {
    if (!open) {
      // Ensure scroll is always restored when modal is dismissed
      document.body.style.overflow = '';
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setChecked(false);
    setScrolledToEnd(false);
    setReadTime(0);

    const timer = setInterval(() => {
      setReadTime(prev => prev + 1);
    }, 1000);

    const t = setTimeout(() => {
      const el = scrollRef.current;
      if (el && el.scrollHeight <= el.clientHeight) {
        setScrolledToEnd(true);
      }
    }, 100);

    return () => {
      clearInterval(timer);
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (atBottom) setScrolledToEnd(true);
  }, []);

  const handleAccept = () => {
    if (!checked || !scrolledToEnd) return;
    onAccept(new Date().toISOString());
  };

  const canAccept = checked && scrolledToEnd;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="agreement-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: '100%', maxWidth: '640px',
              background: '#080808',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              height: 'min(90vh, 840px)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
            }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                  Legal Agreement Required
                </p>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                  Verlyn Pre-Access Terms
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    Read carefully. Scroll to the bottom to continue.
                  </p>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', fontFamily: 'monospace' }}>
                    Reading Time: {Math.floor(readTime / 60)}:{(readTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close agreement"
                style={{
                  flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable Terms Body */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              style={{
                flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 28px',
                fontSize: '13px', lineHeight: '1.75', color: 'rgba(255,255,255,0.55)',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '24px', letterSpacing: '0.05em' }}>
                Last revised: 1 May 2026 — Verlyn — Version 1.2.0
              </p>

              <Section title="1. Nature of This Agreement">
                This Pre-Access Agreement ("Agreement") is a legally binding contract between you ("Registrant") and Verlyn ("Company," "we," or "us"). By submitting your pre-registration, you unconditionally accept all terms herein. If you do not agree, you must not proceed.
              </Section>

              <Section title="2. Pre-Registration Scope">
                Pre-registration constitutes an expression of interest only. It does not create, imply, or establish any right to access the Verlyn protocol, receive any service, or participate in any network event. The Company reserves the sole and absolute right to grant, deny, defer, or revoke access without obligation to provide any reason.
              </Section>

              <Section title="3. Eligibility & Representation">
                By registering, you represent and warrant that: (a) you are at least 18 years of age; (b) you are not a citizen, resident, or entity located in a jurisdiction subject to international sanctions administered by OFAC, the EU, or the UN; (c) you are registering on your own behalf, not as an agent of any third party; (d) you have not previously been removed or banned from Verlyn systems.
              </Section>

              <Section title="4. Data Collection & Processing">
                We collect your email address, domain, IP address hash (SHA-256, non-reversible), and agreement timestamp. This data is processed under the lawful basis of legitimate interest and contractual necessity pursuant to the UK GDPR (UK General Data Protection Regulation) and the EU GDPR (Regulation 2016/679). We do not sell, rent, lease, or transfer this data to any third party except where required by law or to enforce our legal rights.
              </Section>

              <Section title="5. Prohibited Conduct">
                You agree not to: (a) use automated systems, bots, or scripts to submit multiple registrations; (b) submit false, misleading, or fabricated information; (c) attempt to probe, scan, or test the vulnerability of this registration infrastructure; (d) engage in any conduct that disrupts or interferes with the integrity of the system.
              </Section>

              <Section title="6. Intellectual Property">
                All content, systems, names, identifiers, and technologies associated with Verlyn are the exclusive intellectual property of Verlyn or its licensors. Nothing in this Agreement transfers any ownership or license rights to you. The name "VERLYN," all associated trademarks, and the protocol specification are protected under applicable law.
              </Section>

              <Section title="7. Confidentiality">
                Any information disclosed to you about the Verlyn protocol, architecture, or product roadmap—through this interface or any subsequent communication—is strictly confidential. You agree not to disclose, publish, or reproduce such information without prior written authorization from the Company.
              </Section>

              <Section title="8. Disclaimer of Warranties">
                THIS PRE-REGISTRATION INTERFACE AND ALL ASSOCIATED COMMUNICATIONS ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. THE COMPANY MAKES NO REPRESENTATION THAT THE PROTOCOL WILL BE LAUNCHED, AVAILABLE, OR SUITABLE FOR ANY SPECIFIC PURPOSE.
              </Section>

              <Section title="9. Limitation of Liability">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, PROFITS, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE PRE-REGISTRATION PROCESS, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE COMPANY'S TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED £50 (FIFTY POUNDS STERLING).
              </Section>

              <Section title="10. Governing Law & Jurisdiction">
                This Agreement shall be governed by and construed in accordance with the laws of England and Wales. Any dispute, controversy, or claim arising out of or relating to this Agreement shall be subject to the exclusive jurisdiction of the courts of England and Wales. If you are a consumer in the EU, mandatory consumer protection laws of your country of residence may also apply.
              </Section>

              <Section title="11. Modifications">
                The Company reserves the right to modify these terms at any time by posting a revised version to this interface. Your continued engagement with any Verlyn property after such modification constitutes your acceptance of the revised terms.
              </Section>

              <Section title="12. Severability">
                If any provision of this Agreement is found by a court of competent jurisdiction to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
              </Section>

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(124,58,237,0.05)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <p style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 500 }}>
                  Contact: admin@kensano.in — For data deletion requests, security disclosures, or legal correspondence.
                </p>
              </div>
            </div>

            {/* Footer: Scroll indicator + checkbox + button */}
            <div style={{
              padding: '20px 28px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: '16px',
            }}>
              {/* Scroll nudge */}
              {!scrolledToEnd && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px',
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid rgba(124,58,237,0.15)',
                  borderRadius: '8px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>
                    Scroll to the bottom to unlock agreement
                  </span>
                </div>
              )}

              {/* Checkbox */}
              <label
                htmlFor="agreement-checkbox"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  cursor: scrolledToEnd ? 'pointer' : 'not-allowed',
                  opacity: scrolledToEnd ? 1 : 0.4,
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
                  <input
                    id="agreement-checkbox"
                    type="checkbox"
                    checked={checked}
                    disabled={!scrolledToEnd}
                    onChange={(e) => setChecked(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '5px',
                    background: checked ? '#7c3aed' : 'transparent',
                    border: `1.5px solid ${checked ? '#7c3aed' : 'rgba(255,255,255,0.2)'}`,
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  I have read, understood, and agree to the Verlyn Pre-Access Terms and Privacy Protocol. I confirm I am 18+ and eligible under the conditions stated above.
                </span>
              </label>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: '0 0 auto', padding: '11px 20px', borderRadius: '10px',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="agreement-accept-btn"
                  type="button"
                  onClick={handleAccept}
                  disabled={!canAccept}
                  style={{
                    flex: 1, padding: '11px 20px', borderRadius: '10px',
                    background: canAccept ? '#7c3aed' : 'rgba(124,58,237,0.2)',
                    border: 'none',
                    color: canAccept ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em',
                    cursor: canAccept ? 'pointer' : 'not-allowed',
                    transition: 'all 0.25s ease',
                    boxShadow: canAccept ? '0 0 24px rgba(124,58,237,0.35)' : 'none',
                  }}
                >
                  {canAccept ? 'Agree & Request Access' : 'Read terms to continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      <p>{children}</p>
    </div>
  );
}
