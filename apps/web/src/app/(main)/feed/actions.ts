'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isUserRestricted } from '@/lib/spamGuard';
import { recordActivityAndCheckSpam } from '@/lib/moderationEngine';
import { redis, CacheKeys } from '@/lib/redis';

// Admin client — bypasses RLS for post/comment reads
function getAdmin() {
  return createAdminClient();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPostByIdDB(postId: string) {
  try {
    if (!postId || !UUID_REGEX.test(postId)) {
      return { success: false, error: 'invalid_id', data: null };
    }

    const supabase = await createClient();
    const admin = getAdmin();

    const [visibleRes, postRes] = await Promise.all([
      supabase.from('posts').select('id').eq('id', postId).maybeSingle(),
      admin.from('posts').select('*, author:users!posts_author_id_fkey(*)').eq('id', postId).single()
    ]);

    if (visibleRes.error || !visibleRes.data) {
      return { success: false, error: 'Access denied to this post', data: null };
    }

    if (postRes.error) {
      if (postRes.error.code === 'PGRST116') {
        console.warn(`getPostByIdDB: Post with ID ${postId} not found in database.`);
      } else {
        console.error("getPostByIdDB DB error:", postRes.error);
      }
      return { success: false, error: postRes.error.message, data: null };
    }
    return { success: true, data: postRes.data };
  } catch (err: any) {
    console.error("getPostByIdDB catch error:", err);
    return { success: false, error: err.message, data: null };
  }
}

export async function getCommentsDB(postId: string) {
  try {
    if (!postId || !UUID_REGEX.test(postId)) {
      return { success: false, error: 'invalid_id', data: [] };
    }

    const supabase = await createClient();
    const admin = getAdmin();

    const [visibleRes, commentsRes] = await Promise.all([
      supabase.from('posts').select('id').eq('id', postId).maybeSingle(),
      admin
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          post_id,
          author_id,
          is_pinned,
          author:users!comments_author_id_fkey(id, username, display_name, avatar_url, is_verified, security_score),
          comment_likes(user_id),
          comment_reports(id)
        `)
        .eq('post_id', postId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(200)
    ]);

    if (visibleRes.error || !visibleRes.data) {
      return { success: false, error: 'Access denied to this post', data: [] };
    }

    if (commentsRes.error) {
      console.error("getCommentsDB DB error:", commentsRes.error);
      return { success: false, error: commentsRes.error.message, data: [] };
    }

    const data = commentsRes.data;

    const mappedData = (data || []).map((c: any) => {
      let content = c.content || '';
      let parent_id = null;
      const match = content.match(/^\[reply:([^\]]+)\]\s*([\s\S]*)/);
      if (match) {
        parent_id = match[1];
        content = match[2];
      }
      return {
        ...c,
        content,
        parent_id,
        is_flagged: !!(c.comment_reports && c.comment_reports.length > 0)
      };
    });

    return { success: true, data: mappedData };
  } catch (err: any) {
    console.error("getCommentsDB catch error:", err);
    return { success: false, error: err.message, data: [] };
  }
}


export async function submitPost(formData: FormData) {
  const supabase = await createClient();
  const content = (formData.get('content') as string || '').trim();
  const mediaUrls = (formData.getAll('mediaUrls') || []).filter(Boolean) as string[];
  const spotifyTrackId = formData.get('spotifyTrackId') as string;

  if (!content && mediaUrls.length === 0 && !spotifyTrackId) {
    return { error: 'Empty content' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  if (await isUserRestricted(user.id, 'posts')) {
    return { error: 'You are restricted from posting due to spamming.' };
  }

  // Server-Authoritative Anti-Spam Check
  const spamResult = await recordActivityAndCheckSpam(user.id, 'create_post', content);
  if (spamResult.blocked) {
    if (spamResult.warning) {
      return { error: `Warning: ${spamResult.warning}` };
    }
    return { error: 'You are restricted from posting due to spamming.' };
  }

  const { data: newPost, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: content.trim(),
      like_count: 0,
      comment_count: 0,
      media_urls: mediaUrls.filter(Boolean),
    })
    .select('id')
    .single();

  if (error) {
    console.error("Post Creation Failed:", error);
    return { error: error.message };
  }

  // Invalidate feed cache in Redis for the author so the post appears instantly
  try {
    const tabs = ['trending', 'following', 'communities', 'new', 'feed'];
    const deletePromises = tabs.map(tab => 
      redis.del(CacheKeys.feedPage(user.id, tab, ''))
    );
    await Promise.all(deletePromises);
  } catch (cacheErr) {
    console.error("Failed to invalidate Redis feed cache:", cacheErr);
  }

  // If a Spotify soundtrack is associated with the post, insert the audio card
  if (newPost && spotifyTrackId) {
    const trackName = formData.get('spotifyTrackName') as string;
    const artist = formData.get('spotifyTrackArtist') as string;
    const albumName = formData.get('spotifyTrackAlbum') as string;
    const albumArt = formData.get('spotifyTrackArtUrl') as string;
    const previewUrl = formData.get('spotifyTrackPreviewUrl') as string;
    const durationMs = parseInt(formData.get('spotifyTrackDuration') as string || '0');
    const trimStart = parseInt(formData.get('soundtrackTrimStart') as string || '0');
    const trimEnd = parseInt(formData.get('soundtrackTrimEnd') as string || '30');

    const { error: audioError } = await supabase
      .from('post_audio_cards')
      .insert({
        post_id: newPost.id,
        track_id: spotifyTrackId,
        track_name: trackName,
        artist_name: artist,
        artwork_url: albumArt,
        preview_url: previewUrl,
        source: 'spotify',
        album_name: albumName,
        playback_start_position: trimStart,
        playback_end_position: trimEnd,
        duration_ms: durationMs
      });

    if (audioError) {
      console.error("Post Audio Card Insertion Failed:", audioError.message);
      // Log error but don't fail the whole post upload to remain resilient
    }
  }

  revalidatePath('/feed');
  return { success: true };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const admin = getAdmin();

  // 1. Fetch post to get media_urls
  const { data: post, error: fetchError } = await admin
    .from('posts')
    .select('media_urls')
    .eq('id', postId)
    .eq('author_id', user.id)
    .maybeSingle();

  if (fetchError) {
    console.error("Post Fetch Failed:", fetchError);
    return { error: fetchError.message };
  }

  // 2. Delete media from storage if exists
  if (post && post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    try {
      const { deleteMultipleMediaFiles } = await import('@/lib/storage');
      await deleteMultipleMediaFiles(post.media_urls);
    } catch (err: any) {
      console.warn('[Post Media Cleanup] Failed to delete media files:', err.message);
    }
  }

  // 3. Delete database record
  const { error } = await admin
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

  if (await isUserRestricted(user.id, 'posts')) {
    return { error: 'You are restricted from posting/editing posts due to spamming.' };
  }

  const spamResult = await recordActivityAndCheckSpam(user.id, 'create_post', content);
  if (spamResult.blocked) {
    if (spamResult.warning) return { error: `Warning: ${spamResult.warning}` };
    return { error: 'You are restricted from posting/editing posts due to spamming.' };
  }

  if (!content || content.trim() === '') return { error: 'Content cannot be empty' };

  const admin = getAdmin();
  const { error } = await admin
    .from('posts')
    .update({ content: content.trim() })
    .eq('id', postId)
    .eq('author_id', user.id); // Security: only own posts

  if (error) {
    console.error("Post Edit Failed:", error);
    return { error: error.message };
  }

  revalidatePath('/feed');
  revalidatePath('/trending');
  return { success: true };
}

export async function submitCommentDB(postId: string, userId: string, content: string, parentId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  const actualUserId = user.id;

  if (await isUserRestricted(actualUserId, 'comments')) {
    return { error: 'You are restricted from commenting due to spamming.' };
  }

  // Server-Authoritative Anti-Spam Check
  const spamResult = await recordActivityAndCheckSpam(actualUserId, 'add_comment', content);
  if (spamResult.blocked) {
    if (spamResult.warning) {
      return { error: `Warning: ${spamResult.warning}` };
    }
    return { error: 'You are restricted from commenting due to spamming.' };
  }

  const supabaseAdmin = createAdminClient();

  if (!content || content.trim() === '') return { error: 'Comment empty' };

  try {
    let finalContent = content.trim();
    if (parentId) {
      finalContent = `[reply:${parentId}] ${finalContent}`;
    }

    // 1. Insert comment
    const insertPayload: any = {
      post_id: postId,
      author_id: actualUserId,
      content: finalContent,
    };
    const { data: comment, error: commentError } = await supabaseAdmin.from('comments').insert(insertPayload).select('id').single();

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

export async function toggleCommentLikeDB(commentId: string, userId: string, isLiking: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'reactions')) {
      return { success: false, error: 'You are restricted from liking/reacting due to spamming.' };
    }

    if (isLiking) {
      // Server-Authoritative Anti-Spam Check
      const spamResult = await recordActivityAndCheckSpam(actualUserId, 'add_reaction', undefined, commentId);
      if (spamResult.blocked) {
        if (spamResult.warning) {
          return { success: false, error: `Warning: ${spamResult.warning}` };
        }
        return { success: false, error: 'You are restricted from liking/reacting due to spamming.' };
      }
      await supabase.from('comment_likes').upsert({ comment_id: commentId, user_id: actualUserId }, { onConflict: 'comment_id,user_id' });
    } else {
      await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: actualUserId });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync comment like to DB:', err.message);
    return { success: false, error: err.message };
  }
}

export async function toggleLikeDB(postId: string, userId: string, isLiking: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'reactions')) {
      return { success: false, error: 'You are restricted from liking/reacting due to spamming.' };
    }

    const admin = getAdmin();

    if (isLiking) {
      // Server-Authoritative Anti-Spam Check
      const spamResult = await recordActivityAndCheckSpam(actualUserId, 'add_reaction', undefined, postId);
      if (spamResult.blocked) {
        if (spamResult.warning) {
          return { success: false, error: `Warning: ${spamResult.warning}` };
        }
        return { success: false, error: 'You are restricted from liking/reacting due to spamming.' };
      }
      await supabase.from('post_likes').insert({ post_id: postId, user_id: actualUserId });
      const { data: post } = await admin.from('posts').select('like_count').eq('id', postId).single();
      if (post) {
        await admin.from('posts').update({ like_count: (post.like_count || 0) + 1 }).eq('id', postId);
      }
    } else {
      await supabase.from('post_likes').delete().match({ post_id: postId, user_id: actualUserId });
      const { data: post } = await admin.from('posts').select('like_count').eq('id', postId).single();
      if (post) {
        await admin.from('posts').update({ like_count: Math.max(0, (post.like_count || 0) - 1) }).eq('id', postId);
      }
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    if (await isUserRestricted(actualUserId, 'reactions')) {
      return { success: false, error: 'You are restricted from saving posts due to spamming.' };
    }

    if (isSaving) {
      const spamResult = await recordActivityAndCheckSpam(actualUserId, 'add_reaction', undefined, postId);
      if (spamResult.blocked) {
        if (spamResult.warning) return { success: false, error: `Warning: ${spamResult.warning}` };
        return { success: false, error: 'You are restricted from saving posts due to spamming.' };
      }
    }

    if (isSaving) {
      await supabase.from('saves').upsert({ post_id: postId, user_id: actualUserId }, { onConflict: 'post_id,user_id' });
    } else {
      await supabase.from('saves').delete().match({ post_id: postId, user_id: actualUserId });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync save to DB:', err.message);
    return { success: false, error: err.message };
  }
}

export async function togglePinPostDB(postId: string, isPinning: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const actualUserId = user.id;

    const admin = getAdmin();

    const { data: post, error: fetchErr } = await admin
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchErr || !post) {
      return { success: false, error: 'Post not found' };
    }
    if (post.author_id !== actualUserId) {
      return { success: false, error: 'Unauthorized: You do not own this post' };
    }

    if (isPinning) {
      const { count, error: countErr } = await admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', actualUserId)
        .eq('is_pinned', true);

      if (countErr) throw countErr;
      if (count !== null && count >= 3) {
        return { success: false, error: 'You can only pin up to 3 posts.' };
      }
    }

    const { error: updateErr } = await admin
      .from('posts')
      .update({ is_pinned: isPinning })
      .eq('id', postId);

    if (updateErr) throw updateErr;

    revalidatePath('/feed');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to toggle pin status:', err.message);
    return { success: false, error: err.message };
  }
}

export async function pinCommentDB(commentId: string, isPinned: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = getAdmin();

    const { data: comment, error: fetchErr } = await admin
      .from('comments')
      .select('post_id')
      .eq('id', commentId)
      .single();

    if (fetchErr || !comment) {
      return { success: false, error: 'Comment not found' };
    }

    const { data: post, error: postErr } = await admin
      .from('posts')
      .select('author_id')
      .eq('id', comment.post_id)
      .single();

    if (postErr || !post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.author_id !== user.id) {
      return { success: false, error: 'Unauthorized: You do not own this post' };
    }

    if (isPinned) {
      const { count, error: countErr } = await admin
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', comment.post_id)
        .eq('is_pinned', true);

      if (countErr) throw countErr;
      if (count !== null && count >= 3) {
        return { success: false, error: 'You can only pin up to 3 comments.' };
      }
    }

    const { error: updateErr } = await admin
      .from('comments')
      .update({ is_pinned: isPinned })
      .eq('id', commentId);

    if (updateErr) throw updateErr;

    revalidatePath('/trending');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to toggle comment pin:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteCommentDB(commentId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = getAdmin();

    const { data: comment, error: fetchErr } = await admin
      .from('comments')
      .select('post_id, author_id')
      .eq('id', commentId)
      .single();

    if (fetchErr || !comment) {
      return { success: false, error: 'Comment not found' };
    }

    const { data: post, error: postErr } = await admin
      .from('posts')
      .select('author_id, comment_count')
      .eq('id', comment.post_id)
      .single();

    if (postErr || !post) {
      return { success: false, error: 'Post not found' };
    }

    const isCommentAuthor = comment.author_id === user.id;
    const isPostOwner = post.author_id === user.id;

    if (!isCommentAuthor && !isPostOwner) {
      return { success: false, error: 'Unauthorized to delete this comment' };
    }

    const { error: deleteErr } = await admin
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteErr) throw deleteErr;

    await admin
      .from('posts')
      .update({ comment_count: Math.max(0, (post.comment_count || 0) - 1) })
      .eq('id', comment.post_id);

    revalidatePath('/trending');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete comment:', err.message);
    return { success: false, error: err.message };
  }
}

export async function reportCommentDB(commentId: string, reason: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const admin = getAdmin();

    const { data: comment, error: fetchErr } = await admin
      .from('comments')
      .select('content, author_id')
      .eq('id', commentId)
      .single();

    if (fetchErr || !comment) {
      return { success: false, error: 'Comment not found' };
    }

    if (comment.author_id === user.id) {
      return { success: false, error: 'You cannot report your own comment' };
    }

    const ruleBreakingKeywords = ['spam', 'abuse', 'hate', 'harassment', 'scam', 'fuck', 'shit', 'asshole', 'kill', 'threat'];
    const contentLower = (comment.content || '').toLowerCase();
    const reasonLower = reason.toLowerCase();
    const isActuallyRuleBreaking = ruleBreakingKeywords.some(k => contentLower.includes(k) || reasonLower.includes(k));

    if (isActuallyRuleBreaking) {
      const { error: reportErr } = await admin
        .from('comment_reports')
        .upsert({
          comment_id: commentId,
          reporter_id: user.id,
          reason: reason,
          status: 'pending'
        }, { onConflict: 'comment_id,reporter_id' });

      if (reportErr) throw reportErr;

      return { success: true, actualViolation: true };
    } else {
      const { data: reporter } = await admin
        .from('users')
        .select('karma_score, security_score')
        .eq('id', user.id)
        .single();

      if (reporter) {
        const newKarma = Math.max(0, (reporter.karma_score || 0) - 10);
        const newSecScore = Math.max(0, (reporter.security_score || 0) - 5);
        await admin
          .from('users')
          .update({ karma_score: newKarma, security_score: newSecScore })
          .eq('id', user.id);
      }

      return { 
        success: false, 
        error: 'False report detected. Your karma score has been penalized.', 
        falseReport: true 
      };
    }
  } catch (err: any) {
    console.error('Failed to report comment:', err.message);
    return { success: false, error: err.message };
  }
}

export async function toggleRepostDB(postId: string, isReposting: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (await isUserRestricted(user.id, 'posts')) {
      return { success: false, error: 'You are restricted from reposting due to spamming.' };
    }

    const admin = getAdmin();

    if (isReposting) {
      // Server-Authoritative Anti-Spam Check
      const spamResult = await recordActivityAndCheckSpam(user.id, 'create_post', undefined, postId);
      if (spamResult.blocked) {
        if (spamResult.warning) {
          return { success: false, error: `Warning: ${spamResult.warning}` };
        }
        return { success: false, error: 'You are restricted from reposting due to spamming.' };
      }

      // Insert repost placeholder row in posts table
      const { error: insertError } = await admin
        .from('posts')
        .insert({
          author_id: user.id,
          metadata: { is_repost: true, original_post_id: postId },
          content: 'Reposted a post'
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    } else {
      // Delete the repost placeholder row
      const { error: deleteError } = await admin
        .from('posts')
        .delete()
        .eq('author_id', user.id)
        .contains('metadata', { is_repost: true, original_post_id: postId });

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
    }
    
    // Get current post's share_count
    const { data: post, error: getError } = await admin
      .from('posts')
      .select('share_count')
      .eq('id', postId)
      .single();

    if (getError) {
      return { success: false, error: getError.message };
    }

    const currentShareCount = post?.share_count || 0;
    const newShareCount = isReposting 
      ? currentShareCount + 1 
      : Math.max(0, currentShareCount - 1);

    const { error: updateError } = await admin
      .from('posts')
      .update({ share_count: newShareCount })
      .eq('id', postId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, newShareCount };
  } catch (err: any) {
    console.error('Failed to sync repost to DB:', err.message);
    return { success: false, error: err.message };
  }
}



