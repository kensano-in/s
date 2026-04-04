'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_GAMES } from '@/lib/mockData';
import type { MiniGame } from '@/lib/types';
import { Zap, Users, Trophy, Flame, Play, Globe, X, Gamepad2, BrainCircuit, Swords, UsersRound, Puzzle, RotateCcw } from 'lucide-react';

// ─── SNAKE GAME ────────────────────────────────────────────────────────────────
function SnakeGame() {
  const GRID = 20;
  const CELL = 18;
  const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState([5, 5]);
  const [dir, setDir] = useState([0, -1]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const dirRef = useRef(dir);
  dirRef.current = dir;

  const randFood = useCallback((s: number[][]) => {
    let f: number[];
    do { f = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)]; }
    while (s.some(c => c[0] === f[0] && c[1] === f[1]));
    return f;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, number[]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[e.key]) { e.preventDefault(); const d = map[e.key]; if (d[0] !== -dirRef.current[0] || d[1] !== -dirRef.current[1]) setDir(d); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!running || dead) return;
    const id = setInterval(() => {
      setSnake(prev => {
        const head = [prev[0][0] + dirRef.current[0], prev[0][1] + dirRef.current[1]];
        if (head[0] < 0 || head[0] >= GRID || head[1] < 0 || head[1] >= GRID || prev.some(c => c[0] === head[0] && c[1] === head[1])) {
          setDead(true); setRunning(false); return prev;
        }
        const ate = head[0] === food[0] && head[1] === food[1];
        const ns = [head, ...prev.slice(0, ate ? undefined : -1)];
        if (ate) { setScore(s => s + 10); setFood(randFood(ns)); }
        return ns;
      });
    }, 120);
    return () => clearInterval(id);
  }, [running, dead, food, randFood]);

  const reset = () => { setSnake([[10, 10], [10, 11], [10, 12]]); setFood([5, 5]); setDir([0, -1]); setScore(0); setDead(false); setRunning(true); };

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex items-center gap-4 text-sm font-semibold text-white">
        <span>Score: <span className="text-green-400">{score}</span></span>
        {dead && <span className="text-red-400 animate-pulse">Game Over!</span>}
      </div>
      <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/40"
        style={{ width: GRID * CELL, height: GRID * CELL }}
        tabIndex={0}
      >
        {/* Food */}
        <div className="absolute w-4 h-4 rounded-full bg-red-400 shadow-[0_0_12px_red]"
          style={{ left: food[0] * CELL + 1, top: food[1] * CELL + 1 }} />
        {/* Snake */}
        {snake.map((c, i) => (
          <div key={i} className="absolute rounded-sm"
            style={{
              left: c[0] * CELL + 1, top: c[1] * CELL + 1,
              width: CELL - 2, height: CELL - 2,
              background: i === 0 ? 'linear-gradient(135deg,#a78bfa,#22d3ee)' : 'rgba(167,139,250,0.7)',
            }} />
        ))}
      </div>
      <div className="flex gap-3">
        {!running && !dead && <button onClick={() => setRunning(true)} className="px-5 py-2 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-400 transition-colors">Start</button>}
        {running && <button onClick={() => setRunning(false)} className="px-5 py-2 rounded-xl bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors">Pause</button>}
        <button onClick={reset} className="px-5 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2"><RotateCcw size={14} /> Reset</button>
      </div>
      <p className="text-xs text-white/50">Use arrow keys to control</p>
    </div>
  );
}

// ─── TIC TAC TOE ───────────────────────────────────────────────────────────────
function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<string | null>(null);

  const checkWin = (b: (string | null)[]) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, bb, c] of lines) if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a];
    return b.every(Boolean) ? 'Draw' : null;
  };

  const click = (i: number) => {
    if (board[i] || winner) return;
    const nb = [...board]; nb[i] = turn;
    const w = checkWin(nb);
    setBoard(nb); setWinner(w); if (!w) setTurn(t => t === 'X' ? 'O' : 'X');
  };

  const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); setWinner(null); };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-base font-bold text-white">
        {winner ? (winner === 'Draw' ? "It's a draw!" : `${winner} wins! 🎉`) : `Player ${turn}'s turn`}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button key={i} onClick={() => click(i)}
            className="w-20 h-20 rounded-2xl text-3xl font-black transition-all duration-200 border border-white/10 hover:border-white/30 hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.04)', color: cell === 'X' ? '#a78bfa' : '#22d3ee' }}
          >{cell}</button>
        ))}
      </div>
      <button onClick={reset} className="px-5 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
        <RotateCcw size={14} /> New Game
      </button>
    </div>
  );
}

