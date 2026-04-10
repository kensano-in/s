/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SHINKEN Sync Engine — Perception-Controlled Reality Engine
 *
 * Axiom 2  — State Duality:  UI operates on State_local; DB converges silently
 * Axiom 8  — Error Absorption: errors are intercepted → transformed → recovered
 * Axiom 15 — Self-Healing:   detect anomaly → correct → re-render loop
 *                             triggered by visibilitychange (tab focus)
 *
 * Core principle: UI state is the Source of Truth.
 * The database is a downstream replica that catches up silently.
 *
 * Failure strategy: Exponential backoff with up to 5 retries.
 * The user NEVER sees a "Saving..." spinner.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@/lib/supabase/client';
import { submitProfileUpdateDB } from '@/app/(main)/profile/actionsCore';

// ── Retry configuration ────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 300;

/**
 * Exponential backoff wrapper.
 * attempt 0 → 300ms, attempt 1 → 600ms, attempt 2 → 1200ms …
 */
async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SyncQueue — Axiom 8: Error Absorption ────────────────────────────────────
// Failed message sends are queued and drained on reconnect / tab focus.
// The user never sees the failure — the system heals silently.
// ─────────────────────────────────────────────────────────────────────────────

export interface QueuedMessage {
  /** client_temp_id that corresponds to the optimistic entry in the UI */
  clientTempId: string;
  conversationId: string | null;
  recipientId: string | null;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'voice' | 'file' | 'system';
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  replyToId?: string | null;
  /** Callback to reconcile or remove the optimistic entry */
  onSuccess: (realId: string) => void;
  onRollback: (clientTempId: string) => void;
  /** ISO timestamp of original send attempt */
  queuedAt: string;
  attempts: number;
}

// In-memory queue — survives component remounts, not page reloads (acceptable)
const syncQueue: QueuedMessage[] = [];
let isProcessing = false;

/**
 * Add a failed or pending message to the outbox.
 * Safe to call multiple times for the same clientTempId — deduplicates.
 */
export function enqueueMessage(msg: QueuedMessage): void {
  const exists = syncQueue.find(q => q.clientTempId === msg.clientTempId);
  if (!exists) {
    syncQueue.push(msg);
    console.debug('[SyncQueue] Enqueued:', msg.clientTempId, 'queue size:', syncQueue.length);
  }
}

/**
 * Drain the outbox. Called on:
 *   - visibilitychange (tab focus, Axiom 15)
 *   - WS reconnect
 *   - manual trigger
 */
export async function processSyncQueue(): Promise<void> {
  if (isProcessing || syncQueue.length === 0) return;
  isProcessing = true;

  console.debug('[SyncQueue] Draining', syncQueue.length, 'queued messages');

  const supabase = createClient();

  while (syncQueue.length > 0) {
    const msg = syncQueue[0];
    msg.attempts += 1;

    try {
      const payload: Record<string, unknown> = {
        sender_id: msg.senderId,
        content: msg.content,
        type: msg.type,
        client_temp_id: msg.clientTempId,
        sent_at: new Date().toISOString(),
      };

      if (msg.conversationId) {
        payload.conversation_id = msg.conversationId;
      } else if (msg.recipientId) {
        payload.recipient_id = msg.recipientId;
      }

      if (msg.mediaUrl) payload.media_url = msg.mediaUrl;
      if (msg.fileName) payload.file_name = msg.fileName;
      if (msg.mimeType) payload.mime_type = msg.mimeType;
      if (msg.replyToId) payload.reply_to_id = msg.replyToId;

      const { data, error } = await supabase
        .from('messages')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      // Success: reconcile optimistic entry with real ID
      msg.onSuccess(data.id);
      syncQueue.shift(); // remove from front of queue

    } catch (err) {
      console.warn('[SyncQueue] Message send failed (attempt', msg.attempts, '):', err);

      if (msg.attempts >= MAX_RETRIES) {
        // Exhausted all retries — rollback the optimistic entry
        console.error('[SyncQueue] Max retries exceeded for:', msg.clientTempId, '— rolling back');
        msg.onRollback(msg.clientTempId);
        syncQueue.shift();
      } else {
        // Back off and stop processing — next drain will retry
        const delay = BASE_DELAY_MS * Math.pow(2, msg.attempts);
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10_000)));
        break;
      }
    }
  }

  isProcessing = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Self-Healing Loop — Axiom 15 ─────────────────────────────────────────────
// Registers a singleton visibilitychange listener.
// On tab focus: drains SyncQueue + emits 'verlyn:reconnect' for WS catch-up.
// ─────────────────────────────────────────────────────────────────────────────

let selfHealingInitialized = false;

/**
 * Call once at app bootstrap (e.g., in root layout or providers).
 * Idempotent — safe to call multiple times.
 */
export function initSelfHealingLoop(): void {
  if (selfHealingInitialized || typeof document === 'undefined') return;
  selfHealingInitialized = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.debug('[SelfHeal] Tab focused — draining sync queue and triggering reconnect');
      // Drain any queued messages (Axiom 8)
      processSyncQueue();
      // Signal WS hook to catch up on missed messages (Axiom 15)
      window.dispatchEvent(new CustomEvent('verlyn:reconnect'));
    }
  });

  console.debug('[SelfHeal] Self-healing loop initialized');
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Profile Sync (unchanged interface) ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfileSyncPayload {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Silently syncs a profile update to Supabase.
 * Called from the Zustand store after an optimistic UI update.
 * Fires and forgets — does NOT block the UI thread.
 */
export async function syncProfileToSupabase(
  userId: string,
  updates: ProfileSyncPayload,
  setSyncStatus?: (s: 'idle' | 'syncing' | 'error') => void
): Promise<void> {
  setSyncStatus?.('syncing');
  try {
    await withExponentialBackoff(async () => {
      const res = await submitProfileUpdateDB(userId, updates);
      if (!res.success) throw new Error(res.error);
    });
    setSyncStatus?.('idle');
  } catch (err) {
    setSyncStatus?.('error');
    throw err;
  }
}

/**
 * Dispatch a profile sync with full UI feedback —
 * errors are surfaced to the store's syncStatus.
 */
export function dispatchProfileSync(
  userId: string,
  updates: ProfileSyncPayload,
  setSyncStatus?: (s: 'idle' | 'syncing' | 'error') => void
): void {
  syncProfileToSupabase(userId, updates, setSyncStatus).catch((err) => {
    console.error('[SyncEngine] Profile sync failed after all retries:', err?.message);
  });
}
