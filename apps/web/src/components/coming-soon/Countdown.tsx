'use client';

import { useEffect, useState } from 'react';

const LAUNCH_DATE = new Date('2026-09-01T00:00:00Z');

function getTimeLeft() {
  const diff = Math.max(0, LAUNCH_DATE.getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function Seg({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, '0');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
      <div style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(24px, 3.2vw, 34px)',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: '#fff',
        lineHeight: 1,
        minWidth: '2.1ch',
        textAlign: 'center',
        fontFamily: 'var(--font-mono, monospace)',
        textShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}>
        {v}
      </div>
      <div style={{
        fontSize: '9px',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)',
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );
}

export default function Countdown() {
  const [t, setT]         = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setT(getTimeLeft());
    const id = setInterval(() => setT(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const sep = (
    <span style={{
      color: 'rgba(255,255,255,0.1)',
      fontSize: '22px',
      lineHeight: 1,
      paddingBottom: '18px',
      fontWeight: 300,
    }}>:</span>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '18px',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.35s ease',
    }}>
      <Seg value={t.days}    label="Days"  />
      {sep}
      <Seg value={t.hours}   label="Hours" />
      {sep}
      <Seg value={t.minutes} label="Min"   />
      {sep}
      <Seg value={t.seconds} label="Sec"   />
    </div>
  );
}
