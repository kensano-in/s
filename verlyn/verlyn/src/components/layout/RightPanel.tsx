'use client';

import { MOCK_COMMUNITIES, MOCK_USERS, CURRENT_USER } from '@/lib/mockData';
import { TrendingUp, Users, UserPlus } from 'lucide-react';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function RightPanel() {
  const topCommunities = MOCK_COMMUNITIES.slice(0, 4);
  const suggestions = MOCK_USERS.slice(0, 3).filter((u) => u.id !== CURRENT_USER.id);

  return (
    <aside
      className="hidden xl:flex flex-col w-[300px] flex-shrink-0 border-l overflow-y-auto py-4 px-3 gap-4"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
    >
      {/* Trending Communities */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} style={{ color: 'var(--v-cyan)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Trending Communities</h3>
        </div>
        <div className="space-y-2">
          {topCommunities.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-2 rounded-xl transition-all duration-200 cursor-pointer hover:opacity-90"
            >
              <span className="text-lg w-8 text-center flex-shrink-0">{c.iconUrl}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate group-hover:text-white transition-colors" style={{ color: 'var(--text-primary)' }}>
                  {c.displayName}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {fmt(c.memberCount)} members
                </div>
              </div>
              <span className="text-xs font-bold px-1" style={{ color: 'var(--text-tertiary)' }}>#{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Who to Follow */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} style={{ color: 'var(--v-violet)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Who to Follow</h3>
        </div>
        <div className="space-y-3">
          {suggestions.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.avatar} alt={u.displayName} className="w-9 h-9 rounded-full object-cover" />
                {u.isOnline && <span className="online-dot" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.displayName}</span>
                  {u.isVerified && (
                    <div className="verified-badge w-3.5 h-3.5 flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    </div>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</div>
              </div>
              <button className="btn-glass text-xs px-3 py-1.5 flex-shrink-0">
                <UserPlus size={12} />
                Follow
              </button>
            </div>
          ))}
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
