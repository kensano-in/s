import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spotifyFetch } from '@/lib/music/spotifyServer';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    let seedTracks = '';
    const seedGenres = 'pop,hip-hop,dance';

    // If user is logged in, try to fetch their recently played tracks to seed personalized recommendations
    if (user) {
      try {
        const recentlyPlayedRes = await spotifyFetch('/me/player/recently-played?limit=3', user.id);
        if (recentlyPlayedRes.ok) {
          const rpData = await recentlyPlayedRes.json();
          const ids = (rpData.items || [])
            .map((item: any) => item.track?.id)
            .filter(Boolean);
          if (ids.length > 0) {
            seedTracks = ids.join(',');
          }
        }
      } catch (err) {
        console.warn('[Spotify Recommendations] Failed to fetch recently played seeds:', err);
      }
    }

    let recUrl = '/recommendations?limit=25';
    if (seedTracks) {
      recUrl += `&seed_tracks=${seedTracks}`;
    } else {
      recUrl += `&seed_genres=${seedGenres}`;
    }

    const response = await spotifyFetch(recUrl, user?.id);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Spotify Recommendations] API returned error:', response.status, errText);
      return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: response.status });
    }

    const data = await response.json();
    const tracks = (data.tracks || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: item.album?.name || '',
      albumArtUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '',
      previewUrl: item.preview_url || null,
      durationMs: item.duration_ms || 0,
      spotifyUrl: item.external_urls?.spotify || '',
      spotifyUri: item.uri || ''
    }));

    return NextResponse.json({ tracks });
  } catch (err: any) {
    console.error('[Spotify Recommendations] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
