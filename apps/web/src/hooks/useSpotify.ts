import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  previewUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
  spotifyUri: string;
}

export interface SpotifyProfile {
  connected: boolean;
  spotifyUserId?: string;
  displayName?: string;
  profileImage?: string | null;
  expiresAt?: string;
  createdAt?: string;
}

export interface SpotifyCategory {
  id: string;
  name: string;
  iconUrl: string;
}

/**
 * Hook to fetch the user's Spotify connection profile
 */
export function useSpotifyProfile() {
  return useQuery<SpotifyProfile>({
    queryKey: ['spotify', 'profile'],
    queryFn: async () => {
      const response = await fetch('/api/spotify/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch Spotify profile');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to disconnect Spotify
 */
export function useDisconnectSpotify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/spotify/disconnect', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to disconnect Spotify');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate profile query to update UI instantly
      queryClient.setQueryData(['spotify', 'profile'], { connected: false });
      queryClient.invalidateQueries({ queryKey: ['spotify'] });
    },
  });
}

/**
 * Hook to search tracks
 */
export function useSpotifySearch(query: string, offset = 0, limit = 20) {
  return useQuery<{ tracks: SpotifyTrack[] }>({
    queryKey: ['spotify', 'search', query, offset, limit],
    queryFn: async () => {
      if (!query.trim()) return { tracks: [] };
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes cache for searches
  });
}

/**
 * Hook to fetch browsing categories
 */
export function useSpotifyCategories() {
  return useQuery<{ categories: SpotifyCategory[] }>({
    queryKey: ['spotify', 'categories'],
    queryFn: async () => {
      const response = await fetch('/api/spotify/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60, // Categories change slowly, cache for 1 hour
  });
}

/**
 * Hook to fetch user's library tracks (Liked Songs or Recently Played)
 */
export function useSpotifyLibrary(type: 'liked' | 'recent', connected: boolean) {
  return useQuery<{ tracks: SpotifyTrack[] }>({
    queryKey: ['spotify', 'library', type],
    queryFn: async () => {
      const response = await fetch(`/api/spotify/liked-songs?type=${type}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} tracks`);
      }
      return response.json();
    },
    // Only enable if user has connected Spotify
    enabled: connected,
    staleTime: 1000 * 60 * 1, // 1 minute cache
  });
}

/**
 * Hook to fetch recommendations (personalized if connected, generic genres if guest)
 */
export function useSpotifyRecommendations() {
  return useQuery<{ tracks: SpotifyTrack[] }>({
    queryKey: ['spotify', 'recommendations'],
    queryFn: async () => {
      const response = await fetch('/api/spotify/recommendations');
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
