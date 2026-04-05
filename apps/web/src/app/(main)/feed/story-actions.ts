'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Phase 7: Create a new story
export async function createStory(userId: string, mediaUrl: string, mediaType: 'image' | 'video') {
  try {
    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert({
        author_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    revalidatePath('/feed');
    return { success: true, storyId: data.id };
  } catch (err: any) {
    console.error('createStory error:', err.message);
    return { success: false, error: err.message };
  }
}

// Record that a user has viewed a story
export async function markStoryViewed(storyId: string, userId: string) {
  try {
    // Upsert — safe to call multiple times
    await supabaseAdmin
      .from('story_views')
      .upsert({ story_id: storyId, user_id: userId }, { onConflict: 'story_id,user_id' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
