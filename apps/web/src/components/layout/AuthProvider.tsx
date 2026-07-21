'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { getAvatarUrl } from '@/lib/utils';

export default function AuthProvider() {
  const updateProfile = useAppStore(s => s.updateProfile);
  const setUser = useAppStore(s => s.setUser);
  const setAuthLoading = useAppStore(s => s.setAuthLoading);
  const setFollowing = useAppStore(s => s.setFollowing);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Safety Fallback: Guarantee splash screen clears within 1.5 seconds max
    const safetyTimeout = setTimeout(() => {
      console.warn('[AuthProvider] Identity resolution safety timeout (1.5s). Clearing splash screen.');
      setAuthLoading(false);
    }, 1500);

    async function loadIdentity() {
      console.log('[AuthProvider] Starting identity resolution...');
      try {
        // Stage 1: Resolve Supabase auth session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log(
          '[AuthProvider] Auth resolved:',
          user ? `uid=${user.id}` : 'unauthenticated',
          authError?.message ?? ''
        );

        if (user && !authError) {
          // Stage 2: Fetch rich profile from the 'users' table
          console.log('[AuthProvider] Fetching profile for uid:', user.id);
          const { data: profileData, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profileData && !dbError) {
            console.log('[AuthProvider] Profile loaded for:', profileData.username);

            // Stage 3: Hydrate the global store with the authoritative identity
            // Use setUser (NOT updateProfile) to avoid triggering a DB sync loop on page load
            setUser({
              id: profileData.id,
              username: profileData.username,
              displayName: profileData.display_name,
              email: user.email,                   // Real email from Supabase auth session
              avatar: getAvatarUrl(profileData.username, profileData.avatar_url),
              isVerified: profileData.is_verified || false,
              role: profileData.role,
              bio: profileData.bio,
              karmaScore: profileData.karma_score || 0,
              followerCount: profileData.follower_count || 0,
              followingCount: profileData.following_count || 0,
              metadata: user.user_metadata || {},
              createdAt: profileData.created_at,
            });

            // Stage 4: Prefetch following IDs (TRUE fire-and-forget background task via browser client)
            // NEVER blocks route rendering or invokes Server Action IPC overhead.
            console.log('[AuthProvider] Prefetching following IDs (background)...');
            supabase
              .from('followers')
              .select('following_id')
              .eq('follower_id', user.id)
              .eq('status', 'accepted')
              .then(({ data }) => {
                const followedIds = (data || []).map((row: any) => row.following_id as string);
                setFollowing(followedIds);
                console.log('[AuthProvider] Following IDs loaded:', followedIds.length);
              })
              .catch((followErr) => {
                console.warn('[AuthProvider] Following IDs fetch failed (non-fatal):', followErr);
              });

            // Stage 5: Self-Heal Identity Switcher (only if session not already stashed)
            setTimeout(async () => {
              try {
                const { useIdentitiesStore } = await import('@/lib/identities-store');
                const store = useIdentitiesStore.getState();
                const existingIdentity = store.identities.find(i => i.id === profileData.id);
                
                if (!existingIdentity || !existingIdentity.encryptedSession) {
                  const { encryptData } = await import('@/lib/security/encryption');
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const sessionStr = JSON.stringify(session);
                    const encrypted = await encryptData(sessionStr);
                    store.addIdentity({
                      id: profileData.id,
                      username: profileData.username,
                      displayName: profileData.display_name,
                      avatarUrl: getAvatarUrl(profileData.username, profileData.avatar_url),
                    });
                    store.setEncryptedSession(profileData.id, encrypted);
                    console.log('[AuthProvider] Self-healed stashed session for uid:', profileData.id);
                  }
                }
              } catch (stashErr) {
                console.warn('[AuthProvider] Failed to stash identity/session:', stashErr);
              }
            }, 1000);

            console.log('[AuthProvider] Initialization complete.');
            return;
          }

          // DB profile fetch failed (no data or DB error).
          if (!profileData && !dbError) {
            console.warn('[AuthProvider] Auth session is valid but profile row is missing/deleted. Force signing out...');
            await supabase.auth.signOut();
            setUser(null);
            setFollowing([]);
            router.replace('/login');
            return;
          }

          // DB error (e.g. network/database down). Keep valid persisted state.
          console.warn(
            '[AuthProvider] Profile fetch database error (auth session is valid):',
            dbError?.message ?? 'Unknown database error'
          );
          return;
        }

        // No valid auth session — reset state and redirect to login
        console.log('[AuthProvider] No active session. Resetting state and redirecting to /login.');
        setUser(null);
        setFollowing([]);
        router.replace('/login');
      } catch (err) {
        console.warn('[AuthProvider] CRITICAL: Unhandled exception during identity resolution:', err);
        const existingUser = useAppStore.getState().currentUser;
        if (!existingUser) {
          console.warn('[AuthProvider] No cached user and resolution failed. Redirecting to /login.');
          setUser(null);
          router.replace('/login');
        } else {
          console.warn(
            '[AuthProvider] Resolution failed but cached user exists. Proceeding with stale profile.',
            existingUser.id
          );
        }
      } finally {
        clearTimeout(safetyTimeout);
        setAuthLoading(false);
        console.log('[AuthProvider] Auth loading flag cleared (normal path).');
      }
    }

    loadIdentity();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // Silent logic wrapper
}
