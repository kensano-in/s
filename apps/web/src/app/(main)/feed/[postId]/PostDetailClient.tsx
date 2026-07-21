'use client';

import { useEffect, useState, useMemo } from 'react';
import PostCard from '@/components/features/feed/PostCard';
import CommentSheet from '@/components/features/feed/CommentSheet';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  posts: any[];
  currentUserId?: string;
}

export default function PostDetailClient({ posts, currentUserId }: Props) {
  const [activeCommentPost, setActiveCommentPost] = useState<any>(null);

  const authorUsername = posts[0]?.author?.username || 'profile';

  return (
    <div className="min-h-screen pb-40 relative bg-[#0A0A0A]">
      {/* Subtle bg glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[640px] mx-auto px-4 pt-6 relative z-10">
        {/* Back button */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/profile/${authorUsername}`}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors group px-3 py-1.5 rounded-xl hover:bg-white/[0.04]"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold">Back to @{authorUsername}</span>
          </Link>
        </div>

        {/* Scrollable feed list */}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onCommentOpen={() => setActiveCommentPost(post)}
            />
          ))}
        </div>
      </div>

      {/* Instagram-style comment sheet */}
      {activeCommentPost && (
        <CommentSheet
          postId={activeCommentPost.id}
          commentCount={activeCommentPost.commentCount}
          currentUserId={currentUserId}
          onClose={() => setActiveCommentPost(null)}
          postAuthorId={activeCommentPost.author?.id}
        />
      )}
    </div>
  );
}
