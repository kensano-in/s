'use client';

import StoryReel from '@/components/features/feed/StoryReel';
import CreatePost from '@/components/features/feed/CreatePost';
import PostCard from '@/components/features/feed/PostCard';
import { MOCK_POSTS } from '@/lib/mockData';

export default function FeedPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stories */}
      <StoryReel />

      {/* Create post */}
      <CreatePost />

      {/* Feed tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: 'var(--border)' }}>
        {['For You', 'Following', 'Communities'].map((tab, i) => (
          <button
            key={tab}
            className={`px-5 py-3 text-sm font-medium transition-colors duration-200 relative ${
              i === 0 ? 'tab-active' : ''
            }`}
            style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {tab}
            {i === 0 && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--v-violet)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {MOCK_POSTS.map((post, index) => (
          <div
            key={post.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
          >
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
