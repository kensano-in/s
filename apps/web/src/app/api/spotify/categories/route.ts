import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { spotifyFetch } from '@/lib/music/spotifyServer';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    // Fetch browse categories from Spotify
    const response = await spotifyFetch('/browse/categories?limit=12', user?.id);

    if (!response.ok) {
      const errText = await response.text();
      console.warn('[Spotify Categories] API returned error:', response.status, errText);
      // Return hardcoded default fallback categories if Spotify API fails
      return NextResponse.json({
        categories: [
          { id: 'pop', name: 'Pop', iconUrl: 'https://i.scdn.co/image/ab67706f0000000238c77e2c9ef8f2c3d5a49704' },
          { id: 'hiphop', name: 'Hip-Hop', iconUrl: 'https://i.scdn.co/image/ab67706f000000029bb6cc551c0c3e1b0b5c15e5' },
          { id: 'dance', name: 'Dance & Electronic', iconUrl: 'https://i.scdn.co/image/ab67706f0000000203ffc7947de4c5417ec6e2d9' },
          { id: 'rock', name: 'Rock', iconUrl: 'https://i.scdn.co/image/ab67706f000000027fb47334ab7c10b77fa8f6e4' }
        ]
      });
    }

    const data = await response.json();
    const categories = (data.categories?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      iconUrl: item.icons?.[0]?.url || ''
    }));

    return NextResponse.json({ categories });
  } catch (err: any) {
    console.error('[Spotify Categories] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
