'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import CreatePost from '@/components/features/feed/CreatePost';
import PostCard from '@/components/features/feed/PostCard';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import type { Post } from '@/lib/types';

const TABS = ['For You', 'Following', 'Communities'];

// Skeleton card shown while feed is loading
function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-surface-high" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-surface-high rounded-full w-32" />
              <div className="h-2 bg-surface-high rounded-full w-20" />
            </div>
          </div>
          <div className="pl-[56px] space-y-2">
            <div className="h-3 bg-surface-high rounded-full w-full" />
            <div className="h-3 bg-surface-high rounded-full w-4/5" />
            <div className="h-3 bg-surface-high rounded-full w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [livePosts, setLivePosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  // FIX 10: Loading state to prevent empty-state flash while fetching
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  // FIX 9: Memoize preloaded URLs to prevent memory churn on re-render
  const preloadedUrls = useRef(new Set<string>());
  // Memoize client — not recreated per render
  const supabase = useMemo(() => createClient(), []);

  function formatPost(dbPost: Record<string, unknown>): Post {
    const author = dbPost.author as Record<string, unknown> | null;
    return {
      id: dbPost.id as string,
      content: dbPost.content as string,
      mediaUrls: (dbPost.media_urls as string[]) || [],
      likeCount: (dbPost.like_count as number) || 0,
      commentCount: (dbPost.comment_count as number) || 0,
      shareCount: (dbPost.share_count as number) || 0,
      createdAt: dbPost.created_at as string,
      postType: 'text',
      author: {
        id: (author?.id as string) || (dbPost.author_id as string) || '',
        username: (author?.username as string) || 'unknown',
        displayName: (author?.display_name as string) || 'Classified User',
        avatar: (author?.avatar_url as string) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username ?? 'user'}`,
        role: ((author?.role as 'PRIME' | 'PUBLIC') || 'PUBLIC'),
        isVerified: (author?.is_verified as boolean) || false,
        karmaScore: (author?.karma_score as number) || 0,
        followerCount: (author?.follower_count as number) || 0,
        followingCount: (author?.following_count as number) || 0,
        createdAt: (author?.created_at as string) || new Date().toISOString(),
      },
    };
  }

  useEffect(() => {
    async function fetchDatabaseFeed() {
      // FIX 10: Set loading = true at start of fetch
      setIsLoadingFeed(true);

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) setCurrentUserId(authData.user.id);

      const { data, error } = await supabase
        .from('posts')
        .select('*, author:users(*)')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setLivePosts(data.map(formatPost));
      }

      // FIX 10: Only set loading = false after fetch completes
      setIsLoadingFeed(false);
    }

    fetchDatabaseFeed();

    // FIX 7: Incremental real-time update — do NOT re-fetch entire feed on INSERT
    // This eliminates the fetch storm when multiple posts arrive rapidly
    const channel = supabase.channel('realtime_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const raw = payload.new as Record<string, unknown>;
        const newPost: Post = {
          id: raw.id as string,
          content: raw.content as string,
          mediaUrls: (raw.media_urls as string[]) || [],
          likeCount: (raw.like_count as number) || 0,
          commentCount: (raw.comment_count as number) || 0,
          shareCount: (raw.share_count as number) || 0,
          createdAt: raw.created_at as string,
          postType: 'text',
          author: {
            id: raw.author_id as string,
            username: 'unknown',
            displayName: 'New Post',
            avatar: '',
            role: 'PUBLIC',
            isVerified: false,
            karmaScore: 0,
            followerCount: 0,
            followingCount: 0,
            createdAt: raw.created_at as string,
          },
        };
        setLivePosts(prev => [newPost, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => {
        // Full re-fetch only for UPDATE/DELETE (content or like count changed)
        fetchDatabaseFeed();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setLivePosts(prev => prev.filter(p => p.id !== (payload.old as Record<string, unknown>).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // SimCluster AI Virality Sorting Algorithm Simulation
  const sortedFeed = useMemo(() => {
    return [...livePosts].sort((a, b) => {
      if (activeTab === 0) { // 'For You' Algorithm
        const scoreA = a.likeCount + (a.shareCount * 2) + a.commentCount;
        const scoreB = b.likeCount + (b.shareCount * 2) + b.commentCount;
        return scoreB - scoreA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, livePosts]);

  // FIX 9: Predictive asset caching with deduplication — no memory churn
  useEffect(() => {
    sortedFeed.forEach((post) => {
      post.mediaUrls?.forEach((url: string) => {
        if (preloadedUrls.current.has(url)) return; // Skip already-preloaded
        preloadedUrls.current.add(url);
        const img = new Image();
        img.src = url;
      });
    });
  }, [sortedFeed]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-[700px] mx-auto text-on-surface">
      <div className="fixed top-0 left-[30vw] w-[50vw] h-[50vh] bg-primary-dark/20 rounded-[100%] blur-[120px] pointer-events-none opacity-40 -z-10" />

      <section className="mb-8">
        <StoryReel />
      </section>

      <section className="relative z-10 w-full animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CreatePost />
      </section>

      <div className="flex gap-4 border-b border-outline-variant/15 mb-6 relative z-10">
        {TABS.map((tab, i) => {
          const active = i === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={clsx(
                'px-4 py-3 text-[15px] font-semibold transition-all duration-300 relative group',
                active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="relative z-10">{tab}</span>
              {active && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-t-full bg-primary-gradient shadow-[0_0_12px_rgba(208,188,255,0.8)] z-20" />
              )}
              <span className={clsx(
                "absolute inset-0 rounded-t-xl bg-surface-highest transition-opacity duration-300 pointer-events-none z-0",
                active ? "opacity-0" : "opacity-0 group-hover:opacity-30"
              )} />
            </button>
          );
        })}
      </div>

      {/* FIX 10: Loading → Skeleton → Empty → Posts (3 distinct states, never conflated) */}
      <div className="space-y-6 relative z-10">
        {isLoadingFeed ? (
          <FeedSkeleton />
        ) : sortedFeed.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center animate-pulse-slow">
            <div className="w-16 h-16 rounded-full bg-surface-highest flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-secondary-light" />
            </div>
            <h3 className="text-xl font-bold font-display text-on-surface mb-2">The Expanse is Quiet</h3>
            <p className="text-on-surface-variant max-w-sm">
              You have entered Sovereign Space before anyone else. Be the first to initiate contact.
            </p>
          </div>
        ) : (
          sortedFeed.map((post, index) => (
            <div
              key={`${post.id}-${activeTab}`}
              className="animate-slide-up"
              style={{ animationDelay: `${(index + 2) * 50}ms`, animationFillMode: 'both' }}
            >
              <PostCard post={post} currentUserId={currentUserId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
