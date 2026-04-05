'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export async function createCommunity(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const displayName = formData.get('displayName') as string;
    const description = formData.get('description') as string;
    const isPrivate = formData.get('isPrivate') === 'true';

    // Basic validation
    if (!name || !displayName || !description) {
      return { success: false, error: 'All fields are required.' };
    }

    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        display_name: displayName,
        description,
        is_private: isPrivate,
        icon_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
        member_count: 1,
        boost_level: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Community creation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, community };
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal error checking community' };
  }
}
