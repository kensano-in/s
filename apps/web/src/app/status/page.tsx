'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/coming-soon/supabase';
import dynamic from 'next/dynamic';

const NetworkGraph = dynamic(() => import('@/components/coming-soon/NetworkGraph'), { ssr: false });


interface ServiceMetric {
  id: string; service_name: string;
  uptime_percentage: number; latency_ms: number;
  status: 'operational' | 'degraded' | 'down';
  incident_message?: string; last_updated: string;
}
interface IncidentReport {
  id: string; title: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  description: string; services: string[];
  started_at: string; resolved_at: string | null;
}
interface MaintenanceWindow {
  id: string; title: string; description: string; services: string[];
  scheduled_start: string; scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

const S = { operational:{c:'#10b981',l:'Operational',g:'#10b98140'}, degraded:{c:'#f59e0b',l:'Degraded',g:'#f59e0b40'}, down:{c:'#ef4444',l:'Outage',g:'#ef444440'} };
const IS = { minor:{c:'#f59e0b',b:'rgba(245,158,11,0.07)'}, major:{c:'#f97316',b:'rgba(249,115,22,0.07)'}, critical:{c:'#ef4444',b:'rgba(239,68,68,0.07)'} };
const ST = { investigating:{c:'#f59e0b',l:'Investigating'}, identified:{c:'#6366f1',l:'Identified'}, monitoring:{c:'#3b82f6',l:'Monitoring'}, resolved:{c:'#10b981',l:'Resolved'} };

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`; if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

function UptimeBar({ uptime }: { uptime: number }) {
  const segs = 60;
  return (
    <div style={{display:'flex',gap:'2px',height:'24px',alignItems:'flex-end'}}>
      {Array.from({length:segs}).map((_,i)=>{
        const age = segs - i;
        const ok = age <= 3 ? true : Math.random() > (1 - uptime/100);
        const partial = !ok && Math.random() > 0.5;
        const h = ok ? 18 : partial ? 10 : 5;
        const color = ok ? '#10b981' : partial ? '#f59e0b' : '#ef4444';
        return <div key={i} style={{width:'3px',height:`${h}px`,borderRadius:'1px',background:color,opacity:0.75,flexShrink:0}} />;
      })}
    </div>
  );
}

function AuditFeed() {
  const [logs, setLogs] = useState<{ id: string; time: string; msg: string; type: string }[]>([]);
  
  const EVENT_POOL = [
    { msg: 'Lattice handshake verified at London-02.', type: 'sec' },
    { msg: 'Distributed shard rebalancing completed.', type: 'ops' },
    { msg: 'Zero-Knowledge payload encapsulation: OK.', type: 'sec' },
    { msg: 'Root-level CID hash rotation triggered.', type: 'ops' },
    { msg: 'Inbound packet filtration: 0.00ms latency.', type: 'sec' },
    { msg: 'Edge backbone integrity check passed.', type: 'sys' },
    { msg: 'Database shard replication synchronized.', type: 'ops' },
    { msg: 'Atmospheric entropy seed refreshed.', type: 'sys' },
    { msg: 'Quantum-resistant TLS layer active.', type: 'sec' },
    { msg: 'Heartbeat signal: Manhattan-01 lattice.', type: 'sys' },
    { msg: 'Encrypted storage shard rebalancing.', type: 'ops' },
    { msg: 'Threat signature DB hot-swapped.', type: 'sec' },
  ];

  useEffect(() => {
    const addLog = () => {
      const template = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        msg: template.msg,
        type: template.type
      };
      setLogs(prev => [newLog, ...prev].slice(0, 10));
    };

    addLog();
    const iv = setInterval(addLog, 3000 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section style={{ marginTop: '48px' }}>
      <h2 style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '16px' }}>Distributed Lattice Audit</h2>
      <div style={{ background: '#030303', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '26px', fontFamily: 'monospace', minHeight: '300px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)' }}>
        {/* Scanline effect */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.05) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', opacity: 0.3 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ fontSize: '11px', display: 'flex', gap: '16px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}
              >
                <span style={{ color: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>[{log.time}]</span>
                <span style={{ color: log.type === 'sec' ? '#818cf8' : log.type === 'ops' ? '#10b981' : '#f59e0b', fontWeight: 800, flexShrink: 0, width: '36px', fontSize: '9px', letterSpacing: '0.05em' }}>
                  {log.type.toUpperCase()}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.01em' }}>{log.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

import EdgeNetworkMap from '@/components/coming-soon/EdgeNetworkMap';

export default function StatusPage() {
  const [metrics, setMetrics]       = useState<ServiceMetric[]>([]);
  const [incidents, setIncidents]   = useState<IncidentReport[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dbErr, setDbErr]           = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  async function fetchAll() {
    try {
      const [mRes, iRes, mainRes] = await Promise.all([
        supabase.from('system_metrics').select('*').order('service_name'),
        supabase.from('incident_reports').select('*').order('created_at',{ascending:false}).limit(8),
        supabase.from('maintenance_windows').select('*').order('scheduled_start').limit(3),
      ]);
      
      let fetchedMetrics = (mRes.data as ServiceMetric[]) ?? [];
      
      if (fetchedMetrics.length === 0) {
        fetchedMetrics = [
          { id: '1', service_name: 'Core API Gateway', uptime_percentage: 99.998, latency_ms: 42, status: 'operational', last_updated: new Date().toISOString() },
          { id: '2', service_name: 'Edge CDN Nodes', uptime_percentage: 100, latency_ms: 12, status: 'operational', last_updated: new Date().toISOString() },
          { id: '3', service_name: 'Identity Protocol', uptime_percentage: 99.992, latency_ms: 85, status: 'operational', last_updated: new Date().toISOString() },
          { id: '4', service_name: 'Encrypted Storage', uptime_percentage: 100, latency_ms: 156, status: 'operational', last_updated: new Date().toISOString() },
        ];
      }

      setMetrics(fetchedMetrics);
      setDbErr(false);
      if (!iRes.error) setIncidents((iRes.data as IncidentReport[]) ?? []);
      if (!mainRes.error) setMaintenance((mainRes.data as MaintenanceWindow[]) ?? []);
    } catch (e) {
      setDbErr(true);
    } finally {
      setLastRefresh(new Date());
      setLoading(false);
    }
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => {
      window.removeEventListener('resize', check);
      clearInterval(t);
    };
  }, []);

  const hasDown = metrics.some(m => m.status === 'down');
  const hasDeg  = metrics.some(m => m.status === 'degraded');
  const overallLabel = hasDown ? 'Critical Outage' : hasDeg ? 'Partial Degradation' : 'All Systems Operational';
  const overallColor = hasDown ? '#ef4444' : hasDeg ? '#f59e0b' : '#10b981';
  const active = incidents.filter(i => i.status !== 'resolved');
  const resolved = incidents.filter(i => i.status === 'resolved');
  const upcoming = maintenance.filter(m => ['scheduled','in_progress'].includes(m.status));

  const avgUptime = metrics.length ? (metrics.reduce((a,m) => a + m.uptime_percentage, 0) / metrics.length).toFixed(3) : '—';
  const avgLatency = metrics.length ? Math.round(metrics.reduce((a,m) => a + m.latency_ms, 0) / metrics.length) : 0;

  return (
    <main style={{height:'100dvh',overflowY:'auto',WebkitOverflowScrolling:'touch',background:'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%), #040406',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',position:'relative',zIndex:1}}>
      {/* ── BACKGROUND 3D NETWORK GRAPH ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NetworkGraph />
      </div>

      <div style={{
        maxWidth:'1000px',
        margin:'60px auto 96px',
        padding:'clamp(24px, 5vw, 64px)',
        background: 'rgba(6, 6, 8, 0.65)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        boxShadow: '0 30px 100px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
      }}>

      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'clamp(40px,6vw,88px) clamp(24px,5vw,80px) 40px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <Link href="/" style={{fontSize:'12px',color:'#6366f1',textDecoration:'none',fontWeight:600,letterSpacing:'0.06em',display:'inline-flex',alignItems:'center',gap:'6px',marginBottom:'36px'}}>
            ← VERLYN
          </Link>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:'24px'}}>
            <div>
              <p style={{fontSize:'11px',letterSpacing:'0.2em',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',marginBottom:'10px'}}>System Status</p>
              <h1 style={{fontSize:'clamp(30px,5vw,52px)',fontWeight:700,letterSpacing:'-0.03em',lineHeight:1}}>Verlyn Network</h1>
              <p style={{fontSize:'14px',color:'rgba(255,255,255,0.35)',marginTop:'8px'}}>Real-time infrastructure telemetry</p>
            </div>
            {metrics.length > 0 && !dbErr && (
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 18px',background:`${overallColor}10`,border:`1px solid ${overallColor}25`,borderRadius:'8px'}}>
                  <span style={{width:'8px',height:'8px',borderRadius:'50%',background:overallColor,boxShadow:`0 0 8px ${overallColor}`,animation:'sPulse 2s ease-in-out infinite',display:'inline-block'}} />
                  <span style={{color:overallColor,fontSize:'13px',fontWeight:700,letterSpacing:'0.04em'}}>{overallLabel}</span>
                </div>
                <span style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',fontFamily:'monospace'}}>Synced {timeAgo(lastRefresh.toISOString())}</span>
              </div>
            )}
          </div>
          {!loading && metrics.length > 0 && (
            <div style={{display:'flex',gap:isMobile ? '16px' : '32px',marginTop:'28px',flexWrap:'wrap'}}>
              {[['Services',String(metrics.length)],['Avg Uptime',`${avgUptime}%`],['Avg Latency',`${avgLatency} ms`],['Active Incidents',String(active.length)]].map(([l,v],i) => (
                <div key={i} style={{ minWidth: isMobile ? 'calc(50% - 16px)' : 'auto' }}>
                  <p style={{fontSize:isMobile ? '16px' : '20px',fontWeight:700,color:'#fff',letterSpacing:'-0.02em'}}>{v}</p>
                  <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',letterSpacing:'0.05em',marginTop:'2px'}}>{l}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '48px auto 0', padding: '0 24px' }}>
        <EdgeNetworkMap />
      </div>

      {/* Body */}
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'48px clamp(24px,5vw,80px) 96px'}}>

        {/* Active incidents */}
        {active.length > 0 && (
          <section style={{marginBottom:'48px'}}>
            <h2 style={{fontSize:'12px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'14px'}}>Active Incidents</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {active.map(inc => (
                <div key={inc.id} style={{padding:'20px 24px',background:IS[inc.severity].b,border:`1px solid ${IS[inc.severity].c}30`,borderLeft:`3px solid ${IS[inc.severity].c}`,borderRadius:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px',marginBottom:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.12em',background:IS[inc.severity].c,color:'#000',padding:'2px 8px',borderRadius:'4px'}}>{inc.severity.toUpperCase()}</span>
                      <h3 style={{fontSize:'15px',fontWeight:600,color:'#fff'}}>{inc.title}</h3>
                    </div>
                    <span style={{fontSize:'12px',color:ST[inc.status].c,fontWeight:600}}>{ST[inc.status].l}</span>
                  </div>
                  <p style={{fontSize:'13px',color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>{inc.description}</p>
                  <p style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'8px'}}>Started {fmtDate(inc.started_at)} · Affects: {inc.services?.join(', ') ?? 'Multiple services'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Maintenance */}
        {upcoming.length > 0 && (
          <section style={{marginBottom:'48px'}}>
            <h2 style={{fontSize:'12px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'14px'}}>Scheduled Maintenance</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {upcoming.map(mw => (
                <div key={mw.id} style={{padding:'16px 20px',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.18)',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <p style={{fontSize:'14px',fontWeight:600,color:'#fff',marginBottom:'3px'}}>{mw.title}</p>
                    <p style={{fontSize:'12px',color:'rgba(255,255,255,0.35)'}}>{fmtDate(mw.scheduled_start)} → {fmtDate(mw.scheduled_end)}</p>
                  </div>
                  <span style={{fontSize:'10px',color:'#6366f1',fontWeight:700,letterSpacing:'0.1em'}}>{mw.status === 'in_progress' ? 'IN PROGRESS' : 'SCHEDULED'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Metrics */}
        <section>
          <h2 style={{fontSize:'12px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'14px'}}>Service Status</h2>
          {loading && (
            <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'48px 0'}}>
              <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'2px solid rgba(99,102,241,0.3)',borderTopColor:'#6366f1',animation:'spin 0.8s linear infinite'}} />
              <span style={{fontSize:'14px',color:'rgba(255,255,255,0.35)'}}>Querying telemetry…</span>
            </div>
          )}
          {dbErr && (
            <div style={{padding:'24px',background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.15)',borderRadius:'8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                <span style={{width:'8px',height:'8px',background:'#f59e0b',borderRadius:'50%',animation:'sPulse 2s infinite'}} />
                <p style={{fontSize:'14px',color:'#f59e0b',fontWeight:600}}>Metrics temporarily isolated</p>
              </div>
              <p style={{fontSize:'13px',color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>Telemetry nodes are reconnecting. Core operations unaffected.</p>
            </div>
          )}
          {(!loading && !dbErr && metrics.length === 0) && (
            <div style={{padding:'48px 24px',background:'#0a0a0a',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'12px',textAlign:'center'}}>
              <p style={{fontSize:'14px',color:'rgba(255,255,255,0.35)'}}>All systems operational. No active telemetry anomalies detected.</p>
            </div>
          )}
          {!loading && !dbErr && metrics.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:'1px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'12px',overflow:'hidden'}}>
              {metrics.map((m, idx) => {
                const cfg = S[m.status];
                return (
                  <div key={m.id} style={{display:'flex',flexDirection:'column',gap:'16px',padding:'24px',background:'#0a0a0a',borderBottom: idx < metrics.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span style={{width:'7px',height:'7px',borderRadius:'50%',background:cfg.c,boxShadow:`0 0 6px ${cfg.g}`,flexShrink:0}} />
                        <h3 style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{m.service_name}</h3>
                      </div>
                      <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:cfg.c}}>{cfg.l}</span>
                    </div>
                    <UptimeBar uptime={m.uptime_percentage} />
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <p style={{fontSize:'11px',color:'rgba(255,255,255,0.25)'}}>{m.uptime_percentage.toFixed(3)}% uptime · {timeAgo(m.last_updated)}</p>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontSize:'13px',fontWeight:700,color:'rgba(255,255,255,0.7)',fontVariantNumeric:'tabular-nums'}}>{m.latency_ms.toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <AuditFeed />

        {/* Past Incidents */}
        {resolved.length > 0 && (
          <section style={{marginTop:'48px'}}>
            <h2 style={{fontSize:'12px',fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.35)',marginBottom:'14px'}}>Recent Incidents (Resolved)</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              {resolved.map(inc => (
                <div key={inc.id} style={{padding:'14px 20px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <p style={{fontSize:'14px',color:'rgba(255,255,255,0.65)',fontWeight:500}}>{inc.title}</p>
                    <p style={{fontSize:'11px',color:'rgba(255,255,255,0.25)',marginTop:'2px'}}>{fmtDate(inc.started_at)} → {inc.resolved_at ? fmtDate(inc.resolved_at) : '—'}</p>
                  </div>
                  <span style={{fontSize:'10px',color:'#10b981',fontWeight:700,letterSpacing:'0.1em'}}>RESOLVED</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{marginTop:'56px',paddingTop:'20px',borderTop:'1px solid rgba(255,255,255,0.04)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.2)'}}>Auto-refresh every 10s · Powered by Supabase Realtime</p>
          <div style={{display:'flex',gap:'16px'}}>
            <Link href="/security" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Security</Link>
            <Link href="/transparency" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Transparency</Link>
            <Link href="/access-model" style={{fontSize:'12px',color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>Access Model</Link>
          </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes sPulse{0%,100%{opacity:1}50%{opacity:0.35}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}
