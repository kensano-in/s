'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Search, TrendingUp, Users, FileText, X, Loader2, UserPlus, UserCheck, Hash } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface DBUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  follower_count: number;
  role: string;
}

interface DBPost {
  id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  author: DBUser | null;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type Tab = 'top' | 'people' | 'posts';

// Inner component uses useSearchParams — must be inside <Suspense>
function ExploreInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>('top');
  const [users, setUsers] = useState<DBUser[]>([]);
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  const hasQuery = query.trim().length > 0;

  // Search both users + posts from real DB
  useEffect(() => {
    async function runSearch() {
      if (!hasQuery) {
        // No query: fetch recent posts and recent users for discovery
        setLoading(true);
        const [{ data: recentPosts }, { data: recentUsers }] = await Promise.all([
          supabase.from('posts').select('*, author:users(*)').order('created_at', { ascending: false }).limit(20),
          supabase.from('users').select('*').order('created_at', { ascending: false }).limit(10),
        ]);
        setPosts((recentPosts || []) as unknown as DBPost[]);
        setUsers((recentUsers || []) as DBUser[]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = query.trim();

      const [{ data: matchedUsers }, { data: matchedPosts }] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(10),
        supabase
          .from('posts')
          .select('*, author:users(*)')
          .ilike('content', `%${q}%`)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setUsers((matchedUsers || []) as DBUser[]);
      setPosts((matchedPosts || []) as unknown as DBPost[]);
      setLoading(false);
    }

    const debounce = setTimeout(runSearch, 300);
    return () => clearTimeout(debounce);
  }, [query, hasQuery, supabase]);

  const toggleFollow = (uid: string) => {
    setFollowedIds(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-black gradient-text">Explore</h1>

      {/* Premium Search Bar — inline in explore */}
      <div className="relative group">
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none opacity-0 group-focus-within:opacity-100"
          style={{
            background: 'linear-gradient(135deg, rgba(147,51,234,0.5), rgba(79,209,197,0.5))',
            padding: '1px', borderRadius: '16px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          }}
        />
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary-light transition-colors pointer-events-none" />
        <input
          id="explore-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users, posts…"
          autoComplete="off"
          className="w-full py-3 pl-12 pr-10 rounded-2xl text-[15px] font-medium focus:outline-none transition-all duration-300 shadow-ambient"
          style={{
            background: 'rgba(20,20,30,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.95)',
            caretColor: 'rgba(167,139,250,1)',
            backdropFilter: 'blur(16px)',
          }}
          onFocus={(e) => {
            e.target.style.background = 'rgba(147,51,234,0.08)';
            e.target.style.border = '1px solid rgba(167,139,250,0.5)';
            e.target.style.boxShadow = '0 0 20px rgba(147,51,234,0.2)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onBlur={(e) => {
            e.target.style.background = 'rgba(20,20,30,0.4)';
            e.target.style.border = '1px solid rgba(255,255,255,0.08)';
            e.target.style.boxShadow = 'none';
            e.target.style.transform = 'translateY(0px)';
          }}
        />
        {hasQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={11} color="white" />
          </button>
        )}
      </div>

      {/* Tabs — only when searching */}
      {hasQuery && (
        <div className="flex gap-1 border-b border-outline-variant/15">
          {([
            { key: 'top', label: 'All', icon: TrendingUp },
            { key: 'people', label: 'People', icon: Users },
            { key: 'posts', label: 'Posts', icon: FileText },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors relative"
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
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-primary-light" />
        </div>
      )}

      {!loading && (
        <>
          {/* PEOPLE */}
          {(activeTab === 'top' || activeTab === 'people') && users.length > 0 && (
            <div className="space-y-2">
              {hasQuery && (
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  People
                </div>
              )}
              {!hasQuery && (
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Discover People
                </div>
              )}
              {users.map((u) => {
                const isFollowing = followedIds.has(u.id);
                return (
                  <div key={u.id} className="glass-card flex items-center gap-3 p-3">
                    <Link href="/profile" className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                        alt={u.display_name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-on-surface truncate">{u.display_name || u.username}</div>
                      <div className="text-xs text-on-surface-variant">@{u.username} · {fmt(u.follower_count || 0)} followers</div>
                    </div>
                    <button
                      onClick={() => toggleFollow(u.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-200 font-semibold border"
                      style={{
                        background: isFollowing ? 'transparent' : 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))',
                        color: isFollowing ? 'var(--text-secondary)' : 'white',
                        borderColor: isFollowing ? 'var(--border)' : 'transparent',
                      }}
                    >
                      {isFollowing ? <><UserCheck size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* POSTS */}
          {(activeTab === 'top' || activeTab === 'posts') && posts.length > 0 && (
            <div className="space-y-3">
              {hasQuery && (
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Posts
                </div>
              )}
              {!hasQuery && (
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Recent Posts
                </div>
              )}
              {posts.map((p) => (
                <div key={p.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author?.username || 'user'}`}
                      alt={p.author?.display_name || 'User'}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.svg'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-on-surface">{p.author?.display_name || p.author?.username || 'Unknown'}</div>
                      <div className="text-xs text-on-surface-variant">@{p.author?.username} · {timeAgo(p.created_at)}</div>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed">{p.content}</p>
                  {p.media_urls?.length > 0 && (
                    <div className={`grid gap-2 ${p.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {p.media_urls.slice(0, 4).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="Post media" className="w-full rounded-xl object-cover" style={{ maxHeight: 280 }} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-on-surface-variant">
                    <span>❤️ {fmt(p.like_count)}</span>
                    <span>💬 {fmt(p.comment_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && users.length === 0 && posts.length === 0 && (
            <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
              <Hash size={40} className="text-primary-light opacity-40" />
              <h3 className="text-lg font-bold text-on-surface">
                {hasQuery ? `No results for "${query}"` : 'Nothing yet'}
              </h3>
              <p className="text-sm text-on-surface-variant max-w-xs">
                {hasQuery ? 'Try a different search term.' : 'Be the first to post and explore the community.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Default export wraps inner component in Suspense (required by Next.js for useSearchParams)
export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary-light" />
      </div>
    }>
      <ExploreInner />
    </Suspense>
  );
}
