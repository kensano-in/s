'use client';

import { TrendingUp, Users, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface RealUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
}

export default function RightPanel() {
  const { following, toggleFollow, currentUser } = useAppStore();
  const [suggestedUsers, setSuggestedUsers] = useState<RealUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadSuggestions() {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      // Fetch real users from DB, excluding self
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, is_verified, follower_count')
        .neq('id', currentUser.id)
        .order('follower_count', { ascending: false })
        .limit(5);

      setSuggestedUsers((data || []) as RealUser[]);
      setLoading(false);
    }

    loadSuggestions();
  }, [currentUser?.id, supabase]);

  return (
    <aside
      className="flex flex-col w-[300px] flex-shrink-0 border-l overflow-y-auto py-4 px-3 gap-4 hide-scrollbar"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      {/* Who to Follow — Real users only */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: 'var(--v-violet)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Who to Follow</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-primary-light" />
          </div>
        ) : suggestedUsers.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-on-surface-variant">No suggestions yet</p>
            <p className="text-[11px] text-on-surface-variant/60 mt-1">Invite friends to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestedUsers.map((u) => {
              const isFollowing = following.includes(u.id);
              return (
                <div key={u.id} className="flex items-center gap-3">
                  <Link href={`/profile/${u.username}`} className="relative flex-shrink-0" title={`View ${u.display_name}'s profile`}>
                    <img
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                      alt={`${u.display_name}'s avatar`}
                      width={36} height={36}
                      className="w-9 h-9 rounded-full object-cover hover:opacity-90 transition-opacity bg-surface-low"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`; }}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Link href={`/profile/${u.username}`} className="text-sm font-semibold truncate hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                        {u.display_name || u.username}
                      </Link>
                      {u.is_verified && (
                        <div className="verified-badge w-3.5 h-3.5 flex-shrink-0" aria-label="Verified">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      @{u.username} · {fmt(u.follower_count || 0)} followers
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(u.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-200 font-semibold border"
                    style={{
                      background: isFollowing ? 'transparent' : 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))',
                      color: isFollowing ? 'var(--text-secondary)' : 'white',
                      borderColor: isFollowing ? 'var(--border)' : 'transparent',
                    }}
                    title={isFollowing ? `Unfollow ${u.display_name}` : `Follow ${u.display_name}`}
                    id={`follow-btn-${u.id}`}
                  >
                    {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform info */}
      <div className="glass-card p-4">
        <div className="text-xs font-semibold mb-2.5 gradient-text">Verlyn Platform</div>
        <div className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
          <div>✦ verlyn.in</div>
          <div>✦ End-to-End Encrypted</div>
          <div>✦ Zero tracking · Your data, your rules</div>
        </div>
        <div className="v-divider my-3" />
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Built with ❤️ by{' '}
          <a href="https://instagram.com/shinichiro.2" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--v-violet-light)' }}>
            @shinichiro.2
          </a>
        </div>
      </div>
    </aside>
  );
}
