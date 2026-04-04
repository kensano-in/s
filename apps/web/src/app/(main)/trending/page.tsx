'use client';

import { MOCK_POSTS, MOCK_COMMUNITIES } from '@/lib/mockData';
import PostCard from '@/components/features/feed/PostCard';
import { TrendingUp, Flame, Hash } from 'lucide-react';

const TRENDING_TOPICS = [
  { tag: '#WebRTC', posts: 14_200, change: '+42%' },
  { tag: '#Elixir', posts: 8_900, change: '+28%' },
  { tag: '#DesignSystems', posts: 22_100, change: '+61%' },
  { tag: '#PrivacyFirst', posts: 6_300, change: '+18%' },
  { tag: '#E2EE', posts: 5_100, change: '+35%' },
  { tag: '#VerlyLaunch', posts: 31_000, change: '+120%' },
];

export default function TrendingPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <TrendingUp size={22} style={{ color: 'var(--v-cyan)' }} />
        <h1 className="text-2xl font-black gradient-text">Trending</h1>
      </div>

      {/* Trending Topics */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} style={{ color: 'var(--v-orange)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trending Topics Right Now</h2>
        </div>
        <div className="space-y-1">
          {TRENDING_TOPICS.map((t, i) => (
            <div
              key={t.tag}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 hover:opacity-90"
              style={{ background: i === 0 ? 'rgba(108,99,255,0.08)' : 'transparent' }}
            >
              <span className="text-lg font-black w-6 text-center flex-shrink-0" style={{ color: i < 3 ? 'var(--v-orange)' : 'var(--text-tertiary)' }}>
                {i + 1}
              </span>
              <Hash size={14} style={{ color: 'var(--v-violet-light)', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t.tag}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(t.posts / 1000).toFixed(1)}K posts</div>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--v-green)' }}>{t.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Communities */}
      <div className="glass-card p-5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="font-bold text-sm mb-4 relative z-10" style={{ color: 'var(--text-primary)' }}>🔥 Fastest Growing Communities</h2>
        <div className="space-y-3 pb-2 relative z-10">
          {MOCK_COMMUNITIES.filter((c) => c.boostLevel >= 2).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-lowest/50 border border-outline-variant/10 cursor-pointer hover:bg-surface-low transition-all duration-300">
              <span className="text-2xl drop-shadow-md">{c.iconUrl}</span>
              <div className="flex-1">
                <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{c.displayName}</div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{(c.memberCount / 1000).toFixed(0)}K members</div>
              </div>
              <button className="primary-btn text-[11px] px-4 py-1.5 shadow-[0_0_10px_var(--primary-glow)]">Join</button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Posts */}
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        Top Posts This Week
      </div>
      <div className="space-y-4">
        {[...MOCK_POSTS].sort((a, b) => b.likeCount - a.likeCount).map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
