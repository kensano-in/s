'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Ensure bucket exists via Service Role Client to bypass restrict bucket RLS policies
  try {
    await supabaseAdmin.storage.createBucket('media', { public: true });
  } catch (err) {
    // Fails silently if it already exists or if key restricts it
  }

  const { error } = await supabaseAdmin.storage
    .from('media')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { error: error.message };

  const { data } = supabaseAdmin.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl };
}
