import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShadowContext } from '@/lib/coming-soon/shadowSecurity';

export const dynamic = 'force-dynamic';

/* ── Production Hardening: Persistent State ──────────────────────────────────
   Migrated from in-memory Map to Supabase for multi-instance scalability.  */

function db() {
  return createAdminClient();
}

function addSysMsg(msgs: any[], text: string) {
  const newMsgs = [...(msgs || []), { id: Math.random().toString(36).slice(2), text, ts: Date.now() }];
  return newMsgs.slice(-40);
}

// ── GET: unified poll (status + typing + presence + lock + system msgs) ─────
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode?.toUpperCase();
  const ctx = getShadowContext(req, code);
  if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { sid: sessionId, role } = ctx;
  const supabase = db();
  const now = Date.now();

  const { data: session, error } = await supabase
    .from('shadow_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session || error) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  let finalStatus = session.status;
  let isLocked = session.is_locked ?? false;
  let systemMsgs = session.system_msgs || [];
  let updatePayload: any = {};

  let stateChanged = false;

  // 1. Auto-activate when 2 participants join
  if (session.participant_count >= 2 && session.status === 'waiting') {
    finalStatus = 'active';
    updatePayload.status = 'active';
    updatePayload.activated_at = new Date().toISOString(); 
    systemMsgs = addSysMsg(systemMsgs, 'Secure tunnel established. Creator and Joiner synchronized.');
    updatePayload.system_msgs = systemMsgs;
    stateChanged = true;
  }

  // 2. Dead Man Timer & Auto-Lock Logic
  if (finalStatus === 'active') {
    const pCreator = Number(session.presence_creator || 0);
    const pJoiner = Number(session.presence_joiner || 0);
    const activeTime = session.activated_at ? (now - new Date(session.activated_at).getTime()) : 0;
    const isGracePeriod = activeTime < 30000;

    const creatorGone = pCreator > 0 && (now - pCreator > 20000); // 20s threshold
    const joinerGone = pJoiner > 0 && (now - pJoiner > 20000);
    
    if ((creatorGone || joinerGone) && !isLocked && !isGracePeriod) {
      isLocked = true;
      updatePayload.is_locked = true;
      systemMsgs = addSysMsg(systemMsgs, 'Participant connectivity lost. Session auto-locked.');
      updatePayload.system_msgs = systemMsgs;
      stateChanged = true;
    }
    
    const creatorPresent = pCreator > 0 && (now - pCreator < 10000);
    const joinerPresent = pJoiner > 0 && (now - pJoiner < 10000);

    if (creatorPresent && joinerPresent && isLocked && !session.manual_lock) {
      isLocked = false;
      updatePayload.is_locked = false;
      systemMsgs = addSysMsg(systemMsgs, 'Peer authentication verified. Resuming tunnel.');
      updatePayload.system_msgs = systemMsgs;
      stateChanged = true;
    }

    const creatorDead = pCreator > 0 && (now - pCreator > 180000);
    const joinerDead = pJoiner > 0 && (now - pJoiner > 180000);

    if ((creatorDead || joinerDead) && !isGracePeriod) {
      await supabase.from('shadow_messages').delete().eq('session_id', session.id);
      finalStatus = 'destroyed';
      updatePayload.status = 'destroyed';
      updatePayload.destroyed_at = new Date().toISOString();
      systemMsgs = addSysMsg(systemMsgs, 'Dead man timer expired. Vault destroyed.');
      updatePayload.system_msgs = systemMsgs;
      stateChanged = true;
    }
  }

  // 3. Session Expiry
  const expiryTs = new Date(session.expires_at).getTime();
  const remainingMs = Math.max(0, expiryTs - now);
  const remainingSeconds = Math.floor(remainingMs / 1000);
  
  if (remainingSeconds <= 0 && finalStatus !== 'expired' && finalStatus !== 'destroyed') {
    finalStatus = 'expired';
    updatePayload.status = 'expired';
    updatePayload.destroyed_at = new Date().toISOString();
    await supabase.from('shadow_messages').delete().eq('session_id', session.id);
    stateChanged = true;
  }

  // Always update presence, but only if it's stale (more than 5s since last update)
  const lastPresence = role === 'creator' ? Number(session.presence_creator || 0) : Number(session.presence_joiner || 0);
  if (now - lastPresence > 5000) {
    if (role === 'creator') updatePayload.presence_creator = now;
    else updatePayload.presence_joiner = now;
    stateChanged = true;
  }

  if (stateChanged) {
    await supabase.from('shadow_sessions').update(updatePayload).eq('id', session.id);
  }

  return NextResponse.json({
    status: finalStatus,
    sessionId: session.id,
    participantCount: session.participant_count,
    remainingSeconds,
    isLocked,
    kickedJoiner: (session.kicked_joiner ?? false) && role === 'joiner',
    typing: { creator: Number(session.typing_creator || 0), joiner: Number(session.typing_joiner || 0) },
    presence: { creator: Number(session.presence_creator || 0), joiner: Number(session.presence_joiner || 0) },
    systemMsgs,
    extensionCount: session.extension_count || 0,
    role,
  });

}

