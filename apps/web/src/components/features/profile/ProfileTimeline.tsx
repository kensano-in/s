'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Edit3,
  Award,
  Shield,
  Pin,
  Lock,
  Users,
  Loader2,
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown,
  Clock,
  Milestone,
  Zap,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface TimelineMilestone {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: string;
  isPinned?: boolean;
}

interface ProfileTimelineProps {
  milestones: TimelineMilestone[];
  loading: boolean;
}

// ── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, {
  icon: any;
  color: string;
  bg: string;
  border: string;
  label: string;
  filterGroup: string;
}> = {
  account_created:  { icon: Star,      color: 'text-yellow-400',  bg: 'bg-yellow-500/10',   border: 'border-yellow-500/20',  label: 'Account Created',      filterGroup: 'milestones' },
  username_changed: { icon: Edit3,     color: 'text-blue-400',    bg: 'bg-blue-500/10',     border: 'border-blue-500/20',    label: 'Username Changed',     filterGroup: 'profile' },
  badge_unlocked:   { icon: Award,     color: 'text-violet-400',  bg: 'bg-violet-500/10',   border: 'border-violet-500/20',  label: 'Badge Unlocked',       filterGroup: 'achievements' },
  verified:         { icon: Shield,    color: 'text-white',       bg: 'bg-white/10',        border: 'border-white/20',       label: 'Verified',             filterGroup: 'achievements' },
  pinned:           { icon: Pin,       color: 'text-blue-300',    bg: 'bg-blue-500/10',     border: 'border-blue-500/15',    label: 'Pinned Memory',        filterGroup: 'milestones' },
  privacy_changed:  { icon: Lock,      color: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/20',   label: 'Privacy Changed',      filterGroup: 'profile' },
  friend_milestone: { icon: Users,     color: 'text-emerald-400', bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20', label: 'Friend Milestone',     filterGroup: 'social' },
  milestone:        { icon: Zap,       color: 'text-indigo-400',  bg: 'bg-indigo-500/10',   border: 'border-indigo-500/20',  label: 'Milestone',            filterGroup: 'milestones' },
  custom:           { icon: Milestone, color: 'text-white/70',    bg: 'bg-white/[0.06]',    border: 'border-white/[0.08]',   label: 'Memory',               filterGroup: 'milestones' },
};

const DEFAULT_CONFIG = {
  icon: Calendar,
  color: 'text-white/50',
  bg: 'bg-white/[0.04]',
  border: 'border-white/[0.06]',
  label: 'Event',
  filterGroup: 'milestones',
};

function getEventConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] || DEFAULT_CONFIG;
}

// ── Filter groups ────────────────────────────────────────────────────────────

const FILTER_GROUPS = [
  { id: 'all',          label: 'All' },
  { id: 'milestones',   label: 'Milestones' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'profile',      label: 'Profile Changes' },
  { id: 'social',       label: 'Social' },
];

// ── Date grouping ─────────────────────────────────────────────────────────────

function getYearGroup(dateStr: string): string {
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return 'Unknown';
  }
}

function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Single milestone card ─────────────────────────────────────────────────────

