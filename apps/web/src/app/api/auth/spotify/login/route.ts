import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { getRedirectUri } from '@/lib/music/spotifyServer';

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Spotify integration is not configured on the server.' },
      { status: 500 }
    );
  }

  // Define scopes required for profile mapping,Liked Songs, and Recently Played
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'user-read-recently-played'
  ].join(' ');

  const redirectUri = getRedirectUri(request.url);
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('show_dialog', 'true'); // Force show dialog for clean account switches

  // Set the state in a cookie or session if CSRF state verification is needed,
  // but for simplicity and seamless flow we redirect directly.
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('spotify_auth_state', state, {
    path: '/',
    httpOnly: true,
    maxAge: 300, // 5 minutes
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  return response;
}
