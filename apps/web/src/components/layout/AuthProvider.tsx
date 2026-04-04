'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';

export default function AuthProvider() {
  const { updateProfile } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    async function loadIdentity() {
      // 1. Get auth session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (user && !authError) {
        // 2. Fetch the corresponding rich profile from our 'users' table
        const { data: profileData, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData && !dbError) {
          // 3. Inject the real Sovereign Identity into local memory, replacing mock data
          updateProfile({
            id: profileData.id,
            username: profileData.username,
            displayName: profileData.display_name,
            avatar: profileData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.username}`,
            role: profileData.role,
            bio: profileData.bio,
            karmaScore: profileData.karma_score,
            followerCount: profileData.follower_count,
            followingCount: profileData.following_count,
            createdAt: profileData.created_at,
          });
        }
      }
    }

    loadIdentity();
  }, [updateProfile, supabase]);

  return null; // Silent logic wrapper
}
