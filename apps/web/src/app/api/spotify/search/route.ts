import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spotifyFetch } from '@/lib/music/spotifyServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const offset = searchParams.get('offset') || '0';
  const limit = searchParams.get('limit') || '20';

  if (!query) {
    return NextResponse.json({ tracks: [] });
  }

  // Get current user to check if they have a personal Spotify connection
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const searchUrl = `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}`;
    const response = await spotifyFetch(searchUrl, user?.id);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Spotify Search] API returned error:', response.status, errText);
      return NextResponse.json({ error: 'Failed to search tracks from Spotify' }, { status: response.status });
    }

    const data = await response.json();
    const tracks = (data.tracks?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: item.album?.name || '',
      albumArtUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '',
      previewUrl: item.preview_url || null, // Note: Spotify might return null for some preview URLs
      durationMs: item.duration_ms || 0,
      spotifyUrl: item.external_urls?.spotify || '',
      spotifyUri: item.uri || ''
    }));

    return NextResponse.json({ tracks });
  } catch (err: any) {
    console.error('[Spotify Search] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
