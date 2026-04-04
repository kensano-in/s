'use client';

import { MOCK_COMMUNITIES, MOCK_USERS } from '@/lib/mockData';
import { TrendingUp, Users, UserPlus, UserCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function RightPanel() {
  const { following, toggleFollow, currentUser } = useAppStore();
  const topCommunities = MOCK_COMMUNITIES.slice(0, 4);
  const suggestions = MOCK_USERS.slice(0, 4).filter((u) => u.id !== currentUser?.id);

  return (
    <aside
      className="flex flex-col w-[300px] flex-shrink-0 border-l overflow-y-auto py-4 px-3 gap-4 hide-scrollbar"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      {/* Trending Communities */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} style={{ color: 'var(--v-cyan)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Trending Communities</h3>
        </div>
        <div className="space-y-1">
          {topCommunities.map((c, i) => (
            <Link
              key={c.id}
              href={`/communities/${c.name}`}
              className="flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer hover:bg-surface-high/50"
            >
              <span className="text-lg w-8 text-center flex-shrink-0" aria-hidden="true">{c.iconUrl}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {c.displayName}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {fmt(c.memberCount)} members
                </div>
              </div>
              <span className="text-xs font-bold px-1 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>#{i + 1}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Who to Follow — with persistent follow state */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: 'var(--v-violet)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Who to Follow</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((u) => {
            const isFollowing = following.includes(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3">
                <Link href={`/profile`} className="relative flex-shrink-0" title={`View ${u.displayName}'s profile`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.avatar || '/fallback-avatar.png'}
                    alt={`${u.displayName}'s avatar`}
                    width={36} height={36}
                    className="w-9 h-9 rounded-full object-cover hover:opacity-90 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
                  />
                  {u.isOnline && <span className="online-dot" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link href={`/profile`} className="text-sm font-semibold truncate hover:opacity-80 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                      {u.displayName}
                    </Link>
                    {u.isVerified && (
                      <div className="verified-badge w-3.5 h-3.5 flex-shrink-0" aria-label="Verified">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      </div>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</div>
                </div>
                <button
                  onClick={() => toggleFollow(u.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-200 font-semibold border"
                  style={{
                    background: isFollowing ? 'transparent' : 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))',
                    color: isFollowing ? 'var(--text-secondary)' : 'white',
                    borderColor: isFollowing ? 'var(--border)' : 'transparent',
                  }}
                  title={isFollowing ? `Unfollow ${u.displayName}` : `Follow ${u.displayName}`}
                  id={`follow-btn-${u.id}`}
                >
                  {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
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
