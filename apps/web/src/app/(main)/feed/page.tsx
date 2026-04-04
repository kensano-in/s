'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import CreatePost from '@/components/features/feed/CreatePost';
import PostCard from '@/components/features/feed/PostCard';
import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';

const TABS = ['For You', 'Following', 'Communities'];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDatabaseFeed() {
      const { data, error } = await supabase
        .from('posts')
        .select('*, author:users(*)')
        .order('created_at', { ascending: false });

      if (data && !error) {
        // Map the snake_case DB schema to our high-fidelity UI Types
        const formatted = data.map(dbPost => ({
          id: dbPost.id,
          content: dbPost.content,
          mediaUrls: dbPost.media_urls || [],
          likeCount: dbPost.like_count || 0,
          commentCount: dbPost.comment_count || 0,
          shareCount: dbPost.share_count || 0,
          createdAt: dbPost.created_at,
          author: {
            id: dbPost.author?.id,
            username: dbPost.author?.username || 'unknown',
            displayName: dbPost.author?.display_name || 'Classified User',
            avatar: dbPost.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbPost.author?.username}`,
            role: dbPost.author?.role || 'PUBLIC',
          }
        }));
        setLivePosts(formatted);
      }
    }

    // Initial load
    fetchDatabaseFeed();

    // Subscribe to the Sovereign network for instant live updates (WebSockets)
    const channel = supabase.channel('realtime_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchDatabaseFeed(); // Re-fetch to get exactly structured relational joins
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [supabase]);

  // SimCluster AI Virality Sorting Algorithm Simulation
  const sortedFeed = useMemo(() => {
    return [...livePosts].sort((a, b) => {
      if (activeTab === 0) { // 'For You' Algorithm
        const scoreA = a.likeCount + (a.shareCount * 2) + a.commentCount;
        const scoreB = b.likeCount + (b.shareCount * 2) + b.commentCount;
        return scoreB - scoreA;
      }
      // Chronological for Following
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, livePosts]);

  // The "Smooth-Motion" Mandate: Predictive Asset Caching
  useEffect(() => {
    const preloads: HTMLImageElement[] = [];
    sortedFeed.forEach((post) => {
      post.mediaUrls?.forEach((url: string) => {
        const img = new Image();
        img.src = url;
        preloads.push(img);
      });
    });
  }, [sortedFeed]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-[700px] mx-auto text-on-surface">
      {/* 
        Subtle Background Gradient Bleed 
        This is part of the 'Obsidian' Ethereal effect, allowing a massive
        out-of-focus violet/cyan mesh to sit behind the main scroll.
      */}
      <div className="fixed top-0 left-[30vw] w-[50vw] h-[50vh] bg-primary-dark/20 rounded-[100%] blur-[120px] pointer-events-none opacity-40 MixBlendMode-screen -z-10" />

      {/* Stories Layer */}
      <section className="mb-8">
        <StoryReel />
      </section>

      {/* Input Layer */}
      <section className="relative z-10 w-full animate-slide-up" style={{ animationDelay: '100ms' }}>
        <CreatePost />
      </section>

      {/* Algorithmic Sorting / Feed Tabs */}
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
              
              {/* Magic Underline Tracker */}
              {active && (
                <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] rounded-t-full bg-primary-gradient shadow-[0_0_12px_rgba(208,188,255,0.8)] z-20" />
              )}
              
              {/* Subtle hover background pill */}
              <span className={clsx(
                "absolute inset-0 rounded-t-xl bg-surface-highest transition-opacity duration-300 pointer-events-none z-0",
                active ? "opacity-0" : "opacity-0 group-hover:opacity-30"
              )} />
            </button>
          )
        })}
      </div>

      {/* Dynamic Content Stream - Driven by SimCluster Algorithm */}
      <div className="space-y-6 relative z-10">
        {sortedFeed.length === 0 ? (
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
              <PostCard post={post} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
