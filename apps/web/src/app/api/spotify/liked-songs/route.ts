import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spotifyFetch } from '@/lib/music/spotifyServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'liked'; // 'liked' or 'recent'

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (type === 'liked') {
      const response = await spotifyFetch('/me/tracks?limit=30', user.id);
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          return NextResponse.json({ connected: false, error: 'Spotify account not connected or permissions expired.' });
        }
        const errText = await response.text();
        return NextResponse.json({ error: `Spotify error: ${errText}` }, { status: response.status });
      }

      const data = await response.json();
      const tracks = (data.items || []).map((item: any) => {
        const track = item.track;
        return {
          id: track.id,
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name || '',
          albumArtUrl: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
          previewUrl: track.preview_url || null,
          durationMs: track.duration_ms || 0,
          spotifyUrl: track.external_urls?.spotify || '',
          spotifyUri: track.uri || ''
        };
      });

      return NextResponse.json({ tracks });
    } else if (type === 'recent') {
      const response = await spotifyFetch('/me/player/recently-played?limit=30', user.id);
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          return NextResponse.json({ connected: false, error: 'Spotify account not connected or permissions expired.' });
        }
        const errText = await response.text();
        return NextResponse.json({ error: `Spotify error: ${errText}` }, { status: response.status });
      }

      const data = await response.json();
      const tracks = (data.items || []).map((item: any) => {
        const track = item.track;
        return {
          id: track.id,
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          album: track.album?.name || '',
          albumArtUrl: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
          previewUrl: track.preview_url || null,
          durationMs: track.duration_ms || 0,
          spotifyUrl: track.external_urls?.spotify || '',
          spotifyUri: track.uri || ''
        };
      });

      // Filter out duplicate tracks from recently played list if any
      const uniqueTracks = tracks.filter((track: any, index: number, self: any[]) =>
        self.findIndex((t) => t.id === track.id) === index
      );

      return NextResponse.json({ tracks: uniqueTracks });
    } else {
      return NextResponse.json({ error: 'Invalid type parameter. Use "liked" or "recent".' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[Spotify Liked/Recent] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
