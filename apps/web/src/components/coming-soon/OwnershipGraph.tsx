'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────
   JOURNEY STEPS — plain language, one idea each
───────────────────────────────────────────────────────────────────── */
const JOURNEY = [
  {
    step: 1,
    icon: '💬',
    title: 'You type a message.',
    caption: 'It sits on your phone.',
    body: 'Nothing has been sent yet. Your message exists only in your phone\'s memory — private, unread, and untouched by any server.',
    cta: 'Watch it get locked →',
    accent: '#6366f1',
    visual: 'compose',
  },
  {
    step: 2,
    icon: '🔒',
    title: 'Your phone locks it.',
    caption: 'Before it goes anywhere.',
    body: 'A unique encryption key is created on your device. Your message is sealed inside it — like a letter in a locked box. Only the right key can open it. Verlyn never has that key.',
    cta: 'See it travel →',
    accent: '#8b5cf6',
    visual: 'lock',
  },
  {
    step: 3,
    icon: '📡',
    title: 'The locked message travels.',
    caption: 'We route it. We cannot read it.',
    body: 'The sealed, scrambled message passes through Verlyn\'s servers. We see only a locked box — the same as everyone else. There is nothing to read, nothing to steal, nothing to hand over.',
    cta: 'See who receives it →',
    accent: '#a78bfa',
    visual: 'transit',
  },
  {
    step: 4,
    icon: '📱',
    title: 'Their phone unlocks it.',
    caption: 'Only they have the key.',
    body: 'The recipient\'s device holds the only key that fits. The message decrypts privately on their phone. No server, no company, no third party ever sees it in readable form.',
    cta: 'See the full picture →',
    accent: '#10b981',
    visual: 'unlock',
  },
  {
    step: 5,
    icon: '✅',
    title: 'Private, start to finish.',
    caption: 'This is what end-to-end means.',
    body: 'From the moment you typed to the moment they read it — your message was only ever readable on two devices. Not our servers. Not any government. Not any advertiser. Just you and them.',
    cta: '↺  Start over',
    accent: '#10b981',
    visual: 'complete',
  },
];

