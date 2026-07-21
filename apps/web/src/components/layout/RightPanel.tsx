'use client';

import { Users, Loader2, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { getAvatarUrl } from '@/lib/utils';
import { getSuggestedPeople } from '@/app/(main)/explore/actions';

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
  recent_post?: string;
}

interface PopularPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  like_count: number;
}

export default function RightPanel() {
  const pathname = usePathname();
  const isTrending = pathname.startsWith('/trending');

  const following = useAppStore(s => s.following);
  const toggleFollow = useAppStore(s => s.toggleFollow);
  const currentUser = useAppStore(s => s.currentUser);

  const [suggestedUsers, setSuggestedUsers] = useState<RealUser[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Users: use server action which filters blocked users
        const users = await getSuggestedPeople();
        setSuggestedUsers((users || []) as any);

        if (isTrending) {
          // Popular posts for visual grid
          const { data: posts } = await supabase
            .from('posts')
            .select('id, content, media_urls, like_count')
            .order('like_count', { ascending: false })
            .limit(6);
          setPopularPosts((posts || []) as PopularPost[]);
        }
      } catch { }
      setLoading(false);
    }
    loadData();
  }, [currentUser?.id, isTrending, supabase]);

  const visibleSuggestions = useMemo(() => {
    return suggestedUsers.filter((u) => u.id !== currentUser?.id);
  }, [suggestedUsers, currentUser?.id]);

  return (
    <aside className="hidden lg:flex flex-col w-[320px] h-full flex-shrink-0 border-l border-white/[0.03] bg-[#060608]/50 backdrop-blur-3xl overflow-y-auto py-8 px-6 gap-8 hide-scrollbar">

      {isTrending ? (
        /* ── TRENDING ROUTE: Popular Visuals ── */
        <>
          {/* Popular Visuals */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: '0 0 6px #a78bfa' }} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Popular Visuals</h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-8 opacity-30">
                <Loader2 size={16} className="animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {popularPosts.slice(0, 4).map((p) => (
                  <Link key={p.id} href={`/feed/${p.id}`}>
                    <div className="aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.05] hover:border-white/[0.12] transition-all group relative">
                      {p.media_urls && p.media_urls[0] ? (
                        <img
                          src={p.media_urls[0]}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-end p-2">
                          <p className="text-[9px] text-white/40 line-clamp-4 leading-relaxed font-normal">
                            {p.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        /* ── EXPLORE ROUTE: Who to Follow + Trending Tags ── */
        <>
          {/* Who to Follow */}
          <section className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-white/30" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Who to Follow</h3>
              </div>
              <Link href="/explore" className="text-[9px] font-bold uppercase tracking-widest text-white/25 hover:text-white/50 transition-colors">
                See All
              </Link>
            </div>

            <div className="space-y-1">
              {loading ? (
                <div className="flex justify-center py-8 opacity-30"><Loader2 size={16} className="animate-spin" /></div>
              ) : (
                visibleSuggestions.map((u) => {
                  const isFollowingUser = following.includes(u.id);
                  return (
                    <div key={u.id} className="group flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                      <Link href={`/profile/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={getAvatarUrl(u.username, u.avatar_url)}
                          className="w-8 h-8 rounded-lg object-cover border border-white/[0.06] flex-shrink-0"
                          alt={u.display_name}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[12px] font-semibold text-white/80 truncate tracking-tight">{u.display_name}</span>
                            {u.is_verified && <ShieldCheck size={9} className="text-emerald-400 flex-shrink-0" />}
                          </div>
                          <span className="text-[10px] text-white/30 font-normal">@{u.username}</span>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleFollow(u.id)}
                        className={clsx(
                          'flex-shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all',
                          isFollowingUser
                            ? 'bg-white/5 text-white/30 border border-white/[0.06] hover:bg-white/10'
                            : 'bg-white text-black hover:bg-neutral-200 active:scale-95'
                        )}
                      >
                        {isFollowingUser ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </aside>
  );
}
