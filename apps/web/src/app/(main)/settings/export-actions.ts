'use server';

/**
 * Gathers a complete copy of the user's data.
 */
export async function requestDataExport() {
  const { createClient } = await import('@/lib/supabase/server');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized ACCESS_DENIED' };

  try {
    // 1. Fetch Profile
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    
    // 2. Fetch Posts
    const { data: posts } = await supabase.from('posts').select('*').eq('author_id', user.id);
    
    // 3. Fetch Comments
    const { data: comments } = await supabase.from('comments').select('*').eq('author_id', user.id);
    
    // 4. Fetch Following/Followers
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabaseAdmin = createAdminClient();

    let { data: following, error: fngErr } = await supabaseAdmin.from('followers').select('*').eq('follower_id', user.id);
    let { data: followers, error: ferErr } = await supabaseAdmin.from('followers').select('*').eq('following_id', user.id);

    // Resilient fallback to legacy table if followers table doesn't exist
    if (fngErr || ferErr || !following || !followers) {
      const fallbackFollowing = await supabaseAdmin.from('follows').select('*').eq('follower_id', user.id);
      const fallbackFollowers = await supabaseAdmin.from('follows').select('*').eq('following_id', user.id);
      following = fallbackFollowing.data || [];
      followers = fallbackFollowers.data || [];
    }

    const archive = {
      account_info: {
        id: user.id,
        email: user.email,
        profile: profile,
        exported_at: new Date().toISOString()
      },
      posts: posts || [],
      comments: comments || [],
      connections: {
        following: following || [],
        followers: followers || []
      },
      export_metadata: {
        version: '1.0.0',
        protocol: 'SECURE_EXPORT',
        security_hash: crypto.randomUUID()
      }
    };

    return { success: true, archive: JSON.stringify(archive, null, 2) };
  } catch (err) {
    return { error: 'Failed to generate data export' };
  }
}
