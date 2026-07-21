'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Timed narrative scripts for the simulated 75-second cinematic explainer
const FILM_TIMELINE = [
  {
    start: 0, end: 12,
    scene: 'exhaustion',
    subtitle: 'The modern internet is loud. Every platform we use has mutated into an engagement trap designed to harvest our networks, log our connections, and monetize our attention.',
  },
  {
    start: 12, end: 28,
    scene: 'profile',
    subtitle: 'We asked: What if digital space belonged to us? Meet the Verlyn Profile. Clean, completely private, and focused on sovereignty. No follower metrics, no public vanity. Just you and your key.',
  },
  {
    start: 28, end: 44,
    scene: 'messaging',
    subtitle: 'Inside messaging, your payloads are encrypted locally using industrial-grade key pairs. Messages glide through relays instantly and unlock only on the destination hardware.',
  },
  {
    start: 44, end: 60,
    scene: 'communities',
    subtitle: 'We have replaced algorithm-driven feeds with quiet, chronological spaces. No sponsored ads, no recommendation engine nudges. A calm chronological stream that respects your time.',
  },
  {
    start: 60, end: 75,
    scene: 'security',
    subtitle: 'Absolute digital ownership means you hold the lock and the key. Deleting a connection deletes it permanently at node levels. That is privacy by architecture—not just promises.',
  },
];

