'use client';

import {
  Search, TrendingUp, Users, Globe, Hash,
  ArrowUpRight, Minus, ArrowDownRight,
  Loader2, X, ChevronRight, ImageIcon, MessageCircle, Heart
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getTrendingHashtags, getDiscoveryPosts, getSuggestedPeople, searchAll } from './actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function Avatar({ src, username, size = 36 }: { src?: string; username?: string; size?: number }) {
  const fallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'default'}`;
  return (
    <img
      src={src || fallback}
      alt={username || 'user'}
      width={size}
      height={size}
      className="rounded-lg object-cover bg-[#1a1a1a] flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'all', label: 'Trending' },
  { id: 'people', label: 'People' },
  { id: 'communities', label: 'Communities' },
  { id: 'media', label: 'Media' },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Trend icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: 'up' | 'stable' | 'down' }) {
  if (trend === 'up') return <ArrowUpRight size={13} className="text-emerald-400 flex-shrink-0" />;
  if (trend === 'down') return <ArrowDownRight size={13} className="text-rose-400 flex-shrink-0" />;
  return <Minus size={13} className="text-neutral-500 flex-shrink-0" />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 px-1 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#1a1a1a] rounded w-1/2" />
        <div className="h-2.5 bg-[#161616] rounded w-1/3" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="aspect-square bg-[#141414] rounded-xl animate-pulse border border-[#1f1f1f]" />;
}

function SkeletonTag() {
  return (
    <div className="flex items-center justify-between py-3 px-1 animate-pulse">
      <div className="h-3 bg-[#1a1a1a] rounded w-24" />
      <div className="h-3 bg-[#1a1a1a] rounded w-16" />
    </div>
  );
}

// ─── Search result sections ───────────────────────────────────────────────────

function SearchResults({
  results,
  onClose,
}: {
  results: Awaited<ReturnType<typeof searchAll>>;
  onClose: () => void;
}) {
  const hasAny =
    results.users.length > 0 ||
    results.posts.length > 0 ||
    results.communities.length > 0 ||
    results.tags.length > 0;

  if (!hasAny) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-neutral-500">No results found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1f1f1f]">
      {/* Users */}
      {results.users.length > 0 && (
        <section>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">People</span>
          </div>
          {results.users.map((u: any) => (
            <Link
              key={u.id}
              href={`/${u.username}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#111] transition-colors"
            >
              <Avatar src={u.avatar_url} username={u.username} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username}</p>
                <p className="text-xs text-neutral-500 truncate">@{u.username}</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-neutral-700 flex-shrink-0" />
            </Link>
          ))}
        </section>
      )}

      {/* Communities */}
      {results.communities.length > 0 && (
        <section>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Communities</span>
          </div>
          {results.communities.map((c: any) => (
            <Link
              key={c.id}
              href={`/communities/${c.id}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#111] transition-colors"
            >
              <div
                className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden bg-[#1a1a1a]"
              >
                {c.icon_url ? (
                  <img src={c.icon_url} className="w-full h-full object-cover" alt={c.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-400">
                    {c.display_name?.[0]?.toUpperCase() || '#'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.display_name || c.name}</p>
                <p className="text-xs text-neutral-500">{fmt(c.member_count || 0)} members</p>
              </div>
              <ChevronRight size={14} className="ml-auto text-neutral-700 flex-shrink-0" />
            </Link>
          ))}
        </section>
      )}

      {/* Posts */}
      {results.posts.length > 0 && (
        <section>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Posts</span>
          </div>
          {results.posts.map((p: any) => (
            <Link
              key={p.id}
              href={`/feed#${p.id}`}
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#111] transition-colors"
            >
              <Avatar src={p.author?.avatar_url} username={p.author?.username} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-300 truncate">@{p.author?.username}</p>
                <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{p.preview}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* Tags */}
      {results.tags.length > 0 && (
        <section>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Tags</span>
          </div>
          {results.tags.map((t: any) => (
            <div
              key={t.tag}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-[#111] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-neutral-600" />
                <span className="text-sm text-white">{t.tag}</span>
              </div>
              <span className="text-xs text-neutral-500">{t.count} posts</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [trending, setTrending] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // ── Load page data ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [trendingData, postsData, peopleData] = await Promise.all([
        getTrendingHashtags(),
        getDiscoveryPosts(),
        getSuggestedPeople(),
      ]);
      if (cancelled) return;
      setTrending(trendingData);
      if (postsData.success) setPosts(postsData.posts);
      setPeople(peopleData);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Load recent searches from localStorage ──────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('explore_recent') || '[]');
      if (Array.isArray(saved)) setRecentSearches(saved.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  // ── Live search with debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchAll(query);
      setSearchResults(results);
      setIsSearching(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setSearchResults(null);
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const next = [query.trim(), ...prev.filter(s => s !== query.trim())].slice(0, 5);
      localStorage.setItem('explore_recent', JSON.stringify(next));
      return next;
    });
  }, [query]);

  const handleRecentClick = useCallback((s: string) => {
    setQuery(s);
    setShowDropdown(true);
    inputRef.current?.focus();
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('explore_recent');
  }, []);

  // ── Filter posts for media tab ──────────────────────────────────────────────
  const mediaPosts = useMemo(() => posts.filter(p => p.mediaUrls?.length > 0), [posts]);

  const isSearchActive = query.trim().length >= 2;

  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-0">

      {/* ─── Search Core ───────────────────────────────────────────────────── */}
      <motion.div layout className="relative pt-4 pb-3 z-30" style={{ position: 'sticky', top: 0, background: '#050505' }}>
        <motion.div 
           layout
           animate={{ scale: showDropdown ? 1.02 : 1 }}
           transition={{ type: "spring", stiffness: 400, damping: 30 }}
           className="relative"
        >
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
          <input
            ref={inputRef}
            id="explore-search-input"
            type="text"
            value={query}
            autoComplete="off"
            spellCheck={false}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
            placeholder="Search users, posts, communities..."
            className="w-full h-11 bg-[#111] border border-[#222] rounded-lg pl-10 pr-10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#3b82f6] transition-colors"
          />
          {query && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </motion.div>

        {/* ─── Search Dropdown ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl overflow-hidden lux-shadow z-50"
            >
            {isSearchActive ? (
              isSearching ? (
                /* Skeleton while loading */
                <div className="px-4 py-2 space-y-0">
                  <div className="px-0 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-700">Searching...</span>
                  </div>
                  {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
                </div>
              ) : searchResults ? (
                <SearchResults results={searchResults} onClose={() => setShowDropdown(false)} />
              ) : null
            ) : (
              /* Recent searches fallback */
              recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">Recent</span>
                    <button onClick={clearRecent} className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors">
                      Clear
                    </button>
                  </div>
                  {recentSearches.map(s => (
                    <button
                      key={s}
                      onClick={() => handleRecentClick(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#111] transition-colors"
                    >
                      <Search size={13} className="text-neutral-700 flex-shrink-0" />
                      <span className="text-sm text-neutral-400">{s}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-5 text-center">
                  <p className="text-xs text-neutral-600">Start typing to search</p>
                </div>
              )
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Tab chips ─────────────────────────────────────────────────────── */}
      {!isSearchActive && (
        <>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 pt-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`explore-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex-shrink-0 text-xs font-medium px-4 h-8 rounded-full transition-colors',
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-[#141414] text-neutral-400 border border-[#222] hover:bg-[#1a1a1a] hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Content sections ─────────────────────────────────────────── */}

          {/* TRENDING TAB */}
          {activeTab === 'all' && (
            <div className="space-y-6 pt-4">

              {/* Trending hashtags */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-neutral-500" />
                  <h2 className="text-sm font-semibold text-white">Trending</h2>
                </div>

                <div className="rounded-xl border border-[#1f1f1f] overflow-hidden divide-y divide-[#1a1a1a]">
                  {loading
                    ? [1, 2, 3, 4, 5].map(i => <div key={i} className="px-4"><SkeletonTag /></div>)
                    : trending.length === 0
                    ? (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-neutral-600">No trending topics yet</p>
                      </div>
                    )
                    : trending.map((t, i) => (
                      <div
                        key={t.tag}
                        className="flex items-center justify-between px-4 py-3 hover:bg-[#111] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-neutral-700 w-4 flex-shrink-0 font-mono">{i + 1}</span>
                          <Hash size={12} className="text-neutral-600 flex-shrink-0" />
                          <span className="text-sm text-white font-medium truncate">{t.tag.replace('#', '')}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <span className="text-xs text-neutral-500">{t.countFmt} posts</span>
                          <TrendIcon trend={t.trend} />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </section>

              {/* Discovery posts grid */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={14} className="text-neutral-500" />
                  <h2 className="text-sm font-semibold text-white">Discover</h2>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="rounded-xl border border-[#1f1f1f] py-12 text-center">
                    <p className="text-sm text-neutral-600">Nothing to discover yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {posts.slice(0, 12).map(p => (
                      <PostTile key={p.id} post={p} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* PEOPLE TAB */}
          {activeTab === 'people' && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-neutral-500" />
                <h2 className="text-sm font-semibold text-white">People</h2>
              </div>
              <div className="rounded-xl border border-[#1f1f1f] overflow-hidden divide-y divide-[#1a1a1a]">
                {loading
                  ? [1,2,3,4,5].map(i => <div key={i} className="px-4"><SkeletonRow /></div>)
                  : people.length === 0
                  ? (
                    <div className="px-4 py-12 text-center">
                      <p className="text-sm text-neutral-600">No users found</p>
                    </div>
                  )
                  : people.map((u: any) => (
                    <Link
                      key={u.id}
                      href={`/${u.username}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors"
                    >
                      <Avatar src={u.avatar_url} username={u.username} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username}</p>
                        <p className="text-xs text-neutral-500 truncate">@{u.username}</p>
                        {u.bio && <p className="text-xs text-neutral-600 truncate mt-0.5">{u.bio}</p>}
                      </div>
                      <ChevronRight size={14} className="text-neutral-700 flex-shrink-0" />
                    </Link>
                  ))
                }
              </div>
            </div>
          )}

          {/* COMMUNITIES TAB */}
          {activeTab === 'communities' && (
            <CommunitiesTab />
          )}

          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={14} className="text-neutral-500" />
                <h2 className="text-sm font-semibold text-white">Media</h2>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : mediaPosts.length === 0 ? (
                <div className="rounded-xl border border-[#1f1f1f] py-12 text-center">
                  <p className="text-sm text-neutral-600">No media posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {mediaPosts.map(p => (
                    <PostTile key={p.id} post={p} forceImage />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Post tile for grid view ──────────────────────────────────────────────────

function PostTile({ post, forceImage }: { post: any; forceImage?: boolean }) {
  const hasImage = post.mediaUrls?.length > 0;

  return (
    <Link
      href={`/feed#${post.id}`}
      className="relative group rounded-xl overflow-hidden border border-[#1f1f1f] bg-[#141414] hover:border-[#2a2a2a] transition-colors"
      style={{ aspectRatio: '1/1' }}
    >
      {hasImage ? (
        <img
          src={post.mediaUrls[0]}
          alt="post"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3">
          <p className="text-xs text-neutral-500 line-clamp-4 text-center leading-relaxed">
            {post.content?.slice(0, 120)}
          </p>
        </div>
      )}

      {/* Hover overlay with stats */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <div className="flex items-center gap-3 text-white text-xs">
          <span className="flex items-center gap-1">
            <Heart size={11} />
            {fmt(post.like_count || 0)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} />
            {fmt(post.comment_count || 0)}
          </span>
        </div>
      </div>

      {/* Author micro-chip */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 bg-black/80 rounded-full px-2 py-1 backdrop-blur-sm">
          <img
            src={post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`}
            className="w-4 h-4 rounded-full"
            alt={post.author?.username}
          />
          <span className="text-[10px] text-white font-medium">@{post.author?.username}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Communities tab (client-side data fetch) ─────────────────────────────────

function CommunitiesTab() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('communities')
      .select('id, name, display_name, description, icon_url, member_count')
      .order('member_count', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!cancelled) {
          setCommunities(data || []);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <div className="pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe size={14} className="text-neutral-500" />
        <h2 className="text-sm font-semibold text-white">Communities</h2>
      </div>
      <div className="rounded-xl border border-[#1f1f1f] overflow-hidden divide-y divide-[#1a1a1a]">
        {loading
          ? [1,2,3,4,5].map(i => <div key={i} className="px-4"><SkeletonRow /></div>)
          : communities.length === 0
          ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-neutral-600">No communities yet</p>
            </div>
          )
          : communities.map((c: any) => (
            <Link
              key={c.id}
              href={`/communities/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                {c.icon_url ? (
                  <img src={c.icon_url} className="w-full h-full object-cover" alt={c.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-neutral-500">
                    {c.display_name?.[0]?.toUpperCase() || '#'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{c.display_name || c.name}</p>
                <p className="text-xs text-neutral-500">{fmt(c.member_count || 0)} members</p>
                {c.description && (
                  <p className="text-xs text-neutral-600 truncate mt-0.5">{c.description}</p>
                )}
              </div>
              <ChevronRight size={14} className="text-neutral-700 flex-shrink-0" />
            </Link>
          ))
        }
      </div>
    </div>
  );
}
