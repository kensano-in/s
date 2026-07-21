'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BADGE_CONFIG, BadgeType } from '@/components/ui/IdentityBadge';
import IdentityBadge from '@/components/ui/IdentityBadge';
import BadgeInfoModal from '@/components/ui/BadgeInfoModal';
import { ArrowLeft, Award, Gem, ShieldCheck, Mail, Sparkles, Filter, Shield, Trophy, Activity, Target } from 'lucide-react';

const CATEGORIES = ['All', 'Special', 'Streak', 'Profile', 'Content', 'Social'];

const RARITY_DOT_COUNT: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  singularity: 6,
};

export default function BadgesRegistryPage() {
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<BadgeType | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Filtered badges list sorted by rarity priority
  const filteredBadges = useMemo(() => {
    const allBadgeKeys = Object.keys(BADGE_CONFIG) as BadgeType[];
    const filtered = allBadgeKeys.filter(key => {
      const conf = BADGE_CONFIG[key];
      // Skip the old backward compatibility badges so we only show the clean, curated 125 list!
      const isCompatKey = [
        'first_follower', 'connected', 'popular', 'influencer', 'legend',
        'first_post', 'liked', 'viral_post', 'bookmark_king', 'top_creator',
        'avatar_set', 'bio_written', 'complete_profile', 'banner_hero',
        'peacekeeper', 'veteran', 'early_adopter', 'helper',
        'post_10', 'post_50', 'post_100', 'comment_50',
        'explorer', 'night_owl', 'early_bird', 'curator'
      ].includes(key);
      if (isCompatKey) return false;

      if (activeCategory === 'All') return true;
      return conf.category.toLowerCase() === activeCategory.toLowerCase();
    });

    const RARITY_PRIORITY: Record<string, number> = {
      singularity: 0, mythic: 1, legendary: 2, epic: 3, rare: 4, common: 5,
    };

    return filtered.sort((a, b) => {
      const priorityA = RARITY_PRIORITY[BADGE_CONFIG[a].rarity] ?? 5;
      const priorityB = RARITY_PRIORITY[BADGE_CONFIG[b].rarity] ?? 5;
      return priorityA - priorityB;
    });
  }, [activeCategory]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 space-y-12 bg-black min-h-screen text-white font-sans selection:bg-white/20 selection:text-white">
      {/* ── Page Header ── */}
      <div className="space-y-6 relative pb-6 border-b border-white/[0.04]">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="group flex items-center gap-2 text-[10px] font-black text-white/35 hover:text-white transition-colors uppercase tracking-widest outline-none"
        >
          <ArrowLeft size={12} className="transition-transform group-hover:-translate-x-1" />
          Go Back
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white/30">
              <Award size={15} />
              <span className="text-[10px] font-black uppercase tracking-widest monospace">Network Protocol Registry</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase leading-none">
              Identity Credentials
            </h1>
            <p className="text-[13px] text-white/45 leading-relaxed font-medium max-w-[620px]">
              The official registry of verification badges, community milestones, activity credentials, and trust certificates on Verlyn. Earned automatically through on-chain and off-chain protocols.
            </p>
          </div>

          {/* Rarity legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-xl bg-neutral-950/40 border border-white/[0.03]">
            {[
              { rarity: 'Common',      color: '#94a3b8'  },
              { rarity: 'Rare',      color: '#06b6d4'  },
              { rarity: 'Epic',      color: '#8b5cf6'  },
              { rarity: 'Legendary', color: '#f59e0b'  },
              { rarity: 'Mythic',    color: '#ec4899'  },
              { rarity: 'One of One', color: '#ffffff'  },
            ].map(({ rarity, color }) => (
              <div key={rarity} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{rarity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Filter Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.02]">
        {CATEGORIES.map(category => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 select-none relative ${
                isActive
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {category}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Badge Showcase Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredBadges.map((key, idx) => {
            const conf        = BADGE_CONFIG[key];
            const isHovered   = hoveredBadge === key;

            return (
              <motion.div
                key={key}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onHoverStart={() => setHoveredBadge(key)}
                onHoverEnd={() => setHoveredBadge(null)}
                onClick={() => setSelectedBadge(key)}
                className="group relative rounded-xl bg-neutral-950/20 hover:bg-neutral-900/20 border border-white/[0.04] hover:border-white/[0.1] cursor-pointer overflow-hidden transition-all duration-300 flex flex-col justify-between"
                style={{ minHeight: 190 }}
              >
                {/* Advanced glow backdrop */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at 15% 15%, ${conf.glowColor.replace(/[\d.]+\)$/, '0.08)')}, transparent 65%)`,
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="p-6 flex flex-col h-full justify-between gap-5 relative z-10">
                  {/* Top row: animated badge + rarity pill */}
                  <div className="flex items-start justify-between">
                    <div className="relative">
                      <IdentityBadge
                        type={key}
                        size="lg"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-1.5 pt-1">
                      {/* Rarity label */}
                      <span
                        className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest monospace opacity-70"
                        style={{ color: conf.rarityColor }}
                      >
                        {conf.rarityLabel}
                      </span>

                      {/* Rarity dots */}
                      <div className="flex gap-1">
                        {Array.from({
                          length: RARITY_DOT_COUNT[conf.rarity] ?? 1,
                        }, (_, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: conf.primaryColor }}
                            className="w-1 h-1 rounded-full opacity-65"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Badge identity text */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-end">
                    <h3 className="text-[11.5px] font-black text-white uppercase tracking-wider leading-none group-hover:text-indigo-300 transition-colors">
                      {conf.label}
                    </h3>
                    <p className="text-[11px] text-white/35 leading-relaxed font-semibold line-clamp-2">
                      {conf.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div
                    className="text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ color: conf.rarityColor }}
                  >
                    View Details
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Security guidelines ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-8 rounded-xl bg-neutral-950/40 border border-white/[0.03] space-y-6"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-white/40" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 monospace">
            Secure Credential Protocols
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60">
              <Activity size={12} />
              <span className="text-[10px] font-black uppercase tracking-wide monospace">Active Streaks</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed font-medium">
              Daily login streaks are updated at midnight UTC. Missing a day resets your active counters and locks higher streak multipliers.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60">
              <Shield size={12} />
              <span className="text-[10px] font-black uppercase tracking-wide monospace">Trust Score Security</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed font-medium">
              Guarding credentials require maintaining a security index above 80%. Violations or malicious behavior will trigger automatic revokes.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60">
              <Target size={12} />
              <span className="text-[10px] font-black uppercase tracking-wide monospace">Verification Authority</span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed font-medium">
              Sovereign badges require verified digital identity checks. You can initiate verification through the Verlyn network governance portal.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.02] flex items-center justify-between flex-wrap gap-4">
          <button
            type="button"
            onClick={() => window.location.href = 'mailto:verify@verlyn.in'}
            className="inline-flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest outline-none"
          >
            <Mail size={12} /> Contact Registry Office
          </button>
          
          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest monospace">
            Verlyn Cryptographic Identity System v2.4
          </span>
        </div>
      </motion.div>

      {/* Modal */}
      <BadgeInfoModal
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
        type={selectedBadge}
      />
    </div>
  );
}