/* ─────────────────────────────────────────────────────────────────────
   VISUAL per step
───────────────────────────────────────────────────────────────────── */
function StepVisual({ visual, accent }: { visual: string; accent: string }) {
  const phone = (content: React.ReactNode, borderColor = 'rgba(255,255,255,0.1)', glow = false) => (
    <div style={{
      width: '140px',
      background: 'rgba(10,10,10,0.8)',
      border: `1px solid ${borderColor}`,
      borderRadius: '22px',
      padding: '14px 12px 18px',
      boxShadow: glow ? `0 0 40px ${accent}25` : 'none',
      transition: 'all 0.5s',
    }}>
      <div style={{
        width: '36px', height: '5px', borderRadius: '3px',
        background: 'rgba(255,255,255,0.07)', margin: '0 auto 14px',
      }} />
      {content}
    </div>
  );

  const bubble = (text: string, color: string, align: 'left' | 'right' = 'left') => (
    <div style={{
      background: color,
      borderRadius: align === 'left' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
      padding: '8px 11px',
      fontSize: '11px', color: '#fff', lineHeight: 1.4,
      maxWidth: '100%',
      alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
    }}>
      {text}
    </div>
  );

  if (visual === 'compose') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {phone(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bubble('Hey, meet me at 8 PM 👋', 'rgba(99,102,241,0.35)')}
            <div style={{
              marginTop: '6px', display: 'flex', alignItems: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '7px 10px', gap: '6px',
            }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flex: 1 }}>Type a message…</span>
              <span style={{ fontSize: '13px' }}>⌨️</span>
            </div>
          </div>,
          'rgba(255,255,255,0.1)'
        )}
        <div style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px', padding: '5px 12px',
        }}>
          📍 Only on your device right now
        </div>
      </div>
    );
  }

  if (visual === 'lock') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {phone(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              background: `${accent}18`, border: `1px solid ${accent}40`,
              borderRadius: '10px', padding: '10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: '24px' }}
              >
                🔒
              </motion.div>
              <span style={{ fontSize: '9px', color: accent, fontWeight: 700, letterSpacing: '0.08em' }}>
                ENCRYPTED
              </span>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>
              Sealed before sending
            </p>
          </div>,
          `${accent}40`, true
        )}
        <div style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.35)',
          background: `${accent}10`, border: `1px solid ${accent}25`,
          borderRadius: '20px', padding: '5px 12px',
        }}>
          🔑 Key exists only on your phone
        </div>
      </div>
    );
  }

  if (visual === 'transit') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sender phone */}
          <div style={{
            width: '52px', height: '80px',
            background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>📱</div>

          {/* Traveling packet */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
            <motion.div
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: `${accent}20`, border: `1px solid ${accent}40`,
                borderRadius: '8px', padding: '5px 10px',
                fontSize: '12px',
              }}
            >
              🔒
            </motion.div>
            <div style={{
              height: '1px', width: '100%',
              background: `linear-gradient(90deg, ${accent}60, ${accent}20)`,
            }} />
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              Verlyn server
            </span>
          </div>

          {/* Server */}
          <div style={{
            width: '52px', height: '80px',
            background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🖥️</div>
        </div>

        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: '10px', padding: '8px 14px',
          fontSize: '11px', color: 'rgba(239,68,68,0.7)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          🚫 Server sees: scrambled data only
        </div>
      </div>
    );
  }

  if (visual === 'unlock') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {phone(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bubble('Hey, meet me at 8 PM 👋', 'rgba(16,185,129,0.25)', 'left')}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              justifyContent: 'flex-end', opacity: 0.6,
            }}>
              <span style={{ fontSize: '9px', color: '#10b981' }}>✓✓ Delivered privately</span>
            </div>
          </div>,
          'rgba(16,185,129,0.3)', true
        )}
        <div style={{
          fontSize: '11px', color: '#10b981',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '20px', padding: '5px 12px',
        }}>
          🔓 Only their key could open this
        </div>
      </div>
    );
  }

  // complete
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
        {/* Sender */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '54px', height: '88px',
            background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', boxShadow: '0 0 20px rgba(16,185,129,0.12)',
          }}>📱</div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>You</span>
        </div>

        {/* Connection line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '2px', width: '60px',
            background: `linear-gradient(90deg, #6366f1, #10b981)`,
            borderRadius: '2px', marginBottom: '22px',
            transformOrigin: 'left',
          }}
        />

        {/* Recipient */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '54px', height: '88px',
            background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', boxShadow: '0 0 20px rgba(16,185,129,0.12)',
          }}>📱</div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Them</span>
        </div>
      </div>

      <div style={{
        fontSize: '11px', color: '#10b981',
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '20px', padding: '5px 14px',
        fontWeight: 600,
      }}>
        ✓ End-to-end encrypted — zero intermediaries
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────── */
export default function OwnershipGraph() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const current = JOURNEY[step];

  const go = (next: number) => {
    if (next < 0 || next >= JOURNEY.length) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
  };

  return (
    <div style={{ width: '100%' }}>

      {/* ── Section Header ── */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{
          fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)', fontWeight: 600, marginBottom: '12px',
        }}>Privacy, explained</p>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 700,
          color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1,
          margin: '0 0 12px',
        }}>
          Can Verlyn read your messages?
        </h2>
        <p style={{
          fontSize: '15px', color: 'rgba(255,255,255,0.42)',
          lineHeight: 1.7, maxWidth: '480px', margin: 0,
        }}>
          No. Here's exactly why — in five plain steps.
        </p>
      </div>

      {/* ── Journey Card ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '28px',
      }}>
        {/* Progress bar header */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>{current.icon}</span>
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: current.accent, letterSpacing: '0.04em',
            }}>
              Step {current.step} of {JOURNEY.length}
            </span>
          </div>
          {/* Non-interactive progress dots */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {JOURNEY.map((j, i) => (
              <div key={i} style={{
                height: '4px',
                width: i === step ? '22px' : '6px',
                borderRadius: '2px',
                background: i < step
                  ? 'rgba(255,255,255,0.25)'
                  : i === step
                  ? current.accent
                  : 'rgba(255,255,255,0.08)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Slide content */}
        <div style={{ overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{
                padding: 'clamp(28px, 5vw, 52px) clamp(20px, 4vw, 40px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '32px',
                textAlign: 'center',
              }}>
                {/* Visual */}
                <StepVisual visual={current.visual} accent={current.accent} />

                {/* Text */}
                <div style={{ maxWidth: '420px' }}>
                  <h3 style={{
                    fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700,
                    color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.15,
                    margin: '0 0 6px',
                  }}>
                    {current.title}
                  </h3>
                  <p style={{
                    fontSize: '13px', fontWeight: 600, color: current.accent,
                    marginBottom: '14px', letterSpacing: '0.01em',
                  }}>
                    {current.caption}
                  </p>
                  <p style={{
                    fontSize: '14.5px', color: 'rgba(255,255,255,0.52)',
                    lineHeight: 1.75, margin: 0,
                  }}>
                    {current.body}
                  </p>
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {step > 0 && (
                    <button
                      onClick={() => go(step - 1)}
                      style={{
                        padding: '11px 20px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px', color: 'rgba(255,255,255,0.5)',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={() => step < JOURNEY.length - 1 ? go(step + 1) : go(0)}
                    style={{
                      padding: '12px 28px',
                      background: step < JOURNEY.length - 1 ? '#fff' : 'rgba(255,255,255,0.06)',
                      color: step < JOURNEY.length - 1 ? '#000' : '#fff',
                      border: step < JOURNEY.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer', transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {current.cta}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Trust Layer ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {/* Cannot access */}
        <div style={{
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>🔒</div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#10b981', letterSpacing: '0.04em' }}>
                WHAT VERLYN CANNOT ACCESS
              </p>
            </div>
          </div>
          {[
            'Your private messages',
            'Your private photos',
            'Your encrypted calls',
            'Your personal conversations',
            'Community DMs',
            'Files you share privately',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 0',
              borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#10b981', flexShrink: 0,
              }}>✓</span>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.65)' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Can access */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>📋</div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                WHAT VERLYN CAN ACCESS
              </p>
            </div>
          </div>
          {[
            'Your account email address',
            'Device security logs',
            'Abuse reports you file',
            'Account recovery requests',
            'Platform health information',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: 'rgba(255,255,255,0.4)', flexShrink: 0,
              }}>✓</span>
              <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>{item}</span>
            </div>
          ))}
          <p style={{
            marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.3)',
            lineHeight: 1.55, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px',
          }}>
            We're transparent about this because honesty builds real trust.
          </p>
        </div>
      </div>

      {/* ── Comparison ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{
            margin: 0, fontSize: '12px', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            How Verlyn compares
          </p>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
        }}>
          {/* Traditional */}
          <div style={{
            padding: '24px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{
              margin: '0 0 16px', fontSize: '12px', fontWeight: 700,
              color: 'rgba(239,68,68,0.7)', letterSpacing: '0.04em',
            }}>
              Traditional platforms
            </p>
            {[
              'Track everything you do',
              'Build a profile to sell ads',
              'Own your data legally',
              'Algorithmic feed control',
              'Profit from your attention',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '7px 0',
                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span style={{ color: 'rgba(239,68,68,0.6)', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✕</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Verlyn */}
          <div style={{ padding: '24px' }}>
            <p style={{
              margin: '0 0 16px', fontSize: '12px', fontWeight: 700,
              color: '#6366f1', letterSpacing: '0.04em',
            }}>
              Verlyn
            </p>
            {[
              'No behavioral tracking',
              'No advertising business model',
              'You control your data',
              'No algorithmic manipulation',
              'Privacy is the product',
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '7px 0',
                borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <span style={{ color: '#10b981', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
