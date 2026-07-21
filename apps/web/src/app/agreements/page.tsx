'use client';

/**
 * VERLYN — Legal Agreements Gateway
 * Route: /agreements
 * 
 * Implements a mandatory legal gateway where users must review and sign the 
 * complete legal, privacy, and security framework prior to entering the testing program.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/coming-soon/Logo';
import { LEGAL_DOCUMENTS, LEGAL_VERSION } from '@/lib/coming-soon/legalFramework';
import { IconLock, IconCheckCircle, IconAlertTri } from '@/components/coming-soon/Icons';
import { checkAbusiveLanguage } from '@/lib/coming-soon/moderation';

type Tab = 'tos' | 'privacy' | 'community' | 'abuse' | 'research' | 'ip' | 'account' | 'enforcement' | 'processing' | 'compliance' | 'investigation' | 'limitations' | 'updates';

export default function AgreementsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tos');
  const [checkedRead, setCheckedRead] = useState(false);
  const [checkedComply, setCheckedComply] = useState(false);
  const [checkedViolate, setCheckedViolate] = useState(false);
  const [checkedRevoke, setCheckedRevoke] = useState(false);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const activeDoc = LEGAL_DOCUMENTS.find(d => d.id === activeTab);

  useEffect(() => {
    fetch('/api/invite/status')
      .then(r => r.json())
      .then(d => {
        if (d.stage !== 'code_verified') {
          // Gated access — redirect back to verify
          window.location.href = '/verify';
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        window.location.href = '/verify';
      });
  }, []);

  const handleSignatureChange = (val: string) => {
    setSignature(val);
    setError('');
    if (checkAbusiveLanguage(val)) {
      setError('Inappropriate or abusive name signature detected.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!checkedRead || !checkedComply || !checkedViolate || !checkedRevoke) {
      setError('You must read and consent to all terms, policies, and standards to proceed.');
      return;
    }

    if (signature.trim().length < 2) {
      setError('Please type your legal name to electronically sign the acceptance record.');
      return;
    }

    if (checkAbusiveLanguage(signature)) {
      setError('Please use your official legal name. Inappropriate or abusive language is not accepted.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invite/accept-agreements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-verlyn-request': '1',
        },
        body: JSON.stringify({
          accepted: true,
          signatureName: signature.trim(),
          language: 'en',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Redirect back to verification flow
        window.location.href = '/verify';
      } else {
        setError(data.error || 'Failed to submit legal acceptance. Please try again.');
      }
    } catch {
      setError('A connection error occurred. Please verify your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = checkedRead && checkedComply && checkedViolate && checkedRevoke && signature.trim().length >= 2;

  if (checking) {
    return (
      <main style={{
        background: '#000',
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.05)',
          borderTopColor: '#fff',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  return (
    <main style={{
      background: '#000',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 10%, rgba(255,255,255,0.015) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '820px' }}>
        
        {/* Header stacked vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px', textAlign: 'center' }}>
          <Link href="/" style={{ display: 'block', textDecoration: 'none' }}>
            <Logo size={44} />
          </Link>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '100px',
          }}>
            <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Legal & Compliance Gateway
            </span>
          </div>
        </div>

        {/* Outer card layout */}
        <div style={{
          background: 'rgba(10,10,10,0.65)',
          backdropFilter: 'saturate(180%) blur(40px)',
          WebkitBackdropFilter: 'saturate(180%) blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 36px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.01)',
          position: 'relative',
        }}>
          {/* Card inner glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)',
          }} />

          {/* Section Description */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Enlistment Agreements
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
              Prior to joining the private beta program, you must review and consent to the Verlyn legal framework.
              All agreements are cryptographically logged as immutable acceptance records.
            </p>
          </div>

          {/* Document Hub Split Screen */}
          <div className="agreements-split">
            {/* Tabs List */}
            <div className="agreements-tabs scrollbar-hide">
              {LEGAL_DOCUMENTS.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setActiveTab(doc.id as Tab)}
                  className="agreements-tab-button"
                  style={{
                    fontWeight: activeTab === doc.id ? 650 : 500,
                    background: activeTab === doc.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: activeTab === doc.id ? '#fff' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {doc.title}
                </button>
              ))}
            </div>

            {/* Tab Content Display */}
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '20px',
              height: '320px',
              overflowY: 'auto',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              fontFamily: 'var(--font-sans, Inter, sans-serif)',
            }}>
              {activeDoc?.content}
            </div>
          </div>

          {/* Form acceptance area */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Checkboxes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { checked: checkedRead, setter: setCheckedRead, label: 'I have read and understood the Verlyn Agreement.' },
                { checked: checkedComply, setter: setCheckedComply, label: 'I agree to comply with all platform policies and security requirements.' },
                { checked: checkedViolate, setter: setCheckedViolate, label: 'I understand that violating these agreements may result in immediate restriction, suspension, or permanent account termination.' },
                { checked: checkedRevoke, setter: setCheckedRevoke, label: 'I understand that Advance Access is invitation-only and may be revoked at any time.' },
              ].map((item, idx) => (
                <label key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  color: 'rgba(255,255,255,0.6)',
                  userSelect: 'none',
                  lineHeight: 1.45,
                }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={e => item.setter(e.target.checked)}
                    style={{
                      accentColor: '#818cf8',
                      cursor: 'pointer',
                      width: '15px',
                      height: '15px',
                      marginTop: '2px',
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Electronic Signature Input */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.38)',
                marginBottom: '8px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Electronic Signature (Type your full legal name)
              </label>
              <input
                type="text"
                value={signature}
                onChange={e => handleSignatureChange(e.target.value)}
                placeholder="Your full legal name"
                disabled={loading}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '13px 15px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  color: '#f2f2f2',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans, Inter, sans-serif)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            {/* Error alerts */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0 }}>
                      <IconAlertTri color="#f87171" size={14} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: !isFormValid || loading ? 'rgba(255,255,255,0.06)' : '#fff',
                color: !isFormValid || loading ? 'rgba(255,255,255,0.3)' : '#000',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: !isFormValid || loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: !isFormValid || loading ? 'none' : '0 10px 30px rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              {loading && (
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(0,0,0,0.2)',
                  borderTopColor: '#000',
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
              {loading ? 'Submitting acceptance…' : 'Accept Agreements & Continue'}
            </button>
          </form>
        </div>

        {/* Security footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '24px',
        }}>
          <IconLock color="rgba(255,255,255,0.2)" size={12} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>
            Signing registers an immutable audit trace. Version {LEGAL_VERSION}.
          </span>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .agreements-split {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 24px;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          background: rgba(0,0,0,0.3);
          padding: 16px;
          margin-bottom: 28px;
          min-height: 340px;
        }

        .agreements-tabs {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          max-height: 320px;
        }

        .agreements-tab-button {
          text-align: left;
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        @media (max-width: 640px) {
          .agreements-split {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-height: auto;
            max-height: none;
          }
          
          .agreements-tabs {
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
            max-height: none;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          
          .agreements-tab-button {
            text-align: center;
            padding: 8px 16px;
            flex-shrink: 0;
          }
        }
      `}</style>
    </main>
  );
}
