'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Flame, Hash, Loader2 } from 'lucide-react';
import type { Post, Community } from '@/lib/types';
import PostCard from '@/components/features/feed/PostCard';

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

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-2 px-1">
        <TrendingUp size={22} style={{ color: 'var(--v-cyan)' }} />
        <h1 className="text-2xl font-black gradient-text">Trending</h1>
      </div>

      {/* Trending Topics */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} style={{ color: 'var(--v-orange)' }} />
          <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Trending Topics Right Now</h2>
        </div>
        <div className="space-y-1">
          {trendingTopics.map((t, i) => (
            <div
              key={t.tag}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 hover:bg-surface-high"
              style={{ background: i === 0 ? 'rgba(108,99,255,0.08)' : 'transparent' }}
            >
              <span className="text-lg font-black w-6 text-center flex-shrink-0" style={{ color: i < 3 ? 'var(--v-orange)' : 'var(--text-tertiary)' }}>
                {i + 1}
              </span>
              <Hash size={14} style={{ color: 'var(--v-violet-light)', flexShrink: 0 }} />
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t.tag}</div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.posts} posts</div>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--v-green)' }}>{t.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Communities */}
      <div className="glass-card p-5 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="font-bold text-sm mb-4 relative z-10" style={{ color: 'var(--text-primary)' }}>🔥 Fastest Growing Communities</h2>
        <div className="space-y-3 pb-2 relative z-10">
          {trendingCommunities.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-lowest/50 border border-outline-variant/10 cursor-pointer hover:bg-surface-low transition-all duration-300">
              <span className="text-2xl drop-shadow-md flex items-center justify-center w-8 h-8 rounded-full bg-surface">
                {c.iconUrl ? <img src={c.iconUrl} alt="icon" className="w-6 h-6 rounded-full" /> : <Hash size={16} />}
              </span>
              <div className="flex-1">
                <div className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{c.displayName}</div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>{c.memberCount} members</div>
              </div>
              <button className="primary-btn text-[11px] px-4 py-1.5 shadow-[0_0_10px_var(--primary-glow)]">Join</button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Posts */}
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
        Top Posts This Week
      </div>
      <div className="space-y-4">
        {trendingPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
