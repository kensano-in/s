'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────
   Each step = one clear idea, one visual, one sentence.
───────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    accent: '#6366f1',
    label: 'Step 1 of 3  ·  On your phone',
    title: 'You type a message.',
    subtitle: 'It never leaves your phone unprotected.',
    explain: 'Before anything goes anywhere, your phone locks the message with a unique key that only you have. Think of it like sealing a letter in an envelope — except the envelope is mathematically unbreakable.',
    cta: 'Watch it get locked →',
  },
  {
    accent: '#8b5cf6',
    label: 'Step 2 of 3  ·  On the internet',
    title: 'It travels as scrambled noise.',
    subtitle: 'Even we can\'t read it.',
    explain: 'What travels across the internet isn\'t your message — it\'s a completely scrambled version of it. Hackers, your internet provider, even Verlyn\'s own servers see nothing but random characters. There\'s no key to steal because we never had one.',
    cta: 'See it arrive →',
  },
  {
    accent: '#10b981',
    label: 'Step 3 of 3  ·  On their phone',
    title: 'Only they can open it.',
    subtitle: 'No one else. Not even us.',
    explain: 'The person you sent it to has the only key that can unlock your message. It opens on their phone, privately. No server reads it. No company stores it. The conversation is yours — completely, mathematically, permanently.',
    cta: '↺  Send another message',
  },
];

/* ─── Visual illustration per step ─────────────────────────────────── */
function Visual({ step, message }: { step: number; message: string }) {
  const cipher = message
    .split('')
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);

  if (step === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        {/* Phone + message bubble */}
        <div style={{
          width: '180px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '22px',
          padding: '16px',
          position: 'relative',
        }}>
          {/* Screen notch */}
          <div style={{
            width: '40px', height: '6px', borderRadius: '3px',
            background: 'rgba(255,255,255,0.08)', margin: '0 auto 14px',
          }} />
          {/* Message bubble */}
          <div style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '14px 14px 4px 14px',
            padding: '10px 14px',
          }}>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0, lineHeight: 1.45 }}>
              {message}
            </p>
          </div>
          {/* Lock badge */}
          <div style={{
            marginTop: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '12px' }}>🔒</span>
            <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 600 }}>Locked on this device</span>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          Only visible to you right now
        </p>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        {/* Cipher block */}
        <div style={{
          width: '220px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '16px',
          padding: '18px',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '9px', color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.1em' }}>ENCRYPTED</span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>traveling…</span>
          </div>
          <code style={{
            display: 'block', fontSize: '11px',
            color: 'rgba(167,139,250,0.7)', fontFamily: 'monospace',
            lineHeight: 1.7, wordBreak: 'break-all',
          }}>
            {cipher}…
          </code>
          <div style={{
            marginTop: '12px', padding: '8px 10px',
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: '8px',
            fontSize: '10px', color: 'rgba(239,68,68,0.7)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span>🚫</span> Anyone intercepting: sees nothing
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          Passing through servers right now
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      {/* Recipient phone */}
      <div style={{
        width: '180px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: '22px',
        padding: '16px',
        boxShadow: '0 0 30px rgba(16,185,129,0.08)',
      }}>
        <div style={{
          width: '40px', height: '6px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)', margin: '0 auto 14px',
        }} />
        {/* Unlocked message */}
        <div style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: '4px 14px 14px 14px',
          padding: '10px 14px',
        }}>
          <p style={{ fontSize: '13px', color: '#fff', margin: 0, lineHeight: 1.45 }}>
            {message}
          </p>
        </div>
        <div style={{
          marginTop: '12px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '12px' }}>✓</span>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Unlocked by recipient only</span>
        </div>
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
        Decrypted privately on their device
      </p>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function MessageJourney3D() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [message, setMessage] = useState('Hey, meet me at 6pm.');

  const s = STEPS[step];

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
  };

  return (
    <div style={{ width: '100%' }}>

      {/* Section label */}
      <div style={{ marginBottom: '36px' }}>
        <p style={{
          fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)', fontWeight: 600, marginBottom: '12px',
        }}>How it works</p>
        <h2 style={{
          fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700,
          color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1,
          margin: '0 0 10px',
        }}>
          Privacy that actually makes sense.
        </h2>
        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.38)',
          lineHeight: 1.7, maxWidth: '420px', margin: 0,
        }}>
          No tech knowledge needed. Here's what happens when you send a message on Verlyn — in plain English.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {/* Step label bar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 600,
            color: s.accent, letterSpacing: '0.04em',
          }}>
            {s.label}
          </span>
          {/* Non-interactive dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {STEPS.map((st, i) => (
              <div key={i} style={{
                width: i === step ? '20px' : '6px',
                height: '6px', borderRadius: '3px',
                background: i === step ? st.accent : i < step ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Slide area */}
        <div style={{ overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{
                padding: 'clamp(28px, 4vw, 48px) clamp(20px, 4vw, 40px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                textAlign: 'center',
              }}>

                {/* Visual */}
                <Visual step={step} message={message} />

                {/* Text */}
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{
                    fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700,
                    color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.15,
                    margin: '0 0 8px',
                  }}>
                    {s.title}
                  </h3>
                  <p style={{
                    fontSize: '14px', fontWeight: 600,
                    color: s.accent, marginBottom: '16px',
                  }}>
                    {s.subtitle}
                  </p>
                  <p style={{
                    fontSize: '14.5px', color: 'rgba(255,255,255,0.52)',
                    lineHeight: 1.75, margin: 0,
                  }}>
                    {s.explain}
                  </p>
                </div>

                {/* Message input on step 0 */}
                {step === 0 && (
                  <div style={{ width: '100%', maxWidth: '360px' }}>
                    <label style={{
                      display: 'block', fontSize: '10px',
                      color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
                      textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px',
                      textAlign: 'left',
                    }}>
                      Try your own message
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, 36) || 'Hey.')}
                      placeholder="Type a message…"
                      style={{
                        width: '100%', padding: '12px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', color: '#fff',
                        fontSize: '14px', outline: 'none',
                        boxSizing: 'border-box', fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = s.accent + '60')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', justifyContent: 'center' }}>
                  {step > 0 && (
                    <button
                      onClick={() => go(step - 1)}
                      style={{
                        padding: '12px 20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={() => step < 2 ? go(step + 1) : go(0)}
                    style={{
                      flex: 1, padding: '13px 24px',
                      background: step < 2 ? '#fff' : 'rgba(255,255,255,0.06)',
                      color: step < 2 ? '#000' : '#fff',
                      border: step < 2 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer', transition: 'opacity 0.2s',
                      maxWidth: step > 0 ? undefined : '260px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {s.cta}
                  </button>
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
