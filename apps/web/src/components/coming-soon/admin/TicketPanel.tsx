'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, AdminNote, TicketStatus } from './types';

const PRIORITY_COLORS: Record<string, string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#10b981' };
const STATUS_COLORS: Record<string, string> = { Received:'#7c3aed', 'In progress':'#3b82f6', 'In review':'#f59e0b', Escalated:'#ef4444', Completed:'#10b981', Suspended:'#6b7280' };
const LABELS = ['billing','security','access','spam','vip','urgent','abuse'];
const FLAGS = ['none','spam','abuse','risk','vip'] as const;

function RiskBar({ score }: { score: number }) {
  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
      <div style={{ flex:1, height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden' }}>
        <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:'2px', transition:'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize:'10px', color, fontWeight:700, minWidth:'28px' }}>{score}%</span>
    </div>
  );
}

interface Props {
  tickets: Ticket[];
  authKey: string;
  onUpdate: (updated: Ticket) => void;
}

export default function TicketPanel({ tickets, authKey, onUpdate }: Props) {
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteFlag, setNoteFlag] = useState<typeof FLAGS[number]>('none');
  const [riskScore, setRiskScore] = useState(0);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'chat'|'notes'|'security'>('chat');
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.subject?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q) || t.full_name?.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || t.status === filterStatus;
    const matchP = filterPriority === 'all' || t.priority === filterPriority;
    return matchQ && matchS && matchP;
  });

  const selectTicket = async (t: Ticket) => {
    setSelected(t);
    setReplyText('');
    setNoteText('');
    setSentOk(false);
    setActiveDetailTab('chat');
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/admin/notes?ticket_id=${t.id}`, { headers:{ Authorization:`Bearer ${authKey}` } });
      const data = await res.json();
      setNotes(data.notes || []);
    } catch { setNotes([]); } finally { setNotesLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/tickets', { method:'PATCH', headers:{ Authorization:`Bearer ${authKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ id, status }) });
    const upd = tickets.find(t => t.id === id);
    if (upd) { const u = {...upd, status: status as TicketStatus}; onUpdate(u); if (selected?.id === id) setSelected(u); }
    logAudit(`Status → ${status}`, id, `Ticket status updated to ${status}`);
  };

  const setPriority = async (id: string, priority: string) => {
    await fetch('/api/admin/tickets', { method:'PATCH', headers:{ Authorization:`Bearer ${authKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ id, priority }) });
    const upd = tickets.find(t => t.id === id);
    if (upd) { const u = {...upd, priority: priority as any}; onUpdate(u); if (selected?.id === id) setSelected(u); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await fetch('/api/admin/tickets', { method:'PATCH', headers:{ Authorization:`Bearer ${authKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ id: selected.id, admin_reply: replyText.trim(), status:'Completed' }) });
      const u = { ...selected, admin_reply: replyText.trim(), status:'Completed' as TicketStatus };
      onUpdate(u); setSelected(u); setSentOk(true); setReplyText('');
      setTimeout(() => setSentOk(false), 3000);
      logAudit('Reply sent', selected.id, `Admin replied to ${selected.email}`);
    } finally { setSending(false); }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      const res = await fetch('/api/admin/notes', { method:'POST', headers:{ Authorization:`Bearer ${authKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ ticket_id: selected.id, note: noteText.trim(), flag: noteFlag, risk_score: riskScore, author:'Admin' }) });
      const data = await res.json();
      if (data.note) setNotes(prev => [data.note, ...prev]);
      setNoteText(''); setNoteFlag('none'); setRiskScore(0);
    } catch {}
  };

  const logAudit = async (action: string, ticketId: string, detail: string) => {
    try {
      await fetch('/api/admin/audit', { method:'POST', headers:{ Authorization:`Bearer ${authKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ action, ticket_id: ticketId, actor:'Admin', detail, severity:'info' }) });
    } catch {}
  };

  const renderChatLog = (desc: string) => {
    const blocks = desc.split('[USER_REPLY]');
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {blocks.map((b, i) => (
          <div key={i} style={{ background: i===0 ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i===0?'rgba(124,58,237,0.2)':'rgba(255,255,255,0.06)'}`, borderRadius:'12px', padding:'16px' }}>
            <span style={{ fontSize:'9px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color: i===0?'#7c3aed':'#10b981', display:'block', marginBottom:'8px' }}>{i===0?'Original Ticket':'User Reply'}</span>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', lineHeight:1.7, whiteSpace:'pre-wrap', margin:0 }}>{b.trim()}</p>
          </div>
        ))}
      </div>
    );
  };

  const S = { label:{ fontSize:'10px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase' as const, letterSpacing:'0.1em', fontWeight:700, marginBottom:'6px', display:'block' } };

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* ── Sidebar List ── */}
      <div style={{ width:'340px', flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', background:'#080808' }}>
        {/* Search + Filters */}
        <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', gap:'8px' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets…"
            style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', padding:'9px 14px', borderRadius:'8px', color:'#fff', fontSize:'12px', outline:'none', boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:'6px' }}>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', outline:'none' }}>
              <option value="all">All Status</option>
              {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterPriority} onChange={e=>setFilterPriority(e.target.value)}
              style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', outline:'none' }}>
              <option value="all">All Priority</option>
              {Object.keys(PRIORITY_COLORS).map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', paddingLeft:'2px' }}>{filtered.length} record{filtered.length!==1?'s':''}</div>
        </div>

        {/* Ticket List */}
        <div style={{ flex:1, overflowY:'auto' }} className="scrollbar-hide">
          <AnimatePresence>
            {filtered.map((t, i) => (
              <motion.div key={t.id} onClick={()=>selectTicket(t)} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.03 }}
                style={{ padding:'16px 20px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.03)', transition:'background 0.15s',
                  background: selected?.id===t.id ? 'rgba(124,58,237,0.08)' : 'transparent',
                  borderLeft: `3px solid ${selected?.id===t.id ? '#7c3aed' : 'transparent'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                  <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                    <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 7px', borderRadius:'5px', background:`${STATUS_COLORS[t.status] || '#888'}18`, color:STATUS_COLORS[t.status] || '#888', textTransform:'uppercase', letterSpacing:'0.05em' }}>{t.status}</span>
                    {t.priority && <span style={{ fontSize:'9px', fontWeight:700, padding:'3px 7px', borderRadius:'5px', background:`${PRIORITY_COLORS[t.priority]}18`, color:PRIORITY_COLORS[t.priority], textTransform:'uppercase' }}>{t.priority}</span>}
                  </div>
                  <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', fontFamily:'monospace' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize:'13px', fontWeight:600, color:'#fff', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.subject}</p>
                <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.full_name} · {t.report_type}</p>
                {t.risk_score && t.risk_score > 0 ? <div style={{ marginTop:'8px' }}><RiskBar score={t.risk_score} /></div> : null}
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length===0 && <div style={{ padding:'48px', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:'12px' }}>No tickets match filters</div>}
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <div style={{ flex:1, overflowY:'auto', background:'#060606' }} className="scrollbar-hide">
        {selected ? (
          <div style={{ maxWidth:'860px', margin:'0 auto', padding:'32px' }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
              <div style={{ flex:1, marginRight:'24px' }}>
                <h2 style={{ fontSize:'22px', fontWeight:700, color:'#fff', margin:'0 0 8px', lineHeight:1.3 }}>{selected.subject}</h2>
                <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', fontFamily:'monospace', margin:0 }}>
                  {selected.case_id || selected.id.slice(0,8).toUpperCase()} · {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <div style={{ display:'flex', gap:'8px', flexShrink:0, alignItems:'center' }}>
                <select value={selected.priority || 'medium'} onChange={e=>setPriority(selected.id, e.target.value)}
                  style={{ padding:'8px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff', fontSize:'11px', fontWeight:700, outline:'none', cursor:'pointer' }}>
                  {Object.keys(PRIORITY_COLORS).map(p=><option key={p} value={p} style={{background:'#0a0a0a'}}>{p.toUpperCase()}</option>)}
                </select>
                <select value={selected.status} onChange={e=>updateStatus(selected.id, e.target.value)}
                  style={{ padding:'8px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#fff', fontSize:'11px', fontWeight:700, outline:'none', cursor:'pointer' }}>
                  {Object.keys(STATUS_COLORS).map(s=><option key={s} value={s} style={{background:'#0a0a0a'}}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Meta grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px' }}>
              {[
                { label:'Requester', lines:[selected.full_name, selected.email] },
                { label:'Telemetry', lines:[`IP: ${selected.ip_address||'N/A'}`, (selected.user_agent||'').slice(0,50)+'…'] },
              ].map(card=>(
                <div key={card.label} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'18px' }}>
                  <label style={S.label}>{card.label}</label>
                  {card.lines.map((l,i)=><p key={i} style={{ fontSize: i===0?'13px':'12px', color: i===0?'#fff':'rgba(255,255,255,0.5)', margin:'0 0 2px', fontFamily: card.label==='Telemetry'?'monospace':'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l}</p>)}
                </div>
              ))}
            </div>

            {/* Detail Tabs */}
            <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'4px' }}>
              {(['chat','notes','security'] as const).map(tab=>(
                <button key={tab} onClick={()=>setActiveDetailTab(tab)}
                  style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', transition:'all 0.2s',
                    background: activeDetailTab===tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: activeDetailTab===tab ? '#fff' : 'rgba(255,255,255,0.4)' }}>{tab}</button>
              ))}
            </div>

            {/* Chat Tab */}
            {activeDetailTab==='chat' && (
              <div>
                <div style={{ marginBottom:'24px' }}>{renderChatLog(selected.description)}</div>
                {selected.admin_reply && (
                  <div style={{ background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'12px', padding:'16px', marginBottom:'16px' }}>
                    <span style={{ fontSize:'9px', fontWeight:700, color:'#10b981', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'8px' }}>Last Admin Reply</span>
                    <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.85)', margin:0, lineHeight:1.6 }}>{selected.admin_reply}</p>
                  </div>
                )}
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px' }}>
                  <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder={`Draft response to ${selected.full_name}…`}
                    style={{ width:'100%', minHeight:'110px', padding:'14px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#fff', fontSize:'13px', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'12px' }}>
                    <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>Will mark ticket as Completed</span>
                    <button onClick={sendReply} disabled={sending||!replyText.trim()}
                      style={{ padding:'10px 24px', background: sentOk?'#10b981':'#7c3aed', border:'none', borderRadius:'9px', color:'#fff', fontSize:'12px', fontWeight:700, cursor: sending||!replyText.trim()?'not-allowed':'pointer', opacity:!replyText.trim()?0.5:1, transition:'all 0.2s', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                      {sentOk?'✓ Sent':sending?'Sending…':'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeDetailTab==='notes' && (
              <div>
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'20px', marginBottom:'20px' }}>
                  <label style={S.label}>Add Internal Note</label>
                  <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Silent note — not visible to user…"
                    style={{ width:'100%', minHeight:'80px', padding:'12px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'9px', color:'#fff', fontSize:'12px', outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:'12px' }} />
                  <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <div>
                      <label style={S.label}>Flag</label>
                      <select value={noteFlag} onChange={e=>setNoteFlag(e.target.value as any)}
                        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:'7px', padding:'8px 12px', fontSize:'11px', outline:'none' }}>
                        {FLAGS.map(f=><option key={f} value={f} style={{background:'#0a0a0a'}}>{f}</option>)}
                      </select>
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={S.label}>Risk Score: {riskScore}%</label>
                      <input type="range" min={0} max={100} value={riskScore} onChange={e=>setRiskScore(+e.target.value)}
                        style={{ width:'100%', accentColor:'#ef4444' }} />
                    </div>
                    <button onClick={addNote} disabled={!noteText.trim()}
                      style={{ padding:'10px 20px', background:'rgba(124,58,237,0.8)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'11px', fontWeight:700, cursor:!noteText.trim()?'not-allowed':'pointer', opacity:!noteText.trim()?0.5:1, textTransform:'uppercase', letterSpacing:'0.06em', alignSelf:'flex-end' }}>
                      Add Note
                    </button>
                  </div>
                </div>
                {notesLoading ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', padding:'32px', fontSize:'12px' }}>Loading notes…</div> :
                  notes.length===0 ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'32px', fontSize:'12px' }}>No internal notes yet</div> :
                  notes.map(n=>(
                    <div key={n.id} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'16px', marginBottom:'10px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.5)', fontWeight:700 }}>{n.author}</span>
                          {n.flag!=='none' && <span style={{ fontSize:'9px', padding:'2px 8px', borderRadius:'4px', background:'rgba(239,68,68,0.15)', color:'#ef4444', fontWeight:700, textTransform:'uppercase' }}>{n.flag}</span>}
                          {n.risk_score>0 && <span style={{ fontSize:'9px', padding:'2px 8px', borderRadius:'4px', background:'rgba(239,68,68,0.1)', color:'#f59e0b', fontWeight:700 }}>Risk {n.risk_score}%</span>}
                        </div>
                        <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.25)', fontFamily:'monospace' }}>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.75)', margin:0, lineHeight:1.6 }}>{n.note}</p>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Security Tab */}
            {activeDetailTab==='security' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {[
                  ['IP Address', selected.ip_address||'Not recorded', true],
                  ['User Agent', selected.user_agent||'Not recorded', true],
                  ['Email Domain', selected.email?.split('@')[1]||'—', false],
                  ['Report Type', selected.report_type||'—', false],
                  ['Risk Score', `${selected.risk_score||0}%`, false],
                  ['Flag Status', selected.flagged?'⚠ Flagged':'Clean', false],
                ].map(([label,val,mono])=>(
                  <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'10px', padding:'14px 18px' }}>
                    <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>{label}</span>
                    <span style={{ fontSize:'12px', color:'#fff', fontFamily: mono?'monospace':'inherit', maxWidth:'400px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val as string}</span>
                  </div>
                ))}
                <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
                  {[
                    { label:'Escalate', color:'#f59e0b', status:'Escalated' },
                    { label:'Suspend User', color:'#ef4444', status:'Suspended' },
                    { label:'Reopen', color:'#7c3aed', status:'Received' },
                  ].map(btn=>(
                    <button key={btn.label} onClick={()=>updateStatus(selected.id, btn.status)}
                      style={{ flex:1, padding:'12px', background:`${btn.color}15`, border:`1px solid ${btn.color}33`, color:btn.color, borderRadius:'10px', fontSize:'11px', fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.08em', transition:'all 0.2s' }}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', color:'rgba(255,255,255,0.2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            <p style={{ fontSize:'13px', fontWeight:500 }}>Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
