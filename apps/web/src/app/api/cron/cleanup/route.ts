import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

export const maxDuration = 300; // Allow 5 minutes execution time (Vercel max)

export async function POST(req: NextRequest) {
  // Authentication check
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();
  const logs: string[] = [];

  try {
    logs.push('[START] Nightly storage cleanup sweep');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. POST-BASED MEDIA EXPIRATION & COMPRESSION (OLDER THAN 90 & 30 DAYS)
    // ─────────────────────────────────────────────────────────────────────────
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // A. EXPIRE POSTS & STORIES (Older than 90 Days)
    logs.push(`[EXPIRATION] Scanning posts & stories older than 90 days (created before ${ninetyDaysAgo})`);
    
    // Fetch posts
    const { data: expiredPosts } = await supabaseAdmin
      .from('posts')
      .select('id, media_urls')
      .lt('created_at', ninetyDaysAgo);

    if (expiredPosts && expiredPosts.length > 0) {
      let deletedFilesCount = 0;
      for (const post of expiredPosts) {
        if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
          const filePaths: string[] = [];
          for (const url of post.media_urls) {
            const parts = url.split('/media/object/public/media/');
            if (parts.length > 1) {
              filePaths.push(decodeURIComponent(parts[1]));
            }
          }
          if (filePaths.length > 0) {
            await supabaseAdmin.storage.from('media').remove(filePaths);
            deletedFilesCount += filePaths.length;
          }
          // Clear media_urls in database
          await supabaseAdmin
            .from('posts')
            .update({ media_urls: [] })
            .eq('id', post.id);
        }
      }
      logs.push(`[EXPIRATION] Deleted ${deletedFilesCount} files from expired posts.`);
    }

    // Fetch stories
    const { data: expiredStories } = await supabaseAdmin
      .from('stories')
      .select('id, media_url')
      .lt('created_at', ninetyDaysAgo);

    if (expiredStories && expiredStories.length > 0) {
      let deletedStoriesCount = 0;
      for (const story of expiredStories) {
        if (story.media_url) {
          const parts = story.media_url.split('/media/object/public/media/');
          if (parts.length > 1) {
            const filePath = decodeURIComponent(parts[1]);
            await supabaseAdmin.storage.from('media').remove([filePath]);
            deletedStoriesCount++;
          }
          // Delete expired story database record
          await supabaseAdmin.from('stories').delete().eq('id', story.id);
        }
      }
      logs.push(`[EXPIRATION] Deleted ${deletedStoriesCount} expired story files and records.`);
    }

    // B. COMPRESS UNVIEWED POSTS (Older than 30 Days and no views in last 30 days)
    logs.push(`[COMPRESSION] Scanning posts older than 30 days for low-activity compression (created before ${thirtyDaysAgo})`);
    const { data: candidatePosts } = await supabaseAdmin
      .from('posts')
      .select('id, media_urls')
      .lt('created_at', thirtyDaysAgo);

    if (candidatePosts && candidatePosts.length > 0) {
      let compressedFilesCount = 0;
      for (const post of candidatePosts) {
        if (!post.media_urls || !Array.isArray(post.media_urls) || post.media_urls.length === 0) continue;

        // Check if viewed in last 30 days
        const { count, error: countErr } = await supabaseAdmin
          .from('engagement_logs')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('action_type', 'view')
          .gt('created_at', thirtyDaysAgo);

        if (countErr) {
          console.warn('[COMPRESSION] Failed to check views for post:', post.id, countErr.message);
          continue;
        }

        // If no views in last 30 days, compress files to low-res
        if (count === 0) {
          for (const url of post.media_urls) {
            const parts = url.split('/media/object/public/media/');
            if (parts.length > 1) {
              const filePath = decodeURIComponent(parts[1]);
              
              // Skip if it's not a standard image path
              if (filePath.startsWith('avatars/') || filePath.startsWith('banners/')) continue;

              try {
                // Download file
                const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
                  .from('media')
                  .download(filePath);

                if (downloadErr || !fileData) continue;

                const fileBuffer = Buffer.from(await fileData.arrayBuffer());
                
                // Only compress standard images (exclude videos)
                const isImage = filePath.match(/\.(jpg|jpeg|png|webp)$/i);
                if (isImage) {
                  // Compress to low-res (max 320px width, quality 40)
                  const compressed = await sharp(fileBuffer)
                    .resize(320, null, { withoutEnlargement: true })
                    .webp({ quality: 40 })
                    .toBuffer();

                  // Upload back (upsert)
                  const { error: uploadErr } = await supabaseAdmin.storage
                    .from('media')
                    .upload(filePath, compressed, {
                      contentType: 'image/webp',
                      upsert: true
                    });

                  if (!uploadErr) {
                    compressedFilesCount++;
                  }
                }
              } catch (err: any) {
                console.warn('[COMPRESSION] Failed to compress file:', filePath, err.message);
              }
            }
          }
        }
      }
      logs.push(`[COMPRESSION] Successfully compressed ${compressedFilesCount} low-activity post images.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ORPHAN FILE SWEEP (NOT REFERENCED IN DATABASE)
    // ─────────────────────────────────────────────────────────────────────────
    logs.push('[ORPHAN SWEEP] Gathering database references...');

    // Fetch all database references to verify against
    const [
      { data: userPics },
      { data: postMedia },
      { data: storyMedia },
      { data: chatMedia }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('avatar_url, banner_url'),
      supabaseAdmin.from('posts').select('media_urls'),
      supabaseAdmin.from('stories').select('media_url'),
      supabaseAdmin.from('messages').select('media_url').not('media_url', 'is', null)
    ]);

    const activePaths = new Set<string>();

    // Parse references
    const addPath = (url: string | null | undefined) => {
      if (!url) return;
      const parts = url.split('/object/public/');
      if (parts.length > 1) {
        const pathPart = parts[1]; // e.g. "media/posts/uid/file.webp" or "chat-files/file.jpg"
        activePaths.add(decodeURIComponent(pathPart));
      }
    };

    userPics?.forEach(u => {
      addPath(u.avatar_url);
      addPath(u.banner_url);
    });

    postMedia?.forEach(p => {
      if (Array.isArray(p.media_urls)) {
        p.media_urls.forEach(url => addPath(url));
      }
    });

    storyMedia?.forEach(s => addPath(s.media_url));
    chatMedia?.forEach(m => addPath(m.media_url));

    logs.push(`[ORPHAN SWEEP] Found ${activePaths.size} active database file references.`);

    // A. Sweep 'chat-files' bucket
    logs.push('[ORPHAN SWEEP] Scanning chat-files bucket...');
    const { data: chatFilesList } = await supabaseAdmin.storage
      .from('chat-files')
      .list('', { limit: 1000 });

    if (chatFilesList && chatFilesList.length > 0) {
      const orphans: string[] = [];
      for (const file of chatFilesList) {
        const bucketPath = `chat-files/${file.name}`;
        if (!activePaths.has(bucketPath) && file.name !== '.placeholder') {
          orphans.push(file.name);
        }
      }

      if (orphans.length > 0) {
        const { error: removeErr } = await supabaseAdmin.storage
          .from('chat-files')
          .remove(orphans);
        if (removeErr) {
          logs.push(`[ORPHAN SWEEP] Error deleting chat-files orphans: ${removeErr.message}`);
        } else {
          logs.push(`[ORPHAN SWEEP] Cleaned up ${orphans.length} orphan files from chat-files bucket.`);
        }
      } else {
        logs.push('[ORPHAN SWEEP] No orphans found in chat-files.');
      }
    }

    // B. Sweep 'media' bucket (recursively scanning folders)
    logs.push('[ORPHAN SWEEP] Scanning media bucket folders...');
    const folders = ['avatars', 'banners', 'posts', 'stories', 'communities'];
    let mediaOrphansCount = 0;

    for (const folder of folders) {
      // List all users subfolders in folder
      const { data: userSubdirs } = await supabaseAdmin.storage
        .from('media')
        .list(folder, { limit: 200 });

      if (!userSubdirs) continue;

      for (const subdir of userSubdirs) {
        if (!subdir.id && subdir.name) { // represents a subdirectory
          const pathPrefix = `${folder}/${subdir.name}`;
          const { data: files } = await supabaseAdmin.storage
            .from('media')
            .list(pathPrefix, { limit: 1000 });

          if (!files) continue;

          const filesToDelete: string[] = [];
          for (const file of files) {
            const fullBucketPath = `media/${pathPrefix}/${file.name}`;
            if (!activePaths.has(fullBucketPath) && file.name !== '.placeholder') {
              filesToDelete.push(`${pathPrefix}/${file.name}`);
            }
          }

          if (filesToDelete.length > 0) {
            const { error: removeErr } = await supabaseAdmin.storage
              .from('media')
              .remove(filesToDelete);
            if (!removeErr) {
              mediaOrphansCount += filesToDelete.length;
            }
          }
        }
      }
    }

    logs.push(`[ORPHAN SWEEP] Cleaned up ${mediaOrphansCount} orphan files from media bucket.`);
    logs.push('[SUCCESS] Storage cleanup sweep completed successfully.');

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    logs.push(`[ERROR] Cleanup failed: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 });
  }
}
