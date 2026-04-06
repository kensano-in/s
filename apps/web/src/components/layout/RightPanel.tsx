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
          <div className="flex flex-col gap-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-surface-lowest border border-outline-variant/10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-lowest rounded-full w-24"></div>
                  <div className="h-2 bg-surface-lowest rounded-full w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : suggestedUsers.length === 0 ? (
          <div className="py-8 text-center bg-surface-lowest/50 rounded-2xl border border-outline-variant/10">
            <p className="text-xs font-semibold text-on-surface-variant">No signals found</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-1 uppercase tracking-widest">Network is empty</p>
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

      {/* Futuristic Cyber-Footer */}
      <div className="mt-2 glass-card p-5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-light/50 to-transparent opacity-30" />
        <div className="absolute -inset-24 bg-gradient-to-br from-primary-light/10 via-transparent to-v-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <h3 className="text-[13px] font-display font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
              Verlyn platform • <a href="https://verlyn.in" target="_blank" rel="noopener noreferrer" className="hover:text-primary-light transition-colors">Verlyn.in</a>
            </h3>
          </div>
          
          <div className="text-[11px] font-mono leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex items-center gap-1.5 mb-1 text-on-surface-variant">
              Built with <span className="text-white hover:scale-125 transition-transform cursor-crosshair">🤍</span> <span className="text-outline-variant/40 mx-1">|</span> Signal Protocol E2EE
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-v-cyan opacity-80">▸</span> WebRTC Voice / Video
            </div>
          </div>
          
          <div className="v-divider !my-3 opacity-50" />
          
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold tracking-widest uppercase text-primary-light/80">
              V0.1.0-alpha
            </div>
            <div className="text-[10px] font-mono text-on-surface-variant/50">
              [ 2026 ]
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
