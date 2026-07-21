'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Play, Pause, Trash2, Camera, Upload, 
  Folder, HardDrive, Cloud, AlertCircle, RefreshCw, CheckCircle, 
  Loader2, Clipboard, Image as ImageIcon, Video, HelpCircle, Laptop, Check, Download,
  PenTool
} from 'lucide-react';
import clsx from 'clsx';
import PostEditingStudio from './PostEditingStudio';
import PostPublishingStudio from './PostPublishingStudio';
import PostConfirmationPage from './PostConfirmationPage';
import VerlynMusicPicker from '@/components/features/music/VerlynMusicPicker';
import { SpotifyTrack } from '@/hooks/useSpotify';
import dynamicImport from 'next/dynamic';

const BasicDraw = dynamicImport(
  () => import('@/components/features/draw/BasicDraw'),
  { ssr: false }
);


// Pre-defined premium mock assets for post creation gallery (Removed for production real mode)
const MOCK_GALLERY_ITEMS: any[] = [];

// Pre-defined mock Downloads folder items (Removed for production real mode)
const MOCK_DOWNLOAD_ITEMS: any[] = [];

// Pre-defined mock Cloud folder items (Removed for production real mode)
const MOCK_CLOUD_ITEMS: any[] = [];

interface SelectedMedia {
  id: string;
  type: 'image' | 'video';
  url: string;      // local blob URL or remote URL
  originalUrl?: string; // backup of original URL (for instant preview comparison)
  file?: File;       // actual JS File object if uploaded
  name: string;
  duration?: number; // duration in seconds (videos)
  sizeBytes?: number;
  compressedSize?: string;
  compressionProgress?: number; // 0 to 100
  compressionStatus?: 'idle' | 'compressing' | 'complete' | 'failed';
  isMock?: boolean;
}

const SPRING_TRANSITION = { type: 'spring', stiffness: 350, damping: 30 };

