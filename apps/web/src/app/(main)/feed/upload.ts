'use server';

/**
 * Upload a media file to Supabase Storage server-side.
 * This bypasses client-side RLS issues — the server client is always authenticated.
 */
export async function uploadMedia(formData: FormData): Promise<{ url: string } | { error: string }> {
  const { createClient } = await import('@/lib/supabase/server');
  const { createAdminClient } = await import('@/lib/supabase/admin');

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'posts';

  if (!file) return { error: 'No file provided' };
  if (file.size > 50 * 1024 * 1024) return { error: 'File too large (max 50MB)' };

  // Server-Authoritative Anti-Spam Check for Uploads
  const { isUserRestricted } = await import('@/lib/spamGuard');
  const { recordActivityAndCheckSpam } = await import('@/lib/moderationEngine');

  if (await isUserRestricted(user.id, 'posts') || await isUserRestricted(user.id, 'stories')) {
    return { error: 'You are restricted from uploading media due to spamming.' };
  }

  const spamResult = await recordActivityAndCheckSpam(user.id, 'upload_media');
  if (spamResult.blocked) {
    if (spamResult.warning) {
      return { error: `Warning: ${spamResult.warning}` };
    }
    return { error: 'You are restricted from uploading media due to spamming.' };
  }

  let ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  let path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  let buffer = Buffer.from(bytes);

  // ─── SERVER-SIDE IMAGE VALIDATION ──────────────────────────────────────────
  let detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return { error: 'Invalid file format or corrupt image.' };
  }

  // Compress photo if folder is not avatars or banners
  if (folder !== 'avatars' && folder !== 'banners' && detectedMime.startsWith('image/')) {
    try {
      const sharp = require('sharp');
      const image = sharp(buffer);
      const metadata = await image.metadata();

      let pipeline = image;
      if (metadata.width && metadata.width > 1600) {
        pipeline = pipeline.resize(1600, null, { withoutEnlargement: true });
      }

      const compressedBuffer = await pipeline
        .webp({ quality: 75, lossless: false })
        .toBuffer();

      buffer = compressedBuffer;
      detectedMime = 'image/webp';
      path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      console.log(`[STORAGE COMPRESSION] Compressed image: ${bytes.byteLength} -> ${buffer.length} bytes`);
    } catch (compressErr: any) {
      console.warn('[STORAGE COMPRESSION] Sharp image compression failed, uploading original:', compressErr.message);
    }
  }

  if (folder === 'avatars') {
    // Only JPG, JPEG, PNG, WEBP allowed (No GIF, no animations, no videos)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(detectedMime)) {
      return { error: 'Invalid profile picture format. Only JPG, PNG, and WEBP are allowed.' };
    }
    if (detectedMime === 'image/gif') {
      return { error: 'Animated GIFs are not allowed as profile pictures.' };
    }
    if (detectedMime === 'image/png' && isAnimatedPng(buffer)) {
      return { error: 'Animated PNGs are not allowed as profile pictures.' };
    }
    if (detectedMime === 'image/webp' && isAnimatedWebp(buffer)) {
      return { error: 'Animated WEBP images are not allowed as profile pictures.' };
    }
  } else if (folder === 'banners') {
    // JPG, JPEG, PNG, WEBP, GIF allowed
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(detectedMime)) {
      return { error: 'Unsupported banner format. Allowed formats: JPG, JPEG, PNG, WEBP, GIF.' };
    }

    // Size limit for banners: 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return { error: `Banner file size too large (${(buffer.length / (1024 * 1024)).toFixed(2)}MB). Max allowed size is 10MB.` };
    }

    // Resolution check
    let resolution: { width: number; height: number } | null = null;
    if (detectedMime === 'image/gif') {
      resolution = getGifResolution(buffer);
    } else if (detectedMime === 'image/png') {
      resolution = getPngResolution(buffer);
    } else if (detectedMime === 'image/webp') {
      resolution = getWebpResolution(buffer);
    } else if (detectedMime === 'image/jpeg') {
      resolution = getJpegResolution(buffer);
    }

    if (resolution) {
      const MAX_W = 1920;
      const MAX_H = 1080;
      if (resolution.width > MAX_W || resolution.height > MAX_H) {
        return { error: `Banner resolution too large (${resolution.width}x${resolution.height}). Max allowed resolution is ${MAX_W}x${MAX_H}.` };
      }
    }

    // Duration limits for GIF banner
    if (detectedMime === 'image/gif') {
      const gifInfo = getGifDurationAndFrames(buffer);
      const MAX_DURATION_MS = 10000; // 10 seconds
      const MAX_FRAMES = 150;
      if (gifInfo.durationMs > MAX_DURATION_MS) {
        return { error: `Banner GIF duration too long (${(gifInfo.durationMs / 1000).toFixed(2)}s). Max allowed duration is 10 seconds.` };
      }
      if (gifInfo.frames > MAX_FRAMES) {
        return { error: `Banner GIF contains too many frames (${gifInfo.frames}). Max allowed frames count is ${MAX_FRAMES}.` };
      }
    }
  }

  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

  // 1. Cloudflare R2 Upload Path
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const S3 = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: detectedMime || file.type,
        CacheControl: 'max-age=3600',
      });
      
      await S3.send(command);
      
      // Return the public URL
      const publicUrl = `${R2_PUBLIC_URL ? R2_PUBLIC_URL : `https://pub-your-id.r2.dev`}/${path}`;
      return { url: publicUrl };
    } catch (err: any) {
      console.error('[R2 UPLOAD ERROR]', err);
      return { error: 'Failed to upload to Cloudflare R2: ' + err.message };
    }
  }

  // 2. Supabase Storage Fallback Path
  const supabaseAdmin = createAdminClient();

  // Ensure bucket exists via Service Role Client to bypass restrict bucket RLS policies
  try {
    await supabaseAdmin.storage.createBucket('media', { public: true });
  } catch (err) {
    // Fails silently if it already exists or if key restricts it
  }

  const { error } = await supabaseAdmin.storage
    .from('media')
    .upload(path, buffer, {
      contentType: detectedMime || file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { error: error.message };

  const { data } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl };
}

