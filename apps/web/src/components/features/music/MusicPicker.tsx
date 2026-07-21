'use client';

import { useState, useMemo } from 'react';
import { Search, Music, Link as LinkIcon, AlertCircle, Check, Play, Pause } from 'lucide-react';
import clsx from 'clsx';

// Curated library of royalty-free/popular licensed tracks for instant selection
export interface Track {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  source: 'spotify' | 'youtube' | 'soundcloud';
  embedId: string;
}

const POPULAR_TRACKS: Track[] = [
  {
    id: 'after_dark',
    name: 'After Dark',
    artist: 'Mr.Kitty',
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop',
    source: 'spotify',
    embedId: '2H7J22v7w7rTz72h62x' // Placeholder Spotify track ID
  },
  {
    id: 'midnight_city',
    name: 'Midnight City',
    artist: 'M83',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=120&auto=format&fit=crop',
    source: 'spotify',
    embedId: '12S43v87Tz365x'
  },
  {
    id: 'nightcall',
    name: 'Nightcall',
    artist: 'Kavinsky',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=120&auto=format&fit=crop',
    source: 'youtube',
    embedId: 'MV_3Dpw-BRY'
  },
  {
    id: 'sweater_weather',
    name: 'Sweater Weather',
    artist: 'The Neighbourhood',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=120&auto=format&fit=crop',
    source: 'spotify',
    embedId: '2TpxZ7JUBn3uw7'
  },
  {
    id: 'starboy',
    name: 'Starboy',
    artist: 'The Weeknd',
    artwork: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=120&auto=format&fit=crop',
    source: 'spotify',
    embedId: '7MXVqp4nEO15gLJZ4sz'
  }
];

interface MusicPickerProps {
  onSelectTrack: (track: Track | null) => void;
  selectedTrack: Track | null;
}

export function MusicPicker({ onSelectTrack, selectedTrack }: MusicPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Filter curated tracks
  const filteredTracks = useMemo(() => {
    const clean = searchQuery.toLowerCase().trim();
    if (!clean) return POPULAR_TRACKS;
    return POPULAR_TRACKS.filter(t => 
      t.name.toLowerCase().includes(clean) || 
      t.artist.toLowerCase().includes(clean)
    );
  }, [searchQuery]);

  // URL Parser for Spotify/YouTube/SoundCloud
  const handleParseUrl = () => {
    setUrlError(null);
    const url = urlInput.trim();
    if (!url) return;

    try {
      // 1. Spotify
      if (url.includes('spotify.com')) {
        const trackMatch = url.match(/\/track\/([a-zA-Z0-9]+)/);
        if (trackMatch) {
          const trackId = trackMatch[1];
          onSelectTrack({
            id: `spot_${trackId}`,
            name: 'Pasted Spotify Track',
            artist: 'External Artist',
            artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop',
            source: 'spotify',
            embedId: trackId
          });
          setUrlInput('');
          return;
        }
        setUrlError('Invalid Spotify Track URL. Must contain /track/ID');
        return;
      }

      // 2. YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
        } else {
          const vMatch = url.match(/[?&]v=([^&#]+)/);
          videoId = vMatch ? vMatch[1] : '';
        }
        if (videoId) {
          onSelectTrack({
            id: `yt_${videoId}`,
            name: 'Pasted YouTube Video',
            artist: 'External Video',
            artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=120&auto=format&fit=crop',
            source: 'youtube',
            embedId: videoId
          });
          setUrlInput('');
          return;
        }
        setUrlError('Invalid YouTube URL. Could not parse video ID.');
        return;
      }

      // 3. SoundCloud
      if (url.includes('soundcloud.com')) {
        // SoundCloud uses the full URL for its embed widget player
        onSelectTrack({
          id: `sc_${Buffer.from(url).toString('base64').substring(0, 16)}`,
          name: 'SoundCloud Audio Stream',
          artist: 'SoundCloud Artist',
          artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=120&auto=format&fit=crop',
          source: 'soundcloud',
          embedId: encodeURIComponent(url)
        });
        setUrlInput('');
        return;
      }

      setUrlError('Unsupported media url. Must be Spotify, YouTube, or SoundCloud.');
    } catch (e) {
      setUrlError('Error parsing URL. Please double check.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Active pinned track card status preview */}
      {selectedTrack && (
        <div className="p-4 bg-[#0A0A0A] border border-green-500/20 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
              <img src={selectedTrack.artwork} alt={selectedTrack.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-green-400 tracking-wider flex items-center gap-1.5 leading-none mb-1">
                <Music size={10} /> Active Theme Song
              </span>
              <h4 className="text-[13px] font-bold text-white leading-tight truncate max-w-[200px]">{selectedTrack.name}</h4>
              <p className="text-[11.5px] text-neutral-500 mt-0.5 leading-none">{selectedTrack.artist}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTrack(null)}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:text-red-400 text-red-500 text-[11px] font-bold rounded-lg transition-all active:scale-95"
          >
            Remove Pinned Track
          </button>
        </div>
      )}

      {/* Grid: Search Library Left, Paste URL Right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Paste link parser */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">
            Paste Embed URL Link
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Spotify, YouTube, or SoundCloud link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleParseUrl())}
                className={clsx(
                  "w-full pl-9 pr-4 py-2.5 bg-[#141414] border rounded-xl text-[12.5px] focus:outline-none placeholder-neutral-600 transition-all",
                  urlError ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-blue-500/50 text-neutral-200"
                )}
              />
              {urlError && (
                <span className="absolute -bottom-5 left-1 text-[9px] font-bold text-red-400 flex items-center gap-1">
                  <AlertCircle size={10} />
                  {urlError}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleParseUrl}
              className="px-4 py-2.5 bg-neutral-900 border border-white/5 hover:border-white/10 hover:text-white rounded-xl text-[12px] font-bold text-neutral-300 transition-all active:scale-95 shrink-0"
            >
              Parse
            </button>
          </div>
        </div>

        {/* Search catalog query input */}
        <div className="space-y-2">
          <label className="block text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider">
            Search Curated Theme Catalog
          </label>
          <div className="relative">
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search trending licensed titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#141414] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-xl text-[12.5px] text-neutral-200 focus:outline-none placeholder-neutral-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Curated list result boxes */}
      <div className="border border-white/5 rounded-2xl bg-[#080808] p-3 max-h-[180px] overflow-y-auto page-scroll">
        <h5 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2 px-1">Trending Identity Catalog</h5>
        <div className="space-y-1">
          {filteredTracks.map((track) => {
            const isSelected = selectedTrack?.id === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onSelectTrack(track)}
                className={clsx(
                  "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border",
                  isSelected
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-[#0E0E0E] border-transparent hover:border-white/5 hover:bg-neutral-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-950 border border-white/5 shrink-0">
                    <img src={track.artwork} alt={track.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h5 className="text-[12.5px] font-bold text-white leading-none">{track.name}</h5>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-none">{track.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-extrabold tracking-wider font-mono text-neutral-600 bg-neutral-950 px-2 py-0.5 rounded border border-white/5">{track.source}</span>
                  {isSelected && <Check size={12} className="text-blue-400 shrink-0 ml-1" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