export default function CinematicExplainer() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((t) => {
          const next = t + 0.5;
          if (next >= 75) {
            setIsPlaying(false);
            return 0;
          }
          // Sync active tab to current film scene
          const activeScene = FILM_TIMELINE.find(item => next >= item.start && next < item.end)?.scene;
          if (activeScene && activeScene !== 'exhaustion') {
            setActiveTab(activeScene);
          }
          return next;
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const currentTimelineItem = FILM_TIMELINE.find(
    (item) => currentTime >= item.start && currentTime < item.end
  ) || FILM_TIMELINE[0];

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying && currentTime === 0) {
      setActiveTab('profile');
    }
  };

  const handleTabClick = (tab: string) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveTab(tab);
  };

  return (
    <div style={{
      width: '100%',
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '24px',
      padding: 'clamp(20px, 4vw, 40px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Narrative tabs */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto',
        paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        marginBottom: '24px', scrollbarWidth: 'none'
      }}>
        {[
          { id: 'profile', label: '01 · Profile' },
          { id: 'messaging', label: '02 · Messaging' },
          { id: 'communities', label: '03 · Communities' },
          { id: 'security', label: '04 · Security & Revocation' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabClick(t.id)}
            style={{
              padding: '10px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
              background: activeTab === t.id && !isPlaying ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: `1px solid ${activeTab === t.id && !isPlaying ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
              color: activeTab === t.id && !isPlaying ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', paddingLeft: '16px' }}>
          <button
            onClick={handlePlayToggle}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 800,
              background: isPlaying ? 'rgba(99,102,241,0.15)' : '#fff',
              border: isPlaying ? '1px solid rgba(99,102,241,0.3)' : 'none',
              color: isPlaying ? '#a5b4fc' : '#000',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {isPlaying ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a5b4fc', animation: 'vrlPulse 1.5s infinite' }} />
                Playing Explainer ({Math.round(currentTime)}s)
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play Product Film
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screen Frame Mockup */}
      <div style={{
        width: '100%', height: '420px', background: '#050505',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
        position: 'relative', overflow: 'hidden', display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Device Header Bar */}
        <div style={{
          height: '40px', background: '#080808', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {isPlaying ? `explainer_film_active.sh` : `verlyn_client_v1.0.0`}
          </span>
          <span style={{ width: '20px' }} />
        </div>

        {/* Dynamic Display Inner Body */}
        <div style={{ flex: 1, padding: 'clamp(16px, 4vw, 32px)', position: 'relative', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            
            {/* FILM EXHAUSTION SCENE */}
            {isPlaying && currentTimelineItem.scene === 'exhaustion' && (
              <motion.div key="exhaustion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
              >
                <div style={{ position: 'relative', opacity: 0.15, filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none', transform: 'scale(0.95)' }}>
                  {/* Mock scrolling noise stack */}
                  <div style={{ padding: '16px', background: '#111', borderRadius: '8px', marginBottom: '10px', width: '280px' }}>SPONSORED: Buy now! 20% off</div>
                  <div style={{ padding: '16px', background: '#111', borderRadius: '8px', marginBottom: '10px', width: '280px' }}>Recommended for you by algorithm</div>
                </div>
                <div style={{ position: 'absolute', zIndex: 5, maxWidth: '340px' }}>
                  <h4 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>ACT 01: The Internet Today</h4>
                  <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Digital exhaustion. Endless algorithms. Tracking and profiling. The standard ad-driven social experience.</p>
                </div>
              </motion.div>
            )}

            {/* PROFILE WALKTHROUGH */}
            {activeTab === 'profile' && (!isPlaying || currentTimelineItem.scene === 'profile') && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ maxWidth: '360px', margin: '0 auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>@subhankar</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', margin: 0 }}>key_fingerprint: vrl_9f2d5e...7a</p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Connections</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>18 verified</span>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Security Status</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>E2E Locked</span>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  No follower counts, no algorithm feeds, no behavioral tracking metrics. Just your personal secure communication node.
                </p>
              </motion.div>
            )}

            {/* MESSAGING WALKTHROUGH */}
            {activeTab === 'messaging' && (!isPlaying || currentTimelineItem.scene === 'messaging') && (
              <motion.div key="messaging" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ maxWidth: '420px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                {/* Chat Head */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>@shinichiro (Private Thread)</span>
                </div>

                {/* Message Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                  <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '14px 14px 14px 0', maxWidth: '80%' }}>
                    <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px' }}>Are the keys completely isolated?</p>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>Decrypted locally · 10:42 AM</span>
                  </div>
                  
                  <div style={{ alignSelf: 'flex-end', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '12px 16px', borderRadius: '14px 14px 0 14px', maxWidth: '80%' }}>
                    <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>Yes, absolute client-side key storage only. Relays only route metadata-less blobs.</p>
                    <span style={{ fontSize: '9px', color: '#a5b4fc', fontFamily: 'monospace' }}>✓ Sent & Encrypted · 10:43 AM</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* COMMUNITIES WALKTHROUGH */}
            {activeTab === 'communities' && (!isPlaying || currentTimelineItem.scene === 'communities') && (
              <motion.div key="communities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ maxWidth: '440px', margin: '0 auto' }}
              >
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13px', color: '#fff', fontWeight: 700, margin: 0 }}>#systems-engineering (Chronological Stream)</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { author: '@subhankar', text: 'Just finalized the local Proof of Work throttle. Capped hashing at 8,000 iterations to preserve browser CPU integrity on mobile devices.', time: '2 hours ago' },
                    { author: '@security_auditor', text: 'Reviewed the network routing maps. Excellent key isolation. No telemetry payloads leaking to third-party endpoints.', time: '4 hours ago' }
                  ].map((post, index) => (
                    <div key={index} style={{ padding: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff' }}>{post.author}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{post.time}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{post.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SECURITY & REVOCATION WALKTHROUGH */}
            {activeTab === 'security' && (!isPlaying || currentTimelineItem.scene === 'security') && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center', padding: '24px 0' }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', background: 'rgba(239,68,68,0.06)'
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>Sovereign Revocation</h3>
                <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>
                  If you delete your keys or revoke a connection, the mathematical authority is wiped from all global nodes instantly. Decryption becomes structurally impossible.
                </p>
                
                <button style={{
                  padding: '12px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px', color: '#fca5a5', fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em',
                  textTransform: 'uppercase', cursor: 'not-allowed'
                }}>
                  Wipe & Revoke Identity Keys
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Narrative Film Subtitles & Controls (Simulated Video Explainer Player) */}
        {isPlaying && (
          <div style={{
            background: 'rgba(5,5,5,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '20px 24px', position: 'relative', zIndex: 20
          }}>
            {/* Synced Narration */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1', marginTop: '6px', flexShrink: 0, animation: 'vrlPulse 1.5s infinite' }} />
              <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0, fontStyle: 'italic', fontWeight: 400 }}>
                &ldquo;{currentTimelineItem.subtitle}&rdquo;
              </p>
            </div>
            
            {/* Synced Timeline Progress Scrubber */}
            <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.05)', marginTop: '20px', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#6366f1', width: `${(currentTime / 75) * 100}%` }} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
