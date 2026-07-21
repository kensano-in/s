import { createAdminClient } from '@/lib/supabase/admin';

// In-memory cache for client credentials token (server-to-server)
interface ClientCredentialsCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let clientCredentialsCache: ClientCredentialsCache | null = null;

// Spotify API configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

// Dynamically build redirect URI depending on the request's origin (fallback to env)
export function getRedirectUri(requestUrl?: string): string {
  if (requestUrl) {
    try {
      const urlObj = new URL(requestUrl);
      // If running on localhost or verlyn.in, use the request host
      return `${urlObj.protocol}//${urlObj.host}/api/auth/spotify/callback`;
    } catch {
      // Fallback
    }
  }
  return process.env.SPOTIFY_REDIRECT_URI || 'https://verlyn.in/api/auth/spotify/callback';
}

/**
 * Encodes Client ID and Client Secret to Basic Auth header
 */
function getBasicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

/**
 * Gets a valid Client Credentials Token (server-to-server) for guest searches
 */
export async function getClientCredentialsToken(): Promise<string> {
  const now = Date.now();
  if (clientCredentialsCache && clientCredentialsCache.expiresAt > now + 60000) {
    return clientCredentialsCache.accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[Spotify] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    throw new Error('Spotify developer credentials are not configured on the server.');
  }

  console.log('[Spotify] Fetching new Client Credentials Token...');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch client credentials token: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  clientCredentialsCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Refreshes the user's Spotify access token using their refresh token
 */
export async function refreshUserAccessToken(userId: string, refreshToken: string): Promise<string> {
  console.log(`[Spotify] Refreshing access token for user: ${userId}...`);
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Spotify developer credentials are not configured on the server.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Spotify token: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token || refreshToken; // Spotify might not return a new refresh token
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Save the refreshed token back to the database using admin client
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('user_spotify_connections')
    .update({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error(`[Spotify] Failed to update refreshed tokens in database:`, error.message);
  }

  return newAccessToken;
}

/**
 * Gets the user's Spotify connection details, auto-refreshing if expired.
 * Returns null if the user has not connected Spotify.
 */
export async function getUserSpotifyToken(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('user_spotify_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`[Spotify] Failed to query user connection:`, error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  // If token is expired or expiring in the next 2 minutes, refresh it
  if (expiresAt.getTime() <= now.getTime() + 120000) {
    try {
      return await refreshUserAccessToken(userId, data.refresh_token);
    } catch (err: any) {
      console.error(`[Spotify] Automatic token refresh failed:`, err.message);
      // Fallback: return expired token and hope for the best, or return null
      return null;
    }
  }

  return data.access_token;
}

/**
 * Helper to fetch from Spotify API with automatic fallback/refresh token management.
 */
export async function spotifyFetch(
  endpoint: string,
  userId?: string | null,
  options: RequestInit = {}
): Promise<Response> {
  let token = '';

  if (userId) {
    const userToken = await getUserSpotifyToken(userId);
    if (userToken) {
      token = userToken;
    } else {
      token = await getClientCredentialsToken();
    }
  } else {
    token = await getClientCredentialsToken();
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
