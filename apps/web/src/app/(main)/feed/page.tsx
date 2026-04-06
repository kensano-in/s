'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import CreatePost from '@/components/features/feed/CreatePost';
import PostCard from '@/components/features/feed/PostCard';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { Sparkles, Loader2, Database, ShieldCheck, Zap, ChevronDown, Activity, Globe, Users } from 'lucide-react';
import type { Post } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
    { id: 'all', label: 'Expanse', icon: Globe, desc: 'Global Neural Stream' },
    { id: 'following', label: 'Nodes', icon: Activity, desc: 'Followed Identity Signals' },
    { id: 'communities', label: 'Matrix', icon: Users, desc: 'Joined Sovereign Protocols' }
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [livePosts, setLivePosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const formatPost = useCallback((dbPost: any, currentUserId?: string): Post => {
    const author = dbPost.author;
    return {
      id: dbPost.id,
      content: dbPost.content,
      mediaUrls: dbPost.media_urls || [],
      likeCount: dbPost.like_count || 0,
      commentCount: dbPost.comment_count || 0,
      shareCount: dbPost.share_count || 0,
      createdAt: dbPost.created_at,
      postType: 'text',
      author: {
        id: author?.id || dbPost.author_id,
        username: author?.username || 'unknown',
        displayName: author?.display_name || 'Classified User',
        avatar: author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username ?? 'user'}`,
        role: author?.role || 'PUBLIC',
        isVerified: author?.is_verified || false,
        karmaScore: author?.karma_score || 0,
        followerCount: author?.follower_count || 0,
        followingCount: author?.following_count || 0,
        createdAt: author?.created_at || dbPost.created_at,
      },
      communityId: dbPost.community_id,
      communityName: dbPost.community?.display_name,
      isLiked: Array.isArray(dbPost.post_likes) && dbPost.post_likes.some((l: any) => l.user_id === currentUserId),
    };
  }, []);

  const fetchFeed = useCallback(async (isInitial = false) => {
    if (isInitial) {
        setLoading(true);
        setPage(1);
    }
    
    // Get Current user session
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (userId) setCurrentUserId(userId);

    let query = supabase
      .from('posts')
      .select('*, author:users(*), community:communities(display_name), post_likes!left(user_id)')
      .order('created_at', { ascending: false });

    // Apply Tab Filtering
    if (activeTab === 'following' && userId) {
        // Subquery for following IDs (Complex logic using SQL 'in' or 'filter')
        const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        const followingIds = following?.map(f => f.following_id) || [];
        query = query.in('author_id', [userId, ...followingIds]); 
    } else if (activeTab === 'communities' && userId) {
        const { data: joined } = await supabase.from('community_members').select('community_id').eq('user_id', userId);
        const joinedCommIds = joined?.map(j => j.community_id) || [];
        query = query.in('community_id', joinedCommIds);
    }

    const { data, error } = await query.range((isInitial ? 0 : page * 10), (isInitial ? 9 : (page + 1) * 10 - 1));

    if (data && !error) {
       const posts = data.map(p => formatPost(p, userId));
       setLivePosts(prev => isInitial ? posts : [...prev, ...posts]);
       setHasMore(data.length === 10);
       if (!isInitial) setPage(p => p + 1);
    }
    setLoading(false);
  }, [activeTab, formatPost, page, supabase]);

  useEffect(() => {
    fetchFeed(true);
  }, [activeTab]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) fetchFeed();
    }, { threshold: 1.0 });
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [fetchFeed, hasMore, loading]);

  // Real-time listener for NEW posts
  useEffect(() => {
    const channel = supabase.channel('feed_realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
            const raw = payload.new as any;
            const { data: u } = await supabase.from('users').select('*').eq('id', raw.author_id).single();
            const { data: c } = raw.community_id ? await supabase.from('communities').select('display_name').eq('id', raw.community_id).single() : { data: null };
            const p = formatPost({ ...raw, author: u, community: c });
            
            // Check if it belongs in current tab
            if (activeTab === 'all') setLivePosts(prev => [p, ...prev]);
            // (Other tab real-time filtering can be added but for 'Expanse' it's critical)
        })
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab, formatPost, supabase]);

  return (
    <div className="flex flex-col gap-10 max-w-[700px] mx-auto pb-40 animate-fade-in italic px-4 relative">
       {/* Background Depth */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-v-cyan/5 rounded-[100%] blur-[200px] pointer-events-none opacity-40 -z-10" />

      <section>
        <StoryReel />
      </section>

      <section className="relative z-10 glass-card p-2 rounded-[50px] bg-surface-lowest/40 border-none shadow-3xl">
        <CreatePost />
      </section>

      {/* Sovereign Tab System */}
      <div className="flex items-center justify-between gap-2 bg-surface-lowest/30 p-2.5 rounded-[32px] border border-white/5 shadow-2xl relative z-10 backdrop-blur-3xl overflow-x-auto hide-scrollbar">
           {TABS.map((tab) => {
               const active = activeTab === tab.id;
               const Icon = tab.icon;
               return (
                   <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx('relative flex-1 min-w-[140px] flex items-center justify-center gap-3 py-4 rounded-[24px] transition-all duration-500 overflow-hidden group', active ? 'bg-surface shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-white/5' : 'hover:bg-white/[0.03]')}
                   >
                       {active && <motion.div layoutId="tab-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-v-cyan shadow-[0_0_15px_var(--v-cyan)] rounded-full" />}
                       <Icon size={18} className={clsx('transition-all duration-500', active ? 'text-v-cyan scale-110' : 'text-on-surface-variant opacity-40 group-hover:opacity-100')} />
                       <div className="text-left">
                           <span className={clsx('block text-[10px] font-black uppercase tracking-[0.15em] italic leading-none transition-all', active ? 'text-white' : 'text-on-surface-variant opacity-40 group-hover:opacity-100')}>{tab.label}</span>
                       </div>
                   </button>
               )
           })}
      </div>

      <div className="space-y-12 relative z-10">
           {loading ? (
               <div className="flex flex-col items-center justify-center py-40 opacity-40 italic">
                  <Activity size={32} className="animate-pulse text-v-emerald mb-4 shadow-[0_0_20px_var(--v-emerald)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-v-emerald">Synchronizing Neural Stream...</p>
               </div>
           ) : livePosts.length === 0 ? (
               <div className="glass-card p-24 text-center border-none bg-surface-lowest/40 rounded-[60px] shadow-3xl italic">
                   <div className="w-24 h-24 rounded-[40px] bg-surface-high flex items-center justify-center mx-auto mb-10 shadow-inner border border-white/5 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Database size={40} className="text-on-surface-variant" />
                   </div>
                   <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-4 leading-none truncate">Spectral Void Detected</h3>
                   <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant opacity-40 mb-10">No signals broadcasted to this sector. Be the prime initiator.</p>
                   <button onClick={() => setActiveTab('all')} className="px-10 py-4 bg-primary-gradient rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all text-white italic">SCAN GLOBAL EXPANSE</button>
               </div>
           ) : (
               <>
                  <div className="space-y-10">
                    {livePosts.map((post, index) => (
                        <motion.div 
                            key={post.id} 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: index < 5 ? index * 0.1 : 0 }}
                        >
                            <PostCard post={post} currentUserId={currentUserId} />
                        </motion.div>
                    ))}
                  </div>

                  <div ref={observerRef} className="h-40 flex items-center justify-center italic">
                      {hasMore && <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.5em] text-on-surface-variant opacity-30 mx-auto"><Loader2 size={16} className="animate-spin" /> Fetching Deep Stream</div>}
                  </div>
               </>
           )}
      </div>
    </div>
  );
}
