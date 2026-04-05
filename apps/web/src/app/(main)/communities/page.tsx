'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Community } from '@/lib/types';
import { Users, Lock, Zap, Search, Plus, TrendingUp, Star, Loader2, Hash, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const BOOST_COLORS = ['', 'var(--v-cyan)', 'var(--v-violet)', 'var(--v-pink)'];
const BOOST_LABELS = ['', 'Boosted', 'Boosted II', '🔥 Boosted III'];

// Gradient per community based on index
const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #4c1d95 0%, #2e1065 100%)',
  'linear-gradient(135deg, #134e4a 0%, #064e3b 100%)',
  'linear-gradient(135deg, #881337 0%, #4c0519 100%)',
  'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
  'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
  'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
];

function CommunityCard({ c, idx }: { c: Community; idx: number }) {
  const [joined, setJoined] = useState<boolean>(c.isJoined ?? false);
  const gradient = BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length];

  return (
    <div className="glass-card p-4 hover:border-opacity-40 transition-all duration-200">
      {/* Banner */}
      <div className="h-20 rounded-xl mb-4 relative overflow-hidden" style={{ background: gradient }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)' }} />
        {(c.boostLevel ?? 0) > 0 && (
          <span
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)', color: BOOST_COLORS[c.boostLevel ?? 0], border: `1px solid ${BOOST_COLORS[c.boostLevel ?? 0]}` }}
          >
            {BOOST_LABELS[c.boostLevel ?? 0]}
          </span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 -mt-8 relative border-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border-strong)' }}
        >
          {c.iconUrl || <Hash size={20} className="text-primary-light" />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.displayName}</h3>
            {c.isPrivate && <Lock size={12} style={{ color: 'var(--text-tertiary)' }} />}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {fmt(c.memberCount)} members
          </div>
        </div>
      </div>

      <p className="text-xs mt-3 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {c.description || 'A community on Verlyn.'}
      </p>

      {c.tags && (
        <div className="flex flex-wrap gap-1 mt-2">
          {c.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--v-violet-light)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setJoined((v) => !v)}
          className={joined ? 'btn-glass flex-1 text-xs' : 'btn-primary flex-1 text-xs shine'}
          id={`join-btn-${c.id}`}
        >
          {joined ? 'Joined ✓' : <><Plus size={12} /> Join</>}
        </button>
        {(c.boostLevel ?? 0) < 3 && (
          <button className="btn-glass text-xs px-3 flex-shrink-0" style={{ color: 'var(--v-pink)' }}>
            <Zap size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  const [filter, setFilter] = useState<'all' | 'joined' | 'trending'>('all');
  const [query, setQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { currentUser } = useAppStore();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function loadCommunities() {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(50);

      if (!data || data.length === 0) {
        setLoading(false);
        setCommunities([]);
        return;
      }

      // Map DB columns to Community type
      const mapped: Community[] = data.map((c: any) => ({
        id: c.id,
        name: c.name || c.id,
        displayName: c.display_name || c.name || 'Community',
        description: c.description || '',
        iconUrl: c.icon_url || '',
        memberCount: c.member_count || 0,
        isPrivate: c.is_private || false,
        isJoined: false,
        boostLevel: c.boost_level || 0,
        tags: c.tags || [],
        createdAt: c.created_at || new Date().toISOString(),
      }));

      setCommunities(mapped);
      setLoading(false);
    }
    loadCommunities();
  }, [supabase]);

  const filtered = communities.filter((c) => {
    const matchesFilter =
      filter === 'joined' ? c.isJoined :
      filter === 'trending' ? c.memberCount > 1_000 :
      true;
    const matchesQuery = !query || c.displayName.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black gradient-text">Communities</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Discover spaces built around what you love
          </p>
        </div>
        <button className="btn-primary text-sm shine" id="create-community-btn" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={15} /> Create
        </button>
      </div>

      {/* Create Community Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 relative border border-outline-variant/30 shadow-2xl">
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4 text-on-surface">Create a Community</h2>
            <form action={async (formData) => {
              setIsCreating(true);
              const { createCommunity } = await import('./actions');
              const res = await createCommunity(formData);
              setIsCreating(false);
              if (res.success) {
                setIsCreateModalOpen(false);
                // Prepend to list optimistically or refetch
                if (res.community) {
                  const newComm: Community = {
                    id: res.community.id,
                    name: res.community.name,
                    displayName: res.community.display_name,
                    description: res.community.description,
                    iconUrl: res.community.icon_url,
                    memberCount: res.community.member_count || 1,
                    isPrivate: res.community.is_private || false,
                    isJoined: true,
                    boostLevel: res.community.boost_level || 0,
                    createdAt: res.community.created_at || new Date().toISOString(),
                    tags: [],
                  };
                  setCommunities(prev => [newComm, ...prev]);
                }
              } else {
                alert(`Error: ${res.error}`);
              }
            }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Community ID (lowercase, no spaces)</label>
                <input required name="name" type="text" className="w-full bg-surface-lowest border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:border-primary-light outline-none" placeholder="e.g. designsystems" />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Display Name</label>
                <input required name="displayName" type="text" className="w-full bg-surface-lowest border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:border-primary-light outline-none" placeholder="e.g. Design Systems Global" />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">Description</label>
                <textarea required name="description" rows={3} className="w-full bg-surface-lowest border border-outline-variant/30 rounded-xl px-4 py-2 text-sm focus:border-primary-light outline-none resize-none" placeholder="What is this community about?" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-lowest border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-primary-light" />
                  <div>
                    <div className="text-sm font-semibold">Private Community</div>
                    <div className="text-[10px] text-on-surface-variant">Only members can see posts.</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isPrivate" value="true" className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-light"></div>
                </label>
              </div>
              <button disabled={isCreating} type="submit" className="w-full btn-primary py-2.5 flex justify-center items-center gap-2 mt-2">
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Create Community'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative group">
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none opacity-0 group-focus-within:opacity-100"
          style={{
            background: 'linear-gradient(135deg, rgba(147,51,234,0.5), rgba(79,209,197,0.5))',
            padding: '1px', borderRadius: '16px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          }}
        />
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search communities…"
          className="w-full py-3 pl-11 pr-4 rounded-2xl text-[14px] focus:outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
          }}
          onFocus={(e) => { e.target.style.background = 'rgba(147,51,234,0.06)'; e.target.style.border = '1px solid rgba(147,51,234,0.4)'; }}
          onBlur={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.border = '1px solid rgba(255,255,255,0.08)'; }}
          id="community-search"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All', icon: Users },
          { key: 'joined', label: 'Joined', icon: Star },
          { key: 'trending', label: 'Trending', icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: filter === key ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' : 'var(--surface)',
              color: filter === key ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${filter === key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-light" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center gap-3">
          <Hash size={40} className="text-primary-light opacity-40" />
          <h3 className="text-lg font-bold text-on-surface">No communities yet</h3>
          <p className="text-sm text-on-surface-variant max-w-xs">Be the first to create a community and bring people together.</p>
          <button className="btn-primary text-sm mt-2 shine" id="create-community-cta">
            <Plus size={14} /> Create a Community
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <div key={c.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
              <CommunityCard c={c} idx={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
