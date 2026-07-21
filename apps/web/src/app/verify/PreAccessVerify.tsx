'use client';

/**
 * VERLYN — Advanced Access Verification Flow
 * Route: /verify
 *
 * Sequential multi-step verification:
 *   Step 1 — Invitation Code
 *   Step 2 — Email Verification
 *   Step 3 — OTP Verification
 *   Step 4 — Access Granted (holding screen)
 *
 * Security model:
 * - On mount, polls /api/invite/status to determine the current stage from the backend.
 * - No stage information is stored in React state beyond what the server returns.
 * - All sensitive operations are performed via server-side API routes.
 * - Direct URL access shows Step 1; no bypass is possible.
 * - Refreshing the page preserves the stage via the HttpOnly session cookie.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Logo from '@/components/coming-soon/Logo';
import { IconLock, IconMail, IconCheckCircle, IconAlertTri } from '@/components/coming-soon/Icons';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'loading' | 'none' | 'agreements_accepted' | 'code_verified' | 'email_verified' | 'otp_verified';

// ── API helpers ───────────────────────────────────────────────────────────────

const HEADERS = {
  'Content-Type': 'application/json',
  'x-verlyn-request': '1',
};

async function apiPost(path: string, body: Record<string, string>) {
  const res = await fetch(path, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'Unexpected error' }));
  return { ok: res.ok, data };
}

// ── Animation variants ────────────────────────────────────────────────────────

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.3 } },
};

// ── Styles (matching PreRegisterForm exactly) ───────────────────────────────

const inp: React.CSSProperties = {
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
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  marginBottom: '14px',
};

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.38)',
  marginBottom: '7px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const btnStyle = (disabled: boolean, loading: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '16px',
  borderRadius: '12px',
  background: disabled || loading ? 'rgba(255,255,255,0.06)' : '#fff',
  color: disabled || loading ? 'rgba(255,255,255,0.3)' : '#000',
  fontWeight: 800,
  fontSize: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: disabled || loading ? 'not-allowed' : 'pointer',
  transition: 'all 0.25s ease',
  boxShadow: disabled || loading ? 'none' : '0 10px 30px rgba(255,255,255,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
});

// ── Shared Primitives ─────────────────────────────────────────────────────────

function StepLabel({ num, label }: { num: number; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '20px' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#818cf8', fontFamily: 'var(--font-mono, monospace)' }}>0{num}</span>
      <div style={{ width: '1px', height: '8px', background: 'rgba(99,102,241,0.25)' }} />
      <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#818cf8', fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

function PremiumErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{
        padding: '16px 18px',
        background: 'rgba(239,68,68,0.04)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '10px',
        textAlign: 'left',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          <IconAlertTri color="#f87171" size={16} />
        </div>
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 650, color: '#f87171', marginBottom: '4px', letterSpacing: '-0.01em' }}>
            {title}
          </h4>
          <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.7)', lineHeight: 1.55, margin: 0, fontWeight: 400 }}>
            {message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 1: Invitation Code ───────────────────────────────────────────────────

function CodeStep({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode]       = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(false);

  const handleCodeChange = (raw: string) => {
    const stripped = raw.replace(/[-\s]/g, '').toUpperCase().slice(0, 12);
    const parts    = [stripped.slice(0, 4), stripped.slice(4, 8), stripped.slice(8, 12)].filter(Boolean);
    setCode(parts.join('-'));
    setError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripped = code.replace(/[-\s]/g, '');
    if (stripped.length !== 12) return;

    setLoading(true);
    setError(false);
    const { ok } = await apiPost('/api/invite/verify-code', { code: stripped });
    setLoading(false);
    if (ok) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  const isComplete = code.replace(/[-\s]/g, '').length === 12;

  return (
    <motion.div key="code-step" {...fadeSlide}>
      <StepLabel num={1} label="Invitation Code" />

      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        Enter your Invitation Code
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '24px' }}>
        This invitation code is issued only by the Verlyn Engineering Team and authorized administrators.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <label style={lbl}>12-Character Code</label>
          <input
            id="invite-code-input"
            value={code}
            onChange={e => handleCodeChange(e.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            maxLength={14}
            autoFocus
            disabled={loading}
            style={{
              ...inp,
              letterSpacing: '0.12em',
              textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <PremiumErrorBox
              title="Invitation could not be verified"
              message="The invitation code you entered is invalid, expired, revoked, or has already been used. Only invitation codes issued directly by the Verlyn Engineering Team are accepted for Advance Access. Please verify your code and try again."
            />
          )}
        </AnimatePresence>

        <button type="submit" disabled={!isComplete || loading} style={btnStyle(!isComplete, loading)}>
          {loading && (
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.2)',
              borderTopColor: '#000',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? 'Verifying…' : 'Verify Invitation Code'}
        </button>
      </form>
    </motion.div>
  );
}

// ── Step 2: Email Verification ────────────────────────────────────────────────

function EmailStep({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]     = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setLoading(true);
    setError(false);
    const { ok } = await apiPost('/api/invite/verify-email', { email: email.trim() });
    if (ok) {
      await apiPost('/api/invite/send-otp', {});
      onSuccess();
    } else {
      setLoading(false);
      setError(true);
    }
  };

  const isComplete = email.trim().length > 3 && email.includes('@');

  return (
    <motion.div key="email-step" {...fadeSlide}>
      <StepLabel num={2} label="Email Verification" />

      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        Verify Your Email
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '24px' }}>
        Enter the email address that this invitation was originally assigned to.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <label style={lbl}>Registered Email</label>
          <input
            id="invite-email-input"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(false); }}
            placeholder="you@domain.com"
            autoFocus
            disabled={loading}
            style={inp}
          />
        </div>

        <AnimatePresence>
          {error && (
            <PremiumErrorBox
              title="Verification Failed"
              message="This invitation is not assigned to the email address you entered. Advance Access invitations are bound to a single verified email and cannot be transferred to another account. Please use the original email associated with your invitation."
            />
          )}
        </AnimatePresence>

        <button type="submit" disabled={!isComplete || loading} style={btnStyle(!isComplete, loading)}>
          {loading && (
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.2)',
              borderTopColor: '#000',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? 'Verifying…' : 'Continue'}
        </button>
      </form>
    </motion.div>
  );
}

// ── Step 3: OTP Verification ──────────────────────────────────────────────────

function OtpStep({ onSuccess }: { onSuccess: () => void }) {
  const [otp, setOtp]               = React.useState('');
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);
  const [resending, setResending]   = React.useState(false);
  const [resendCooldown, setCooldown] = React.useState(0);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (v: string) => {
    setOtp(v.replace(/\D/g, '').slice(0, 6));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    setError(null);
    const { ok, data } = await apiPost('/api/invite/verify-otp', { otp });
    setLoading(false);
    if (ok) {
      onSuccess();
    } else {
      setError(data.error || 'The verification code you entered is incorrect or has expired. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResendSuccess(false);
    const { ok, data } = await apiPost('/api/invite/send-otp', {});
    if (ok) {
      setCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } else {
      setError(data.error || 'Failed to resend verification code. Please try again.');
      setCooldown(15); // Add a 15s cooldown on failure to block spam clicking
    }
    setResending(false);
  };

  const isComplete = otp.length === 6;

  return (
    <motion.div key="otp-step" {...fadeSlide}>
      <StepLabel num={3} label="Email Verification Required" />

      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
        Enter Verification Code
      </h3>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '24px' }}>
        We've sent a six-digit verification code to your registered email address. Enter the code below to continue.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <label style={lbl}>Verification Code</label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={e => handleOtpChange(e.target.value)}
            placeholder="— — — — — —"
            maxLength={6}
            autoFocus
            disabled={loading}
            style={{
              ...inp,
              fontSize: '24px',
              letterSpacing: '8px',
              textAlign: 'center',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <PremiumErrorBox
              title="Verification Problem"
              message={error}
            />
          )}
          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                padding: '12px 16px',
                background: 'rgba(16,185,129,0.04)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '10px',
                textAlign: 'center',
                color: '#34d399',
                fontSize: '12px',
                marginBottom: '16px',
                fontWeight: 500
              }}
            >
              Verification code resent successfully to your inbox!
            </motion.div>
          )}
        </AnimatePresence>

        <button type="submit" disabled={!isComplete || loading} style={btnStyle(!isComplete, loading)}>
          {loading && (
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(0,0,0,0.2)',
              borderTopColor: '#000',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {resendCooldown > 0 ? (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Resend in <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{resendCooldown}s</strong>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}

// ── Step 4: Access Granted ────────────────────────────────────────────────────

function CompleteStep() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLaunchPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/invite/grant-gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-verlyn-request': '1'
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gateway authorization failed');
      }

      // Dynamic host redirection
      const host = window.location.host;
      let targetUrl = 'https://app.verlyn.in/login';
      if (host.includes('verlyn.local')) {
        targetUrl = `http://app.verlyn.local:${window.location.port || '3000'}/login`;
      } else if (host.includes('localhost')) {
        targetUrl = `http://${host}/login`;
      }

      window.location.href = targetUrl;
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="complete-step"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
      style={{ textAlign: 'center' }}
    >
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0, transition: { delay: 0.1, type: 'spring', stiffness: 260, damping: 20 } }}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.1), transparent 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 32px rgba(255,255,255,0.1)',
          }}
        >
          <IconCheckCircle color="#fff" size={22} />
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.025em' }}>
          Identity Verified
        </h3>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>
          Your invitation has been authenticated. You are enrolled in the Verlyn Advance Access program.
        </p>

        <div style={{
          padding: '16px 18px',
          background: 'rgba(255,255,255,0.015)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: '6px' }}>
            Next Stage
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, margin: 0 }}>
            You now have secure gateway clearance to log in or register your account on the Verlyn platform.
          </p>
        </div>

        <button
          onClick={handleLaunchPortal}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg, #ffffff, #e6e6e6)',
            color: '#000',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: '0 8px 24px rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}
        >
          {loading ? 'Opening Gateway...' : 'LAUNCH PORTAL'}
          {!loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>

        {error && (
          <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px', marginBottom: '16px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#fff',
            display: 'inline-block',
            animation: 'vrlPulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Access Secured
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.1)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

// ── Progress indicator ────────────────────────────────────────────────────────


function ProgressDots({ stage }: { stage: Stage }) {
  const steps: Array<{ key: Stage | 'none'; label: string }> = [
    { key: 'none',                label: 'Code' },
    { key: 'agreements_accepted', label: 'Email' },
    { key: 'email_verified',      label: 'OTP' },
    { key: 'otp_verified',        label: 'Secure' },
  ];

  const currentIdx = steps.findIndex(s => s.key === stage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '32px' }}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: idx <= currentIdx ? '6px' : '5px',
              height: idx <= currentIdx ? '6px' : '5px',
              borderRadius: '50%',
              background: idx < currentIdx
                ? '#10b981'
                : idx === currentIdx
                  ? '#fff'
                  : 'rgba(255,255,255,0.12)',
              transition: 'all 0.3s',
              boxShadow: idx === currentIdx ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
            }} />
            <span style={{
              fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: idx === currentIdx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              fontWeight: 600,
            }}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div style={{
              width: '24px', height: '1px',
              background: idx < currentIdx ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)',
              marginBottom: '16px',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PreAccessVerify() {
  const [stage, setStage] = React.useState<Stage>('loading');

  React.useEffect(() => {
    // Check if unblock query parameter is present to lift admin ban
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('unblock') === '1' || urlParams.get('clear_admin') === '1') {
        localStorage.removeItem('vrl_admin_blocked');
        localStorage.removeItem('vrl_admin_attempts');
        alert('Administrative gateway block lifted for this device.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    fetch('/api/invite/status')
      .then(r => r.json())
      .then(d => {
        const currentStage = (d.stage as Stage) ?? 'none';
        if (currentStage === 'code_verified') {
          // If code is verified but agreements are not signed, redirect to Agreements page
          window.location.href = '/agreements';
        } else {
          setStage(currentStage);
        }
      })
      .catch(() => {
        setStage('none');
      });
  }, []);

  const handleCodeSuccess = () => {
    setStage('code_verified');
    window.location.href = '/agreements';
  };
  const handleEmailSuccess = () => setStage('email_verified');
  const handleOtpSuccess   = () => setStage('otp_verified');

  return (
    <main style={{
      background: '#000',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,255,255,0.015) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '460px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
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
              Testing Enlistment
            </span>
          </div>
        </div>

        {/* Card Container */}
        <div style={{
          width: '100%',
          background: 'rgba(10,10,10,0.65)',
          backdropFilter: 'saturate(180%) blur(40px)',
          WebkitBackdropFilter: 'saturate(180%) blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: stage === 'otp_verified'
            ? '0 40px 100px rgba(0,0,0,0.8), 0 0 40px rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.02)'
            : '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.01)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Card inner glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)',
          }} />

          {/* Progress dots — only show after loading */}
          {stage !== 'loading' && <ProgressDots stage={stage} />}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <AnimatePresence mode="wait">
              {stage === 'loading' && <LoadingScreen key="loading" />}
              {stage === 'none' && <CodeStep key="code" onSuccess={handleCodeSuccess} />}
              {stage === 'agreements_accepted' && <EmailStep key="email" onSuccess={handleEmailSuccess} />}
              {stage === 'email_verified' && <OtpStep   key="otp"   onSuccess={handleOtpSuccess} />}
              {stage === 'otp_verified'   && <CompleteStep key="complete" />}
            </AnimatePresence>
          </div>
        </div>

        {/* Security Note */}
        {stage !== 'otp_verified' && stage !== 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '24px',
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <IconLock color="rgba(255,255,255,0.2)" size={12} />
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', fontWeight: 400 }}>
              Secure server-side validation. Credentials are never cached.
            </span>
          </motion.div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
