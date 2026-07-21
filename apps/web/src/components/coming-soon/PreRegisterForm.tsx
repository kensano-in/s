'use client';

import { useState, useRef, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AgreementModal from './AgreementModal';
import { ALLOWED_DOMAINS } from '@/lib/coming-soon/allowedDomains';

const MAX_STRIKES      = 3;
const BAN_DURATION_MS  = 60 * 60 * 1000;
const RESEND_COOLDOWN  = 90;
const MAX_OTP_ATTEMPTS = 3;
const SESSION_KEY      = 'vrl_otp_session';

type Stage  = 'form' | 'pow' | 'otp' | 'success';
type Gender = 'Male' | 'Female' | 'Prefer not to say' | null;

const BAD_WORDS = [
  'admin','root','verlyn','fuck','shit','bitch','asshole','cunt','dick','pussy','whore','slut',
  'bastard','motherfucker','cock','faggot','nigger','nigga',
  'bhenchod','madarchod','chutiya','bhosdike','gandu','raand','randi','kamina','suar','bhadwa',
  'laude','loda','lode','muthiya','jhantu','chut','choot','gand','gaand','lund','bhosdi','behenchod'
];

const checkAbusiveLanguage = (text: string) => {
  const words = text.toLowerCase().split(/[\s.]+/);
  return BAD_WORDS.some(bad => words.some(w => w === bad));
};

export default function PreRegisterForm() {
  const [stage,         setStage]         = useState<Stage>('form');
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [gender,        setGender]        = useState<Gender>('Prefer not to say');
  const [otpCode,       setOtpCode]       = useState('');
  const [formError,     setFormError]     = useState('');
  const [otpError,      setOtpError]      = useState('');
  const [formLoading,   setFormLoading]   = useState(false);
  const [otpLoading,    setOtpLoading]    = useState(false);
  const [powStep,       setPowStep]       = useState(''); // visible PoW status text
  const [isBlocked,     setIsBlocked]     = useState(false);
  const [invalidDomains,setInvalidDomains]= useState(0);
  const [otpAttempts,   setOtpAttempts]   = useState(0);
  const [resendTimer,   setResendTimer]   = useState(0);
  const [resendUsed,    setResendUsed]    = useState(false);
  const [agreementTs,   setAgreementTs]   = useState<string | null>(null);
  const [showAgreement,  setShowAgreement]  = useState(false);
  const [showIpModal,    setShowIpModal]    = useState(false);
  const [showAbuseModal, setShowAbuseModal] = useState(false);

  const honeypotId       = useId();
  const honeypotRef      = useRef<HTMLInputElement>(null);
  const otpInputRef      = useRef<HTMLInputElement>(null);
  const interactionStart = useRef<number | null>(null);

  /* ── Init: ban check ────────────────────────────────────────────── */
  useEffect(() => {
    const banTime = localStorage.getItem('vrl_ban_time');
    if (banTime && Date.now() - parseInt(banTime) < BAN_DURATION_MS) {
      setIsBlocked(true); return;
    }
    localStorage.removeItem('vrl_ban_time');
  }, []);

  /* ── Interaction tracker ─────────────────────────────────────────── */
  useEffect(() => {
    if ((fullName || email) && !interactionStart.current)
      interactionStart.current = Date.now();
  }, [fullName, email]);

  /* ── Resend countdown ────────────────────────────────────────────── */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  /* ── Auto-focus OTP input ────────────────────────────────────────── */
  useEffect(() => {
    if (stage === 'otp') setTimeout(() => otpInputRef.current?.focus(), 300);
  }, [stage]);

  /* ── Interaction tracker & Helpers ───────────────────────────────── */
  useEffect(() => {
    if ((fullName || email) && !interactionStart.current)
      interactionStart.current = Date.now();
  }, [fullName, email]);

  const checkNameWithAPI = async (nameToCheck: string) => {
    if (!nameToCheck.trim() || nameToCheck.length < 2) return false;
    try {
      const res = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nameToCheck }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isAbusive) {
          setShowAbuseModal(true);
          setFullName('');
          return true;
        }
      }
    } catch (e) {
      console.error('Moderation API failed', e);
    }
    return false;
  };

  const handleNameChange = (val: string) => {
    setFullName(val);
    setFormError('');
    if (checkAbusiveLanguage(val)) {
      setShowAbuseModal(true);
      setFullName(''); // Clear the offensive text instantly
    }
  };

  const blockUser = () => {
    setIsBlocked(true);
    localStorage.setItem('vrl_ban_time', Date.now().toString());
  };

  /* ── STEP 1: Form validation ─────────────────────────────────────── */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (isBlocked) { setFormError('Access is temporarily restricted. Please try again later.'); return; }

    const name = fullName.trim();
    const mail = email.trim();

    if (!name || !mail) {
      setFormError('Kindly fill in both your Name and Email to proceed with your registration.');
      return;
    }

    if (name.length < 2) { 
      setFormError('Please provide your complete name so we can properly identify you.'); 
      return; 
    }
    if (!/^[a-zA-Z]+(?:[\s.][a-zA-Z]+)*\.?$/.test(name)) {
      setFormError('For clarity, please use only letters and spaces in your name.'); 
      return;
    }
    if (checkAbusiveLanguage(name)) {
      setFormError('Kindly use an appropriate and professional name.'); 
      setShowAbuseModal(true);
      return;
    }

    const domain = mail.split('@')[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.has(domain)) {
      const next = invalidDomains + 1;
      setInvalidDomains(next);
      if (next >= MAX_STRIKES) blockUser();
      setFormError(next >= MAX_STRIKES
        ? 'Too many invalid attempts. For your security, access is temporarily paused.'
        : 'We do not recognize this email provider. Please use a standard email like Gmail or Outlook.');
      return;
    }

    setFormLoading(true);

    // AI Check for smart bypasses
    const isAbusive = await checkNameWithAPI(name);
    if (isAbusive) {
      setFormLoading(false);
      return;
    }
    
    // Artificial delay removed to satisfy high-velocity registration requirements
    setFormLoading(false);
    setShowAgreement(true);
  };


  /* ── STEP 2: PoW + Register ──────────────────────────────────────── */
  const requestOTP = async (agreedAt: string) => {
    setAgreementTs(agreedAt);
    setShowAgreement(false);

    // Device-level guard
    if (!checkDeviceLimit()) {
      setFormError('Maximum registration attempts reached on this device.');
      return;
    }

    setStage('pow');
    setFormError('');
    setPowStep('Initialising security proof…');

    try {
      // 1. Get challenge
      const challengeRes = await fetch('/api/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (challengeRes.status !== 401) {
        const errData = await challengeRes.json().catch(() => ({}));
        setFormError(errData.error || 'Failed to initialize verification.');
        setStage('form');
        return;
      }
      const { challenge, difficulty } = await challengeRes.json();

      // 2. Solve PoW (with visible progress)
      setPowStep('Solving cryptographic proof…');
      let nonce = 0;
      const target = '0'.repeat(difficulty);
      while (true) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(challenge + nonce));
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
        if (hex.startsWith(target)) break;
        nonce++;
        // Increased batch size for high-velocity computation
        if (nonce % 8000 === 0) await new Promise(r => setTimeout(r, 0));
      }

      // 3. Register directly
      setPowStep('Completing registration…');
      const ts  = Date.now().toString();
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ts + 'vrl-strict-auth-2025'));
      const token = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');

      const res = await fetch('/api/preregister', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(), email: email.trim(),
          agreement_accepted: true,
          agreement_timestamp: agreedAt,
          website: honeypotRef.current?.value ?? '',
          gender, __v_ts: ts, __v_token: token,
        }),
      });

      const data = await res.json();

      // IP registration cap hit — show premium modal
      if (data.error === 'IP_REGISTRATION_LIMIT') {
        setStage('form');
        setFormLoading(false);
        setShowIpModal(true);
        return;
      }

      if (res.ok) {
        setStage('success');
      } else {
        setFormError(data.error || 'Failed to complete registration.');
        setStage('form');
      }
    } catch {
      setFormError('Network error. Please try again.');
      setStage('form');
    }
  };

  /* ── Device-level rate limit (max 2 per device via localStorage) ── */
  const DEVICE_LIMIT = 4;
  const DEVICE_KEY   = 'vrl_device_attempts';
  const checkDeviceLimit = (): boolean => {
    try {
      const raw  = localStorage.getItem(DEVICE_KEY);
      const count = raw ? parseInt(raw, 10) : 0;
      if (count >= DEVICE_LIMIT) return false;
      localStorage.setItem(DEVICE_KEY, (count + 1).toString());
      return true;
    } catch { return true; }
  };

  /* ── IP Registration Limit Modal ────────────────────────────────── */
  if (showIpModal) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 0',
      minHeight: '360px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          background: 'rgba(8,8,8,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2L4 5.5V10.5C4 14.5 7 18.1 11 19C15 18.1 18 14.5 18 10.5V5.5L11 2Z"
              stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M11 9v4M11 14.5v.5" stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>

        <h3 style={{
          fontSize: '18px', fontWeight: 700, color: '#fff',
          marginBottom: '12px', letterSpacing: '-0.02em',
        }}>
          Access limit reached
        </h3>

        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.7, marginBottom: '10px', maxWidth: '320px', margin: '0 auto 10px',
        }}>
          This network has reached the maximum number of registrations we allow per connection.
        </p>
        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.28)',
          lineHeight: 1.65, maxWidth: '300px', margin: '0 auto 32px',
        }}>
          This helps us keep Verlyn free of duplicate accounts and ensures every seat goes to a real person. If you believe this is a mistake, reach out to{' '}
          This helps us keep Verlyn free of duplicate accounts and ensures every seat goes to a real person. If you believe this is a mistake, reach out to{' '}
          <span style={{ color: 'rgba(99,102,241,0.8)' }}>support@verlyn.in</span>
        </p>

        {/* Hairline */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '24px' }} />

        <button
          onClick={() => setShowIpModal(false)}
          style={{
            width: '100%', padding: '13px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px', color: 'rgba(255,255,255,0.6)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget).style.background = 'rgba(255,255,255,0.07)';
            (e.currentTarget).style.color = 'rgba(255,255,255,0.85)';
          }}
          onMouseLeave={e => {
            (e.currentTarget).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget).style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          Understood
        </button>
      </motion.div>
    </div>
  );

  if (showAbuseModal) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 0', minHeight: '360px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          width: '100%', background: 'rgba(8,8,8,0.6)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '40px 32px', textAlign: 'center',
        }}
      >
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', background: 'rgba(239,68,68,0.06)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2L4 5.5V10.5C4 14.5 7 18.1 11 19C15 18.1 18 14.5 18 10.5V5.5L11 2Z" stroke="rgba(239,68,68,0.6)" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M7 7l8 8M15 7l-8 8" stroke="rgba(239,68,68,0.6)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Professional Conduct Required</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: '24px' }}>
          Verlyn maintains a strict policy against profanity and abusive language to ensure a respectful environment for all users. Please use your real, appropriate name to proceed.
        </p>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '24px' }} />
        <button onClick={() => setShowAbuseModal(false)}
          style={{
            width: '100%', padding: '13px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
          }}>
          I Understand
        </button>
      </motion.div>
    </div>
  );

  if (isBlocked) return (
    <div style={{ padding: '36px 24px', textAlign: 'center' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        background: 'rgba(239,68,68,0.06)',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5"/>
          <path d="M7 7l6 6M13 7l-6 6" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 style={{ color: 'rgba(239,68,68,0.85)', fontSize: '16px', fontWeight: 600, marginBottom: '10px', letterSpacing: '-0.01em' }}>Access Restricted</h3>
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', lineHeight: 1.65 }}>
        Blocked for 1 hour due to repeated invalid attempts. If this is an error, contact <span style={{color:'rgba(129,140,248,0.7)'}}>support@verlyn.in</span>
      </p>
    </div>
  );

  /* ── Shared styles ───────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 15px',
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', color: '#f2f2f2', fontSize: '14px',
    fontFamily: 'var(--font-sans, Inter, sans-serif)',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    marginBottom: '14px',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '10px', fontWeight: 600,
    color: 'rgba(255,255,255,0.38)', marginBottom: '7px',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  };
  const glassForm: React.CSSProperties = {
    width: '100%',
    position: 'relative', overflow: 'hidden',
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <AgreementModal open={showAgreement} onAccept={ts => requestOTP(ts)} onClose={() => setShowAgreement(false)} />

      <AnimatePresence mode="wait">

        {/* SUCCESS */}
        {stage === 'success' && (
          <motion.div key="success"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}
            style={{ width: '100%' }}
          >
            {/* Checkmark */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.1), transparent 70%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 32px rgba(255,255,255,0.1)',
                }}
              >
                {/* SVG checkmark */}
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <motion.path
                    d="M5 11.5L9 15.5L17 7"
                    stroke="#fff" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '6px', letterSpacing: '-0.025em' }}
              >
                Welcome, {fullName.trim().split(' ')[0]}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{ fontSize: '13px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: '280px', margin: '0 auto 10px' }}
              >
                You're in. When the gates open, you'll be among the first to walk through.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {/* Pulsing dot */}
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#fff', display: 'inline-block',
                  animation: 'vrlPulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Access Secured
                </span>
              </motion.div>
            </div>

            {/* Hairline */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 0 20px' }} />

            {/* What's inside — 2 focused cards */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
              style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}
            >
              Built for people who care about privacy
            </motion.p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="7" width="10" height="8" rx="1" stroke="rgba(168,85,247,0.8)" strokeWidth="1.2"/>
                      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="rgba(168,85,247,0.8)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  ),
                  title: 'Your data belongs to you',
                  sub: 'Built on zero-knowledge architecture. Even we cannot see what you share.',
                },
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3 2v-2H3a1 1 0 0 1-1-1V4Z" stroke="rgba(168,85,247,0.8)" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                  ),
                  title: 'Conversations that disappear by design',
                  sub: 'End-to-end encrypted messaging. Nothing is stored. Nothing lingers.',
                },
              ].map((feat, i) => (
                <motion.div key={feat.title}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px 18px',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0, opacity: 0.9 }}>{feat.icon}</div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '3px', letterSpacing: '-0.01em' }}>{feat.title}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, fontWeight: 400 }}>{feat.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}


        {/* POW PROGRESS */}
        {stage === 'pow' && (
          <motion.div key="pow"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '48px 24px' }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '2px solid rgba(168,85,247,0.15)',
              borderTopColor: '#a855f7',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px',
            }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
              {powStep}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>
              This takes a few seconds to prevent spam
            </p>
          </motion.div>
        )}



        {/* FORM */}
        {stage === 'form' && (
          <motion.form key="form" onSubmit={handleFormSubmit}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={glassForm} noValidate
          >
            <div style={{
              position:'absolute', top:0, left:'15%', width:'70%', height:'60%',
              background:'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, transparent 70%)',
              pointerEvents:'none', zIndex:0,
            }} />

            {/* Honeypot */}
            <input ref={honeypotRef} id={honeypotId} name="website" type="text"
              tabIndex={-1} autoComplete="off"
              style={{ position:'absolute', opacity:0, pointerEvents:'none', height:0 }} />

            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ marginBottom: '4px' }}>
                <label style={lbl}>Full Name</label>
                <input type="text" value={fullName}
                  onChange={e => handleNameChange(e.target.value)}
                  onBlur={() => checkNameWithAPI(fullName)}
                  placeholder="Your name" required style={inp} />
              </div>


              <div style={{ marginBottom: '24px' }}>
                <label style={lbl}>Email Address</label>
                <input type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setFormError(''); }}
                  placeholder="you@domain.com" required style={inp} />
              </div>

              <button type="submit" disabled={formLoading} style={{
                width:'100%', padding: '17px', borderRadius: '13px',
                background: formLoading ? 'rgba(255,255,255,0.2)' : '#fff',
                color: '#000', fontWeight: 800, fontSize: '15px', border: 'none',
                cursor: formLoading ? 'wait' : 'pointer',
                boxShadow: '0 10px 40px rgba(255,255,255,0.15)',
                transition: 'all 0.3s ease',
              }}>
                {formLoading ? 'Processing…' : 'Pre-Register Now'}
              </button>

              <AnimatePresence>
                {formError && (
                  <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                    style={{
                      marginTop:'16px', padding:'12px 16px',
                      background:'rgba(239,68,68,0.08)',
                      border:'1px solid rgba(239,68,68,0.25)',
                      borderRadius:'10px', fontSize:'13px', color:'#fca5a5',
                      textAlign:'center', fontWeight:500, lineHeight:1.5,
                    }}>
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        )}

      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes vrlPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
          50% { opacity: 0.6; box-shadow: 0 0 0 5px rgba(255,255,255,0); }
        }
      `}</style>
    </>
  );
}
