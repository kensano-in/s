import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRedirectUri } from '@/lib/music/spotifyServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const state = searchParams.get('state');

  // Verify auth session
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[Spotify Callback] User is not authenticated in Verlyn:', authError);
    return new NextResponse('Unauthorized: You must be logged into Verlyn to connect Spotify.', { status: 401 });
  }

  // Handle Spotify authorization cancellation or error
  if (errorParam) {
    console.warn('[Spotify Callback] Spotify returned authorization error:', errorParam);
    return NextResponse.redirect(new URL('/settings/connections?error=spotify_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings/connections?error=no_code', request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new NextResponse('Spotify developer credentials are not configured on the server.', { status: 500 });
  }

  const redirectUri = getRedirectUri(request.url);

  try {
    // 1. Exchange code for access & refresh tokens
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: 'no-store',
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[Spotify Callback] Token exchange failed:', errText);
      return NextResponse.redirect(new URL('/settings/connections?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // 2. Query user profile from Spotify API
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!profileResponse.ok) {
      const errText = await profileResponse.text();
      console.error('[Spotify Callback] Profile fetch failed:', errText);
      return NextResponse.redirect(new URL('/settings/connections?error=profile_fetch_failed', request.url));
    }

    const profileData = await profileResponse.json();
    const spotifyUserId = profileData.id;
    const displayName = profileData.display_name || spotifyUserId;
    const profileImage = profileData.images?.[0]?.url || null;

    // 3. Upsert connection in database using Admin client (to bypass insert/update RLS rules)
    const adminClient = createAdminClient();
    const { error: dbError } = await adminClient
      .from('user_spotify_connections')
      .upsert({
        user_id: user.id,
        spotify_user_id: spotifyUserId,
        display_name: displayName,
        profile_image: profileImage,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('[Spotify Callback] Database insert failed:', dbError.message);
      return NextResponse.redirect(new URL('/settings/connections?error=database_save_failed', request.url));
    }

    console.log(`[Spotify Callback] Successfully connected user ${user.id} to Spotify account: ${spotifyUserId}`);
    return NextResponse.redirect(new URL('/settings/connections?success=spotify_connected', request.url));

  } catch (err: any) {
    console.error('[Spotify Callback] Unexpected error:', err);
    return NextResponse.redirect(new URL(`/settings/connections?error=unexpected_error&details=${encodeURIComponent(err.message)}`, request.url));
  }
}
