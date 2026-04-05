'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// We store settings in the users table. If the settings JSONB column doesn't exist yet, we catch the error gracefully.
export async function updateUserSettings(
  userId: string, 
  settings: {
    is_private?: boolean;
    e2ee_enabled?: boolean;
    two_fa_enabled?: boolean;
    push_notifs_enabled?: boolean;
    email_digest_enabled?: boolean;
  }
) {
  try {
    // 1. Update primitive is_private column if it exists
    if (settings.is_private !== undefined) {
      await supabaseAdmin.from('users').update({ is_private: settings.is_private }).eq('id', userId);
    }

    // 2. We use Supabase Auth user_metadata to store the rest natively without needing a schema change immediately!
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authErr && authData?.user) {
      const currentMeta = authData.user.user_metadata || {};
      const newMeta = {
        ...currentMeta,
        e2ee_enabled: settings.e2ee_enabled ?? currentMeta.e2ee_enabled,
        two_fa_enabled: settings.two_fa_enabled ?? currentMeta.two_fa_enabled,
        push_notifs_enabled: settings.push_notifs_enabled ?? currentMeta.push_notifs_enabled,
        email_digest_enabled: settings.email_digest_enabled ?? currentMeta.email_digest_enabled,
      };
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: newMeta
      });
      if (updateErr) throw updateErr;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update settings:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getUserAuthSettings(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return { success: true, metadata: data?.user?.user_metadata || {} };
  } catch (err: any) {
    return { success: false, metadata: {} };
  }
}
