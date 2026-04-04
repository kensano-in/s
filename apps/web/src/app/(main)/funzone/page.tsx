'use client';

import { MOCK_GAMES } from '@/lib/mockData';
import type { MiniGame } from '@/lib/types';
import { Zap, Users, Trophy, Flame, Play, Globe, X, Gamepad2, BrainCircuit, Swords, UsersRound, Puzzle } from 'lucide-react';
import { useState } from 'react';

function GameCard({ game, onPlay }: { game: MiniGame, onPlay: (g: MiniGame) => void }) {
  const CATEGORY_PALETTE: Record<string, string> = {
    arcade: 'var(--v-pink)',
    puzzle: 'var(--v-cyan)',
    strategy: 'var(--v-orange)',
    trivia: 'var(--v-violet)',
    community: 'var(--v-green)',
  };
  
  const CATEGORY_ICON: Record<string, typeof Gamepad2> = {
    arcade: Gamepad2,
    puzzle: BrainCircuit,
    strategy: Swords,
    community: UsersRound,
    trivia: Puzzle,
  };

  const color = CATEGORY_PALETTE[game.category] ?? 'var(--v-violet)';

  return (
    <div
      className="glass-card p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 shine"
    >
      {/* Thumbnail Graphics */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `1px solid ${color}44`, boxShadow: `0 0 20px ${color}11` }}
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        {(() => {
          const Icon = CATEGORY_ICON[game.category] || Gamepad2;
          return <Icon size={32} style={{ color }} className="drop-shadow-lg icon-burst" />;
        })()}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-2">
        {game.isHot && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,140,66,0.15)', color: 'var(--v-orange)', border: '1px solid rgba(255,140,66,0.3)' }}>
            <Flame size={9} /> HOT
          </span>
        )}
        {game.isCommunity && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--v-green)', border: '1px solid rgba(0,229,160,0.3)' }}>
            <Globe size={9} /> COMMUNITY
          </span>
        )}
      </div>

      <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{game.title}</h3>
      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
        {game.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={11} />
          <span>{(game.players ?? 0).toLocaleString()} playing</span>
        </div>
        <span
          className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md"
          style={{ background: `${color}22`, color }}
        >
          {game.category}
        </span>
      </div>

      {/* Play button */}
      <button
        onClick={() => onPlay(game)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group-hover:shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}bb)`,
          color: '#fff',
          boxShadow: `0 4px 16px ${color}44`,
        }}
        id={`play-btn-${game.id}`}
      >
        <Play size={14} fill="currentColor" />
        Play Now
      </button>
    </div>
  );
}

export default function FunZonePage() {
  const [category, setCategory] = useState<string>('all');
  const [activeGame, setActiveGame] = useState<MiniGame | null>(null);
  const categories = ['all', 'arcade', 'puzzle', 'strategy', 'trivia', 'community'];

  const filtered = category === 'all'
    ? MOCK_GAMES
    : MOCK_GAMES.filter((g) => g.category === category);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0a40 0%, #0a1040 50%, #0a2040 100%)' }}
      >
        {/* Background glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: 'var(--v-pink)' }} />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: 'var(--v-cyan)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={22} style={{ color: 'var(--v-orange)' }} />
            <h1 className="text-2xl font-black text-white">Fun Zone</h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Games, community challenges & mini tournaments. Play, compete, and win.
          </p>

          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-4">
            {[
              { icon: Users, label: '42K online', color: 'var(--v-green)' },
              { icon: Trophy, label: 'Seasonal Tourney Active', color: 'var(--v-gold)' },
              { icon: Flame, label: '6 games trending', color: 'var(--v-orange)' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-xs" style={{ color: stat.color }}>
                <stat.icon size={13} />
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 py-2 overflow-x-auto hide-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-all duration-300 shadow-ambient"
            style={{
              background: category === cat ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' : 'var(--surface-low)',
              color: category === cat ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${category === cat ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {cat === 'all' ? 'All Games' : cat}
          </button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((game, i) => (
          <div
            key={game.id}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
          >
            <GameCard game={game} onPlay={setActiveGame} />
          </div>
        ))}
      </div>

      {activeGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-surface-highest border border-outline-variant/20 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/10 bg-surface-lowest/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeGame.thumbnail}</span>
                <div>
                  <h2 className="font-bold text-on-surface leading-tight">{activeGame.title}</h2>
                  <p className="text-[11px] text-on-surface-variant font-semibold tracking-wide uppercase">Connecting to Verlyn Network</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveGame(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface hover:bg-surface-highest border border-outline-variant/20 transition-colors text-on-surface-variant hover:text-on-surface"
                id="close-game-btn"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary-dark/20 mix-blend-color animate-pulse"></div>
              <div className="relative z-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 border-4 border-primary-light border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="text-2xl font-black font-display text-white mb-2 tracking-tight">Establishing Connection...</h3>
                <p className="text-sm text-white/60 w-72 leading-relaxed">Booting Secure P2P socket instance for {activeGame.title}.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
