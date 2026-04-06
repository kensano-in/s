'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Plus, X, Play, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createStory, markStoryViewed } from '@/app/(main)/feed/story-actions';
import { uploadMedia } from '@/app/(main)/feed/upload';

interface DBStory {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  view_count: number;
  expires_at: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface StoryGroup {
  author: DBStory['author'];
  stories: DBStory[];
  hasUnviewed: boolean;
}

export default function StoryReel() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<StoryGroup | null>(null);
  const [viewerIdx, setViewerIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { currentUser } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadStories() {
      const { data } = await supabase
        .from('stories')
        .select('id, media_url, media_type, view_count, expires_at, created_at, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        // Group by author
        const groupMap = new Map<string, StoryGroup>();
        for (const s of data as unknown as DBStory[]) {
          const aid = s.author.id;
          if (!groupMap.has(aid)) {
            groupMap.set(aid, { author: s.author, stories: [], hasUnviewed: true });
          }
          groupMap.get(aid)!.stories.push(s);
        }
        setGroups(Array.from(groupMap.values()));
      }
      setLoading(false);
    }
    loadStories();
  }, [supabase]);

  const openViewer = (group: StoryGroup) => {
    setViewerGroup(group);
    setViewerIdx(0);
    setProgress(0);
    setViewerOpen(true);
  };

  useEffect(() => {
    if (!viewerOpen || !viewerGroup) return;
    // Mark as viewed
    const story = viewerGroup.stories[viewerIdx];
    if (story && currentUser?.id) markStoryViewed(story.id, currentUser.id);
    // Progress bar
    setProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          // Auto advance
          if (viewerIdx < viewerGroup.stories.length - 1) {
            setViewerIdx(i => i + 1);
          } else {
            setViewerOpen(false);
          }
          return 0;
        }
        return p + 2; // 100/50 steps = 5 seconds
      });
    }, 100);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [viewerOpen, viewerGroup, viewerIdx, currentUser?.id]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !currentUser?.id) return;
    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'stories');
    const result = await uploadMedia(fd);
    if ('error' in result) {
      setUploading(false);
      return;
    }
    await createStory(currentUser.id, result.url, isVideo ? 'video' : 'image');
    // Refresh
    setUploading(false);
    window.location.reload();
  };

  const getAvatar = (a: DBStory['author']) =>
    a.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.username}`;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={e => handleFileUpload(e.target.files)}
      />

      <div
        className="flex gap-3 p-4 rounded-2xl border overflow-x-auto hide-scrollbar"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* My Story — upload button */}
        <button
          className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <div className="relative">
            <div
              className="w-14 h-14 rounded-full overflow-hidden border-2 transition-transform duration-200 group-hover:scale-105"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'me'}`}
                alt="My Story"
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))', border: '2px solid var(--surface)' }}
            >
              {uploading ? <Loader2 size={9} className="animate-spin text-white" /> : <Plus size={10} color="white" />}
            </div>
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Add Story</span>
        </button>

        {/* Story groups from DB */}
        {loading ? (
          <div className="flex items-center px-4">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.author.id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              onClick={() => openViewer(group)}
            >
              <div
                className="transition-transform duration-200 group-hover:scale-105"
                style={{
                  padding: '2px',
                  borderRadius: '9999px',
                  background: group.hasUnviewed
                    ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))'
                    : 'var(--border)',
                }}
              >
                <div className="rounded-full overflow-hidden" style={{ padding: '2px', background: 'var(--surface)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatar(group.author)}
                    alt={group.author.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.author.username}`; }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium max-w-[56px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {(group.author.display_name || group.author.username).split(' ')[0]}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Story Viewer Modal */}
      {viewerOpen && viewerGroup && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
          <div className="relative w-full max-w-sm h-full max-h-[90vh] flex flex-col">
            {/* Progress bars */}
            <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
              {viewerGroup.stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 rounded-full overflow-hidden bg-white/30">
                  <div
                    className="h-full bg-white transition-none"
                    style={{
                      width: i < viewerIdx ? '100%' : i === viewerIdx ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Author */}
            <div className="absolute top-8 left-4 z-10 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAvatar(viewerGroup.author)} alt="" className="w-8 h-8 rounded-full object-cover border border-white/40" />
              <span className="text-sm font-bold text-white drop-shadow">{viewerGroup.author.display_name}</span>
            </div>

            {/* Close */}
            <button
              className="absolute top-8 right-4 z-10 text-white"
              onClick={() => setViewerOpen(false)}
            >
              <X size={24} />
            </button>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center">
              {viewerGroup.stories[viewerIdx]?.media_type === 'video' ? (
                <video
                  src={viewerGroup.stories[viewerIdx].media_url}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewerGroup.stories[viewerIdx]?.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Tap zones */}
            <button
              className="absolute left-0 top-0 w-1/3 h-full z-10"
              onClick={() => setViewerIdx(i => Math.max(0, i - 1))}
            />
            <button
              className="absolute right-0 top-0 w-1/3 h-full z-10"
              onClick={() => {
                if (viewerIdx < viewerGroup.stories.length - 1) setViewerIdx(i => i + 1);
                else setViewerOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
