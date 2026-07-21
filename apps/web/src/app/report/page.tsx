'use client';

/**
 * VERLYN — Support & Incident Reporting Center
 * Route: /report
 * 
 * Standalone page for filing support tickets, looking up existing cases,
 * and communicating securely with agents.
 */

import React from 'react';
import SupportCenter from '@/components/coming-soon/SupportCenter';
import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/coming-soon/NetworkGraph'), { ssr: false });

export default function ReportPage() {
  const handleClose = () => {
    window.location.href = '/';
  };

  return (
    <main style={{
      background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',
      height: '100dvh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* ── BACKGROUND 3D NETWORK GRAPH ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NetworkGraph />
      </div>
      
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Background ambient animation or styling can be placed here if needed */}
      <SupportCenter onClose={handleClose} />
      </div>
    </main>
  );
}