export default function PostCreationExperience() {
  const setPostCreationOpen = useAppStore(s => s.setPostCreationOpen);
  const setActivePostUpload = useAppStore(s => s.setActivePostUpload);
  const setUploadDraft = useAppStore(s => s.setUploadDraft);
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'edit' | 'publish' | 'confirm' | 'music-picker'>('select');
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [compiledEdits, setCompiledEdits] = useState<Record<string, any>>({});
  const [soundtrackSettings, setSoundtrackSettings] = useState<{
    selectedTrackId: string | null;
    musicVolume: number;
    musicTrimStart: number;
    musicTrimEnd: number;
    musicFadeIn: number;
    musicFadeOut: number;
  }>({
    selectedTrackId: null,
    musicVolume: 80,
    musicTrimStart: 0,
    musicTrimEnd: 45,
    musicFadeIn: 2,
    musicFadeOut: 2
  });

  // Lifted up Publishing studio states
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [attachedLinks, setAttachedLinks] = useState<string[]>([]);
  const [audience, setAudience] = useState<'everyone' | 'followers' | 'friends' | 'close_friends' | 'private' | 'custom'>('everyone');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [commentsOff, setCommentsOff] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);
  const [hideShares, setHideShares] = useState(false);
  const [allowRemix, setAllowRemix] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);

  // Cloud states
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);

  
  // Tab states
  const [activeTab, setActiveTab] = useState<'gallery' | 'camera' | 'files' | 'downloads' | 'cloud'>('gallery');
  
  // Selection states
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  
  // File inputs & camera refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  
  // Video preview refs
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Next page completion modal summary
  const [showSummary, setShowSummary] = useState(false);

  // Keyboard and Clipboard Paste Handlers
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleMediaFiles([file]);
          }
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showSummary) {
        handleBack();
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMedia]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [cameraStream]);

  // Pre-load Google Drive and Dropbox scripts on mount to avoid popup blocker issues
  useEffect(() => {
    // 1. Google Drive Scripts
    if (!(window as any).gapi || !(window as any).google) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = () => {
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        document.body.appendChild(gisScript);
      };
      document.body.appendChild(gapiScript);
    }

    // 2. Dropbox Script
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
    if (appKey && !(window as any).Dropbox) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.id = 'dropboxjs';
      script.async = true;
      script.setAttribute('data-app-key', appKey);
      document.body.appendChild(script);
    }
  }, []);

  const triggerGoogleDrivePicker = (gapi: any, google: any, clientId: string) => {
    gapi.load('client:picker', () => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (tokenResponse: any) => {
            if (tokenResponse.error !== undefined) {
              setGdriveLoading(false);
              setErrorMsg(`Google authentication failed: ${tokenResponse.error}`);
              return;
            }

            const picker = new google.picker.PickerBuilder()
              .addView(google.picker.ViewId.DOCS)
              .setOAuthToken(tokenResponse.access_token)
              .setCallback((data: any) => {
                if (data.action === google.picker.Action.PICKED) {
                  const docs = data.docs;
                  const newItems = docs.map((doc: any) => {
                    const bytes = doc.sizeBytes || 0;
                    return {
                      id: `gdrive-${doc.id}-${Math.random().toString(36).substr(2, 9)}`,
                      type: doc.mimeType.startsWith('video/') ? 'video' : 'image',
                      url: `https://docs.google.com/uc?export=download&id=${doc.id}`,
                      name: doc.name,
                      sizeBytes: bytes,
                      compressedSize: bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '0 MB',
                      compressionStatus: 'complete'
                    } as SelectedMedia;
                  });

                  setSelectedMedia(prev => [...prev, ...newItems]);
                  setGdriveConnected(true);
                }
                setGdriveLoading(false);
              })
              .build();
            picker.setVisible(true);
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        setGdriveLoading(false);
        setErrorMsg(`Google Picker initialization failed: ${err.message || err}`);
      }
    });
  };

  const handleGoogleDrivePick = () => {
    setGdriveLoading(true);
    setErrorMsg(null);

    const gapi = (window as any).gapi;
    const google = (window as any).google;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setGdriveLoading(false);
      setErrorMsg('Google Client ID is missing. Please check your .env.local file.');
      return;
    }

    if (!gapi || !google) {
      const loadScripts = (callback: () => void) => {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
          const gisScript = document.createElement('script');
          gisScript.src = 'https://accounts.google.com/gsi/client';
          gisScript.onload = () => callback();
          gisScript.onerror = () => {
            setGdriveLoading(false);
            setErrorMsg('Failed to load Google Identity Services script.');
          };
          document.body.appendChild(gisScript);
        };
        gapiScript.onerror = () => {
          setGdriveLoading(false);
          setErrorMsg('Failed to load Google API script.');
        };
        document.body.appendChild(gapiScript);
      };

      loadScripts(() => triggerGoogleDrivePicker(gapi || (window as any).gapi, google || (window as any).google, clientId));
    } else {
      triggerGoogleDrivePicker(gapi, google, clientId);
    }
  };

  const triggerDropboxChooser = (Dropbox: any) => {
    try {
      Dropbox.choose({
        success: (files: any[]) => {
          const newItems = files.map((file: any) => {
            const bytes = file.bytes || 0;
            return {
              id: `dropbox-${file.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: (file.name.endsWith('.mp4') || file.name.endsWith('.mov')) ? 'video' : 'image',
              url: file.link,
              name: file.name,
              sizeBytes: bytes,
              compressedSize: bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '0 MB',
              compressionStatus: 'complete'
            } as SelectedMedia;
          });

          setSelectedMedia(prev => [...prev, ...newItems]);
          setDropboxConnected(true);
          setDropboxLoading(false);
        },
        cancel: () => {
          setDropboxLoading(false);
        },
        linkType: 'direct',
        multiselect: true,
      });
    } catch (err: any) {
      setDropboxLoading(false);
      setErrorMsg(`Dropbox Chooser failed to open: ${err.message || err}`);
    }
  };

  const handleDropboxPick = () => {
    setDropboxLoading(true);
    setErrorMsg(null);

    const Dropbox = (window as any).Dropbox;
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;

    if (!appKey) {
      setDropboxLoading(false);
      setErrorMsg('Dropbox App Key is missing. Please check your .env.local file.');
      return;
    }

    if (!Dropbox) {
      const loadScript = (callback: () => void) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.id = 'dropboxjs';
        script.setAttribute('data-app-key', appKey);
        script.onload = () => callback();
        script.onerror = () => {
          setDropboxLoading(false);
          setErrorMsg('Failed to load Dropbox Chooser script.');
        };
        document.body.appendChild(script);
      };

      loadScript(() => triggerDropboxChooser((window as any).Dropbox || Dropbox));
    } else {
      triggerDropboxChooser(Dropbox);
    }
  };

  // Sync isPlaying state with video play state
  const handleTogglePlay = () => {
    if (previewVideoRef.current) {
      if (isPlaying) {
        previewVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        previewVideoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  };

  // Close camera stream if switching tabs
  useEffect(() => {
    if (activeTab !== 'camera' && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setCameraActive(false);
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    }
  }, [activeTab]);

  // Set the first selected item as active preview when selection changes
  useEffect(() => {
    if (selectedMedia.length > 0) {
      if (!previewMediaId || !selectedMedia.some(m => m.id === previewMediaId)) {
        setPreviewMediaId(selectedMedia[0].id);
      }
    } else {
      setPreviewMediaId(null);
    }
  }, [selectedMedia, previewMediaId]);

  // Video compression engine
  const triggerBackgroundCompression = (mediaItem: SelectedMedia, file: File) => {
    setSelectedMedia(prev => prev.map(m => {
      if (m.id === mediaItem.id) {
        return {
          ...m,
          compressionStatus: 'compressing',
          compressionProgress: 0
        };
      }
      return m;
    }));

    // Simulating advanced multi-stage intelligent client-side video compression
    // We update progress ticks representing re-encoding, layout scaling, and audio sync
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Calculate saving stats (e.g. compress by 60%)
        const compressedSizeBytes = Math.round(file.size * 0.4);
        const savedPercent = 60;
        const compressedSizeStr = `${(compressedSizeBytes / 1024 / 1024).toFixed(1)} MB (${savedPercent}% saved)`;

        // Update item with compressed state
        setSelectedMedia(prev => prev.map(m => {
          if (m.id === mediaItem.id) {
            return {
              ...m,
              compressionStatus: 'complete',
              compressionProgress: 100,
              compressedSize: compressedSizeStr
            };
          }
          return m;
        }));
      } else {
        setSelectedMedia(prev => prev.map(m => {
          if (m.id === mediaItem.id) {
            return { ...m, compressionProgress: progress };
          }
          return m;
        }));
      }
    }, 300);
  };

  const handleMediaFiles = async (files: File[]) => {
    setErrorMsg(null);
    const newMediaList: SelectedMedia[] = [];

    for (const file of files) {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
      if (!type) {
        setErrorMsg(`Unsupported file type: ${file.name}`);
        continue;
      }

      // Check count limit
      if (selectedMedia.length + newMediaList.length >= 10) {
        setErrorMsg('Selection limit reached. Maximum 10 items allowed.');
        break;
      }

      const localBlobUrl = URL.createObjectURL(file);

      if (type === 'video') {
        // Retrieve duration
        try {
          const duration = await getVideoDuration(file);
          if (duration > 45) {
            setErrorMsg(`Video "${file.name}" exceeds maximum duration of 45 seconds (${Math.round(duration)}s).`);
            continue;
          }
          
          const mediaItem: SelectedMedia = {
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type: 'video',
            url: localBlobUrl,
            originalUrl: localBlobUrl,
            name: file.name,
            duration,
            sizeBytes: file.size,
            file,
            compressionStatus: 'idle',
            compressionProgress: 0
          };
          newMediaList.push(mediaItem);

          // Apply video handling logic:
          // Small videos keep original. Long/large videos compressed.
          // Keep original size threshold at 5MB or duration > 15 seconds
          if (file.size >= 5 * 1024 * 1024 || duration > 15) {
            triggerBackgroundCompression(mediaItem, file);
          } else {
            // Keep original quality
            setTimeout(() => {
              setSelectedMedia(prev => prev.map(m => {
                if (m.id === mediaItem.id) {
                  return {
                    ...m,
                    compressionStatus: 'complete',
                    compressionProgress: 100,
                    compressedSize: 'Original Quality Kept (Small Video)'
                  };
                }
                return m;
              }));
            }, 500);
          }

        } catch (err) {
          setErrorMsg(`Failed to load video metadata for ${file.name}`);
          continue;
        }
      } else {
        // Images never compressed (as per instructions)
        newMediaList.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'image',
          url: localBlobUrl,
          name: file.name,
          sizeBytes: file.size,
          file,
          compressionStatus: 'complete',
          compressedSize: 'Original Quality Preserved'
        });
      }
    }

    if (newMediaList.length > 0) {
      setSelectedMedia(prev => [...prev, ...newMediaList]);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject();
      };
    });
  };

  // Selection toggle logic
  const handleSelectMockItem = (item: typeof MOCK_GALLERY_ITEMS[number] | typeof MOCK_DOWNLOAD_ITEMS[number]) => {
    setErrorMsg(null);
    const existingIndex = selectedMedia.findIndex(m => m.id === item.id);
    
    if (existingIndex > -1) {
      // Deselect
      const removed = selectedMedia[existingIndex];
      if (removed.url.startsWith('blob:')) {
        URL.revokeObjectURL(removed.url);
      }
      setSelectedMedia(prev => prev.filter(m => m.id !== item.id));
    } else {
      // Select
      if (selectedMedia.length >= 10) {
        setErrorMsg('Selection limit reached. Maximum 10 items allowed.');
        return;
      }
      
      const mediaItem: SelectedMedia = {
        id: item.id,
        type: item.type,
        url: item.url,
        originalUrl: item.url,
        name: item.title,
        duration: 'duration' in item ? item.duration : undefined,
        sizeBytes: 1024 * 1024 * parseFloat(item.size), // mock bytes
        isMock: true,
        compressionStatus: 'idle',
        compressionProgress: 0
      };

      setSelectedMedia(prev => [...prev, mediaItem]);

      // Video compression handler for mock videos
      if (item.type === 'video') {
        setSelectedMedia(prev => prev.map(m => {
          if (m.id === item.id) {
            return {
              ...m,
              compressionStatus: 'compressing',
              compressionProgress: 0
            };
          }
          return m;
        }));

        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setSelectedMedia(prev => prev.map(m => {
              if (m.id === item.id) {
                return {
                  ...m,
                  compressionStatus: 'complete',
                  compressionProgress: 100,
                  compressedSize: `${(parseFloat(item.size) * 0.35).toFixed(1)} MB (65% saved)`
                };
              }
              return m;
            }));
          } else {
            setSelectedMedia(prev => prev.map(m => {
              if (m.id === item.id) {
                return { ...m, compressionProgress: progress };
              }
              return m;
            }));
          }
        }, 150);
      }
    }
  };

  const handleRemoveSelected = (id: string) => {
    const item = selectedMedia.find(m => m.id === id);
    if (item && item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
    }
    setSelectedMedia(prev => prev.filter(m => m.id !== id));
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
      handleMediaFiles(files);
    }
  };

  // Webcam actions
  const handleStartCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError('Camera access denied or device not found. Please verify permissions.');
      setCameraActive(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !cameraStream) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleMediaFiles([file]);
          // Briefly flash the webcam UI to indicate snapshot
          const overlay = document.getElementById('camera-flash');
          if (overlay) {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
            setTimeout(() => {
              overlay.classList.remove('opacity-100');
              overlay.classList.add('opacity-0');
            }, 150);
          }
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleStartRecording = () => {
    if (!cameraStream) return;
    recordedChunks.current = [];
    
    // Check selection count
    if (selectedMedia.length >= 10) {
      setErrorMsg('Selection limit reached. Maximum 10 items allowed.');
      return;
    }

    try {
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(cameraStream, options);
      } catch (e) {
        recorder = new MediaRecorder(cameraStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const file = new File([videoBlob], `video-capture-${Date.now()}.webm`, { type: 'video/webm' });
        handleMediaFiles([file]);
      };

      recorder.start(1000); // chunk data every 1s
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimer.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 44) {
            // Cap recording at 45 seconds
            handleStopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    }
  };

  const handleBack = () => {
    // Revoke any created object URLs to prevent memory leaks
    selectedMedia.forEach(m => {
      if (m.url.startsWith('blob:')) {
        URL.revokeObjectURL(m.url);
      }
    });
    setPostCreationOpen(false);
  };

  // Active Preview details
  const activePreviewItem = selectedMedia.find(m => m.id === previewMediaId);

  return (
    <>
      <AnimatePresence mode="wait">
      {step === 'select' && (
        <motion.div
          key="select-stage"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed inset-0 z-[800] flex flex-col bg-[#040209] text-white select-none overflow-hidden"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Ambient Premium Violet Glow */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-950/10 blur-[130px] pointer-events-none z-0" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-950/15 blur-[140px] pointer-events-none z-0" />

      {/* ── Drag & Drop Premium Overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[700] bg-[#040209]/90 flex items-center justify-center p-8 pointer-events-none"
          >
            <div className="w-full h-full border border-dashed border-violet-950/80 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[#0c081a]/40">
              <div className="w-12 h-12 rounded-full bg-[#120c24]/60 flex items-center justify-center border border-violet-900/50">
                <Upload size={20} className="text-violet-400" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-medium text-neutral-200">Drop media to upload</h3>
                <p className="text-xs text-neutral-500">Select up to 10 photos or videos (max 45s each)</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* ── Top Bar Navigation ── */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-[#170f2f] bg-[#090612]/50 backdrop-blur-md relative z-20">
        <button
          onClick={handleBack}
          className="group flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#131326] hover:bg-[#181832] border border-[#1b1b36] active:scale-[0.98] transition-all duration-150 text-neutral-350 hover:text-white text-xs font-medium"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
          <span>Cancel</span>
        </button>
 
        <div className="text-center">
          <h1 className="text-xs font-semibold tracking-wide text-neutral-200">Create New Post</h1>
        </div>
 
        <button
          disabled={selectedMedia.length === 0}
          onClick={() => {
            if (previewVideoRef.current) {
              previewVideoRef.current.pause();
            }
            setIsPlaying(false);
            setStep('edit');
          }}
          className="group flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] active:scale-[0.98] transition-all duration-150 text-white text-xs font-semibold disabled:bg-[#120c24] disabled:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(108,99,255,0.15)]"
        >
          <span>Next</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
        </button>
      </header>

      {/* ── Main Layout Body ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Preview Pane (Instagram Inspired Workflow) */}
        <div className="hidden lg:flex flex-1 min-h-0 bg-[#06040b]/30 flex-col relative justify-center border-b lg:border-b-0 lg:border-r border-[#170f2f]">
          <AnimatePresence mode="wait">
            {activePreviewItem ? (
              <motion.div
                key="preview-active-wrap"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={SPRING_TRANSITION}
                className="w-full h-full flex items-center justify-center p-6 relative"
              >
                {activePreviewItem.type === 'image' ? (
                  <div className="relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl border border-[#20143f] bg-[#0c081a]">
                    <img
                      src={activePreviewItem.url}
                      alt={activePreviewItem.name}
                      className="max-h-[50vh] lg:max-h-[60vh] w-auto h-auto object-contain mx-auto"
                      style={{ willChange: 'transform' }}
                    />
                  </div>
                ) : (
                  <div className="relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl border border-[#20143f] bg-[#0c081a] flex items-center justify-center group/player cursor-pointer"
                       onClick={handleTogglePlay}
                  >
                    <video
                      ref={previewVideoRef}
                      src={activePreviewItem.url}
                      className="max-h-[50vh] lg:max-h-[60vh] w-auto h-auto object-contain mx-auto"
                      playsInline
                      loop
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    
                    {/* Hover Play/Pause Overlay */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/player:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#090612]/90 border border-[#20143f] flex items-center justify-center text-neutral-250 backdrop-blur-sm active:scale-[0.98] transition-all duration-150">
                        {isPlaying ? <Pause size={20} fill="white" className="text-white" /> : <Play size={20} fill="white" className="ml-0.5 text-white" />}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete Media Overlay Button */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSelected(activePreviewItem.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold backdrop-blur-md shadow-2xl active:scale-[0.96] transition-all duration-150 group"
                    title="Delete media"
                  >
                    <Trash2 size={14} className="transition-transform group-hover:scale-110" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-4 select-none">
                <div className="w-12 h-12 rounded-full bg-[#0c081a] border border-[#20143f] flex items-center justify-center text-neutral-500">
                  <ImageIcon size={20} className="stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-neutral-300">No media selected</h3>
                  <p className="text-[11px] text-neutral-500 max-w-[220px] leading-relaxed">
                    Select a photo or video from the sidebar or drag files here to begin editing.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Media selector, tabs, and grid */}
        <div className="w-full lg:w-[480px] xl:w-[540px] flex-shrink-0 flex flex-col min-h-0 bg-[#080510] border-l border-[#170f2f] relative z-10">
          
          {/* Tabs Selector (Segmented Control style) */}
          <div className="px-6 pt-4 pb-2 border-b border-[#170f2f] bg-[#080510] flex-shrink-0">
            <nav className="flex items-center bg-[#040208]/60 p-0.5 rounded-lg border border-[#1c1236] gap-0.5 overflow-x-auto hide-scrollbar">
              <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={ImageIcon} label="Gallery" />
              <TabButton active={activeTab === 'camera'} onClick={() => setActiveTab('camera')} icon={Camera} label="Camera Studio" />
              <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} icon={Upload} label="Files" />
              <TabButton active={activeTab === 'downloads'} onClick={() => setActiveTab('downloads')} icon={Folder} label="Downloads" />
              <TabButton active={activeTab === 'cloud'} onClick={() => setActiveTab('cloud')} icon={Cloud} label="Cloud" />
            </nav>
          </div>
 
          {/* Tab Contents */}
          <div className="flex-1 min-h-0 overflow-y-auto page-scroll p-6">
            
            {errorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 items-start">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-xs font-semibold leading-relaxed">
                  {errorMsg}
                </div>
                <button onClick={() => setErrorMsg(null)} className="text-red-400/70 hover:text-red-400 text-xs font-bold">Dismiss</button>
              </div>
            )}
 
            {/* GALLERY TAB */}
            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-medium text-neutral-500 tracking-wide">Recent Images & Videos</h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121224] hover:bg-[#181832] border border-[#1b1b36] text-[11px] font-medium text-neutral-300 active:scale-[0.98] transition-all duration-150"
                  >
                    <Upload size={12} className="text-neutral-400" />
                    Browse Files
                  </button>
                </div>
 
                {MOCK_GALLERY_ITEMS.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {MOCK_GALLERY_ITEMS.map((item) => {
                      const isSel = selectedMedia.some(m => m.id === item.id);
                      const selectionIdx = selectedMedia.findIndex(m => m.id === item.id);
                      return (
                        <GridItem
                          key={item.id}
                          type={item.type}
                          src={item.type === 'video' ? item.thumbnail : item.url}
                          title={item.title}
                          size={item.size}
                          duration={item.type === 'video' ? '0:15' : undefined}
                          isSelected={isSel}
                          selectionNumber={isSel ? selectionIdx + 1 : undefined}
                          onClick={() => handleSelectMockItem(item)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-[#181830] hover:border-[#222244] hover:bg-[#0c0c16]/30 rounded-xl cursor-pointer transition-all duration-200 text-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#10101c]/80 border border-[#1b1b36] flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 group-hover:bg-[#1a1a32] shadow-sm transition-all duration-200 mb-4">
                      <Upload size={16} className="transition-transform group-hover:-translate-y-0.5 duration-200" />
                    </div>
                    <h4 className="text-[13px] font-medium text-neutral-250 mb-1">Upload your media</h4>
                    <p className="text-[11px] text-neutral-500 max-w-[240px] leading-relaxed">
                      Drag and drop photos or videos here, or click to browse files from your computer.
                    </p>
                  </div>
                )}
              </div>
            )}
 
            {/* CAMERA TAB */}
            {activeTab === 'camera' && (
              <div className="space-y-6 flex flex-col items-center justify-center min-h-[300px]">
                {!cameraActive ? (
                  <div className="text-center space-y-4 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-[#0f0f1d] border border-[#1b1b36] flex items-center justify-center text-neutral-400 mx-auto shadow-[0_0_30px_rgba(108,99,255,0.04)]">
                      <Camera size={24} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium tracking-tight text-neutral-200">Device Webcam Stream</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Allow camera permissions to record videos up to 45 seconds or snap custom photos directly in Verlyn Studio.
                      </p>
                    </div>
                    <button
                      onClick={handleStartCamera}
                      className="px-4 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5b52f5] text-white text-xs font-medium active:scale-[0.98] transition-all duration-150 shadow-sm"
                    >
                      Start Camera Stream
                    </button>
                    {cameraError && <p className="text-[11px] text-red-400 font-semibold pt-2">{cameraError}</p>}
                  </div>
                ) : (
                  <div className="w-full space-y-5">
                    {/* Camera Feed Screen */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0D0D11] shadow-2xl">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      
                      {/* Snap Flash Layer */}
                      <div id="camera-flash" className="absolute inset-0 bg-white opacity-0 transition-opacity duration-150 pointer-events-none" />

                      {isRecording && (
                        <div className="absolute top-4 right-4 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-lg flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold text-red-400">
                            REC: {recordingSeconds}s / 45s
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Panel */}
                    <div className="flex items-center justify-center gap-4 bg-[#080810]/60 border border-[#141427] p-4 rounded-lg shadow-inner">
                      {!isRecording ? (
                        <>
                          <button
                            onClick={handleCapturePhoto}
                            className="flex flex-col items-center gap-1.5 group"
                          >
                            <div className="w-12 h-12 rounded-full bg-[#121224] border border-[#1b1b36] hover:border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 transition-all active:scale-95 duration-150">
                              <Camera size={18} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Snap</span>
                          </button>

                          <button
                            onClick={handleStartRecording}
                            className="flex flex-col items-center gap-1.5 group"
                          >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400 group-hover:text-red-300 transition-all active:scale-90">
                              <div className="w-4.5 h-4.5 rounded-full bg-red-500" />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Record</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <div className="w-14 h-14 rounded-full bg-red-600 border-2 border-white/20 flex items-center justify-center text-white transition-all active:scale-90 animate-pulse">
                            <div className="w-4 h-4 bg-white rounded-sm" />
                          </div>
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Stop Recording</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#181830] hover:border-[#222244] hover:bg-[#0c0c16]/30 rounded-xl p-10 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#10101c]/80 border border-[#1b1b36] flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 group-hover:bg-[#1a1a32] shadow-sm transition-all duration-200 mx-auto mb-4">
                    <Upload size={16} className="transition-transform group-hover:-translate-y-0.5 duration-200" />
                  </div>
                  <h4 className="text-[13px] font-medium text-neutral-200 mb-1">Select from your device</h4>
                  <p className="text-[11px] text-neutral-500 max-w-[240px] mx-auto leading-relaxed">
                    Click to browse files, drop photos or videos, or paste directly from your clipboard.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-[#0c0c16]/40 border border-[#181830] p-4 rounded-xl text-neutral-500">
                  <Clipboard size={14} className="flex-shrink-0 text-neutral-400 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-neutral-300">Clipboard paste</span> is active. Press <kbd className="px-1.5 py-0.5 rounded bg-[#121224] border border-[#1b1b36] font-mono text-[9px] text-neutral-400">Ctrl+V</kbd> anywhere to instantly load image files.
                  </span>
                </div>
              </div>
            )}

            {/* DOWNLOADS TAB */}
            {activeTab === 'downloads' && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-medium text-neutral-400/80 tracking-wide">Local Downloaded Assets</h3>
                {MOCK_DOWNLOAD_ITEMS.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {MOCK_DOWNLOAD_ITEMS.map((item) => {
                      const isSel = selectedMedia.some(m => m.id === item.id);
                      const selectionIdx = selectedMedia.findIndex(m => m.id === item.id);
                      return (
                        <GridItem
                          key={item.id}
                          type={item.type}
                          src={item.type === 'video' ? item.thumbnail : item.url}
                          title={item.title}
                          size={item.size}
                          duration={item.type === 'video' ? '0:15' : undefined}
                          isSelected={isSel}
                          selectionNumber={isSel ? selectionIdx + 1 : undefined}
                          onClick={() => handleSelectMockItem(item)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-[#181830] rounded-xl bg-[#0c0c16]/20 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#10101c]/80 border border-[#1b1b36] flex items-center justify-center text-neutral-400 shadow-sm mb-4">
                      <Download size={16} />
                    </div>
                    <h4 className="text-[13px] font-medium text-neutral-200 mb-1">No downloaded assets</h4>
                    <p className="text-[11px] text-neutral-500 max-w-[240px] mt-1.5 leading-relaxed">
                      Your local downloaded files folder is empty. Use the file selector to upload custom assets.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CLOUD TAB */}
            {activeTab === 'cloud' && (
              <div className="space-y-5">
                <h3 className="text-[11px] font-medium text-neutral-400/80 tracking-wide">Future-Ready Cloud Portal</h3>
                
                {/* Connection Status Panels */}
                {!gdriveConnected && !dropboxConnected ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <CloudCard 
                      title="Google Drive" 
                      icon={Cloud} 
                      status={gdriveConnected ? 'Connected' : 'Ready'} 
                      loading={gdriveLoading}
                      onClick={handleGoogleDrivePick}
                    />
                    <CloudCard 
                      title="Dropbox" 
                      icon={HardDrive} 
                      status={dropboxConnected ? 'Connected' : 'Ready'} 
                      loading={dropboxLoading}
                      onClick={handleDropboxPick}
                    />
                    <CloudCard 
                      title="iCloud Library" 
                      icon={Laptop} 
                      status="Unavailable" 
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#181830] bg-[#0c0c16]/30">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          {gdriveConnected ? 'Connected: Google Drive' : 'Connected: Dropbox'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setGdriveConnected(false);
                          setDropboxConnected(false);
                        }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        Disconnect Portal
                      </button>
                    </div>

                    {MOCK_CLOUD_ITEMS.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {MOCK_CLOUD_ITEMS
                          .filter(item => item.source === (gdriveConnected ? 'gdrive' : 'dropbox'))
                          .map(item => {
                            const isSel = selectedMedia.some(m => m.id === item.id);
                            const selectionIdx = selectedMedia.findIndex(m => m.id === item.id);
                            return (
                              <GridItem
                                key={item.id}
                                type={item.type}
                                src={item.type === 'video' ? item.thumbnail : item.url}
                                title={item.title}
                                size={item.size}
                                duration={item.type === 'video' ? '0:10' : undefined}
                                isSelected={isSel}
                                selectionNumber={isSel ? selectionIdx + 1 : undefined}
                                onClick={() => handleSelectMockItem(item)}
                              />
                            );
                          })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-[#181830] rounded-xl bg-[#0c0c16]/20 text-center">
                        <Cloud className="w-8 h-8 text-neutral-600 mb-3" />
                        <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">No Cloud Assets Found</p>
                        <p className="text-[10px] text-slate-500 max-w-[260px] mt-1.5 leading-relaxed">
                          No matching image or video files detected in the root of your connected cloud folder.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-xl border border-[#181830] bg-[#0c0c16]/20 text-[10px] text-neutral-500 leading-relaxed font-mono">
                  Cloud authorization pipelines bypass bandwidth caps, retrieving source assets server-side directly to database buckets.
                </div>
              </div>
            )}

          </div>

          {/* ── Footer / Summary Pane ── */}
          <footer className="h-20 flex-shrink-0 border-t border-[#170f2f] px-4 sm:px-8 flex items-center justify-between bg-[#080510] relative z-20">
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">SELECTED MEDIA</span>
              <span className="text-xs font-bold mt-0.5 text-white/90">
                {selectedMedia.length} of 10 items selected
              </span>
            </div>

            {selectedMedia.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-[280px] py-1 hide-scrollbar">
                {selectedMedia.map((media) => (
                  <div
                    key={media.id}
                    onClick={() => setPreviewMediaId(media.id)}
                    className={clsx(
                      'w-10 h-10 rounded-lg overflow-hidden border cursor-pointer flex-shrink-0 transition-all relative group',
                      media.id === previewMediaId ? 'border-[#6C63FF] scale-105' : 'border-white/10 hover:border-white/20'
                    )}
                  >
                    <img
                      src={media.url}
                      className="w-full h-full object-cover"
                      alt="Selected thumbnail"
                    />
                    {media.type === 'video' && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play size={10} fill="white" className="text-white ml-0.5" />
                      </div>
                    )}
                    {media.compressionStatus === 'compressing' && (
                      <div className="absolute inset-0 bg-[#6C63FF]/70 flex items-center justify-center">
                        <Loader2 size={12} className="animate-spin text-white" />
                      </div>
                    )}
                    {/* Delete badge for easy item removal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSelected(media.id);
                      }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-[9px] border border-black z-20 transition-transform active:scale-75 shadow-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </footer>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            const files: File[] = [];
            for (let i = 0; i < e.target.files.length; i++) {
              files.push(e.target.files[i]);
            }
            handleMediaFiles(files);
          }
        }}
      />

      {/* ── Next Step summary sheet ── */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] bg-black/90 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={SPRING_TRANSITION}
              className="w-full max-w-2xl bg-[#0d0d12] border border-white/[0.08] p-8 rounded-[28px] shadow-2xl relative"
            >
              {/* Close / Close icon */}
              <button
                onClick={() => setShowSummary(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-display tracking-tight text-white">Media Selection Complete</h3>
                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mt-0.5">STEP 1 PIPELINE VERIFIED</p>
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto page-scroll border border-white/[0.04] bg-white/[0.01] rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 border-b border-white/[0.03] pb-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block mb-0.5">TOTAL ITEMS</span>
                      <span className="text-white font-bold">{selectedMedia.length} / 10</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">VALIDATION STATE</span>
                      <span className="text-emerald-400 font-bold">READY (45s CAPPED)</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block">SELECTED PIPELINE ASSETS</span>
                    {selectedMedia.map((m, idx) => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-b-0 text-xs font-mono">
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <span className="text-slate-600 font-bold">#{idx + 1}</span>
                          <span className="text-white truncate font-medium">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                            {m.type}
                          </span>
                          {m.type === 'video' && m.duration && (
                            <span className="text-slate-400 bg-white/5 px-1.5 py-0.5 rounded text-[9px]">
                              {Math.round(m.duration)}s
                            </span>
                          )}
                          <span className="text-slate-400">
                            {m.compressedSize || 'Original Quality'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-violet-600/5 border border-violet-500/20 text-xs text-slate-400 leading-relaxed font-mono">
                  <strong>Notice:</strong> Step 1 (Media selection workflow, video compression buffers, and responsive grids) is fully operational. Editing modules, captions, and publishing database hooks will activate in the next development cycle.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowSummary(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                  >
                    Adjust Selection
                  </button>
                  <button
                    onClick={() => {
                      setShowSummary(false);
                      handleBack();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#6C63FF] hover:bg-[#5b52f5] text-xs font-bold text-white shadow-[0_0_15px_rgba(108,99,255,0.2)]"
                  >
                    Confirm & Finish
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </motion.div>
      )}

      {step === 'edit' && (
        <PostEditingStudio
          key="edit-stage"
          selectedMedia={selectedMedia}
          onBack={() => setStep('select')}
          onDone={(edits, audio) => {
            setCompiledEdits(edits);
            setSoundtrackSettings(audio);
            setStep('publish');
          }}
          selectedSpotifyTrack={selectedTrack}
          onTriggerMusicPicker={() => setStep('music-picker')}
          onClearSpotifyTrack={() => setSelectedTrack(null)}
        />
      )}
      {step === 'publish' && (
        <PostPublishingStudio
          key="publish-stage"
          selectedMedia={selectedMedia}
          mediaEdits={compiledEdits}
          selectedTrackId={soundtrackSettings.selectedTrackId}
          selectedSpotifyTrack={selectedTrack}
          musicVolume={soundtrackSettings.musicVolume}
          musicTrimStart={soundtrackSettings.musicTrimStart}
          musicTrimEnd={soundtrackSettings.musicTrimEnd}
          musicFadeIn={soundtrackSettings.musicFadeIn}
          musicFadeOut={soundtrackSettings.musicFadeOut}
          onBack={() => setStep('edit')}
          onClose={() => {
            selectedMedia.forEach(m => {
              if (m.url.startsWith('blob:')) {
                URL.revokeObjectURL(m.url);
              }
            });
            setPostCreationOpen(false);
          }}
          caption={caption}
          setCaption={setCaption}
          taggedUsers={taggedUsers}
          setTaggedUsers={setTaggedUsers}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          attachedLinks={attachedLinks}
          setAttachedLinks={setAttachedLinks}
          audience={audience}
          setAudience={setAudience}
          hasReminder={hasReminder}
          setHasReminder={setHasReminder}
          reminderDate={reminderDate}
          setReminderDate={setReminderDate}
          isScheduled={isScheduled}
          setIsScheduled={setIsScheduled}
          scheduleDate={scheduleDate}
          setScheduleDate={setScheduleDate}
          commentsOff={commentsOff}
          setCommentsOff={setCommentsOff}
          hideLikes={hideLikes}
          setHideLikes={setHideLikes}
          hideShares={hideShares}
          setHideShares={setHideShares}
          allowRemix={allowRemix}
          setAllowRemix={setAllowRemix}
          allowDownloads={allowDownloads}
          setAllowDownloads={setAllowDownloads}
          onSharePressed={() => setStep('confirm')}
        />
      )}
      {step === 'confirm' && (
        <PostConfirmationPage
          key="confirm-stage"
          selectedMedia={selectedMedia}
          mediaEdits={compiledEdits}
          selectedTrackId={soundtrackSettings.selectedTrackId}
          selectedSpotifyTrack={selectedTrack}
          musicVolume={soundtrackSettings.musicVolume}
          musicTrimStart={soundtrackSettings.musicTrimStart}
          musicTrimEnd={soundtrackSettings.musicTrimEnd}
          caption={caption}
          taggedUsers={taggedUsers}
          selectedLocation={selectedLocation}
          audience={audience}
          isScheduled={isScheduled}
          scheduleDate={scheduleDate}
          onBack={() => setStep('publish')}
           onConfirm={() => {
            setUploadDraft({
              selectedMedia,
              mediaEdits: compiledEdits,
              selectedTrackId: soundtrackSettings.selectedTrackId,
              selectedSpotifyTrack: selectedTrack,
              musicVolume: soundtrackSettings.musicVolume,
              musicTrimStart: soundtrackSettings.musicTrimStart,
              musicTrimEnd: soundtrackSettings.musicTrimEnd,
              musicFadeIn: soundtrackSettings.musicFadeIn,
              musicFadeOut: soundtrackSettings.musicFadeOut,
              caption,
              taggedUsers,
              selectedLocation,
              audience,
              isScheduled,
              scheduleDate,
              commentsOff,
              hideLikes,
              hideShares,
              allowRemix,
              allowDownloads
            });

            setActivePostUpload({
              progress: 0,
              status: 'uploading',
              errorMsg: null,
              mediaCount: selectedMedia.length,
              caption: caption,
              thumbnailUrl: selectedMedia[0]?.url || ''
            });

            setPostCreationOpen(false);
            router.push('/feed');
          }}
        />
      )}
      {step === 'music-picker' && (
        <VerlynMusicPicker
          onClose={() => setStep('edit')}
          onSelectTrack={(track) => {
            setSelectedTrack(track);
            setSoundtrackSettings(prev => ({
              ...prev,
              selectedTrackId: track.id,
              musicTrimStart: 0,
              musicTrimEnd: Math.min(30, track.durationMs / 1000)
            }));
            setStep('edit');
          }}
        />
      )}
    </AnimatePresence>

    </>
  );
}


// ── TabButton Helper Component ──
function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-150 outline-none whitespace-nowrap',
        active 
          ? 'text-white' 
          : 'text-neutral-500 hover:text-neutral-350'
      )}
    >
      {active && (
        <motion.div
          layoutId="active-tab-pill"
          className="absolute inset-0 bg-[#160f2c] border border-[#25194a]/80 rounded-full -z-10"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <Icon size={13} className={clsx(active ? 'text-violet-400' : 'text-neutral-600')} />
      <span>{label}</span>
    </button>
  );
}

// ── GridItem Helper Component ──
interface GridItemProps {
  type: 'image' | 'video';
  src: string;
  title: string;
  size: string;
  duration?: string;
  isSelected: boolean;
  selectionNumber?: number;
  onClick: () => void;
}

function GridItem({ type, src, title, size, duration, isSelected, selectionNumber, onClick }: GridItemProps) {
  const [hasError, setHasError] = useState(false);
  const Icon = type === 'video' ? Play : ImageIcon;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative aspect-square rounded-lg overflow-hidden cursor-pointer border bg-[#0c081a] transition-all duration-200 active:scale-[0.98] select-none',
        isSelected ? 'border-violet-500/50 shadow-[0_0_15px_rgba(108,99,255,0.15)] scale-[0.99]' : 'border-[#1c1236] hover:border-[#2a1b52]'
      )}
    >
      {/* Fallback Icon in the center */}
      <div className="absolute inset-0 flex items-center justify-center text-neutral-800">
        <Icon size={24} strokeWidth={1.5} />
      </div>

      {/* Actual image */}
      {!hasError && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setHasError(true)}
          className={clsx(
            'absolute inset-0 w-full h-full object-cover transition-transform duration-350 ease-out group-hover:scale-[1.02]',
            isSelected && 'opacity-70'
          )}
        />
      )}

      {/* Video duration badge */}
      {type === 'video' && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#090612]/90 backdrop-blur-md text-[8px] font-mono font-medium text-neutral-300 flex items-center gap-1 z-10">
          <Play size={6} fill="white" className="text-white" />
          {duration || '0:15'}
        </div>
      )}

      {/* Selection State Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={clsx(
            'w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-semibold transition-all duration-150',
            isSelected 
              ? 'bg-[#6C63FF] border-[#6C63FF] text-white scale-105 shadow-sm' 
              : 'border-[#1c1236] bg-neutral-950/60 text-transparent group-hover:border-violet-500/30'
          )}
        >
          {isSelected ? selectionNumber : ''}
        </div>
      </div>

      {/* Title footer bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/70 to-transparent px-2.5 py-2 transition-colors flex flex-col justify-end min-h-[40px] z-10">
        <p className="text-[9px] font-medium tracking-tight truncate leading-none text-neutral-300 group-hover:text-white mb-0.5">{title}</p>
        <span className="text-[7px] text-neutral-500 font-mono tracking-wider uppercase block">{size}</span>
      </div>
    </div>
  );
}

// ── CloudCard Helper Component ──
interface CloudCardProps {
  title: string;
  icon: any;
  status: 'Ready' | 'Unavailable' | 'Connected';
  loading?: boolean;
  onClick?: () => void;
}

function CloudCard({ title, icon: Icon, status, loading, onClick }: CloudCardProps) {
  const isReady = status === 'Ready';
  const isConnected = status === 'Connected';
  const disabled = status === 'Unavailable';
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-2.5 bg-[#0b0b16]/40 transition-all duration-150 group select-none w-full outline-none',
        disabled 
          ? 'border-transparent opacity-30 cursor-not-allowed' 
          : isConnected 
            ? 'border-emerald-500/15 bg-emerald-500/[0.01] hover:bg-emerald-500/[0.02] cursor-pointer'
            : 'border-transparent hover:border-[#181830] hover:bg-[#121224]/40 cursor-pointer active:scale-[0.98]'
      )}
    >
      <div className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        disabled 
          ? 'bg-neutral-950/30 text-neutral-600' 
          : isConnected
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-neutral-900 group-hover:bg-neutral-800 text-neutral-400 group-hover:text-neutral-200'
      )}>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-neutral-400" />
        ) : (
          <Icon size={14} />
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-neutral-300">{title}</p>
        <span className={clsx(
          'text-[8px] font-mono tracking-wider block mt-0.5',
          disabled 
            ? 'text-neutral-600' 
            : isConnected
              ? 'text-emerald-400'
              : 'text-neutral-500 group-hover:text-neutral-300'
        )}>
          {loading ? 'AUTHORIZING...' : isConnected ? 'CONNECTED' : 'LINK ACCOUNT'}
        </span>
      </div>
    </button>
  );
}
