'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import PostCard from '@/components/features/feed/PostCard';
import { FeedListSkeleton } from '@/components/ui/Skeleton';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { 
  Loader2, Database, Activity, Globe, Users, X, Hash, UserPlus, Compass, Sparkles, Check, RefreshCw, Plus
} from 'lucide-react';
import type { Post } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFeed } from '@/lib/queries/feed';
import { useAppStore } from '@/lib/store';

const TABS = [
    { id: 'all', label: 'Global', icon: Globe, desc: 'Public feed' },
    { id: 'following', label: 'Following', icon: Activity, desc: 'Posts from your network' },
    { id: 'communities', label: 'Communities', icon: Users, desc: 'Posts from your groups' }
];

export default function FeedPage() {
  useEffect(() => {
    console.log("[FORENSICS] FeedPage MOUNTED");
    return () => {
      console.log("[FORENSICS] FeedPage UNMOUNTED");
    };
  }, []);

  const [activeTab, setActiveTab] = useState('all');
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [newPostsReady, setNewPostsReady] = useState(false);

  const queryClient = useQueryClient();
  const observerRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const currentUser = useAppStore(s => s.currentUser);
  const isMobileDrawerOpen = useAppStore(s => s.isMobileDrawerOpen);
  const followingIds = useAppStore(s => s.following);

  const currentUserId = currentUser?.id;
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', activeTab, currentUserId],
    queryFn: ({ pageParam }) => {
      const mutedUsernames = currentUser?.metadata?.muted_users || [];
      const restrictedUsernames = currentUser?.metadata?.restricted_users || [];
      const excludeUsernames = [...new Set([...mutedUsernames, ...restrictedUsernames])];

      return fetchFeed({
        activeTab,
        userId: currentUserId,
        cursor: pageParam,
        clientFollowingIds: followingIds,
        clientExcludeUsernames: excludeUsernames,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ? lastPage.nextCursor.at : undefined,
    enabled: !!currentUserId || activeTab === 'all', 
  });

  const posts = useMemo(() => data?.pages.flatMap((page) => page.posts) || [], [data]);

  // Stable Infinite Scroll Trigger using Refs (prevents observer recreation churn)
  const fetchNextPageRef = useRef(fetchNextPage);
  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingNextPageRef = useRef(isFetchingNextPage);

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage;
    hasNextPageRef.current = hasNextPage;
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPageRef.current && !isFetchingNextPageRef.current) {
        fetchNextPageRef.current();
      }
    }, { threshold: 0.01, rootMargin: '500px' }); // Pre-fetch 500px ahead of scroll for zero-wait scrolling

    const sentinel = observerRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }
    
    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
      observer.disconnect();
    };
  }, []);

  // Consolidated Real-time listener for Feed (NEW posts & live post updates)
  useEffect(() => {
    const channel = supabase.channel('feed_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        setNewPostsReady(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload: any) => {
        const updatedPost = payload.new;
        if (!updatedPost) return;

        queryClient.setQueriesData(
          { queryKey: ['feed'] },
          (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                posts: page.posts.map((p: any) =>
                  p.id === updatedPost.id
                    ? {
                        ...p,
                        likeCount: updatedPost.like_count !== undefined ? updatedPost.like_count : p.likeCount,
                        commentCount: updatedPost.comment_count !== undefined ? updatedPost.comment_count : p.commentCount,
                        shareCount: updatedPost.share_count !== undefined ? updatedPost.share_count : p.shareCount,
                        content: updatedPost.content !== undefined ? updatedPost.content : p.content,
                      }
                    : p
                ),
              })),
            };
          }
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const handleSyncNewPosts = () => {
    setNewPostsReady(false);
    queryClient.invalidateQueries({ queryKey: ['feed', activeTab, currentUserId] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-6 pb-40 animate-fade-in relative">
      {/* Dual Background Glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(108,99,255,0.04),transparent_65%)] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[650px] h-[650px] bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.03),transparent_65%)] rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Floating New Posts Banner */}
      <AnimatePresence>
        {newPostsReady && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] cursor-pointer"
            onClick={handleSyncNewPosts}
          >
            <div className="flex items-center gap-2.5 px-5 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.08)] text-white text-[10px] font-bold uppercase tracking-widest transition-all">
              <RefreshCw size={12} className="animate-spin text-violet-400" style={{ animationDuration: '3s' }} />
              New signals ready
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* PREMIUM GREETING HEADER */}
        <div className="flex flex-col gap-1 select-none pb-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, <span className="bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent font-extrabold">{currentUser?.displayName || 'Nahoya'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Active feeds across your circles tonight.
          </p>
        </div>

        <section>
          <StoryReel />
        </section>



        {/* Premium Signal Switcher (Violet gradient glass layout) */}
        <div className="sticky top-6 z-20 flex items-center bg-[#09090b]/80 backdrop-blur-3xl p-1 rounded-2xl border border-white/[0.05] shadow-ambient w-full group/nav">
             {TABS.map((tab) => {
                 const active = activeTab === tab.id;
                 const Icon = tab.icon;
                 return (
                      <button type="button" 
                       key={tab.id} 
                       onClick={() => setActiveTab(tab.id)}
                       className={clsx(
                         'relative flex-1 flex items-center justify-center pt-3 pb-3.5 rounded-xl transition-all duration-300 group', 
                         isMobileDrawerOpen ? 'gap-1.5' : 'gap-1.5 sm:gap-3',
                         active ? 'text-violet-200 font-semibold' : 'text-slate-500 hover:text-white'
                       )}
                      >
                          {active && (
                            <>
                              <motion.div 
                               layoutId="active-pill" 
                               className="absolute inset-0 bg-white/[0.04] border border-white/[0.08] rounded-xl"
                               transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                              />
                            </>
                          )}
                          
                          <div className="relative z-10">
                              <Icon 
                                  size={15} 
                                  strokeWidth={active ? 2.5 : 2}
                                  className={clsx("transition-transform group-hover:scale-105", active ? "text-violet-400" : "text-slate-500")}
                              />
                          </div>
                          <div className="relative z-10">
                              <span className={clsx('text-[9px] font-black uppercase tracking-[0.2em] leading-none transition-all', isMobileDrawerOpen ? 'hidden' : 'block', active ? 'text-white' : 'text-slate-500 group-hover:text-white')}>
                                  {tab.label.toUpperCase()}
                              </span>
                          </div>
                      </button>
                 )
             })}
        </div>

        <div className="space-y-6 relative z-10">
             {isLoading ? (
                  <FeedListSkeleton />
                 ) : posts.length === 0 ? (
                    <div className="flex flex-col gap-6">
                       {/* Simple Fallback card */}
                       <div className="relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0c0c0e]/30 backdrop-blur-2xl p-8 text-center shadow-ambient">
                           <div className="w-10 h-10 rounded-xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-center mx-auto mb-4">
                             <Compass size={18} className="text-violet-400" />
                           </div>
                           <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">Feed Stream Quiet</h3>
                           <p className="text-[11px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
                             No posts available in this category. Customize your connection nodes to populate your feed stream.
                           </p>
                       </div>
                    </div>
                ) : (
                   <>
                     <div className="space-y-6">
                       {posts.map((post, index) => (
                           <div key={post.id}>
                               <PostCard post={post} currentUserId={currentUserId} postIndex={index} />
                           </div>
                       ))}
                     </div>

                     <div ref={observerRef} className="h-40 flex items-center justify-center">
                          {hasNextPage && <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 opacity-40"><Loader2 size={14} className="animate-spin" /> Fetching nodes</div>}
                     </div>
                   </>
               )}
        </div>
      </div>
    </div>
  );
}
