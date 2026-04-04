'use client';

import { useAppStore } from '@/lib/store';
import { Image, Video, Smile, MapPin } from 'lucide-react';
import { submitPost } from '@/app/(main)/feed/actions';
import { useRef } from 'react';

export default function CreatePost() {
  const { currentUser } = useAppStore();
  const formRef = useRef<HTMLFormElement>(null);

  // If the AuthProvider hasn't pulled the user yet, don't show the box
  if (!currentUser) return null;

  return (
    <div className="glass-card p-5 mb-6 relative z-20">
      <form 
        ref={formRef}
        action={async (formData) => {
          await submitPost(formData);
          formRef.current?.reset();
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentUser.avatar} 
              alt="Me" 
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-ambient border border-outline-variant/10" 
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-secondary-light border-2 border-surface-highest rounded-full" />
          </div>
          
          <input
            name="content"
            type="text"
            required
            autoComplete="off"
            placeholder={`What is unfolding, ${currentUser.displayName?.split(' ')[0]}?`}
            className="flex-1 w-full text-left px-5 py-3 rounded-full text-[15px] font-medium transition-all duration-300 bg-surface-low border border-outline-variant/20 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-light placeholder:text-on-surface-variant/50"
            id="create-post-input"
          />
          
          <button 
            type="submit"
            className="primary-btn flex-shrink-0 h-11 px-8 shadow-ambient text-[14px]"
          >
            Post
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10 px-2 mt-2">
          <div className="flex items-center gap-2 sm:gap-6">
            <button type="button" className="flex items-center gap-2 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-cyan-400 hover:bg-surface-highest transition-colors group">
              <Image size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Visuals</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-pink-400 hover:bg-surface-highest transition-colors group">
              <Video size={18} className="text-pink-400 group-hover:scale-110 transition-transform" />
              <span>Motion</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-yellow-400 hover:bg-surface-highest transition-colors group hidden sm:flex">
              <Smile size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
              <span>Tone</span>
            </button>
            <button type="button" className="flex items-center gap-2 py-2 px-3 rounded-full text-[13px] font-semibold text-on-surface-variant hover:text-green-400 hover:bg-surface-highest transition-colors group hidden md:flex">
              <MapPin size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
              <span>Space</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
