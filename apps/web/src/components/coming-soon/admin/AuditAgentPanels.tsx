'use client';
import { AuditEvent } from './types';

const SEV_COLORS: Record<string, string> = { info:'#3b82f6', warn:'#f59e0b', critical:'#ef4444' };
const SEV_BG: Record<string, string> = { info:'rgba(59,130,246,0.1)', warn:'rgba(245,158,11,0.1)', critical:'rgba(239,68,68,0.1)' };
const ACTION_ICONS: Record<string, string> = { 'Reply sent':'💬', 'Status →':'🔄', Escalate:'🚨', 'Suspend':'🔒', Reopen:'♻️' };

interface AuditPanelProps { events: AuditEvent[]; loading?: boolean; }

export function AuditPanel({ events, loading }: AuditPanelProps) {
  const getIcon = (action: string) => {
    for (const [k, v] of Object.entries(ACTION_ICONS)) {
      if (action.includes(k)) return v;
    }
    return '◈';
  };

  return (
    <div style={{ padding:'32px', overflowY:'auto', height:'100%' }} className="scrollbar-hide">
      <div style={{ maxWidth:'800px', margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h2 style={{ fontSize:'18px', fontWeight:700, color:'#fff', margin:'0 0 4px' }}>Audit Log</h2>
            <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', margin:0 }}>All admin actions tracked in real-time</p>
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.04)', padding:'6px 14px', borderRadius:'20px', border:'1px solid rgba(255,255,255,0.08)' }}>
            {events.length} events
          </div>
        </div>

        {loading && <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'60px', fontSize:'13px' }}>Loading audit log…</div>}

        {!loading && events.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px', color:'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>◈</div>
            <p style={{ fontSize:'13px' }}>No audit events recorded yet</p>
          </div>
        )}

        <div style={{ position:'relative' }}>
          {/* Timeline line */}
          <div style={{ position:'absolute', left:'19px', top:0, bottom:0, width:'1px', background:'rgba(255,255,255,0.06)' }} />

          {events.map((e, i) => (
            <div key={e.id} style={{ display:'flex', gap:'16px', marginBottom:'16px', position:'relative' }}>
              {/* Dot */}
              <div style={{ width:'40px', flexShrink:0, display:'flex', justifyContent:'center', paddingTop:'12px', zIndex:1 }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', background: SEV_COLORS[e.severity]||'#888', boxShadow:`0 0 8px ${SEV_COLORS[e.severity]||'#888'}60` }} />
              </div>
              {/* Card */}
              <div style={{ flex:1, background:'rgba(255,255,255,0.02)', border:`1px solid rgba(255,255,255,0.05)`, borderRadius:'12px', padding:'14px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'14px' }}>{getIcon(e.action)}</span>
                    <span style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>{e.action}</span>
                    <span style={{ fontSize:'9px', padding:'3px 8px', borderRadius:'4px', background: SEV_BG[e.severity], color: SEV_COLORS[e.severity], fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{e.severity}</span>
                  </div>
                  <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', fontFamily:'monospace', flexShrink:0 }}>{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', gap:'16px' }}>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)' }}>by <strong style={{ color:'rgba(255,255,255,0.7)' }}>{e.actor}</strong></span>
                  {e.ticket_id && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontFamily:'monospace' }}>#{e.ticket_id.slice(0,8)}</span>}
                </div>
                {e.detail && <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)', margin:'6px 0 0', lineHeight:1.5 }}>{e.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOCK_AGENTS = [
  { id:'1', name:'Zara Chen', role:'Senior Support', status:'online', tickets_open:4, tickets_resolved:127, avg_response_time:'8m', avatar_color:'#7c3aed', joined:'2025-01-14' },
  { id:'2', name:'Marcus Obi', role:'Security Analyst', status:'online', tickets_open:2, tickets_resolved:89, avg_response_time:'12m', avatar_color:'#0891b2', joined:'2025-03-02' },
  { id:'3', name:'Priya Nair', role:'Support Lead', status:'away', tickets_open:1, tickets_resolved:203, avg_response_time:'6m', avatar_color:'#059669', joined:'2024-11-18' },
  { id:'4', name:'Jin Ho Park', role:'Moderation', status:'offline', tickets_open:0, tickets_resolved:56, avg_response_time:'15m', avatar_color:'#d97706', joined:'2025-04-01' },
];

export function AgentsPanel() {
  return (
    <div style={{ padding:'32px', overflowY:'auto', height:'100%' }} className="scrollbar-hide">
      <div style={{ maxWidth:'900px', margin:'0 auto' }}>
        <h2 style={{ fontSize:'18px', fontWeight:700, color:'#fff', margin:'0 0 4px' }}>Agent Management</h2>
        <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'28px' }}>Online staff, ticket load, and performance metrics</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'16px' }}>
          {MOCK_AGENTS.map(agent => (
            <div key={agent.id} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'16px', padding:'24px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:'80px', height:'80px', background:`radial-gradient(circle at 100% 0%, ${agent.avatar_color}15, transparent 70%)` }} />
              <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:`${agent.avatar_color}22`, border:`2px solid ${agent.avatar_color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, color:agent.avatar_color }}>
                    {agent.name.charAt(0)}
                  </div>
                  <div style={{ position:'absolute', bottom:1, right:1, width:'11px', height:'11px', borderRadius:'50%', background: agent.status==='online'?'#10b981':agent.status==='away'?'#f59e0b':'#6b7280', border:'2px solid #060606' }} />
                </div>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:700, color:'#fff' }}>{agent.name}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)' }}>{agent.role}</div>
                  <div style={{ fontSize:'10px', color: agent.status==='online'?'#10b981':agent.status==='away'?'#f59e0b':'#6b7280', marginTop:'2px', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>{agent.status}</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px' }}>
                {[
                  { label:'Open', value:agent.tickets_open, color:'#f59e0b' },
                  { label:'Resolved', value:agent.tickets_resolved, color:'#10b981' },
                  { label:'Avg Time', value:agent.avg_response_time, color:'#7c3aed' },
                ].map(m=>(
                  <div key={m.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'8px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'18px', fontWeight:700, color:m.color }}>{m.value}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'3px' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:'14px', fontSize:'10px', color:'rgba(255,255,255,0.25)', textAlign:'right' }}>
                Joined {new Date(agent.joined).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
