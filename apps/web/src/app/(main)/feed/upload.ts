'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Upload a media file to Supabase Storage server-side.
 * This bypasses client-side RLS issues — the server client is always authenticated.
 */
export async function uploadMedia(formData: FormData): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string) || 'posts';

  if (!file) return { error: 'No file provided' };
  if (file.size > 50 * 1024 * 1024) return { error: 'File too large (max 50MB)' };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Ensure bucket exists before uploading. Fails silently if it already exists or if no permissions (which is fine, we just want to try)
  await supabase.storage.createBucket('media', { public: true }).catch(() => {});

  const { error } = await supabase.storage
    .from('media')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl };
}
