'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Flame, Hash, Loader2, Users, ArrowUpRight, ArrowRight, ArrowDownRight, Radio } from 'lucide-react';
import type { Post, Community } from '@/lib/types';
import PostCard from '@/components/features/feed/PostCard';
import { motion, AnimatePresence } from 'framer-motion';
import KineticIcon from '@/components/ui/KineticIcon';
import clsx from 'clsx';
import Link from 'next/link';

interface TrendingTopic {
  tag: string;
  posts: number;
  change: string;
  trend: 'up' | 'stable' | 'down';
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);
    let reqId: number;
    
    // reset start on new value if we want to animate again, but usually just up
    
    const animate = () => {
      start += increment;
      if (start < value) {
        setDisplayValue(Math.floor(start));
        reqId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    
    reqId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(reqId);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState<'topics' | 'communities' | 'posts'>('topics');
  
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  const loadTrendingData = useCallback(async (isAuto = false) => {
    if (isAuto) setIsRefreshing(true);

    try {
      // Fetch trending communities
      const { data: comms } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(10);

      if (comms) {
        setTrendingCommunities(comms.map((c: any) => ({
          id: c.id,
          name: c.name,
          displayName: c.display_name,
          description: c.description,
          iconUrl: c.icon_url,
          memberCount: c.member_count,
          isPrivate: c.is_private,
          boostLevel: c.boost_level,
          createdAt: c.created_at,
        })));
      }

      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, content, media_urls, like_count, comment_count, share_count, created_at,
          author:users!posts_author_id_fkey ( id, username, display_name, avatar_url, is_verified, role )
        `)
        .gte('created_at', cutoff)
        .order('like_count', { ascending: false })
        .limit(50);

      if (posts) {
        posts.sort((a: any, b: any) =>
          ((b.like_count || 0) + (b.comment_count || 0) * 2 + (b.share_count || 0) * 3) -
          ((a.like_count || 0) + (a.comment_count || 0) * 2 + (a.share_count || 0) * 3)
        );

        setTrendingPosts(posts.map((p: any) => ({
          id: p.id,
          content: p.content,
          mediaUrls: p.media_urls || [],
          postType: (p.media_urls && p.media_urls.length > 0) ? 'image' : 'text',
          likeCount: p.like_count || 0,
          commentCount: p.comment_count || 0,
          shareCount: p.share_count || 0,
          createdAt: p.created_at,
          author: {
            id: p.author?.id,
            username: p.author?.username,
            displayName: p.author?.display_name,
            avatar: p.author?.avatar_url,
            isVerified: p.author?.is_verified,
            role: p.author?.role || 'PUBLIC',
          } as any
        })));

        const tagCounts: Record<string, number> = {};
        posts.forEach((p: any) => {
          if (!p.content) return;
          const tags = p.content.match(/#[a-zA-Z0-9_]+/g);
          if (tags) {
            tags.forEach((tag: string) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          }
        });

        const sortedTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);
        
        if (sortedTags.length > 0) {
           setTrendingTopics(sortedTags.map(([tag, count]) => {
              const trends: ('up' | 'stable' | 'down')[] = ['up', 'stable', 'up', 'down'];
              const trend = count > 10 ? 'up' : (count > 5 ? trends[Date.now() % 4] : 'stable');
              const changeAmount = Math.floor(Math.random() * 20) + 1;
              const changeStr = trend === 'up' ? `+${changeAmount}%` : trend === 'down' ? `-${changeAmount}%` : `0%`;
              
              return {
                 tag,
                 posts: count,
                 change: changeStr,
                 trend
              };
           }));
        } else {
           setTrendingTopics([
              { tag: '#Verlyn', posts: 12450, change: '+18%', trend: 'up' },
              { tag: '#Design', posts: 8120, change: '0%', trend: 'stable' },
              { tag: '#Community', posts: 3450, change: '-5%', trend: 'down' },
           ]);
        }
      } else {
         setTrendingTopics([
            { tag: '#Verlyn', posts: 12450, change: '+18%', trend: 'up' },
            { tag: '#Design', posts: 8120, change: '0%', trend: 'stable' },
            { tag: '#Community', posts: 3450, change: '-5%', trend: 'down' },
         ]);
      }
    } catch {
      console.error("Signal Engine offline");
    } finally {
      setLoading(false);
      if (isAuto) setIsRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTrendingData();
    const interval = setInterval(() => {
      if (!document.hidden) loadTrendingData(true);
    }, 30000); // 30s live refresh
    return () => clearInterval(interval);
  }, [loadTrendingData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 opacity-40">
        <Loader2 size={32} className="animate-spin mb-6 text-v-cyan shadow-[0_0_20px_var(--v-cyan)]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">Connecting Signal Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-32 space-y-10 animate-fade-in italic">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-b border-[#262626] pb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-4 mb-2">
            Trending
            <span className="live-dot w-3 h-3 bg-rose-500 rounded-full" title="Live Refresh Active" />
          </h1>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <Radio size={14} className="text-v-cyan" />
            Global Signal Detector 
            {isRefreshing && <Loader2 size={10} className="animate-spin text-v-cyan" />}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-[#121212] rounded-xl border border-[#262626] overflow-x-auto custom-scrollbar">
          {(['topics', 'communities', 'posts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative flex-shrink-0',
                activeTab === tab ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="trendingTabBg"
                  className="absolute inset-0 bg-[#262626] rounded-lg lux-shadow z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          
          {/* TOPICS TAB */}
          {activeTab === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden divide-y divide-[#262626]">
                {trendingTopics.map((t, i) => (
                  <motion.div
                    key={t.tag}
                    layout // Animate sorting changes
                    className="stagger-item flex items-center gap-6 p-5 hover:bg-[#1A1A1A] cursor-pointer transition-colors"
                  >
                    <span className="text-xl font-black w-8 text-center text-neutral-600 opacity-50">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-lg font-black tracking-tight text-white uppercase">{t.tag}</div>
                      <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">
                        <AnimatedNumber value={t.posts} /> posts
                      </div>
                    </div>
                    <div className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest",
                      t.trend === 'up' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                      t.trend === 'down' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : 
                      "bg-neutral-800 text-neutral-400 border-neutral-700"
                    )}>
                      {t.trend === 'up' && <ArrowUpRight size={14} />}
                      {t.trend === 'down' && <ArrowDownRight size={14} />}
                      {t.trend === 'stable' && <ArrowRight size={14} />}
                      {t.change}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* COMMUNITIES TAB */}
          {activeTab === 'communities' && (
            <motion.div
              key="communities"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {trendingCommunities.map((c, i) => (
                <div key={c.id} className="stagger-item">
                  <Link href={`/communities/${c.id}`} className="community-card flex items-center gap-4 p-5 rounded-2xl bg-[#121212] border border-[#262626] group">
                    <div className="w-14 h-14 rounded-[16px] overflow-hidden border border-white/5 group-hover:border-v-cyan/50 transition-colors">
                      {c.iconUrl ? (
                        <img src={c.iconUrl} alt="icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
                          <Users size={20} className="text-neutral-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-white uppercase tracking-tight text-lg group-hover:text-v-cyan transition-colors">{c.displayName}</div>
                      <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                        <AnimatedNumber value={c.memberCount || 0} /> members
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/5 text-white/50 text-[10px] font-black uppercase tracking-widest group-hover:bg-v-cyan group-hover:text-black transition-all">
                      View
                    </div>
                  </Link>
                </div>
              ))}
            </motion.div>
          )}

          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="columns-1 md:columns-2 gap-6 space-y-6"
            >
              {trendingPosts.map((p, i) => (
                <div key={p.id} className="stagger-item break-inside-avoid">
                  <PostCard post={p} />
                </div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
