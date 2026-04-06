import { createClient } from '@/lib/supabase/server';
import PostCard from '@/components/features/feed/PostCard';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const resolvedParams = await params;
  return { title: `Post View • Verlyn` };
}

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const resolvedParams = await params;
  const { postId } = resolvedParams;
  const supabase = await createClient();

  // Fetch exactly the post needed, with author and tags
  const { data: post, error } = await supabase
    .from('posts')
    .select('*, author:users(*)')
    .eq('id', postId)
    .single();

  if (error || !post) {
    return notFound();
  }

  const formattedPost: any = {
    id: post.id,
    content: post.content,
    postType: 'text',
    mediaUrls: post.media_urls || [],
    likeCount: post.like_count || 0,
    commentCount: post.comment_count || 0,
    shareCount: post.share_count || 0,
    createdAt: post.created_at,
    author: {
      id: post.author?.id,
      username: post.author?.username || 'unknown',
      displayName: post.author?.display_name || post.author?.username || 'Unknown',
      avatar: post.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username}`,
      role: post.author?.role || 'PUBLIC',
      isVerified: post.author?.is_verified || false,
    },
  };

  return (
    <div className="min-h-screen pb-12 animate-fade-in relative bg-surface-lowest">
      {/* Background glow effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-v-cyan/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[700px] mx-auto px-4 pt-6 relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold tracking-wide">Back to Feed</span>
          </Link>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-low border border-outline-variant/10 rounded-full">
             <Sparkles size={12} className="text-primary-light" />
             <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Cinematic View</span>
          </div>
        </div>

        {/* Hero Post Container */}
        <div className="mb-8">
          <PostCard post={formattedPost} />
        </div>

        {/* Comment Section Placeholder (Since comments aren't deeply architected yet) */}
        <div className="mt-8 border border-outline-variant/10 bg-surface-variant/30 rounded-3xl p-8 text-center backdrop-blur-md">
          <h3 className="text-lg font-bold text-on-surface mb-2 tracking-tight">Expanded Thread coming soon</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
            The full-screen threaded discussion layer is currently being compiled. Deep diving into conversations will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
