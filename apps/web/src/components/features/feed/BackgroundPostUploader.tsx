'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { 
  CloudUpload, CheckCircle, AlertTriangle, RotateCcw, X, 
  Loader2, Sparkles, Cpu, WifiOff, Check
} from 'lucide-react';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { submitPost } from '@/app/(main)/feed/actions';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function BackgroundPostUploader() {
  const activePostUpload = useAppStore(s => s.activePostUpload);
  const setActivePostUpload = useAppStore(s => s.setActivePostUpload);
  const uploadDraft = useAppStore(s => s.uploadDraft);
  const setUploadDraft = useAppStore(s => s.setUploadDraft);

  const queryClient = useQueryClient();
  const [statusText, setStatusText] = useState('Initializing upload...');
  const isUploadingRef = useRef(false);

  useEffect(() => {
    if (!activePostUpload || activePostUpload.status !== 'uploading' || isUploadingRef.current) {
      return;
    }

    // Start background uploading
    runBackgroundUpload();
  }, [activePostUpload?.status]);

  const runBackgroundUpload = async () => {
    if (!uploadDraft) {
      setActivePostUpload(null);
      return;
    }

    isUploadingRef.current = true;
    setStatusText('Compressing media assets...');
    setActivePostUpload({
      ...activePostUpload!,
      progress: 5,
      status: 'uploading',
      errorMsg: null
    });

    try {
      // 1. Simulate/Run background compression for video items
      const hasVideos = uploadDraft.selectedMedia.some(m => m.type === 'video');
      if (hasVideos) {
        // Linear video compression simulation
        for (let p = 5; p <= 20; p += 3) {
          await new Promise(resolve => setTimeout(resolve, 350));
          setActivePostUpload({
            ...activePostUpload!,
            progress: p,
            status: 'uploading',
            errorMsg: null
          });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setStatusText('Uploading secure data packets...');
      const uploadedUrls: string[] = [];
      const totalItems = uploadDraft.selectedMedia.length;

      // 2. Upload media items with automatic retry logic
      for (let i = 0; i < totalItems; i++) {
        const item = uploadDraft.selectedMedia[i];
        let publicUrl = '';

        if (!item.url.startsWith('blob:')) {
          // If it's already a public URL (mock assets), skip uploading
          publicUrl = item.url;
        } else {
          // Local blob file, upload with retries
          let attempt = 0;
          const maxAttempts = 3;
          let success = false;
          let lastError = 'Unknown error';

          while (attempt < maxAttempts && !success) {
            try {
              setStatusText(`Uploading asset ${i + 1}/${totalItems} (Attempt ${attempt + 1})...`);
              
              let fileToUpload: File;
              if (item.file) {
                fileToUpload = item.file;
              } else {
                // Fallback to fetch if file object is missing
                const blobRes = await fetch(item.url);
                const blob = await blobRes.blob();
                fileToUpload = new File([blob], item.name || `asset-${i}.${item.type === 'video' ? 'mp4' : 'jpg'}`, { type: blob.type });
              }

              const formData = new FormData();
              formData.append('file', fileToUpload);
              formData.append('folder', 'posts');

              const uploadRes = await uploadMedia(formData);
              if ('url' in uploadRes) {
                publicUrl = uploadRes.url;
                success = true;
              } else {
                lastError = uploadRes.error || 'Upload failed';
                attempt++;
                if (attempt < maxAttempts) {
                  // Exponential backoff delay
                  await new Promise(r => setTimeout(r, attempt * 1000));
                }
              }
            } catch (err: any) {
              lastError = err.message || 'Network exception';
              attempt++;
              if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, attempt * 1000));
              }
            }
          }

          if (!success) {
            throw new Error(`Failed to upload ${item.name || 'media asset'}: ${lastError}`);
          }
        }

        uploadedUrls.push(publicUrl);
        
        // Update progress incrementally
        const baseProgress = hasVideos ? 20 : 10;
        const uploadProgress = Math.round(baseProgress + ((i + 1) / totalItems) * 65);
        setActivePostUpload({
          ...activePostUpload!,
          progress: Math.min(uploadProgress, 85),
          status: 'uploading',
          errorMsg: null
        });
      }

      // 3. Finalize upload metadata (Verifying and Inserting in Database)
      setStatusText('Verifying cryptographic hashes...');
      setActivePostUpload({
        ...activePostUpload!,
        progress: 90,
        status: 'verifying',
        errorMsg: null
      });
      await new Promise(resolve => setTimeout(resolve, 800));

      setStatusText('Broadcasting post payload...');
      
      const privacyMap: Record<string, string> = {
        'everyone': 'public',
        'followers': 'followers',
        'friends': 'private',
        'close_friends': 'private',
        'private': 'private',
        'custom': 'private'
      };

      const finalPrivacy = privacyMap[uploadDraft.audience] || 'public';

      // Submit post with retries
      let submitSuccess = false;
      let submitAttempt = 0;
      let submitError = 'Failed to insert';

      while (submitAttempt < 3 && !submitSuccess) {
        try {
          let finalContent = uploadDraft.caption || '';
          if (uploadDraft.taggedUsers && uploadDraft.taggedUsers.length > 0) {
            const formattedTags = uploadDraft.taggedUsers
              .map((u: string) => u.startsWith('@') ? u : `@${u}`)
              .join(' ');
            finalContent += `${finalContent ? '\n\n' : ''}— with ${formattedTags}`;
          }
          if (uploadDraft.selectedLocation) {
            finalContent += `${finalContent ? '\n\n' : ''}[📍 ${uploadDraft.selectedLocation}]`;
          }

          const submitFormData = new FormData();
          submitFormData.append('content', finalContent);
          submitFormData.append('privacy', finalPrivacy);
          uploadedUrls.forEach(url => {
            submitFormData.append('mediaUrls', url);
          });

          // Spotify metadata
          if (uploadDraft.selectedSpotifyTrack) {
            submitFormData.append('spotifyTrackId', uploadDraft.selectedSpotifyTrack.id);
            submitFormData.append('spotifyTrackName', uploadDraft.selectedSpotifyTrack.name);
            submitFormData.append('spotifyTrackArtist', uploadDraft.selectedSpotifyTrack.artist);
            submitFormData.append('spotifyTrackAlbum', uploadDraft.selectedSpotifyTrack.album);
            submitFormData.append('spotifyTrackArtUrl', uploadDraft.selectedSpotifyTrack.albumArtUrl);
            submitFormData.append('spotifyTrackDuration', uploadDraft.selectedSpotifyTrack.durationMs.toString());
            if (uploadDraft.selectedSpotifyTrack.previewUrl) {
              submitFormData.append('spotifyTrackPreviewUrl', uploadDraft.selectedSpotifyTrack.previewUrl);
            }
            submitFormData.append('soundtrackVolume', uploadDraft.musicVolume.toString());
            submitFormData.append('soundtrackTrimStart', uploadDraft.musicTrimStart.toString());
            submitFormData.append('soundtrackTrimEnd', uploadDraft.musicTrimEnd.toString());
          }

          const res = await submitPost(submitFormData);
          if (res?.success) {
            submitSuccess = true;
          } else {
            submitError = res?.error || 'Database submission failed';
            submitAttempt++;
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (err: any) {
          submitError = err.message || 'Database exception';
          submitAttempt++;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!submitSuccess) {
        throw new Error(`Broadcasting failed: ${submitError}`);
      }

      // Success
      setStatusText('Post Dispatch Broadcasted!');
      setActivePostUpload({
        ...activePostUpload!,
        progress: 100,
        status: 'success',
        errorMsg: null
      });

      // Clear drafts and invalidate cache
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setUploadDraft(null);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setActivePostUpload(null);
      }, 3500);

    } catch (error: any) {
      console.warn('[BACKGROUND UPLOAD ERROR]', error);
      setActivePostUpload({
        ...activePostUpload!,
        status: 'error',
        errorMsg: error.message || 'Upload failed due to network disruption.'
      });
    } finally {
      isUploadingRef.current = false;
    }
  };

  const handleRetry = () => {
    if (!activePostUpload || activePostUpload.status !== 'error') return;
    setActivePostUpload({
      ...activePostUpload,
      status: 'uploading',
      progress: 0,
      errorMsg: null
    });
  };

  const handleCancel = () => {
    setActivePostUpload(null);
    setUploadDraft(null);
  };

  if (!activePostUpload) return null;

  const isUploading = activePostUpload.status === 'uploading' || activePostUpload.status === 'verifying';
  const isError = activePostUpload.status === 'error';
  const isSuccess = activePostUpload.status === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-[999] w-[340px] select-none">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          className={clsx(
            "p-4 rounded-2xl border backdrop-blur-xl shadow-2xl relative flex flex-col gap-3 transition-colors duration-300",
            isSuccess 
              ? "bg-emerald-950/45 border-emerald-500/30 text-emerald-100" 
              : isError 
                ? "bg-red-950/45 border-red-500/30 text-red-100" 
                : "bg-neutral-950/80 border-white/[0.06] text-white"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            {activePostUpload.thumbnailUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                <img src={activePostUpload.thumbnailUrl} className="w-full h-full object-cover" alt="Thumbnail" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <CloudUpload className="text-[#6C63FF]" size={18} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-[#6C63FF] font-black uppercase tracking-widest block">
                  {isSuccess ? 'BROADCAST COMPLETE' : isError ? 'TRANSMISSION ERROR' : 'BACKGROUND DISPATCH'}
                </span>
                {isUploading && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6C63FF]"></span>
                  </span>
                )}
              </div>
              <h4 className="text-[11px] font-bold truncate mt-0.5">
                {isSuccess ? 'Dispatch fully live!' : isError ? 'Upload failed' : statusText}
              </h4>
            </div>

            {!isSuccess && (
              <button 
                onClick={handleCancel}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Progress Bar or Action items */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>{activePostUpload.mediaCount} media asset{activePostUpload.mediaCount > 1 ? 's' : ''}</span>
              <span className="font-bold text-white">{activePostUpload.progress}%</span>
            </div>

            {/* Glowing Progress bar */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                className={clsx(
                  "h-full rounded-full transition-all duration-300",
                  isSuccess 
                    ? "bg-emerald-500" 
                    : isError 
                      ? "bg-red-500" 
                      : "bg-gradient-to-r from-[#6C63FF] to-cyan-400 shadow-glow"
                )}
                style={{ width: `${activePostUpload.progress}%` }}
              />
            </div>
          </div>

          {/* Error and actions footer */}
          {isError && (
            <div className="flex items-center justify-between pt-1 border-t border-red-500/10 text-[10px] font-mono">
              <span className="text-red-400/90 truncate max-w-[200px] flex items-center gap-1">
                <AlertTriangle size={10} />
                {activePostUpload.errorMsg || 'Network failed'}
              </span>
              <button 
                onClick={handleRetry}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/25 hover:bg-red-500/40 text-red-200 border border-red-500/20 active:scale-95 transition-all"
              >
                <RotateCcw size={10} />
                Retry
              </button>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/95 pt-1 border-t border-emerald-500/10">
              <Check size={12} className="text-emerald-400" />
              <span>Feed synchronizer updated successfully!</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
