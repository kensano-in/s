'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus } from 'lucide-react';

interface ReelUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function StoryReel() {
  const [users, setUsers] = useState<ReelUser[]>([]);
  const [currentUser, setCurrentUser] = useState<ReelUser | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch the current user's profile
      const { data: me } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', authUser.id)
        .single();
      if (me) setCurrentUser(me);

      // Fetch other users (up to 10, excluding self)
      const { data: others } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .neq('id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (others) setUsers(others);
    }
    load();
  }, [supabase]);

  const getAvatar = (user: ReelUser) =>
    user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  return (
    <div
      className="flex gap-3 p-4 rounded-2xl border overflow-x-auto hide-scrollbar"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* My Story */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 transition-transform duration-200 group-hover:scale-105" style={{ borderColor: 'var(--border-strong)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUser ? getAvatar(currentUser) : `https://api.dicebear.com/7.x/avataaars/svg?seed=me`}
              alt="My Story"
              className="w-full h-full object-cover"
            />
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

      {/* Real Users */}
      {users.map((user) => (
        <div key={user.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="transition-transform duration-200 group-hover:scale-105" style={{
            padding: '2px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))',
          }}>
            <div className="rounded-full overflow-hidden" style={{ padding: '2px', background: 'var(--surface)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAvatar(user)}
                alt={user.display_name}
                className="w-12 h-12 rounded-full object-cover"
              />
            </div>
          </div>
          <span className="text-[10px] font-medium max-w-[56px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {(user.display_name || user.username).split(' ')[0]}
          </span>
        </div>
      ))}

      {/* Empty state — only show when there are no others yet */}
      {users.length === 0 && (
        <div className="flex items-center text-xs px-2" style={{ color: 'var(--text-tertiary)' }}>
          Invite friends to see them here
        </div>
      )}
    </div>
  );
}
