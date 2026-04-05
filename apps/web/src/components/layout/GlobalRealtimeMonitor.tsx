'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { Sparkles, Bell } from 'lucide-react';

export default function GlobalRealtimeMonitor() {
  const { currentUser, setSyncStatus, updateProfile } = useAppStore();
  const [liveToast, setLiveToast] = useState<{ title: string; body: string; id: number } | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const supabase = createClient();

    // The God-Tier Notification Listener
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload: any) => {
          // Play pop sound
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
          } catch(e) {}
          
          setLiveToast({
            title: 'New Network Alert',
            body: payload.new.body || 'You have a new interaction.',
            id: Date.now()
          });

          // Auto-hide
          setTimeout(() => setLiveToast(null), 4000);
        }
      )
      .subscribe();

    // Process the _verlynFollowQueue
    const handleFollowQueue = async () => {
      const w = window as any;
      if (w._verlynFollowQueue && w._verlynFollowQueue.length > 0) {
        setSyncStatus('syncing');
        const tasks = [...w._verlynFollowQueue];
        w._verlynFollowQueue = [];
        try {
          const m = await import('@/app/(main)/profile/actions');
          for (const task of tasks) {
            await m.toggleFollowDB(currentUser.id, task.userId, task.state);
          }
          // Force network refresh of our user row logic to update following count instantly
          const { data } = await supabase.from('users').select('follower_count, following_count').eq('id', currentUser.id).single();
          if (data) updateProfile({ followerCount: data.follower_count, followingCount: data.following_count });
          setSyncStatus('idle');
        } catch(e) {
          console.error('[Engine] Queue failure:', e);
          setSyncStatus('error');
        }
      }
    };
    window.addEventListener('verlyn-follow-sync', handleFollowQueue);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('verlyn-follow-sync', handleFollowQueue);
    };
  }, [currentUser?.id, setSyncStatus, updateProfile]);

  return (
    <>
      {liveToast && (
        <div className="fixed top-6 right-6 z-[999] animate-[slide-in-right_0.4s_ease-out]">
          <div className="glass-card px-5 py-4 rounded-2xl border border-primary-light/30 shadow-[0_20px_40px_-15px_rgba(108,99,255,0.3)] flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center flex-shrink-0 animate-pulse shadow-ambient">
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-on-surface tracking-wide">{liveToast.title}</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">{liveToast.body}</p>
            </div>
            <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      )}
    </>
  );
}
