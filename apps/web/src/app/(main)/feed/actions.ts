'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitPost(formData: FormData) {
  const supabase = await createClient();
  const content = formData.get('content') as string;

  if (!content || content.trim() === '') return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('posts').insert({
    author_id: user.id,
    content: content.trim(),
    like_count: 0,
    comment_count: 0,
    media_urls: []
  });

  if (error) {
    console.error("Post Creation Failed:", error);
    return;
  }
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
