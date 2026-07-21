import { createAdminClient } from './supabase/admin';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModerationCheckResult {
  blocked: boolean;
  suspended?: boolean;
  warning?: string;
  restrictionInfo?: {
    level: number;
    expiresAt: string;
    needsManualReview: boolean;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Spam score threshold to trigger enforcement
const SPAM_SCORE_THRESHOLD = 100;

// Sliding window for activity counting (30 seconds)
const ACTIVITY_WINDOW_MS = 30_000;

// Rapid-fire detection window (5 seconds)  
const RAPID_FIRE_WINDOW_MS = 5_000;

// Max actions allowed in ACTIVITY_WINDOW before scoring
const RATE_LIMIT_COUNT = 8;

// Max actions in RAPID_FIRE_WINDOW before instant flag
const RAPID_FIRE_LIMIT = 5;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a specific action type is currently restricted for a user.
 * Always authoritative — reads from DB, never from cache.
 */
export async function isActionRestricted(userId: string, actionType: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const supabase = createAdminClient();

    // Check if user is a bot or system account (never restricted)
    const { data: userRecord } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    const username = userRecord?.username?.toLowerCase() || '';
    if (
      username === 'verlyn' ||
      username === 'developer' ||
      username.includes('system') ||
      username.includes('bot')
    ) {
      return false;
    }

    const now = new Date().toISOString();

    // Check if user is suspended (needs manual review → blocks everything)
    const { data: state } = await supabase
      .from('user_moderation_state')
      .select('needs_manual_review')
      .eq('user_id', userId)
      .maybeSingle();

    if (state?.needs_manual_review) {
      return true;
    }

    // Check for active restriction of the specific type
    const { data, error } = await supabase
      .from('user_restrictions')
      .select('id')
      .eq('user_id', userId)
      .eq('restriction_type', actionType)
      .gt('expires_at', now)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[ModerationEngine] DB check failed for user ${userId}:`, error.message);
      // Fail CLOSED: if we can't read restrictions, we can't confirm they're not restricted.
      // But failing closed would break UX if DB is momentarily slow, so we log and allow.
      return false;
    }

    return !!data;
  } catch (err: any) {
    console.error('[ModerationEngine] isActionRestricted exception:', err.message);
    return false;
  }
}

/**
 * Retrieve detailed moderation status for the dashboard UI.
 */
export async function getDetailedRestrictionsState(userId: string) {
  if (!userId) return null;

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const [stateRes, restrictionsRes, historyRes] = await Promise.all([
      supabase
        .from('user_moderation_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_restrictions')
        .select('restriction_type, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', now),
      supabase
        .from('user_moderation_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    return {
      warnedAt: stateRes.data?.warned_at || null,
      offenseCount: stateRes.data?.offense_count || 0,
      needsManualReview: stateRes.data?.needs_manual_review || false,
      activeRestrictions: restrictionsRes.data || [],
      history: historyRes.data || [],
    };
  } catch (err: any) {
    console.error('[ModerationEngine] getDetailedRestrictionsState exception:', err.message);
    return null;
  }
}

/**
 * Record an activity and run the spam-detection heuristic.
 * Called server-side on EVERY user action (messages, posts, comments, etc.)
 *
 * Returns { blocked: true } when the user must be stopped.
 */
export async function recordActivityAndCheckSpam(
  userId: string,
  action: string,
  content?: string,
  recipientId?: string
): Promise<ModerationCheckResult> {
  if (!userId) return { blocked: false };
  if (process.env.NODE_ENV !== 'production') {
    return { blocked: false };
  }

  const supabase = createAdminClient();
  const now = new Date();

  try {
    // ─── Step 1: Log the activity ─────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action,
        content_hash: content ? computeSimpleHash(content) : null,
        recipient_id: recipientId || null,
      });

    if (insertError) {
      // If the table doesn't exist or RLS fails, log loudly but don't crash.
      console.error(
        '[ModerationEngine] CRITICAL: Failed to insert activity log. Tables may not be migrated.',
        insertError.message
      );
      // Return unblocked — but this is a signal to deploy the migration.
      return { blocked: false };
    }

    // ─── Step 2: Fetch recent activity ──────────────────────────────────
    const windowStart = new Date(now.getTime() - ACTIVITY_WINDOW_MS).toISOString();
    const rapidWindowStart = new Date(now.getTime() - RAPID_FIRE_WINDOW_MS).toISOString();

    const { data: recentLogs, error: logsError } = await supabase
      .from('user_activity_logs')
      .select('action, created_at, content_hash')
      .eq('user_id', userId)
      .gt('created_at', windowStart)
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('[ModerationEngine] Failed to fetch activity logs:', logsError.message);
      return { blocked: false };
    }

    const logs = recentLogs || [];

    // ─── Step 3: Compute spam score ───────────────────────────────────────
    let spamScore = 0;
    const totalInWindow = logs.length;

    // --- A. Volume-based frequency scoring ---
    // > 8 actions in 30s = suspicious; > 15 = almost certainly spam
    if (totalInWindow >= RATE_LIMIT_COUNT) {
      spamScore += 40;
    }
    if (totalInWindow >= 15) {
      spamScore += 40;
    }
    if (totalInWindow >= 25) {
      spamScore += 40; // 120 alone → instant flag
    }

    // --- B. Rapid-fire burst: actions within the last 5 seconds ---
    const rapidLogs = logs.filter(
      (l) => new Date(l.created_at).getTime() >= now.getTime() - RAPID_FIRE_WINDOW_MS
    );
    if (rapidLogs.length >= RAPID_FIRE_LIMIT) {
      // 5+ actions in 5 seconds is scripted/automated behaviour
      spamScore += 60;
    }

    // --- C. Sub-500ms consecutive action detection ---
    // Exempt 'send_message' type to avoid false positives from database batching/queueing
    if (action !== 'send_message') {
      for (let i = 0; i < Math.min(logs.length - 1, 10); i++) {
        const t1 = new Date(logs[i].created_at).getTime();
        const t2 = new Date(logs[i + 1].created_at).getTime();
        if (Math.abs(t1 - t2) < 500) {
          spamScore += 50; // Machine-speed activity
          break;
        }
      }
    }

    // --- D. Content quality scoring ---
    if (content) {
      const mentions = countMentions(content);
      const links = countLinks(content);
      const emojis = countEmojis(content);

      if (mentions > 3) spamScore += (mentions - 3) * 20;
      if (links > 2) spamScore += (links - 2) * 30;
      if (emojis > 8) spamScore += (emojis - 8) * 10;

      // --- E. Duplicate content detection (repeat-spam) ---
      const currentHash = computeSimpleHash(content);
      const duplicates = logs
        .slice(1) // skip the record we just inserted (index 0 = most recent)
        .filter((l) => l.content_hash === currentHash);

      if (duplicates.length >= 2) {
        // Exact same message sent 3+ times in 30s window
        spamScore += 70;
      } else if (duplicates.length === 1) {
        spamScore += 30;
      }
    }

    // --- F. Media upload burst ---
    if (action === 'upload_media') {
      const uploadLogs = logs.filter((l) => l.action === 'upload_media');
      if (uploadLogs.length > 3) spamScore += 50;
      if (uploadLogs.length > 6) spamScore += 70; // Instant-flag
    }

    // ─── Step 4: Evaluate and enforce ────────────────────────────────────
    if (spamScore >= SPAM_SCORE_THRESHOLD) {
      console.warn(
        `[ModerationEngine] Spam detected for user ${userId}. Score: ${spamScore}, Action: ${action}, Actions in window: ${totalInWindow}`
      );
      return await escalateViolationState(userId, `Auto-flagged (score: ${spamScore}, actions/30s: ${totalInWindow}, action: ${action})`);
    }

    return { blocked: false };
  } catch (err: any) {
    console.error('[ModerationEngine] recordActivityAndCheckSpam exception:', err.message);
    return { blocked: false };
  }
}

/**
 * Submit a moderation appeal.
 */
export async function submitModerationAppeal(userId: string, reason: string): Promise<void> {
  if (!userId || !reason) return;
  const supabase = createAdminClient();

  try {
    await supabase.from('user_moderation_actions').insert({
      user_id: userId,
      action_type: 'appeal_submitted',
      offense_level: 0,
      reason: `Appeal submitted: ${reason.slice(0, 2000)}`,
      details: { submitted_at: new Date().toISOString() },
    });
  } catch (err: any) {
    console.error('[ModerationEngine] submitModerationAppeal exception:', err.message);
  }
}

// ─── Escalation Logic ────────────────────────────────────────────────────────

async function escalateViolationState(userId: string, reason: string): Promise<ModerationCheckResult> {
  const supabase = createAdminClient();
  const now = new Date();

  // Get current offense count
  const { data: state } = await supabase
    .from('user_moderation_state')
    .select('offense_count')
    .eq('user_id', userId)
    .maybeSingle();

  const prevOffenses = state?.offense_count || 0;
  const nextOffenseCount = prevOffenses + 1;

  // Update moderation state
  const { error: upsertErr } = await supabase
    .from('user_moderation_state')
    .upsert(
      {
        user_id: userId,
        offense_count: nextOffenseCount,
        updated_at: now.toISOString(),
        warned_at: prevOffenses === 0 ? now.toISOString() : undefined,
      },
      { onConflict: 'user_id' }
    );

  if (upsertErr) {
    console.error('[ModerationEngine] State upsert failed:', upsertErr.message);
  }

  // ── Tier 1: Warning (first offense) ──────────────────────────────────────
  if (nextOffenseCount === 1) {
    await supabase.from('user_moderation_actions').insert({
      user_id: userId,
      action_type: 'warning',
      offense_level: 1,
      reason,
      details: { offense_count: 1 },
    });

    return {
      blocked: true,
      warning:
        'Community Guidelines Warning: Your account has been flagged for rapid activity. ' +
        'Continued violations will result in escalating restrictions.',
    };
  }

  // ── Tier 2–5+: Escalating restriction blocks ──────────────────────────────
  const RESTRICTION_TIERS: Record<number, Array<{ type: string; hours: number }>> = {
    2: [
      { type: 'messages', hours: 12 },
      { type: 'calls', hours: 12 },
      { type: 'reactions', hours: 24 },
      { type: 'comments', hours: 48 },
      { type: 'posts', hours: 72 },
      { type: 'stories', hours: 72 },
      { type: 'group_creation', hours: 24 },
      { type: 'communities', hours: 24 },
      { type: 'follows', hours: 24 },
      { type: 'profile_updates', hours: 24 },
    ],
    3: [
      { type: 'messages', hours: 24 },
      { type: 'calls', hours: 24 },
      { type: 'reactions', hours: 48 },
      { type: 'comments', hours: 120 },
      { type: 'posts', hours: 168 },
      { type: 'stories', hours: 168 },
      { type: 'group_creation', hours: 72 },
      { type: 'communities', hours: 72 },
      { type: 'follows', hours: 72 },
      { type: 'profile_updates', hours: 72 },
    ],
    4: [
      { type: 'messages', hours: 72 },
      { type: 'calls', hours: 72 },
      { type: 'reactions', hours: 72 },
      { type: 'comments', hours: 168 },
      { type: 'posts', hours: 336 },
      { type: 'stories', hours: 336 },
      { type: 'group_creation', hours: 168 },
      { type: 'communities', hours: 168 },
      { type: 'follows', hours: 168 },
      { type: 'profile_updates', hours: 168 },
      { type: 'limited_profile', hours: 336 },
    ],
  };

  // Tier 5+: 30-day suspension + manual review
  const isSuspension = nextOffenseCount >= 5;
  const tier = Math.min(nextOffenseCount, 4);
  const blocks =
    RESTRICTION_TIERS[tier] ||
    [
      'messages', 'calls', 'reactions', 'comments', 'posts',
      'stories', 'group_creation', 'limited_profile', 'communities',
      'follows', 'profile_updates'
    ].map((type) => ({ type, hours: 720 })); // 30 days

  const restrictionsToInsert = blocks.map((b) => ({
    user_id: userId,
    restriction_type: b.type,
    expires_at: new Date(now.getTime() + b.hours * 60 * 60 * 1000).toISOString(),
  }));

  const maxExpiry = Math.max(...blocks.map((b) => b.hours));
  const expiresAtStr = new Date(now.getTime() + maxExpiry * 60 * 60 * 1000).toISOString();

  // Insert restrictions into DB
  const { error: insErr } = await supabase
    .from('user_restrictions')
    .insert(restrictionsToInsert);

  if (insErr) {
    console.error('[ModerationEngine] Failed to insert restrictions:', insErr.message);
  }

  // If suspension, set needs_manual_review flag
  if (isSuspension) {
    await supabase
      .from('user_moderation_state')
      .update({ needs_manual_review: true })
      .eq('user_id', userId);
  }

  // Log the action
  await supabase.from('user_moderation_actions').insert({
    user_id: userId,
    action_type: isSuspension ? 'suspension' : 'restriction',
    offense_level: nextOffenseCount,
    reason,
    details: {
      expires_at: expiresAtStr,
      restriction_count: restrictionsToInsert.length,
      is_suspension: isSuspension,
    },
  });

  return {
    blocked: true,
    suspended: isSuspension,
    restrictionInfo: {
      level: nextOffenseCount,
      expiresAt: expiresAtStr,
      needsManualReview: isSuspension,
    },
  };
}

// ─── Utility Helpers ─────────────────────────────────────────────────────────

function computeSimpleHash(text: string): string {
  // Normalize: lowercase, strip whitespace for duplicate detection
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

function countMentions(text: string): number {
  const matches = text.match(/@[a-zA-Z0-9_.]+/g);
  return matches ? matches.length : 0;
}

function countLinks(text: string): number {
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  return matches ? matches.length : 0;
}

function countEmojis(text: string): number {
  try {
    // Unicode property escapes (Node 12+, modern browsers)
    const emojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  } catch {
    // Fallback for environments without unicode property support
    const simpleRegex = /[\u2600-\u27BF]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g;
    const matches = text.match(simpleRegex);
    return matches ? matches.length : 0;
  }
}

/**
 * Calculates an intelligent, automated spam score for a user (0 to 100).
 * Signals are evaluated within moving windows, causing the score to naturally decay.
 */
export async function calculateSpamScore(userId: string): Promise<number> {
  if (!userId) return 0;
  
  const supabase = createAdminClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  let score = 0;
  
  try {
    // 1. Fetch user data (created_at, email, trust_score)
    const { data: user } = await supabase
      .from('users')
      .select('created_at, email, trust_score')
      .eq('id', userId)
      .maybeSingle();
      
    if (user) {
      // 1a. Recently created account
      const accountAgeMs = now.getTime() - new Date(user.created_at).getTime();
      const accountAgeHours = accountAgeMs / (60 * 60 * 1000);
      if (accountAgeHours < 24) {
        score += 30; // High risk for extremely new accounts
      } else if (accountAgeHours < 7 * 24) {
        score += 10;
      }
      
      // 1b. Low account trust
      const trust = user.trust_score ?? 50;
      if (trust < 30) {
        score += 20;
      } else if (trust < 50) {
        score += 10;
      }
      
      // 1c. Disposable accounts
      const email = user.email || '';
      const domain = email.split('@')[1]?.toLowerCase() || '';
      const disposableDomains = ['mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org', 'dispostable.com', 'guerrillamail.com'];
      if (disposableDomains.includes(domain)) {
        score += 30;
      }
    }
    
    // 2. Query activity logs from the last 1 hour
    const { data: logs } = await supabase
      .from('user_activity_logs')
      .select('action, content_hash, recipient_id')
      .eq('user_id', userId)
      .gt('created_at', oneHourAgo);
      
    const recentLogs = logs || [];
    
    // 2a. Rapid new conversations
    const initiatedChats = recentLogs.filter(l => l.action === 'initiate_chat');
    if (initiatedChats.length >= 10) {
      score += 50;
    } else if (initiatedChats.length >= 5) {
      score += 30;
    }
    
    // 2b. Messaging many unknown users
    const uniqueRecipients = new Set(recentLogs.map(l => l.recipient_id).filter(Boolean));
    if (uniqueRecipients.size >= 10) {
      score += 40;
    } else if (uniqueRecipients.size >= 5) {
      score += 20;
    }
    
    // 2c. Repeated identical text
    const textLogs = recentLogs.filter(l => l.content_hash);
    const hashesCount: Record<string, number> = {};
    let maxRepeats = 0;
    for (const tl of textLogs) {
      if (tl.content_hash) {
        hashesCount[tl.content_hash] = (hashesCount[tl.content_hash] || 0) + 1;
        if (hashesCount[tl.content_hash] > maxRepeats) {
          maxRepeats = hashesCount[tl.content_hash];
        }
      }
    }
    if (maxRepeats >= 5) {
      score += 40;
    } else if (maxRepeats >= 3) {
      score += 25;
    }
    
    // 3. Query reports from the last 24 hours
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_user_id', userId)
      .gt('created_at', twentyFourHoursAgo);
      
    const repCount = reportsCount || 0;
    if (repCount >= 5) {
      score += 40;
    } else if (repCount >= 2) {
      score += 20;
    }
    
    // 4. Rate limit violations (last 1 hour)
    const { count: limitViolations } = await supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('created_at', oneHourAgo);
      
    const rateViolations = limitViolations || 0;
    if (rateViolations >= 5) {
      score += 30;
    } else if (rateViolations >= 2) {
      score += 15;
    }
    
    // 5. Decline/Deleted ratio of initiated conversations (last 24 hours)
    const { data: myCreatedConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('creator_id', userId)
      .eq('is_group', false)
      .gt('created_at', twentyFourHoursAgo);
      
    const myConvIds = (myCreatedConvs || []).map(c => c.id);
    if (myConvIds.length > 0) {
      const { data: recipientParticipants } = await supabase
        .from('conversation_participants')
        .select('inbox_state')
        .in('conversation_id', myConvIds)
        .neq('user_id', userId);
        
      const statuses = (recipientParticipants || []).map(p => p.inbox_state);
      const totalRequests = statuses.length;
      const declinedOrDeleted = statuses.filter(s => s === 'DELETED').length;
      if (totalRequests >= 3) {
        const declineRatio = declinedOrDeleted / totalRequests;
        if (declineRatio >= 0.7) {
          score += 30;
        }
      }
    }
  } catch (err: any) {
    console.error('[ModerationEngine] Error calculating spam score:', err.message);
  }
  
  return Math.min(100, Math.max(0, score));
}
