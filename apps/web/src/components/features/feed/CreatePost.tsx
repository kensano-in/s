'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Image as ImageIcon, Video, Smile, MapPin, X } from 'lucide-react';
import { submitPost } from '@/app/(main)/feed/actions';

const EMOJIS = ['😀','😂','🥹','😍','🤩','🔥','💎','⚡','🌊','🎯','🚀','🎭','👏','💪','🤝','❤️','💜','🌸','✨','🎉','👀','🧠','💡','🔑','🎨','🎮','🏆','💫','🌈','🦋'];
const MAX_CHARS = 500;

export default function CreatePost() {
  const { currentUser } = useAppStore();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [shake, setShake] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [content]);

  const charLeft = MAX_CHARS - content.length;
  const charColor = charLeft < 0 ? '#EF4444' : charLeft < 50 ? '#F59E0B' : 'var(--text-muted)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.length > MAX_CHARS) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    setIsPosting(true);
    const fd = new FormData();
    fd.append('content', location ? `${content}\n📍 ${location}` : content);
    await submitPost(fd);
    setContent('');
    setLocation('');
    setShowLocationInput(false);
    setIsPosting(false);
  };

  const addEmoji = (emoji: string) => {
    setContent((c) => c + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (!currentUser) return null;

  return (
    <div
      className={`glass-card p-5 mb-6 relative z-20 transition-all duration-200 ${shake ? 'animate-shake' : ''}`}
    >
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="flex items-start gap-4 mb-3">
          <div className="relative flex-shrink-0 mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser.avatar || '/fallback-avatar.png'}
              alt={`${currentUser.displayName}'s avatar`}
              width={48} height={48}
              className="w-12 h-12 rounded-full object-cover shadow-ambient border border-outline-variant/10"
              onError={(e) => { (e.target as HTMLImageElement).src = '/fallback-avatar.png'; }}
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary-light border-2 border-surface-highest rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS + 20))}
              placeholder={`What is unfolding, ${currentUser.displayName?.split(' ')[0]}?`}
              rows={1}
              className="w-full bg-transparent border-0 resize-none text-[15px] font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none leading-relaxed pt-2"
              id="create-post-input"
            />

            {/* Location input */}
            {showLocationInput && (
              <div className="flex items-center gap-2 mt-2 animate-slide-up">
                <MapPin size={14} className="text-green-400 flex-shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location..."
                  className="flex-1 bg-surface-low text-sm text-on-surface rounded-lg px-3 py-1.5 border border-outline-variant/20 focus:outline-none focus:border-green-400/50 transition-colors"
                  maxLength={100}
                  autoFocus
                />
                <button type="button" onClick={() => { setShowLocationInput(false); setLocation(''); }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Char counter + Post button row */}
        <div className="flex items-center justify-between pl-16 mb-3">
          <span className="text-xs font-mono transition-colors" style={{ color: charColor }}>
            {content.length > 0 ? `${content.length}/${MAX_CHARS}` : ''}
          </span>
          <button
            type="submit"
            disabled={isPosting || content.length === 0}
            className="primary-btn h-9 px-6 shadow-ambient text-[14px] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 pt-3 border-t border-outline-variant/10 relative">
          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            id="visuals-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setContent((c) => c + `\n[📷 ${file.name}]`);
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            id="motion-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setContent((c) => c + `\n[🎬 ${file.name}]`);
            }}
          />

          <button
            type="button"
            title="Add image or video"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-cyan-400 hover:bg-surface-highest transition-colors group"
          >
            <ImageIcon size={17} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Visuals</span>
          </button>

          <button
            type="button"
            title="Add video"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-1.5 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-pink-400 hover:bg-surface-highest transition-colors group"
          >
            <Video size={17} className="text-pink-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Motion</span>
          </button>

          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              title="Add emoji"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex items-center gap-1.5 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-yellow-400 hover:bg-surface-highest transition-colors group"
            >
              <Smile size={17} className="text-yellow-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Tone</span>
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50 bg-surface-highest border border-outline-variant/20 rounded-2xl p-3 shadow-2xl w-64 animate-fade-in">
                <div className="grid grid-cols-6 gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:bg-surface-high rounded-lg p-1 transition-colors w-9 h-9 flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            title="Add location"
            onClick={() => setShowLocationInput((v) => !v)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-green-400 hover:bg-surface-highest transition-colors group"
          >
            <MapPin size={17} className={`group-hover:scale-110 transition-transform ${showLocationInput ? 'text-green-400' : 'text-green-400'}`} />
            <span className="hidden md:inline">Space</span>
          </button>
        </div>
      </form>
    </div>
  );
}
