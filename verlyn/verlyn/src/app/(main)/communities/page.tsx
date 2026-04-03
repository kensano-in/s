'use client';

import { useState } from 'react';
import { MOCK_COMMUNITIES } from '@/lib/mockData';
import type { Community } from '@/lib/types';
import { Users, Lock, Zap, Search, Plus, TrendingUp, Star } from 'lucide-react';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const BOOST_COLORS = ['', 'var(--v-cyan)', 'var(--v-violet)', 'var(--v-pink)'];
const BOOST_LABELS = ['', 'Boosted', 'Boosted II', '🔥 Boosted III'];

function CommunityCard({ c }: { c: Community }) {
  const [joined, setJoined] = useState<boolean>(c.isJoined ?? false);

  return (
    <div className="glass-card p-4 hover:border-opacity-40 transition-all duration-200 shine">
      {/* Banner placeholder */}
      <div
        className="h-20 rounded-xl mb-4 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, var(--v-violet) 0%, var(--v-cyan) 100%)`, opacity: 0.7 }}
      >
        {c.boostLevel > 0 && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', color: BOOST_COLORS[c.boostLevel], border: `1px solid ${BOOST_COLORS[c.boostLevel]}` }}
          >
            {BOOST_LABELS[c.boostLevel]}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 -mt-8 relative border-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)' }}
        >
          {c.iconUrl}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.displayName}</h3>
            {c.isPrivate && <Lock size={12} style={{ color: 'var(--text-tertiary)' }} />}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {fmt(c.memberCount)} members
          </div>
        </div>
      </div>

      <p className="text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {c.description}
      </p>

      {/* Tags */}
      {c.tags && (
        <div className="flex flex-wrap gap-1 mt-2">
          {c.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--v-violet-light)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Join button */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setJoined((v) => !v)}
          className={joined ? 'btn-glass flex-1 text-xs' : 'btn-primary flex-1 text-xs shine'}
          id={`join-btn-${c.id}`}
        >
          {joined ? 'Joined ✓' : <><Plus size={12} /> Join</>}
        </button>
        {c.boostLevel < 3 && (
          <button className="btn-glass text-xs px-3 flex-shrink-0" style={{ color: 'var(--v-pink)' }}>
            <Zap size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  const [filter, setFilter] = useState<'all' | 'joined' | 'trending'>('all');
  const filtered = MOCK_COMMUNITIES.filter((c) => {
    if (filter === 'joined') return c.isJoined;
    if (filter === 'trending') return c.memberCount > 100_000;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">Communities</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Discover spaces built around what you love
          </p>
        </div>
        <button className="btn-primary text-sm shine" id="create-community-btn">
          <Plus size={15} />
          Create
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input placeholder="Search communities…" className="v-input pl-11" id="community-search" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All', icon: Users },
          { key: 'joined', label: 'Joined', icon: Star },
          { key: 'trending', label: 'Trending', icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200`}
            style={{
              background: filter === key ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' : 'var(--surface)',
              color: filter === key ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filter === key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((c, i) => (
          <div
            key={c.id}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            <CommunityCard c={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
