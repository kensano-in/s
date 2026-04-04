'use server';

import { createClient } from '@/lib/supabase/server';

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

  // Realtime sockets will naturally pull this in for the client, 
  // but this ensures any server components refresh too if needed.
}
