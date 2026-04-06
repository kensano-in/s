'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;

  if (!content || content.trim() === '') return { error: 'Empty content' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const mediaUrls = formData.getAll('mediaUrls') as string[];

  const { error } = await supabase.from('posts').insert({
    author_id: user.id,
    content: content.trim(),
    like_count: 0,
    comment_count: 0,
    media_urls: mediaUrls.filter(Boolean),
  });

  if (error) {
    console.error("Post Creation Failed:", error);
    return { error: error.message };
  }

  revalidatePath('/feed');
  return { success: true };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id); // Security: only own posts

  if (error) {
    console.error("Post Delete Failed:", error);
    return { error: error.message };
  }

  revalidatePath('/feed');
  return { success: true };
}

export async function editPost(postId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (!content || content.trim() === '') return { error: 'Content cannot be empty' };

  const { error } = await supabase
    .from('posts')
    .update({ content: content.trim() })
    .eq('id', postId)
    .eq('author_id', user.id); // Security: only own posts

  if (error) {
    console.error("Post Edit Failed:", error);
    return { error: error.message };
  }

  revalidatePath('/feed');
  return { success: true };
}

export async function submitCommentDB(postId: string, userId: string, content: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (!content || content.trim() === '') return { error: 'Comment empty' };

  try {
    // 1. Insert comment
    const { data: comment, error: commentError } = await supabaseAdmin.from('comments').insert({
      post_id: postId,
      author_id: userId,
      content: content.trim(),
    }).select('id').single();

    if (commentError) throw commentError;

    // 2. Atomic increment — eliminates race condition
    // Try RPC first (deploy via Supabase dashboard: see schema notes)
    // Falls back to read-then-write if RPC not deployed yet
    const { error: rpcError } = await supabaseAdmin.rpc('increment_comment_count', { p_post_id: postId });
    if (rpcError) {
      const { data: post } = await supabaseAdmin.from('posts').select('comment_count').eq('id', postId).single();
      if (post) {
        await supabaseAdmin.from('posts').update({ comment_count: (post.comment_count || 0) + 1 }).eq('id', postId);
      }
    }

    revalidatePath('/feed');
    return { success: true };
  } catch (err: any) {
    console.error("Comment Insert Failed:", err.message);
    return { error: err.message };
  }
}

export async function toggleLikeDB(postId: string, userId: string, isLiking: boolean) {
  try {
    const supabase = await createClient();
    if (isLiking) {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    } else {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: userId });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync like to DB:', err.message);
    return { success: false, error: err.message };
  }
}

export async function toggleSaveDB(postId: string, userId: string, isSaving: boolean) {
  try {
    const supabase = await createClient();
    if (isSaving) {
      await supabase.from('saved_posts').upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id' });
    } else {
      await supabase.from('saved_posts').delete().match({ post_id: postId, user_id: userId });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync save to DB:', err.message);
    return { success: false, error: err.message };
  }
}
