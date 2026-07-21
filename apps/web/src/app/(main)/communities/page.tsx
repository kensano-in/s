'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, Search, Loader2, X, Globe, Lock, Hash, Activity,
  MessageSquare, Heart, Calendar, ChevronRight, ChevronLeft, Volume2, 
  Image as ImageIcon, Zap, BookOpen, Compass, Eye, Check, ExternalLink, Info,
  BarChart2, Link2, Type, AlertCircle, AtSign, Shield, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCommunities, createCommunity, toggleCommunityJoin, searchUsersForMention, getAllUsernames, getUserAvatarsMap, getCommunityMembers, updateCommunitySettings, updateMemberRole } from './actions';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAvatarUrl, getCommunityIconUrl } from '@/lib/utils';
import SocialEmbedCard, { detectPlatform } from '@/components/features/feed/SocialEmbedCard';

// ── CUSTOM COMMUNITY PERMISSIONS SYSTEM ──────────────────────────────────────
interface CommunityPermissions {
  post: 'admin' | 'member';
  remove: 'admin' | 'member';
  edit_post: 'admin' | 'member';
  post_link: 'admin' | 'member';
  pin_post: 'admin' | 'member';
  edit_tag: 'admin' | 'member';
  change_info: 'admin' | 'member';
  add_admin: 'admin' | 'member';
}

const DEFAULT_PERMISSIONS: CommunityPermissions = {
  post: 'admin',
  remove: 'admin',
  edit_post: 'admin',
  post_link: 'member',
  pin_post: 'admin',
  edit_tag: 'admin',
  change_info: 'admin',
  add_admin: 'admin'
};

function parsePermissions(description: string): { cleanDescription: string; permissions: CommunityPermissions } {
  if (!description) return { cleanDescription: '', permissions: DEFAULT_PERMISSIONS };
  const parts = description.split('||');
  if (parts.length > 1) {
    try {
      const parsed = JSON.parse(parts[1]);
      return {
        cleanDescription: parts[0].trim(),
        permissions: { ...DEFAULT_PERMISSIONS, ...parsed }
      };
    } catch {
      // ignore
    }
  }
  return { cleanDescription: description.trim(), permissions: DEFAULT_PERMISSIONS };
}

function serializePermissions(cleanDescription: string, permissions: CommunityPermissions): string {
  return `${cleanDescription} ||${JSON.stringify(permissions)}`;
}

// ── CULTURAL CATEGORIES DEFINITION ──────────────────────────────────────────
const CATEGORIES = [
  'All', 'Design', 'Technology', 'Anime', 'Music', 'Coding', 'Startups', 
  'Photography', 'Cinema', 'Writing', 'Art'
];