// ── POST: actions ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode?.toUpperCase();
  const ctx = getShadowContext(req, code);
  if (!ctx) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { sid: sessionId, role } = ctx;
  const body = await req.json();
  const { action } = body;
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const supabase = db();
  const { data: session } = await supabase.from('shadow_sessions').select('*').eq('id', sessionId).single();
  if (!session) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  let systemMsgs = session.system_msgs || [];

  switch (action) {
    case 'typing':
      const typingCol = role === 'creator' ? 'typing_creator' : 'typing_joiner';
      await supabase.from('shadow_sessions').update({ [typingCol]: Date.now() }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'presence':
      const presenceCol = role === 'creator' ? 'presence_creator' : 'presence_joiner';
      await supabase.from('shadow_sessions').update({ [presenceCol]: Date.now() }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'lock':
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      await supabase.from('shadow_sessions').update({ 
        is_locked: true, 
        manual_lock: true,
        system_msgs: addSysMsg(systemMsgs, 'Tunnel manually locked by Creator.')
      }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'unlock':
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      await supabase.from('shadow_sessions').update({ 
        is_locked: false, 
        manual_lock: false,
        system_msgs: addSysMsg(systemMsgs, 'Tunnel manually unlocked by Creator.')
      }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'extend': {
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      const extCount = session.extension_count || 0;
      if (extCount >= 2) return NextResponse.json({ error: 'MAX_EXTENSIONS' }, { status: 400 });
      const newExpiry = new Date(new Date(session.expires_at).getTime() + 15 * 60 * 1000).toISOString();
      const left = 2 - (extCount + 1);
      await supabase.from('shadow_sessions').update({ 
        expires_at: newExpiry, 
        extension_count: extCount + 1,
        system_msgs: addSysMsg(systemMsgs, `Tunnel persistence extended by Creator. (${left} burst${left !== 1 ? 's' : ''} remaining)`)
      }).eq('id', sessionId);
      return NextResponse.json({ ok: true, newExpiry, extensionCount: extCount + 1 });
    }

    case 'kick':
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      await supabase.from('shadow_sessions').update({ 
        kicked_joiner: true,
        system_msgs: addSysMsg(systemMsgs, 'Joiner has been purged from the session.')
      }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'unkick':
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      await supabase.from('shadow_sessions').update({ kicked_joiner: false }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    case 'terminate':
      if (role !== 'creator') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 });
      await supabase.from('shadow_messages').delete().eq('session_id', sessionId);
      await supabase.from('shadow_sessions').update({ 
        status: 'destroyed', 
        destroyed_at: new Date().toISOString(),
        system_msgs: addSysMsg(systemMsgs, 'Nuclear termination sequence initiated by Creator.')
      }).eq('id', sessionId);
      return NextResponse.json({ ok: true });

    default:
      return NextResponse.json({ error: 'UNKNOWN_ACTION' }, { status: 400 });
  }
}
