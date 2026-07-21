'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type Update = {
  id: string;
  title: string;
  content: string;
  version: string | null;
  category: string;
  created_at: string;
};

export async function getUpdates(): Promise<{ updates: Update[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { updates: [], error: error.message };
  return { updates: data as Update[] };
}

export async function saveRichUpdate(
  id: string | null,
  title: string,
  version: string,
  category: string,
  jsonContent: string
): Promise<{ success: boolean; data?: Update; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Not authenticated' };

  // Verify user is 's'
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!profile || profile.username !== 's') {
    return { success: false, error: 'Access denied' };
  }

  if (!title?.trim()) {
    return { success: false, error: 'Title is required' };
  }

  const payload = {
    title: title.trim(),
    version: version?.trim() || null,
    category: category?.trim() || 'general',
    content: jsonContent,
  };

  const adminSupabase = createAdminClient();

  if (id) {
    const { data, error } = await adminSupabase
      .from('updates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/updates');
    return { success: true, data: data as Update };
  } else {
    const { data, error } = await adminSupabase
      .from('updates')
      .insert(payload)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/updates');
    return { success: true, data: data as Update };
  }
}

export async function pushUpdate(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Not authenticated' };

  // Verify user is 's'
  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!profile || profile.username !== 's') {
    return { success: false, error: 'Access denied' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const version = formData.get('version') as string;
  const category = formData.get('category') as string;

  if (!title?.trim() || !content?.trim()) {
    return { success: false, error: 'Title and content are required' };
  }

  const { error } = await supabase.from('updates').insert({
    title: title.trim(),
    content: content.trim(),
    version: version?.trim() || null,
    category: category?.trim() || 'general',
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/updates');
  return { success: true };
}

export async function deleteUpdate(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (!profile || profile.username !== 's') {
    return { success: false, error: 'Access denied' };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.from('updates').delete().eq('id', id).select();
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return { success: false, error: 'No update was deleted. Check if database permissions or RLS policies block deletions.' };
  }

  revalidatePath('/updates');
  return { success: true };
}