// ─── MEMORY FLIP ───────────────────────────────────────────────────────────────
function MemoryGame() {
  const EMOJIS = ['🔥', '⚡', '🌊', '🌸', '🎯', '💎', '🚀', '🎭'];
  const makeCards = () => [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
  const [cards, setCards] = useState(makeCards());
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const flip = (id: number) => {
    if (locked || cards[id].flipped || cards[id].matched || selected.length === 2) return;
    const newSel = [...selected, id];
    setCards(c => c.map((card) => card.id === id ? { ...card, flipped: true } : card));
    setSelected(newSel);
    if (newSel.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newSel;
      setTimeout(() => {
        setCards(c => c.map(card => {
          if (card.id === a || card.id === b) {
            return c[a].emoji === c[b].emoji
              ? { ...card, matched: true }
              : { ...card, flipped: false };
          }
          return card;
        }));
        setSelected([]);
        setLocked(false);
      }, 900);
    }
  };

  const matched = cards.filter(c => c.matched).length;
  const won = matched === cards.length;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-sm font-semibold text-white">
        <span>Moves: <span className="text-violet-400">{moves}</span></span>
        <span>Matched: <span className="text-green-400">{matched / 2}/{EMOJIS.length}</span></span>
        {won && <span className="text-yellow-400 animate-bounce">You won! 🎉</span>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card.id)}
            className="w-16 h-16 rounded-2xl text-2xl transition-all duration-300 border border-white/10"
            style={{
              background: card.flipped || card.matched ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
              transform: card.flipped || card.matched ? 'rotateY(0deg)' : 'rotateY(180deg)',
              borderColor: card.matched ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.1)',
              boxShadow: card.matched ? '0 0 20px rgba(167,139,250,0.3)' : 'none',
            }}
          >
            {card.flipped || card.matched ? card.emoji : ''}
          </button>
        ))}
      </div>
      <button onClick={() => { setCards(makeCards()); setSelected([]); setMoves(0); setLocked(false); }}
        className="px-5 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
        <RotateCcw size={14} /> Shuffle
      </button>
    </div>
  );
}

// ─── TYPING SPEED ──────────────────────────────────────────────────────────────
const SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "Verlyn is the future of sovereign social interaction.",
  "Type fast and beat your personal best score today.",
  "Excellence is not a destination but a continuous journey.",
];