// ─── SERVER-SIDE IMAGE VALIDATION HELPERS ────────────────────────────────────

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  if (buffer.length >= 12 && 
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // Video signatures
  if (buffer.length >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return 'video/mp4';
  }
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return 'video/webm';
  }
  return null;
}

function isAnimatedGif(buffer: Buffer): boolean {
  let gceCount = 0;
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xF9) {
      gceCount++;
      if (gceCount > 1) return true;
    }
  }
  return false;
}

function isAnimatedWebp(buffer: Buffer): boolean {
  const anim = Buffer.from('ANIM');
  const anmf = Buffer.from('ANMF');
  return buffer.indexOf(anim) !== -1 || buffer.indexOf(anmf) !== -1;
}

function isAnimatedPng(buffer: Buffer): boolean {
  const actl = Buffer.from('acTL');
  return buffer.indexOf(actl) !== -1;
}

function getGifResolution(buffer: Buffer) {
  if (buffer.length < 10) return null;
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

function getPngResolution(buffer: Buffer) {
  if (buffer.length < 24) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function getWebpResolution(buffer: Buffer) {
  if (buffer.length < 30) return null;
  const format = buffer.toString('ascii', 12, 16);
  if (format === 'VP8 ') {
    const width = buffer.readUInt16LE(26) & 0x3FFF;
    const height = buffer.readUInt16LE(28) & 0x3FFF;
    return { width, height };
  } else if (format === 'VP8L') {
    const val = buffer.readUInt32LE(21);
    const width = (val & 0x3FFF) + 1;
    const height = ((val >> 14) & 0x3FFF) + 1;
    return { width, height };
  } else if (format === 'VP8X') {
    const width = (buffer.readUInt32LE(24) & 0xFFFFFF) + 1;
    const height = (buffer.readUInt32LE(27) & 0xFFFFFF) + 1;
    return { width, height };
  }
  return null;
}

function getJpegResolution(buffer: Buffer) {
  let i = 2;
  while (i < buffer.length - 8) {
    if (buffer[i] === 0xFF) {
      const marker = buffer[i + 1];
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC9) || (marker >= 0xCB && marker <= 0xCF)) {
        const height = buffer.readUInt16BE(i + 5);
        const width = buffer.readUInt16BE(i + 7);
        return { width, height };
      }
      i += 2 + buffer.readUInt16BE(i + 2);
    } else {
      i++;
    }
  }
  return null;
}

function getGifDurationAndFrames(buffer: Buffer) {
  let frames = 0;
  let totalDelayHundredths = 0;
  for (let i = 0; i < buffer.length - 6; i++) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xF9 && buffer[i + 2] === 4) {
      frames++;
      const delay = buffer.readUInt16LE(i + 4);
      totalDelayHundredths += delay || 10;
    }
  }
  return { frames, durationMs: totalDelayHundredths * 10 };
}
