export const dynamic = 'force-dynamic';

import { getPostByIdDB } from '@/app/(main)/feed/actions';
import { getAvatarUrl } from '@/lib/utils';
import PostDetailClient from './PostDetailClient';
import Link from 'next/link';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata() {
  return { title: `Post • Verlyn` };
}

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  const { success, error, data: post } = await getPostByIdDB(postId);

  if (!success || !post) {
    const isInvalid = error === 'invalid_id';
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 relative">
        {/* Subtle background glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[400px] w-full text-center space-y-8 relative z-10">
          {/* Icon with cinematic glow */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.02)] relative group">
            <div className="absolute inset-0 rounded-3xl bg-white/[0.01] blur-md group-hover:bg-white/[0.03] transition-colors" />
            <EyeOff size={28} className="text-white/40 group-hover:text-white/60 transition-colors" />
          </div>

          <div className="space-y-3">
            <h1 className="text-[20px] font-black uppercase tracking-[0.25em] text-white font-display">
              {isInvalid ? 'Invalid Link' : 'Post Unavailable'}
            </h1>
            <p className="text-[14px] text-white/30 leading-relaxed max-w-[320px] mx-auto">
              {isInvalid 
                ? 'The link you followed is invalid or has expired.' 
                : 'This post is no longer available. It may have been archived, deleted, or you might not have permission to view it.'
              }
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/feed"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black hover:bg-neutral-200 text-[12px] font-black uppercase tracking-[0.2em] shadow-premium transition-all active:scale-[0.98]"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Return to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch like and save status for the current authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const isPostArchived = post && post.content.includes('[ 🚫 archived ]');
  if (isPostArchived && post.author_id !== userId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 relative">
        {/* Subtle background glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[400px] w-full text-center space-y-8 relative z-10">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.02)] relative group">
            <div className="absolute inset-0 rounded-3xl bg-white/[0.01] blur-md group-hover:bg-white/[0.03] transition-colors" />
            <EyeOff size={28} className="text-white/40 group-hover:text-white/60 transition-colors" />
          </div>

          <div className="space-y-3">
            <h1 className="text-[20px] font-black uppercase tracking-[0.25em] text-white font-display">
              Post Unavailable
            </h1>
            <p className="text-[14px] text-white/30 leading-relaxed max-w-[320px] mx-auto">
              This post is no longer available. It may have been archived, deleted, or you might not have permission to view it.
            </p>
          </div>

          <div className="pt-4">
            <Link
              href="/feed"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black hover:bg-neutral-200 text-[12px] font-black uppercase tracking-[0.2em] shadow-premium transition-all active:scale-[0.98]"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Return to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Fetch other posts by the same author to enable Instagram scroll mechanism
  const { data: dbPosts } = await supabase
    .from('posts')
    .select('*, author:users!posts_author_id_fkey(*)')
    .eq('author_id', post.author_id)
    .order('created_at', { ascending: false })
    .limit(30);

  const rawPosts = dbPosts || [];
  
  // 2. Filter out active post and place it at the very top (index 0)
  const remainingPosts = rawPosts.filter((p: any) => p.id !== post.id);
  const orderedPosts = [post, ...remainingPosts];
  const postIds = orderedPosts.map((p: any) => p.id);

  // 3. Batch fetch likes, saves, and audio cards to avoid N+1 queries
  const likedPostIds = new Set<string>();
  const savedPostIds = new Set<string>();
  const audioCardsMap = new Map<string, any>();

  if (postIds.length > 0) {
    const promises = [
      (async () => {
        if (userId) {
          const { data: likes } = await supabase
            .from('post_likes')
            .select('post_id')
            .in('post_id', postIds)
            .eq('user_id', userId);
          likes?.forEach((l: any) => likedPostIds.add(l.post_id));
        }
      })(),
      (async () => {
        if (userId) {
          const { data: saves } = await supabase
            .from('saves')
            .select('post_id')
            .in('post_id', postIds)
            .eq('user_id', userId);
          saves?.forEach((s: any) => savedPostIds.add(s.post_id));
        }
      })(),
      (async () => {
        const { data: audios } = await supabase
          .from('post_audio_cards')
          .select('*')
          .in('post_id', postIds);
        audios?.forEach((a: any) => audioCardsMap.set(a.post_id, a));
      })(),
    ];
    await Promise.all(promises);
  }

  // 4. Format posts
  const formattedPosts = orderedPosts.map((p: any) => ({
    id: p.id,
    content: p.content,
    postType: 'text',
    mediaUrls: p.media_urls || [],
    likeCount: p.like_count || 0,
    commentCount: p.comment_count || 0,
    shareCount: p.share_count || 0,
    createdAt: p.created_at,
    author: {
      id: p.author?.id,
      username: p.author?.username || 'unknown',
      displayName: p.author?.display_name || p.author?.username || 'Unknown',
      avatar: getAvatarUrl(p.author?.username || 'unknown', p.author?.avatar_url),
      role: p.author?.role || 'PUBLIC',
      isVerified: p.author?.is_verified || false,
    },
    isLiked: likedPostIds.has(p.id),
    isSaved: savedPostIds.has(p.id),
    audio: (() => {
      const a = audioCardsMap.get(p.id);
      if (!a) return undefined;
      return {
        id: a.id,
        trackId: a.track_id,
        trackName: a.track_name,
        artistName: a.artist_name,
        artworkUrl: a.artwork_url || undefined,
        previewUrl: a.preview_url || undefined,
        source: a.source,
        albumName: a.album_name || undefined,
        playbackStartPosition: a.playback_start_position ?? 0,
        playbackEndPosition: a.playback_end_position ?? 30,
        durationMs: a.duration_ms ?? 0
      };
    })()
  }));

  return <PostDetailClient posts={formattedPosts} currentUserId={userId} />;
}
