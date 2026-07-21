'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SettingsSection, SettingsRow, SettingsButton, Toast } from '../components';
import { useSpotifyProfile, useDisconnectSpotify } from '@/hooks/useSpotify';
import { AlertCircle, CheckCircle, RefreshCw, Music } from 'lucide-react';

// Official Spotify logo SVG — permitted under Spotify Brand Guidelines for integration indicators
const SpotifyLogo = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export default function ConnectionsSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: profile, isLoading, refetch } = useSpotifyProfile();
  const disconnectMutation = useDisconnectSpotify();
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Check URL query parameters for OAuth redirect status
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'spotify_connected') {
      showToast('Successfully connected your Spotify account to Verlyn!', 'success');
      refetch();
      // Clean up URL parameters
      router.replace('/settings/connections');
    } else if (error) {
      let msg = 'Failed to connect Spotify.';
      if (error === 'spotify_denied') msg = 'Spotify authorization was denied.';
      else if (error === 'token_exchange_failed') msg = 'Failed to exchange authorization code.';
      else if (error === 'profile_fetch_failed') msg = 'Failed to load Spotify profile.';
      else if (error === 'database_save_failed') msg = 'Failed to save connection in database.';
      
      showToast(msg, 'error');
      router.replace('/settings/connections');
    }
  }, [searchParams, refetch, router]);

  const handleConnect = () => {
    // Redirect to the login route which initiates Spotify OAuth
    window.location.href = '/api/auth/spotify/login';
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      showToast('Spotify disconnected successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect Spotify.', 'error');
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/spotify/refresh', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Refresh failed');
      }
      showToast('Tokens refreshed successfully!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh tokens.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl pb-10">
      <div>
        <h1 className="text-xl font-bold text-neutral-100 mb-1">Linked Accounts</h1>
        <p className="text-[13px] text-neutral-500">
          Manage your integrations with third-party networks and streaming catalogs.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <SettingsSection title="Music Streaming">
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-neutral-500">
              Use your active Spotify account to fetch your Liked Songs, Recently Played, and display music players in Verlyn.
            </p>
            
            {profile?.connected ? (
              <div className="flex flex-col gap-4 w-full">
                {/* Account connected card */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl">
                  <div className="flex items-center gap-3">
                    {profile.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={profile.profileImage} 
                        alt="Spotify Profile" 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <SpotifyLogo className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-medium text-neutral-200">{profile.displayName}</span>
                        <div className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </div>
                      </div>
                      <span className="text-[11px] text-neutral-500 block">
                        Connected on {new Date(profile.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
                      title="Force token refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                    <SettingsButton 
                      variant="danger" 
                      onClick={handleDisconnect}
                      loading={disconnectMutation.isPending}
                    >
                      Disconnect
                    </SettingsButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-between items-center p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <span className="text-xs text-neutral-400">Connect to play looping audio on your posts and stories.</span>
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/10 shrink-0"
                >
                  <SpotifyLogo className="w-4 h-4" />
                  Connect Spotify
                </button>
              </div>
            )}
          </div>
        </SettingsSection>
      )}

      {toast.show && (
        <Toast 
          show={toast.show}
          message={toast.message} 
          type={toast.type} 
        />
      )}
    </div>
  );
}
