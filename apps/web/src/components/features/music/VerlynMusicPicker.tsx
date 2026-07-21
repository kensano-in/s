'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  useSpotifyProfile, 
  useSpotifySearch, 
  useSpotifyCategories, 
  useSpotifyLibrary, 
  useSpotifyRecommendations,
  SpotifyTrack 
} from '@/hooks/useSpotify';
import { 
  Search, 
  Play, 
  Pause, 
  Music, 
  Heart, 
  Clock, 
  Sparkles, 
  Grid, 
  X, 
  ArrowLeft,
  Volume2
} from 'lucide-react';
import clsx from 'clsx';

interface VerlynMusicPickerProps {
  onClose: () => void;
  onSelectTrack: (track: SpotifyTrack) => void;
}

type TabType = 'trending' | 'liked' | 'recent' | 'browse';

export default function VerlynMusicPicker({ onClose, onSelectTrack }: VerlynMusicPickerProps) {
  const { data: profile } = useSpotifyProfile();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('trending');

  // Preview Audio state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hook invocations
  const { data: searchResults, isLoading: isSearching } = useSpotifySearch(debouncedQuery);
  const { data: categoriesData } = useSpotifyCategories();
  const { data: recData, isLoading: isRecsLoading } = useSpotifyRecommendations();
  const { data: likedData, isLoading: isLikedLoading } = useSpotifyLibrary('liked', !!profile?.connected);
  const { data: recentData, isLoading: isRecentLoading } = useSpotifyLibrary('recent', !!profile?.connected);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPreview = (track: SpotifyTrack, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering track selection

    if (!track.previewUrl) {
      alert("No audio preview available for this track from Spotify.");
      return;
    }

    if (playingTrackId === track.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play new audio
      const audio = new Audio(track.previewUrl);
      audio.volume = 0.5;
      audio.loop = true;
      audio.play().catch(err => console.error("Audio playback failed:", err));
      
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const handleSelectTrack = (track: SpotifyTrack) => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onSelectTrack(track);
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Determine which list of tracks to render
  let displayTracks: SpotifyTrack[] = [];
  let isTabLoading = false;

  if (debouncedQuery.trim().length > 0) {
    displayTracks = searchResults?.tracks || [];
    isTabLoading = isSearching;
  } else if (activeTab === 'trending') {
    displayTracks = recData?.tracks || [];
    isTabLoading = isRecsLoading;
  } else if (activeTab === 'liked') {
    displayTracks = likedData?.tracks || [];
    isTabLoading = isLikedLoading;
  } else if (activeTab === 'recent') {
    displayTracks = recentData?.tracks || [];
    isTabLoading = isRecentLoading;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-3xl text-neutral-200 animate-in fade-in slide-in-from-bottom duration-300">
      
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              Add Soundtrack
            </h2>
            <p className="text-[11px] text-neutral-500">Search millions of songs via Spotify</p>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input bar */}
      <div className="px-6 py-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search tracks, artists, albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.04] border border-white/5 focus:border-cyan-500/30 rounded-xl text-[14px] placeholder-neutral-500 text-neutral-100 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 text-[12px] text-neutral-500 hover:text-neutral-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tabs (only shown when not searching) */}
      {!debouncedQuery && (
        <div className="flex px-6 border-b border-white/5 gap-6 text-[13px] font-semibold text-neutral-500">
          <button
            onClick={() => setActiveTab('trending')}
            className={clsx(
              "pb-3 relative transition-colors flex items-center gap-1.5",
              activeTab === 'trending' ? "text-cyan-400" : "hover:text-neutral-300"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Recommended
            {activeTab === 'trending' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={clsx(
              "pb-3 relative transition-colors flex items-center gap-1.5",
              activeTab === 'liked' ? "text-cyan-400" : "hover:text-neutral-300"
            )}
          >
            <Heart className="w-3.5 h-3.5" />
            Likes
            {activeTab === 'liked' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={clsx(
              "pb-3 relative transition-colors flex items-center gap-1.5",
              activeTab === 'recent' ? "text-cyan-400" : "hover:text-neutral-300"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent
            {activeTab === 'recent' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />}
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={clsx(
              "pb-3 relative transition-colors flex items-center gap-1.5",
              activeTab === 'browse' ? "text-cyan-400" : "hover:text-neutral-300"
            )}
          >
            <Grid className="w-3.5 h-3.5" />
            Browse Genres
            {activeTab === 'browse' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-full" />}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        
        {/* Connected state warning for Likes/Recent */}
        {!debouncedQuery && (activeTab === 'liked' || activeTab === 'recent') && !profile?.connected && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-white/5 bg-white/[0.01] rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Music className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-[15px] font-bold text-neutral-200 mb-1">Spotify Connection Required</h3>
            <p className="text-[12px] text-neutral-500 max-w-xs mb-4">
              Connect your personal Spotify account to display your Liked Songs and listening history.
            </p>
            <button
              onClick={() => window.location.href = '/api/auth/spotify/login'}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
            >
              Connect Spotify
            </button>
          </div>
        )}

        {/* Categories / Genres View */}
        {!debouncedQuery && activeTab === 'browse' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categoriesData?.categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSearchQuery(cat.name)}
                className="relative overflow-hidden aspect-[16/9] rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-4 text-left transition-all group"
              >
                <span className="text-[14px] font-bold text-neutral-200 relative z-10 block group-hover:text-cyan-400 transition-colors">
                  {cat.name}
                </span>
                {cat.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.iconUrl}
                    alt={cat.name}
                    className="absolute right-[-10px] bottom-[-10px] w-16 h-16 rounded-lg opacity-40 group-hover:scale-110 transition-transform rotate-[15deg] object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tracks List (Search / Recommendations / Library) */}
        {((!debouncedQuery && activeTab !== 'browse' && (profile?.connected || (activeTab === 'trending'))) || !!debouncedQuery) && (
          <div className="space-y-1">
            {isTabLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-11 h-11 bg-white/5 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-white/5 rounded w-1/3" />
                    <div className="h-3 bg-white/5 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : displayTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-neutral-500">
                <Music className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-[13px]">No tracks found.</span>
              </div>
            ) : (
              displayTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => handleSelectTrack(track)}
                  className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/[0.02] cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/5">
                      {track.albumArtUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.albumArtUrl} alt={track.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-4 h-4 text-neutral-600" />
                        </div>
                      )}
                      
                      {/* Play overlay on hover */}
                      <button
                        onClick={(e) => handlePlayPreview(track, e)}
                        className={clsx(
                          "absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity",
                          playingTrackId === track.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {playingTrackId === track.id ? (
                          <Pause className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="min-w-0">
                      <span className={clsx(
                        "text-[14px] font-semibold block truncate leading-tight",
                        playingTrackId === track.id ? "text-cyan-400" : "text-neutral-200"
                      )}>
                        {track.name}
                      </span>
                      <span className="text-[12px] text-neutral-500 truncate block mt-0.5">
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 pl-2">
                    {playingTrackId === track.id && (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                    )}
                    <span className="text-[11px] text-neutral-500">
                      {formatDuration(track.durationMs)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

    </div>
  );
}