function TimelineCard({
  milestone,
  index,
  isLast,
}: {
  milestone: TimelineMilestone;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = getEventConfig(milestone.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-4 group"
    >
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[18px] top-9 bottom-0 w-px bg-white/[0.05]" />
      )}

      {/* Event icon orb */}
      <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full ${config.bg} border ${config.border} flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-200 group-hover:scale-110`}>
        <Icon size={15} className={config.color} />
        {/* Pinned indicator */}
        {milestone.isPinned && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border border-[#0A0A0A] flex items-center justify-center">
            <Pin size={6} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Content card */}
      <div
        className={`flex-1 mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.09] transition-all duration-200 cursor-pointer min-w-0 ${
          milestone.isPinned ? 'ring-1 ring-blue-500/20' : ''
        }`}
        onClick={() => milestone.description && setExpanded(!expanded)}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {milestone.isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-black uppercase tracking-wider text-blue-400">
                  Pinned
                </span>
              )}
              <span className={`text-[9px] font-black uppercase tracking-widest ${config.color} opacity-70`}>
                {config.label}
              </span>
            </div>
            <h4 className="text-[13px] font-extrabold text-white/95 leading-snug">{milestone.title}</h4>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-white/25 font-semibold whitespace-nowrap flex items-center gap-1">
              <Clock size={9} />
              {formatEventDate(milestone.date)}
            </span>
            {milestone.description && (
              <ChevronDown
                size={13}
                className={`text-white/25 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </div>

        {/* Expandable description */}
        <AnimatePresence>
          {expanded && milestone.description && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[12px] text-white/55 leading-relaxed mt-2.5 overflow-hidden"
            >
              {milestone.description}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Year section header ───────────────────────────────────────────────────────

function YearHeader({ year }: { year: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-2">
      <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.2em]">{year}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function ProfileTimeline({ milestones, loading }: ProfileTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Filter + search logic ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let items = [...milestones];

    // Pinned items float to top
    items.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Filter by group
    if (activeFilter !== 'all') {
      items = items.filter((m) => {
        const config = getEventConfig(m.type);
        return config.filterGroup === activeFilter;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.description || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [milestones, activeFilter, searchQuery]);

  const displayedItems = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  // ── Group by year ─────────────────────────────────────────────────────────

  const groupedByYear = useMemo(() => {
    const groups: Record<string, TimelineMilestone[]> = {};
    for (const item of displayedItems) {
      const year = getYearGroup(item.date);
      if (!groups[year]) groups[year] = [];
      groups[year].push(item);
    }
    return groups;
  }, [displayedItems]);

  const years = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a));

  // ── Infinite scroll via IntersectionObserver ──────────────────────────────

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    if (!bottomRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 size={20} className="animate-spin text-white/20" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (milestones.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 gap-5 text-center"
      >
        <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
          <Milestone size={26} className="text-white/15" />
        </div>
        <div>
          <p className="text-[13px] font-extrabold text-white/40 uppercase tracking-widest">Timeline Empty</p>
          <p className="text-[11px] text-white/20 mt-1.5 max-w-[240px] leading-relaxed font-semibold">
            Account milestones, achievements, and memories will appear here over time.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── No results after filter ────────────────────────────────────────────────

  if (filtered.length === 0) {
    return (
      <div>
        <TimelineToolbar
          searchQuery={searchQuery}
          onSearchChange={(v) => { setSearchQuery(v); setDisplayCount(PAGE_SIZE); }}
          activeFilter={activeFilter}
          onFilterChange={(v) => { setActiveFilter(v); setDisplayCount(PAGE_SIZE); }}
          showFilterPanel={showFilterPanel}
          setShowFilterPanel={setShowFilterPanel}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 gap-4 text-center"
        >
          <Search size={24} className="text-white/15" />
          <div>
            <p className="text-[13px] font-bold text-white/30 uppercase tracking-wider">No results</p>
            <p className="text-[11px] text-white/20 mt-1">
              {searchQuery ? `No events match "${searchQuery}"` : 'No events in this category'}
            </p>
          </div>
          <button
            onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
            className="text-[11px] font-bold text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
          >
            <X size={11} /> Clear filters
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="space-y-4 pt-2">
      <TimelineToolbar
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setDisplayCount(PAGE_SIZE); }}
        activeFilter={activeFilter}
        onFilterChange={(v) => { setActiveFilter(v); setDisplayCount(PAGE_SIZE); }}
        showFilterPanel={showFilterPanel}
        setShowFilterPanel={setShowFilterPanel}
      />

      {/* Timeline entries grouped by year */}
      <div className="space-y-2">
        {years.map((year) => {
          const yearItems = groupedByYear[year];
          return (
            <div key={year}>
              <YearHeader year={year} />
              <div className="pl-1">
                {yearItems.map((milestone, idx) => (
                  <TimelineCard
                    key={milestone.id}
                    milestone={milestone}
                    index={idx}
                    isLast={idx === yearItems.length - 1}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={bottomRef} className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin text-white/20" />
        </div>
      )}

      {/* End of timeline */}
      {!hasMore && filtered.length > PAGE_SIZE && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
          <span className="text-[10px] font-bold text-white/15 uppercase tracking-widest">
            — End of Timeline —
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ── Toolbar subcomponent ──────────────────────────────────────────────────────

function TimelineToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  showFilterPanel,
  setShowFilterPanel,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  activeFilter: string;
  onFilterChange: (v: string) => void;
  showFilterPanel: boolean;
  setShowFilterPanel: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3 mb-4">
      {/* Search + Filter toggle row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search timeline..."
            className="w-full pl-8 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[12px] text-white/80 placeholder:text-white/25 outline-none focus:border-white/15 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
            activeFilter !== 'all'
              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
              : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70'
          }`}
        >
          <Filter size={13} />
        </button>
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 flex-wrap pb-1">
              {FILTER_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onFilterChange(group.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                    activeFilter === group.id
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70 hover:border-white/10'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
