'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Flame, Hash, Loader2, Zap, Radio, Globe, Sparkles, Activity, ShieldCheck, Users } from 'lucide-react';
import type { Post, Community } from '@/lib/types';
import PostCard from '@/components/features/feed/PostCard';
import { motion, AnimatePresence } from 'framer-motion';
import KineticIcon from '@/components/ui/KineticIcon';
import clsx from 'clsx';

interface TrendingTopic {
  tag: string;
  posts: number;
  change: string;
}

export default function TrendingPage() {
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadTrendingData() {
      // Fetch trending communities
      const { data: comms } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(5);

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

      // Phase 8: Engagement-score ranking (likes + 2×comments + 3×shares), last 48h
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, content, media_urls, like_count, comment_count, share_count, created_at,
          users ( id, username, display_name, avatar_url, is_verified, role )
        `)
        .gte('created_at', cutoff)
        .order('like_count', { ascending: false })
        .limit(50);

      // Sort by computed engagement score client-side
      if (posts) posts.sort((a: any, b: any) =>
        ((b.like_count || 0) + (b.comment_count || 0) * 2 + (b.share_count || 0) * 3) -
        ((a.like_count || 0) + (a.comment_count || 0) * 2 + (a.share_count || 0) * 3)
      );

      if (posts) {
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
            id: p.users?.id,
            username: p.users?.username,
            displayName: p.users?.display_name,
            avatar: p.users?.avatar_url,
            isVerified: p.users?.is_verified,
            role: p.users?.role || 'PUBLIC',
          } as any
        })));

        // Extract and calculate trending hashtags organically
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

        // Convert to array and sort
        const topTags = Object.entries(tagCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([tag, count]) => ({
            tag,
            posts: count,
            change: `${count} post${count !== 1 ? 's' : ''}`
          }));

        // Fallback if the database is too empty
        if (topTags.length === 0) {
          setTrendingTopics([
            { tag: '#VerlynHQ', posts: 104, change: '+24%' },
            { tag: '#Welcome', posts: 89, change: '+12%' },
            { tag: '#Global', posts: 41, change: '+5%' }
          ]);
        } else {
          setTrendingTopics(topTags);
        }
      }

      setLoading(false);
    }
    loadTrendingData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary-light" />
      </div>
    );
  }

  return (    <div className="space-y-12 animate-fade-in pb-32 max-w-7xl mx-auto p-6 italic">
      
      {/* Neural Wave Header HUD */}
      <div className="glass-card p-12 bg-surface-lowest/40 border-none rounded-[60px] shadow-[0_0_100px_rgba(255,100,0,0.05)] relative overflow-hidden group">
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(var(--v-orange) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
         <div className="absolute -inset-20 bg-v-orange/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px] -z-10" />
         
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 w-full space-y-4">
                <div className="flex items-center gap-3 opacity-60 mb-2">
                    <KineticIcon icon={Activity} size={14} color="var(--v-orange)" pulse active />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Trend_Analysis_Active</span>
                </div>
                <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-6">Trending <br/><span className="text-v-orange">Topics</span></h1>
                <p className="text-sm font-bold text-on-surface-variant opacity-60 max-w-xl italic">High-resonance signals being modulated across the Verlyn collective in the last 48 cycles.</p>
            </div>
            
            <div className="hidden lg:flex items-center justify-center relative">
                 <div className="w-64 h-64 border-4 border-white/5 rounded-full relative flex items-center justify-center">
                     <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-2 border-[1px] border-dashed border-v-orange/20 rounded-full" 
                     />
                     <div className="absolute inset-10 border-[1px] border-v-orange/10 rounded-full animate-pulse" />
                     <KineticIcon icon={Flame} size={60} color="var(--v-orange)" active pulse glow />
                 </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* WAVE TRENDS (LEFT) */}
        <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
                <KineticIcon icon={TrendingUp} size={18} color="var(--v-orange)" pulse />
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic leading-none">High_Resonance_Tags</h3>
                    <span className="text-[7px] font-black tracking-[0.2em] text-on-surface-variant opacity-40 uppercase">Global Signal Modulation</span>
                </div>
            </div>
            
            <div className="glass-card p-4 space-y-1">
              <AnimatePresence initial={false}>
              {trendingTopics.map((t, i) => (
                <motion.div
                  key={t.tag}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-4 p-5 rounded-[28px] cursor-pointer transition-all duration-300 hover:bg-white/[0.03] border border-transparent hover:border-white/5 italic"
                >
                  <span className="text-2xl font-black italic tracking-tighter w-8 text-center text-v-orange/40 group-hover:text-v-orange transition-colors">
                    {i + 1}
                  </span>
                  <div className="relative">
                    <KineticIcon icon={Hash} size={16} color="var(--v-violet)" active={i < 3} />
                    {i < 3 && <div className="absolute -inset-1 bg-v-violet/20 blur-lg rounded-full" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-black italic text-sm text-white uppercase group-hover:text-v-orange transition-colors tracking-tight">{t.tag}</div>
                    <div className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none mt-1">{t.posts} Broadcasts</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-v-emerald">{t.change}</span>
                    <span className="text-[7px] font-black opacity-30 uppercase">Amplitude</span>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
        </div>

        {/* RISING NODES (RIGHT) */}
        <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
                <KineticIcon icon={Globe} size={18} color="var(--v-cyan)" pulse />
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic leading-none">Rising_Nodes</h3>
                    <span className="text-[7px] font-black tracking-[0.2em] text-on-surface-variant opacity-40 uppercase">Fastest Growing Communities</span>
                </div>
            </div>
            
            <div className="space-y-4">
              {trendingCommunities.map((c, i) => (
                <motion.div 
                  key={c.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-6 p-6 rounded-[32px] bg-surface-lowest/40 border border-white/5 cursor-pointer hover:bg-surface-low transition-all duration-500 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-primary-gradient opacity-0 group-hover:opacity-5 transition-opacity -z-0" />
                  <div className="relative z-10 w-16 h-16 rounded-[22px] overflow-hidden border-2 border-white/5 group-hover:border-v-cyan transition-all">
                    {c.iconUrl ? (
                      <img src={c.iconUrl} alt="icon" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-high flex items-center justify-center">
                        <KineticIcon icon={Users} size={24} color="var(--on-surface-variant)" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative z-10">
                    <div className="font-black italic text-lg text-white tracking-tighter uppercase group-hover:text-v-cyan transition-colors">{c.displayName}</div>
                    <div className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">{c.memberCount} Members Active</div>
                  </div>
                  <button className="relative z-10 px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-[0.2em] text-[9px] italic hover:bg-v-cyan transform active:scale-95 transition-all shadow-xl">Join_Node</button>
                </motion.div>
              ))}
            </div>
        </div>
      </div>

      {/* FOOTER WAVE SEPARATOR */}
      <div className="relative h-20 w-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-primary-gradient blur-3xl opacity-20" />
      </div>

      {/* FEED SELECTION SECTION */}
      <div className="space-y-8">
          <div className="flex items-baseline gap-4 px-4">
              <KineticIcon icon={Radio} size={20} color="var(--v-emerald)" pulse glow />
              <div className="flex flex-col">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-white italic leading-none">High_Resonance_Signals</h3>
                  <span className="text-[8px] font-black tracking-[0.2em] text-on-surface-variant opacity-40 uppercase mt-1">Sovereign Feed (48h Peak)</span>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {trendingPosts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <PostCard post={p} />
              </motion.div>
            ))}
          </div>
      </div>
    </div>
  );
}
