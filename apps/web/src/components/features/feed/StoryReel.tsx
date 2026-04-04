'use client';

import { MOCK_STORIES, CURRENT_USER } from '@/lib/mockData';
import { Plus } from 'lucide-react';

export default function StoryReel() {
  return (
    <div
      className="flex gap-3 p-4 rounded-2xl border overflow-x-auto"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* My Story (add button) */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full overflow-hidden border-2 transition-transform duration-200 group-hover:scale-105"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CURRENT_USER.avatar} alt="My Story" className="w-full h-full object-cover" />
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))', border: '2px solid var(--surface)' }}
          >
            <Plus size={10} color="white" />
          </div>
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>My Story</span>
      </div>

      {/* Others' Stories */}
      {MOCK_STORIES.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className={`story-ring transition-transform duration-200 group-hover:scale-105 ${story.isViewed ? 'opacity-50' : ''}`}>
            <div className="story-ring-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.author.avatar}
                alt={story.author.displayName}
                className="w-12 h-12 rounded-full object-cover"
                style={{ width: '48px', height: '48px' }}
              />
            </div>
          </div>
          <span
            className="text-[10px] font-medium max-w-[56px] truncate"
            style={{ color: story.isViewed ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
          >
            {story.author.displayName.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>
  );
}
