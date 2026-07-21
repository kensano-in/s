import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Initialize the S3 client configured for Cloudflare R2
const S3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Generates a presigned URL that allows the client to upload a file directly to Cloudflare R2
 * without routing the file bytes through the Next.js API server.
 */
export async function generatePresignedUploadUrl(fileName: string, contentType: string) {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('Cloudflare R2 credentials are not fully configured in environment variables.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 900 });
  const finalUrl = `${R2_PUBLIC_URL}/${fileName}`;

  return {
    uploadUrl,
    finalUrl,
  };
}

/**
 * Extracts the R2 key from a public R2 URL.
 */
function getR2KeyFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr, 'http://localhost');
    if (url.pathname === '/api/media') {
      const file = url.searchParams.get('file');
      if (file) return file;
    }
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
  } catch {
    return urlStr; // Fallback to raw string if it's already a key
  }
}

/**
 * Deletes a single file from Cloudflare R2 or Supabase depending on the URL format.
 */
export async function deleteMediaFile(urlOrKey: string) {
  if (!urlOrKey) return;

  const isProxyUrl = urlOrKey.includes('/api/media');
  const isR2Proxy = isProxyUrl && urlOrKey.includes('storage=r2');
  const isSupabaseProxy = isProxyUrl && urlOrKey.includes('storage=supabase');

  const isR2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
  const isSupabaseUrl = urlOrKey.includes('supabase.co') || urlOrKey.includes('/storage/v1/object/') || isSupabaseProxy;

  if (isR2Configured && (!isSupabaseUrl || urlOrKey.includes('.r2.dev') || isR2Proxy)) {
    // Delete from R2
    const key = getR2KeyFromUrl(urlOrKey);
    try {
      console.debug(`[R2 CLEANUP] Deleting key: ${key}`);
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });
      await S3.send(command);
    } catch (err: any) {
      console.warn('[R2 CLEANUP] Failed to delete from R2:', err.message);
    }
  } else {
    // Delete from Supabase Storage
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabaseAdmin = await createClient(); // uses service role if configured or client

      // Dynamically extract bucket and path from Supabase URL
      let bucket = 'media';
      let supabasePath = urlOrKey;

      if (isSupabaseProxy) {
        const url = new URL(urlOrKey, 'http://localhost');
        const file = url.searchParams.get('file');
        if (file) {
          const slashIndex = file.indexOf('/');
          if (slashIndex !== -1) {
            bucket = file.slice(0, slashIndex);
            supabasePath = file.slice(slashIndex + 1);
          } else {
            supabasePath = file;
          }
        }
      } else if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
        try {
          const url = new URL(urlOrKey);
          const parts = url.pathname.split('/object/public/');
          if (parts.length > 1) {
            const bucketAndPath = parts[1];
            const slashIndex = bucketAndPath.indexOf('/');
            if (slashIndex !== -1) {
              bucket = bucketAndPath.slice(0, slashIndex);
              supabasePath = decodeURIComponent(bucketAndPath.slice(slashIndex + 1));
            }
          }
        } catch (urlErr) {
          console.warn('[SUPABASE CLEANUP] URL parse fallback:', urlErr);
        }
      }

      console.debug(`[SUPABASE CLEANUP] Deleting bucket: ${bucket}, path: ${supabasePath}`);
      await supabaseAdmin.storage.from(bucket).remove([supabasePath]);
    } catch (err: any) {
      console.warn('[SUPABASE CLEANUP] Failed to delete from Supabase:', err.message);
    }
  }
}

/**
 * Deletes multiple files from Cloudflare R2 and/or Supabase depending on their URL formats.
 */
export async function deleteMultipleMediaFiles(urlsOrKeys: string[]) {
  if (!urlsOrKeys || urlsOrKeys.length === 0) return;

  const isR2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

  const r2Keys: string[] = [];
  const supabaseDeletions: { bucket: string; path: string }[] = [];

  for (const item of urlsOrKeys) {
    const isProxyUrl = item.includes('/api/media');
    const isR2Proxy = isProxyUrl && item.includes('storage=r2');
    const isSupabaseProxy = isProxyUrl && item.includes('storage=supabase');

    const isSupabaseUrl = item.includes('supabase.co') || item.includes('/storage/v1/object/') || isSupabaseProxy;
    
    if (isR2Configured && (!isSupabaseUrl || item.includes('.r2.dev') || isR2Proxy)) {
      r2Keys.push(getR2KeyFromUrl(item));
    } else {
      let bucket = 'media';
      let supabasePath = item;

      if (isSupabaseProxy) {
        const url = new URL(item, 'http://localhost');
        const file = url.searchParams.get('file');
        if (file) {
          const slashIndex = file.indexOf('/');
          if (slashIndex !== -1) {
            bucket = file.slice(0, slashIndex);
            supabasePath = file.slice(slashIndex + 1);
          } else {
            supabasePath = file;
          }
        }
      } else if (item.startsWith('http://') || item.startsWith('https://')) {
        try {
          const url = new URL(item);
          const parts = url.pathname.split('/object/public/');
          if (parts.length > 1) {
            const bucketAndPath = parts[1];
            const slashIndex = bucketAndPath.indexOf('/');
            if (slashIndex !== -1) {
              bucket = bucketAndPath.slice(0, slashIndex);
              supabasePath = decodeURIComponent(bucketAndPath.slice(slashIndex + 1));
            }
          }
        } catch (urlErr) {
          console.warn('[SUPABASE CLEANUP] URL parse fallback:', urlErr);
        }
      }
      supabaseDeletions.push({ bucket, path: supabasePath });
    }
  }

  // Execute R2 Deletions
  if (r2Keys.length > 0 && isR2Configured) {
    try {
      console.debug(`[R2 CLEANUP] Deleting ${r2Keys.length} keys...`);
      const command = new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: r2Keys.map(k => ({ Key: k })),
          Quiet: true,
        },
      });
      await S3.send(command);
    } catch (err: any) {
      console.warn('[R2 CLEANUP] Failed to delete multiple keys from R2:', err.message);
    }
  }

  // Execute Supabase Deletions grouped by bucket
  if (supabaseDeletions.length > 0) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabaseAdmin = await createClient();

      // Group by bucket name
      const groups = supabaseDeletions.reduce((acc, curr) => {
        if (!acc[curr.bucket]) acc[curr.bucket] = [];
        acc[curr.bucket].push(curr.path);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [bucket, paths] of Object.entries(groups)) {
        console.debug(`[SUPABASE CLEANUP] Deleting ${paths.length} paths from bucket: ${bucket}...`);
        await supabaseAdmin.storage.from(bucket).remove(paths);
      }
    } catch (err: any) {
      console.warn('[SUPABASE CLEANUP] Failed to delete multiple paths from Supabase:', err.message);
    }
  }
}

