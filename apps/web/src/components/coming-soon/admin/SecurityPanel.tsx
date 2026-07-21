'use client';
import { useState } from 'react';

import { motion } from 'framer-motion';

import { IconAlertTri, IconFlag, IconLock, IconGlobe, IconGrid, IconBan, IconSearch, IconBar } from '../Icons';

interface Props { tickets: any[]; preRegs: any[]; authKey: string; }

const RISK = (n: number) => n > 70 ? '#ef4444' : n > 40 ? '#f59e0b' : '#10b981';

export default function SecurityPanel({ tickets, preRegs, authKey }: Props) {
  const [ipInput, setIpInput] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [banInput, setBanInput] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [banMsg, setBanMsg] = useState('');

  const [activeSection, setActiveSection] = useState<'overview' | 'blacklist' | 'lookup' | 'domains'>('overview');

  const highRisk = tickets.filter(t => (t.risk_score || 0) > 70);
  const flagged = tickets.filter(t => t.flagged);
  const suspended = tickets.filter(t => t.status === 'Suspended');
  const riskOverall = tickets.length
    ? Math.round(tickets.reduce((a, t) => a + (t.risk_score || 0), 0) / tickets.length)
    : 0;

  const ipFreq: Record<string, number> = tickets.reduce((acc, t) => {
    if (t.ip_address) acc[t.ip_address] = (acc[t.ip_address] || 0) + 1;
    return acc;
  }, {});
  const repeatedIPs = Object.entries(ipFreq).filter(([, c]) => c > 1).sort((a, b) => +b[1] - +a[1]);

  const domainFreq: Record<string, number> = [...tickets, ...preRegs].reduce((acc, r) => {
    const d = r.email?.split('@')[1];
    if (d) acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const topDomains = Object.entries(domainFreq).sort((a, b) => +b[1] - +a[1]).slice(0, 10);

  const doLookup = async () => {
    if (!ipInput.trim()) return;
    setLookupLoading(true);
    try {
      const res = await fetch(`https://ipapi.co/${ipInput.trim()}/json/`);
      setLookupResult(await res.json());
    } catch { setLookupResult({ error: true }); }
    finally { setLookupLoading(false); }
  };

  const doBan = async () => {
    if (!banInput.trim()) return;
    setBanLoading(true);
    setBanMsg('');
    try {
      const res = await fetch('/api/support/telegram-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { text: `/ban ${banInput.trim()}`, chat: { id: 0 }, from: { id: 0, username: 'admin-panel' } } }),
      });
      if (res.ok) {
        setBlacklist(prev => [...prev, banInput.trim()]);
        setBanMsg(`✅ ${banInput.trim()} added to blacklist`);
        setBanInput('');
      } else { setBanMsg('❌ Action failed — try again'); }
    } catch { setBanMsg('❌ Network error'); }
    finally { setBanLoading(false); }
  };

  const TABS = [
    { id: 'overview', label: 'Overview', Icon: <IconGrid color="#9ca3af" size={12} />},
    { id: 'blacklist', label: 'Blacklist', Icon: <IconBan color="#9ca3af" size={12} />},
    { id: 'lookup', label: 'IP Lookup', Icon: <IconSearch color="#8b5cf6" size={12} />},
    { id: 'domains', label: 'Domains', Icon: <IconBar color="#9ca3af" size={12} />},
  ] as const;

  const inp = { flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: '9px', padding: '11px 14px', fontSize: '13px', outline: 'none', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '28px 32px', overflowY: 'auto', height: '100%' }} className="scrollbar-hide">
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Security Intelligence</h2>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Abuse detection · IP telemetry · Blacklist management</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: riskOverall > 60 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${riskOverall > 60 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '10px', padding: '8px 16px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: RISK(riskOverall), boxShadow: `0 0 8px ${RISK(riskOverall)}` }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: RISK(riskOverall), letterSpacing: '0.05em' }}>RISK: {riskOverall}%</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id as any)}
              style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', transition: 'all 0.2s', background: activeSection === tab.id ? 'rgba(255,255,255,0.09)' : 'transparent', color: activeSection === tab.id ? '#fff' : 'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:'6px' }}>
              {tab.Icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeSection === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
              {[
                { label:'High Risk Cases', value:highRisk.length, color:'#ef4444', Icon:<IconAlertTri color="#ef4444" size={18} />, sub:'Risk score > 70' },
                { label:'Flagged', value:flagged.length, color:'#f59e0b', Icon:<IconFlag color="#f59e0b" size={18} />, sub:'Manual flags' },
                { label:'Suspended', value:suspended.length, color:'#6b7280', Icon:<IconLock color="#6b7280" size={18} />, sub:'Locked accounts' },
                { label:'Repeated IPs', value:repeatedIPs.length, color:'#8b5cf6', Icon:<IconGlobe color="#8b5cf6" size={18} />, sub:'Multi-submit IPs' },
              ].map(s => (
                <div key={s.label} style={{ background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(90deg,${s.color}60,transparent)` }} />
                  <div style={{ marginBottom:'10px' }}>{s.Icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: s.color, letterSpacing: '-0.02em', marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Repeated IPs table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Repeated IP Addresses</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{repeatedIPs.length} detected</span>
              </div>
              {repeatedIPs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>✅ No repeated IPs detected</div>
              ) : repeatedIPs.slice(0, 8).map(([ip, count]) => (
                <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: +count > 4 ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                    <code style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{ip}</code>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: +count > 4 ? '#ef4444' : '#f59e0b', background: +count > 4 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: '20px' }}>{count}x submissions</span>
                    <button onClick={() => { setBanInput(ip); setActiveSection('blacklist'); }}
                      style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '7px', color: '#ef4444', fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
                      BAN IP
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BLACKLIST ── */}
        {activeSection === 'blacklist' && (
          <div>
            <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '22px', marginBottom: '20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom: '14px' }}>
                <IconBan color="#ef4444" size={12} />
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', margin:0 }}>Add to Blacklist</p>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '14px', lineHeight: 1.5 }}>
                Enter an <strong style={{ color: 'rgba(255,255,255,0.6)' }}>IP address</strong> (e.g. <code style={{ fontFamily: 'monospace', color: '#f59e0b', fontSize: '11px' }}>192.168.1.1</code>) or an <strong style={{ color: 'rgba(255,255,255,0.6)' }}>email</strong> (e.g. <code style={{ fontFamily: 'monospace', color: '#f59e0b', fontSize: '11px' }}>email:user@domain.com</code>)
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input value={banInput} onChange={e => setBanInput(e.target.value)} placeholder="IP or email:user@domain.com"
                  onKeyDown={e => e.key === 'Enter' && doBan()}
                  style={{ ...inp } as any} />
                <button onClick={doBan} disabled={banLoading || !banInput.trim()}
                  style={{ padding: '11px 24px', background: '#ef4444', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.06em', opacity: banLoading ? 0.6 : 1, textTransform: 'uppercase' }}>
                  {banLoading ? '…' : 'Ban'}
                </button>
              </div>
              {banMsg && <p style={{ fontSize: '12px', marginTop: '12px', color: banMsg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{banMsg}</p>}
            </div>

            {/* Ticket-level quick bans */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Recent Submissions — Quick Ban</span>
              </div>
              {tickets.slice(0, 10).map((t: any) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 80px', gap: '16px', alignItems: 'center', padding: '13px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{t.email}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{t.ip_address || 'IP unknown'} · {t.case_id}</p>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{t.full_name}</span>
                  <button onClick={() => { setBanInput(`email:${t.email}`); doBan(); }}
                    style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#ef4444', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                    Ban
                  </button>
                </div>
              ))}
              {tickets.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No tickets yet</div>}
            </div>
          </div>
        )}

        {/* ── IP LOOKUP ── */}
        {activeSection === 'lookup' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                <IconGlobe color="#8b5cf6" size={18} />
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', margin:0 }}>IP Telemetry Lookup</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: lookupResult ? '20px' : '0' }}>
                <input value={ipInput} onChange={e => setIpInput(e.target.value)} placeholder="Enter IP address…"
                  onKeyDown={e => e.key === 'Enter' && doLookup()}
                  style={{ ...inp } as any} />
                <button onClick={doLookup} disabled={lookupLoading || !ipInput.trim()}
                  style={{ padding: '11px 24px', background: '#7c3aed', border: 'none', borderRadius: '9px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lookupLoading ? '…' : 'Lookup'}
                </button>
              </div>

              {lookupResult && !lookupResult.error && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      ['Country', `${lookupResult.country_name || '—'} (${lookupResult.country_code || '—'})`],
                      ['City', lookupResult.city || '—'],
                      ['Region', lookupResult.region || '—'],
                      ['ISP / Org', lookupResult.org || '—'],
                      ['Timezone', lookupResult.timezone || '—'],
                      ['ASN', lookupResult.asn || '—'],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '9px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '5px' }}>{l}</div>
                        <div style={{ fontSize: '12px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v as string}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setBanInput(ipInput); setActiveSection('blacklist'); }}
                    style={{ padding: '9px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '9px', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', display:'flex', alignItems:'center', gap:'6px' }}>
                    <IconBan color="#ef4444" size={12} /> Ban This IP
                  </button>
                </>
              )}
              {lookupResult?.error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '12px' }}>Lookup failed. Check IP format.</p>}
            </div>
          </div>
        )}

        {/* ── DOMAINS ── */}
        {activeSection === 'domains' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <IconBar color="#3b82f6" size={12} />
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff' }}>Email Domain Analysis</span>
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{topDomains.length} unique domains</span>
            </div>
            {topDomains.map(([domain, count], i) => {
              const pct = Math.round((+count / +topDomains[0][1]) * 100);
              return (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ width: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', flex: 1, fontFamily: 'monospace' }}>{domain}</span>
                  <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#7c3aed', borderRadius: '2px', boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', minWidth: '28px', textAlign: 'right', fontFamily: 'monospace' }}>{count}</span>
                  <button onClick={() => { setBanInput(`email:*@${domain}`); setActiveSection('blacklist'); }}
                    style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '6px', color: '#ef4444', fontSize: '9px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', flexShrink: 0, display:'flex', alignItems:'center', gap:'4px' }}>
                    <IconBan color="#ef4444" size={12} /> BAN
                  </button>
                </div>
              );
            })}
            {topDomains.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No domain data yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}
