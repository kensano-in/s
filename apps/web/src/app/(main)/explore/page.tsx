'use client';

import { useState } from 'react';
import { MOCK_POSTS, MOCK_USERS, MOCK_COMMUNITIES } from '@/lib/mockData';
import { Search, TrendingUp, Users, Hash, FileText, X } from 'lucide-react';
import PostCard from '@/components/features/feed/PostCard';

const TRENDING_TAGS = ['#WebRTC', '#Elixir', '#DesignSystems', '#PrivacyFirst', '#OpenSource', '#AI', '#BEAM', '#Signal'];

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'top' | 'people' | 'communities' | 'posts'>('top');

  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-black gradient-text">Explore</h1>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          id="explore-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Verlyn — people, posts, communities…"
          className="v-input pl-11 pr-10"
        />
        {hasQuery && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn" onClick={() => setQuery('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {hasQuery ? (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
            {([
              { key: 'top', label: 'Top', icon: TrendingUp },
              { key: 'people', label: 'People', icon: Users },
              { key: 'communities', label: 'Communities', icon: Hash },
              { key: 'posts', label: 'Posts', icon: FileText },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative`}
                style={{ color: activeTab === key ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                <Icon size={14} />
                {label}
                {activeTab === key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--v-violet)' }} />
                )}
              </button>
            ))}
          </div>

          {/* People results */}
          {(activeTab === 'top' || activeTab === 'people') && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                People
              </div>
              {MOCK_USERS.slice(0, 3).map((u) => (
                <div key={u.id} className="glass-card flex items-center gap-3 p-3">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u.avatar} alt={u.displayName} className="w-10 h-10 rounded-full object-cover" />
                    {u.isOnline && <span className="online-dot" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{u.displayName}</span>
                      {u.isVerified && <div className="verified-badge w-3.5 h-3.5"><svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username} · {(u.followerCount / 1000).toFixed(1)}K followers</div>
                  </div>
                  <button className="btn-primary text-xs px-3 py-1.5 shine">Follow</button>
                </div>
              ))}
            </div>
          )}

          {/* Communities results */}
          {(activeTab === 'top' || activeTab === 'communities') && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3 mt-4" style={{ color: 'var(--text-tertiary)' }}>
                Communities
              </div>
              {MOCK_COMMUNITIES.slice(0, 2).map((c) => (
                <div key={c.id} className="glass-card flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--surface)' }}>{c.iconUrl}</div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.displayName}</span>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{(c.memberCount / 1000).toFixed(0)}K members</div>
                  </div>
                  <button className="btn-glass text-xs px-3 py-1.5">{c.isJoined ? 'Joined' : 'Join'}</button>
                </div>
              ))}
            </div>
          )}

          {/* Post results */}
          {(activeTab === 'top' || activeTab === 'posts') && (
            <div className="space-y-3 mt-4">
              {MOCK_POSTS.slice(0, 2).map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Trending Hashtags */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: 'var(--v-cyan)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trending Topics</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'rgba(108,99,255,0.1)',
                    color: 'var(--v-violet-light)',
                    border: '1px solid rgba(108,99,255,0.2)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested posts */}
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Suggested For You
          </div>
          <div className="space-y-4">
            {MOCK_POSTS.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
