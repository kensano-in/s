'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import CreatePost from '@/components/features/feed/CreatePost';
import PostCard from '@/components/features/feed/PostCard';
import { MOCK_POSTS } from '@/lib/mockData';
import { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';

const TABS = ['For You', 'Following', 'Communities'];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState(0);

  // SimCluster AI Virality Sorting Algorithm Simulation
  const sortedFeed = useMemo(() => {
    return [...MOCK_POSTS].sort((a, b) => {
      if (activeTab === 0) { // 'For You' Algorithm
        const scoreA = a.likeCount + (a.shareCount * 2) + a.commentCount;
        const scoreB = b.likeCount + (b.shareCount * 2) + b.commentCount;
        return scoreB - scoreA;
      }
      // Chronological for Following
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab]);

  // The "Smooth-Motion" Mandate: Predictive Asset Caching
  useEffect(() => {
    // Silently pre-fetch all massive media URLs so they hit the GPU immediately upon scroll
    const preloads: HTMLImageElement[] = [];
    sortedFeed.forEach((post) => {
      post.mediaUrls?.forEach(url => {
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
        {sortedFeed.map((post, index) => (
          <div
            key={`${post.id}-${activeTab}`}
            className="animate-slide-up"
            style={{ animationDelay: `${(index + 2) * 50}ms`, animationFillMode: 'both' }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
