'use client';

import { CURRENT_USER } from '@/lib/mockData';
import { Image, Video, Smile, MapPin } from 'lucide-react';

export default function CreatePost() {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CURRENT_USER.avatar} alt="Me" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        <button
          className="flex-1 text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 focus-ring"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-tertiary)',
          }}
          id="create-post-input"
        >
          What&apos;s on your mind, {CURRENT_USER.displayName.split(' ')[0]}?
        </button>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button className="btn-ghost flex items-center gap-1.5 text-xs flex-1 justify-center py-2" id="add-image-btn">
          <Image size={15} style={{ color: 'var(--v-cyan)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Photo</span>
        </button>
        <button className="btn-ghost flex items-center gap-1.5 text-xs flex-1 justify-center py-2" id="add-video-btn">
          <Video size={15} style={{ color: 'var(--v-pink)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Video</span>
        </button>
        <button className="btn-ghost flex items-center gap-1.5 text-xs flex-1 justify-center py-2" id="add-emoji-btn">
          <Smile size={15} style={{ color: 'var(--v-orange)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Feeling</span>
        </button>
        <button className="btn-ghost flex items-center gap-1.5 text-xs flex-1 justify-center py-2" id="add-location-btn">
          <MapPin size={15} style={{ color: 'var(--v-green)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Location</span>
        </button>
        <button className="btn-primary text-xs px-4 py-2 ml-1 flex-shrink-0 shine" id="post-btn">
          Post
        </button>
      </div>
    </div>
  );
}