function TypingGame() {
  const [sentence] = useState(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleType = (v: string) => {
    if (!started) { setStarted(true); setStartTime(Date.now()); }
    setTyped(v);
    if (v === sentence) {
      const mins = (Date.now() - startTime) / 60000;
      setWpm(Math.round((sentence.split(' ').length / mins)));
      setDone(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm leading-relaxed font-mono">
        {sentence.split('').map((ch, i) => {
          let color = 'text-white/40';
          if (i < typed.length) color = typed[i] === ch ? 'text-green-400' : 'text-red-400';
          if (i === typed.length) color = 'text-white animate-pulse';
          return <span key={i} className={color}>{ch}</span>;
        })}
      </div>
      {done ? (
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-yellow-400">{wpm} WPM</div>
          <div className="text-white/60 text-sm">
            {wpm > 60 ? '🔥 Blazing fast!' : wpm > 40 ? '⚡ Good speed!' : '📝 Keep practicing!'}
          </div>
          <button onClick={() => { setTyped(''); setStarted(false); setDone(false); if (ref.current) ref.current.value = ''; }}
            className="px-5 py-2 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2 mx-auto">
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      ) : (
        <input
          ref={ref}
          type="text"
          value={typed}
          onChange={e => handleType(e.target.value)}
          placeholder="Start typing here..."
          className="w-full bg-white/5 border border-white/15 text-white rounded-xl px-4 py-3 outline-none focus:border-violet-400/50 transition-colors font-mono text-sm"
          disabled={done}
          autoFocus
        />
      )}
      {started && !done && (
        <div className="text-xs text-white/40 text-center">{typed.length}/{sentence.length} chars</div>
      )}
    </div>
  );
}

// ─── GAME MODAL ────────────────────────────────────────────────────────────────
function GameModal({ game, onClose }: { game: MiniGame; onClose: () => void }) {
  const gameMap: Record<string, React.ReactNode> = {
    '1': <SnakeGame />,
    '2': <TicTacToe />,
    '3': <MemoryGame />,
    '4': <TypingGame />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-surface-highest border border-outline-variant/20 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10 bg-surface-lowest/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{game.thumbnail}</span>
            <h2 className="font-bold text-on-surface">{game.title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface hover:bg-surface-highest border border-outline-variant/20 transition-colors text-on-surface-variant hover:text-on-surface" id="close-game-btn">
            <X size={16} />
          </button>
        </div>
        <div className="p-8 flex items-center justify-center bg-black/30">
          {gameMap[game.id] ?? (
            <div className="text-center text-white/50">
              <Gamepad2 size={48} className="mx-auto mb-3 opacity-30" />
              <p>Game coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GAME CARD ─────────────────────────────────────────────────────────────────
function GameCard({ game, onPlay }: { game: MiniGame; onPlay: (g: MiniGame) => void }) {
  const CATEGORY_PALETTE: Record<string, string> = {
    arcade: 'var(--v-pink)', puzzle: 'var(--v-cyan)', strategy: 'var(--v-orange)', trivia: 'var(--v-violet)', community: 'var(--v-green)',
  };
  const CATEGORY_ICON: Record<string, typeof Gamepad2> = {
    arcade: Gamepad2, puzzle: BrainCircuit, strategy: Swords, community: UsersRound, trivia: Puzzle,
  };
  const color = CATEGORY_PALETTE[game.category] ?? 'var(--v-violet)';
  const Icon = CATEGORY_ICON[game.category] || Gamepad2;

  return (
    <div className="glass-card p-5 cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_-12px_rgba(208,188,255,0.15)]">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)`, border: `1px solid ${color}44` }}>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Icon size={32} style={{ color }} className="drop-shadow-lg" />
      </div>
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
      <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{game.description}</p>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={11} /><span>{(game.players ?? 0).toLocaleString()} playing</span>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md" style={{ background: `${color}22`, color }}>{game.category}</span>
      </div>
      <button
        onClick={() => onPlay(game)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group-hover:shadow-lg hover:opacity-90"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff', boxShadow: `0 4px 16px ${color}44` }}
        id={`play-btn-${game.id}`}
      >
        <Play size={14} fill="currentColor" /> Play Now
      </button>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FunZonePage() {
  const [category, setCategory] = useState<string>('all');
  const [activeGame, setActiveGame] = useState<MiniGame | null>(null);
  const categories = ['all', 'arcade', 'puzzle', 'strategy', 'trivia', 'community'];
  const filtered = category === 'all' ? MOCK_GAMES : MOCK_GAMES.filter((g) => g.category === category);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a40 0%, #0a1040 50%, #0a2040 100%)' }}>
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-3xl opacity-30" style={{ background: 'var(--v-pink)' }} />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20" style={{ background: 'var(--v-cyan)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={22} style={{ color: 'var(--v-orange)' }} />
            <h1 className="text-2xl font-black text-white">Fun Zone</h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Real games, community challenges & mini tournaments.</p>
          <div className="flex items-center gap-4 mt-4">
            {[
              { icon: Users, label: '4 games live', color: 'var(--v-green)' },
              { icon: Trophy, label: 'Compete & win', color: 'var(--v-gold)' },
              { icon: Flame, label: 'Snake, Memory, TicTac, Typing', color: 'var(--v-orange)' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-xs" style={{ color: stat.color }}>
                <stat.icon size={13} /><span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 py-2 overflow-x-auto hide-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0 transition-all duration-300"
            style={{
              background: category === cat ? 'linear-gradient(135deg, var(--v-violet), var(--v-cyan))' : 'var(--surface-low)',
              color: category === cat ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${category === cat ? 'transparent' : 'var(--border)'}`,
            }}
          >{cat === 'all' ? 'All Games' : cat}</button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((game, i) => (
          <div key={game.id} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
            <GameCard game={game} onPlay={setActiveGame} />
          </div>
        ))}
      </div>

      {activeGame && <GameModal game={activeGame} onClose={() => setActiveGame(null)} />}
    </div>
  );
}