// ── 40 DIVERSE HUMAN IDENTITIES POOL ─────────────────────────────────────────
const USERS_POOL = [
  { name: "Ayla Chen", initials: "AC", role: "Founder", color: "bg-red-500/20 text-red-400 border border-red-500/30" },
  { name: "Kris Andersson", initials: "KA", role: "Contributor", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  { name: "Kunal Mehta", initials: "KM", role: "Moderator", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  { name: "Rohan Patel", initials: "RP", role: "Contributor", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  { name: "Luna Vasquez", initials: "LV", role: "Expert", color: "bg-pink-500/20 text-pink-400 border border-pink-500/30" },
  { name: "Shinichiro", initials: "S", role: "Founder", color: "bg-rose-500/20 text-rose-400 border border-rose-500/30" },
  { name: "Zara Osei", initials: "ZO", role: "Contributor", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  { name: "Hiroshi Tanaka", initials: "HT", role: "Expert", color: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" },
  { name: "Elena Rostova", initials: "ER", role: "Contributor", color: "bg-teal-500/20 text-teal-400 border border-teal-500/30" },
  { name: "Sarah Jenkins", initials: "SJ", role: "Contributor", color: "bg-orange-500/20 text-orange-400 border border-orange-500/30" },
  { name: "Raj Patel", initials: "RP", role: "Expert", color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" },
  { name: "Chloe Vance", initials: "CV", role: "Contributor", color: "bg-lime-500/20 text-lime-400 border border-lime-500/30" },
  { name: "Kenji Sato", initials: "KS", role: "Moderator", color: "bg-violet-500/20 text-violet-400 border border-violet-500/30" },
  { name: "Devon Cole", initials: "DC", role: "Contributor", color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  { name: "Maya Lin", initials: "ML", role: "Contributor", color: "bg-red-400/20 text-red-300 border border-red-400/30" },
  { name: "Mateo Silva", initials: "MS", role: "Expert", color: "bg-blue-400/20 text-blue-300 border border-blue-400/30" },
  { name: "Amara Diallo", initials: "AD", role: "Contributor", color: "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" },
  { name: "Yuki Sato", initials: "YS", role: "Contributor", color: "bg-purple-400/20 text-purple-300 border border-purple-400/30" },
  { name: "Liam O'Connor", initials: "LO", role: "Contributor", color: "bg-pink-400/20 text-pink-300 border border-pink-400/30" },
  { name: "Sofia Bianchi", initials: "SB", role: "Contributor", color: "bg-rose-400/20 text-rose-300 border border-rose-400/30" },
  { name: "Alex Mercer", initials: "AM", role: "Contributor", color: "bg-amber-400/20 text-amber-300 border border-amber-400/30" },
  { name: "Nina Williams", initials: "NW", role: "Contributor", color: "bg-teal-400/20 text-teal-300 border border-teal-400/30" },
  { name: "Omar Farooq", initials: "OF", role: "Expert", color: "bg-indigo-400/20 text-indigo-300 border border-indigo-400/30" },
  { name: "Priya Sharma", initials: "PS", role: "Contributor", color: "bg-orange-400/20 text-orange-300 border border-orange-400/30" },
  { name: "Marcus Aurelius", initials: "MA", role: "Moderator", color: "bg-violet-400/20 text-violet-300 border border-violet-400/30" },
  { name: "Zoe Kravitz", initials: "ZK", role: "Contributor", color: "bg-cyan-400/20 text-cyan-300 border border-cyan-400/30" },
  { name: "Arthur Pendragon", initials: "AP", role: "Founder", color: "bg-red-500/20 text-red-400 border border-red-500/30" },
  { name: "Ginevra de Benci", initials: "GB", role: "Contributor", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  { name: "Dante Alighieri", initials: "DA", role: "Expert", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
  { name: "Beatrix Kiddo", initials: "BK", role: "Contributor", color: "bg-rose-500/20 text-rose-400 border border-rose-500/30" },
  { name: "Tyler Durden", initials: "TD", role: "Contributor", color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  { name: "Bruce Wayne", initials: "BW", role: "Expert", color: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
  { name: "Selina Kyle", initials: "SK", role: "Contributor", color: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" },
  { name: "Clark Kent", initials: "CK", role: "Contributor", color: "bg-blue-600/20 text-blue-400 border border-blue-600/30" },
  { name: "Lois Lane", initials: "LL", role: "Expert", color: "bg-pink-600/20 text-pink-400 border border-pink-600/30" },
  { name: "Peter Parker", initials: "PP", role: "Contributor", color: "bg-red-600/20 text-red-400 border border-red-600/30" },
  { name: "Mary Jane", initials: "MJ", role: "Contributor", color: "bg-rose-600/20 text-rose-400 border border-rose-600/30" },
  { name: "Tony Stark", initials: "TS", role: "Founder", color: "bg-amber-600/20 text-amber-400 border border-amber-600/30" },
  { name: "Steve Rogers", initials: "SR", role: "Moderator", color: "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30" },
  { name: "Natasha Romanoff", initials: "NR", role: "Expert", color: "bg-red-700/20 text-red-400 border border-red-700/30" }
];

interface FeedReply {
  user: string;
  initials: string;
  avatarColor: string;
  content: string;
  time: string;
  role?: string;
  reactions?: Record<string, number>;
}

interface FeedItem {
  id: string;
  type: 'social' | 'question' | 'project' | 'poll' | 'link' | 'discussion';
  author: string;
  initials: string;
  avatarColor: string;
  role: string;
  time: string;
  title: string;
  content: string;
  replies: FeedReply[];
  poll?: {
    question: string;
    options: string[];
    votes: number[];
  };
  link?: string;
  socialUrl?: string;
  visualUrl?: string;
  likesCount?: number;
}

interface CommunityCategoryDetails {
  vibe: string;
  atmosphere: string;
  activeDescription: string;
  philosophy: string;
  feed: FeedItem[];
  sharedVisuals: Array<{
    title: string;
    url: string;
    author: string;
    likes: number;
  }>;
  rituals: Array<{
    title: string;
    time: string;
    desc: string;
  }>;
  playlist: string;
  latest?: {
    user: string;
    action: string;
    time: string;
  };
  activeCreators?: Array<{ name: string; initials: string; color: string; status: string; role?: string }>;
  about: {
    description: string;
    activityEvidence: string;
    trendingTopics: string[];
  };
  sisterDistricts: Array<{ name: string; category: string }>;
}

// ── HUMAN EXPERIENCE ARCHITECTURE DATA MAP ──────────────────────────────────
const CATEGORY_DETAILS: Record<string, CommunityCategoryDetails> = {
  'Design': {
    vibe: 'Minimal interfaces, typography grid setups, and late-night co-creation discussions.',
    atmosphere: 'Focused & creative',
    activeDescription: 'Design creators are testing new spatial panel animations tonight.',
    philosophy: 'A calm space where designers, creators, and engineers discuss editorial layouts, emotional interface design, typography, and motion systems.',
    feed: [
      {
        id: "d-1",
        type: 'project',
        author: "Kunal Mehta",
        initials: "KM",
        role: "Moderator",
        avatarColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
        time: "10m ago",
        title: "Continuous Layout Spacing Rules",
        content: "Working on a spatial panel UI that morphs between states based on scroll position. Here is a procedural wireframe layout for the grid scaling properties.",
        replies: [
          { user: "Elena Rostova", initials: "ER", avatarColor: "bg-teal-500/20 text-teal-400", content: "This feels extremely fluid. Are you using spring transitions?", time: "8m ago", role: "Contributor", reactions: { '👍': 8, '💡': 3 } },
          { user: "Shinichiro", initials: "S", avatarColor: "bg-rose-500/20 text-rose-450", content: "Agreed, keeping the margins completely responsive makes a huge difference.", time: "3m ago", role: "Founder", reactions: { '❤️': 5 } }
        ]
      },
      {
        id: "d-2",
        type: 'poll',
        author: "Zara Osei",
        initials: "ZO",
        role: "Contributor",
        avatarColor: "bg-amber-500/20 text-amber-400 border border-amber-500/20",
        time: "1h ago",
        title: "Layout Animation Models",
        content: "Which layout animation models feel most premium and responsive under high user interaction?",
        replies: [],
        poll: {
          question: "Best animation feedback mechanism?",
          options: ["Spring physics (dynamic damping)", "CSS cubic-bezier transitions", "Concentric orbital timelines"],
          votes: [184, 98, 45]
        }
      },
      {
        id: "d-3",
        type: 'question',
        author: "Liam O'Connor",
        initials: "LO",
        role: "Contributor",
        avatarColor: "bg-pink-400/20 text-pink-300 border border-pink-400/30",
        time: "3h ago",
        title: "Abolishing Static Canvas Grids?",
        content: "Should we push for fluid editorial layouts that completely dynamically scale depending on custom browser aspects?",
        replies: [
          { user: "Chloe Vance", initials: "CV", avatarColor: "bg-lime-500/20 text-lime-400", content: "Hard yes. Viewport scaling is the standard now.", time: "2h ago", role: "Contributor" }
        ]
      }
    ],
    sharedVisuals: [
      { title: 'Continuous Layout Concept', url: 'https://images.unsplash.com/photo-1541462608141-ad4979e408c9?w=400&h=300&fit=crop', author: 'Kunal', likes: 142 },
      { title: 'Typography System Hierarchy', url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop', author: 'Zara', likes: 98 },
      { title: 'Minimalist Switch Micro-state', url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&h=300&fit=crop', author: 'Shinichiro', likes: 184 }
    ],
    rituals: [
      { title: 'Friday showcase night', time: 'Fridays at 9:00 PM', desc: 'Share layouts in progress and receive constructive feedback.' },
      { title: 'Midnight design co-work', time: 'Daily at 12:00 AM', desc: 'Ambient background music and open workspace screen share.' }
    ],
    playlist: 'Late-night ambient design compilation',
    activeCreators: [
      { name: "Kunal Mehta", initials: "KM", color: "bg-emerald-500/20 text-emerald-450", status: "Polishing typography grid scales.", role: "Moderator" },
      { name: "Zara Osei", initials: "ZO", color: "bg-amber-500/20 text-amber-450", status: "Reviewing spatial physics damping.", role: "Contributor" },
      { name: "Elena Rostova", initials: "ER", color: "bg-teal-500/20 text-teal-450", status: "Designing vector icon sets.", role: "Contributor" },
      { name: "Shinichiro", initials: "S", color: "bg-rose-500/20 text-rose-450", status: "Writing continuous layout guide.", role: "Founder" }
    ],
    about: {
      description: "A collective dedicated to minimal interfaces, responsive layout rules, type systems, and spatial motion animations.",
      activityEvidence: "Community members shared 42 design reviews and solved 18 grid issues this week.",
      trendingTopics: ["Typography", "SpringPhysics", "ContinuousGrids", "FramerMotion"]
    },
    sisterDistricts: [
      { name: "Photography Lab", category: "Photography" },
      { name: "Generative Art Studio", category: "Art" }
    ]
  },
  'Technology': {
    vibe: 'Distributed network architectures, systems runtime security, and low-latency compilers.',
    atmosphere: 'Deep & scientific',
    activeDescription: 'Systems engineers are benchmarking compilation speeds.',
    philosophy: 'A mature space dedicated to compiler designs, low-latency replication, cryptography, and network operations.',
    feed: [
      {
        id: "t-1",
        type: 'question',
        author: "Ayla Chen",
        initials: "AC",
        role: "Founder",
        avatarColor: "bg-red-500/20 text-red-400 border border-red-500/30",
        time: "12m ago",
        title: "Event Sourcing vs CRDT Sync",
        content: "Evaluating event sourcing against CRDTs (like Automerge) for real-time document synchronization. Replaying 10 million actions on server boot is our primary lag bottleneck.",
        replies: [
          { user: "Kris Andersson", initials: "KA", avatarColor: "bg-blue-500/20 text-blue-400", content: "Snapshotting state every 10k actions is key. Reduces boot times back to under 5ms.", time: "9m ago", role: "Contributor", reactions: { '👍': 12, '💡': 6 } },
          { user: "Elena Rostova", initials: "ER", avatarColor: "bg-teal-500/20 text-teal-400", content: "Also try running compacting snapshot workers asynchronously in a Rust thread.", time: "5m ago", role: "Contributor", reactions: { '💡': 8 } }
        ]
      },
      {
        id: "t-2",
        type: 'link',
        author: "Hiroshi Tanaka",
        initials: "HT",
        role: "Expert",
        avatarColor: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/20",
        time: "40m ago",
        title: "WASM Runtime Sandbox Security Spec",
        content: "I compiled our team's checklist on securing WASM runtimes when executing untrusted third-party plug-in blocks. Links to routing, memory bounds, and spec layouts are inside.",
        link: "github.com/verlyn/wasm-sandbox-spec",
        replies: [
          { user: "Omar Farooq", initials: "OF", avatarColor: "bg-indigo-450 bg-indigo-500/20 text-indigo-300", content: "Really clean checklist. Added this to our internal RFC list.", time: "20m ago", role: "Expert" }
        ]
      },
      {
        id: "t-3",
        type: 'poll',
        author: "Raj Patel",
        initials: "RP",
        role: "Expert",
        avatarColor: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20",
        time: "2h ago",
        title: "State Sync Transport Lag",
        content: "What transport pipeline yields the lowest merge latency under high-concurrency client updates?",
        replies: [],
        poll: {
          question: "Best state sync transport model?",
          options: ["WebRTC Data Channels", "WebSockets + Protobuf schemas", "HTTP/3 Server-Sent Events"],
          votes: [120, 245, 30]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Telemetry Node Topology', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop', author: 'Ayla', likes: 92 },
      { title: 'Z-Knowledge Proof Flowchart', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop', author: 'Kris', likes: 110 }
    ],
    rituals: [
      { title: 'Weekly systems review', time: 'Thursdays at 6:00 PM', desc: 'Performance telemetry, database replication bottlenecks, and network RFCs.' }
    ],
    playlist: 'Deep focus coding beats',
    activeCreators: [
      { name: "Ayla Chen", initials: "AC", color: "bg-red-500/20 text-red-400", status: "Benchmarking state sync logs.", role: "Founder" },
      { name: "Kris Andersson", initials: "KA", color: "bg-blue-500/20 text-blue-400", status: "Optimizing database replication.", role: "Contributor" },
      { name: "Omar Farooq", initials: "OF", color: "bg-indigo-500/20 text-indigo-400", status: "Compiling sandbox security spec.", role: "Expert" }
    ],
    about: {
      description: "A collaborative hub centered on distributed networks, compiler builds, WASM virtualization, and crypto specifications.",
      activityEvidence: "Systems engineers solved 84 network bottlenecks and verified 9 specs this week.",
      trendingTopics: ["DistributedLogs", "WASM", "Replication", "CRDTs"]
    },
    sisterDistricts: [
      { name: "WASM Compiler Lab", category: "Coding" },
      { name: "Bootstrapping District", category: "Startups" }
    ]
  },
  'Anime': {
    vibe: 'Classic storyboards, paint cell composition, and retro synthesizer keys.',
    atmosphere: 'Calm & nostalgic',
    activeDescription: 'Members are analyzing storyboards from mid-90s films.',
    philosophy: 'A dedicated room for analyzing classic film techniques, hand-drawn keyframe transitions, retro synthesizers, and vintage storyboards.',
    feed: [
      {
        id: "a-1",
        type: 'question',
        author: "Luna Vasquez",
        initials: "LV",
        role: "Expert",
        avatarColor: "bg-pink-500/20 text-pink-400 border border-pink-500/20",
        time: "15m ago",
        title: "Cell Paint Texture Integrity",
        content: "Comparing vintage cel painting to modern digital rendering techniques. The organic grain of hand-mixed paint on cels feels impossible to replicate digitally.",
        replies: [
          { user: "Shinichiro", initials: "S", avatarColor: "bg-rose-500/20 text-rose-400", content: "It had weight. Digital layout is clean but lacks that physical dust and light refraction.", time: "8m ago", role: "Founder", reactions: { '👍': 14, '❤️': 9 } }
        ]
      },
      {
        id: "a-2",
        type: 'poll',
        author: "Beatrix Kiddo",
        initials: "BK",
        role: "Contributor",
        avatarColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
        time: "2h ago",
        title: "Finest cel-art era?",
        content: "Which era of hand-drawn production layout holds the best art style and color palette?",
        replies: [],
        poll: {
          question: "Peak Hand-Drawn Period?",
          options: ["Late 80s Cyberpunk Noir", "Mid 90s Space Westerns", "Early 2000s Hybrid Digital"],
          votes: [192, 114, 52]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Cyberpunk City Skyline Concept', url: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=400&h=300&fit=crop', author: 'Luna', likes: 312 },
      { title: 'Hand-drawn Background Color Key', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop', author: 'Shinichiro', likes: 190 }
    ],
    rituals: [
      { title: 'Retro showcase stream', time: 'Saturdays at 10:00 PM', desc: 'Reviewing retro storyboards, keyframe sheets, and synth loop arrangements.' }
    ],
    playlist: 'Vintage city pop & ambient loops',
    activeCreators: [
      { name: "Luna Vasquez", initials: "LV", color: "bg-pink-500/20 text-pink-400", status: "Restoring analog cels.", role: "Expert" },
      { name: "Beatrix Kiddo", initials: "BK", color: "bg-rose-500/20 text-rose-400", status: "Color key mapping.", role: "Contributor" }
    ],
    about: {
      description: "Dedicated to archiving storyboards, vintage cel compositions, retro synthesizer keys, and visual pacing drafts.",
      activityEvidence: "Members archived 34 historic storyboards and shared 12 keyframe tutorials this week.",
      trendingTopics: ["CelArt", "VintageKeyframes", "SynthPop", "StoryboardGuides"]
    },
    sisterDistricts: [
      { name: "Cinema Noir", category: "Cinema" },
      { name: "Generative Art Studio", category: "Art" }
    ]
  },
  'Music': {
    vibe: 'Analog eurorack patches, tape hiss degradation, and ambient soundscapes.',
    atmosphere: 'Muted & quiet',
    activeDescription: 'Ambient artists are sharing patch sheets tonight.',
    philosophy: 'A quiet social room for electronic artists, tape engineers, vinyl collectors, and ambient sound designers.',
    feed: [
      {
        id: "m-1",
        type: 'question',
        author: "Rohan Patel",
        initials: "RP",
        role: "Contributor",
        avatarColor: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        time: "20m ago",
        title: "Organic Tape Loop Hiss Integration",
        content: "Do you prefer recording tape loops with natural hiss left intact, or do you clean it up with filters? To me, the grain adds an organic depth plugins can't capture.",
        replies: [
          { user: "Zara Osei", initials: "ZO", avatarColor: "bg-amber-500/20 text-amber-400", content: "Absolutely leave it in. Clean digital synth loops sound sterile without background grain.", time: "12m ago", role: "Contributor", reactions: { '👍': 10, '💡': 5 } }
        ]
      },
      {
        id: "m-2",
        type: 'poll',
        author: "Yuki Sato",
        initials: "YS",
        role: "Contributor",
        avatarColor: "bg-purple-400/20 text-purple-300 border border-purple-450",
        time: "3h ago",
        title: "Best warmth recording medium?",
        content: "Where do you capture the best acoustic warmth for generative layouts?",
        replies: [],
        poll: {
          question: "Acoustic Warmth Choice?",
          options: ["Reel-to-Reel Tape Loops", "180g Heavyweight Vinyl", "Generative Digital Synthesis"],
          votes: [142, 98, 22]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Analog Eurorack Setup', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=300&fit=crop', author: 'Rohan', likes: 230 },
      { title: 'Reel-to-Reel Recorder Tape', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop', author: 'Zara', likes: 145 }
    ],
    rituals: [
      { title: 'Collaborative modular jam', time: 'Wednesdays at 9:00 PM', desc: 'Listen to vinyl submissions, patch details, and tape loop setups.' }
    ],
    playlist: 'Late-night modular tape loops',
    activeCreators: [
      { name: "Rohan Patel", initials: "RP", color: "bg-purple-500/20 text-purple-400", status: "Patching LFO parameters.", role: "Contributor" },
      { name: "Yuki Sato", initials: "YS", color: "bg-purple-400/20 text-purple-400", status: "Benchmarking tape loop filters.", role: "Contributor" }
    ],
    about: {
      description: "Electronic artists sharing eurorack modular setups, analog tape saturation tricks, and vinyl collections.",
      activityEvidence: "Music creators patched 28 new LFO layers and shared 14 recordings this week.",
      trendingTopics: ["TapeSaturation", "EurorackModular", "AmbientBeats", "VinylPressing"]
    },
    sisterDistricts: [
      { name: "Cinema Noir", category: "Cinema" },
      { name: "Photography Lab", category: "Photography" }
    ]
  },
  'Coding': {
    vibe: 'Compiler construction, lock-free queues, and virtualized runtimes.',
    atmosphere: 'Rigorous & technical',
    activeDescription: 'Developers are debugging memory leaks in WASM threads.',
    philosophy: 'A home for compiler developers, systems builders, and algorithms researchers.',
    feed: [
      {
        id: "c-1",
        type: 'project',
        author: "Kunal Mehta",
        initials: "KM",
        role: "Moderator",
        avatarColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
        time: "14m ago",
        title: "Rust Niche Optimization for Enums",
        content: "Profiling WASM AST compiler allocations. Rust's niche layout optimization reduces size footprint by 24 bytes per node in our parser queue.",
        replies: [
          { user: "Kris Andersson", initials: "KA", avatarColor: "bg-blue-500/20 text-blue-400", content: "Impressive scaling. Does it complicate AST compiler analysis though?", time: "10m ago", role: "Contributor", reactions: { '💡': 9 } }
        ]
      },
      {
        id: "c-2",
        type: 'poll',
        author: "Devon Cole",
        initials: "DC",
        role: "Contributor",
        avatarColor: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        time: "4h ago",
        title: "Concurrency Paradigm Choice",
        content: "Which model yields the lowest runtime contention under high multi-core thread load?",
        replies: [],
        poll: {
          question: "Best concurrency pattern?",
          options: ["CSP (Channels & coroutines)", "Lock-free atomic pointers", "Software Transactional Memory"],
          votes: [120, 85, 34]
        }
      }
    ],
    sharedVisuals: [
      { title: 'WASM AST Representation', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop', author: 'Kunal', likes: 150 },
      { title: 'B-Tree Node Page Layout', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop', author: 'Kris', likes: 120 }
    ],
    rituals: [
      { title: 'Weekly benchmark review', time: 'Sundays at 4:00 PM', desc: 'Analyzing allocations, runtime latency overheads, and lock contention.' }
    ],
    playlist: 'Synthesized drone ambient frequencies',
    activeCreators: [
      { name: "Kunal Mehta", initials: "KM", color: "bg-emerald-500/20 text-emerald-450", status: "Debugging memory allocations.", role: "Moderator" },
      { name: "Devon Cole", initials: "DC", color: "bg-yellow-500/20 text-yellow-450", status: "Benchmarking CSP channel threads.", role: "Contributor" }
    ],
    about: {
      description: "A server for parser design, lock-free concurrency, virtual memory virtualization, and static code generation.",
      activityEvidence: "Software builders compiled 12 open source libraries and resolved 43 compiler issues this week.",
      trendingTopics: ["RustLang", "LockFree", "Compilers", "WASMRun"]
    },
    sisterDistricts: [
      { name: "Technology Center", category: "Technology" },
      { name: "Generative Art Studio", category: "Art" }
    ]
  },
  'Startups': {
    vibe: 'Bootstrapped developer builders, landing page copy, and funnel diagnostics.',
    atmosphere: 'Pragmatic & high-velocity',
    activeDescription: 'Builders are discussing early user conversion funnels.',
    philosophy: 'A calm, execution-oriented space for single-creator systems, micro-startups, and bootstrapped products.',
    feed: [
      {
        id: "s-1",
        type: 'question',
        author: "Zara Osei",
        initials: "ZO",
        role: "Contributor",
        avatarColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        time: "20m ago",
        title: "Bypassing ORM for speed",
        content: "Skipping heavy ORMs in early MVPs and executing raw SQL scripts directly. Saved me days of debugging complex schema relations.",
        replies: [
          { user: "Ayla Chen", initials: "AC", avatarColor: "bg-red-500/20 text-red-400", content: "Yes! Do this until database load patterns force query optimization.", time: "15m ago", role: "Expert", reactions: { '👍': 14, '💡': 8 } }
        ]
      },
      {
        id: "s-2",
        type: 'poll',
        author: "Tony Stark",
        initials: "TS",
        role: "Founder",
        avatarColor: "bg-amber-600/20 text-amber-400 border border-amber-600/30",
        time: "1h ago",
        title: "Early acquisition channel?",
        content: "Where are bootstrappers finding the highest conversion early users?",
        replies: [],
        poll: {
          question: "Early User Acquisition?",
          options: ["Organic build-in-public logs", "Targeted direct outreach", "Niche developer sponsorships"],
          votes: [154, 88, 12]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Product Funnel Conversion Chart', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop', author: 'Zara', likes: 95 },
      { title: 'Database Schema Simplification', url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop', author: 'Ayla', likes: 143 }
    ],
    rituals: [
      { title: 'Friday demo hour', time: 'Fridays at 5:00 PM', desc: 'No pitch decks. Show screen recordings of working features shipped this week.' }
    ],
    playlist: 'Upbeat productive lofi focus beats',
    activeCreators: [
      { name: "Zara Osei", initials: "ZO", color: "bg-amber-500/20 text-amber-450", status: "Writing onboarding layouts.", role: "Contributor" },
      { name: "Tony Stark", initials: "TS", color: "bg-amber-600/20 text-amber-450", status: "Reviewing checkout funnels.", role: "Founder" }
    ],
    about: {
      description: "A hub for developer-builders focusing on organic traction, bootstrapping models, and shipping clean MVPs.",
      activityEvidence: "Bootstrappers launched 8 products and completed 18 conversion reviews this week.",
      trendingTopics: ["BuildInPublic", "RawSQL", "MVPSpeed", "ConversionFunnels"]
    },
    sisterDistricts: [
      { name: "Technology Center", category: "Technology" },
      { name: "Design Engineers", category: "Design" }
    ]
  },
  'Photography': {
    vibe: 'Mechanical film cameras, shadow contrast, and analog chemicals.',
    atmosphere: 'Observational & quiet',
    activeDescription: 'Photographers are discussing medium format framing tonight.',
    philosophy: 'A quiet gallery space dedicated to the art of framing, monochrome film processing, and medium-format composition.',
    feed: [
      {
        id: "p-1",
        type: 'question',
        author: "Rohan Patel",
        initials: "RP",
        role: "Contributor",
        avatarColor: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        time: "30m ago",
        title: "HC-110 Chemical Tone Curve Dev",
        content: "Testing custom Tri-X exposure curves developed in HC-110. The silver shadow depth is hard to capture using digital contrast adjustments.",
        replies: [
          { user: "Zara Osei", initials: "ZO", avatarColor: "bg-amber-500/20 text-amber-400", content: "Absolutely. Digital curves emulate highlights, but miss structural grain density.", time: "22m ago", role: "Contributor", reactions: { '👍': 12 } }
        ]
      },
      {
        id: "p-2",
        type: 'poll',
        author: "Selina Kyle",
        initials: "SK",
        role: "Contributor",
        avatarColor: "bg-zinc-500/20 text-zinc-405",
        time: "2h ago",
        title: "Preferred Film Format?",
        content: "Which film architecture offers the best creative constraint for street photography?",
        replies: [],
        poll: {
          question: "Best Street Constraint?",
          options: ["35mm Rangefinder (Fast framing)", "Medium Format (6x7 detail scale)", "Large Format (4x5 landscape blocks)"],
          votes: [142, 92, 18]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Monochrome Street Silhouette', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop', author: 'Rohan', likes: 280 },
      { title: 'Sunset Shadow Depth Study', url: 'https://images.unsplash.com/photo-1500051644406-ccffb978b9ea?w=400&h=300&fit=crop', author: 'Zara', likes: 190 }
    ],
    rituals: [
      { title: 'Weekly frame critique', time: 'Sundays at 8:00 PM', desc: 'Share a single composition from this week and discuss exposure layout.' }
    ],
    playlist: 'Nostalgic acoustic ambient recordings',
    activeCreators: [
      { name: "Rohan Patel", initials: "RP", color: "bg-purple-500/20 text-purple-400", status: "Cleaning mechanical rangefinder lenses.", role: "Contributor" },
      { name: "Selina Kyle", initials: "SK", color: "bg-zinc-500/20 text-zinc-400", status: "Scanning film negatives.", role: "Contributor" }
    ],
    about: {
      description: "A space dedicated to analog chemical development, rangefinder calibration, and high-contrast monochrome street photography.",
      activityEvidence: "Photographers processed 24 rolls of film and critiqued 48 frames this week.",
      trendingTopics: ["FilmDeveloping", "TriX", "HC110", "MediumFormat"]
    },
    sisterDistricts: [
      { name: "Cinema Noir", category: "Cinema" },
      { name: "Design Engineers", category: "Design" }
    ]
  },
  'Cinema': {
    vibe: 'Cinematography pacing, color-grading tables, and vintage anamorphic lenses.',
    atmosphere: 'Cinematic & moody',
    activeDescription: 'Cinematographers are deconstructing Tarkovsky stills.',
    philosophy: 'A moody theater lounge for film directors, cinematographers, screenwriters, and video essayists.',
    feed: [
      {
        id: "ci-1",
        type: 'question',
        author: "Shinichiro",
        initials: "S",
        role: "Founder",
        avatarColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
        time: "18m ago",
        title: "Meditation through Tarkovsky's pacing",
        content: "Deconstructing long takes in classic cinema. The pauses and quiet scenes force viewers to settle into the narrative space, unlike modern rapid-cut layouts.",
        replies: [
          { user: "Rohan Patel", initials: "RP", avatarColor: "bg-purple-500/20 text-purple-400", content: "Exactly. The silence becomes subtext. You sit with the characters.", time: "12m ago", role: "Contributor", reactions: { '💡': 12, '❤️': 8 } }
        ]
      },
      {
        id: "ci-2",
        type: 'poll',
        author: "Lois Lane",
        initials: "LL",
        role: "Expert",
        avatarColor: "bg-pink-600/20 text-pink-400 border border-pink-600/30",
        time: "3h ago",
        title: "Peak aspect ratio for framing?",
        content: "Which aspect ratio matches character depth best for character study scenes?",
        replies: [],
        poll: {
          question: "Best Aspect Ratio for Character?",
          options: ["1.33:1 (Classic Academy scale)", "1.85:1 (Flat screen standard)", "2.39:1 (Anamorphic widescreen width)"],
          votes: [88, 142, 215]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Anamorphic Lens Flare Study', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop', author: 'Shinichiro', likes: 340 },
      { title: 'Neo-Noir Shadow Contrast Frame', url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=300&fit=crop', author: 'Rohan', likes: 215 }
    ],
    rituals: [
      { title: 'Monthly film review', time: 'First Saturday at 9:00 PM', desc: 'Screening an indie classic followed by a 1-hour lighting deconstruction.' }
    ],
    playlist: 'Moody synth cinematic soundscapes',
    activeCreators: [
      { name: "Shinichiro", initials: "S", color: "bg-rose-500/20 text-rose-450", status: "Color grading in DaVinci.", role: "Founder" },
      { name: "Lois Lane", initials: "LL", color: "bg-pink-600/20 text-pink-400", status: "Editing short film screenplay.", role: "Expert" }
    ],
    about: {
      description: "Archiving screenplays, deconstructing single-source lighting setups, and comparing vintage anamorphic glass layouts.",
      activityEvidence: "Cinema members reviewed 18 screenplays and diagrammed 8 lighting set ups this week.",
      trendingTopics: ["LongTakes", "ColorGrading", "Anamorphic", "SingleSourceLight"]
    },
    sisterDistricts: [
      { name: "Photography Lab", category: "Photography" },
      { name: "Anime Classics Room", category: "Anime" }
    ]
  },
  'Writing': {
    vibe: 'Prose editing, markdown publishing setups, and typographical layouts.',
    atmosphere: 'Reflective & focused',
    activeDescription: 'Writers are sharing essay drafts and translation keys.',
    philosophy: 'A silent, distraction-free room for novelists, poets, essayists, and typographical publishers.',
    feed: [
      {
        id: "w-1",
        type: 'question',
        author: "Ayla Chen",
        initials: "AC",
        role: "Founder",
        avatarColor: "bg-red-500/20 text-red-400 border border-red-500/30",
        time: "25m ago",
        title: "Sharpening voice via adjective reduction",
        content: "Removing unnecessary adjectives makes narrative prose punchier. Has anyone built a markdown script filter to detect adjective density?",
        replies: [
          { user: "Shinichiro", initials: "S", avatarColor: "bg-rose-500/20 text-rose-400", content: "Letting verbs do the narrative heavy lifting is the best rule.", time: "20m ago", role: "Founder", reactions: { '👍': 12, '💡': 6 } }
        ]
      },
      {
        id: "w-2",
        type: 'poll',
        author: "Ginevra de Benci",
        initials: "GB",
        role: "Contributor",
        avatarColor: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        time: "2h ago",
        title: "Preferred draft font model?",
        content: "Which typeface class helps you focus most when writing rough drafts?",
        replies: [],
        poll: {
          question: "Peak Draft Font Vibe?",
          options: ["Retro Monospaced Courier", "Proportional Serif Garamond", "Minimal Monospace Sans"],
          votes: [120, 85, 94]
        }
      }
    ],
    sharedVisuals: [
      { title: 'Typewriter Draft Margin Edit', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=300&fit=crop', author: 'Ayla', likes: 112 },
      { title: 'Monospace Layout Typographic Grid', url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=300&fit=crop', author: 'Shinichiro', likes: 85 }
    ],
    rituals: [
      { title: 'Wednesday draft review', time: 'Wednesdays at 7:00 PM', desc: 'Share up to 500 words of prose in progress for line-by-line feedback.' }
    ],
    playlist: 'Quiet rainfall & vinyl hiss loops',
    activeCreators: [
      { name: "Ayla Chen", initials: "AC", color: "bg-red-500/20 text-red-400", status: "Drafting spatial computing essay.", role: "Founder" },
      { name: "Ginevra de Benci", initials: "GB", color: "bg-blue-500/20 text-blue-400", status: "Editing poetry translations.", role: "Contributor" }
    ],
    about: {
      description: "Dedicated to minimalist editing loops, custom typography scales, and distraction-free writing environments.",
      activityEvidence: "Writers critiqued 22 essay drafts and logged 45k words in shared logs this week.",
      trendingTopics: ["ProseEditing", "MonospaceGrids", "MarkdownSpec", "TypographicScales"]
    },
    sisterDistricts: [
      { name: "Design Engineers", category: "Design" },
      { name: "Cinema Noir", category: "Cinema" }
    ]
  },
  'Art': {
    vibe: 'WebGL shaders, procedural layout algorithms, and plotter print outputs.',
    atmosphere: 'Expressive & open',
    activeDescription: 'Artists are tuning WebGL raymarching code.',
    philosophy: 'A collaborative room bridging the gap between traditional painting, digital art, shaders, and generative visual code.',
    feed: [
      {
        id: "ar-1",
        type: 'question',
        author: "Kunal Mehta",
        initials: "KM",
        role: "Moderator",
        avatarColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
        time: "15m ago",
        title: "WebGL Shader Noise Texturing",
        content: "Testing fractional Brownian motion noise algorithms in GLSL fragment shaders to create organic, paper-like textures on procedural canvases.",
        replies: [
          { user: "Rohan Patel", initials: "RP", avatarColor: "bg-purple-500/20 text-purple-400", content: "Beautiful grain. Are you mapping parameters to audio frequencies?", time: "10m ago", role: "Contributor", reactions: { '🔥': 14, '💡': 9 } }
        ]
      },
      {
        id: "ar-2",
        type: 'poll',
        author: "Marcus Aurelius",
        initials: "MA",
        role: "Moderator",
        avatarColor: "bg-violet-400/20 text-violet-300 border border-violet-400/30",
        time: "2h ago",
        title: "Primary digital canvas model?",
        content: "What rendering pipeline is your primary choice for procedural visuals?",
        replies: [],
        poll: {
          question: "Peak Rendering Pipeline?",
          options: ["WebGL fragment shaders (GLSL)", "HTML Canvas API (2D Context)", "Vector SVG procedural scripts"],
          votes: [210, 115, 80]
        }
      }
    ],
    sharedVisuals: [
      { title: 'WebGL Generative Particle Field', url: 'https://images.unsplash.com/photo-1547891654-e66ed7edd96c?w=400&h=300&fit=crop', author: 'Kunal', likes: 410 },
      { title: 'Mixed Media Canvas Collage', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=300&fit=crop', author: 'Rohan', likes: 280 }
    ],
    rituals: [
      { title: 'Live coding session', time: 'Sundays at 2:00 PM', desc: 'Co-sketching hour: shader tuning and vector plotter layouts.' }
    ],
    playlist: 'Ambient textures & minimal piano loops',
    activeCreators: [
      { name: "Kunal Mehta", initials: "KM", color: "bg-emerald-500/20 text-emerald-450", status: "Tuning raymarching parameters.", role: "Moderator" },
      { name: "Marcus Aurelius", initials: "MA", color: "bg-violet-400/20 text-violet-300", status: "Calibrating vector print coordinates.", role: "Moderator" }
    ],
    about: {
      description: "A hub bridging GLSL shader layouts, modular drawings, canvas textures, and procedural coordinate scripts.",
      activityEvidence: "Artists compiled 18 WebGL shaders and plotted 12 vector layouts this week.",
      trendingTopics: ["GLSLShaders", "Raymarching", "ProceduralArt", "VectorPlotting"]
    },
    sisterDistricts: [
      { name: "Creative Coding Lab", category: "Coding" },
      { name: "Design Engineers", category: "Design" }
    ]
  }
};

const DEFAULT_CATEGORY_DETAILS = CATEGORY_DETAILS['Design'];

function getCategoryForCommunity(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('design') || n.includes('ui') || n.includes('ux') || n.includes('creative') || n.includes('aesthetics')) return 'Design';
  if (n.includes('game') || n.includes('play') || n.includes('arcade')) return 'Gaming';
  if (n.includes('anime') || n.includes('otaku') || n.includes('manga')) return 'Anime';
  if (n.includes('music') || n.includes('track') || n.includes('ambient') || n.includes('sound') || n.includes('audio')) return 'Music';
  if (n.includes('code') || n.includes('rust') || n.includes('elixir') || n.includes('dev') || n.includes('software')) return 'Coding';
  if (n.includes('tech') || n.includes('ai') || n.includes('ml') || n.includes('data')) return 'Technology';
  if (n.includes('write') || n.includes('book') || n.includes('poetry') || n.includes('lit')) return 'Writing';
  if (n.includes('photo') || n.includes('lens')) return 'Photography';
  if (n.includes('movie') || n.includes('film') || n.includes('cinema')) return 'Cinema';
  if (n.includes('fashion') || n.includes('style') || n.includes('fit')) return 'Fashion';
  if (n.includes('start') || n.includes('founder') || n.includes('saas') || n.includes('vc')) return 'Startups';
  if (n.includes('build') || n.includes('verlyn') || n.includes('core')) return 'Technology';
  return 'Design'; // default
}

const CATEGORY_THEMES: Record<string, {
  color: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  gradientFrom: string;
  gradientTo: string;
  solidBg: string;
  bullet: string;
  focusBorder: string;
  hoverBorder: string;
  textHex: string;
  bannerStyle: string;
}> = {
  'Design': {
    color: 'pink',
    accentText: 'text-pink-400',
    accentBg: 'bg-pink-500/10',
    accentBorder: 'border-pink-500/20',
    gradientFrom: 'from-pink-500/20',
    gradientTo: 'to-purple-950/20',
    solidBg: 'bg-pink-500 hover:bg-pink-600',
    bullet: 'bg-pink-500',
    focusBorder: 'focus:border-pink-500/30',
    hoverBorder: 'hover:border-pink-500/30',
    textHex: '#ec4899',
    bannerStyle: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #ec4899 100%)'
  },
  'Technology': {
    color: 'cyan',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    gradientFrom: 'from-cyan-500/20',
    gradientTo: 'to-blue-950/20',
    solidBg: 'bg-cyan-500 hover:bg-cyan-600',
    bullet: 'bg-cyan-500',
    focusBorder: 'focus:border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-500/30',
    textHex: '#06b6d4',
    bannerStyle: 'linear-gradient(135deg, #020617 0%, #172554 50%, #06b6d4 100%)'
  },
  'Anime': {
    color: 'rose',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/20',
    gradientFrom: 'from-rose-500/20',
    gradientTo: 'to-red-950/20',
    solidBg: 'bg-rose-500 hover:bg-rose-600',
    bullet: 'bg-rose-500',
    focusBorder: 'focus:border-rose-500/30',
    hoverBorder: 'hover:border-rose-500/30',
    textHex: '#f43f5e',
    bannerStyle: 'linear-gradient(135deg, #1c0d0d 0%, #2d0f0f 50%, #f43f5e 100%)'
  },
  'Music': {
    color: 'purple',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/20',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-indigo-950/20',
    solidBg: 'bg-purple-500 hover:bg-purple-600',
    bullet: 'bg-purple-500',
    focusBorder: 'focus:border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/30',
    textHex: '#a855f7',
    bannerStyle: 'linear-gradient(135deg, #180828 0%, #0f051d 50%, #a855f7 100%)'
  },
  'Coding': {
    color: 'emerald',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/20',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-950/20',
    solidBg: 'bg-emerald-500 hover:bg-emerald-600',
    bullet: 'bg-emerald-500',
    focusBorder: 'focus:border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-500/30',
    textHex: '#10b981',
    bannerStyle: 'linear-gradient(135deg, #030712 0%, #111827 50%, #10b981 100%)'
  },
  'Startups': {
    color: 'amber',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/20',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-950/20',
    solidBg: 'bg-amber-500 hover:bg-amber-600',
    bullet: 'bg-amber-500',
    focusBorder: 'focus:border-amber-500/30',
    hoverBorder: 'hover:border-amber-500/30',
    textHex: '#f59e0b',
    bannerStyle: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #f59e0b 100%)'
  },
  'Photography': {
    color: 'stone',
    accentText: 'text-stone-300',
    accentBg: 'bg-stone-500/10',
    accentBorder: 'border-stone-500/20',
    gradientFrom: 'from-stone-500/20',
    gradientTo: 'to-neutral-900/20',
    solidBg: 'bg-stone-200 hover:bg-stone-300 text-black',
    bullet: 'bg-stone-400',
    focusBorder: 'focus:border-stone-500/30',
    hoverBorder: 'hover:border-stone-500/30',
    textHex: '#78716c',
    bannerStyle: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #78716c 100%)'
  },
  'Cinema': {
    color: 'indigo',
    accentText: 'text-indigo-400',
    accentBg: 'bg-indigo-500/10',
    accentBorder: 'border-indigo-500/20',
    gradientFrom: 'from-indigo-500/20',
    gradientTo: 'to-violet-950/20',
    solidBg: 'bg-indigo-500 hover:bg-indigo-600',
    bullet: 'bg-indigo-500',
    focusBorder: 'focus:border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-500/30',
    textHex: '#6366f1',
    bannerStyle: 'linear-gradient(135deg, #090514 0%, #180f2d 50%, #6366f1 100%)'
  },
  'Writing': {
    color: 'orange',
    accentText: 'text-orange-400',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/20',
    gradientFrom: 'from-orange-500/20',
    gradientTo: 'to-amber-950/20',
    solidBg: 'bg-orange-500 hover:bg-orange-600',
    bullet: 'bg-orange-500',
    focusBorder: 'focus:border-orange-500/30',
    hoverBorder: 'hover:border-orange-500/30',
    textHex: '#f97316',
    bannerStyle: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 50%, #f97316 100%)'
  },
  'Art': {
    color: 'violet',
    accentText: 'text-violet-400',
    accentBg: 'bg-violet-500/10',
    accentBorder: 'border-violet-500/20',
    gradientFrom: 'from-violet-500/20',
    gradientTo: 'to-fuchsia-950/20',
    solidBg: 'bg-violet-500 hover:bg-violet-600',
    bullet: 'bg-violet-500',
    focusBorder: 'focus:border-violet-500/30',
    hoverBorder: 'hover:border-violet-500/30',
    textHex: '#8b5cf6',
    bannerStyle: 'linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #8b5cf6 100%)'
  }
};

const DEFAULT_THEME = CATEGORY_THEMES['Design'];

function getPlaceholderVisualUrl(title: string, category: string): string {
  const theme = CATEGORY_THEMES[category] || DEFAULT_THEME;
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  let shapes = '';
  if (seed % 3 === 0) {
    shapes = `
      <circle cx="30%" cy="30%" r="20" fill="${theme.textHex}" fill-opacity="0.15" filter="blur(8px)" />
      <circle cx="70%" cy="70%" r="35" fill="${theme.textHex}" fill-opacity="0.1" filter="blur(12px)" />
      <line x1="20%" y1="20%" x2="80%" y2="80%" stroke="${theme.textHex}" stroke-opacity="0.1" stroke-width="1" />
      <circle cx="50%" cy="50%" r="5" fill="${theme.textHex}" fill-opacity="0.5" />
    `;
  } else if (seed % 3 === 1) {
    shapes = `
      <rect x="20%" y="25%" width="50%" height="40%" rx="4" fill="none" stroke="${theme.textHex}" stroke-opacity="0.25" stroke-width="1.5" transform="rotate(15 100 100)" />
      <rect x="35%" y="35%" width="50%" height="40%" rx="4" fill="none" stroke="${theme.textHex}" stroke-opacity="0.15" stroke-width="1.5" transform="rotate(-10 150 150)" />
    `;
  } else {
    shapes = `
      <circle cx="50%" cy="50%" r="50" fill="none" stroke="${theme.textHex}" stroke-opacity="0.08" stroke-width="1" />
      <circle cx="50%" cy="50%" r="30" fill="none" stroke="${theme.textHex}" stroke-opacity="0.15" stroke-width="1.5" />
      <circle cx="50%" cy="50%" r="12" fill="none" stroke="${theme.textHex}" stroke-opacity="0.25" stroke-width="2" />
      <circle cx="71.2%" cy="50%" r="3" fill="${theme.textHex}" fill-opacity="0.8" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#0d0d10" />
    ${shapes}
    <text x="5%" y="90%" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="#ffffff" fill-opacity="0.2">${category.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function CommunitiesPage() {
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Mobile Tab Selection: 'navigator' | 'atmosphere' | 'presence'
  const [mobileTab, setMobileTab] = useState<'navigator' | 'atmosphere' | 'presence'>('navigator');

  // Interactive states
  const [dynamicCategoryDetails, setDynamicCategoryDetails] = useState(CATEGORY_DETAILS);
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  // key: `${feedItemId}:${replyIndex}`, value: emoji string the user picked
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [newPostText, setNewPostText] = useState('');
  const [postType, setPostType] = useState<'text' | 'link' | 'poll' | 'social'>('text');
  const [socialEmbedUrl, setSocialEmbedUrl] = useState('');
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDupeIdx, setPollDupeIdx] = useState<number | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [composerLink, setComposerLink] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle'|'checking'|'ok'|'bad'>('idle');
  const [composerImageName, setComposerImageName] = useState('');
  const [composerImagePreview, setComposerImagePreview] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [lastPostTime, setLastPostTime] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [postCooldownLeft, setPostCooldownLeft] = useState(0);
  const [allDbUsernames, setAllDbUsernames] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [loadingMentions, setLoadingMentions] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [userAvatarsMap, setUserAvatarsMap] = useState<Record<string, { username: string; displayName: string; avatarUrl?: string }>>({});

  // Settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);
  const [settingsCommName, setSettingsCommName] = useState('');
  const [settingsCommDesc, setSettingsCommDesc] = useState('');
  const [settingsCommPerms, setSettingsCommPerms] = useState<CommunityPermissions>(DEFAULT_PERMISSIONS);
  const [settingsCommMembers, setSettingsCommMembers] = useState<any[]>([]);

  // Post edit/delete states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostText, setEditingPostText] = useState('');

  // Collapsible Left Panel sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    featured: false,
    joined: false,
    active: false
  });

  const handlePostMessage = (
    text: string,
    image?: string,
    link?: string,
    pollOpts?: string[],
    socialUrl?: string
  ) => {
    if (!text.trim() && !image && !link && (!pollOpts || pollOpts.length === 0) && !socialUrl) return;

    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;

      let postType: FeedItem['type'] = 'discussion';
      if (socialUrl) postType = 'social';
      else if (pollOpts && pollOpts.length >= 2) postType = 'poll';
      else if (link) postType = 'link';
      else if (image) postType = 'project';

      const newFeedItem: FeedItem = {
        id: Date.now().toString(),
        type: postType,
        author: currentUser?.displayName || currentUser?.username || currentUser?.email?.split('@')[0] || 'You',
        avatarColor: 'bg-indigo-500/25 text-indigo-400 border border-indigo-500/30',
        initials: (currentUser?.displayName || currentUser?.username || 'YO').slice(0, 2).toUpperCase(),
        role: 'Contributor',
        time: '1s ago',
        title: text.trim() ? (text.length > 35 ? text.slice(0, 35) + '...' : text) : 'Quick Update',
        content: text,
        replies: [],
        visualUrl: image,
        link: link,
        socialUrl: socialUrl,
        poll: pollOpts && pollOpts.length >= 2 ? {
          question: text || "Community Poll",
          options: pollOpts,
          votes: new Array(pollOpts.length).fill(0)
        } : undefined
      };

      return {
        ...prev,
        [activeCategory]: {
          ...catData,
          feed: [newFeedItem, ...catData.feed]
        }
      };
    });

  };

  const handleReact = (feedItemId: string, replyIndex: number, emoji: string) => {
    const reactionKey = `${feedItemId}:${replyIndex}`;
    const existing = myReactions[reactionKey];
    // If user clicks the same emoji they already picked → remove it
    const isRemoving = existing === emoji;
    // If user picks a different emoji → swap
    const isSwapping = existing && existing !== emoji;

    setMyReactions(prev => {
      const next = { ...prev };
      if (isRemoving) {
        delete next[reactionKey];
      } else {
        next[reactionKey] = emoji;
      }
      return next;
    });

    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;

      const updatedFeed = catData.feed.map(item => {
        if (item.id === feedItemId) {
          const updatedReplies = item.replies.map((rep, rIdx) => {
            if (rIdx === replyIndex) {
              const currentReactions = { ...(rep.reactions || {}) };
              // Remove old emoji if swapping
              if (isSwapping && existing) {
                currentReactions[existing] = Math.max(0, (currentReactions[existing] || 0) - 1);
              }
              // Toggle target emoji
              if (isRemoving) {
                currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 0) - 1);
              } else {
                currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
              }
              return { ...rep, reactions: currentReactions };
            }
            return rep;
          });
          return { ...item, replies: updatedReplies };
        }
        return item;
      });

      return { ...prev, [activeCategory]: { ...catData, feed: updatedFeed } };
    });
  };

  const handleVote = (feedItemId: string, optionIndex: number) => {
    if (votedPolls[feedItemId] !== undefined) return;
    
    setVotedPolls(prev => ({ ...prev, [feedItemId]: optionIndex }));
    
    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;
      
      const updatedFeed = catData.feed.map(item => {
        if (item.id === feedItemId && item.poll) {
          const updatedVotes = [...item.poll.votes];
          updatedVotes[optionIndex] += 1;
          return {
            ...item,
            poll: {
              ...item.poll,
              votes: updatedVotes
            }
          };
        }
        return item;
      });

      return {
        ...prev,
        [activeCategory]: {
          ...catData,
          feed: updatedFeed
        }
      };
    });
  };

  const handlePostLike = (feedItemId: string) => {
    const isLiked = likedPosts[feedItemId];
    setLikedPosts(prev => ({ ...prev, [feedItemId]: !isLiked }));
    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;
      const updatedFeed = catData.feed.map(item => {
        if (item.id === feedItemId) {
          const currentLikes = item.likesCount || 0;
          return {
            ...item,
            likesCount: isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
          };
        }
        return item;
      });
      return { ...prev, [activeCategory]: { ...catData, feed: updatedFeed } };
    });
  };

  const handleAddReply = (feedItemId: string, text: string) => {
    if (!text.trim()) return;
    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;
      
      const updatedFeed = catData.feed.map(item => {
        if (item.id === feedItemId) {
          return {
            ...item,
            replies: [
              ...item.replies,
              {
                user: currentUser?.displayName || currentUser?.username || 'You',
                initials: (currentUser?.displayName || currentUser?.username || 'YO').slice(0, 2).toUpperCase(),
                avatarColor: 'bg-indigo-500/25 text-indigo-400 border border-indigo-500/30',
                content: text,
                time: '1s ago',
                role: 'Contributor',
                reactions: {}
              }
            ]
          };
        }
        return item;
      });
      return { ...prev, [activeCategory]: { ...catData, feed: updatedFeed } };
    });
    setReplyInputs(prev => ({ ...prev, [feedItemId]: '' }));
  };

  // Community Settings Handlers
  const handleOpenSettingsModal = async () => {
    if (!selectedCommunity) return;
    const { cleanDescription, permissions } = parsePermissions(selectedCommunity.description);
    setSettingsCommName(selectedCommunity.display_name);
    setSettingsCommDesc(cleanDescription);
    setSettingsCommPerms(permissions);
    setSettingsErr(null);
    setShowSettingsModal(true);

    setLoadingMembers(true);
    const res = await getCommunityMembers(selectedCommunity.id);
    if (res.success && res.members) {
      setSettingsCommMembers(res.members);
    }
    setLoadingMembers(false);
  };

  const handleSaveSettings = async () => {
    if (!selectedCommunity) return;
    setSavingSettings(true);
    setSettingsErr(null);

    const serializedDesc = serializePermissions(settingsCommDesc, settingsCommPerms);
    const res = await updateCommunitySettings(selectedCommunity.id, {
      displayName: settingsCommName,
      description: serializedDesc
    });

    if (res.success) {
      await fetchCommunities();
      setShowSettingsModal(false);
    } else {
      setSettingsErr(res.error || 'Failed to update community settings');
    }
    setSavingSettings(false);
  };

  const handleUpdateMemberRole = async (targetUserId: string, newRole: 'admin' | 'member') => {
    if (!selectedCommunity) return;
    
    // Prevent self-demotion
    if (targetUserId === currentUser?.id) {
      setSettingsErr("You cannot demote yourself. That would lock you out of settings.");
      return;
    }

    setSettingsCommMembers(prev => prev.map(m => m.user_id === targetUserId ? { ...m, role: newRole } : m));

    const res = await updateMemberRole(selectedCommunity.id, targetUserId, newRole);
    if (!res.success) {
      setSettingsErr(res.error || 'Failed to update member role');
      const refreshRes = await getCommunityMembers(selectedCommunity.id);
      if (refreshRes.success && refreshRes.members) {
        setSettingsCommMembers(refreshRes.members);
      }
    } else {
      await fetchCommunities();
    }
  };

  // Post edit/delete handlers
  const handleStartEditPost = (postId: string, currentContent: string) => {
    setEditingPostId(postId);
    setEditingPostText(currentContent);
  };

  const handleSaveEditPost = (postId: string) => {
    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;
      const updatedFeed = catData.feed.map(item => {
        if (item.id === postId) {
          return {
            ...item,
            content: editingPostText,
            title: editingPostText.trim() ? (editingPostText.length > 35 ? editingPostText.slice(0, 35) + '...' : editingPostText) : item.title
          };
        }
        return item;
      });
      return {
        ...prev,
        [activeCategory]: {
          ...catData,
          feed: updatedFeed
        }
      };
    });
    setEditingPostId(null);
    setEditingPostText('');
  };

  const handleDeletePost = (postId: string) => {
    setDynamicCategoryDetails(prev => {
      const catData = prev[activeCategory];
      if (!catData) return prev;
      const updatedFeed = catData.feed.filter(item => item.id !== postId);
      return {
        ...prev,
        [activeCategory]: {
          ...catData,
          feed: updatedFeed
        }
      };
    });
  };

  // Create Modal state
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [newComm, setNewComm] = useState({ name: '', displayName: '', description: '', isPrivate: false, category: 'Design' });

  // Fetch Communities
  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    const res = await getCommunities(currentUser?.id);
    if (res.success && res.communities) {
      const sorted = res.communities.sort((a: any, b: any) => {
        if (a.isJoined && !b.isJoined) return -1;
        if (!a.isJoined && b.isJoined) return 1;
        return b.member_count - a.member_count;
      });
      setCommunities(sorted);
      if (sorted.length > 0) {
        const firstUnjoined = sorted.find((c: any) => !c.isJoined);
        if (firstUnjoined) {
          setSelectedId(firstUnjoined.id);
        } else {
          setSelectedId(sorted[0].id);
        }
      }
    }
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Reset composer whenever user switches community
  useEffect(() => {
    setNewPostText('');
    setShowPoll(false);
    setShowLink(false);
    setPollOptions(['', '']);
    setPollDupeIdx(null);
    setComposerLink('');
    setLinkStatus('idle');
    if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
    setComposerImageName('');
    setComposerImagePreview('');
    setMentionQuery(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // URL validation — format only (no-cors fetch is too unreliable across sites)
  useEffect(() => {
    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    let url = composerLink.trim();
    if (!url) { setLinkStatus('idle'); return; }
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    linkDebounceRef.current = setTimeout(() => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          setLinkStatus('bad'); return;
        }
        const host = parsed.hostname;
        if (!host || host.length < 2 || !host.includes('.')) { setLinkStatus('bad'); return; }
        // Block private / internal IPs
        if (/^(localhost|127\.|0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
          setLinkStatus('bad'); return;
        }
        setLinkStatus('ok');
      } catch {
        setLinkStatus('bad');
      }
    }, 400);
  }, [composerLink]);



  // Cooldown countdown timer
  useEffect(() => {
    if (postCooldownLeft <= 0) return;
    const t = setInterval(() => setPostCooldownLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [postCooldownLeft]);



  // Sanitize content before posting (block XSS / injection)
  const sanitizeContent = (text: string): string =>
    text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '')
      .trim()
      .slice(0, 2000);

  // Detect active @mention in textarea — pass selectionStart from the event
  const handleTextareaChange = (val: string, cursorPos: number) => {
    setNewPostText(val);
    const before = val.slice(0, cursorPos);
    const match = before.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  // Apply mention selection
  const applyMention = (username: string) => {
    const cursor = composerRef.current?.selectionStart ?? newPostText.length;
    const before = newPostText.slice(0, cursor);
    const after = newPostText.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${username} `);
    const next = replaced + after;
    setNewPostText(next);
    setMentionQuery(null);
    // Restore focus + move cursor after inserted mention
    setTimeout(() => {
      composerRef.current?.focus();
      const pos = replaced.length;
      composerRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };



  // Join/Leave
  const handleJoinLeave = async (cId: string, isJoining: boolean) => {
    if (!currentUser?.id) return;
    const res = await toggleCommunityJoin(cId, currentUser.id, isJoining);
    if (res.success) {
      setCommunities(prev => prev.map(c => c.id === cId ? { 
        ...c, 
        isJoined: isJoining, 
        member_count: Math.max(0, isJoining ? c.member_count + 1 : c.member_count - 1) 
      } : c));
    }
  };

  // Create Community
  const handleCreate = async () => {
    if (!currentUser?.id) return;
    setIsCreating(true);
    setModalErr(null);
    const res = await createCommunity({ ...newComm, userId: currentUser.id });
    if (res.success) {
      setShowModal(false);
      setNewComm({ name: '', displayName: '', description: '', isPrivate: false, category: 'Design' });
      fetchCommunities();
    } else {
      setModalErr(res.error || 'Unknown error occurred');
    }
    setIsCreating(false);
  };

  // Filter Logic
  const filtered = useMemo(() => {
    return communities.filter(c => {
      const matchesSearch = c.display_name.toLowerCase().includes(search.toLowerCase()) || 
                            c.name.toLowerCase().includes(search.toLowerCase());
      if (selectedCategory === 'All') return matchesSearch;
      return matchesSearch && getCategoryForCommunity(c.display_name) === selectedCategory;
    });
  }, [communities, search, selectedCategory]);

  const selectedCommunity = useMemo(() => communities.find(c => c.id === selectedId), [communities, selectedId]);

  const { cleanDescription, permissions } = useMemo(() => {
    if (!selectedCommunity) return { cleanDescription: '', permissions: DEFAULT_PERMISSIONS };
    return parsePermissions(selectedCommunity.description);
  }, [selectedCommunity]);

  const canPost = useMemo(() => {
    if (!selectedCommunity) return false;
    return selectedCommunity.isAdmin || permissions.post === 'member';
  }, [selectedCommunity, permissions]);

  const canPostLink = useMemo(() => {
    if (!selectedCommunity) return false;
    return selectedCommunity.isAdmin || permissions.post_link === 'member';
  }, [selectedCommunity, permissions]);

  // Derived details
  const activeCategory = useMemo(() => {
    if (!selectedCommunity) return 'Design';
    return getCategoryForCommunity(selectedCommunity.display_name);
  }, [selectedCommunity]);

  const categoryDetails = useMemo(() => {
    return dynamicCategoryDetails[activeCategory] || DEFAULT_CATEGORY_DETAILS;
  }, [dynamicCategoryDetails, activeCategory]);

  // Extract mention candidates from current feed (must be after categoryDetails)
  const mentionableUsers = useMemo(() => {
    const seen = new Set<string>();
    const users: { name: string; initials: string; role?: string }[] = [];
    const addUser = (name: string, role?: string) => {
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        users.push({ name, initials: name.slice(0, 2).toUpperCase(), role });
      }
    };
    categoryDetails.feed.forEach((item: any) => {
      addUser(item.author, item.role);
      item.replies?.forEach((r: any) => addUser(r.author, r.role));
    });
    return users;
  }, [categoryDetails]);

  // Render post/reply text with coloured @mentions (must be after mentionableUsers)
  const knownUsernames = useMemo(() => {
    const set = new Set<string>();
    allDbUsernames.forEach(name => set.add(name.toLowerCase().replace(/\s+/g, '')));
    mentionableUsers.forEach(u => set.add(u.name.toLowerCase().replace(/\s+/g, '')));
    return set;
  }, [allDbUsernames, mentionableUsers]);
  const renderMentions = (text: string) => {
    if (!text?.includes('@')) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const slug = part.slice(1).toLowerCase();
        if (knownUsernames.has(slug)) {
          return (
            <Link key={i} href={`/profile/${part.slice(1)}`}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
            >{part}</Link>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Fetch all usernames from the DB on load for instant highlighting of existing users
  useEffect(() => {
    getAllUsernames().then(res => {
      if (res.success && res.usernames) {
        setAllDbUsernames(res.usernames);
      }
    }).catch(err => console.error("Failed to load usernames:", err));

    getUserAvatarsMap().then(res => {
      if (res.success && res.users) {
        const map: Record<string, { username: string; displayName: string; avatarUrl?: string }> = {};
        res.users.forEach((u: any) => {
          const usernameLower = (u.username || '').toLowerCase();
          const displayNameLower = (u.display_name || '').toLowerCase();
          const userInfo = {
            username: u.username,
            displayName: u.display_name || u.username,
            avatarUrl: u.avatar_url
          };
          if (usernameLower) map[usernameLower] = userInfo;
          if (displayNameLower) map[displayNameLower] = userInfo;
        });
        setUserAvatarsMap(map);
      }
    }).catch(err => console.error("Failed to load user avatars:", err));
  }, []);

  // Fetch mention suggestions from DB + local candidates dynamically
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionSuggestions([]);
      return;
    }

    setLoadingMentions(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await searchUsersForMention(mentionQuery);
        if (res.success && res.users) {
          // Format DB users to match our initials/name/role shape
          const formatted = res.users.map((u: any) => ({
            name: u.username,
            displayName: u.display_name,
            initials: (u.display_name || u.username).slice(0, 2).toUpperCase(),
            role: u.role || 'Contributor',
            avatar: u.avatar_url
          }));
          
          // Merge with local feed users/active creators
          const localFiltered = mentionableUsers.filter(u =>
            u.name.toLowerCase().includes(mentionQuery.toLowerCase())
          ).map(u => ({
            name: u.name,
            displayName: u.name,
            initials: u.initials,
            role: u.role,
            avatar: undefined
          }));

          // Combine and deduplicate
          const combined = [...formatted];
          localFiltered.forEach(lu => {
            if (!combined.some(u => u.name.toLowerCase() === lu.name.toLowerCase())) {
              combined.push(lu);
            }
          });

          setMentionSuggestions(combined.slice(0, 6));
        }
      } catch (err) {
        console.error("Mention search error:", err);
      } finally {
        setLoadingMentions(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [mentionQuery, mentionableUsers]);

  const pollVotes = useMemo<number[]>(() => {
    const votes: number[] = [];
    categoryDetails.feed.forEach(item => {
      if (item.type === 'poll' && item.poll?.votes) {
        votes.push(...item.poll.votes);
      }
    });
    return votes.length > 0 ? votes : [120, 85, 34];
  }, [categoryDetails]);

  const activeTheme = useMemo(() => {
    return CATEGORY_THEMES[activeCategory] || DEFAULT_THEME;
  }, [activeCategory]);

  // Grouped explorer items
  const groupedCommunities = useMemo(() => {
    const featured: any[] = [];
    const joined: any[] = [];
    const active: any[] = [];
    
    filtered.forEach((c) => {
      const seed = c.name.charCodeAt(0) + (c.name.charCodeAt(1) || 0);
      const growth = (seed % 18) + 4; // 4% to 22%
      
      const mc = c.member_count || 0;
      let online = 0;
      if (mc > 0) {
        if (mc <= 5) {
          online = Math.max(1, Math.min(mc, (seed % mc) + 1));
        } else {
          const minOnline = Math.max(1, Math.floor(mc * 0.08));
          const maxOnline = Math.floor(mc * 0.25);
          const range = Math.max(1, maxOnline - minOnline);
          online = minOnline + (seed % range);
        }
      }
      
      const enriched = {
        ...c,
        growth,
        online,
      };
      
      if (c.isJoined) {
        joined.push(enriched);
      } else if (growth >= 12 && featured.length < 3) {
        featured.push(enriched);
      } else {
        active.push(enriched);
      }
    });

    if (featured.length === 0 && active.length > 0) {
      featured.push(active.pop());
    }

    return { featured, joined, active };
  }, [filtered]);

  const toggleSection = (sec: string) => {
    setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const renderCommunityCard = (c: any) => {
    const cat = getCategoryForCommunity(c.display_name);
    const details = dynamicCategoryDetails[cat] || DEFAULT_CATEGORY_DETAILS;
    const isSelected = selectedId === c.id;
    const theme = CATEGORY_THEMES[cat] || DEFAULT_THEME;
    
    const CardContent = (
      <>
        <div className="flex items-start gap-2.5 w-full">
          <div className="relative shrink-0 mt-0.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${theme.accentBg} ${theme.accentText} border ${theme.accentBorder}`}>
              {c.display_name.slice(0, 2).toUpperCase()}
            </div>
            {c.isJoined && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#050507] rounded-full flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="font-semibold text-[11px] text-white truncate group-hover:text-neutral-200">
                {c.display_name}
              </h3>
              {c.is_private && <Lock size={8} className="text-neutral-500 shrink-0" />}
            </div>
            
            <p className="text-[10px] text-neutral-400 font-normal leading-snug mt-0.5 line-clamp-1">
              {parsePermissions(c.description).cleanDescription || details.vibe}
            </p>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-white/[0.02] w-full flex items-center justify-between text-[9px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span>{c.member_count || 1} members</span>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-400 flex items-center gap-0.5">
              <span className="w-1 h-1 bg-emerald-500 rounded-full inline-block" /> {c.online ?? 12} online
            </span>
          </div>
        </div>
      </>
    );

    if (c.isJoined) {
      return (
        <motion.div key={c.id} layout className="stagger-item">
          <button 
            type="button"
            onClick={() => {
              if (isSelected) {
                router.push(`/community/${c.name}`);
              } else {
                setSelectedId(c.id);
                setMobileTab('atmosphere');
              }
            }}
            className={clsx(
              "w-full flex flex-col p-3 rounded-xl transition-all relative border text-left group cursor-pointer",
              isSelected 
                ? "bg-[#0d0d10] border-white/[0.08] shadow-md" 
                : "bg-transparent border-transparent hover:bg-white/[0.01] hover:border-white/[0.02]"
            )}
          >
            {CardContent}
          </button>
        </motion.div>
      );
    }

    return (
      <motion.div key={c.id} layout className="stagger-item">
        <button 
          type="button" 
          onClick={() => {
            setSelectedId(c.id);
            setMobileTab('atmosphere');
          }}
          className={clsx(
            "w-full flex flex-col p-3 rounded-xl transition-all relative border text-left group",
            isSelected 
              ? "bg-[#0d0d10] border-white/[0.08] shadow-md" 
              : "bg-transparent border-transparent hover:bg-white/[0.01] hover:border-white/[0.02]"
          )}
        >
          {CardContent}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-neutral-200 bg-[#050507]">
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .shimmer-bg::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.03) 20%, rgba(255, 255, 255, 0.05) 60%, rgba(255, 255, 255, 0) 100%);
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        
        {/* ── 1. LEFT PANEL: Navigator ── */}
        <div className={clsx(
          "w-full md:w-[280px] lg:w-[300px] flex-shrink-0 flex flex-col h-full border-r border-white/[0.04] bg-[#050507] transition-all",
          mobileTab !== 'navigator' && 'hidden md:flex'
        )}>
          <div className="px-5 pt-6 pb-3 shrink-0">
            <div className="flex items-center justify-end mb-4">
              <button 
                type="button" 
                onClick={() => {
                  if ((currentUser?.followerCount ?? 0) < 250) {
                    alert(`To create a community, you must have at least 250 followers. You currently have ${currentUser?.followerCount ?? 0} followers.`);
                    return;
                  }
                  setShowModal(true);
                }} 
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.05] text-neutral-300 flex items-center justify-center active:scale-95 transition-all"
                title="Create community (Requires 250 followers)"
              >
                <Plus size={12} />
              </button>
            </div>
            
            <div className="relative group mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-655 text-neutral-500" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Find communities..." 
                className="w-full bg-[#0d0d10] border border-white/[0.04] text-[10.5px] rounded-lg py-2.5 pl-9 pr-4 focus:outline-none focus:border-white/[0.08] transition-all placeholder:text-neutral-600 text-white font-medium" 
              />
            </div>

            <div className="relative mb-2">
              <div className="scroll-area-x hide-scrollbar flex gap-4 pb-2 border-b border-white/[0.02] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={clsx(
                      "py-1 text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all relative",
                      selectedCategory === cat 
                        ? "text-white" 
                        : "text-neutral-500 hover:text-neutral-350"
                    )}
                  >
                    {cat}
                    {selectedCategory === cat && (
                      <motion.div 
                        layoutId="categoryIndicator" 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" 
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar space-y-4">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-neutral-600 size-4" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-neutral-550 text-[10px] font-bold uppercase tracking-wider text-neutral-500">No servers found</div>
            ) : (
              <div className="space-y-4">
                
                {groupedCommunities.joined.length > 0 && (
                  <div className="space-y-1.5 text-left">
                    <button 
                      type="button"
                      onClick={() => toggleSection('joined')}
                      className="w-full flex items-center justify-between text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-2 py-1 hover:text-neutral-300 transition-colors"
                    >
                      <span>Joined Servers</span>
                      <ChevronRight size={9} className={clsx("transition-transform", !collapsedSections.joined && "rotate-90")} />
                    </button>
                    
                    {!collapsedSections.joined && (
                      <div className="space-y-1 pl-1">
                        {groupedCommunities.joined.map(c => renderCommunityCard(c))}
                      </div>
                    )}
                  </div>
                )}

                {groupedCommunities.featured.length > 0 && (
                  <div className="space-y-1.5 text-left">
                    <button 
                      type="button"
                      onClick={() => toggleSection('featured')}
                      className="w-full flex items-center justify-between text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-2 py-1 hover:text-neutral-300 transition-colors"
                    >
                      <span>Explore Featured</span>
                      <ChevronRight size={9} className={clsx("transition-transform", !collapsedSections.featured && "rotate-90")} />
                    </button>
                    
                    {!collapsedSections.featured && (
                      <div className="space-y-1 pl-1">
                        {groupedCommunities.featured.map(c => renderCommunityCard(c))}
                      </div>
                    )}
                  </div>
                )}

                {groupedCommunities.active.length > 0 && (
                  <div className="space-y-1.5 text-left">
                    <button 
                      type="button"
                      onClick={() => toggleSection('active')}
                      className="w-full flex items-center justify-between text-[9px] font-bold tracking-wider text-neutral-500 uppercase px-2 py-1 hover:text-neutral-300 transition-colors"
                    >
                      <span>All Servers</span>
                      <ChevronRight size={9} className={clsx("transition-transform", !collapsedSections.active && "rotate-90")} />
                    </button>
                    
                    {!collapsedSections.active && (
                      <div className="space-y-1 pl-1">
                        {groupedCommunities.active.map(c => renderCommunityCard(c))}
                      </div>
                    )}
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>

        {/* ── 2. CENTER PANEL: Human Community Feed ── */}
        <div className={clsx(
          "flex-1 flex flex-col h-full bg-[#050507] overflow-hidden relative border-r border-white/[0.04] transition-all",
          mobileTab !== 'atmosphere' && 'hidden md:flex'
        )}>
          {selectedCommunity ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              
              {/* Community Header — clean, minimal */}
              <div className="px-6 lg:px-8 py-5 border-b border-white/[0.03] text-left relative overflow-hidden shrink-0">
                <div 
                  style={{ backgroundImage: activeTheme.bannerStyle }}
                  className="absolute inset-0 opacity-[0.04] blur-3xl scale-110 pointer-events-none"
                />

                <div className="flex items-center justify-between gap-6 relative z-10">
                  {/* Left: identity */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${activeTheme.accentBg} ${activeTheme.accentText} border ${activeTheme.accentBorder}`}>
                        {activeCategory}
                      </span>
                      {(() => {
                        const mc = selectedCommunity.member_count || 0;
                        const online = mc > 20 ? Math.floor(mc * 0.12) : null;
                        return (
                          <span className="text-[10px] text-neutral-700">
                            {mc > 0 ? `${mc.toLocaleString()} members` : ''}
                            {online ? <span className="text-emerald-700"> · {online} online</span> : null}
                          </span>
                        );
                      })()}
                    </div>
                    <h2 className="text-[20px] font-semibold tracking-tight text-white leading-tight">
                      {selectedCommunity.display_name}
                    </h2>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedCommunity.isJoined ? (
                      <>
                        <Link
                          href={`/community/${selectedCommunity.name}`}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.1] text-neutral-300 hover:text-white text-[11px] font-medium transition-all active:scale-95"
                        >
                          Enter <ExternalLink size={9} className="opacity-60" />
                        </Link>
                        {selectedCommunity.isAdmin && (
                          <button
                            type="button"
                            onClick={handleOpenSettingsModal}
                            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] text-neutral-400 hover:text-white transition-all active:scale-95"
                            title="Community Settings"
                          >
                            <Settings size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleJoinLeave(selectedCommunity.id, false)}
                          className="px-3 py-1.5 text-[11px] text-neutral-700 hover:text-neutral-500 font-medium transition-colors"
                        >
                          Leave
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinLeave(selectedCommunity.id, true)}
                        className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold text-[11px] tracking-tight active:scale-95 transition-all"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Consolidated mixed Feed */}
              <div className="p-6 lg:p-8 space-y-6 flex-1 text-left">
                
                {/* COMPOSER — unified, smart, secure */}
                {selectedCommunity.isJoined ? (
                  canPost ? (
                    <div className="relative bg-white/[0.02] border border-white/[0.04] focus-within:border-white/[0.07] rounded-2xl p-4 space-y-3 transition-all mb-6">
                      
                      {/* Post Type Selector Tabs */}
                      <div className="flex items-center gap-1 border-b border-white/5 pb-2 shrink-0">
                        {[
                          { id: 'text', label: 'Text Post' },
                          { id: 'link', label: 'Share Link' },
                          { id: 'poll', label: 'Create Poll' },
                          { id: 'social', label: 'Social Embed' }
                        ].map(tab => {
                          const isSel = postType === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setPostType(tab.id as any);
                                if (tab.id === 'poll') {
                                  setShowPoll(true);
                                  setShowLink(false);
                                } else if (tab.id === 'link') {
                                  setShowLink(true);
                                  setShowPoll(false);
                                } else {
                                  setShowPoll(false);
                                  setShowLink(false);
                                }
                              }}
                              className={clsx(
                                "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all",
                                isSel 
                                  ? "bg-white/10 text-white border border-white/5"
                                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
                              )}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Author + main text */}
                      <div className="flex items-start gap-3">
                        <img
                          src={getAvatarUrl(currentUser?.username || 'user', currentUser?.avatar)}
                          alt="Me"
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/[0.08] mt-0.5"
                        />
                        <div className="flex-1 relative">
                          <textarea
                            ref={composerRef}
                            value={newPostText}
                            onChange={(e) => handleTextareaChange(e.target.value, e.target.selectionStart)}
                            onKeyDown={e => {
                              if (mentionQuery !== null && e.key === 'Escape') { setMentionQuery(null); e.preventDefault(); }
                            }}
                            maxLength={2000}
                            placeholder="Publish an update to this community..."
                            rows={2}
                            className="w-full bg-transparent text-[12px] text-white placeholder:text-neutral-700 focus:outline-none resize-none font-normal leading-relaxed"
                          />

                          {/* @mention autocomplete dropdown */}
                          {mentionQuery !== null && (
                            <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#0a0a0c] border border-white/[0.06] rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-md">
                              {loadingMentions && mentionSuggestions.length === 0 ? (
                                <div className="p-3 text-[10px] text-neutral-500 flex items-center gap-2 font-medium">
                                  <Loader2 size={12} className="animate-spin text-neutral-400" />
                                  <span>Searching peer profiles...</span>
                                </div>
                              ) : mentionSuggestions.length > 0 ? (
                                <div className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-white/[0.02]">
                                  {mentionSuggestions.map(u => (
                                    <button
                                      key={u.name}
                                      type="button"
                                      onMouseDown={e => { e.preventDefault(); applyMention(u.name.replace(/\s+/g, '')); }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.03] transition-colors text-left"
                                    >
                                      {u.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={getAvatarUrl(u.name, u.avatar)} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/[0.08]" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center text-[9px] font-bold shrink-0">{u.initials}</div>
                                      )}
                                      <div className="min-w-0 flex-1 ml-0.5">
                                        <div className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                                          <span>{u.displayName || u.name}</span>
                                          {u.role === 'Founder' && <span className="text-[6.5px] font-extrabold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1 py-px rounded shrink-0 uppercase tracking-wide">FOUNDER</span>}
                                        </div>
                                        <div className="text-[9px] text-neutral-500 truncate font-mono">@{u.name}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 text-[10px] text-neutral-500 font-medium">No active profiles found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image preview */}
                      {composerImagePreview && (
                        <div className="ml-10 relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={composerImagePreview} alt="preview" className="max-h-40 rounded-xl object-cover border border-white/[0.06]" />
                          <button
                            type="button"
                            onClick={() => { URL.revokeObjectURL(composerImagePreview); setComposerImagePreview(''); setComposerImageName(''); }}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-black transition-colors"
                          ><X size={9} className="text-white" /></button>
                        </div>
                      )}

                      {/* Poll options */}
                      {showPoll && (
                        <div className="ml-10 space-y-1.5">
                          <div className="text-[9.5px] font-semibold text-neutral-600 uppercase tracking-wider">Poll options</div>
                          {pollOptions.map((opt, i) => {
                            const isDupe = pollDupeIdx === i;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-white/[0.1] flex items-center justify-center shrink-0 text-[8px] text-neutral-600">{i + 1}</div>
                                <input
                                  type="text"
                                  value={opt}
                                  maxLength={100}
                                  onChange={e => {
                                    const n = [...pollOptions];
                                    n[i] = e.target.value;
                                    setPollOptions(n);
                                    // Duplicate check
                                    const val = e.target.value.trim().toLowerCase();
                                    const dupeFound = val && n.some((o, j) => j !== i && o.trim().toLowerCase() === val);
                                    setPollDupeIdx(dupeFound ? i : null);
                                  }}
                                  placeholder={`Option ${i + 1}`}
                                  className={clsx(
                                    'flex-1 bg-white/[0.03] border rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-neutral-700 focus:outline-none transition-all',
                                    isDupe ? 'border-red-500/60 focus:border-red-500/80' : 'border-white/[0.05] focus:border-white/[0.12]'
                                  )}
                                />
                                {isDupe && <span className="text-[9px] text-red-400 shrink-0">Duplicate</span>}
                                {pollOptions.length > 2 && !isDupe && (
                                  <button type="button" onClick={() => { setPollOptions(p => p.filter((_, pi) => pi !== i)); setPollDupeIdx(null); }} className="text-neutral-700 hover:text-neutral-400 transition-colors"><X size={10} /></button>
                                )}
                              </div>
                            );
                          })}
                          {pollOptions.length < 5 && (
                            <button type="button" onClick={() => setPollOptions(p => [...p, ''])} className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors pl-6">+ Add option</button>
                          )}
                        </div>
                      )}

                      {/* Link input with existence check */}
                      {showLink && (
                        <div className="ml-10 space-y-1">
                          <div className="relative">
                            <input
                              type="url"
                              value={composerLink}
                              onChange={e => setComposerLink(e.target.value)}
                              placeholder="Paste a URL..."
                              className={clsx(
                                'w-full bg-white/[0.03] border rounded-lg px-3 py-1.5 pr-8 text-[11px] text-white placeholder:text-neutral-700 focus:outline-none transition-all',
                                linkStatus === 'bad' ? 'border-red-500/50' : linkStatus === 'ok' ? 'border-emerald-500/40' : 'border-white/[0.05] focus:border-white/[0.12]'
                              )}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                              {linkStatus === 'checking' && <Loader2 size={11} className="animate-spin text-neutral-500" />}
                              {linkStatus === 'ok' && <Check size={11} className="text-emerald-500" />}
                              {linkStatus === 'bad' && composerLink && <AlertCircle size={11} className="text-red-400" />}
                            </span>
                          </div>
                          {linkStatus === 'bad' && composerLink && (
                            <p className="text-[9.5px] text-red-400 pl-1">URL not reachable or invalid — double-check it</p>
                          )}
                        </div>
                      )}

                      {postType === 'social' && (
                        <div className="ml-10 space-y-2">
                          <input
                            type="url"
                            value={socialEmbedUrl}
                            onChange={e => setSocialEmbedUrl(e.target.value)}
                            placeholder="Paste Instagram, X (Twitter), Facebook, or YouTube URL..."
                            className="w-full bg-white/[0.03] border border-white/[0.05] focus:border-white/[0.12] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder:text-neutral-700 focus:outline-none transition-all"
                          />
                          {socialEmbedUrl.trim() && (
                            <div className="max-w-sm">
                              <SocialEmbedCard embed={detectPlatform(socialEmbedUrl)} compact />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Toolbar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.03]">
                        <div className="flex items-center gap-1">
                          <label className={clsx('cursor-pointer p-1.5 rounded-lg transition-all', composerImagePreview ? 'text-violet-400 bg-violet-500/10' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]')} title="Attach image">
                            <ImageIcon size={13} />
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
                              setComposerImagePreview(URL.createObjectURL(f));
                              setComposerImageName(f.name);
                            }} />
                          </label>
                          <button type="button" title="Add poll" onClick={() => setShowPoll(p => !p)} className={clsx('p-1.5 rounded-lg transition-all', showPoll ? 'text-violet-400 bg-violet-500/10' : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]')}><BarChart2 size={13} /></button>
                          <button
                            type="button"
                            title={canPostLink ? "Add link" : "Link sharing is restricted to admins"}
                            disabled={!canPostLink}
                            onClick={() => setShowLink(p => !p)}
                            className={clsx(
                              'p-1.5 rounded-lg transition-all',
                              !canPostLink
                                ? 'text-neutral-800 opacity-25 cursor-not-allowed'
                                : showLink
                                  ? 'text-violet-400 bg-violet-500/10'
                                  : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04]'
                            )}
                          >
                            <Link2 size={13} />
                          </button>
                          <button
                            type="button"
                            title="Mention"
                            onClick={() => {
                              setNewPostText(p => p + ' @');
                              setMentionQuery('');
                              setTimeout(() => {
                                composerRef.current?.focus();
                                if (composerRef.current) {
                                  const len = composerRef.current.value.length;
                                  composerRef.current.setSelectionRange(len, len);
                                }
                              }, 0);
                            }}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.04] transition-all"
                          >
                            <AtSign size={13} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                              <button
                            type="button"
                            disabled={
                              postCooldownLeft > 0 ||
                              pollDupeIdx !== null ||
                              (postType === 'link' && linkStatus === 'bad' && !!composerLink) ||
                              (postType === 'social' && !socialEmbedUrl.trim()) ||
                              (postType !== 'social' && !newPostText.trim() && !composerImagePreview && !composerLink.trim())
                            }
                            onClick={() => {
                              const safeText = sanitizeContent(newPostText);
                              const image = composerImagePreview || undefined;
                              let link = postType === 'link' && composerLink.trim() ? composerLink.trim() : undefined;
                              if (link && !/^https?:\/\//i.test(link)) {
                                link = 'https://' + link;
                              }
                              const pollOpts = postType === 'poll' ? pollOptions.filter(o => o.trim()) : undefined;
                              const social = postType === 'social' && socialEmbedUrl.trim() ? socialEmbedUrl.trim() : undefined;

                              if (!safeText && !image && !link && (!pollOpts || pollOpts.length < 2) && !social) return;

                              handlePostMessage(safeText, image, link, pollOpts, social);
                              
                              setLastPostTime(Date.now());
                              setPostCooldownLeft(15);
                              setNewPostText('');
                              
                              setComposerImagePreview('');
                              setComposerImageName('');
                              setComposerLink('');
                              setSocialEmbedUrl('');
                              setPostType('text');
                              setLinkStatus('idle');
                              setShowPoll(false);
                              setShowLink(false);
                              setPollOptions(['', '']);
                              setPollDupeIdx(null);
                              setMentionQuery(null);
                            }}
                            className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-black hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >Publish</button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="py-2.5 px-4 bg-white/[0.01] border border-white/[0.03] rounded-xl text-[10px] font-medium text-neutral-500 flex items-center gap-2 mb-4">
                      <Shield size={11} className="text-violet-400/60 shrink-0" />
                      <span>Only administrators can publish new posts. All joined members are welcome to reply.</span>
                    </div>
                  )
                ) : (
                  <div className="py-3 px-4 bg-white/[0.01] border border-white/[0.03] rounded-xl text-center text-[10px] text-neutral-550 mb-4">
                    <button onClick={() => handleJoinLeave(selectedCommunity.id, true)} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Join</button>{' '}to reply and participate.
                  </div>
                )}

                {categoryDetails.feed.map((item, idx) => {
                  const hasVotedThis = votedPolls[item.id] !== undefined;
                  const itemVotes = item.poll?.votes || [];
                  const itemTotalVotes = itemVotes.reduce((a, b) => a + b, 0);
                  const userVote = votedPolls[item.id];

                  return (
                    <div key={item.id} className="space-y-4">
                      
                      {/* FEED ITEM BLOCK */}
                      <div className={clsx(
                        "p-5 bg-gradient-to-b from-[#0a0a0d] to-[#070709] border border-white/[0.04] rounded-2xl text-left space-y-4 relative group transition-all duration-300 hover:border-white/[0.08] hover:shadow-2xl hover:shadow-violet-950/5",
                        item.type === 'question' && "border-l-2 border-l-violet-500/40"
                      )}>
                        {/* Author row */}
                        {(() => {
                          const authorKey = (item.author || '').toLowerCase();
                          const resolvedAuthor = userAvatarsMap[authorKey];
                          const authorAvatarUrl = resolvedAuthor?.avatarUrl || null;
                          const authorUsername = resolvedAuthor?.username || item.author.toLowerCase().replace(/\s+/g, '');

                          return (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5 text-[10px]">
                                <Link href={`/profile/${authorUsername}`} className="shrink-0 transition-opacity hover:opacity-85">
                                  <img 
                                    src={getAvatarUrl(authorUsername, authorAvatarUrl)} 
                                    alt={item.author} 
                                    className="w-8 h-8 rounded-full object-cover border border-white/[0.06]" 
                                  />
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link href={`/profile/${authorUsername}`} className="font-bold text-[11.5px] text-white hover:underline hover:text-neutral-250 transition-colors">
                                      {item.author}
                                    </Link>
                                    {(item.role === 'Founder' || item.role === 'Moderator') && (
                                      <span className={clsx(
                                        "text-[6.5px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded border",
                                        item.role === 'Founder' 
                                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      )}>
                                        {item.role}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-neutral-500 mt-0.5 font-medium">{item.time}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] uppercase tracking-wider font-extrabold text-neutral-500 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded-full select-none">
                                  {item.type}
                                </span>
                                {selectedCommunity.isJoined && (() => {
                                  const isMyPost = item.author === (currentUser?.displayName || currentUser?.username);
                                  const canDelete = selectedCommunity.isAdmin || permissions.remove === 'member' || isMyPost;
                                  const canEdit = isMyPost || (selectedCommunity.isAdmin && permissions.edit_post === 'admin') || permissions.edit_post === 'member';

                                  return (
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0">
                                      {canEdit && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditPost(item.id, item.content)}
                                          className="text-[9px] font-bold text-neutral-500 hover:text-white transition-colors"
                                          title="Edit post"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePost(item.id)}
                                          className="text-[9px] font-bold text-red-500 hover:text-red-400 transition-colors"
                                          title="Delete post"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Content area */}
                        <div className="space-y-1.5">
                          {editingPostId === item.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingPostText}
                                onChange={(e) => setEditingPostText(e.target.value)}
                                className="w-full bg-[#050507] border border-white/[0.08] rounded-xl py-2 px-3 text-[11px] text-white focus:outline-none focus:border-white/[0.15] transition-all resize-none min-h-[60px]"
                              />
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingPostId(null)}
                                  className="px-2.5 py-1 rounded text-[10px] text-neutral-550 text-neutral-500 hover:text-neutral-350 font-semibold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditPost(item.id)}
                                  className="px-3 py-1 bg-white text-black hover:bg-neutral-200 rounded text-[10px] font-semibold transition-all"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const cleanTitle = item.title?.replace('...', '').trim();
                                const isTitleRedundant = cleanTitle && item.content?.trim().startsWith(cleanTitle);
                                return item.title && !isTitleRedundant ? (
                                  <h4 className="text-[12.5px] font-bold text-white tracking-tight leading-snug group-hover:text-neutral-100 transition-colors">
                                    {item.title}
                                  </h4>
                                ) : null;
                              })()}
                              <p className="text-[11px] text-neutral-400 font-normal leading-relaxed whitespace-pre-wrap">
                                {renderMentions(item.content)}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Special visual panel with shimmer */}
                        {(item.visualUrl || item.type === 'project') && (
                          <div className="w-full rounded-xl overflow-hidden border border-white/[0.04] bg-[#0c0c0e] relative my-3 max-h-[300px]">
                            <img 
                              src={item.visualUrl || getPlaceholderVisualUrl(item.title, activeCategory)}
                              className="w-full h-full object-cover max-h-[300px]" 
                              alt="" 
                            />
                          </div>
                        )}

                        {/* Special Poll Interface */}
                        {item.poll && (
                          <div className="mt-3.5 p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-2">
                            <div className="text-[9.5px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Community Poll</div>
                            {item.poll.options.map((opt, oIdx) => {
                              const votes = itemVotes[oIdx] || 0;
                              const percentage = itemTotalVotes > 0 ? Math.round((votes / itemTotalVotes) * 100) : 0;
                              const currentSelected = userVote === oIdx;

                              return (
                                <div key={oIdx} className="relative w-full">
                                  {hasVotedThis ? (
                                    <div className="relative w-full bg-white/[0.01] border border-white/[0.03] rounded-lg p-2.5 flex items-center justify-between text-[10px] overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={`absolute left-0 top-0 bottom-0 ${activeTheme.accentBg} opacity-15 -z-10`}
                                        transition={{ duration: 0.6 }}
                                      />
                                      <span className={clsx("font-semibold z-10", currentSelected ? "text-white" : "text-neutral-400")}>
                                        {currentSelected && "✓ "} {opt}
                                      </span>
                                      <span className="font-bold text-neutral-500 z-10">{percentage}% ({votes})</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleVote(item.id, oIdx)}
                                      className="w-full text-left bg-transparent hover:bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] rounded-lg p-2.5 text-[10.5px] text-neutral-300 hover:text-white transition-all font-semibold"
                                    >
                                      {opt}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Social Embed Preview */}
                        {item.socialUrl && (
                          <div className="pt-1 select-none max-w-md mb-2">
                            <SocialEmbedCard embed={detectPlatform(item.socialUrl)} compact />
                          </div>
                        )}

                        {/* Special Resource link preview card */}
                        {item.link && (
                          <div className="pt-1 select-none">
                            <a 
                              href={item.link.startsWith('http') ? item.link : `https://${item.link}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="block p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] rounded-xl transition-all duration-300 group/link"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeTheme.accentBg} ${activeTheme.accentText} border ${activeTheme.accentBorder} shrink-0`}>
                                  <Link2 size={13} className="group-hover/link:rotate-45 transition-transform duration-300" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
                                    <span>{item.link.replace(/^https?:\/\//i, '').split('/')[0]}</span>
                                    <ExternalLink size={10} className="opacity-40" />
                                  </div>
                                  <p className="text-[9.5px] text-neutral-500 truncate mt-0.5 font-mono">{item.link}</p>
                                </div>
                              </div>
                            </a>
                          </div>
                        )}

                        {/* Main Post Action/Engagement Row */}
                        <div className="flex items-center gap-4 pt-2.5 border-t border-white/[0.02] text-[10.5px]">
                          {/* Heart/Like button */}
                          <button
                            type="button"
                            onClick={() => handlePostLike(item.id)}
                            className={clsx(
                              "flex items-center gap-1.5 transition-all py-1 px-2.5 rounded-full border",
                              likedPosts[item.id]
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-transparent text-neutral-500 border-transparent hover:text-neutral-350 hover:bg-white/[0.02]"
                            )}
                          >
                            <Heart size={12} className={clsx(likedPosts[item.id] && "fill-rose-400")} />
                            <span className="font-semibold">{item.likesCount || 0}</span>
                          </button>

                          {/* Comment/Reply count */}
                          <div className="flex items-center gap-1.5 text-neutral-500 py-1 px-2.5 select-none">
                            <MessageSquare size={12} />
                            <span className="font-semibold">{item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}</span>
                          </div>
                        </div>

                        {/* Thread replies list */}
                        {item.replies.length > 0 && (
                          <div className="pt-3.5 border-t border-white/[0.02] space-y-3.5">
                            {item.replies.map((rep, rIdx) => {
                              const repKey = (rep.user || '').toLowerCase();
                              const resolvedRep = userAvatarsMap[repKey];
                              const repAvatarUrl = resolvedRep?.avatarUrl || null;
                              const repUsername = resolvedRep?.username || rep.user.toLowerCase().replace(/\s+/g, '');

                              return (
                                <div key={rIdx} className="flex gap-2.5 items-start pl-2 text-left">
                                  <Link href={`/profile/${repUsername}`} className="shrink-0 mt-0.5 transition-opacity hover:opacity-85">
                                    <img 
                                      src={getAvatarUrl(repUsername, repAvatarUrl)} 
                                      alt={rep.user} 
                                      className="w-6 h-6 rounded-full object-cover border border-white/[0.05]" 
                                    />
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <Link href={`/profile/${repUsername}`} className="text-[10.5px] font-bold text-neutral-300 hover:underline hover:text-white transition-colors">
                                          {rep.user}
                                        </Link>
                                        {(rep.role === 'Founder' || rep.role === 'Moderator') && (
                                          <span className={`text-[6.5px] uppercase font-bold tracking-widest px-1 py-px rounded border ${
                                            rep.role === 'Founder' 
                                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/15' 
                                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                                          }`}>{rep.role}</span>
                                        )}
                                      </div>
                                      <span className="text-[8.5px] text-neutral-600 font-semibold">{rep.time}</span>
                                    </div>
                                    <p className="text-[10.5px] text-neutral-400 font-normal leading-normal mt-0.5">{renderMentions(rep.content)}</p>
                                    
                                    {/* Emoji React pills */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                      {(['👍', '🔥', '💡', '❤️'] as const).map(emoji => {
                                        const count = rep.reactions?.[emoji] || 0;
                                        const reactionKey = `${item.id}:${rIdx}`;
                                        const isMine = myReactions[reactionKey] === emoji;
                                        return (
                                          <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => handleReact(item.id, rIdx, emoji)}
                                            className={clsx(
                                              "px-2 py-0.5 rounded-full text-[9px] transition-all flex items-center gap-1 border",
                                              isMine
                                                ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
                                                : count > 0
                                                  ? "bg-white/[0.03] text-neutral-400 border-white/[0.06] hover:text-neutral-200"
                                                  : "bg-transparent text-neutral-700 hover:text-neutral-400 border-transparent"
                                            )}
                                          >
                                            <span>{emoji}</span>
                                            {count > 0 && <span className={clsx("font-semibold", isMine ? "text-violet-400" : "text-neutral-500")}>{count}</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Inline Reply Composer */}
                        {selectedCommunity.isJoined && (
                          <div className="pt-3 border-t border-white/[0.02] flex items-center gap-2.5 text-[11px] text-left">
                            <img
                              src={getAvatarUrl(currentUser?.username || 'user', currentUser?.avatar)}
                              alt="Me"
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/[0.08]"
                            />
                            <div className="flex-1 relative flex items-center">
                              <input
                                type="text"
                                placeholder="Write a reply..."
                                value={replyInputs[item.id] || ''}
                                onChange={e => setReplyInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && (replyInputs[item.id] || '').trim()) {
                                    handleAddReply(item.id, replyInputs[item.id] || '');
                                  }
                                }}
                                className="w-full bg-white/[0.02] border border-white/[0.04] focus:border-white/[0.08] rounded-xl py-1.5 pl-3.5 pr-10 text-[10.5px] text-white focus:outline-none transition-all placeholder:text-neutral-700"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(item.id, replyInputs[item.id] || '')}
                                disabled={!(replyInputs[item.id] || '').trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors disabled:opacity-20 disabled:hover:text-neutral-500"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>


                    </div>
                  );
                })}

                {/* Upcoming events — clean, minimal */}
                {categoryDetails.rituals && categoryDetails.rituals.length > 0 && (
                  <div className="pt-6 border-t border-white/[0.02] space-y-3">
                    <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Upcoming</span>
                    <div className="space-y-2">
                      {categoryDetails.rituals.map((rit, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.035] border border-white/[0.03] hover:border-white/[0.06] transition-all cursor-pointer group">
                          <div className="space-y-0.5 min-w-0">
                            <h5 className="text-[12px] font-semibold text-neutral-200 group-hover:text-white transition-colors leading-tight">{rit.title}</h5>
                            <p className="text-[10.5px] text-neutral-600 leading-relaxed">{rit.desc}</p>
                          </div>
                          <span className={`text-[9px] font-semibold shrink-0 mt-0.5 ${activeTheme.accentText} opacity-80`}>{rit.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* Playlist */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-700 pt-1 pl-1">
                      <Volume2 size={10} />
                      <span>{categoryDetails.playlist}</span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 p-8">
              <Compass size={32} className="mb-3 opacity-20" />
              <p className="text-xs font-semibold uppercase tracking-wider">Select a community</p>
            </div>
          )}
        </div>

        {/* ── 3. RIGHT PANEL: Content-first Sidebar ── */}
        <div className={clsx(
          "w-full md:w-[240px] lg:w-[265px] shrink-0 bg-[#050507] flex flex-col h-full transition-all border-l border-white/[0.02]",
          mobileTab !== 'presence' && 'hidden md:flex'
        )}>
          {selectedCommunity ? (
            <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar space-y-5 text-left">

              {/* Topics */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest block px-1">Topics</span>
                <div className="flex flex-wrap gap-1.5">
                  {categoryDetails.about.trendingTopics.map((topic, i) => (
                    <span key={i} className="text-[10px] bg-white/[0.03] text-neutral-400 px-2.5 py-1 rounded-full border border-white/[0.04] font-medium hover:border-white/[0.08] hover:text-neutral-200 transition-all cursor-pointer">
                      #{topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Online now */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Online now</span>
                  <span className="text-[9px] text-emerald-600 font-semibold">{categoryDetails.activeCreators?.length || 0} active</span>
                </div>
                <div className="space-y-2.5">
                  {(categoryDetails.activeCreators || []).map((user, idx) => (
                    <div key={idx} className="flex gap-2.5 items-center group cursor-pointer">
                      <div className="relative shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${user.color}`}>
                          {user.initials}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#060608]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-neutral-200 group-hover:text-white transition-colors truncate">{user.name}</span>
                          {(user.role === 'Founder' || user.role === 'Moderator') && (
                            <span className={`text-[6.5px] uppercase font-bold tracking-wider px-1 py-px rounded shrink-0 ${
                              user.role === 'Founder' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            }`}>{user.role}</span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-neutral-600 truncate">{user.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hot right now */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest block px-1">Hot right now</span>
                <div className="space-y-1.5">
                  {categoryDetails.feed.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] hover:border-white/[0.06] transition-all cursor-pointer group">
                      <p className="text-[11px] font-medium text-neutral-300 group-hover:text-white leading-snug transition-colors line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-neutral-600">
                        <span>{item.author.split(' ')[0]}</span>
                        <span>·</span>
                        <span>{item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}</span>
                        <span>·</span>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* More like this */}
              {categoryDetails.sisterDistricts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest block px-1">More like this</span>
                  <div className="space-y-1.5">
                    {categoryDetails.sisterDistricts.map((dist, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(dist.category);
                          const firstCommOfCat = communities.find(c => getCategoryForCommunity(c.display_name) === dist.category);
                          if (firstCommOfCat) setSelectedId(firstCommOfCat.id);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] hover:border-white/[0.06] text-left transition-all flex items-center justify-between group"
                      >
                        <div>
                          <span className="text-[11px] font-medium text-neutral-300 group-hover:text-white transition-colors block">{dist.name}</span>
                          <span className="text-[9px] text-neutral-600">{dist.category}</span>
                        </div>
                        <ChevronRight size={10} className="text-neutral-700 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
             </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-700 opacity-20 p-8">
              <Users size={24} />
            </div>
          )}
        </div>

      </div>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-[#050507]/95 backdrop-blur-md border-t border-white/[0.04] flex md:hidden z-[90]">
        {[
          { id: 'navigator', label: 'Navigator', icon: Compass },
          { id: 'atmosphere', label: 'Atmosphere', icon: Activity },
          { id: 'presence', label: 'Presence', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id as any)}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-widest transition-all",
                isActive ? "text-white" : "text-neutral-500"
              )}
            >
              <Icon size={14} className={isActive ? "text-white" : ""} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>



      {/* CREATION MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              className="w-full max-w-md p-6 bg-[#0d0d10] border border-white/[0.06] rounded-2xl"
            >
              <div className="flex justify-between items-center mb-5 text-left">
                <div>
                  <h3 className="text-base font-semibold text-white">Create community</h3>
                  <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">Start a new creative room</p>
                </div>
                <button type="button" onClick={() => setShowModal(false)} className="p-1 hover:bg-white/5 rounded-lg transition-all">
                  <X size={16} className="text-neutral-500 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Focus Name */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1">Community Focus (Name)</label>
                  <input 
                    value={newComm.displayName} 
                    onChange={(e) => setNewComm({
                      ...newComm, 
                      displayName: e.target.value, 
                      name: e.target.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '')
                    })} 
                    className="w-full bg-[#050507] border border-white/[0.04] rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-white/[0.08] transition-all text-white placeholder:text-neutral-600" 
                    placeholder="e.g. Design Engineers" 
                  />
                </div>
                
                {/* Identifier */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1">Unique Identifier</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 font-semibold text-xs">#</span>
                    <input 
                      disabled 
                      value={newComm.name} 
                      className="w-full bg-[#050507]/60 border border-white/[0.04] rounded-lg py-2.5 pl-8 pr-4 text-xs text-neutral-600 font-medium" 
                    />
                  </div>
                </div>

                {/* Cultural Category */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1">Cultural Category</label>
                  <select 
                    value={newComm.category}
                    onChange={(e) => setNewComm({ ...newComm, category: e.target.value })}
                    className="w-full bg-[#050507] border border-white/[0.04] rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-white/[0.08] transition-all text-white"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c} className="bg-[#0d0d10] text-white">{c}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1 block">Philosophy / Vibe Description</label>
                  <textarea 
                    value={newComm.description} 
                    onChange={(e) => setNewComm({...newComm, description: e.target.value})} 
                    className="w-full bg-[#050507] border border-white/[0.04] rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-white/[0.08] transition-all font-medium min-h-[70px] resize-none text-white placeholder:text-neutral-600" 
                    placeholder="What aesthetic rules or topics define this place?" 
                  />
                </div>

                {/* Private switch */}
                <div className="flex items-center justify-between p-3.5 bg-[#050507] border border-white/[0.04] rounded-lg">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-semibold text-white uppercase tracking-tight">Private Server</span>
                    <span className="text-[8px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5">Requires invite</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setNewComm({...newComm, isPrivate: !newComm.isPrivate})} 
                    className={clsx('w-9 h-5 px-0.5 rounded-full flex items-center transition-all', newComm.isPrivate ? 'bg-white' : 'bg-neutral-800')}
                  >
                    <motion.div animate={{ x: newComm.isPrivate ? 16 : 0 }} className="w-3.5 h-3.5 bg-[#0d0d10] rounded-full" />
                  </button>
                </div>

                {modalErr && (
                  <div className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[9px] font-semibold text-left">
                    Error: {modalErr}
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full bg-white text-black py-3 mt-2 font-semibold text-[11px] rounded-lg hover:bg-neutral-200 active:scale-98 transition-all"
                >
                  {isCreating ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 8 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              className="w-full max-w-lg p-6 bg-[#0d0d10] border border-white/[0.06] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5 shrink-0 text-left">
                <div>
                  <h3 className="text-base font-semibold text-white">Community Settings</h3>
                  <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mt-0.5">Customize access rules and manage members</p>
                </div>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="p-1 hover:bg-white/5 rounded-lg transition-all">
                  <X size={16} className="text-neutral-500 hover:text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar text-left">
                {/* 1. Community info section */}
                <div className="space-y-3 border-b border-white/[0.03] pb-5">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Community Identity</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1">Focus Name</label>
                    <input 
                      value={settingsCommName} 
                      onChange={(e) => setSettingsCommName(e.target.value)} 
                      className="w-full bg-[#050507] border border-white/[0.04] rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-white/[0.08] transition-all text-white placeholder:text-neutral-600" 
                      placeholder="Display Name" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 ml-1">Philosophy / Description</label>
                    <textarea 
                      value={settingsCommDesc} 
                      onChange={(e) => setSettingsCommDesc(e.target.value)} 
                      className="w-full bg-[#050507] border border-white/[0.04] rounded-lg py-2.5 px-4 text-xs focus:outline-none focus:border-white/[0.08] transition-all min-h-[70px] resize-none text-white placeholder:text-neutral-600" 
                      placeholder="A short tagline or description for exploration list" 
                    />
                  </div>
                </div>

                {/* 2. Custom Access Rules */}
                <div className="space-y-3 border-b border-white/[0.03] pb-5">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Customized Access Levels</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(DEFAULT_PERMISSIONS) as Array<keyof CommunityPermissions>).map((key) => {
                      const labelText = key.replace(/_/g, ' ');
                      return (
                        <div key={key} className="flex flex-col gap-1.5 p-3 bg-[#050507] border border-white/[0.03] rounded-xl">
                          <label className="text-[9.5px] font-bold text-white uppercase tracking-tight capitalize">{labelText}</label>
                          <select
                            value={settingsCommPerms[key]}
                            onChange={(e) => setSettingsCommPerms(p => ({ ...p, [key]: e.target.value as 'admin' | 'member' }))}
                            className="bg-[#0e0e12] border border-white/[0.06] rounded-lg p-1.5 text-[10px] text-neutral-300 font-semibold focus:outline-none focus:border-white/[0.12] transition-colors"
                          >
                            <option value="admin">Administrators Only</option>
                            <option value="member">Everyone (All Members)</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Members Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Community Members ({settingsCommMembers.length})</h4>
                    {loadingMembers && <Loader2 size={11} className="animate-spin text-neutral-500" />}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {settingsCommMembers.map((m) => {
                      const isMe = m.user_id === currentUser?.id;
                      return (
                        <div key={m.user_id} className="flex items-center justify-between p-2.5 bg-[#050507]/40 border border-white/[0.02] rounded-xl hover:border-white/[0.05] transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={getAvatarUrl(m.display_name, m.avatar_url)}
                              onError={(e) => { e.currentTarget.src = getAvatarUrl(m.display_name); }}
                              className="w-7 h-7 rounded-full object-cover border border-white/[0.08] shrink-0"
                              alt=""
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-white truncate block">{m.display_name} {isMe && <span className="text-[8px] text-neutral-600">(You)</span>}</span>
                              <span className="text-[9px] text-neutral-500 font-mono block">@{m.username}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              m.role === 'admin' || m.role === 'owner'
                                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15'
                                : 'bg-neutral-800 text-neutral-400 border border-neutral-700/30'
                            }`}>
                              {m.role}
                            </span>
                            
                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMemberRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                                className="px-2.5 py-1 text-[9px] font-bold rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-neutral-300 hover:text-white transition-all"
                              >
                                {m.role === 'admin' ? 'Demote' : 'Promote'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {settingsErr && (
                <div className="mt-3.5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[9px] font-semibold text-left shrink-0">
                  Error: {settingsErr}
                </div>
              )}

              <div className="mt-5 shrink-0 flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 text-[11px] font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2 bg-white text-black hover:bg-neutral-100 disabled:opacity-50 text-[11px] font-semibold rounded-lg transition-all"
                >
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
