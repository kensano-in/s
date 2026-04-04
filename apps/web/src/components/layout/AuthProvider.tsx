'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';

export default function AuthProvider() {
  const { updateProfile } = useAppStore();
  const router = useRouter();
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

    // FIX 2: Auth session listener — redirect on sign-out or session termination
    // Note: TOKEN_REFRESH_FAILED is not in Supabase AuthChangeEvent union;
    // SIGNED_OUT covers expired/revoked tokens after refresh failure.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => { subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // Silent logic wrapper
}
