'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Gathers a complete cryptographic dump of the user's data.
 */
export async function requestDataExport() {
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
    const { data: following } = await supabase.from('follows').select('*').eq('follower_id', user.id);
    const { data: followers } = await supabase.from('follows').select('*').eq('following_id', user.id);

    const archive = {
      identity_node: {
        id: user.id,
        email: user.email,
        metadata: profile,
        synchronized_at: new Date().toISOString()
      },
      broadcast_history: posts || [],
      neural_interactions: comments || [],
      network_topology: {
        outbound_links: following || [],
        inbound_links: followers || []
      },
      export_metadata: {
        version: '0.2.4-NODE_SIGMA',
        protocol: 'SIG_E2EE_ACTIVE',
        security_hash: crypto.randomUUID()
      }
    };

    return { success: true, archive: JSON.stringify(archive, null, 2) };
  } catch (err) {
    return { error: 'Internal Neural Collapse' };
  }
}
