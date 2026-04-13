'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquare, TrendingUp, Users } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { getPulseSignalsDB } from '@/app/(main)/communities/actions';

interface PulseEvent {
  id: string;
  type: 'users' | 'message' | 'trending' | 'activity';
  text: string;
  count: number;
  icon: any;
  color: string;
  href: string;
}

const ICON_MAP = {
  users: Users,
  message: MessageSquare,
  trending: TrendingUp,
  activity: Activity,
};

export default function PulseFeed({ className }: { className?: string }) {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    const res = await getPulseSignalsDB();
    if (res.success && res.signals) {
      const formatted = res.signals.map((s: any) => ({
        ...s,
        icon: ICON_MAP[s.type as keyof typeof ICON_MAP] || Activity,
      }));
      setEvents(formatted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // Pulse every 60 seconds
    return () => clearInterval(interval);
  }, [fetchSignals]);

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2 mb-2">
         <div className="relative flex h-2 w-2">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-v-cyan opacity-75"></span>
           <span className="relative inline-flex rounded-full h-2 w-2 bg-v-cyan"></span>
         </div>
         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Pulse</span>
      </div>

      <div className="relative w-full overflow-hidden min-h-[140px] flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {events.map((ev, index) => {
            const Icon = ev.icon;
            // Opacity decay for older items to keep focus on the newest
            const opacityClass = index === 0 ? 'opacity-100' : index === 1 ? 'opacity-60' : 'opacity-30';
            
            return (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className={clsx(
                   'w-full glass-card bg-surface-lowest/20 rounded-xl p-3 border border-white/5 flex items-center gap-3',
                   opacityClass
                )}
              >
                <Link href={ev.href} className="group flex-1 flex items-center gap-3 min-w-0">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center bg-[#121212]', ev.color)}>
                    <Icon size={14} />
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <div className="flex items-center gap-1.5 line-clamp-1">
                        <Counter value={ev.count} className={clsx('text-[11px] font-bold', ev.color)} />
                        <span className="text-[11px] text-white font-medium truncate group-hover:text-v-cyan transition-colors">{ev.text}</span>
                     </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Micro-component for animating number changes
function Counter({ value, className }: { value: number, className?: string }) {
  // Simple react-level number slide - for complex physics framer-motion useMotionValue + animate is better
  // but for simple text, a key-based slide works perfectly
  return (
    <div className={clsx('relative inline-flex items-center overflow-hidden h-4', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
