'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, Settings, Users, ChevronLeft, Loader2, Radio, Pin, Volume2, 
  ShieldCheck, Sparkles, MessageSquare, Plus, Check, Mic, MicOff, 
  Headphones, PhoneOff, X, Compass, Info, Heart, Trash2, Forward,
  Crown, Ban, AlertTriangle, Edit3, Globe, Lock, BarChart3, UserMinus,
  RefreshCw, Shield, UserCheck, ChevronDown, Save, Eye, EyeOff, Search,
  Link as LucideLink, Palette, Play, Image, Award, VolumeX, Layout,
  Clock, Database, Languages, Key, Share2, Copy, Fingerprint,
  XCircle, ExternalLink, PinOff, ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { getAvatarUrl } from '@/lib/utils';
import { parseBio } from '@/lib/profile-metadata';

const noop = () => {};

const DEFAULT_WEBHOOKS = [
  { id: 'wh-1', name: 'GitHub Actions', channelId: '', url: 'https://api.verlyn.in/v1/webhooks/gh-deploy', format: 'json', headers: '{"Content-Type": "application/json"}', created_at: '2026-06-21' },
  { id: 'wh-2', name: 'Vercel Deployment', channelId: '', url: 'https://api.verlyn.in/v1/webhooks/vercel-prod', format: 'discord', headers: '{"X-Vercel-Signature": "sha256"}', created_at: '2026-06-24' }
];

const DEFAULT_EMOJIS = [
  { id: 'e1', name: 'verlyn_hype', url: '🔥' },
  { id: 'e2', name: 'shin_cool', url: '😎' },
  { id: 'e3', name: 'crown_gold', url: '👑' },
  { id: 'e4', name: 'party_blob', url: '🥳' },
  { id: 'e5', name: 'heart_pulse', url: '💖' }
];

const DEFAULT_BOOSTERS = [
  { id: 'b1', name: 'Lumine', date: '3 months ago' },
  { id: 'b2', name: 'Kazu', date: '2 months ago' },
  { id: 'b3', name: 'Aoi', date: '1 month ago' }
];

const DEFAULT_RULES = [
  'Be respectful and inclusive in all channels.',
  'No spamming, excessive advertising, or self-promotion.',
  'Keep content age-appropriate and follow general guidelines.',
  'Do not distribute unsafe attachments or malware.'
];

const DEFAULT_INVITES = [
  { code: 'x7Y9k2', channelId: 'general', creator: 'Shinichiro', uses: 24, maxUses: 'Unlimited', expires: 'Never' },
  { code: 'vErLyN', channelId: 'design-ideas', creator: 'Sato', uses: 104, maxUses: '500', expires: '12 days left' }
];

const DEFAULT_CUSTOM_ROLES = [
  {
    id: 'cr-1',
    name: 'Community Moderator',
    color: '#3b82f6',
    permissions: { sendMessages: true, attachFiles: true, manageChannels: false, kickMembers: true, muteMembers: true }
  },
  {
    id: 'cr-2',
    name: 'Verified User',
    color: '#10b981',
    permissions: { sendMessages: true, attachFiles: true, manageChannels: false, kickMembers: false, muteMembers: false }
  }
];

const DEFAULT_ROLE_PERMISSIONS = {
  admin: { 
    sendMessages: true, 
    attachFiles: true, 
    manageChannels: true, 
    kickMembers: true, 
    muteMembers: true,
    editMessages: true,
    deleteMessages: true,
    pinMessages: true,
    addReactions: true,
    changeNickname: true,
    manageInvites: true,
    viewAuditLogs: true,
    embedLinks: true
  },
  moderator: { 
    sendMessages: true, 
    attachFiles: true, 
    manageChannels: false, 
    kickMembers: true, 
    muteMembers: true,
    editMessages: true,
    deleteMessages: true,
    pinMessages: true,
    addReactions: true,
    changeNickname: true,
    manageInvites: false,
    viewAuditLogs: true,
    embedLinks: true
  },
  member: { 
    sendMessages: true, 
    attachFiles: true, 
    manageChannels: false, 
    kickMembers: false, 
    muteMembers: false,
    editMessages: true,
    deleteMessages: true,
    pinMessages: false,
    addReactions: true,
    changeNickname: true,
    manageInvites: false,
    viewAuditLogs: false,
    embedLinks: true
  },
  guest: { 
    sendMessages: true, 
    attachFiles: false, 
    manageChannels: false, 
    kickMembers: false, 
    muteMembers: false,
    editMessages: false,
    deleteMessages: false,
    pinMessages: false,
    addReactions: true,
    changeNickname: false,
    manageInvites: false,
    viewAuditLogs: false,
    embedLinks: true
  }
};

import { 
  getCommunityChannels, 
  getCommunityMessages, 
  sendCommunityMessage, 
  getCommunityMembers,
  markCommunityMessagesSeen,
  deleteCommunityMessageDB, 
  editCommunityMessageDB,
  reactCommunityMessageDB, 
  toggleCommunityMessagePinDB,
  getCommunityByName,
  createCommunityChannelDB,
  deleteCommunityChannelDB,
  updateCommunityChannelDB,
  updateCommunitySettings,
  updateMemberRole,
  deleteCommunity,
  toggleCommunityJoin,
  unlockChannelWithPasswordDB,
  requestChannelAccessDB,
  getUserChannelMembershipsDB,
  clearChannelMembersDB
} from '../../communities/actions';
import MessageList from '@/components/Chat/MessageList';
import ChatInput from '@/components/Chat/ChatInput';
import { ChatMessage } from '@/components/Chat/MessageItem';
import SocialEmbedCard, { detectPlatform } from '@/components/features/feed/SocialEmbedCard';

// ── Minimal Posts View ────────────────────────────────────────────────────────
function CommunityPostsView({ name, themeColor, isOwner }: { name: string; themeColor: string; isOwner: boolean }) {
  const currentUser = useAppStore(s => s.currentUser);
  const [posts, setPosts] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem(`community_posts_${name}`);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [
      {
        id: 'cp-1',
        author: 'Shinichiro',
        role: 'Founder',
        avatarUrl: null,
        time: '2 hours ago',
        title: 'Welcome to the New Core Hub',
        content: 'We have successfully upgraded the security protocol layers. Please test the new messaging lock toggles in the moderation control panel. More premium features are currently compiling.',
        likes: 24,
        comments: 5
      },
      {
        id: 'cp-2',
        author: 'Sato',
        role: 'Moderator',
        avatarUrl: null,
        time: '5 hours ago',
        title: 'Continuous compilation speeds benchmarking',
        content: 'Check out the WASM runtime performance spec telemetry logs from the GitHub webhook integrations. The response latency is down to <12ms.',
        likes: 18,
        comments: 2,
        socialUrl: 'https://twitter.com/verlyn_hq/status/17890248239012'
      }
    ];
  });

  // Creation form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSocialUrl, setEditSocialUrl] = useState('');

  const handleLike = (id: string) => {
    setPosts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p);
      localStorage.setItem(`community_posts_${name}`, JSON.stringify(next));
      return next;
    });
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost = {
      id: `cp-${Math.random().toString(36).substring(2, 9)}`,
      author: currentUser?.displayName || currentUser?.username || 'Shinichiro',
      role: isOwner ? 'Founder' : 'Moderator',
      avatarUrl: currentUser?.avatar || null,
      time: 'Just now',
      title: newTitle,
      content: newContent,
      socialUrl: newSocialUrl.trim() || undefined,
      likes: 0,
      comments: 0
    };

    const next = [newPost, ...posts];
    setPosts(next);
    localStorage.setItem(`community_posts_${name}`, JSON.stringify(next));

    // Reset fields
    setNewTitle('');
    setNewContent('');
    setNewSocialUrl('');
    setShowCreateForm(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;

    const next = posts.map(p => p.id === id ? {
      ...p,
      title: editTitle,
      content: editContent,
      socialUrl: editSocialUrl.trim() || undefined
    } : p);

    setPosts(next);
    localStorage.setItem(`community_posts_${name}`, JSON.stringify(next));
    setEditingId(null);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('Permanently delete this announcement?')) {
      const next = posts.filter(p => p.id !== id);
      setPosts(next);
      localStorage.setItem(`community_posts_${name}`, JSON.stringify(next));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-[#050508]/40 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-neutral-200">Community Overview Posts</h4>
          <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Formal announcements and highlighted projects.</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10 flex items-center justify-center gap-1.5 active:scale-95"
          >
            {showCreateForm ? <X size={12} /> : <Plus size={12} />}
            {showCreateForm ? 'Cancel' : 'New Announcement'}
          </button>
        )}
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Post Creation Form */}
        {isOwner && showCreateForm && (
          <form onSubmit={handleCreatePost} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 animate-fade-in">
            <h5 className="text-xs font-black uppercase tracking-wider text-indigo-400">New Overview Announcement</h5>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Announcement Title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                required
              />
              <textarea
                placeholder="What would you like to announce to the district?"
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                rows={4}
                className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold resize-none"
                required
              />
              <input
                type="url"
                placeholder="Optional Social Link (e.g. Twitter/X, GitHub)"
                value={newSocialUrl}
                onChange={e => setNewSocialUrl(e.target.value)}
                className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-xs font-bold text-black transition-all"
              >
                Publish Announcement
              </button>
            </div>
          </form>
        )}

        {posts.length === 0 && !showCreateForm && (
          <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-neutral-500">
            <p className="text-xs font-semibold uppercase">No overview posts yet.</p>
            {isOwner && <p className="text-[10px] mt-1">Click "New Announcement" to write the first post!</p>}
          </div>
        )}

        {posts.map(p => {
          const embed = p.socialUrl ? detectPlatform(p.socialUrl) : null;
          const isPostAuthor = isOwner; // Let the owner modify/delete any post

          return (
            <div key={p.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all duration-200 space-y-4 relative group">
              {editingId === p.id ? (
                <div className="space-y-4">
                  <h5 className="text-xs font-black uppercase tracking-wider text-indigo-400">Edit Announcement</h5>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Title"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                      required
                    />
                    <textarea
                      placeholder="Content"
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={4}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold resize-none"
                      required
                    />
                    <input
                      type="url"
                      placeholder="Optional Social Link (e.g. Twitter/X, GitHub)"
                      value={editSocialUrl}
                      onChange={e => setEditSocialUrl(e.target.value)}
                      className="w-full bg-black/45 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-400 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(p.id)}
                      className="px-5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-xs font-bold text-black transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <SafeAvatar name={p.author} size="w-7 h-7" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-200">{p.author}</span>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{p.role}</span>
                        </div>
                        <span className="text-[9px] text-neutral-600 font-semibold leading-none">{p.time}</span>
                      </div>
                    </div>

                    {isPostAuthor && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditTitle(p.title);
                            setEditContent(p.content);
                            setEditSocialUrl(p.socialUrl || '');
                          }}
                          className="w-6 h-6 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all animate-fade-in"
                          title="Edit Announcement"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(p.id)}
                          className="w-6 h-6 rounded-lg hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition-all animate-fade-in"
                          title="Delete Announcement"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wide">{p.title}</h5>
                    <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold whitespace-pre-wrap">{p.content}</p>
                  </div>

                  {embed && (
                    <div className="mt-2 max-w-md">
                      <SocialEmbedCard embed={embed} compact />
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-white/[0.03] text-[10px] font-bold text-neutral-500">
                    <button 
                      onClick={() => handleLike(p.id)}
                      className={clsx(
                        "flex items-center gap-1.5 transition-colors",
                        p.liked ? "text-rose-400" : "hover:text-neutral-300 text-neutral-500"
                      )}
                    >
                      <Heart size={12} className={p.liked ? "fill-rose-400/20" : ""} />
                      {p.likes} Likes
                    </button>
                    <div className="flex items-center gap-1.5 select-none">
                      <MessageSquare size={12} />
                      {p.comments} Comments
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Minimal About View ────────────────────────────────────────────────────────
function CommunityAboutView({ 
  community, 
  membersCount, 
  onlineCount, 
  rules, 
  boostsCount, 
  activeLevel, 
  themeColor 
}: { 
  community: any; 
  membersCount: number; 
  onlineCount: number; 
  rules: string[]; 
  boostsCount: number; 
  activeLevel: number; 
  themeColor: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-[#050508]/40">
      <div className="border-b border-white/5 pb-4">
        <h4 className="text-sm font-black uppercase tracking-wider text-neutral-200">About District</h4>
        <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Philosophy, telemetry stats, and guidelines.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 max-w-4xl">
        {/* Left: Info card & Rules (7/12) */}
        <div className="col-span-12 md:col-span-7 space-y-5">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Community Description</h5>
            <p className="text-[11px] text-neutral-300 leading-relaxed font-semibold">
              {community?.description?.split('||')[0]?.trim() || 'No description provided.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Community Guidelines</h5>
            {rules && rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((r, i) => (
                  <div key={i} className="flex gap-3 items-start text-[11px] text-neutral-300 font-semibold">
                    <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-neutral-400 shrink-0 mt-0.5">{i+1}</span>
                    <p className="leading-relaxed pt-0.5">{r}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-neutral-500 italic">No formal rules published yet.</p>
            )}
          </div>
        </div>

        {/* Right: Telemetry Stats & Boost status (5/12) */}
        <div className="col-span-12 md:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telemetry Status</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl text-center">
                <p className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">Members</p>
                <p className="text-lg font-black text-white mt-1">{membersCount}</p>
              </div>
              <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl text-center">
                <p className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">Active Online</p>
                <p className="text-lg font-black text-emerald-400 mt-1">{onlineCount}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-neutral-500">
              <span>Security Rating</span>
              <span className="text-indigo-400">A+ Legacy Secured</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Server Boosts</h5>
              <span className="text-[10px] font-mono text-fuchsia-400 font-bold">{boostsCount} Boosts</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-neutral-400">
                <span>Current Boost Level</span>
                <span className="text-fuchsia-400">Level {activeLevel}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500" 
                  style={{ width: `${Math.min(100, (boostsCount / 20) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function groupReactions(rawReactions: any[], currentUserId?: string) {
   const map: Record<string, { emoji: string; count: number; reacted: boolean; userIds: string[] }> = {};
   rawReactions.forEach(r => {
      if (!map[r.emoji]) {
         map[r.emoji] = { emoji: r.emoji, count: 0, reacted: false, userIds: [] };
      }
      map[r.emoji].count++;
      map[r.emoji].userIds.push(r.user_id);
      if (r.user_id === currentUserId) {
         map[r.emoji].reacted = true;
      }
   });
   return Object.values(map);
}

function enforceMinChannelName(name: string): string {
  let clean = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
  if (clean.length > 0 && clean.length < 6) {
    if (!clean.endsWith('-com')) {
      clean = clean + '-com';
    }
    while (clean.length < 6) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
      if (clean.endsWith('-com')) {
        const idx = clean.indexOf('-com');
        clean = clean.slice(0, idx) + randomChar + '-com';
      } else {
        clean += randomChar;
      }
    }
  }
  return clean;
}

function getMemberRoleBadge(displayName: string) {
  const name = displayName.toLowerCase();
  if (name.includes("shinichiro") || name.includes("admin") || name.includes("shaya") || name.includes("staff")) {
    return { label: "STAFF", color: "bg-red-500/10 text-red-400 border-red-500/20" };
  } else if (name.includes("sato") || name.includes("aoi") || name.includes("mod") || name.includes("verlyn")) {
    return { label: "MODERATOR", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  } else if (name.includes("lumine") || name.includes("kazu") || name.includes("member")) {
    return { label: "BOOSTER", color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" };
  }
  
  // Dynamic but deterministic role assignment for other members
  const hash = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  if (hash % 5 === 0) {
    return { label: "BOOSTER", color: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" };
  }
  return { label: "MEMBER", color: "bg-white/5 text-neutral-400 border-white/5" };
}

function AmbientMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dynamic blurred mesh gradient blobs */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px] animate-pulse"
        style={{ animationDuration: "12s" }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-500/10 blur-[130px] animate-pulse"
        style={{ animationDuration: "18s" }}
      />
      <div 
        className="absolute top-[30%] right-[20%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px]"
      />
      
      {/* High-end tech grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)`,
          backgroundSize: "24px 24px"
        }}
      />
      {/* Subtle glass grid lines */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "120px 120px"
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/80 via-transparent to-[#050508]/40" />
    </div>
  );
}

function SafeAvatar({ name, avatarUrl, size = "w-7 h-7" }: { name: string; avatarUrl?: string | null; size?: string }) {
  const [failed, setFailed] = useState(false);
  const normalizedName = (name || "User").toLowerCase();

  const isSimulated = normalizedName.includes("shinichiro") || 
                      normalizedName.includes("sato") || 
                      normalizedName.includes("aoi") || 
                      normalizedName.includes("lumine") || 
                      normalizedName.includes("kazu") || 
                      normalizedName.includes("bot") || 
                      normalizedName.includes("verlyn") || 
                      avatarUrl?.includes("unsplash.com");

  // Determine fallback CSS styles based on roles/names
  let gradientClass = "from-neutral-800/40 to-neutral-900/40 border-white/[0.08] text-neutral-400";
  let IconComponent = null;

  if (normalizedName.includes("shinichiro") || normalizedName.includes("admin")) {
    gradientClass = "from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400";
    IconComponent = ShieldCheck;
  } else if (normalizedName.includes("sato") || normalizedName.includes("aoi") || normalizedName.includes("mod")) {
    gradientClass = "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400";
    IconComponent = ShieldCheck;
  } else if (normalizedName.includes("lumine") || normalizedName.includes("kazu") || normalizedName.includes("booster")) {
    gradientClass = "from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/30 text-fuchsia-400";
    IconComponent = Sparkles;
  } else if (normalizedName.includes("bot") || normalizedName.includes("verlyn")) {
    gradientClass = "from-violet-500/20 to-indigo-500/10 border-violet-500/30 text-violet-400";
    IconComponent = Sparkles;
  }

  const initials = (name || "U").trim().charAt(0).toUpperCase();
  const isSmall = size.includes("5.5") || size.includes("5") || size.includes("6");
  const iconSize = isSmall ? 10 : 13;

  const isDefaultAvatar = !avatarUrl || 
    avatarUrl === 'null' || 
    avatarUrl === 'undefined' || 
    avatarUrl.trim() === '' || 
    avatarUrl.toLowerCase().includes('placeholder') || 
    avatarUrl.toLowerCase().includes('default') || 
    avatarUrl.toLowerCase().includes('silhouette');

  if (!isDefaultAvatar && avatarUrl && !failed && !isSimulated) {
    return (
      <img 
        src={avatarUrl} 
        onError={() => setFailed(true)}
        className={clsx(size, "rounded-full object-cover ring-1 ring-white/10 shrink-0")} 
        alt={name} 
      />
    );
  }

  return (
    <div className={clsx(
      size,
      "rounded-full bg-gradient-to-br border flex items-center justify-center font-bold text-xs select-none shadow-inner shrink-0",
      gradientClass
    )}>
      {IconComponent ? <IconComponent size={iconSize} className="opacity-95" /> : initials}
    </div>
  );
}

function MembersPanel({ 
  members, 
  onlineUsers,
  onMemberClick,
  loading = false
}: { 
  members: any[]; 
  onlineUsers: Set<string>;
  onMemberClick: (member: any, event: React.MouseEvent) => void;
  loading?: boolean;
}) {
  // Merge database members with simulated fallback members for a rich community experience
  const allMembers = useMemo(() => {
    const defaultList = [
      { id: "sim-1", user_id: "sim-user-1", display_name: "Shinichiro", avatar_url: null },
      { id: "sim-2", user_id: "sim-user-2", display_name: "Sato", avatar_url: null },
      { id: "sim-3", user_id: "sim-user-3", display_name: "Aoi", avatar_url: null },
      { id: "sim-4", user_id: "sim-user-4", display_name: "Lumine", avatar_url: null },
      { id: "sim-5", user_id: "sim-user-5", display_name: "Kazu", avatar_url: null },
    ];
    
    // Start with database members (robust fallback to empty array)
    const list = Array.isArray(members) ? [...members] : [];
    
    // Add default members if they are not already in the list by display_name
    defaultList.forEach(dm => {
      if (!list.some(m => m.display_name?.toLowerCase() === dm.display_name.toLowerCase())) {
        list.push(dm);
      }
    });
    
    return list;
  }, [members]);

  const onlineMembers = allMembers.filter(m => onlineUsers.has(m.user_id) || m.user_id?.startsWith("sim-user-"));
  const offlineMembers = allMembers.filter(m => !onlineUsers.has(m.user_id) && !m.user_id?.startsWith("sim-user-"));

  // Categorize online members
  const staff = onlineMembers.filter(m => {
    const role = getMemberRoleBadge(m.display_name);
    return role.label === "STAFF" || role.label === "MODERATOR";
  });
  const boosters = onlineMembers.filter(m => {
    const role = getMemberRoleBadge(m.display_name);
    return role.label === "BOOSTER";
  });
  const standardOnline = onlineMembers.filter(m => {
    const role = getMemberRoleBadge(m.display_name);
    return role.label !== "STAFF" && role.label !== "MODERATOR" && role.label !== "BOOSTER";
  });

  return (
    <div className="w-60 flex-shrink-0 bg-[#07070b]/60 border-l border-white/[0.04] backdrop-blur-3xl flex flex-col h-full hidden xl:flex z-10 select-none">
      <div className="h-16 flex items-center px-4 border-b border-white/[0.04] shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <Users size={13} className="text-neutral-400" /> Server Members
        </span>
      </div>
      <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
        
        {/* Render members list */}
        {loading && (!members || members.length === 0) ? (
          <div className="space-y-4">
            <div className="animate-pulse flex items-center gap-3 p-1.5">
              <div className="w-7 h-7 bg-white/5 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-white/10 rounded w-2/3" />
                <div className="h-2 bg-white/5 rounded w-1/3" />
              </div>
            </div>
            <div className="animate-pulse flex items-center gap-3 p-1.5">
              <div className="w-7 h-7 bg-white/5 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-white/10 rounded w-1/2" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Staff Section */}
            {staff.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-1 flex items-center gap-1.5">
                  <span>Admins & Staff</span>
                  <span className="text-[8px] px-1.5 py-0.2 bg-white/5 rounded text-neutral-400 font-bold">{staff.length}</span>
                </h4>
                <div className="space-y-1">
                  {staff.map((m) => {
                    const role = getMemberRoleBadge(m.display_name);
                    return (
                      <button 
                        type="button"
                        key={m.user_id ?? m.id} 
                        onClick={(e) => onMemberClick(m, e)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-white/[0.04] active:bg-white/[0.02] rounded-xl cursor-pointer transition-all duration-200 text-left group hover:translate-x-0.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <SafeAvatar name={m.display_name} avatarUrl={m.avatar_url} size="w-7 h-7" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#07070b] ring-1 ring-emerald-500/30 animate-pulse" />
                          </div>
                          <span className="text-xs font-semibold text-neutral-300 truncate group-hover:text-white transition-colors duration-200">{m.display_name}</span>
                        </div>
                        <span className={clsx("text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-full uppercase border shrink-0 select-none transition-all duration-200", role.color)}>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Boosters Section */}
            {boosters.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-1 flex items-center gap-1.5">
                  <span>Boosters</span>
                  <span className="text-[8px] px-1.5 py-0.2 bg-white/5 rounded text-neutral-400 font-bold">{boosters.length}</span>
                </h4>
                <div className="space-y-1">
                  {boosters.map((m) => {
                    return (
                      <button 
                        type="button"
                        key={m.user_id ?? m.id} 
                        onClick={(e) => onMemberClick(m, e)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-white/[0.04] active:bg-white/[0.02] rounded-xl cursor-pointer transition-all duration-200 text-left group hover:translate-x-0.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <SafeAvatar name={m.display_name} avatarUrl={m.avatar_url} size="w-7 h-7" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#07070b] ring-1 ring-emerald-500/30 animate-pulse" />
                          </div>
                          <span className="text-xs font-semibold text-neutral-300 truncate group-hover:text-white transition-colors duration-200">{m.display_name}</span>
                        </div>
                        <span className="text-[8px] font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 shrink-0 select-none flex items-center gap-0.5">💎 BOOSTER</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Online Section */}
            {standardOnline.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-1 flex items-center gap-1.5">
                  <span>Online Members</span>
                  <span className="text-[8px] px-1.5 py-0.2 bg-white/5 rounded text-neutral-400 font-bold">{standardOnline.length}</span>
                </h4>
                <div className="space-y-1">
                  {standardOnline.map((m) => (
                    <button 
                      type="button"
                      key={m.user_id ?? m.id} 
                      onClick={(e) => onMemberClick(m, e)}
                      className="w-full flex items-center gap-2.5 p-1.5 hover:bg-white/[0.04] active:bg-white/[0.02] rounded-xl cursor-pointer transition-all duration-200 text-left group hover:translate-x-0.5"
                    >
                      <div className="relative shrink-0">
                        <SafeAvatar name={m.display_name} avatarUrl={m.avatar_url} size="w-7 h-7" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#07070b] ring-1 ring-emerald-500/30 animate-pulse" />
                      </div>
                      <span className="text-xs font-semibold text-neutral-300 truncate group-hover:text-white transition-colors duration-200">{m.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Section */}
            {offlineMembers.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5 px-1 flex items-center gap-1.5">
                  <span>Offline</span>
                  <span className="text-[8px] px-1.5 py-0.2 bg-white/5 rounded text-neutral-400 font-bold">{offlineMembers.length}</span>
                </h4>
                <div className="space-y-1">
                  {offlineMembers.map((m) => (
                    <button 
                      type="button"
                      key={`off-${m.user_id || m.id}`} 
                      onClick={(e) => onMemberClick(m, e)}
                      className="w-full flex items-center gap-2.5 p-1.5 hover:bg-white/[0.03] active:bg-white/[0.01] rounded-xl cursor-pointer transition-all duration-200 text-left group opacity-55 hover:opacity-100 hover:translate-x-0.5"
                    >
                      <SafeAvatar name={m.display_name} avatarUrl={m.avatar_url} size="w-7 h-7" />
                      <span className="text-xs font-medium text-neutral-400 truncate group-hover:text-neutral-200 transition-colors duration-200">{m.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return "";
  }
};

type OwnerTab = 
  | 'overview' 
  | 'members' 
  | 'roles'
  | 'channels' 
  | 'moderation' 
  | 'integrations' 
  | 'boosts' 
  | 'onboarding' 
  | 'emojis'
  | 'invites'
  | 'branding' 
  | 'danger';

type AuditLogEntry = {
  id: string;
  time: string;
  type: 'settings' | 'channel' | 'role' | 'moderation' | 'theme' | 'security' | 'webhook' | 'boost' | 'emoji' | 'invite';
  desc: string;
  actor: string;
};

type BannedUser = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  banned_at: string;
};

type Webhook = {
  id: string;
  name: string;
  channelId: string;
  url: string;
  format: 'discord' | 'slack' | 'json';
  headers: string;
  created_at: string;
};

type ServerEmoji = {
  id: string;
  name: string;
  url: string;
};

type InviteLink = {
  code: string;
  channelId: string;
  creator: string;
  uses: number;
  maxUses: string; // 'Unlimited' or number
  expires: string;
};

type CustomRole = {
  id: string;
  name: string;
  color: string;
  permissions: {
    sendMessages: boolean;
    attachFiles: boolean;
    manageChannels: boolean;
    kickMembers: boolean;
    muteMembers: boolean;
  }
};

// SVG Curve helper for analytics inside the panel
function AnalyticsChart({ data, color, title, unit, range }: { data: number[], color: string, title: string, unit: string, range: '7d' | '30d' | '90d' }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  const width = 360;
  const height = 110;
  const padding = 16;

  // Scale data based on range selection
  const rangeMultiplier = range === '90d' ? 4.5 : range === '30d' ? 2.1 : 1.0;
  const scaledData = data.map(v => Math.round(v * rangeMultiplier));
  
  const points = scaledData.map((val, idx) => {
    const x = padding + (idx / (scaledData.length - 1)) * (width - padding * 2);
    const maxVal = Math.max(...scaledData, 10);
    const y = height - padding - (val / maxVal) * (height - padding * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - clientX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    setHoveredIndex(closestIdx);
    setHoverPos({ x: points[closestIdx].x, y: points[closestIdx].y });
  };

  const labelsMap = {
    '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    '30d': ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7'],
    '90d': ['Apr 1', 'Apr 15', 'May 1', 'May 15', 'Jun 1', 'Jun 15', 'Jun 25']
  };

  const currentLabels = labelsMap[range];

  return (
    <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex flex-col relative overflow-hidden group">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-extrabold text-neutral-300 bg-white/5 px-2 py-0.5 rounded-md">
          Avg: {Math.round(scaledData.reduce((a,b) => a+b, 0) / scaledData.length)}{unit}
        </span>
      </div>
      
      <div className="relative w-full h-[110px] cursor-crosshair">
        <svg 
          ref={svgRef}
          className="w-full h-full"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3,3" />

          <path d={areaD} fill={`url(#grad-${title})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          
          {points.map((p, idx) => (
            <circle 
              key={idx} 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIndex === idx ? 4 : 2} 
              fill={hoveredIndex === idx ? '#fff' : color} 
              stroke={color}
              strokeWidth={hoveredIndex === idx ? 2 : 0}
              style={{ transition: 'r 0.1s, fill 0.1s' }}
            />
          ))}

          {hoveredIndex !== null && (
            <line 
              x1={hoverPos.x} 
              y1={padding} 
              x2={hoverPos.x} 
              y2={height - padding} 
              stroke="rgba(255,255,255,0.12)" 
              strokeWidth="1" 
              strokeDasharray="2,2" 
            />
          )}
        </svg>

        {hoveredIndex !== null && (
          <div 
            className="absolute z-10 px-2 py-1 bg-[#09090d] border border-white/10 rounded-lg shadow-xl pointer-events-none flex flex-col items-center"
            style={{ 
              left: `${(hoverPos.x / width) * 100}%`, 
              top: `${(hoverPos.y / height) * 100 - 32}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '9px',
              fontFamily: 'monospace'
            }}
          >
            <span className="text-[8px] text-neutral-500 font-bold uppercase">{currentLabels[hoveredIndex]}</span>
            <span className="text-white font-extrabold">{points[hoveredIndex].val}{unit}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center px-4 mt-1 select-none">
        {currentLabels.map((d, idx) => (
          <span key={d} className={`text-[8px] font-bold ${hoveredIndex === idx ? 'text-white' : 'text-neutral-600'} transition-colors`}>{d}</span>
        ))}
      </div>
    </div>
  );
}

const BOOST_LEVELS = [
  {
    level: 1,
    req: 1,
    perks: [
      { iconName: 'shield', text: "ZK-Proof Badges for verified member handles" },
      { iconName: 'lock', text: "Quantum-Resistant double-encrypted chats" },
      { iconName: 'clock', text: "Ephemeral Direct Message auto-destruct" },
      { iconName: 'link', text: "1 Custom Node cryptographic signature" }
    ]
  },
  {
    level: 2,
    req: 2,
    perks: [
      { iconName: 'users', text: "Advanced ZK-identity proof parameters" },
      { iconName: 'shield', text: "Client-side decrypted direct chats" },
      { iconName: 'palette', text: "7 Custom skin presets for dashboard skins" },
      { iconName: 'database', text: "2 Local storage caching profiles" }
    ]
  },
  {
    level: 3,
    req: 3,
    perks: [
      { iconName: 'globe', text: "Sovereign vanity link: app.verlyn.in/community/custom-name" },
      { iconName: 'mic', text: "Localized Peer-to-Peer audio streaming nodes" },
      { iconName: 'radio', text: "Multi-peer chat packet routing filters" },
      { iconName: 'languages', text: "Auto-Translation of cryptographic payloads" }
    ]
  },
  {
    level: 4,
    req: 4,
    perks: [
      { iconName: 'award', text: "Custom cryptographic logo for link quotes" },
      { iconName: 'shield', text: "ZK-proof verified group threads" },
      { iconName: 'lock', text: "Dedicated storage partition keys" },
      { iconName: 'compass', text: "4 Custom user-agent routing slots" }
    ]
  },
  {
    level: 5,
    req: 5,
    perks: [
      { iconName: 'layout', text: "8 Colors for Channel Cover headers" },
      { iconName: 'award', text: "Custom cryptographic link header previews" },
      { iconName: 'palette', text: "8 Premium accent colors and glows" },
      { iconName: 'volume2', text: "High-fidelity audio stream quality (384kbps)" }
    ]
  },
  {
    level: 6,
    req: 6,
    perks: [
      { iconName: 'globe', text: "Secure integrations gateway for external nodes" },
      { iconName: 'key', text: "SHA-256 webhook request signing keys" },
      { iconName: 'layout', text: "16 Colors for Channel Cover headers" },
      { iconName: 'volume2', text: "Lossless audio bitrate streaming channels" }
    ]
  },
  {
    level: 7,
    req: 7,
    perks: [
      { iconName: 'crown', text: "Custom logo and branding signatures for headers" },
      { iconName: 'key', text: "Multi-signature channel cover authorizations" },
      { iconName: 'link', text: "21 Dynamic styles for sovereign links" },
      { iconName: 'mic', text: "Ambient spatial peer-to-peer audio nodes" }
    ]
  },
  {
    level: 8,
    req: 8,
    perks: [
      { iconName: 'users', text: "1000+ Custom verified emoji status templates" },
      { iconName: 'sparkles', text: "Real-time zero-knowledge audio noise filtering" },
      { iconName: 'globe', text: "Multi-peer WebTransport routing gates" },
      { iconName: 'lock', text: "Client-side encrypted group channel storage" }
    ]
  },
  {
    level: 9,
    req: 9,
    perks: [
      { iconName: 'layout', text: "Custom glassmorphic page background filters" },
      { iconName: 'search', text: "Searchable encrypted security audit logs" },
      { iconName: 'database', text: "Distributed node storage caches" },
      { iconName: 'radio', text: "Multi-peer screen-sharing channels" }
    ]
  },
  {
    level: 10,
    req: 10,
    perks: [
      { iconName: 'shield', text: "Zero-Knowledge Chambers (untraceable chats)" },
      { iconName: 'sparkles', text: "Autonomous AI gatekeeper (local model moderation)" },
      { iconName: 'key', text: "Infinite custom security roles and permission matrices" },
      { iconName: 'radio', text: "Lossless uncompressed 4K screen streaming" }
    ]
  },
  {
    level: 50,
    req: 50,
    perks: [
      { iconName: 'crown', text: "Sovereign Validator Node control (Shinichiro's Legacy)" },
      { iconName: 'volumex', text: "Zero platform telemetry, ads, or trackers" },
      { iconName: 'database', text: "Exclusive access to custom WASM runtime kernels" },
      { iconName: 'globe', text: "Direct hook to the Verlyn Social Economy network" }
    ]
  }
];

const renderPerkIcon = (iconName: string) => {
  switch (iconName) {
    case 'link': return <LucideLink size={14} className="text-indigo-400" />;
    case 'palette': return <Palette size={14} className="text-pink-400" />;
    case 'heart': return <Heart size={14} className="text-rose-400" />;
    case 'play': return <Play size={14} className="text-cyan-400" />;
    case 'globe': return <Globe size={14} className="text-emerald-400" />;
    case 'award': return <Award size={14} className="text-amber-400" />;
    case 'layout': return <Layout size={14} className="text-purple-400" />;
    case 'compass': return <Compass size={14} className="text-teal-400" />;
    case 'users': return <Users size={14} className="text-orange-400" />;
    case 'image': return <Image size={14} className="text-emerald-400" />;
    case 'sparkles': return <Sparkles size={14} className="text-yellow-400" />;
    case 'volumex': return <VolumeX size={14} className="text-rose-400" />;
    case 'shield': return <Shield size={14} className="text-indigo-400" />;
    case 'lock': return <Lock size={14} className="text-rose-400" />;
    case 'clock': return <Clock size={14} className="text-pink-400" />;
    case 'database': return <Database size={14} className="text-cyan-400" />;
    case 'mic': return <Mic size={14} className="text-emerald-400" />;
    case 'radio': return <Radio size={14} className="text-indigo-400" />;
    case 'languages': return <Languages size={14} className="text-cyan-400" />;
    case 'volume2': return <Volume2 size={14} className="text-pink-400" />;
    case 'key': return <Key size={14} className="text-amber-400" />;
    case 'crown': return <Crown size={14} className="text-yellow-400" />;
    case 'search': return <Search size={14} className="text-cyan-400" />;
    default: return <Sparkles size={14} className="text-indigo-400" />;
  }
};

const NAV = [
  { id: 'overview',     label: 'Overview & Stats',   icon: <BarChart3 size={13} /> },
  { id: 'members',      label: 'Members Directory',  icon: <Users size={13} /> },
  { id: 'roles',        label: 'Roles & Permissions',icon: <UserCheck size={13} /> },
  { id: 'channels',     label: 'Channels Setup',     icon: <Hash size={13} /> },
  { id: 'moderation',   label: 'Safety & Logs',      icon: <Shield size={13} /> },
  { id: 'integrations', label: 'Webhooks / APIs',    icon: <Globe size={13} /> },
  { id: 'boosts',       label: 'Server Boosts',      icon: <Sparkles size={13} /> },
  { id: 'onboarding',   label: 'Onboarding rules',   icon: <Info size={13} /> },
  { id: 'emojis',       label: 'Emoji Cache',        icon: <Heart size={13} /> },
  { id: 'invites',      label: 'Invites Directory',  icon: <Plus size={13} /> },
  { id: 'branding',     label: 'Branding Skin',      icon: <Edit3 size={13} /> },
  { id: 'danger',       label: 'Danger Teardown',    icon: <AlertTriangle size={13} /> },
] as const;

function OwnerControlPanel({
  isOwner, myPerms,
  isOpen, onClose, community, members, channels, messages,
  onDeleteMessage, onChannelCreated, onChannelDeleted, onMemberRoleUpdated, onSettingsSaved,
  themeColor, setThemeColor, raidMode, setRaidMode, bannedKeywords, setBannedKeywords,
  onKickMember,
  spamLevel, setSpamLevel,
  bannedUsers, setBannedUsers,
  spamRateLimit, setSpamRateLimit,
  allowLinks, setAllowLinks,
  maxMentions, setMaxMentions,
  webhooks, setWebhooks,
  emojis, setEmojis,
  boostsCount, setBoostsCount,
  boostersList, setBoostersList,
  rules, setRules,
  enableRulesGate, setEnableRulesGate,
  vanityUrl, setVanityUrl,
  invites, setInvites,
  customRoles, setCustomRoles,
  rolePermissions, setRolePermissions,
  auditLogs, setAuditLogs,
  messagingLocked,
  setMessagingLocked
}: {
  isOwner: boolean; myPerms: any;
  isOpen: boolean; onClose: () => void; community: any; members: any[]; channels: any[];
  messages: any[]; onDeleteMessage: (id: string) => void; onChannelCreated: (ch: any) => void;
  onChannelDeleted: (id: string) => void; onMemberRoleUpdated: (uid: string, role: string) => void;
  onSettingsSaved: (name: string, desc: string) => void;
  themeColor: 'violet' | 'emerald' | 'crimson' | 'amber' | 'sky';
  setThemeColor: (t: 'violet' | 'emerald' | 'crimson' | 'amber' | 'sky') => void;
  raidMode: boolean; setRaidMode: (b: boolean) => void;
  bannedKeywords: string[]; setBannedKeywords: (kw: string[]) => void;
  onKickMember: (userId: string) => void;
  spamLevel: 'low' | 'medium' | 'strict'; setSpamLevel: (val: 'low' | 'medium' | 'strict') => void;
  bannedUsers: BannedUser[]; setBannedUsers: React.Dispatch<React.SetStateAction<any[]>>;
  spamRateLimit: number; setSpamRateLimit: (val: number) => void;
  allowLinks: boolean; setAllowLinks: (val: boolean) => void;
  maxMentions: number; setMaxMentions: (val: number) => void;
  webhooks: Webhook[]; setWebhooks: (val: Webhook[]) => void;
  emojis: ServerEmoji[]; setEmojis: (val: ServerEmoji[]) => void;
  boostsCount: number; setBoostsCount: (val: number) => void;
  boostersList: any[]; setBoostersList: (val: any[]) => void;
  rules: string[]; setRules: (val: string[]) => void;
  enableRulesGate: boolean; setEnableRulesGate: (val: boolean) => void;
  vanityUrl: string; setVanityUrl: (val: string) => void;
  invites: InviteLink[]; setInvites: (val: InviteLink[]) => void;
  customRoles: CustomRole[]; setCustomRoles: (val: CustomRole[]) => void;
  rolePermissions: Record<string, Record<string, boolean>>; setRolePermissions: (val: Record<string, Record<string, boolean>>) => void;
  auditLogs: AuditLogEntry[]; setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  messagingLocked: boolean;
  setMessagingLocked: (val: boolean) => void;
}) {
  const { name } = useParams() as { name: string };
  const router = useRouter();
  const visibleNav = useMemo(() => {
    return NAV.filter(n => {
      if (n.id === 'moderation') {
        return isOwner || myPerms.viewAuditLogs !== false;
      }
      if (n.id === 'invites') {
        return isOwner || myPerms.manageInvites !== false;
      }
      return true;
    });
  }, [myPerms.viewAuditLogs, myPerms.manageInvites, isOwner]);

  const [tab, setTab] = useState<OwnerTab>('overview');
  const [badgeRefreshTrigger, setBadgeRefreshTrigger] = useState(0);
  const panelActiveLevel = BOOST_LEVELS.filter(l => boostsCount >= l.req).reduce((max, l) => l.level > max ? l.level : max, 0);
  const panelNextLevelItem = BOOST_LEVELS.find(l => l.req > boostsCount);
  const [editName, setEditName] = useState(community?.display_name || '');
  const [editDesc, setEditDesc] = useState(community?.description || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  
  const [newChanName, setNewChanName] = useState('');
  const [isCreatingChan, setIsCreatingChan] = useState(false);
  const [isDeletingChan, setIsDeletingChan] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteInput, setShowDeleteInput] = useState(false);

  // Analytics filter range
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedPreviewLevel, setSelectedPreviewLevel] = useState<number>(1);

  // Auto-mod configuration states
  const [newKeyword, setNewKeyword] = useState('');
  
  // Channels Config states
  const [selectedChanId, setSelectedChanId] = useState<string | null>(null);
  const [chanName, setChanName] = useState('');
  const [chanTopic, setChanTopic] = useState('');
  const [chanSlowMode, setChanSlowMode] = useState<number>(0);
  const [chanPrivate, setChanPrivate] = useState(false);
  const [chanType, setChanType] = useState<'text' | 'voice' | 'announcements'>('text');
  const [chanBitrate, setChanBitrate] = useState<number>(96); // voice bitrate in kbps
  const [chanUserLimit, setChanUserLimit] = useState<number>(0); // voice user / member limit
  const [chanPassword, setChanPassword] = useState('');
  const [showChanPassword, setShowChanPassword] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSavingChanConfig, setIsSavingChanConfig] = useState(false);

  // Webhooks/Integrations inputs
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookChanId, setNewWebhookChanId] = useState('');
  const [newWebhookFormat, setNewWebhookFormat] = useState<'discord' | 'slack' | 'json'>('json');
  const [newWebhookHeaders, setNewWebhookHeaders] = useState('{"Content-Type": "application/json"}');
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);

  // Emojis/Stickers inputs
  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiSymbol, setNewEmojiSymbol] = useState('');

  // Onboarding & Rules inputs
  const [newRule, setNewRule] = useState('');
  const [vanityStatus, setVanityStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  const [inviteChanId, setInviteChanId] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('Unlimited');
  const [inviteExpires, setInviteExpires] = useState('Never');

  // Custom Roles & Permissions inputs
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#a855f7');
  const [auditFilter, setAuditFilter] = useState<string>('all');

  const chan = channels.find((c: any) => c.id === selectedChanId);

  const addLog = (type: AuditLogEntry['type'], desc: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [
      { id: Date.now().toString(), time, type, desc, actor: 'Shinichiro (Owner)' },
      ...prev
    ]);
  };

  useEffect(() => {
    setEditName(community?.display_name || '');
    setEditDesc(community?.description || '');
    if (channels.length > 0 && !selectedChanId) {
      setSelectedChanId(channels[0].id);
      setNewWebhookChanId(channels[0].id);
      setInviteChanId(channels[0].id);
    }
  }, [community?.id, channels]);

  // Load and save local settings for slowMode/topics
  useEffect(() => {
    if (selectedChanId) {
      const chan = channels.find((c: any) => c.id === selectedChanId);
      // Prefer DB values from channels prop, fallback to localStorage
      const savedName = chan?.name || '';
      const savedTopic = chan?.description || localStorage.getItem(`chan_topic_${selectedChanId}`) || '';
      const savedSlow = typeof chan?.slow_mode_cooldown === 'number' ? chan.slow_mode_cooldown : parseInt(localStorage.getItem(`chan_slow_${selectedChanId}`) || '0');
      const savedPrivate = typeof chan?.requires_approval === 'boolean' ? chan.requires_approval : localStorage.getItem(`chan_private_${selectedChanId}`) === 'true';
      const savedType = (chan?.type || localStorage.getItem(`chan_type_${selectedChanId}`) || 'text') as any;
      const savedBitrate = parseInt(localStorage.getItem(`chan_bitrate_${selectedChanId}`) || '96');
      const savedLimit = typeof chan?.max_members === 'number' ? chan.max_members : parseInt(localStorage.getItem(`chan_limit_${selectedChanId}`) || '0');
      const savedPassword = chan?.password || '';
      
      setChanName(savedName);
      setChanTopic(savedTopic);
      setChanSlowMode(savedSlow);
      setChanPrivate(savedPrivate);
      setChanType(savedType);
      setChanBitrate(savedBitrate);
      setChanUserLimit(savedLimit);
      setChanPassword(savedPassword);
      setShowChanPassword(false);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordEnabled(!!savedPassword);
      setPasswordError('');
    }
  }, [selectedChanId, channels]);

  const handleSaveChannelConfig = async () => {
    if (!selectedChanId || !community?.id) return;
    setIsSavingChanConfig(true);
    setPasswordError('');

    const chan = channels.find((c: any) => c.id === selectedChanId);
    const hasOld = !!chan?.password;
    let targetPassword = chan?.password || null;

    if (passwordEnabled) {
      if (newPasswordInput.trim() !== '') {
        // Verification flow: must check current password if it exists
        if (hasOld) {
          if (oldPasswordInput !== chan.password) {
            setPasswordError("Current channel password is incorrect.");
            setIsSavingChanConfig(false);
            return;
          }
        }
        if (newPasswordInput !== confirmPasswordInput) {
          setPasswordError("New passwords do not match.");
          setIsSavingChanConfig(false);
          return;
        }
        targetPassword = newPasswordInput.trim();
      } else if (!hasOld) {
        // If enabling password protection but leaving fields empty
        setPasswordError("Please enter a new password.");
        setIsSavingChanConfig(false);
        return;
      }
    } else {
      // Disabling password protection
      if (hasOld) {
        if (oldPasswordInput !== chan.password) {
          setPasswordError("Current channel password is incorrect to remove protection.");
          setIsSavingChanConfig(false);
          return;
        }
        targetPassword = null;
      }
    }

    const passwordChanged = targetPassword !== (chan?.password || null);

    // Persist to localStorage for instant local state
    localStorage.setItem(`chan_topic_${selectedChanId}`, chanTopic);
    localStorage.setItem(`chan_slow_${selectedChanId}`, chanSlowMode.toString());
    localStorage.setItem(`chan_private_${selectedChanId}`, chanPrivate ? 'true' : 'false');
    localStorage.setItem(`chan_type_${selectedChanId}`, chanType);
    localStorage.setItem(`chan_bitrate_${selectedChanId}`, chanBitrate.toString());
    localStorage.setItem(`chan_limit_${selectedChanId}`, chanUserLimit.toString());

    const finalName = enforceMinChannelName(chanName);

    // Persist to database
    const res = await updateCommunityChannelDB(community.id, selectedChanId, {
      name: finalName || undefined,
      description: chanTopic || undefined,
      type: (chanType === 'announcements' ? 'text' : chanType) as 'text' | 'voice',
      password: targetPassword,
      maxMembers: chanUserLimit > 0 ? chanUserLimit : null,
      slowModeCooldown: chanSlowMode,
      requiresApproval: chanPrivate,
    });

    if (res.success) {
      if (passwordChanged) {
        // Clear all unlocked memberships for this channel so users must re-type the new passcode
        await clearChannelMembersDB(selectedChanId);
      }
      setChanName(finalName);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setChanPassword(targetPassword || '');
    } else {
      setPasswordError(res.error || "Failed to save configuration");
      setIsSavingChanConfig(false);
      return;
    }

    const chName = channels.find((c: any) => c.id === selectedChanId)?.name || 'channel';
    addLog('channel', `Configured #${chName} (Topic: "${chanTopic}", Slowmode: ${chanSlowMode}s, Max: ${chanUserLimit > 0 ? chanUserLimit + ' members' : 'unlimited'}, Password: ${targetPassword ? 'set' : 'none'}, Approval: ${chanPrivate})`);
    setIsSavingChanConfig(false);
  };

  const handleSaveSettings = async () => {
    if (!community?.id) return;
    setIsSavingSettings(true);
    const res = await updateCommunitySettings(community.id, { displayName: editName, description: editDesc });
    setIsSavingSettings(false);
    if (res.success) {
      setSettingsSaved(true);
      onSettingsSaved(editName, editDesc);
      addLog('settings', `Renamed community to "${editName}" and updated description.`);
      setTimeout(() => setSettingsSaved(false), 2500);
    } else alert(res.error || 'Failed to save');
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim() || !community?.id) return;
    setIsCreatingChan(true);
    const finalName = enforceMinChannelName(newChanName);
    const res = await createCommunityChannelDB(community.id, finalName);
    setIsCreatingChan(false);
    if (res.success && res.channel) { 
      onChannelCreated(res.channel); 
      addLog('channel', `Created new Text Channel #${finalName}`);
      setNewChanName(''); 
    }
    else alert(res.error || 'Failed to create channel');
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!community?.id) return;
    const chName = channels.find(c => c.id === channelId)?.name || 'channel';
    setIsDeletingChan(channelId);
    const res = await deleteCommunityChannelDB(community.id, channelId);
    setIsDeletingChan(null);
    if (res.success) {
      onChannelDeleted(channelId);
      addLog('channel', `Deleted channel #${chName}`);
      if (selectedChanId === channelId) setSelectedChanId(null);
    }
    else alert(res.error || 'Failed to delete');
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!community?.id) return;
    setIsUpdatingRole(userId);
    const dbRole = newRole === 'admin' ? 'admin' : newRole === 'moderator' ? 'moderator' : 'member';
    const res = await updateMemberRole(community.id, userId, dbRole);
    setIsUpdatingRole(null);
    if (res.success) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`member_role_${name}_${userId}`, newRole);
      }
      onMemberRoleUpdated(userId, newRole);
      const m = members.find(u => u.user_id === userId);
      addLog('role', `Updated role of ${m?.display_name || 'user'} to ${newRole}.`);
    }
    else alert(res.error || 'Failed to update role');
  };

  const handleKickMember = async (userId: string) => {
    const m = members.find(u => u.user_id === userId);
    if (!m) return;
    if (confirm(`Kick ${m.display_name} (@${m.username}) from the community?`)) {
      onKickMember(userId);
      addLog('moderation', `Kicked member ${m.display_name} (@${m.username}).`);
    }
  };

  const handleBanMember = (userId: string) => {
    const m = members.find(u => u.user_id === userId);
    if (!m) return;
    if (confirm(`BAN ${m.display_name} (@${m.username})? They will not be able to rejoin.`)) {
      onKickMember(userId);
      const banEntry: BannedUser = {
        user_id: m.user_id,
        display_name: m.display_name || 'Banned User',
        username: m.username || 'banned',
        avatar_url: m.avatar_url,
        banned_at: new Date().toLocaleDateString()
      };
      setBannedUsers((prev: any[]) => [...prev, banEntry]);
      addLog('moderation', `BANNED user ${m.display_name} (@${m.username}) from the community.`);
    }
  };

  const handleUnbanMember = (userId: string) => {
    const b = bannedUsers.find(u => u.user_id === userId);
    setBannedUsers((prev: any[]) => prev.filter((u: any) => u.user_id !== userId));
    addLog('moderation', `Unbanned user ${b?.display_name || 'user'} (@${b?.username}).`);
  };

  const handleToggleRaidMode = () => {
    const nextVal = !raidMode;
    setRaidMode(nextVal);
    addLog('security', nextVal ? 'EMERGENCY LOCKDOWN ACTIVATED. Non-admin messaging locked.' : 'Emergency lockdown deactivated. Normal operations resumed.');
  };

  const handleToggleMessagingLock = () => {
    const nextVal = !messagingLocked;
    setMessagingLocked(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`messaging_locked_${name}`, String(nextVal));
    }
    addLog('security', nextVal
      ? 'Messaging locked: community is now read-only for all members.'
      : 'Messaging unlocked: members can send messages again.');
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const kw = newKeyword.trim().toLowerCase();
    if (!bannedKeywords.includes(kw)) {
      setBannedKeywords([...bannedKeywords, kw]);
      addLog('moderation', `Added AutoMod blocked word: "${kw}"`);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setBannedKeywords(bannedKeywords.filter(k => k !== kw));
    addLog('moderation', `Removed AutoMod blocked word: "${kw}"`);
  };

  const handleSelectTheme = (t: typeof themeColor) => {
    setThemeColor(t);
    addLog('theme', `Changed accent theme skin to "${t.toUpperCase()}".`);
  };

  // Webhooks callbacks
  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookChanId) return;
    const id = `wh-${Date.now()}`;
    const newWh: Webhook = {
      id,
      name: newWebhookName.trim(),
      channelId: newWebhookChanId,
      url: `https://api.verlyn.in/v1/webhooks/${id.slice(3)}`,
      format: newWebhookFormat,
      headers: newWebhookHeaders,
      created_at: new Date().toISOString().split('T')[0]
    };
    setWebhooks([...webhooks, newWh]);
    addLog('webhook', `Created incoming API Webhook "${newWebhookName}" on #${channels.find(c => c.id === newWebhookChanId)?.name}`);
    setNewWebhookName('');
  };

  const handleDeleteWebhook = (id: string) => {
    const wh = webhooks.find(w => w.id === id);
    setWebhooks(webhooks.filter(w => w.id !== id));
    addLog('webhook', `Deleted webhook "${wh?.name}"`);
  };

  const handleTestWebhook = (wh: Webhook) => {
    setWebhookTestStatus(wh.id);
    setTimeout(() => {
      setWebhookTestStatus(null);
      alert(`Webhook Triggered!\nPayload Format: ${wh.format.toUpperCase()}\nStatus: 200 OK\nPayload delivered to #${channels.find(c => c.id === wh.channelId)?.name || 'general'}`);
      addLog('webhook', `Tested webhook "${wh.name}" successfully.`);
    }, 800);
  };

  // Emojis callbacks
  const handleAddEmoji = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmojiName.trim() || !newEmojiSymbol.trim()) return;
    const nameClean = newEmojiName.trim().replace(/\s+/g, '_').toLowerCase();
    const newE: ServerEmoji = {
      id: `e-${Date.now()}`,
      name: nameClean,
      url: newEmojiSymbol.trim()
    };
    setEmojis([...emojis, newE]);
    addLog('emoji', `Registered custom emoji :${nameClean}: (${newEmojiSymbol})`);
    setNewEmojiName('');
    setNewEmojiSymbol('');
  };

  const handleDeleteEmoji = (id: string) => {
    const e = emojis.find(em => em.id === id);
    setEmojis(emojis.filter(em => em.id !== id));
    addLog('emoji', `Deleted custom emoji :${e?.name}:`);
  };

  // Boost simulated callbacks
  const handleSimulateBoost = () => {
    const nextBoosts = boostsCount + 1;
    setBoostsCount(nextBoosts);
    const mockNames = ['Lumine', 'Kazu', 'Aoi', 'Sato', 'Shinichiro'];
    const bName = mockNames[Math.floor(Math.random() * mockNames.length)];
    setBoostersList([{ id: `b-${Date.now()}`, name: bName, date: 'Just now' }, ...boostersList]);
    addLog('boost', `${bName} boosted the community! Total boosts reached: ${nextBoosts}.`);
    alert(`🎉 THANK YOU! ${bName} boosted the community. Total boosts: ${nextBoosts}.`);
  };

  // Rules callbacks
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim()) return;
    setRules([...rules, newRule.trim()]);
    addLog('settings', `Added community rule: "${newRule.trim().slice(0, 30)}..."`);
    setNewRule('');
  };

  const handleDeleteRule = (idx: number) => {
    const nextRules = rules.filter((_, i) => i !== idx);
    setRules(nextRules);
    addLog('settings', `Removed rule #${idx + 1}`);
  };

  const handleSaveVanity = () => {
    setVanityStatus('saving');
    setTimeout(() => {
      setVanityStatus('saved');
      addLog('settings', `Configured Vanity Invite URL to app.verlyn.in/community/${vanityUrl}`);
      setTimeout(() => setVanityStatus('idle'), 2000);
    }, 600);
  };

  // Invites callbacks
  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newInv: InviteLink = {
      code,
      channelId: inviteChanId,
      creator: 'Shinichiro',
      uses: 0,
      maxUses: inviteMaxUses,
      expires: inviteExpires === 'Never' ? 'Never' : '24 hours'
    };
    setInvites([newInv, ...invites]);
    addLog('invite', `Generated invite code ${code} pointing to #${channels.find(c => c.id === inviteChanId)?.name}`);
  };

  const handleRevokeInvite = (code: string) => {
    setInvites(invites.filter(i => i.code !== code));
    addLog('invite', `Revoked invite code ${code}`);
  };

  // Roles callbacks
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    const newR: CustomRole = {
      id: `cr-${Date.now()}`,
      name: newRoleName.trim(),
      color: newRoleColor,
      permissions: { sendMessages: true, attachFiles: true, manageChannels: false, kickMembers: false, muteMembers: false }
    };
    setCustomRoles([...customRoles, newR]);
    addLog('role', `Created custom security role "${newRoleName.trim()}"`);
    setNewRoleName('');
  };

  const handleDeleteCustomRole = (id: string) => {
    const r = customRoles.find(ro => ro.id === id);
    setCustomRoles(customRoles.filter(ro => ro.id !== id));
    addLog('role', `Deleted security role "${r?.name}"`);
  };

  const handleToggleCustomRolePermission = (roleId: string, perm: string) => {
    setCustomRoles(customRoles.map(r => {
      if (r.id === roleId) {
        const nextPerms = { ...r.permissions, [perm]: !(r.permissions as any)[perm] };
        return { ...r, permissions: nextPerms };
      }
      return r;
    }));
    const roleName = customRoles.find(r => r.id === roleId)?.name || 'Role';
    addLog('role', `Toggled "${perm}" permission for custom role "${roleName}"`);
  };

  // Permission checks matrix toggle callback
  const handleTogglePermission = (role: string, perm: string) => {
    const currentRolePerms = rolePermissions[role] || {};
    const nextPerms = { ...currentRolePerms, [perm]: !currentRolePerms[perm] };
    setRolePermissions({
      ...rolePermissions,
      [role]: nextPerms
    });
    addLog('role', `Toggled "${perm}" permission for default role "${role.toUpperCase()}".`);
  };

  const realMembers = members.filter(m => !m.user_id?.startsWith('sim-user-'));
  const adminMembers = realMembers.filter(m => m.role === 'admin' || m.role === 'owner');
  const filteredMembers = memberSearch.trim()
    ? realMembers.filter(m =>
        (m.display_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.username || '').toLowerCase().includes(memberSearch.toLowerCase())
      )
    : realMembers;

  const THEME_PREVIEWS = {
    violet: { name: 'Royal Violet', class: 'bg-violet-600 shadow-violet-500/20' },
    emerald: { name: 'Emerald Neon', class: 'bg-emerald-600 shadow-emerald-500/20' },
    crimson: { name: 'Crimson Fire', class: 'bg-rose-600 shadow-rose-500/20' },
    amber: { name: 'Amber Blaze', class: 'bg-amber-500 shadow-amber-500/20' },
    sky: { name: 'Sky Blue', class: 'bg-sky-500 shadow-sky-500/20' }
  };

  const wauData = [65, 84, 120, 142, 110, 164, 198];
  const msgData = [240, 310, 290, 480, 520, 390, 610];

  const filteredLogs = auditFilter === 'all' 
    ? auditLogs 
    : auditLogs.filter(l => l.type === auditFilter);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex"
          style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(28px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="m-auto w-full flex animate-fade-in"
            style={{ maxWidth: 1160, height: '88vh', maxHeight: 840 }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-full h-full flex rounded-3xl overflow-hidden bg-[#050508]"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 32px 90px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.02) inset',
              }}
            >
              {/* ── LEFT SIDEBAR ── */}
              <div className="flex flex-col shrink-0" style={{ width: 240, background: '#030306', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 border border-indigo-500/30 text-indigo-400">
                      <Crown size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white tracking-widest uppercase">Global Control</div>
                      <div className="text-[9px] text-neutral-500 font-extrabold uppercase mt-0.5 tracking-wider truncate" style={{ maxWidth: 150 }}>
                        {community?.display_name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left navigation menu */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                  {visibleNav.map(n => {
                    const active = tab === n.id;
                    const isDanger = n.id === 'danger';
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => setTab(n.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left relative ${
                          active 
                            ? isDanger 
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black' 
                              : 'bg-white/5 border border-white/10 text-white font-black' 
                            : 'border border-transparent text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {active && !isDanger && (
                          <motion.div 
                            layoutId="activeTabGlow"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4.5 rounded-r-full"
                            style={{ backgroundColor: themeColor === 'violet' ? '#8b5cf6' : themeColor === 'emerald' ? '#10b981' : themeColor === 'crimson' ? '#ef4444' : themeColor === 'amber' ? '#f59e0b' : '#0ea5e9' }}
                          />
                        )}
                        <span className={active ? 'opacity-100' : 'opacity-50'}>{n.icon}</span>
                        {n.label}
                      </button>
                    );
                  })}
                </nav>

                {/* Sidebar footer boost meter */}
                <div className="p-4 mx-3 mb-4 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">
                    <span>Server Status</span>
                    <span className="text-white font-black">LVL {panelActiveLevel || '0'}</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full transition-all duration-500" 
                      style={{ 
                        width: panelNextLevelItem 
                          ? `${Math.min(100, Math.max(0, (boostsCount / panelNextLevelItem.req) * 100))}%` 
                          : "100%" 
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-neutral-600 font-extrabold uppercase text-right">
                    {panelNextLevelItem 
                      ? `${boostsCount} / ${panelNextLevelItem.req} Boosts` 
                      : `${boostsCount} Boosts (Max Level)`}
                  </div>
                </div>
              </div>

              {/* ── RIGHT MAIN PANEL ── */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#050508]">
                {/* Top header bar */}
                <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 shrink-0 bg-[#030306]">
                  <div>
                    <h1 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <span>Server Dashboard</span>
                      <span className="text-neutral-500 font-bold">/</span>
                      <span className="text-indigo-400">{NAV.find(n => n.id === tab)?.label}</span>
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Main scrollable tabs section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  
                  {/* ══ OVERVIEW TAB ══ */}
                  {tab === 'overview' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {['7d', '30d', '90d'].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setAnalyticsRange(r as any)}
                              className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${
                                analyticsRange === r 
                                  ? 'bg-white/5 border-white/10 text-white' 
                                  : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                              }`}
                            >
                              {r} Range
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Filtered Analytics Overview</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <AnalyticsChart data={wauData} color="#8b5cf6" title="Weekly Active Members (WAU)" unit=" Users" range={analyticsRange} />
                        <AnalyticsChart data={msgData} color="#10b981" title="Community Message Activity" unit=" Msg" range={analyticsRange} />
                      </div>

                      {/* Info & configs */}
                      <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <Edit3 size={14} className="text-neutral-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Basic Configuration</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Display Name</label>
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Visibility Status</label>
                            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                              <span className="font-semibold text-white">{community?.is_private ? 'Private' : 'Public'}</span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${community?.is_private ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {community?.is_private ? 'Invite Only' : 'Open Entry'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Custom Vanity URL Configuration */}
                        <div className="border-t border-white/5 pt-4 space-y-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Vanity Invite URL (Level 3 Benefit)</label>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-mono text-neutral-400">
                              <span>app.verlyn.in/community/</span>
                              <input
                                value={vanityUrl}
                                onChange={e => setVanityUrl(e.target.value.toLowerCase().replace(new RegExp('[^a-z0-9-]', 'g'), ''))}
                                className="flex-1 bg-transparent border-none text-white focus:outline-none font-semibold pl-0.5"
                                placeholder="custom-invite"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveVanity}
                              disabled={vanityStatus === 'saving' || !vanityUrl.trim()}
                              className="px-5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10 flex items-center justify-center gap-1.5"
                            >
                              {vanityStatus === 'saving' ? <Loader2 size={12} className="animate-spin" /> : vanityStatus === 'saved' ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
                              {vanityStatus === 'saved' ? 'Saved' : 'Apply URL'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Community Description</label>
                          <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold resize-none"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-xs font-bold text-white transition-all border border-white/10"
                          >
                            {isSavingSettings ? <Loader2 size={12} className="animate-spin" /> : settingsSaved ? <Check size={12} className="text-emerald-400" /> : <Save size={12} />}
                            {settingsSaved ? 'Settings Saved' : isSavingSettings ? 'Saving...' : 'Save Configuration'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ MEMBERS TAB ══ */}
                  {tab === 'members' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                            placeholder="Search directory by name, handle, or ID..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                          />
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="px-3 py-2.5 rounded-xl bg-[#0f0f16] border border-indigo-500/10 text-[10px] font-black uppercase text-indigo-400">{realMembers.length} Total Users</div>
                        </div>
                      </div>

                      <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02] text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                          <span>User Identity</span>
                          <span>Handle</span>
                          <span>Assigned Role</span>
                          <span className="text-right">Actions</span>
                        </div>

                        <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto custom-scrollbar">
                          {filteredMembers.length === 0 ? (
                            <div className="py-12 text-center text-xs text-neutral-600 font-semibold">No community members match your query</div>
                          ) : filteredMembers.map(m => {
                            const isUserAdmin = m.role === 'admin' || m.role === 'owner';
                            const isSelf = m.user_id === community?.creator_id;
                            return (
                              <div key={m.user_id} className="grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-white/[0.01] transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    <SafeAvatar name={m.display_name} avatarUrl={m.avatar_url} size="w-8 h-8" />
                                  </div>
                                  <div className="truncate">
                                    <div className="text-xs font-bold text-neutral-200 truncate">{m.display_name}</div>
                                    <div className="text-[9px] text-neutral-500 font-bold mt-0.5">Joined {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'recently'}</div>
                                  </div>
                                </div>

                                <div className="font-mono text-xs text-neutral-500">@{m.username}</div>

                                <div>
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                                    m.role === 'owner' 
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                      : isUserAdmin 
                                        ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                        : 'bg-white/5 border-white/10 text-neutral-400'
                                  }`}>
                                    <Crown size={8} className="opacity-80" />
                                    {m.role || 'Member'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  {isSelf || m.role === 'owner' ? (
                                    <span className="text-[9px] font-black uppercase text-neutral-600 tracking-wider">Owner Account</span>
                                  ) : isUpdatingRole === m.user_id ? (
                                    <Loader2 size={12} className="animate-spin text-neutral-500" />
                                  ) : (
                                    <>
                                      <select
                                        value={m.role || 'member'}
                                        onChange={e => handleUpdateRole(m.user_id, e.target.value)}
                                        className="bg-[#0b0b0f] border border-white/10 text-neutral-300 rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none focus:border-white/20 transition-all cursor-pointer"
                                      >
                                        <option value="member">Member</option>
                                        <option value="moderator">Moderator</option>
                                        <option value="admin">Admin</option>
                                        {customRoles && customRoles.map(cr => (
                                          <option key={cr.id} value={cr.name}>{cr.name}</option>
                                        ))}
                                      </select>
                                      
                                      <select
                                        value={typeof window !== 'undefined' ? (localStorage.getItem(`member_zk_badge_${name}_${m.user_id}`) || 'None') : 'None'}
                                        onChange={e => {
                                          if (typeof window !== 'undefined') {
                                            localStorage.setItem(`member_zk_badge_${name}_${m.user_id}`, e.target.value);
                                            setBadgeRefreshTrigger(prev => prev + 1);
                                            onMemberRoleUpdated(m.user_id, m.role || 'member');
                                          }
                                        }}
                                        className="bg-[#0b0b0f] border border-white/10 text-neutral-300 rounded-lg px-2.5 py-1 text-[11px] font-bold focus:outline-none focus:border-white/20 transition-all cursor-pointer"
                                        title="Grant Badge"
                                      >
                                        <option value="None">No Badge</option>
                                        <option value="Citizen">Citizen 🛡️</option>
                                        <option value="Quantum">Quantum ⚛️</option>
                                        <option value="Shin">Shin 👑</option>
                                      </select>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleKickMember(m.user_id)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-neutral-800 border border-white/5 hover:border-white/10 text-neutral-400 hover:text-white transition-all"
                                        title="Kick User"
                                      >
                                        <X size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleBanMember(m.user_id)}
                                        className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/25 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
                                        title="Ban User"
                                      >
                                        <Ban size={11} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Banned section */}
                      {bannedUsers.length > 0 && (
                        <div className="bg-rose-950/5 border border-rose-950/20 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-2 text-rose-400">
                            <Ban size={14} />
                            <h3 className="text-xs font-black uppercase tracking-widest">Banned Identities ({bannedUsers.length})</h3>
                          </div>
                          
                          <div className="divide-y divide-rose-950/10 border border-rose-950/15 rounded-xl overflow-hidden bg-black/20">
                            {bannedUsers.map(b => (
                              <div key={b.user_id} className="flex items-center justify-between px-5 py-3 text-xs">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-rose-500/10 shrink-0">
                                    <SafeAvatar name={b.display_name} avatarUrl={b.avatar_url} size="w-7 h-7" />
                                  </div>
                                  <div>
                                    <span className="font-bold text-neutral-200">{b.display_name}</span>
                                    <span className="font-mono text-neutral-500 ml-2">@{b.username}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] text-neutral-500 font-bold">Banned on {b.banned_at}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnbanMember(b.user_id)}
                                    className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider transition-colors"
                                  >
                                    Revoke Ban
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ══ ROLES & PERMISSIONS MATRIX TAB ══ */}
                  {tab === 'roles' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* Custom security roles list & creations (5/12) */}
                        <div className="col-span-5 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Custom Server Roles</span>
                            
                            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                              {customRoles.map(r => (
                                <div key={r.id} className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                  <span className="text-xs font-bold" style={{ color: r.color }}>{r.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomRole(r.id)}
                                    className="p-1 rounded hover:bg-white/5 text-neutral-500 hover:text-rose-400 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Create Custom Role</span>
                            
                            <form onSubmit={handleCreateRole} className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase">Role Name</label>
                                <input
                                  value={newRoleName}
                                  onChange={e => setNewRoleName(e.target.value)}
                                  placeholder="e.g. VIP Member"
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                  required
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase block">Role Color Accent</label>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="color"
                                    value={newRoleColor}
                                    onChange={e => setNewRoleColor(e.target.value)}
                                    className="w-8 h-8 rounded-lg bg-transparent border border-white/10 cursor-pointer"
                                  />
                                  <span className="font-mono text-xs text-neutral-400">{newRoleColor}</span>
                                </div>
                              </div>
                              <button
                                type="submit"
                                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10"
                              >
                                Create Security Role
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Matrix checkgrid (7/12) */}
                        <div className="col-span-7 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                              <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Server Permissions Matrix</span>
                            </div>

                            <div className="divide-y divide-white/[0.04] max-h-[380px] overflow-y-auto custom-scrollbar">
                              {[
                                { id: 'sendMessages', label: 'Send Messages', desc: 'Allows members to post text/attachment messages in chat.' },
                                { id: 'attachFiles', label: 'Attach Files & Media', desc: 'Allows uploading pictures, voice notes, and documents.' },
                                { id: 'manageChannels', label: 'Manage Channels', desc: 'Allows creating, deleting, and renaming channels.' },
                                { id: 'kickMembers', label: 'Kick Members', desc: 'Allows removing members from the community pool.' },
                                { id: 'muteMembers', label: 'Mute / Deaf Members', desc: 'Allows disabling micro inputs/outputs for users.' },
                                { id: 'editMessages', label: 'Edit Messages', desc: 'Allows members to edit their own sent messages.' },
                                { id: 'deleteMessages', label: 'Delete Messages', desc: 'Allows deleting messages in chat.' },
                                { id: 'pinMessages', label: 'Pin Messages', desc: 'Allows pinning and unpinning announcements.' },
                                { id: 'addReactions', label: 'Add Reactions', desc: 'Allows adding emoji reactions to messages.' },
                                { id: 'changeNickname', label: 'Change Nicknames', desc: 'Allows editing member server profiles.' },
                                { id: 'manageInvites', label: 'Manage Invites', desc: 'Allows generating vanity custom invites.' },
                                { id: 'viewAuditLogs', label: 'View Safety Logs', desc: 'Allows viewing community audit and change logs.' },
                                { id: 'embedLinks', label: 'Embed Links', desc: 'Allows posting clickable hypertext URLs with previews.' }
                              ].map(perm => (
                                <div key={perm.id} className="py-3 items-center hover:bg-white/[0.01] transition-colors space-y-2">
                                  <div>
                                    <div className="text-xs font-bold text-neutral-200">{perm.label}</div>
                                    <div className="text-[9px] text-neutral-500 font-semibold mt-0.5">{perm.desc}</div>
                                  </div>
                                  <div className="flex items-center gap-4 bg-black/25 p-2 rounded-xl border border-white/[0.03] overflow-x-auto max-w-full custom-scrollbar py-1">
                                    {[...['admin', 'moderator', 'member', 'guest'], ...customRoles.map(cr => cr.name.toLowerCase())].map(role => (
                                      <label key={role} className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-400 cursor-pointer select-none shrink-0">
                                        <input 
                                          type="checkbox"
                                          checked={rolePermissions[role]?.[perm.id] ?? false}
                                          onChange={() => handleTogglePermission(role, perm.id)}
                                          className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer rounded border-white/10"
                                        />
                                        <span className="uppercase">{role}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ══ CHANNELS TAB ══ */}
                  {tab === 'channels' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* Channel listing column (5/12) */}
                        <div className="col-span-5 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Channel Index</span>
                              <span className="text-[10px] text-neutral-600 font-bold">{channels.length} Total</span>
                            </div>

                            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                              {channels.map(ch => {
                                const isSelected = selectedChanId === ch.id;
                                return (
                                  <div
                                    key={ch.id}
                                    onClick={() => setSelectedChanId(ch.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border text-left cursor-pointer ${
                                      isSelected
                                        ? 'bg-white/5 border-white/10 text-white font-bold'
                                        : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-200'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2 text-xs">
                                      <Hash size={13} className={isSelected ? 'text-white' : 'text-neutral-500'} />
                                      {ch.name}
                                    </span>
                                    {ch.name !== 'general' && (
                                      <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); if (confirm(`Delete #${ch.name} channel permanently?`)) handleDeleteChannel(ch.id); }}
                                        disabled={isDeletingChan === ch.id}
                                        className="p-1 rounded-lg hover:bg-rose-500/10 text-neutral-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all border border-transparent"
                                      >
                                        {isDeletingChan === ch.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5">
                            <form onSubmit={handleCreateChannel} className="space-y-3">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block mb-1">Create Channel</span>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold font-mono">#</span>
                                <input
                                  value={newChanName}
                                  onChange={e => setNewChanName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(new RegExp('[^a-z0-9-]', 'g'), ''))}
                                  placeholder="new-channel-name"
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl py-2 pl-7 pr-4 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={!newChanName.trim() || isCreatingChan}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10 disabled:opacity-40"
                              >
                                {isCreatingChan ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                Add Channel
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Channel configurations column (7/12) */}
                        <div className="col-span-7">
                          {selectedChanId ? (
                            <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 space-y-5 h-full">
                              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div className="flex items-center gap-2">
                                  <Hash size={14} className="text-neutral-400" />
                                  <span className="text-xs font-black uppercase text-white tracking-widest">
                                    Configure #{channels.find(c => c.id === selectedChanId)?.name}
                                  </span>
                                </div>
                                <span className="text-[9px] font-extrabold uppercase text-neutral-500">ID: {selectedChanId.slice(0, 8)}...</span>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Channel Name</label>
                                  <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold font-mono">#</span>
                                    <input
                                      value={chanName}
                                      onChange={e => setChanName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(new RegExp('[^a-z0-9_-]', 'g'), ''))}
                                      placeholder="e.g. general"
                                      className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                      disabled={channels.find(c => c.id === selectedChanId)?.name === 'general'}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Topic / description</label>
                                  <input
                                    value={chanTopic}
                                    onChange={e => setChanTopic(e.target.value)}
                                    placeholder="Describe the topic of this discussion channel..."
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Slowmode Cooldown</label>
                                    <select
                                      value={chanSlowMode}
                                      onChange={e => setChanSlowMode(parseInt(e.target.value))}
                                      className="w-full px-3 py-2.5 rounded-xl bg-[#09090d] border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                    >
                                      <option value={0}>Off (No Slowmode)</option>
                                      <option value={5}>5 seconds</option>
                                      <option value={15}>15 seconds</option>
                                      <option value={30}>30 seconds</option>
                                      <option value={60}>1 minute</option>
                                      <option value={300}>5 minutes</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Channel Type</label>
                                    <select
                                      value={chanType}
                                      onChange={e => setChanType(e.target.value as any)}
                                      className="w-full px-3 py-2.5 rounded-xl bg-[#09090d] border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                    >
                                      <option value="text">Text Discussion</option>
                                      <option value="voice">Voice Stream Room</option>
                                      <option value="announcements">Announcements Board</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Custom Audio Bitrate and limits for Voice channels */}
                                {chanType === 'voice' && (
                                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-neutral-500 uppercase block">Voice Bitrate Quality</label>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="range"
                                          min={8}
                                          max={384}
                                          step={8}
                                          value={chanBitrate}
                                          onChange={e => setChanBitrate(parseInt(e.target.value))}
                                          className="flex-1 accent-indigo-500 h-1.5 rounded bg-white/5 border-none cursor-pointer"
                                        />
                                        <span className="font-mono text-xs text-white font-extrabold shrink-0" style={{ minWidth: 50 }}>{chanBitrate}kbps</span>
                                      </div>
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-neutral-500 uppercase block">User Capacity Limit</label>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="range"
                                          min={0}
                                          max={99}
                                          value={chanUserLimit}
                                          onChange={e => setChanUserLimit(parseInt(e.target.value))}
                                          className="flex-1 accent-indigo-500 h-1.5 rounded bg-white/5 border-none cursor-pointer"
                                        />
                                        <span className="font-mono text-xs text-white font-extrabold shrink-0" style={{ minWidth: 50 }}>{chanUserLimit === 0 ? 'Infinite' : `${chanUserLimit} users`}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-3">
                                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5"><Key size={10} />Access Control & Security</label>

                                  {/* Password Protection Toggle */}
                                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-bold text-white block">Password Protection</span>
                                      <span className="text-[10px] text-neutral-500">Require a password to join this channel</span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={passwordEnabled}
                                      onChange={e => {
                                        setPasswordEnabled(e.target.checked);
                                        setPasswordError('');
                                      }}
                                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                    />
                                  </div>

                                  {/* Password Fields */}
                                  {(passwordEnabled || (chan?.password)) && (
                                    <div className="p-3.5 rounded-xl bg-[#09090d] border border-white/5 space-y-3">
                                      {/* Verify Current Password if changing or disabling */}
                                      {(chan?.password) && (
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-neutral-600 font-bold uppercase tracking-wide">Current Channel Password</label>
                                          <input
                                            type="password"
                                            value={oldPasswordInput}
                                            onChange={e => { setOldPasswordInput(e.target.value); setPasswordError(''); }}
                                            placeholder="Verify current password..."
                                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-all font-semibold placeholder:text-neutral-700"
                                          />
                                        </div>
                                      )}

                                      {passwordEnabled && (
                                        <>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-neutral-600 font-bold uppercase tracking-wide">New Channel Password</label>
                                            <input
                                              type="password"
                                              value={newPasswordInput}
                                              onChange={e => { setNewPasswordInput(e.target.value); setPasswordError(''); }}
                                              placeholder="Enter new passcode..."
                                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-all font-semibold placeholder:text-neutral-700"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-neutral-600 font-bold uppercase tracking-wide">Confirm New Password</label>
                                            <input
                                              type="password"
                                              value={confirmPasswordInput}
                                              onChange={e => { setConfirmPasswordInput(e.target.value); setPasswordError(''); }}
                                              placeholder="Confirm new passcode..."
                                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/40 transition-all font-semibold placeholder:text-neutral-700"
                                            />
                                          </div>
                                        </>
                                      )}

                                      {passwordError && (
                                        <p className="text-[11px] font-semibold text-rose-400">{passwordError}</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Max Members for Text Channels */}
                                  {chanType !== 'voice' && (
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] text-neutral-600 font-bold uppercase tracking-wide flex items-center gap-1">Max Members (0 = unlimited, max 200)</label>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="range"
                                          min={0}
                                          max={200}
                                          step={10}
                                          value={chanUserLimit}
                                          onChange={e => setChanUserLimit(parseInt(e.target.value))}
                                          className="flex-1 accent-indigo-500 h-1.5 rounded bg-white/5 border-none cursor-pointer"
                                        />
                                        <span className="font-mono text-xs text-white font-extrabold shrink-0" style={{ minWidth: 70 }}>
                                          {chanUserLimit === 0 ? 'Unlimited' : `${chanUserLimit} max`}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Requires Approval */}
                                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                                    <div>
                                      <span className="font-semibold text-neutral-300 block">Requires Admin Approval</span>
                                      <span className="text-neutral-500 text-[9px]">Members must request access before joining</span>
                                    </div>
                                    <input 
                                      type="checkbox"
                                      checked={chanPrivate}
                                      onChange={e => setChanPrivate(e.target.checked)}
                                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                    />
                                  </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={handleSaveChannelConfig}
                                    disabled={isSavingChanConfig}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-xs font-bold text-white transition-all border border-white/10"
                                  >
                                    {isSavingChanConfig ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    Save Configuration
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-8 flex items-center justify-center text-center text-xs text-neutral-600 font-semibold h-full">
                              Select a channel from the index to configure settings
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ══ MODERATION & SAFETY TAB ══ */}
                  {tab === 'moderation' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* AutoMod and strictness configs (5/12) */}
                        <div className="col-span-5 space-y-4">
                          <div className={`border rounded-2xl p-5 space-y-4 transition-all duration-300 ${
                            raidMode 
                              ? 'bg-rose-500/[0.03] border-rose-500/30 shadow-lg shadow-rose-500/5' 
                              : 'bg-white/[0.01] border-white/[0.06]'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className={raidMode ? 'text-rose-500 animate-pulse' : 'text-neutral-500'} />
                                <span className={`text-xs font-black uppercase tracking-wider ${raidMode ? 'text-rose-400' : 'text-neutral-400'}`}>Raid Lockdown</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${raidMode ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-neutral-500'}`}>
                                {raidMode ? 'Active' : 'Standby'}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">
                              Emergency lockdown locks chat input filters for all standard member profiles. Only administrators can send messages.
                            </p>
                            <button
                              type="button"
                              onClick={handleToggleRaidMode}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                raidMode
                                  ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/20'
                                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                              }`}
                            >
                              {raidMode ? 'Deactivate Lockdown' : 'Activate Emergency Lock'}
                            </button>
                          </div>

                          <div className={`border rounded-2xl p-5 space-y-4 transition-all duration-300 ${
                            messagingLocked 
                              ? 'bg-amber-500/[0.03] border-amber-500/30 shadow-lg shadow-amber-500/5' 
                              : 'bg-white/[0.01] border-white/[0.06]'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Lock size={14} className={messagingLocked ? 'text-amber-500 animate-pulse' : 'text-neutral-500'} />
                                <span className={`text-xs font-black uppercase tracking-wider ${messagingLocked ? 'text-amber-400' : 'text-neutral-400'}`}>Read-Only Mode</span>
                              </div>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${messagingLocked ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-neutral-500'}`}>
                                {messagingLocked ? 'Locked' : 'Unlocked'}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">
                              Lock the entire community&apos;s messaging. Members can only view channels and read posts, but cannot chat.
                            </p>
                            <button
                              type="button"
                              onClick={handleToggleMessagingLock}
                              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                messagingLocked
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-500/20'
                                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                              }`}
                            >
                              {messagingLocked ? 'Unlock Messaging' : 'Lock Messaging (Read-Only)'}
                            </button>
                          </div>

                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">AutoMod Filter</span>
                              <span className="text-[10px] text-neutral-600 font-bold">{bannedKeywords.length} Blocked</span>
                            </div>

                            <form onSubmit={handleAddKeyword} className="flex gap-2">
                              <input
                                value={newKeyword}
                                onChange={e => setNewKeyword(e.target.value)}
                                placeholder="Add forbidden word..."
                                className="flex-1 bg-[#050508] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                              />
                              <button
                                type="submit"
                                className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10"
                              >
                                Add
                              </button>
                            </form>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {bannedKeywords.length === 0 ? (
                                <span className="text-[10px] text-neutral-600 font-semibold italic">No word blocks registered</span>
                              ) : bannedKeywords.map(kw => (
                                <span key={kw} className="inline-flex items-center gap-1.5 bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-md animate-fade-in">
                                  {kw}
                                  <button type="button" onClick={() => handleRemoveKeyword(kw)} className="text-rose-500 hover:text-rose-300 font-black">×</button>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Fine-grained Auto-mod limits settings */}
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-3.5">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">AutoMod Rulesets</span>
                            <div className="space-y-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-bold text-neutral-300">Spam Message Rate Limit</div>
                                  <div className="text-[9px] text-neutral-500">Max messages allowed per 5 seconds.</div>
                                </div>
                                <input
                                  type="number"
                                  value={spamRateLimit}
                                  onChange={e => setSpamRateLimit(parseInt(e.target.value))}
                                  className="w-14 bg-black/40 border border-white/10 rounded-lg text-center text-xs py-1 font-mono text-white focus:outline-none"
                                  min={1}
                                  max={50}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-white/[0.04] pt-3">
                                <div>
                                  <div className="text-xs font-bold text-neutral-300">Block Links & URLs</div>
                                  <div className="text-[9px] text-neutral-500">Prevents members from posting websites.</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={!allowLinks}
                                  onChange={e => setAllowLinks(!e.target.checked)}
                                  className="w-4 h-4 accent-indigo-500 cursor-pointer"
                                />
                              </div>
                              <div className="flex items-center justify-between gap-3 border-t border-white/[0.04] pt-3">
                                <div>
                                  <div className="text-xs font-bold text-neutral-300">Mass Mention Cap Limit</div>
                                  <div className="text-[9px] text-neutral-500">Max user @mentions permitted in one message.</div>
                                </div>
                                <input
                                  type="number"
                                  value={maxMentions}
                                  onChange={e => setMaxMentions(parseInt(e.target.value))}
                                  className="w-14 bg-black/40 border border-white/10 rounded-lg text-center text-xs py-1 font-mono text-white focus:outline-none"
                                  min={1}
                                  max={15}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Audit Logs TIMELINE (7/12) */}
                        <div className="col-span-7 flex flex-col bg-white/[0.01] border border-white/[0.06] rounded-2xl overflow-hidden h-[450px]">
                          <div className="px-5 py-3.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield size={13} className="text-indigo-400" />
                              <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Live Security Audit Logs</span>
                            </div>
                            
                            {/* Filter category */}
                            <select
                              value={auditFilter}
                              onChange={e => setAuditFilter(e.target.value)}
                              className="bg-[#0b0b0f] border border-white/10 text-neutral-400 rounded-lg px-2.5 py-1 text-[10px] font-bold focus:outline-none focus:border-white/20 transition-all cursor-pointer"
                            >
                              <option value="all">All Logs</option>
                              <option value="settings">Settings</option>
                              <option value="channel">Channels</option>
                              <option value="role">Roles</option>
                              <option value="moderation">Moderation</option>
                              <option value="security">Security</option>
                              <option value="webhook">Webhooks</option>
                              <option value="boost">Boosts</option>
                              <option value="invite">Invites</option>
                            </select>
                          </div>

                          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 font-mono">
                            {filteredLogs.length === 0 ? (
                              <div className="py-12 text-center text-xs text-neutral-600 font-semibold italic">No audit events match your filter</div>
                            ) : filteredLogs.map(l => (
                              <div key={l.id} className="text-[11px] leading-relaxed flex items-start gap-3 border-b border-white/[0.02] pb-2 last:border-b-0 animate-fade-in">
                                <span className="text-neutral-600 font-semibold select-none shrink-0">[{l.time}]</span>
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  l.type === 'security' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                                  l.type === 'settings' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                  l.type === 'channel' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10' :
                                  l.type === 'role' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                  l.type === 'webhook' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/10' :
                                  l.type === 'boost' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/10' :
                                  l.type === 'invite' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' :
                                  'bg-white/5 text-neutral-400 border border-white/10'
                                }`}>
                                  {l.type}
                                </span>
                                <div className="text-neutral-300">
                                  <span>{l.desc}</span>
                                  <span className="text-[9px] text-neutral-500 font-bold block mt-0.5">By {l.actor}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ══ WEBHOOKS & API INTEGRATIONS TAB ══ */}
                  {tab === 'integrations' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Globe size={14} className="text-neutral-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Incoming Webhooks & APIs</span>
                      </div>

                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* Webhook listings */}
                        <div className="col-span-7 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Active Webhooks ({webhooks.length})</span>
                            
                            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto custom-scrollbar">
                              {webhooks.length === 0 ? (
                                <div className="py-12 text-center text-xs text-neutral-600 font-semibold italic">No webhooks registered</div>
                              ) : webhooks.map(w => (
                                <div key={w.id} className="py-4 flex items-center justify-between gap-4">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="text-xs font-bold text-white flex items-center gap-2">
                                      <span>{w.name}</span>
                                      <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-neutral-500 border border-white/5">{w.format.toUpperCase()} Payloads</span>
                                    </div>
                                    <div className="font-mono text-[9px] text-neutral-500 truncate select-all">{w.url}</div>
                                    <div className="text-[8px] text-neutral-600 font-semibold">Custom Headers: <code className="text-neutral-500 font-mono text-[8px]">{w.headers}</code></div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleTestWebhook(w)}
                                      disabled={webhookTestStatus === w.id}
                                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-[10px] font-bold transition-all"
                                    >
                                      {webhookTestStatus === w.id ? 'Testing...' : 'Test'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWebhook(w.id)}
                                      className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 text-rose-400 transition-all"
                                      title="Delete Webhook"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Create new Webhook */}
                        <div className="col-span-5">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Add New Webhook</span>
                            
                            <form onSubmit={handleCreateWebhook} className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Webhook Title</label>
                                <input
                                  value={newWebhookName}
                                  onChange={e => setNewWebhookName(e.target.value)}
                                  placeholder="e.g. GitHub Integration"
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Post to Channel</label>
                                <select
                                  value={newWebhookChanId}
                                  onChange={e => setNewWebhookChanId(e.target.value)}
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                >
                                  {channels.map(c => (
                                    <option key={c.id} value={c.id}>#{c.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-500 uppercase block">Payload Format</label>
                                  <select
                                    value={newWebhookFormat}
                                    onChange={e => setNewWebhookFormat(e.target.value as any)}
                                    className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                  >
                                    <option value="json">Raw JSON</option>
                                    <option value="discord">Discord compatible</option>
                                    <option value="slack">Slack compatible</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-500 uppercase block">Custom Header Payload</label>
                                  <input
                                    value={newWebhookHeaders}
                                    onChange={e => setNewWebhookHeaders(e.target.value)}
                                    className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                                  />
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10"
                              >
                                <Plus size={12} />
                                Create Webhook URL
                              </button>
                            </form>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ══ SERVER BOOSTS TAB ══ */}
                  {tab === 'boosts' && (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Server Boost Management</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSimulateBoost}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-md shadow-pink-600/10 hover:shadow-pink-600/20"
                        >
                          <Plus size={10} />
                          Simulate Boost
                        </button>
                      </div>

                      {/* Progression Info Bar */}
                      {(() => {
                        const activeLevel = BOOST_LEVELS.filter(l => boostsCount >= l.req).reduce((max, l) => l.level > max ? l.level : max, 0);
                        const nextLevelItem = BOOST_LEVELS.find(l => l.req > boostsCount);
                        const maxBoosts = 50;
                        
                        return (
                          <div className="bg-gradient-to-r from-indigo-950/20 via-pink-950/10 to-transparent border border-white/[0.06] rounded-3xl p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Active Level</div>
                                <div className="text-3xl font-black text-white mt-1 flex items-center gap-2">
                                  <span>Level {activeLevel || '0'}</span>
                                  {activeLevel > 0 && (
                                    <span className="text-xs font-extrabold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-full border border-pink-500/20 uppercase tracking-wider animate-pulse">
                                      ACTIVE PERKS
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Total Boosts</div>
                                <div className="text-3xl font-black text-neutral-200 mt-1">{boostsCount} 💖</div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase">
                                <span>
                                  {nextLevelItem 
                                    ? `Progress to Level ${nextLevelItem.level} (Needs ${nextLevelItem.req} Boosts)` 
                                    : "All Levels Maxed Out!"}
                                </span>
                                <span className="text-white font-black">
                                  {boostsCount} / {nextLevelItem ? nextLevelItem.req : maxBoosts} Boosts
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.05]">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
                                  style={{ 
                                    width: `${Math.min(100, (boostsCount / (nextLevelItem ? nextLevelItem.req : maxBoosts)) * 100)}%` 
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Perks Explorer Split Screen */}
                      <div className="grid grid-cols-12 gap-6">
                        {/* Level Milestones Selector (5/12) */}
                        <div className="col-span-5 bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3">
                          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Level Milestones</span>
                          
                          <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                            {BOOST_LEVELS.map(item => {
                              const isUnlocked = boostsCount >= item.req;
                              const isSelected = selectedPreviewLevel === item.level;
                              
                              return (
                                <button
                                  key={item.level}
                                  type="button"
                                  onClick={() => setSelectedPreviewLevel(item.level)}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                                    isSelected
                                      ? 'bg-white/5 border-white/10 text-white font-black shadow-lg'
                                      : 'bg-transparent border-transparent text-neutral-400 hover:text-neutral-200'
                                  }`}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold">Level {item.level}</span>
                                    <span className="text-[9px] text-neutral-500 font-bold">{item.req} {item.req === 1 ? 'Boost' : 'Boosts'} Required</span>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border transition-all ${
                                    isUnlocked 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-md' 
                                      : 'bg-white/5 border-transparent text-neutral-600'
                                  }`}>
                                    {isUnlocked ? 'Unlocked' : 'Locked'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Level Rewards Previewer (7/12) */}
                        <div className="col-span-7 flex flex-col gap-4">
                          {(() => {
                            const previewLevelItem = BOOST_LEVELS.find(l => l.level === selectedPreviewLevel);
                            if (!previewLevelItem) return null;
                            const isUnlocked = boostsCount >= previewLevelItem.req;
                            
                            return (
                              <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5 h-full">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                  <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Level {previewLevelItem.level} Perks</h3>
                                    <p className="text-[9px] text-neutral-500 font-semibold mt-0.5">Requires {previewLevelItem.req} {previewLevelItem.req === 1 ? 'active boost' : 'active boosts'}</p>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-md border ${
                                    isUnlocked 
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                                  }`}>
                                    {isUnlocked ? 'PERKS ACTIVE' : 'LOCKED PREVIEW'}
                                  </span>
                                </div>

                                {/* Perks Grid */}
                                <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                                  {previewLevelItem.perks.map((perk, idx) => (
                                    <div 
                                      key={idx} 
                                      className={`p-3 rounded-2xl border bg-white/[0.01] flex items-start gap-2.5 transition-all hover:bg-white/[0.02] ${
                                        isUnlocked 
                                          ? 'border-indigo-500/10 hover:border-indigo-500/20' 
                                          : 'border-white/5 hover:border-white/10 opacity-70'
                                      }`}
                                    >
                                      <div className="p-2 rounded-xl bg-white/5 shrink-0">
                                        {renderPerkIcon(perk.iconName)}
                                      </div>
                                      <span className="text-[11px] font-semibold text-neutral-300 leading-snug mt-0.5">{perk.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Boosters Directory Section */}
                      <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                          <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Active Boosters ({boostersList.length})</span>
                        </div>
                        
                        <div className="divide-y divide-white/[0.04] overflow-y-auto max-h-48 custom-scrollbar pr-1">
                          {boostersList.length === 0 ? (
                            <div className="py-8 text-center text-xs text-neutral-600 font-semibold italic">No active boosts currently registered</div>
                          ) : boostersList.map(b => (
                            <div key={b.id} className="py-3 flex items-center justify-between text-xs animate-fade-in">
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-[10px]">💖</div>
                                <span className="font-bold text-neutral-200">{b.name}</span>
                              </div>
                              <span className="text-[9px] text-neutral-500 font-bold">Boosted {b.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ ONBOARDING & RULES TAB ══ */}
                  {tab === 'onboarding' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Info size={14} className="text-neutral-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Rules & Onboarding Gate</span>
                      </div>

                      <div className="grid grid-cols-12 gap-6">
                        {/* Rules Setup */}
                        <div className="col-span-7 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Community Rules Checklist</span>
                            
                            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto custom-scrollbar pr-1">
                              {rules.map((r, idx) => (
                                <div key={idx} className="py-3 flex items-start justify-between gap-3 text-xs">
                                  <div className="flex gap-2">
                                    <span className="text-neutral-500 font-black font-mono">#{idx+1}</span>
                                    <span className="text-neutral-300 font-semibold leading-relaxed">{r}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRule(idx)}
                                    className="p-1 rounded hover:bg-white/5 text-neutral-500 hover:text-rose-400 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Add Rule / Agreement gate */}
                        <div className="col-span-5 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Add Custom Rule</span>
                            
                            <form onSubmit={handleAddRule} className="space-y-3">
                              <textarea
                                value={newRule}
                                onChange={e => setNewRule(e.target.value)}
                                placeholder="Enter a community rule..."
                                rows={3}
                                className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold resize-none"
                                required
                              />
                              <button
                                type="submit"
                                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10"
                              >
                                Add Rule
                              </button>
                            </form>
                          </div>

                          {/* Agreement toggle card */}
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Agreement Gate</span>
                              <input 
                                type="checkbox"
                                checked={enableRulesGate}
                                onChange={e => { setEnableRulesGate(e.target.checked); addLog('settings', `Rules agreement gate set to ${e.target.checked}`); }}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                            </div>
                            <p className="text-[9px] text-neutral-600 font-semibold leading-relaxed">
                              Requires new users to read and accept the community rules before posting.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ EMOJI CACHE TAB ══ */}
                  {tab === 'emojis' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Heart size={14} className="text-neutral-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Custom Server Emojis</span>
                      </div>

                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* Emoji listings grid */}
                        <div className="col-span-7 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Custom Emojis Slots</span>
                              <span className="text-[10px] text-neutral-500 font-extrabold">{emojis.length} / 50 used</span>
                            </div>

                            <div className="grid grid-cols-5 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                              {emojis.map(e => (
                                <div key={e.id} className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.01] border border-white/[0.04] group hover:border-white/10 transition-colors animate-fade-in">
                                  <div className="w-8 h-8 flex items-center justify-center">
                                    {e.url && (e.url.startsWith('http') || e.url.startsWith('/') || e.url.startsWith('data:')) ? (
                                      <img src={e.url} className="w-7 h-7 object-contain rounded" alt={e.name} />
                                    ) : (
                                      <span className="text-2xl select-all">{e.url}</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-neutral-500 font-bold truncate max-w-full mt-1.5 select-all">:{e.name}:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEmoji(e.id)}
                                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-950/20 border border-rose-500/10 text-rose-400 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                                  >
                                    <X size={9} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Add custom emoji */}
                        <div className="col-span-5">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Upload Custom Emoji</span>
                            
                            <form onSubmit={handleAddEmoji} className="space-y-4">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1 space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Symbol/URL</label>
                                  <input
                                    value={newEmojiSymbol}
                                    onChange={e => setNewEmojiSymbol(e.target.value)}
                                    placeholder="🦊 or URL"
                                    className="w-full bg-[#050508] border border-white/10 rounded-xl py-2 px-1 text-center text-xs focus:outline-none focus:border-white/20 transition-all font-semibold"
                                    required
                                  />
                                </div>
                                <div className="col-span-2 space-y-2">
                                  <label className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">Emoji Code</label>
                                  <input
                                    value={newEmojiName}
                                    onChange={e => setNewEmojiName(e.target.value)}
                                    placeholder="fox_face"
                                    className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-semibold"
                                    required
                                  />
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all border border-white/10"
                              >
                                <Plus size={12} />
                                Register Custom Emoji
                              </button>
                            </form>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ══ INVITES DIRECTORY TAB ══ */}
                  {tab === 'invites' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <Plus size={14} className="text-neutral-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-neutral-300">Invite Links Directory</span>
                      </div>

                      <div className="grid grid-cols-12 gap-6">
                        
                        {/* Invites list */}
                        <div className="col-span-7 space-y-4">
                          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Active Invites ({invites.length})</span>
                            
                            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto custom-scrollbar">
                              {invites.map(i => (
                                <div key={i.code} className="py-3 flex items-center justify-between text-xs animate-fade-in">
                                  <div>
                                    <div className="flex items-center gap-2 text-white font-bold font-mono select-all">
                                      <span>app.verlyn.in/community/{name}?invite={i.code}</span>
                                      <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-neutral-500 border border-white/5">ACTIVE</span>
                                    </div>
                                    <div className="text-[9px] text-neutral-500 mt-1 font-semibold">
                                      Channel: #{channels.find(c => c.id === i.channelId)?.name || 'general'} | Creator: @{i.creator}
                                    </div>
                                    <div className="text-[8px] text-neutral-600 font-extrabold mt-0.5">USES: {i.uses} / {i.maxUses} | EXPIRES: {i.expires}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(i.code)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider transition-colors"
                                  >
                                    Revoke
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Create Invite Form */}
                        <div className="col-span-5 bg-white/[0.01] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block border-b border-white/5 pb-2">Generate Invite Link</span>
                          
                          <form onSubmit={handleCreateInvite} className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-neutral-500 uppercase">Target Channel</label>
                              <select
                                value={inviteChanId}
                                onChange={e => setInviteChanId(e.target.value)}
                                className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                              >
                                {channels.map(c => (
                                  <option key={c.id} value={c.id}>#{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase">Max Invite Uses</label>
                                <select
                                  value={inviteMaxUses}
                                  onChange={e => setInviteMaxUses(e.target.value)}
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                >
                                  <option value="Unlimited">No Limit</option>
                                  <option value="1">1 use</option>
                                  <option value="10">10 uses</option>
                                  <option value="50">50 uses</option>
                                  <option value="100">100 uses</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-bold text-neutral-500 uppercase">Link Expiry Duration</label>
                                <select
                                  value={inviteExpires}
                                  onChange={e => setInviteExpires(e.target.value)}
                                  className="w-full bg-[#050508] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white/20 transition-all font-semibold cursor-pointer"
                                >
                                  <option value="Never">Never Expire</option>
                                  <option value="30m">30 minutes</option>
                                  <option value="1h">1 hour</option>
                                  <option value="6h">6 hours</option>
                                  <option value="24h">24 hours</option>
                                </select>
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 rounded-xl bg-[#0f0f16] hover:bg-white/5 text-xs font-bold text-white transition-all border border-indigo-500/20 hover:border-white/10 shadow-lg shadow-indigo-500/5"
                            >
                              Generate Invite Link
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ BRANDING & AESTHETICS TAB ══ */}
                  {tab === 'branding' && (
                    <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">Accent Presets</h3>
                        <p className="text-[10px] text-neutral-500 font-semibold leading-relaxed">
                          Select the accent styling that defines your community’s branding guidelines. This color skin applies to buttons, hover states, badges, and glowing indicators.
                        </p>
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        {(Object.keys(THEME_PREVIEWS) as Array<keyof typeof THEME_PREVIEWS>).map(k => {
                          const active = themeColor === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleSelectTheme(k)}
                              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                                active 
                                  ? 'bg-[#0f0f16] border-white/15 shadow-xl' 
                                  : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full ${THEME_PREVIEWS[k].class} shadow-lg flex items-center justify-center`}>
                                {active && <Check size={14} className="text-white drop-shadow-md" />}
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-white' : 'text-neutral-500'}`}>
                                {THEME_PREVIEWS[k].name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-white/5 pt-5 space-y-4">
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">Live Preview Container</h4>
                          <p className="text-[9px] text-neutral-600 font-semibold mt-1">This is a mock sample of how your selected branding renders interactive controls.</p>
                        </div>

                        <div className="p-4 rounded-xl border border-white/[0.05] bg-black/20 flex items-center gap-3">
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold text-white shadow-md transition-all ${THEME_PREVIEWS[themeColor].class}`}
                          >
                            Primary Action
                          </button>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            themeColor === 'violet' ? 'text-violet-400' :
                            themeColor === 'emerald' ? 'text-emerald-400' :
                            themeColor === 'crimson' ? 'text-rose-400' :
                            themeColor === 'amber' ? 'text-amber-400' :
                            'text-sky-400'
                          }`}>
                            Accent Text Item
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ══ DANGER ZONE TAB ══ */}
                  {tab === 'danger' && (
                    <div className="space-y-6">
                      <div className="bg-rose-500/[0.02] border border-rose-500/10 rounded-2xl p-5 flex items-start gap-3">
                        <AlertTriangle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-rose-400">Irreversible Operations Ahead</h4>
                          <p className="text-[10px] text-neutral-500 font-semibold mt-1 leading-relaxed">
                            Actions taken in this panel will permanently modify database structures. Banned credentials, deleted data pools, or structural teardown cannot be undone under any circumstances.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.01] border border-white/[0.05]">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-200">Purge Message Logs</h4>
                          <p className="text-[10px] text-neutral-500 font-semibold mt-1">Delete all historical messages currently cached in this community channel log.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { if (confirm(`Permanently delete all community messages?`)) { messages.forEach(m => onDeleteMessage(m.id)); addLog('security', 'Initiated full message purge across all text channels.'); } }}
                          className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all shadow-md"
                        >
                          Purge Channels
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.01] border border-white/[0.05]">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-200">Teardown Permissions Structure</h4>
                          <p className="text-[10px] text-neutral-500 font-semibold mt-1">Force toggle private/public community status guidelines.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-neutral-500">CURRENT STATUS:</span>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                            community?.is_private 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {community?.is_private ? 'PRIVATE INVITE ONLY' : 'PUBLIC SEARCHABLE'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-rose-950/5 border border-rose-950/20 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Teardown Community Profile</h4>
                            <p className="text-[10px] text-neutral-500 font-semibold mt-1">Permanently remove community entity entries and associated data files.</p>
                          </div>
                          {!showDeleteInput && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteInput(true)}
                              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
                            >
                              Teardown Community
                            </button>
                          )}
                        </div>

                        {showDeleteInput && (
                          <div className="border-t border-rose-500/10 pt-4 space-y-3">
                            <p className="text-[11px] text-neutral-400 font-semibold">
                              Type <strong className="text-rose-400 select-all">{community?.display_name}</strong> to confirm the deletion sequence:
                            </p>
                            <div className="flex gap-2">
                              <input
                                value={deleteConfirm}
                                onChange={e => setDeleteConfirm(e.target.value)}
                                placeholder="Enter community name"
                                className="flex-1 bg-black/40 border border-rose-500/25 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500/40 transition-all font-semibold"
                              />
                              <button
                                type="button"
                                disabled={deleteConfirm !== community?.display_name}
                                onClick={async () => {
                                  if (confirm(`Are you absolutely sure you want to delete this community? All data, channels, and messages will be permanently destroyed.`)) {
                                    addLog('security', 'Initiated database teardown request.');
                                    const res = await deleteCommunity(community.id);
                                    if (res.success) {
                                      alert('Community successfully deleted.');
                                      onClose();
                                      router.push('/communities');
                                    } else {
                                      alert(res.error || 'Failed to delete community');
                                    }
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold transition-all disabled:opacity-40"
                              >
                                Teardown Community
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowDeleteInput(false); setDeleteConfirm(''); }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
export default function CommunityPage() {
  const { name } = useParams() as { name: string };

  useEffect(() => {
    console.log(`[FORENSICS] CommunityPage MOUNTED for name=${name}`);
    return () => {
      console.log(`[FORENSICS] CommunityPage UNMOUNTED for name=${name}`);
    };
  }, [name]);
  const router = useRouter();
  const currentUser = useAppStore(s => s.currentUser);
  const breakpoint = useAppStore(s => s.breakpoint);
  const messagesRestriction = useAppStore(s => s.messagesRestriction);
  const isMobile = breakpoint === 'mobile';
  const [mobileView, setMobileView] = useState<'channels' | 'chat'>('channels');

  useEffect(() => {
    if (isMobile && mobileView === 'chat') {
      document.documentElement.classList.add('community-chat-active');
    } else {
      document.documentElement.classList.remove('community-chat-active');
    }
    return () => {
      document.documentElement.classList.remove('community-chat-active');
    };
  }, [isMobile, mobileView]);

  const supabase = createClient();

  const [community, setCommunity] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [communityMembers, setCommunityMembers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const sortMessages = useCallback((list: ChatMessage[]) => {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.sent_at || 0).getTime() || 0;
      const timeB = new Date(b.sent_at || 0).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, []);

  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const setMessages = useCallback((update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesState(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      return sortMessages(next);
    });
  }, [sortMessages]);

  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<Set<string>>(new Set());
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser?.id) {
      try {
        const stored = localStorage.getItem(`locally_deleted_msgs_${name}_${currentUser.id}`);
        setLocallyDeletedIds(stored ? new Set(JSON.parse(stored)) : new Set());
      } catch {
        setLocallyDeletedIds(new Set());
      }
    } else {
      setLocallyDeletedIds(new Set());
    }
  }, [name, currentUser?.id]);
  const presenceChannelRef = useRef<any>(null);
  const msgBroadcastRef = useRef<any>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redesign state additions
  const [connectedVoice, setConnectedVoice] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [talkingUsersList, setTalkingUsersList] = useState<Record<string, boolean>>({});
  const [isDeleteChannelOpen, setIsDeleteChannelOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<any | null>(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  
  // Dynamic Real-time Voice States
  const [voiceChannelUsers, setVoiceChannelUsers] = useState<Record<string, { id: string; displayName: string; avatarUrl: string | null; isMuted: boolean; isDeafened: boolean }[]>>({});
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

  // Advanced channel creation fields
  const [newChannelPassword, setNewChannelPassword] = useState('');
  const [newChannelMaxMembers, setNewChannelMaxMembers] = useState<number>(0);
  const [newChannelSlowModeCooldown, setNewChannelSlowModeCooldown] = useState<number>(0);
  const [newChannelRequiresApproval, setNewChannelRequiresApproval] = useState(false);
  const [showNewChannelPwd, setShowNewChannelPwd] = useState(false);

  // Channel deletion notice (for users who are in a channel when admin deletes it)
  const [channelDeletedNotice, setChannelDeletedNotice] = useState<{ channelName: string } | null>(null);

  // Channel access control modal (password / approval-required gate)
  const [channelAccessModal, setChannelAccessModal] = useState<{ channel: any; mode: 'password' | 'approval' | 'pending' } | null>(null);
  const [channelPasswordInput, setChannelPasswordInput] = useState('');
  const [channelPasswordError, setChannelPasswordError] = useState('');
  const [isUnlockingChannel, setIsUnlockingChannel] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [isAccessRequested, setIsAccessRequested] = useState(false);

  // Track channels the current user has been granted access to (persist in session)
  const [unlockedChannels, setUnlockedChannels] = useState<Set<string>>(new Set());

  // Forwarding and Pinning States
  const [messageToForward, setMessageToForward] = useState<ChatMessage | null>(null);

  // Spam Prevention and Rate Limiting Cooldowns
  const [activeAlert, setActiveAlert] = useState<{ message: string; type: 'error' | 'warning' | 'success' | 'info' } | null>(null);
  const [isSlowmodeActive, setIsSlowmodeActive] = useState(false);
  const [slowmodeSeconds, setSlowmodeSeconds] = useState(0);

  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showAlert = useCallback((message: string, type: 'error' | 'warning' | 'success' | 'info' = 'warning') => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    setActiveAlert({ message, type });
    alertTimeoutRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!isSlowmodeActive) return;
    if (slowmodeSeconds <= 0) {
      setIsSlowmodeActive(false);
      return;
    }
    const timer = setTimeout(() => {
      setSlowmodeSeconds(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSlowmodeActive, slowmodeSeconds]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  // Zero-Latency Local Synchronization (Server-Sent Events & BroadcastChannel)
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const activeChannelIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<any>(null);
  const isMobileRef = useRef(isMobile);
  const mobileViewRef = useRef(mobileView);

  const channelsRef = useRef<any[]>([]);
  const isOwnerRef = useRef(false);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);



  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    mobileViewRef.current = mobileView;
  }, [mobileView]);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !activeChannelId) return;

    const eventSource = new EventSource(`/api/community/sync?channelId=${activeChannelId}`);
    const channel = new BroadcastChannel(`verlyn_community_sync_${activeChannelId}`);
    syncChannelRef.current = channel;

    const handleMessage = (data: any) => {
      try {
        const { type, payload } = data;
        if (!payload) return;

        if (type === 'message_sent') {
          const { channelId, message } = payload;
          if (channelId !== activeChannelId) return;

          // Evaluate is_mine based on the receiving tab's currentUser
          const isMine = message.sender_id === currentUserRef.current?.id;
          const mappedMessage = {
            ...message,
            is_mine: isMine
          };

          setMessages(prev => {
            if (prev.some(m => m.id === mappedMessage.id)) return prev;

            // Swap temp ID -> real UUID if match found
            if (mappedMessage.sender_id === currentUserRef.current?.id) {
              const optMatch = prev.find(
                m => m.sender_id === currentUserRef.current?.id && 
                     m.content === mappedMessage.content && 
                     m.id && typeof m.id === 'string' && m.id.startsWith('opt_')
              );
              if (optMatch) {
                return prev.map(m => m.id === optMatch.id ? { ...m, id: mappedMessage.id } : m);
              }
            }
            return [...prev, mappedMessage];
          });
        } else if (type === 'message_edited') {
          const { messageId, content, editedAt } = payload;
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited_at: editedAt } : m));
        } else if (type === 'message_deleted') {
          const { messageId } = payload;
          setMessages(prev => prev.filter(m => m.id !== messageId));
        } else if (type === 'message_pinned_toggled') {
          const { messageId, is_pinned } = payload;
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned } : m));
        } else if (type === 'message_reacted') {
          const { messageId, emoji, userId } = payload;
          const currentUserId = currentUserRef.current?.id;
          setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              const currentReactions = m.reactions || [];
              const previousReaction = currentReactions.find(r => (r.userIds || []).includes(userId));
              let nextReactions = currentReactions;

              // Step 1: Remove user from previous reaction
              if (previousReaction) {
                nextReactions = nextReactions.map(r => {
                  if (r.emoji === previousReaction.emoji) {
                    const newUserIds = (r.userIds || []).filter(uid => uid !== userId);
                    const hasSelf = currentUserId ? newUserIds.includes(currentUserId) : false;
                    return { ...r, count: newUserIds.length, reacted: hasSelf, userIds: newUserIds };
                  }
                  return r;
                }).filter(r => r.count > 0);
              }

              // Step 2: Add user to new reaction if it's different
              if (!previousReaction || previousReaction.emoji !== emoji) {
                const existingGroup = nextReactions.find(r => r.emoji === emoji);
                if (existingGroup) {
                  nextReactions = nextReactions.map(r => {
                    if (r.emoji === emoji) {
                      const newUserIds = [...(r.userIds || []), userId];
                      const hasSelf = currentUserId ? newUserIds.includes(currentUserId) : false;
                      return { ...r, count: newUserIds.length, reacted: hasSelf, userIds: newUserIds };
                    }
                    return r;
                  });
                } else {
                  nextReactions = [...nextReactions, {
                    emoji,
                    count: 1,
                    reacted: userId === currentUserId,
                    userIds: [userId]
                  }];
                }
              }

              return { ...m, reactions: nextReactions };
            }
            return m;
          }));
        }
      } catch (err) {
        console.error("Failed to parse sync event data:", err);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        handleMessage(parsed);
      } catch (err) {
        console.error("Failed to parse SSE event data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE connection error. Browser will automatically attempt to reconnect.", err);
    };

    channel.onmessage = (event) => {
      handleMessage(event.data);
    };

    return () => {
      eventSource.close();
      channel.close();
      syncChannelRef.current = null;
    };
  }, [activeChannelId]);

  // Owner Control Panel state
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [memberNickname, setMemberNickname] = useState<string>('');
  const [memberZkBadge, setMemberZkBadge] = useState<string>('None');
  const [isVerlynPremium, setIsVerlynPremium] = useState<boolean>(false);
  const [memberBoostsUsed, setMemberBoostsUsed] = useState<number>(0);
  const [themeColor, setThemeColor] = useState<'violet' | 'emerald' | 'crimson' | 'amber' | 'sky'>('violet');
  const [raidMode, setRaidMode] = useState<boolean>(false);
  const [messagingLocked, setMessagingLocked] = useState<boolean>(false);
  // Section tab: 'chat' | 'posts' | 'about'
  const [communitySection, setCommunitySection] = useState<'chat' | 'posts' | 'about'>('chat');
  const [bannedKeywords, setBannedKeywords] = useState<string[]>([]);

  // Lifted Control Centre states
  const [spamLevel, setSpamLevel] = useState<'low' | 'medium' | 'strict'>('medium');
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [spamRateLimit, setSpamRateLimit] = useState<number>(5);
  const [allowLinks, setAllowLinks] = useState<boolean>(true);
  const [maxMentions, setMaxMentions] = useState<number>(4);
  const [webhooks, setWebhooks] = useState<any[]>(DEFAULT_WEBHOOKS);
  const [emojis, setEmojis] = useState<any[]>(DEFAULT_EMOJIS);
  const [boostsCount, setBoostsCount] = useState<number>(12);

  const activeLevel = BOOST_LEVELS.filter(l => boostsCount >= l.req).reduce((max, l) => l.level > max ? l.level : max, 0);
  const nextLevelItem = BOOST_LEVELS.find(l => l.req > boostsCount);

  const [boostersList, setBoostersList] = useState<any[]>(DEFAULT_BOOSTERS);
  const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
  const [enableRulesGate, setEnableRulesGate] = useState<boolean>(false);
  const [vanityUrl, setVanityUrl] = useState<string>('verlyn-hq');
  const [invites, setInvites] = useState<any[]>(DEFAULT_INVITES);
  const [customRoles, setCustomRoles] = useState<any[]>(DEFAULT_CUSTOM_ROLES);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(DEFAULT_ROLE_PERMISSIONS);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rulesAccepted, setRulesAccepted] = useState<boolean>(false);

  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem(`comm_theme_${name}`);
    if (savedTheme !== null) setThemeColor(savedTheme as any);

    const savedRaid = localStorage.getItem(`raid_mode_${name}`);
    if (savedRaid !== null) setRaidMode(savedRaid === 'true');

    const savedMsgLocked = localStorage.getItem(`messaging_locked_${name}`);
    if (savedMsgLocked !== null) setMessagingLocked(savedMsgLocked === 'true');

    const savedKeywords = localStorage.getItem(`banned_keywords_${name}`);
    if (savedKeywords !== null) {
      try { setBannedKeywords(JSON.parse(savedKeywords)); } catch (e) {}
    }

    const savedSpam = localStorage.getItem(`spam_level_${name}`);
    if (savedSpam !== null) setSpamLevel(savedSpam as any);

    const savedBannedUsers = localStorage.getItem(`banned_users_${name}`);
    if (savedBannedUsers !== null) {
      try { setBannedUsers(JSON.parse(savedBannedUsers)); } catch (e) {}
    }

    const savedSpamRateLimit = localStorage.getItem(`spam_rate_limit_${name}`);
    if (savedSpamRateLimit !== null) setSpamRateLimit(parseInt(savedSpamRateLimit) || 5);

    const savedAllowLinks = localStorage.getItem(`allow_links_${name}`);
    if (savedAllowLinks !== null) setAllowLinks(savedAllowLinks === 'true');

    const savedMaxMentions = localStorage.getItem(`max_mentions_${name}`);
    if (savedMaxMentions !== null) setMaxMentions(parseInt(savedMaxMentions) || 4);

    const savedWebhooks = localStorage.getItem(`webhooks_${name}`);
    if (savedWebhooks !== null) {
      try { setWebhooks(JSON.parse(savedWebhooks)); } catch (e) {}
    }

    const savedEmojis = localStorage.getItem(`emojis_${name}`);
    if (savedEmojis !== null) {
      try { setEmojis(JSON.parse(savedEmojis)); } catch (e) {}
    }

    const savedBoostsCount = localStorage.getItem(`boosts_count_${name}`);
    if (savedBoostsCount !== null) setBoostsCount(parseInt(savedBoostsCount) || 12);

    const savedBoostersList = localStorage.getItem(`boosters_list_${name}`);
    if (savedBoostersList !== null) {
      try { setBoostersList(JSON.parse(savedBoostersList)); } catch (e) {}
    }

    const savedRules = localStorage.getItem(`rules_${name}`);
    if (savedRules !== null) {
      try { setRules(JSON.parse(savedRules)); } catch (e) {}
    }

    const savedEnableRulesGate = localStorage.getItem(`enable_rules_gate_${name}`);
    if (savedEnableRulesGate !== null) setEnableRulesGate(savedEnableRulesGate === 'true');

    const savedVanityUrl = localStorage.getItem(`vanity_url_${name}`);
    if (savedVanityUrl !== null) setVanityUrl(savedVanityUrl);

    const savedInvites = localStorage.getItem(`invites_${name}`);
    if (savedInvites !== null) {
      try { setInvites(JSON.parse(savedInvites)); } catch (e) {}
    }

    const savedCustomRoles = localStorage.getItem(`custom_roles_${name}`);
    if (savedCustomRoles !== null) {
      try { setCustomRoles(JSON.parse(savedCustomRoles)); } catch (e) {}
    }

    const savedRolePermissions = localStorage.getItem(`role_permissions_${name}`);
    if (savedRolePermissions !== null) {
      try { setRolePermissions(JSON.parse(savedRolePermissions)); } catch (e) {}
    }

    const savedAuditLogs = localStorage.getItem(`audit_logs_${name}`);
    if (savedAuditLogs !== null) {
      try { setAuditLogs(JSON.parse(savedAuditLogs)); } catch (e) {}
    }

    if (currentUser?.id) {
      const savedNick = localStorage.getItem(`member_nick_${name}_${currentUser.id}`);
      if (savedNick !== null) setMemberNickname(savedNick);

      const savedBadge = localStorage.getItem(`member_zk_badge_${name}_${currentUser.id}`);
      if (savedBadge !== null) setMemberZkBadge(savedBadge);

      const savedPremium = localStorage.getItem(`verlyn_premium_${currentUser.id}`);
      if (savedPremium !== null) setIsVerlynPremium(savedPremium === 'true');

      const savedBoostsUsed = localStorage.getItem(`global_boosts_used_${currentUser.id}`);
      if (savedBoostsUsed !== null) setMemberBoostsUsed(parseInt(savedBoostsUsed) || 0);

      const savedRulesAccepted = localStorage.getItem(`rules_accepted_${name}_${currentUser.id}`);
      if (savedRulesAccepted !== null) setRulesAccepted(savedRulesAccepted === 'true');
    }

    isLoadedRef.current = true;
  }, [name, currentUser?.id]);

  const handleAcceptRules = () => {
    if (!currentUser?.id) return;
    setRulesAccepted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`rules_accepted_${name}_${currentUser.id}`, 'true');
    }
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.verlyn.in';
    let link = `${base}/community/${community?.name || name}`;
    if (activeLevel >= 3 && vanityUrl) {
      link = `${base}/community/${vanityUrl}`;
    } else if (invites && invites.length > 0) {
      link = `${base}/community/${community?.name || name}?invite=${invites[0].code}`;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const triggerWebhooks = (channelId: string, content: string, msgType: string, mediaUrl?: string) => {
    if (!activeChannelId) return;
    const activeChan = channels.find(c => c.id === channelId);
    const channelName = activeChan ? activeChan.name : 'unknown';
    const activeWebhooks = webhooks.filter(w => w.channelId === channelId || !w.channelId || w.channelId === '');
    activeWebhooks.forEach(wh => {
      const payload = {
        event: "message.created",
        channel: channelName,
        sender: currentUser?.displayName || 'User',
        content: content,
        type: msgType,
        media_url: mediaUrl || null,
        timestamp: new Date().toISOString()
      };
      
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setAuditLogs((prev: any[]) => [
        { 
          id: `wh-log-${Date.now()}-${Math.random()}`, 
          time, 
          type: 'webhook', 
          desc: `Triggered Webhook "${wh.name}" on #${channelName}. Payload sent to ${wh.url}`, 
          actor: 'System (Automated)' 
        },
        ...prev
      ]);

      let headersObj = { "Content-Type": "application/json" };
      try {
        if (typeof wh.headers === 'string' && wh.headers.trim()) {
          headersObj = JSON.parse(wh.headers);
        } else if (wh.headers && typeof wh.headers === 'object') {
          headersObj = { ...headersObj, ...wh.headers };
        }
      } catch (err) {
        console.error("Failed to parse webhook headers:", err);
      }

      fetch(wh.url, {
        method: 'POST',
        headers: headersObj,
        body: JSON.stringify(payload)
      }).catch(err => {
        console.warn("Webhook fetch failed (expected if mock or CORS):", err);
      });
    });
  };

  const messageTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`comm_theme_${name}`, themeColor);
    }
  }, [themeColor, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`raid_mode_${name}`, raidMode ? 'true' : 'false');
    }
  }, [raidMode, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`banned_keywords_${name}`, JSON.stringify(bannedKeywords));
    }
  }, [bannedKeywords, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`spam_level_${name}`, spamLevel);
    }
  }, [spamLevel, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`banned_users_${name}`, JSON.stringify(bannedUsers));
    }
  }, [bannedUsers, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`spam_rate_limit_${name}`, spamRateLimit.toString());
    }
  }, [spamRateLimit, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`allow_links_${name}`, allowLinks ? 'true' : 'false');
    }
  }, [allowLinks, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`max_mentions_${name}`, maxMentions.toString());
    }
  }, [maxMentions, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`webhooks_${name}`, JSON.stringify(webhooks));
    }
  }, [webhooks, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`emojis_${name}`, JSON.stringify(emojis));
    }
  }, [emojis, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`boosts_count_${name}`, boostsCount.toString());
    }
  }, [boostsCount, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`boosters_list_${name}`, JSON.stringify(boostersList));
    }
  }, [boostersList, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`rules_${name}`, JSON.stringify(rules));
    }
  }, [rules, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`enable_rules_gate_${name}`, enableRulesGate ? 'true' : 'false');
    }
  }, [enableRulesGate, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`vanity_url_${name}`, vanityUrl);
    }
  }, [vanityUrl, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`invites_${name}`, JSON.stringify(invites));
    }
  }, [invites, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`custom_roles_${name}`, JSON.stringify(customRoles));
    }
  }, [customRoles, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`role_permissions_${name}`, JSON.stringify(rolePermissions));
    }
  }, [rolePermissions, name]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      localStorage.setItem(`audit_logs_${name}`, JSON.stringify(auditLogs));
    }
  }, [auditLogs, name]);

  const handleKickMember = async (userId: string) => {
    if (!community?.id) return;
    const res = await toggleCommunityJoin(community.id, userId, false);
    if (res.success) {
      setCommunityMembers(prev => prev.filter(m => m.user_id !== userId));
    } else {
      alert(res.error || "Failed to kick member");
    }
  };

  const isOwner = community?.isAdmin === true ||
    (!!currentUser?.id && (community?.memberRoles ?? []).some((m: any) =>
      m.user_id === currentUser.id && (m.role === 'admin' || m.role === 'owner')
    )) ||
    (!!currentUser?.id && communityMembers.some((m: any) =>
      m.user_id === currentUser.id && (m.role === 'admin' || m.role === 'owner')
    ));

  useEffect(() => {
    isOwnerRef.current = isOwner;
  }, [isOwner]);

  const localRole = typeof window !== 'undefined' && currentUser?.id ? localStorage.getItem(`member_role_${name}_${currentUser.id}`) : null;
  const myPerms = useMemo(() => {
    if (!currentUser?.id) return {};
    const currentMember = communityMembers.find(m => m.user_id === currentUser.id);
    const currentMemberRole = currentMember?.role || 'member';
    return rolePermissions[currentMemberRole] || rolePermissions[currentMemberRole.toLowerCase()] || rolePermissions.member || {};
  }, [communityMembers, currentUser?.id, rolePermissions]);

  const canDeleteOthers = isOwner || 
    localRole === 'admin' || 
    localRole === 'moderator' ||
    !!(currentUser?.displayName && (getMemberRoleBadge(currentUser.displayName).label === "STAFF" || getMemberRoleBadge(currentUser.displayName).label === "MODERATOR")) ||
    !!(currentUser?.username && (getMemberRoleBadge(currentUser.username).label === "STAFF" || getMemberRoleBadge(currentUser.username).label === "MODERATOR"));

  const handlePinMessage = useCallback(async (msg: ChatMessage) => {
    if (!currentUser?.id) return;
    if (!isOwner && myPerms.pinMessages === false) {
      alert("You do not have permission to pin/unpin messages in this community.");
      return;
    }
    
    // Toggle optimistically
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: !m.is_pinned } : m));

    const res = await toggleCommunityMessagePinDB(currentUser.id, msg.id, !!msg.is_pinned);
    if (!res.success) {
      // Revert
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: msg.is_pinned } : m));
    }
  }, [currentUser?.id, isOwner, myPerms.pinMessages]);

  const jumpToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add custom visual glow highlighting directly to the message item card
      const innerCard = el.querySelector('.message-bubble-container') || el.firstElementChild;
      if (innerCard) {
        innerCard.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/20', 'scale-[1.01]', 'transition-all', 'duration-500');
        setTimeout(() => {
          innerCard.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/20', 'scale-[1.01]');
        }, 2000);
      }
    }
  }, []);

  const handleForwardMessage = useCallback((msg: ChatMessage) => {
    setMessageToForward(msg);
  }, []);

  const handleConfirmForward = async (targetChannelId: string) => {
    if (!messageToForward || !currentUser?.id) return;
    
    setMessageToForward(null);

    const res = await sendCommunityMessage(
      targetChannelId,
      currentUser.id,
      messageToForward.content,
      messageToForward.type,
      messageToForward.media_url
    );

    if (res.success) {
      if (targetChannelId === activeChannelId) {
        setMessages(prev => [...prev, {
          id: res.data.id,
          content: res.data.content,
          sender_id: res.data.sender_id,
          sent_at: res.data.sent_at,
          is_mine: true,
          status: 'sent',
          type: res.data.type as any,
          media_url: res.data.media_url,
          file_name: res.data.type === 'file' || res.data.type === 'image' ? res.data.content : undefined,
          reactions: [],
        } as ChatMessage]);
      }
    } else {
      alert(`Failed to forward message: ${res.error}`);
    }
  };

  useEffect(() => {
    if (!connectedVoice) {
      setTalkingUsersList({});
      return;
    }
    const VOICE_USERS = ["Shinichiro", "Sato", "Aoi", "Lumine", "Kazu"];
    const interval = setInterval(() => {
      const newTalking: Record<string, boolean> = {};
      VOICE_USERS.forEach(u => {
        if (Math.random() > 0.6) {
          newTalking[u] = true;
        }
      });
      setTalkingUsersList(newTalking);
    }, 2800);
    return () => clearInterval(interval);
  }, [connectedVoice]);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !community?.id) return;
    setIsCreatingChannel(true);
    const finalName = enforceMinChannelName(newChannelName);
    const res = await createCommunityChannelDB(
      community.id,
      finalName,
      undefined,
      {
        type: newChannelType,
        password: newChannelPassword.trim() || undefined,
        maxMembers: newChannelMaxMembers > 0 ? newChannelMaxMembers : undefined,
        slowModeCooldown: newChannelSlowModeCooldown,
        requiresApproval: newChannelRequiresApproval,
      }
    );
    if (res.success && res.channel) {
      // Realtime listener also handles this, local update ensures instant UX
      setChannels(prev => prev.some(c => c.id === res.channel.id) ? prev : [...prev, res.channel]);
      if (newChannelType === 'text') {
        setActiveChannelId(res.channel.id);
        if (isMobile) setMobileView('chat');
      }
      setNewChannelName("");
      setNewChannelType("text");
      setNewChannelPassword("");
      setNewChannelMaxMembers(0);
      setNewChannelSlowModeCooldown(0);
      setNewChannelRequiresApproval(false);
      setShowNewChannelPwd(false);
      setIsCreateChannelOpen(false);
    } else {
      alert(res.error || "Failed to create channel");
    }
    setIsCreatingChannel(false);
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!community?.id) return;
    setIsDeletingChannel(true);
    const res = await deleteCommunityChannelDB(community.id, channelId);
    if (res.success) {
      const remaining = channels.filter(c => c.id !== channelId);
      setChannels(remaining);
      if (activeChannelId === channelId) {
        if (remaining.length > 0) {
          setActiveChannelId(remaining[0].id);
        } else {
          setActiveChannelId(null);
        }
      }
      setIsDeleteChannelOpen(false);
      setChannelToDelete(null);
    } else {
      alert(res.error || "Failed to delete channel");
    }
    setIsDeletingChannel(false);
  };

  // ── Channel Access Gate Handlers ───────────────────────────────────────────
  const handleChannelClick = useCallback((c: any) => {
    // Owner/admin bypasses all access gates
    if (isOwner) {
      setActiveChannelId(c.id);
      if (isMobile) setMobileView('chat');
      return;
    }
    // Password-protected channel - check if already unlocked
    if (c.password && !unlockedChannels.has(c.id)) {
      setChannelAccessModal({ channel: c, mode: 'password' });
      setChannelPasswordInput('');
      setChannelPasswordError('');
      return;
    }
    // Approval-required channel - check if already unlocked
    if (c.requires_approval && !unlockedChannels.has(c.id)) {
      setChannelAccessModal({ channel: c, mode: 'approval' });
      setIsAccessRequested(false);
      return;
    }
    // Open access
    setActiveChannelId(c.id);
    if (isMobile) setMobileView('chat');
  }, [isOwner, isMobile, unlockedChannels]);

  const handleUnlockChannel = async () => {
    if (!channelAccessModal?.channel || !channelPasswordInput.trim()) return;
    setIsUnlockingChannel(true);
    setChannelPasswordError('');
    const res = await unlockChannelWithPasswordDB(channelAccessModal.channel.id, channelPasswordInput);
    if (res.success) {
      setUnlockedChannels(prev => new Set([...prev, channelAccessModal.channel.id]));
      setActiveChannelId(channelAccessModal.channel.id);
      if (isMobile) setMobileView('chat');
      setChannelAccessModal(null);
      setChannelPasswordInput('');
    } else {
      setChannelPasswordError(res.error || 'Incorrect passcode. Please try again.');
    }
    setIsUnlockingChannel(false);
  };

  const handleRequestChannelAccess = async () => {
    if (!channelAccessModal?.channel) return;
    setIsRequestingAccess(true);
    const res = await requestChannelAccessDB(channelAccessModal.channel.id);
    setIsRequestingAccess(false);
    if (res.success) {
      setIsAccessRequested(true);
    }
  };

  // ── Realtime Channel List Sync (instant deletion/creation for ALL users) ──
  useEffect(() => {
    if (!community?.id || !currentUser?.id) return;

    const channelListCh = supabase
      .channel(`community_channel_list:${community.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_channels', filter: `community_id=eq.${community.id}` },
        (payload: any) => {
          setChannels(prev => {
            if (prev.some(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_channels', filter: `community_id=eq.${community.id}` },
        (payload: any) => {
          setChannels(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_channels', filter: `community_id=eq.${community.id}` },
        (payload: any) => {
          const deletedId = payload.old.id;
          const deletedName = payload.old.name || 'channel';
          setChannels(prev => prev.filter(c => c.id !== deletedId));
          // Notify user if they are currently in the deleted channel
          setActiveChannelId(prev => {
            if (prev === deletedId) {
              setChannelDeletedNotice({ channelName: deletedName });
              return null;
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_channel_members', filter: `user_id=eq.${currentUser.id}` },
        (payload: any) => {
          const channelId = payload.old.channel_id;
          setUnlockedChannels(prev => {
            const next = new Set(prev);
            next.delete(channelId);
            return next;
          });
          // If viewing this channel and not the owner/admin, prompt password modal
          if (activeChannelIdRef.current === channelId && !isOwnerRef.current) {
            const ch = channelsRef.current.find(c => c.id === channelId);
            if (ch) {
              setChannelAccessModal({ channel: ch, mode: 'password' });
              setActiveChannelId(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelListCh);
    };
  }, [community?.id, currentUser?.id, supabase]);

  // ── Load Data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (!name) return;
      setLoadingChannels(true);
      const resComm = await getCommunityByName(name);
      if (resComm.success && resComm.community) {
        const comm = resComm.community;
        setCommunity(comm);

        // Fetch unlocked channels, channels, and members in parallel
        const [unlockedRes, res, memRes] = await Promise.all([
          getUserChannelMembershipsDB(comm.id),
          getCommunityChannels(comm.id),
          getCommunityMembers(comm.id)
        ]);

        const unlockedSet = new Set<string>(unlockedRes.success && unlockedRes.channelIds ? unlockedRes.channelIds : []);
        setUnlockedChannels(unlockedSet);

        if (res.success && res.channels) {
          setChannels(res.channels);
          if (res.channels.length > 0) {
            const isOwner = comm.isAdmin === true || comm.role === 'owner' || comm.role === 'admin';
            const firstAccessible = res.channels.find((c: any) => {
              const isLocked = (c.password && !unlockedSet.has(c.id)) || (c.requires_approval && !unlockedSet.has(c.id));
              return isOwner || !isLocked;
            });
            setActiveChannelId(firstAccessible ? firstAccessible.id : res.channels[0].id);
          }
        }
        if (memRes.success && memRes.members) {
          const membersWithOverrides = memRes.members.map((m: any) => {
            const savedRole = localStorage.getItem(`member_role_${name}_${m.user_id}`);
            return savedRole ? { ...m, role: savedRole } : m;
          });
          setCommunityMembers(membersWithOverrides);
        }
      }
      setLoadingChannels(false);
    }
    loadData();
  }, [name, supabase]);

  // ── Realtime Presence & Voice Tracking ────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id || !community?.id) return;
    if (presenceChannelRef.current) return;

    const channel = supabase.channel(`community_presence:${community.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineSet = new Set<string>();
      const voiceUsers: Record<string, { id: string; displayName: string; avatarUrl: string | null; isMuted: boolean; isDeafened: boolean }[]> = {};

      for (const [userId, presences] of Object.entries(state)) {
        onlineSet.add(userId);
        const p = (presences as any[])[0];
        if (p?.voice_channel_id) {
          if (!voiceUsers[p.voice_channel_id]) {
            voiceUsers[p.voice_channel_id] = [];
          }
          voiceUsers[p.voice_channel_id].push({
            id: userId,
            displayName: p.displayName || p.username || "User",
            avatarUrl: p.avatarUrl || null,
            isMuted: !!p.isMuted,
            isDeafened: !!p.isDeafened,
          });
        }
      }
      setOnlineUsers(onlineSet);
      setVoiceChannelUsers(voiceUsers);
    })
    .on('broadcast', { event: 'voice_talking' }, ({ payload }: any) => {
      if (!payload || !payload.userId) return;
      setTalkingUsersList(prev => ({
        ...prev,
        [payload.userId]: !!payload.talking
      }));
    });

    channel.subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          online_at: new Date().toISOString(),
          voice_channel_id: connectedVoice,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatarUrl: currentUser.avatar,
          isMuted,
          isDeafened
        });
      }
    });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [community?.id, currentUser?.id, supabase]);

  // Keep presence tracked state in sync with voice changes
  useEffect(() => {
    const channel = presenceChannelRef.current;
    if (!channel || !currentUser?.id) return;
    channel.track({
      online_at: new Date().toISOString(),
      voice_channel_id: connectedVoice,
      displayName: currentUser.displayName,
      username: currentUser.username,
      avatarUrl: currentUser.avatar,
      isMuted,
      isDeafened
    }).catch((e: any) => console.warn("[Presence] track failed:", e));
  }, [connectedVoice, isMuted, isDeafened, currentUser]);

  // Deafen auto-mute sync
  useEffect(() => {
    if (isDeafened) {
      setIsMuted(true);
    }
  }, [isDeafened]);

  // ── Web Audio VAD & Broadcast ─────────────────────────────────────────────
  useEffect(() => {
    if (!connectedVoice || isMuted || isDeafened || !currentUser?.id) {
      // Disconnected or muted — broadcast talking: false
      const presenceCh = presenceChannelRef.current;
      if (presenceCh && currentUser?.id) {
        presenceCh.send({
          type: 'broadcast',
          event: 'voice_talking',
          payload: { userId: currentUser.id, talking: false }
        }).catch(() => {});
      }
      setTalkingUsersList(prev => {
        const next = { ...prev };
        if (currentUser?.id) delete next[currentUser.id];
        return next;
      });
      analyserNodeRef.current = null;
      return;
    }

    const currentUserId = currentUser.id;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let localStream: MediaStream | null = null;
    let isCurrentlyTalking = false;
    let intervalId: NodeJS.Timeout | null = null;

    async function initVad() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream = stream;

        // Double check state hasn't changed during mic prompt
        if (!connectedVoice || isMuted || isDeafened) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyserNodeRef.current = analyser;
        
        microphone = audioContext.createMediaStreamSource(stream);
        analyser.fftSize = 256;
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          
          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const averageVolume = total / bufferLength;
          
          // Noise gate threshold: 12 (out of 255)
          const isUserSpeaking = averageVolume > 12;

          if (isUserSpeaking !== isCurrentlyTalking) {
            isCurrentlyTalking = isUserSpeaking;
            
            // Broadcast state via community presence channel (community-wide)
            const presenceCh = presenceChannelRef.current;
            if (presenceCh) {
              presenceCh.send({
                type: 'broadcast',
                event: 'voice_talking',
                payload: { userId: currentUserId, talking: isCurrentlyTalking }
              }).catch(() => {});
            }

            // Update local state
            setTalkingUsersList(prev => ({
              ...prev,
              [currentUserId]: isCurrentlyTalking
            }));
          }
        };

        intervalId = setInterval(checkVolume, 100);
      } catch (err) {
        console.warn("[VAD] Microphone initialization failed:", err);
      }
    }

    initVad();

    return () => {
      if (intervalId) clearInterval(intervalId);
      analyserNodeRef.current = null;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [connectedVoice, isMuted, isDeafened, currentUser?.id]);

  // ── Canvas Audio Visualizer Animation Loop ────────────────────────────────
  useEffect(() => {
    if (!connectedVoice) return;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bufferLength = 64;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserNodeRef.current;
      if (!analyser || isMuted || isDeafened) {
        // Draw standard clean flatline with low opacity
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      analyser.getByteTimeDomainData(dataArray);

      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // emerald green

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [connectedVoice, isMuted, isDeafened]);


  // ── Messages Loader ───────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (chanId: string, silent: boolean = false) => {
    if (!silent) setLoadingMsgs(true);
    // Record the wall-clock time BEFORE the async DB call starts.
    // Any message the user sends after this point is "in flight" and must not be wiped.
    const fetchStartedAt = Date.now();
    const res = await getCommunityMessages(chanId);
    if (chanId !== activeChannelIdRef.current) return;
    if (res.success && res.messages) {
      const mapped = res.messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sent_at: m.sent_at,
        is_mine: m.sender_id === currentUser?.id,
        status: 'sent' as const,
        type: m.type as any,
        media_url: m.media_url,
        file_name: m.type === 'file' || m.type === 'image' ? m.content : undefined,
        reactions: groupReactions(m.reactions || [], currentUser?.id),
        viewed_by: m.viewed_by || [],
        sender: {
          display_name: m.sender?.display_name || m.sender_display || 'User',
          username: m.sender?.username || 'user',
          avatar_url: m.sender?.avatar_url || null,
        }
      }));

      // Messages loaded. Seen marking is now handled reactively by a separate useEffect below.

      setMessages(prev => {
        // Preserve messages the user sent WHILE this fetch was in flight.
        // Identification: either still has opt_ prefix (optimistic, not yet confirmed)
        // OR has a real UUID but is newer than when the fetch started (just confirmed).
        // Both appear in `prev` but not in `mapped` (DB snapshot taken before they were inserted).
        const mappedIdSet = new Set(mapped.map(m => m.id));
        const inFlightMessages = prev.filter(m => {
          // Already confirmed with a real UUID from DB — keep it
          if (mappedIdSet.has(m.id)) return false;
          // Still pending with opt_ id — definitely in flight
          if (typeof m.id === 'string' && (m.id as string).startsWith('opt_')) return true;
          // Confirmed (real UUID) but DB snapshot was taken before it was committed
          const sentAt = m.sent_at ? new Date(m.sent_at).getTime() : 0;
          return sentAt >= fetchStartedAt || m.status === 'sending';
        });

        const merged = [...mapped, ...inFlightMessages];

        // Optimization: skip re-render if nothing actually changed
        if (inFlightMessages.length === 0) {
          const matchesPrev = prev.length === mapped.length && prev.every((msg, idx) => {
            const m2 = mapped[idx];
            if (!m2) return false;
            const basicMatch = msg.id === m2.id && msg.content === m2.content && msg.status === m2.status
              && (msg.viewed_by?.length ?? 0) === (m2.viewed_by?.length ?? 0);
            if (!basicMatch) return false;
            const reactions1 = msg.reactions || [];
            const reactions2 = m2.reactions || [];
            if (reactions1.length !== reactions2.length) return false;
            return reactions1.every((r, rIdx) => {
              const r2 = reactions2[rIdx];
              return r2 && r.emoji === r2.emoji && r.count === r2.count && r.reacted === r2.reacted;
            });
          });
          if (matchesPrev) return prev;
        }

        return merged;
      });
      setHasMore(res.messages.length === 50);
    } else {
      // DB returned empty or error. Only clear messages if there are no in-flight messages.
      setMessages(prev => {
        const hasInFlight = prev.some(
          m => (typeof m.id === 'string' && (m.id as string).startsWith('opt_')) ||
               m.status === 'sending' ||
               (m.sent_at ? new Date(m.sent_at).getTime() >= fetchStartedAt : false)
        );
        return hasInFlight ? prev : [];
      });
      setHasMore(false);
    }
    if (!silent) setLoadingMsgs(false);
  }, [currentUser?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeChannelId || loadingMore || !hasMore || messages.length === 0) return;
    const chanId = activeChannelId;
    setLoadingMore(true);
    const oldestMessage = messages[0];
    const beforeTimestamp = oldestMessage?.sent_at;
    if (!beforeTimestamp) {
      setLoadingMore(false);
      return;
    }

    const res = await getCommunityMessages(chanId, beforeTimestamp);
    if (chanId !== activeChannelIdRef.current) return;
    if (res.success && res.messages && res.messages.length > 0) {
      const mapped = res.messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sent_at: m.sent_at,
        is_mine: m.sender_id === currentUser?.id,
        status: 'sent' as const,
        type: m.type as any,
        media_url: m.media_url,
        file_name: m.type === 'file' || m.type === 'image' ? m.content : undefined,
        reactions: groupReactions(m.reactions || [], currentUser?.id),
        sender: {
          display_name: m.sender?.display_name || m.sender_display || 'User',
          username: m.sender?.username || 'user',
          avatar_url: m.sender?.avatar_url || null,
        }
      }));

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const filteredNew = mapped.filter(m => !existingIds.has(m.id));
        return [...filteredNew, ...prev];
      });
      setHasMore(res.messages.length === 50);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [activeChannelId, loadingMore, hasMore, messages, currentUser?.id]);

  useEffect(() => {
    if (activeChannelId) {
      activeChannelIdRef.current = activeChannelId;
      setHasMore(false);
      setLoadingMore(false);
      // Clear stale format caches so the incremental diff starts fresh on new channel
      prevMsgsCacheRef.current = [];
      prevFormattedCacheRef.current = [];
      fetchMessages(activeChannelId);
    }
  }, [activeChannelId, fetchMessages]);

  // Apply channel slow mode from DB when entering a channel (non-owners only)
  useEffect(() => {
    if (!activeChannelId || isOwner) return;
    const ch = channels.find(c => c.id === activeChannelId);
    const cooldown = ch?.slow_mode_cooldown;
    if (cooldown && cooldown > 0) {
      setIsSlowmodeActive(true);
      setSlowmodeSeconds(cooldown);
    }
  }, [activeChannelId, channels, isOwner]);

  // ── Reactive Seen receipts marking ──
  // Only mark messages as seen when the chat pane is actually visible to the user
  const isChatVisible = !isMobile || mobileView === 'chat';

  useEffect(() => {
    if (!isChatVisible || !activeChannelId || !currentUser?.id || messages.length === 0) return;

    const uid = currentUser.id;
    // Find all messages that are not sent by us and we haven't seen yet
    const unseenMsgs = messages.filter(m => m.sender_id !== uid && !(m.viewed_by || []).includes(uid));

    if (unseenMsgs.length > 0) {
      const unseenIds = unseenMsgs.map(m => m.id);

      // Optimistically update local state immediately so seen indicator updates instantly
      setMessages(prev => prev.map(m => {
        if (m.sender_id !== uid && unseenIds.includes(m.id) && !(m.viewed_by || []).includes(uid)) {
          return { ...m, viewed_by: [...(m.viewed_by || []), uid] };
        }
        return m;
      }));

      // Call database API to mark them as seen
      markCommunityMessagesSeen(unseenIds, uid).then(result => {
        if (result.success && result.viewedBy) {
          // Patch with final authoritative data
          setMessages(prev => prev.map(m => {
            const fresh = result.viewedBy![m.id];
            return fresh !== undefined ? { ...m, viewed_by: fresh } : m;
          }));

          // Broadcast to other screens in real time
          if (msgBroadcastRef.current) {
            msgBroadcastRef.current.send({
              type: 'broadcast',
              event: 'seen',
              payload: { viewedBy: result.viewedBy },
            });
          }
        }
      });
    }
  }, [isChatVisible, activeChannelId, messages.map(m => m.id).join(','), currentUser?.id]);



  useEffect(() => {
    if (!activeChannelId) return;

    // ── CHANNEL 1: Zero-latency broadcast (instant delivery via WebSocket) ────
    // Separate channel dedicated to broadcast only — do NOT mix with postgres_changes.
    // self:false means sender doesn't receive their own broadcast echo.
    const broadcastCh = supabase.channel(`community_broadcast:${activeChannelId}`, {
      config: { broadcast: { self: false } },
    })
      .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
        if (!payload || payload.channel_id !== activeChannelId) return;

        // ── Instant seen ACK (<200ms, pure WebSocket, no DB wait) ──
        const isChatVisible = !isMobileRef.current || mobileViewRef.current === 'chat';
        if (isChatVisible && payload.sender_id !== currentUser?.id && currentUser?.id && msgBroadcastRef.current) {
          msgBroadcastRef.current.send({
            type: 'broadcast',
            event: 'seen_ack',
            payload: { messageId: payload.id, userId: currentUser.id },
          });
        }

        setMessages(prev => {
          // Already have this exact message (by ID or by content+sender match for own optimistic)
          const already = prev.some(m =>
            m.id === payload.id ||
            (m.sender_id === payload.sender_id && m.content === payload.content && typeof (m.id as any) === 'string' && (m.id as string).startsWith('opt_'))
          );
          if (already) return prev;
          return [...prev, {
            id: payload.id, // temp opt_ ID from sender — will be swapped when postgres_changes fires
            content: payload.content,
            sender_id: payload.sender_id,
            sent_at: payload.sent_at,
            is_mine: payload.sender_id === currentUser?.id,
            status: 'sent' as const,
            type: payload.type || 'text',
            media_url: payload.media_url,
            file_name: payload.type === 'file' || payload.type === 'image' ? payload.content : undefined,
            reactions: [],
            sender: payload.sender,
            reply_to: payload.reply_to,
          } as ChatMessage];
        });
      })
      // ── Seen receipt broadcast — from fetchMessages (initial load) ──
      .on('broadcast', { event: 'seen' }, ({ payload }: any) => {
        if (!payload?.viewedBy) return;
        setMessages(prev => prev.map(m => {
          const fresh = payload.viewedBy[m.id];
          return fresh !== undefined ? { ...m, viewed_by: fresh } : m;
        }));
      })
      // ── Instant seen ACK — <200ms round-trip for real-time seen receipts ──
      .on('broadcast', { event: 'seen_ack' }, ({ payload }: any) => {
        if (!payload?.messageId || !payload?.userId) return;
        setMessages(prev => prev.map(m => {
          if (m.id !== payload.messageId) return m;
          const vb = m.viewed_by || [];
          if (vb.includes(payload.userId)) return m;
          return { ...m, viewed_by: [...vb, payload.userId] };
        }));
      })
      // ── Retract: sender's server rejected — remove optimistic bubble ──────────
      .on('broadcast', { event: 'retract_message' }, ({ payload }: any) => {
        if (!payload?.client_temp_id) return;
        setMessages(prev => prev.filter(m =>
          m.id !== payload.client_temp_id && m.client_temp_id !== payload.client_temp_id
        ));
      })
      // ── Confirmed: replace temp id with real DB id ───────────────────────────
      .on('broadcast', { event: 'message_confirmed' }, ({ payload }: any) => {
        if (!payload?.client_temp_id || !payload?.confirmed_id) return;
        setMessages(prev => prev.map(m => {
          if (m.id === payload.client_temp_id || (m as any).client_temp_id === payload.client_temp_id) {
            return { ...m, id: payload.confirmed_id, sent_at: payload.sent_at || m.sent_at, status: 'sent' as const };
          }
          return m;
        }));
      })
      .subscribe();

    msgBroadcastRef.current = broadcastCh;

    // ── CHANNEL 2: postgres_changes for reliability & ID confirmation ─────────
    const msgChannel = supabase.channel(`community_messages:${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload: any) => {
          if (payload.new.channel_id !== activeChannelId) return;

          setMessages(prev => {
            // Already confirmed: message with real DB UUID exists
            if (prev.some(m => m.id === payload.new.id)) return prev;

            // Sender's own optimistic message — swap opt_ → real UUID
            if (payload.new.sender_id === currentUserRef.current?.id) {
              const optMatch = prev.find(m =>
                m.sender_id === currentUserRef.current?.id &&
                m.content === payload.new.content &&
                typeof (m.id as any) === 'string' &&
                (m.id as string).startsWith('opt_')
              );
              if (optMatch) {
                return prev.map(m => m.id === optMatch.id ? { ...m, id: payload.new.id } : m);
              }
            }

            // Receiver got this via broadcast (temp opt_ ID from the sender) — swap to real UUID
            const broadcastMatch = prev.find(m =>
              m.sender_id === payload.new.sender_id &&
              m.content === payload.new.content &&
              typeof (m.id as any) === 'string' &&
              (m.id as string).startsWith('opt_')
            );
            if (broadcastMatch) {
              return prev.map(m => m.id === broadcastMatch.id ? { ...m, id: payload.new.id } : m);
            }

            // Fallback: message not yet in list at all (e.g. sent from another device)
            return [...prev, {
              id: payload.new.id,
              content: payload.new.content,
              sender_id: payload.new.sender_id,
              sent_at: payload.new.sent_at,
              is_mine: payload.new.sender_id === currentUserRef.current?.id,
              status: 'sent' as const,
              type: payload.new.type,
              media_url: payload.new.media_url,
              file_name: payload.new.type === 'file' || payload.new.type === 'image' ? payload.new.content : undefined,
              reactions: [],
            } as ChatMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'community_messages' },
        (payload: any) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? {
            ...m,
            content: payload.new.content,
            edited_at: payload.new.edited_at,
            viewed_by: payload.new.viewed_by || m.viewed_by || [],
          } : m));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'community_messages' },
        (payload: any) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    const reactChannel = supabase.channel(`community_reactions:${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_message_reactions' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => prev.map(m => {
              if (m.id === payload.new.message_id) {
                const currentReactions = m.reactions || [];
                const existingGroup = currentReactions.find(r => r.emoji === payload.new.emoji);
                let nextReactions;
                if (existingGroup) {
                  const alreadyCounted = (existingGroup.userIds || []).includes(payload.new.user_id);
                  if (alreadyCounted) {
                    nextReactions = currentReactions;
                  } else {
                    nextReactions = currentReactions.map(r => 
                      r.emoji === payload.new.emoji 
                        ? { ...r, count: r.count + 1, reacted: r.reacted || payload.new.user_id === currentUserRef.current?.id, userIds: [...(r.userIds || []), payload.new.user_id] }
                        : r
                    );
                  }
                } else {
                  nextReactions = [...currentReactions, { 
                    emoji: payload.new.emoji, 
                    count: 1, 
                    reacted: payload.new.user_id === currentUserRef.current?.id, 
                    userIds: [payload.new.user_id] 
                  }];
                }
                return { ...m, reactions: nextReactions };
              }
              return m;
            }));
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.map(m => {
              if (m.id === payload.old.message_id) {
                const currentReactions = m.reactions || [];
                const nextReactions = currentReactions.map(r => {
                  if (r.emoji === payload.old.emoji) {
                    const exists = (r.userIds || []).includes(payload.old.user_id);
                    if (!exists) return r;
                    const newUserIds = (r.userIds || []).filter(uid => uid !== payload.old.user_id);
                    return { ...r, count: newUserIds.length, reacted: newUserIds.includes(currentUserRef.current?.id || ''), userIds: newUserIds };
                  }
                  return r;
                }).filter(r => r.count > 0);
                return { ...m, reactions: nextReactions };
              }
              return m;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastCh);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reactChannel);
      msgBroadcastRef.current = null;
    };
  }, [activeChannelId, currentUser?.id, supabase]);


  const handleSendText = async (content: string, viewOnce?: boolean) => {
    if (!activeChannelId || !currentUser?.id) return;

    if (isSlowmodeActive) {
      showAlert(`Please wait for slowmode cooldown: ${slowmodeSeconds}s remaining.`, 'warning');
      return;
    }
    
    const currentMember = communityMembers.find(m => m.user_id === currentUser.id);
    const currentMemberRole = currentMember?.role || 'member';
    const myPerms = rolePermissions[currentMemberRole] || rolePermissions[currentMemberRole.toLowerCase()] || rolePermissions.member || {};

    // 1. Permission Matrix Checks
    if (!isOwner && myPerms.sendMessages === false) {
      showAlert("You do not have permission to send messages in this community.", 'error');
      return;
    }
    // 2. Raid lockdown check
    if (raidMode && !isOwner) {
      showAlert("Emergency lockdown active. Standard messaging is restricted.", 'error');
      return;
    }
    // 3. Auto-Moderator keyword filter check
    const contentLower = content.toLowerCase();
    if (bannedKeywords.some(kw => contentLower.includes(kw)) && !isOwner) {
      showAlert("Your message was blocked by the Auto-Moderator keyword filter.", 'warning');
      return;
    }
    // 4. Auto-Mod Link Block Check & embedLinks Permission Check
    const hasLink = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi.test(content);
    if (hasLink && !isOwner) {
      if (!allowLinks) {
        showAlert("Posting hyperlinks is blocked by the Auto-Moderator security guidelines.", 'warning');
        return;
      }
      if (myPerms.embedLinks === false) {
        showAlert("You do not have permission to post hypertext links in this community.", 'error');
        return;
      }
    }
    // 5. Auto-Mod Mentions Limit Check
    if (!isOwner && (content.match(/@\w+/g) || []).length > maxMentions) {
      showAlert(`Your message exceeds the maximum allowed user mentions (${maxMentions}).`, 'warning');
      return;
    }
    // 6. Auto-Mod Rate Limit check
    const now = Date.now();
    const recentSends = messageTimestampsRef.current.filter(t => now - t < 5000);
    recentSends.push(now);
    messageTimestampsRef.current = recentSends;

    // Strict spam prevention: standard slowmode limit, with a safety cap for owner to prevent file-locking crashes
    const absoluteLimit = isOwner ? 15 : spamRateLimit;
    if (recentSends.length > absoluteLimit) {
      showAlert(
        isOwner 
          ? "Owner safety limit reached. Slowmode active to protect the database." 
          : `Slow down! Slowmode activated: maximum ${spamRateLimit} messages per 5s.`, 
        'warning'
      );
      setIsSlowmodeActive(true);
      setSlowmodeSeconds(isOwner ? 2 : 4);
      return;
    }

    const optId = `opt_${Date.now()}`;
    const snapChannelId = activeChannelId;
    const snapUserId = currentUser.id;

    // Capture replyTo and reset state instantly
    const snapReplyTo = replyTo ? {
      id: replyTo.id,
      content: replyTo.content,
      sender_display: replyTo.sender?.display_name || replyTo.sender?.username || "User",
    } : null;
    const snapReplyToId = replyTo?.id || null;
    setReplyTo(null);

    const snapSenderInfo = { display_name: currentUser.displayName, username: currentUser.username, avatar_url: currentUser.avatar };

    // Render optimistic bubble immediately in local UI with status 'sending'
    setMessages(prev => [...prev, {
      id: optId,
      content,
      sender_id: snapUserId,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: 'sending',
      type: 'text',
      sender: {
        display_name: currentUser.displayName,
        username: currentUser.username,
        avatar_url: currentUser.avatar,
      },
      reply_to: snapReplyTo,
    } as ChatMessage]);

    // 2. Broadcast to channel IMMEDIATELY — zero-latency for all members
    const optimisticSentAt = new Date().toISOString();
    if (msgBroadcastRef.current) {
      msgBroadcastRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: optId,
          client_temp_id: optId,
          channel_id: snapChannelId,
          content,
          sender_id: snapUserId,
          sent_at: optimisticSentAt,
          type: 'text',
          media_url: null,
          sender: snapSenderInfo,
          reply_to: snapReplyTo,
        },
      }).catch(() => {});
    }

    // 3. Call server action in background (security + persistence)
    sendCommunityMessage(snapChannelId, snapUserId, content, 'text', undefined, snapSenderInfo, snapReplyToId).then(res => {
      if (snapChannelId !== activeChannelIdRef.current) return;

      if (!res.success) {
        const isSecurityRejection = 
          res.error?.includes('restricted') || 
          res.error?.includes('Warning') || 
          res.error?.includes('blocked') || 
          res.error?.includes('permission');

        if (isSecurityRejection) {
          // Rollback optimistic bubble locally
          setMessages(prev => prev.filter(m => m.id !== optId));
          showAlert(res.error || "Failed to send message", 'error');
          // Retract from other members' screens
          if (msgBroadcastRef.current) {
            msgBroadcastRef.current.send({
              type: 'broadcast',
              event: 'retract_message',
              payload: { client_temp_id: optId },
            }).catch(() => {});
          }
        } else {
          // Network timeout or compilation lag error: mark as error, do not delete!
          setMessages(prev => prev.map(m => m.id === optId ? { ...m, status: 'error' } : m));
        }
      } else {
        const confirmedId = res.data?.id || optId;
        const confirmedTime = res.data?.created_at || optimisticSentAt;
        // Swap ID and status to 'sent'
        setMessages(prev => prev.map(m => m.id === optId ? {
          ...m,
          id: confirmedId,
          sent_at: confirmedTime,
          status: 'sent'
        } : m));

        // Broadcast the confirmed real DB id so others can update their copy
        if (msgBroadcastRef.current && confirmedId !== optId) {
          msgBroadcastRef.current.send({
            type: 'broadcast',
            event: 'message_confirmed',
            payload: { client_temp_id: optId, confirmed_id: confirmedId, sent_at: confirmedTime },
          }).catch(() => {});
        }

        // Broadcast to other tabs
        if (syncChannelRef.current) {
          syncChannelRef.current.postMessage({
            type: 'message_sent',
            payload: {
              channelId: snapChannelId,
              message: {
                id: confirmedId,
                content,
                sender_id: snapUserId,
                sent_at: confirmedTime,
                is_mine: false,
                status: 'sent' as const,
                type: 'text',
                reactions: [],
                sender: {
                  display_name: currentUser.displayName,
                  username: currentUser.username,
                  avatar_url: currentUser.avatar,
                }
              }
            }
          });
        }
      }
    });
  };

  const handleSendFile = async (url: string, fileName: string, mime: string, viewOnce?: boolean, mediaGroupId?: string) => {
    if (!activeChannelId || !currentUser?.id) return;

    if (isSlowmodeActive) {
      showAlert(`Please wait for slowmode cooldown: ${slowmodeSeconds}s remaining.`, 'warning');
      return;
    }

    const currentMember = communityMembers.find(m => m.user_id === currentUser.id);
    const currentMemberRole = currentMember?.role || 'member';
    const myPerms = rolePermissions[currentMemberRole] || rolePermissions[currentMemberRole.toLowerCase()] || rolePermissions.member || {};

    if (!isOwner && myPerms.attachFiles === false) {
      showAlert("You do not have permission to upload files or media in this community.", 'error');
      return;
    }
    
    const type = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
        ? 'video'
        : 'file';

    const optId = `opt_${Date.now()}`;
    const snapChannelId = activeChannelId;

    // Show optimistic bubble immediately in local UI with status 'sending'
    const optimistic: ChatMessage = {
      id: optId,
      content: fileName || 'Attachment',
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: 'sending',
      type,
      media_url: url,
      file_name: fileName || 'Attachment',
      media_group_id: mediaGroupId || null,
      mime_type: mime
    };

    setMessages(prev => [...prev, optimistic]);

    const fileSentAt = new Date().toISOString();

    // 2. Broadcast IMMEDIATELY — zero-latency for all members
    if (msgBroadcastRef.current) {
      msgBroadcastRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: optId,
          client_temp_id: optId,
          channel_id: snapChannelId,
          content: fileName || 'Attachment',
          sender_id: currentUser.id,
          sent_at: fileSentAt,
          type,
          media_url: url,
          file_name: fileName || 'Attachment',
          media_group_id: mediaGroupId || null,
          mime_type: mime,
          sender: { display_name: currentUser.displayName, username: currentUser.username, avatar_url: currentUser.avatar },
        },
      }).catch(() => {});
    }

    // 3. Call server action in background
    sendCommunityMessage(
      snapChannelId,
      currentUser.id,
      fileName || 'Attachment',
      type,
      url,
      undefined,
      null,
      fileName,
      mime,
      mediaGroupId
    ).then(res => {
      if (snapChannelId !== activeChannelIdRef.current) return;

      if (!res.success) {
        const isSecurityRejection = 
          res.error?.includes('restricted') || 
          res.error?.includes('Warning') || 
          res.error?.includes('blocked') || 
          res.error?.includes('permission');

        if (isSecurityRejection) {
          // Rollback locally
          setMessages(prev => prev.filter(m => m.id !== optId));
          showAlert(res.error || "Failed to upload file to chat", 'error');
          // Retract from other members
          if (msgBroadcastRef.current) {
            msgBroadcastRef.current.send({
              type: 'broadcast',
              event: 'retract_message',
              payload: { client_temp_id: optId },
            }).catch(() => {});
          }
        } else {
          // Network timeout or compilation lag error: mark as error, do not delete!
          setMessages(prev => prev.map(m => m.id === optId ? { ...m, status: 'error' } : m));
        }
      } else {
        const messageId = res.data?.id || optId;
        const confirmedTime = res.data?.created_at || fileSentAt;

        // Swap ID and status
        setMessages(prev => prev.map(m => m.id === optId ? {
          ...m,
          id: messageId,
          sent_at: confirmedTime,
          status: 'sent'
        } : m));

        // Broadcast confirmed id to others
        if (msgBroadcastRef.current && messageId !== optId) {
          msgBroadcastRef.current.send({
            type: 'broadcast',
            event: 'message_confirmed',
            payload: { client_temp_id: optId, confirmed_id: messageId, sent_at: confirmedTime },
          }).catch(() => {});
        }

        // Local tabs sync
        if (syncChannelRef.current) {
          syncChannelRef.current.postMessage({
            type: 'message_sent',
            payload: {
              channelId: snapChannelId,
              message: {
                id: messageId,
                content: fileName || 'Attachment',
                sender_id: currentUser.id,
                sent_at: confirmedTime,
                is_mine: false,
                status: 'sent' as const,
                type,
                media_url: url,
                file_name: fileName || 'Attachment',
                media_group_id: mediaGroupId || null,
                mime_type: mime,
                reactions: [],
                sender: {
                  display_name: currentUser.displayName,
                  username: currentUser.username,
                  avatar_url: currentUser.avatar,
                }
              }
            }
          });
        }
      }
    });
    triggerWebhooks(snapChannelId, `Uploaded file: ${fileName || 'Attachment'} (${url})`, type, url);
  };

  const handleSendVoice = async (url: string, durationSec: number, viewOnce = false, mimeType?: string) => {
    if (!activeChannelId || !currentUser?.id) return;

    if (isSlowmodeActive) {
      showAlert(`Please wait for slowmode cooldown: ${slowmodeSeconds}s remaining.`, 'warning');
      return;
    }

    const optId = `opt_${Date.now()}`;
    const snapChannelId = activeChannelId;

    // Show optimistic bubble immediately in local UI with status 'sending'
    const optimistic: ChatMessage = {
      id: optId,
      content: `voice_${durationSec}s`,
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      is_mine: true,
      status: 'sending',
      type: 'voice',
      media_url: url,
      mime_type: mimeType,
      view_once: viewOnce,
      sender: {
        display_name: currentUser.displayName,
        username: currentUser.username,
        avatar_url: currentUser.avatar,
      }
    };
    setMessages(prev => [...prev, optimistic]);

    const voiceSentAt = new Date().toISOString();

    // 2. Broadcast IMMEDIATELY — zero-latency for all members
    if (msgBroadcastRef.current) {
      msgBroadcastRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          id: optId,
          client_temp_id: optId,
          channel_id: snapChannelId,
          content: `voice_${durationSec}s`,
          sender_id: currentUser.id,
          sent_at: voiceSentAt,
          type: 'voice',
          media_url: url,
          mime_type: mimeType,
          view_once: viewOnce,
          sender: { display_name: currentUser.displayName, username: currentUser.username, avatar_url: currentUser.avatar },
        },
      }).catch(() => {});
    }

    // 3. Call server action in background
    sendCommunityMessage(snapChannelId, currentUser.id, `voice_${durationSec}s`, 'voice', url, undefined, null, `voice_${durationSec}s`, mimeType, null, viewOnce).then(res => {
      if (snapChannelId !== activeChannelIdRef.current) return;

      if (!res.success) {
        const isSecurityRejection = 
          res.error?.includes('restricted') || 
          res.error?.includes('Warning') || 
          res.error?.includes('blocked') || 
          res.error?.includes('permission');

        if (isSecurityRejection) {
          // Rollback locally
          setMessages(prev => prev.filter(m => m.id !== optId));
          showAlert(res.error || "Failed to send voice message", 'error');
          // Retract from other members
          if (msgBroadcastRef.current) {
            msgBroadcastRef.current.send({
              type: 'broadcast',
              event: 'retract_message',
              payload: { client_temp_id: optId },
            }).catch(() => {});
          }
        } else {
          // Network timeout or compilation lag error: mark as error, do not delete!
          setMessages(prev => prev.map(m => m.id === optId ? { ...m, status: 'error' } : m));
        }
      } else {
        const messageId = res.data?.id || optId;
        const confirmedTime = res.data?.created_at || voiceSentAt;

        // Swap ID and status
        setMessages(prev => prev.map(m => m.id === optId ? {
          ...m,
          id: messageId,
          sent_at: confirmedTime,
          status: 'sent'
        } : m));

        // Broadcast confirmed id to others
        if (msgBroadcastRef.current && messageId !== optId) {
          msgBroadcastRef.current.send({
            type: 'broadcast',
            event: 'message_confirmed',
            payload: { client_temp_id: optId, confirmed_id: messageId, sent_at: confirmedTime },
          }).catch(() => {});
        }

        // Local tabs sync
        if (syncChannelRef.current) {
          syncChannelRef.current.postMessage({
            type: 'message_sent',
            payload: {
              channelId: snapChannelId,
              message: {
                id: messageId,
                content: `voice_${durationSec}s`,
                sender_id: currentUser.id,
                sent_at: confirmedTime,
                is_mine: false,
                status: 'sent' as const,
                type: 'voice',
                media_url: url,
                mime_type: mimeType,
                view_once: viewOnce,
                reactions: [],
                sender: {
                  display_name: currentUser.displayName,
                  username: currentUser.username,
                  avatar_url: currentUser.avatar,
                }
              }
            }
          });
        }
      }
    });
  };

  const handleRevealMessage = useCallback(
    async (msgId: string) => {
      if (!currentUser?.id) return;
      try {
        const res = await markCommunityMessagesSeen([msgId], currentUser.id);
        if (res.success && res.viewedBy && res.viewedBy[msgId]) {
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId
                ? { ...m, viewed_by: res.viewedBy![msgId] }
                : m
            )
          );
        }
      } catch (e) {
        console.error("[CommunityPage] handleRevealMessage markCommunityMessagesSeen:", e);
      }
    },
    [currentUser?.id]
  );

  const handleDeleteMessage = useCallback(async (id: string) => {
    if (!currentUser?.id) return;
    setMessages(prev => prev.filter(m => m.id !== id));

    // Broadcast delete instantly to other local tabs
    if (syncChannelRef.current && activeChannelIdRef.current) {
      syncChannelRef.current.postMessage({
        type: 'message_deleted',
        payload: {
          channelId: activeChannelIdRef.current,
          messageId: id
        }
      });
    }

    await deleteCommunityMessageDB(currentUser.id, id);
  }, [currentUser?.id]);

  const handleDeleteMessageForMe = useCallback((id: string) => {
    if (!currentUser?.id) return;
    setLocallyDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(`locally_deleted_msgs_${name}_${currentUser.id}`, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error("Failed to save locally deleted messages:", e);
      }
      return next;
    });
  }, [currentUser?.id, name]);

  const handleSaveEditMessage = useCallback(async (id: string, newContent: string) => {
    if (!currentUser?.id) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));

    // Broadcast edit instantly to other local tabs
    if (syncChannelRef.current && activeChannelIdRef.current) {
      syncChannelRef.current.postMessage({
        type: 'message_edited',
        payload: {
          channelId: activeChannelIdRef.current,
          messageId: id,
          content: newContent,
          editedAt: new Date().toISOString()
        }
      });
    }

    await editCommunityMessageDB(currentUser.id, id, newContent);
  }, [currentUser?.id]);

  const handleReactMessage = useCallback(async (id: string, emoji: string) => {
    if (!currentUser?.id) return;

    // Toggle reaction locally
    setMessages(prev => prev.map(m => {
      if (m.id === id) {
        const currentReactions = m.reactions || [];
        const previousReaction = currentReactions.find(r => (r.userIds || []).includes(currentUser.id));
        let nextReactions = currentReactions;

        // Step 1: Remove user from previous reaction
        if (previousReaction) {
          nextReactions = nextReactions.map(r => {
            if (r.emoji === previousReaction.emoji) {
              const newUserIds = (r.userIds || []).filter(uid => uid !== currentUser.id);
              return { ...r, count: newUserIds.length, reacted: false, userIds: newUserIds };
            }
            return r;
          }).filter(r => r.count > 0);
        }

        // Step 2: Add user to new reaction if it's different
        if (!previousReaction || previousReaction.emoji !== emoji) {
          const existingGroup = nextReactions.find(r => r.emoji === emoji);
          if (existingGroup) {
            nextReactions = nextReactions.map(r => {
              if (r.emoji === emoji) {
                const newUserIds = [...(r.userIds || []), currentUser.id];
                return { ...r, count: newUserIds.length, reacted: true, userIds: newUserIds };
              }
              return r;
            });
          } else {
            nextReactions = [
              ...nextReactions,
              {
                emoji,
                count: 1,
                reacted: true,
                userIds: [currentUser.id]
              }
            ];
          }
        }
        return { ...m, reactions: nextReactions };
      }
      return m;
    }));

    // Broadcast react instantly to other local tabs
    if (syncChannelRef.current && activeChannelIdRef.current) {
      syncChannelRef.current.postMessage({
        type: 'message_reacted',
        payload: {
          channelId: activeChannelIdRef.current,
          messageId: id,
          emoji,
          userId: currentUser.id
        }
      });
    }

    await reactCommunityMessageDB(id, emoji, currentUser.id);
  }, [currentUser?.id]);

  const handleRetryMessage = useCallback(async (msg: ChatMessage) => {
    if (!activeChannelId || !currentUser?.id) return;

    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sending' } : m));

    let res;
    if (msg.type === 'text') {
      res = await sendCommunityMessage(activeChannelId, currentUser.id, msg.content, 'text');
    } else {
      res = await sendCommunityMessage(activeChannelId, currentUser.id, msg.content, msg.type, msg.media_url);
    }

    if (!res.success) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'error' } : m));
    } else {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, id: res.data.id, status: 'sent' } : m));
    }
  }, [activeChannelId, currentUser?.id]);

  const onlineCount = onlineUsers.size;

  // ── GOD MODE PERF FIXES ────────────────────────────────────────────────────

  // 1. Cache localStorage reads — each sender's nick/badge is read ONCE per
  //    community session, not 2× per message on every render.
  const lsNickBadgeCache = useRef<Record<string, { nick: string|null; badge: string|null }>>({});
  const lastCacheNameRef = useRef(name);
  if (lastCacheNameRef.current !== name) {
    lastCacheNameRef.current = name;
    lsNickBadgeCache.current = {}; // reset when community changes
  }

  // 2. Pre-compile a single regex for ALL custom emojis.
  //    Before: N_emojis × N_messages .replaceAll() calls every render.
  //    After:  one regex pass per text message, only when emojis array changes.
  const emojiReplaceData = useMemo(() => {
    if (!emojis.length) return null;
    const map: Record<string, string> = {};
    const patterns: string[] = [];
    emojis.forEach((e: any) => {
      const key = `:${e.name}:`;
      map[key] = e.url;
      patterns.push(key.replace(new RegExp('[.*+?^${}()|[\\\\]\\\\\\\\]', 'g'), '\\$&'));
    });
    return { regex: new RegExp(patterns.join('|'), 'g'), map };
  }, [emojis]);

  // 3. INCREMENTAL formattedMessages — O(1) per new message instead of O(n).
  //    Previous: processes ALL 50 messages every time ANY message changes.
  //    Now: detects append-only change (send/receive), reuses cached formatted
  //    messages for unchanged items, only formats the new ones.
  //    Full recompute only on deletion/reaction/edit (rare).
  const prevFormattedCacheRef = useRef<ChatMessage[]>([]);
  const prevMsgsCacheRef     = useRef<ChatMessage[]>([]);

  const formatOneMessage = useCallback((m: ChatMessage): ChatMessage => {
    const senderId = m.sender_id;
    if (senderId && !lsNickBadgeCache.current[senderId]) {
      lsNickBadgeCache.current[senderId] = {
        nick:  typeof window !== 'undefined' ? localStorage.getItem(`member_nick_${name}_${senderId}`) : null,
        badge: typeof window !== 'undefined' ? localStorage.getItem(`member_zk_badge_${name}_${senderId}`) : null,
      };
    }
    const cached = senderId ? lsNickBadgeCache.current[senderId] : null;
    const savedNick  = cached?.nick  ?? null;
    const savedBadge = cached?.badge ?? null;

    let updatedSender = m.sender;
    if (savedNick || (savedBadge && savedBadge !== 'None')) {
      let displayName = savedNick || m.sender?.display_name || 'User';
      if (savedBadge && savedBadge !== 'None') {
        const symbol = savedBadge === 'Shin' ? '👑' : savedBadge === 'Quantum' ? '⚛️' : '🛡️';
        displayName = `${displayName} ${symbol} ${savedBadge}`;
      }
      updatedSender = { ...m.sender, display_name: displayName };
    }

    if (m.type === 'text' && m.content && emojiReplaceData) {
      const content = m.content.replace(emojiReplaceData.regex, (match: string) => emojiReplaceData.map[match] ?? match);
      return updatedSender !== m.sender ? { ...m, sender: updatedSender, content } : { ...m, content };
    }
    return updatedSender !== m.sender ? { ...m, sender: updatedSender } : m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, emojiReplaceData]);

  const visibleMessages = useMemo(() => {
    return messages.filter(m => !locallyDeletedIds.has(m.id));
  }, [messages, locallyDeletedIds]);

  const chatMembers = useMemo(() => {
    return communityMembers.map((m: any) => ({
      id: m.user_id,
      display_name: m.display_name || m.username || 'User',
      username: m.username,
      avatar_url: m.avatar_url,
    }));
  }, [communityMembers]);

  const formattedMessages = useMemo(() => {
    const prev  = prevMsgsCacheRef.current;
    const prevF = prevFormattedCacheRef.current;
    const cur   = visibleMessages;

    // ── EMPTY GUARD: clear caches so next message starts fresh (e.g. first message in new channel)
    if (cur.length === 0) {
      prevMsgsCacheRef.current      = [];
      prevFormattedCacheRef.current = [];
      return [];
    }

    // ── FAST PATH: messages were only appended at the end (send / realtime receive)
    // Check: same prefix by object identity on the last shared item.
    if (
      cur.length > prev.length &&
      prevF.length === prev.length &&
      (prev.length === 0 || prev[prev.length - 1] === cur[prev.length - 1])
    ) {
      const newFormatted = cur.slice(prev.length).map(formatOneMessage);
      const result = [...prevF, ...newFormatted];
      prevMsgsCacheRef.current     = cur;
      prevFormattedCacheRef.current = result;
      return result;
    }

    // ── SLOW PATH: deletion, reaction update, ID swap (opt_ → real UUID), etc.
    const result = cur.map(formatOneMessage);
    prevMsgsCacheRef.current     = cur;
    prevFormattedCacheRef.current = result;
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages, formatOneMessage]);



  return (
    <div key={name} className="flex h-full overflow-hidden w-full mx-auto bg-[#050508] md:pb-0 relative text-white select-none">
      
      {/* Floating Alert / Toast notification */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          >
            <div className={clsx(
              "px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-all duration-200",
              activeAlert.type === 'error' && "bg-rose-950/80 border-rose-500/30 text-rose-200 shadow-rose-950/20",
              activeAlert.type === 'warning' && "bg-amber-950/80 border-amber-500/30 text-amber-200 shadow-amber-950/20",
              activeAlert.type === 'success' && "bg-emerald-950/80 border-emerald-500/30 text-emerald-200 shadow-emerald-950/20",
              activeAlert.type === 'info' && "bg-blue-950/80 border-blue-500/30 text-blue-200 shadow-blue-950/20"
            )}>
              {activeAlert.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {activeAlert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {activeAlert.type === 'success' && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {activeAlert.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold tracking-wide leading-relaxed">{activeAlert.message}</p>
              </div>
              
              <button 
                onClick={() => setActiveAlert(null)}
                className="text-white/30 hover:text-white/60 p-0.5 hover:bg-white/5 rounded-lg transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic ambient mesh background */}
      <AmbientMeshBackground />

      {/* 1. Sidebar: Channels */}
      <div 
        className={clsx(
          "border-r border-white/[0.08] bg-[#07070b]/60 backdrop-blur-3xl flex flex-col h-full z-10 relative",
          isMobile 
            ? mobileView === 'channels' ? 'w-full flex pb-16' : 'hidden'
            : 'w-64 flex-shrink-0 flex'
        )}
      >
        
        {/* Server Workspace Header (Minimal & Professional Switcher) */}
        <div className="border-b border-white/[0.04] bg-[#07070b]/20">
          <div 
            onClick={() => router.push('/communities')}
            className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.01] transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Back button nested cleanly */}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); router.push('/communities'); }}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all shrink-0 border border-white/[0.03]"
                title="Go back"
              >
                <ChevronLeft size={13} />
              </button>
              
              {/* Clean corporate avatar badge */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1f2030] to-[#0f0f15] flex items-center justify-center border border-white/10 shadow-sm shrink-0 text-xs font-semibold uppercase text-neutral-300 select-none">
                {community?.display_name?.slice(0, 2) || 'CO'}
              </div>

              {/* Title & Status info */}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-[13px] font-semibold text-neutral-200 truncate tracking-wide leading-tight">
                    {community?.display_name || 'Loading...'}
                  </h2>
                  <ShieldCheck size={13} className="text-indigo-400 fill-indigo-400/5 shrink-0" />
                </div>
                <p className="text-[9px] text-neutral-500 font-bold select-none leading-none mt-1">@{name}</p>
              </div>
            </div>

            {/* Settings + Owner Controls */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(true)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
                title="Server Rules"
              >
                <Info size={13} />
              </button>
              
              <button
                type="button"
                onClick={() => setIsIdentityModalOpen(true)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
                title="My Community Profile"
              >
                <UserCheck size={13} />
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setIsOwnerPanelOpen(true); }}
                  className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
                  title="Community Settings (Owner Panel)"
                >
                  <Settings size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Scrollable channels list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {loadingChannels ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-400 opacity-50" /></div>
          ) : (
            <div className="space-y-6">
              {/* Text Channels section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Text Channels</h3>
                  {community?.isAdmin && (
                    <button 
                      type="button" 
                      onClick={() => { setNewChannelType('text'); setIsCreateChannelOpen(true); }}
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Create Text Channel"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {channels.filter(c => c.description !== 'voice').map(c => (
                    <div 
                      key={c.id}
                      className={clsx(
                        "w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all group relative cursor-pointer",
                        activeChannelId === c.id 
                          ? "bg-white/[0.07] border border-white/5 text-white shadow-lg" 
                          : "hover:bg-white/[0.03] text-neutral-400 hover:text-neutral-200"
                      )}
                      onClick={() => handleChannelClick(c)}
                    >
                      {activeChannelId === c.id && (
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                          style={{
                            backgroundColor: themeColor === 'violet' ? '#8b5cf6' : themeColor === 'emerald' ? '#10b981' : themeColor === 'crimson' ? '#ef4444' : themeColor === 'amber' ? '#f59e0b' : '#0ea5e9',
                            boxShadow: `0 0 8px ${themeColor === 'violet' ? '#8b5cf6' : themeColor === 'emerald' ? '#10b981' : themeColor === 'crimson' ? '#ef4444' : themeColor === 'amber' ? '#f59e0b' : '#0ea5e9'}`
                          }}
                        />
                      )}
                      <div className="flex items-center gap-3 min-w-0">
                        <Hash size={13} 
                          className={clsx(
                            activeChannelId === c.id 
                              ? themeColor === 'violet' ? 'text-violet-400' : themeColor === 'emerald' ? 'text-emerald-400' : themeColor === 'crimson' ? 'text-rose-400' : themeColor === 'amber' ? 'text-amber-400' : 'text-sky-400'
                              : "text-neutral-600 group-hover:text-neutral-400"
                          )} 
                        />
                        <span className="text-xs font-bold uppercase tracking-tight truncate">{c.name}</span>
                      </div>
                      {/* Delete Channel Gear/Trash */}
                      {community?.isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannelToDelete(c);
                            setIsDeleteChannelOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                          title="Delete channel"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Channels section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Voice Channels</h3>
                  {community?.isAdmin && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setNewChannelType('voice');
                        setIsCreateChannelOpen(true);
                      }}
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Create Voice Channel"
                    >
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {channels.filter(c => c.description === 'voice').map(c => {
                    const currentChannelUsers = voiceChannelUsers[c.id] || [];
                    return (
                      <div key={c.id} className="space-y-0.5">
                        <div className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all hover:bg-white/[0.03] text-neutral-400 hover:text-neutral-200">
                          <button type="button"
                            onClick={() => setConnectedVoice(c.id)}
                            className="flex-1 flex items-center gap-3 text-left relative min-w-0"
                          >
                            {connectedVoice === c.id && (
                              <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            )}
                            <Volume2 size={13} className={connectedVoice === c.id ? "text-emerald-400 animate-pulse" : "text-neutral-600 group-hover:text-neutral-400"} />
                            <span className={clsx(
                              "text-xs font-bold uppercase tracking-tight truncate",
                              connectedVoice === c.id && "text-emerald-400"
                            )}>{c.name}</span>
                          </button>

                          {/* Delete Voice Channel Gear/Trash */}
                          {community?.isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChannelToDelete(c);
                                setIsDeleteChannelOpen(true);
                              }}
                              className="opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                              title="Delete voice channel"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        
                        {/* Real-time Voice Members List */}
                        {currentChannelUsers.length > 0 && (
                          <div className="ml-6 pl-2 border-l border-white/5 space-y-1 pb-1">
                            {currentChannelUsers.map((u, idx) => {
                              const isSelf = u.id === currentUser?.id;
                              const isUserTalking = talkingUsersList[u.id];
                              
                              return (
                                <div key={`${u.id}-${idx}`} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/[0.02] group/member text-neutral-400 hover:text-white transition-all cursor-pointer">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* Avatar with dynamic glowing speaking ring */}
                                    <div className={clsx(
                                      "w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-black uppercase text-neutral-300 select-none relative shrink-0",
                                      isUserTalking 
                                        ? "ring-2 ring-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] bg-emerald-950/60" 
                                        : "bg-white/10"
                                    )}>
                                      {u.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                        u.displayName.slice(0, 1)
                                      )}
                                      
                                      {/* Little green online/talking indicator */}
                                      <div className={clsx(
                                        "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-[#07070b]",
                                        isUserTalking ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"
                                      )} />
                                    </div>
                                    
                                    <span className={clsx(
                                      "text-[10.5px] font-semibold truncate leading-none",
                                      isSelf && "text-emerald-400 font-bold",
                                      isUserTalking && "text-white"
                                    )}>
                                      {u.displayName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Status Indicators */}
                                    {u.isMuted && (
                                      <MicOff size={10} className="text-red-400/80" />
                                    )}
                                    {u.isDeafened && (
                                      <Headphones size={10} className="text-red-400/80 line-through" />
                                    )}
                                    {isUserTalking && !u.isMuted && (
                                      <div className="flex gap-0.5 items-end h-2">
                                        <span className="w-[1.5px] bg-emerald-400 animate-pulse h-1" style={{ animationDelay: '0.1s' }} />
                                        <span className="w-[1.5px] bg-emerald-400 animate-pulse h-2.5" style={{ animationDelay: '0.3s' }} />
                                        <span className="w-[1.5px] bg-emerald-400 animate-pulse h-1.5" style={{ animationDelay: '0.5s' }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {channels.filter(c => c.description === 'voice').length === 0 && (
                    <p className="text-[10px] text-neutral-600 italic px-2.5 py-1">No voice channels</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connected Voice status block */}
        {connectedVoice && (
          <div className="p-3 border-t border-white/[0.08] bg-[#0c0c12]/80 backdrop-blur-md flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Radio size={14} className="text-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-400 leading-none">Voice Connected</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-1 leading-none font-bold">
                    {channels.find(v => v.id === connectedVoice)?.name || "Voice Channel"}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConnectedVoice(null)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                title="Disconnect"
              >
                <PhoneOff size={12} />
              </button>
            </div>
            
            {/* Real-time Oscilloscope Waveform */}
            <div className="w-full h-8 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center">
              <canvas ref={visualizerCanvasRef} width={220} height={32} className="w-full h-full opacity-80" />
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <div className="flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={() => setIsMuted(v => !v)}
                  className={clsx(
                    "p-1.5 rounded-lg transition-colors",
                    isMuted ? "bg-red-500/20 text-red-400" : "hover:bg-white/5 text-neutral-400 hover:text-white"
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsDeafened(v => !v)}
                  className={clsx(
                    "p-1.5 rounded-lg transition-colors",
                    isDeafened ? "bg-red-500/20 text-red-400" : "hover:bg-white/5 text-neutral-400 hover:text-white"
                  )}
                  title={isDeafened ? "Undeafen" : "Deafen"}
                >
                  <Headphones size={12} className={clsx(isDeafened && "line-through")} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-black text-neutral-500 tracking-wider">
                PING: <span className="text-emerald-400 font-bold">24ms</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Chat View */}
      <div 
        className={clsx(
          "flex-1 flex flex-col bg-transparent relative z-0",
          isMobile && mobileView !== 'chat' && 'hidden'
        )}
      >
        {activeChannel ? (
          <>
            {/* Modern Unified Chat Header */}
            <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.08] bg-[#07070b]/40 backdrop-blur-md z-10 sticky top-0">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button 
                    type="button"
                    onClick={() => setMobileView('channels')}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all shrink-0 border border-white/[0.03]"
                    title="Back to channels"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                  <Hash size={14} className="text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">#{activeChannel.name}</h3>
                  <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest">{community?.display_name || 'Loading...'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Pinned Messages Button */}
                <button
                  type="button"
                  onClick={() => setIsPinnedOpen(v => !v)}
                  className={clsx(
                    "h-8 rounded-xl flex items-center justify-center gap-1.5 px-3 border transition-all duration-300 relative group/pinbtn",
                    isPinnedOpen 
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                      : "bg-white/[0.02] border-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12]"
                  )}
                  title="Pinned Messages"
                >
                  <Pin size={13} className={clsx("transition-transform duration-300", isPinnedOpen ? "rotate-45" : "group-hover/pinbtn:-rotate-12")} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Pins</span>
                  {messages.filter(m => m.is_pinned).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500 text-white text-[8px] font-black leading-none min-w-[14px] text-center shadow-lg shadow-indigo-500/30">
                      {messages.filter(m => m.is_pinned).length}
                    </span>
                  )}
                </button>
                
                {/* Share Link Button */}
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={clsx(
                    "h-8 rounded-xl flex items-center justify-center gap-1.5 px-3 border transition-all duration-300 text-[10px] font-black uppercase tracking-wider group/share",
                    copiedLink
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-white/[0.02] border-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12]"
                  )}
                  title="Copy Share Link"
                >
                  {copiedLink ? (
                    <Check size={12} className="text-emerald-400 animate-bounce" />
                  ) : (
                    <Share2 size={12} className="group-hover/share:scale-110 transition-transform" />
                  )}
                  <span className="hidden sm:inline">{copiedLink ? "Copied!" : "Share Link"}</span>
                </button>

                <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-white/[0.02] backdrop-blur-xl px-4 py-1.5 rounded-xl border border-white/[0.06] shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 font-extrabold">{onlineCount} Online</span>
                  </div>
                  <span className="text-neutral-700 font-normal select-none">·</span>
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-300 font-bold">{communityMembers.length} Members</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Tabs Subheader */}
            <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-[#07070b]/20 border-b border-white/[0.04] shrink-0">
              {[
                { id: 'chat', label: 'Chat Feed', icon: MessageSquare },
                { id: 'posts', label: 'Overview Posts', icon: BarChart3 },
                { id: 'about', label: 'About Info', icon: Info }
              ].map(sec => {
                const TabIcon = sec.icon;
                const isSel = communitySection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setCommunitySection(sec.id as any)}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                      isSel 
                        ? "bg-white/10 text-white border border-white/10 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]"
                    )}
                  >
                    <TabIcon size={12} className={clsx(isSel ? "text-indigo-400" : "text-neutral-500")} />
                    {sec.label}
                  </button>
                );
              })}
            </div>

            {communitySection === 'chat' ? (
              <>
                {/* Sleek Announcement Bar */}
                <div className="bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/5 to-transparent border-b border-white/[0.06] px-4 sm:px-6 py-2.5 flex items-center justify-between text-[11px] backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Radio size={12} className="text-indigo-400 animate-pulse shrink-0" />
                    <span className="font-bold text-indigo-300 uppercase tracking-wider text-[9px] shrink-0">Server Notice:</span>
                    <span className="text-neutral-300 truncate max-w-[180px] xs:max-w-xs sm:max-w-md">Welcome to the official Verlyn community! Check out #design-ideas and boost us!</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsPinnedOpen(true)}
                    className="text-[9px] uppercase font-bold tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                  >
                    View Pins
                  </button>
                </div>

                {raidMode && (
                  <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2 flex items-center gap-2 text-[10px] text-rose-400 font-bold shrink-0 animate-pulse">
                    <AlertTriangle size={11} className="shrink-0 text-rose-400" />
                    <span className="uppercase text-[9px] tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">Lockdown</span>
                    <span>Emergency lockdown activated: Standard members cannot send new messages. Only admins can speak.</span>
                  </div>
                )}

                {/* Message Stream */}
                <div
                  className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
                >
                   {/* Welcome Hero Banner inside the scroll view if empty */}
                   {messages.length === 0 && !loadingMsgs && (
                     <div className="w-full max-w-xl mx-auto px-6 py-12 flex flex-col items-center text-center space-y-6 select-none mt-10">
                       <div className="relative">
                         <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full scale-[2.5]" />
                         <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/5 border border-white/[0.08] flex items-center justify-center shadow-2xl">
                           <Hash size={36} className="text-indigo-400" strokeWidth={1.5} />
                         </div>
                       </div>
                       <div className="space-y-2">
                         <h3 className="text-2xl font-black text-white tracking-tight uppercase">Welcome to #{activeChannel.name}!</h3>
                         <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
                           This is the start of the #{activeChannel.name} channel. Send messages, files, or pictures to get the conversation started!
                         </p>
                       </div>
                       <div className="flex gap-2">
                         <button
                           type="button"
                           onClick={() => setIsRulesModalOpen(true)}
                           className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-xs font-bold transition-all"
                         >
                           Read Server Rules
                         </button>
                         <button
                           type="button"
                           className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                           onClick={() => handleSendText("Hello everyone! 👋")}
                         >
                           Send Hello 👋
                         </button>
                       </div>
                     </div>
                   )}
                   
                        <MessageList
                          conversationId={activeChannelId}
                          messages={formattedMessages}
                          loading={loadingMsgs && formattedMessages.length === 0}
                          onLoadMore={loadMoreMessages}
                          hasMore={hasMore}
                          loadingMore={loadingMore}
                          onRetry={handleRetryMessage}
                          onDelete={handleDeleteMessage}
                          onDeleteForMe={handleDeleteMessageForMe}
                          canDeleteOthers={canDeleteOthers}
                          onReply={setReplyTo}
                          onEdit={myPerms.editMessages !== false ? setEditingMessage : undefined}
                          onReact={myPerms.addReactions !== false ? handleReactMessage : undefined}
                          onForward={handleForwardMessage}
                          onPin={isOwner || myPerms.pinMessages !== false ? handlePinMessage : undefined}
                          onReveal={handleRevealMessage}
                          currentUserId={currentUser?.id}
                          showEmptyState={false}
                          chatContext={{ type: 'community', name: `${community?.name || 'chat'}_${activeChannel?.name || 'chat'}` }}
                          chatMembers={chatMembers}
                        />
                </div>

                {/* Chat Input Area */}
                <div className="p-2 sm:p-4 bg-transparent relative shrink-0">

                  {enableRulesGate && !rulesAccepted && !isOwner ? (
                    <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-950/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl space-y-4 shadow-2xl animate-fade-in">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-indigo-400 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Membership Agreement Gate</h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        You must read and agree to the community rules of <span className="text-indigo-300 font-bold">{community?.display_name || 'this community'}</span> before posting:
                      </p>
                      {rules && rules.length > 0 ? (
                        <div className="max-h-24 overflow-y-auto custom-scrollbar bg-black/40 border border-white/[0.05] rounded-xl p-3 space-y-2">
                          {rules.map((rule, index) => (
                            <div key={index} className="flex gap-2.5 items-start text-[11px] text-neutral-300">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                              <p className="leading-normal">{rule}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 italic">No rules have been published yet. Be respectful and use common sense.</p>
                      )}
                      <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
                        <span className="text-[10px] text-neutral-500 font-semibold italic">Shinichiro&apos;s Legacy Core Security Protocol</span>
                        <button
                          type="button"
                          onClick={handleAcceptRules}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white text-xs font-black uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95"
                        >
                          I Agree & Accept Rules
                        </button>
                      </div>
                    </div>
                  ) : messagesRestriction?.isRestricted ? (
                    <div className="p-4 bg-[#07070a]/60 border-t border-white/[0.04] backdrop-blur-xl flex flex-col items-center justify-center text-center gap-1.5 select-none min-h-[90px] w-full">
                      <div className="flex items-center gap-1.5 text-rose-400">
                        <ShieldAlert size={14} className="shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Account Restricted</span>
                      </div>
                      <p className="text-[12px] text-white/70 max-w-[400px] leading-relaxed font-medium">
                        Your messaging has been temporarily disabled due to: <span className="text-white font-semibold">{messagesRestriction.reason || "violating community rules"}</span>.
                      </p>
                      <button
                        onClick={() => router.push('/guidelines')}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors mt-0.5 active:scale-95"
                      >
                        See our Community Guidelines
                      </button>
                      {messagesRestriction.expiresAt && (
                        <span className="text-[9px] font-medium text-white/30 tracking-wider">
                          RESTRICTION LIFTS: {new Date(messagesRestriction.expiresAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  ) : messagingLocked && !isOwner ? (
                    <div className="p-5 bg-amber-950/20 border border-amber-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-2 select-none min-h-[90px] w-full shadow-lg shadow-amber-950/10">
                      <div className="flex items-center gap-2 text-amber-400">
                        <Lock size={15} className="shrink-0 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Community Read-Only</span>
                      </div>
                      <p className="text-xs text-neutral-400 max-w-[400px] leading-relaxed font-semibold">
                        The community owner has locked sending messages. You can browse all channels and view posts.
                      </p>
                    </div>
                  ) : (
                    <ChatInput
                      onSendText={handleSendText}
                      onSendFile={handleSendFile}
                      onSendVoice={handleSendVoice}
                      disabled={(raidMode && !isOwner) || isSlowmodeActive}
                      editingMessage={editingMessage}
                      onSaveEdit={handleSaveEditMessage}
                      onCancelEdit={() => setEditingMessage(null)}
                      replyTo={replyTo ? {
                        id: replyTo.id,
                        content: replyTo.content,
                        senderDisplay: replyTo.sender?.display_name || replyTo.sender?.username,
                      } : null}
                      onCancelReply={() => setReplyTo(null)}
                      placeholder={
                        (raidMode && !isOwner)
                          ? "Emergency Lockdown active: typing is disabled"
                          : isSlowmodeActive
                            ? `Slowmode active: wait ${slowmodeSeconds}s...`
                            : `Message #${activeChannel.name}...`
                      }
                    />
                  )}
                </div>
              </>
            ) : communitySection === 'posts' ? (
              <CommunityPostsView name={name} themeColor={themeColor} isOwner={isOwner} />
            ) : (
              <CommunityAboutView 
                community={community} 
                membersCount={communityMembers.length} 
                onlineCount={onlineCount} 
                rules={rules} 
                boostsCount={boostsCount} 
                activeLevel={activeLevel} 
                themeColor={themeColor} 
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <Hash size={40} className="mx-auto mb-4 opacity-30 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest">Select a channel to start</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Members Panel (Desktop) */}
      <MembersPanel 
        members={communityMembers} 
        onlineUsers={onlineUsers} 
        onMemberClick={setSelectedMember}
        loading={loadingChannels}
      />

      {/* Pinned Messages Sidebar Drawer */}
      <AnimatePresence>
        {isPinnedOpen && (
          <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm xl:relative xl:bg-transparent xl:backdrop-blur-none" onClick={() => setIsPinnedOpen(false)}>
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="w-80 border-l border-white/[0.08] bg-[#07070b]/90 backdrop-blur-3xl flex flex-col h-full z-40 relative shadow-2xl ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <Pin size={12} className="text-indigo-400" /> Pinned Announcements
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsPinnedOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                {messages.filter(m => m.is_pinned).length > 0 ? (
                  messages.filter(m => m.is_pinned).map(m => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 space-y-2 relative group/pin">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <SafeAvatar name={m.sender?.display_name || m.sender_display || 'User'} avatarUrl={m.sender?.avatar_url} size="w-5.5 h-5.5" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-neutral-200 truncate leading-tight">{m.sender?.display_name || m.sender_display || 'User'}</span>
                            <span className="text-[8px] text-neutral-500 leading-none">{m.sent_at ? formatTime(m.sent_at) : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Jump to Message */}
                          <button
                            type="button"
                            onClick={() => jumpToMessage(m.id)}
                            className="w-6 h-6 rounded-full bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center text-neutral-400 transition-all"
                            title="Jump to Message"
                          >
                            <ExternalLink size={11} />
                          </button>
                          {/* Unpin action */}
                          {(isOwner || myPerms.pinMessages) && (
                            <button
                              type="button"
                              onClick={() => handlePinMessage(m)}
                              className="w-6 h-6 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center text-neutral-400 transition-all"
                              title="Unpin Message"
                            >
                              <PinOff size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {m.type === "image" && m.media_url ? (
                        <div className="space-y-1.5">
                          <img src={m.media_url} alt="Pinned attachment" className="rounded-xl max-h-32 w-full object-cover" />
                          {m.content && m.content !== m.file_name && (
                            <p className="text-xs text-neutral-300 leading-relaxed break-words">{m.content}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-300 leading-relaxed break-words">{m.content}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-500">
                      <Pin size={16} className="rotate-45" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-neutral-300">No Pinned Announcements</p>
                      <p className="text-[10px] text-neutral-500 max-w-[180px] leading-relaxed">
                        Important messages can be pinned here by tapping options next to a message bubble.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Member detailed profile card modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMember(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="w-85 rounded-3xl bg-[#0b0b0f]/95 border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover banner */}
              <div className={clsx(
                "h-24 bg-gradient-to-r relative",
                themeColor === 'violet' ? 'from-violet-500 via-purple-500 to-fuchsia-500' :
                themeColor === 'emerald' ? 'from-emerald-500 via-teal-500 to-cyan-500' :
                themeColor === 'crimson' ? 'from-rose-500 via-red-500 to-orange-500' :
                themeColor === 'amber' ? 'from-amber-500 via-yellow-500 to-orange-400' :
                'from-sky-500 via-blue-500 to-indigo-500'
              )}>
                <div className="absolute -bottom-10 left-6">
                  <img 
                    src={getAvatarUrl(selectedMember.display_name, selectedMember.avatar_url)}
                    className="w-20 h-20 rounded-2xl border-4 border-[#0b0b0f] bg-[#0b0b0f] object-cover" 
                    alt="" 
                  />
                </div>
              </div>
              <div className="pt-12 p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-white leading-tight flex items-center gap-1.5">
                    {selectedMember.display_name}
                    {(selectedMember.is_verified || getMemberRoleBadge(selectedMember.display_name).label === "STAFF" || getMemberRoleBadge(selectedMember.display_name).label === "MODERATOR") && (
                      <ShieldCheck size={15} className="text-indigo-400 shrink-0" />
                    )}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-bold tracking-wider uppercase">
                    @{selectedMember.username || selectedMember.display_name.toLowerCase().replace(/\s+/g, '_')}
                  </p>
                  
                  {/* Real Stats */}
                  <div className="flex gap-4 pt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-white font-black text-xs font-mono">{selectedMember.follower_count || 0}</span>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Followers</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-white font-black text-xs font-mono">{selectedMember.following_count || 0}</span>
                      <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Following</span>
                    </div>
                  </div>
                </div>
                
                {/* Custom bio */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 font-sans">About Me</p>
                  <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                    {selectedMember.bio && parseBio(selectedMember.bio).visibleBio ? `"${parseBio(selectedMember.bio).visibleBio}"` : "This user hasn't set an about me section yet."}
                  </p>
                </div>

                {/* Role badge */}
                <div>
                  <p className="text-[9px] font-black tracking-widest text-neutral-500 uppercase mb-1.5 font-sans">Role</p>
                  <span className={clsx(
                    "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border inline-block",
                    getMemberRoleBadge(selectedMember.display_name).color
                  )}>
                    {getMemberRoleBadge(selectedMember.display_name).label}
                  </span>
                </div>

                {/* Simulated quick buttons */}
                <div className="flex gap-2 border-t border-white/5 pt-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      alert(`Opening direct message channel with ${selectedMember.display_name}...`);
                      setSelectedMember(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-black uppercase tracking-widest transition-all text-white text-center shadow-lg shadow-indigo-500/20"
                  >
                    Send DM
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedMember(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Forward Message Modal */}
      <AnimatePresence>
        {messageToForward && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setMessageToForward(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-96 rounded-3xl bg-[#0f0f16]/95 border border-white/10 p-6 space-y-4 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Forward size={16} className="text-indigo-400" /> Forward Message
                </h3>
                <p className="text-xs text-neutral-400 mt-1">Select a channel to forward this message to.</p>
              </div>

              {/* Message preview */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] max-h-24 overflow-y-auto custom-scrollbar">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">Message Content</span>
                <p className="text-xs text-neutral-300 italic truncate leading-relaxed">
                  {messageToForward.type === "image" ? "🖼️ Image Attachment" : messageToForward.content}
                </p>
              </div>

              {/* Channels list */}
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {channels.map((chan: any) => (
                  <button
                    key={chan.id}
                    type="button"
                    onClick={() => handleConfirmForward(chan.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/[0.02] border border-transparent hover:border-white/5 text-neutral-300 hover:text-white transition-all text-left group"
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="text-neutral-500 group-hover:text-indigo-400 transition-colors">#</span> {chan.name}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">Send</span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMessageToForward(null)}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-400 hover:text-white transition-all border border-white/5"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {isCreateChannelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateChannelOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-96 rounded-3xl bg-[#0f0f16]/95 border border-white/10 p-6 space-y-4 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Create {newChannelType === 'voice' ? 'Voice' : 'Text'} Channel</h3>
                <p className="text-xs text-neutral-400 mt-1">Add a new discussion channel to this community.</p>
              </div>
              
              {/* Channel Type Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setNewChannelType('text')}
                  className={clsx(
                    "py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    newChannelType === 'text'
                      ? "bg-white/10 text-white shadow-md"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType('voice')}
                  className={clsx(
                    "py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    newChannelType === 'voice'
                      ? "bg-white/10 text-white shadow-md"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  Voice
                </button>
              </div>

              <form onSubmit={handleCreateChannel} className="space-y-3 font-semibold">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Channel Name</label>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. design-ideas"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-semibold"
                  />
                </div>

                {/* Password Protection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1.5"><Key size={9} />Channel Password <span className="text-neutral-600 lowercase font-semibold tracking-normal">(optional)</span></label>
                  <div className="relative">
                    <input
                      type={showNewChannelPwd ? 'text' : 'password'}
                      value={newChannelPassword}
                      onChange={(e) => setNewChannelPassword(e.target.value)}
                      placeholder="Leave blank for open access"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-semibold pr-10 placeholder:text-neutral-600"
                    />
                    <button type="button" onClick={() => setShowNewChannelPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                      {showNewChannelPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>

                {/* Max Members + Slow Mode (text channels only) */}
                {newChannelType === 'text' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Max Members</label>
                      <select
                        value={newChannelMaxMembers}
                        onChange={e => setNewChannelMaxMembers(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#09090d] border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/40 transition-all font-semibold cursor-pointer"
                      >
                        <option value={0}>Unlimited</option>
                        <option value={50}>50 members</option>
                        <option value={100}>100 members</option>
                        <option value={150}>150 members</option>
                        <option value={200}>200 members</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Slow Mode</label>
                      <select
                        value={newChannelSlowModeCooldown}
                        onChange={e => setNewChannelSlowModeCooldown(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#09090d] border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/40 transition-all font-semibold cursor-pointer"
                      >
                        <option value={0}>Off</option>
                        <option value={5}>5s</option>
                        <option value={15}>15s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1 min</option>
                        <option value={300}>5 min</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Requires Approval */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-neutral-300 block">Requires Admin Approval</span>
                    <span className="text-[9px] text-neutral-500">Members must request & be approved to join</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newChannelRequiresApproval}
                    onChange={e => setNewChannelRequiresApproval(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isCreatingChannel}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-2"
                  >
                    {isCreatingChannel ? <Loader2 size={12} className="animate-spin" /> : "Create Channel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateChannelOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-400 hover:text-white transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Channel Modal */}
      <AnimatePresence>
        {isDeleteChannelOpen && channelToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteChannelOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-96 rounded-3xl bg-[#0f0f16]/95 border border-white/10 p-6 space-y-4 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-400">Delete Channel</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Are you sure you want to delete <span className="font-bold text-white">#{channelToDelete.name}</span>? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingChannel}
                  onClick={() => handleDeleteChannel(channelToDelete.id)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  {isDeletingChannel ? <Loader2 size={12} className="animate-spin" /> : "Delete Channel"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteChannelOpen(false);
                    setChannelToDelete(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Channel Deleted Notice Modal - shown to all users instantly when admin deletes a channel */}
      <AnimatePresence>
        {channelDeletedNotice && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-[380px] rounded-3xl bg-[#0f0f16]/98 border border-rose-500/20 p-8 space-y-5 shadow-[0_32px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl text-center"
            >
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle size={28} className="text-rose-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-white uppercase tracking-wide">Channel Removed</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  <span className="font-bold text-white">#{channelDeletedNotice.channelName}</span> has been deleted by an administrator.
                </p>
                <p className="text-xs text-neutral-600">You have been automatically redirected.</p>
              </div>
              <button
                type="button"
                onClick={() => setChannelDeletedNotice(null)}
                className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest transition-all"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Channel Access Control Modal - Password & Approval Gate */}
      <AnimatePresence>
        {channelAccessModal && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setChannelAccessModal(null)}>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-[400px] rounded-3xl bg-[#0f0f16]/98 border border-white/10 p-7 space-y-5 shadow-[0_32px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Password Mode */}
              {channelAccessModal.mode === 'password' && (
                <>
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Lock size={22} className="text-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">Password Required</h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        <span className="font-bold text-white">#{channelAccessModal.channel.name}</span> is password protected.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={channelPasswordInput}
                      onChange={e => { setChannelPasswordInput(e.target.value); setChannelPasswordError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleUnlockChannel()}
                      placeholder="Enter channel passcode..."
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-semibold placeholder:text-neutral-600 text-center tracking-widest"
                    />
                    {channelPasswordError && (
                      <p className="text-xs text-rose-400 text-center font-semibold">{channelPasswordError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleUnlockChannel}
                      disabled={isUnlockingChannel || !channelPasswordInput.trim()}
                      className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {isUnlockingChannel ? <Loader2 size={12} className="animate-spin" /> : <><Key size={12} />Unlock</>}
                    </button>
                    <button type="button" onClick={() => setChannelAccessModal(null)} className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-400 hover:text-white transition-colors font-semibold">
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* Approval Mode */}
              {channelAccessModal.mode === 'approval' && (
                <>
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Shield size={22} className="text-amber-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">Access Required</h3>
                      <p className="text-xs text-neutral-400 mt-1">
                        <span className="font-bold text-white">#{channelAccessModal.channel.name}</span> requires admin approval to join.
                      </p>
                    </div>
                  </div>
                  {isAccessRequested ? (
                    <div className="py-4 text-center space-y-2">
                      <div className="text-2xl">✅</div>
                      <p className="text-sm font-bold text-emerald-400">Request Sent!</p>
                      <p className="text-xs text-neutral-500">An admin will review your request and grant access shortly.</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestChannelAccess}
                      disabled={isRequestingAccess}
                      className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      {isRequestingAccess ? <Loader2 size={12} className="animate-spin" /> : <><UserCheck size={12} />Request Access</>}
                    </button>
                  )}
                  <button type="button" onClick={() => setChannelAccessModal(null)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-500 hover:text-neutral-300 transition-colors font-semibold">
                    Back
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Owner Control Panel */}
      <OwnerControlPanel
        isOwner={isOwner}
        myPerms={myPerms}
        isOpen={isOwnerPanelOpen}
        onClose={() => setIsOwnerPanelOpen(false)}
        community={community}
        members={communityMembers}
        channels={channels}
        messages={messages}
        onDeleteMessage={(id) => {
          setMessages(prev => prev.filter(m => m.id !== id));
          if (currentUser?.id) deleteCommunityMessageDB(currentUser.id, id);
        }}
        onChannelCreated={(channel) => {
          setChannels(prev => [...prev, channel]);
        }}
        onChannelDeleted={(channelId) => {
          const remaining = channels.filter(c => c.id !== channelId);
          setChannels(remaining);
          if (activeChannelId === channelId && remaining.length > 0) {
            setActiveChannelId(remaining[0].id);
          }
        }}
        onMemberRoleUpdated={(userId, role) => {
          setCommunityMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
        }}
        onSettingsSaved={(displayName, description) => {
          setCommunity((prev: any) => prev ? { ...prev, display_name: displayName, description } : prev);
        }}
        themeColor={themeColor}
        setThemeColor={setThemeColor}
        raidMode={raidMode}
        setRaidMode={setRaidMode}
        bannedKeywords={bannedKeywords}
        setBannedKeywords={setBannedKeywords}
        onKickMember={handleKickMember}
        spamLevel={spamLevel}
        setSpamLevel={setSpamLevel}
        bannedUsers={bannedUsers}
        setBannedUsers={setBannedUsers}
        spamRateLimit={spamRateLimit}
        setSpamRateLimit={setSpamRateLimit}
        allowLinks={allowLinks}
        setAllowLinks={setAllowLinks}
        maxMentions={maxMentions}
        setMaxMentions={setMaxMentions}
        webhooks={webhooks}
        setWebhooks={setWebhooks}
        emojis={emojis}
        setEmojis={setEmojis}
        boostsCount={boostsCount}
        setBoostsCount={setBoostsCount}
        boostersList={boostersList}
        setBoostersList={setBoostersList}
        rules={rules}
        setRules={setRules}
        enableRulesGate={enableRulesGate}
        setEnableRulesGate={setEnableRulesGate}
        vanityUrl={vanityUrl}
        setVanityUrl={setVanityUrl}
        invites={invites}
        setInvites={setInvites}
        customRoles={customRoles}
        setCustomRoles={setCustomRoles}
        rolePermissions={rolePermissions}
        setRolePermissions={setRolePermissions}
        auditLogs={auditLogs}
        setAuditLogs={setAuditLogs}
        messagingLocked={messagingLocked}
        setMessagingLocked={setMessagingLocked}
      />

      {/* Community Rules Modal */}
      <AnimatePresence>
        {isRulesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsRulesModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[450px] max-w-full rounded-3xl bg-[#0f0f16]/95 border border-white/10 p-6 space-y-5 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Community Rules</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Sovereign Host Guidelines</p>
                <h4 className="text-md font-bold text-neutral-200">{community?.display_name || 'Community'}</h4>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {rules && rules.length > 0 ? (
                  rules.map((rule, index) => (
                    <div key={index} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="w-5 h-5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-xs text-neutral-300 leading-relaxed font-medium">{rule}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic text-center py-6">No specific rules have been configured for this community yet.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-xs font-black uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Identity Settings Modal */}
      <AnimatePresence>
        {isIdentityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px]" onClick={() => setIsIdentityModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-[400px] max-w-full rounded-2xl bg-[#08080a] border border-white/5 p-6 space-y-6 shadow-[0_24px_50px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                    <Fingerprint size={13} className="text-emerald-400" />
                    My Profile
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-wider">Configure username & boosts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIdentityModalOpen(false)}
                  className="w-6 h-6 rounded-lg hover:bg-white/5 flex items-center justify-center text-neutral-500 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-5">
                
                {/* Community Nickname */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block">Display Name</label>
                  <input
                    type="text"
                    value={memberNickname}
                    onChange={e => {
                      const nick = e.target.value;
                      setMemberNickname(nick);
                      if (currentUser?.id) {
                        localStorage.setItem(`member_nick_${name}_${currentUser.id}`, nick);
                        setCommunityMembers(prev => prev.map(m => m.user_id === currentUser.id ? { ...m, display_name: nick || currentUser.displayName } : m));
                      }
                    }}
                    placeholder={currentUser?.displayName || 'Set display name'}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/10 transition-all font-semibold"
                  />
                </div>
                {/* Verification Badge */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block">Verification Badge</label>
                  <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 py-1">
                    {(() => {
                      const senderId = currentUser?.id;
                      const badge = typeof window !== 'undefined' ? localStorage.getItem(`member_zk_badge_${name}_${senderId}`) : 'None';
                      if (!badge || badge === 'None') return <span className="text-neutral-500 text-[10px] uppercase font-black tracking-wider">No Badge Assigned</span>;
                      const symbol = badge === 'Shin' ? '👑' : badge === 'Quantum' ? '⚛️' : '🛡️';
                      return (
                        <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase text-white tracking-wider">
                          {symbol} {badge}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[8px] text-neutral-500 leading-normal">
                    Granted exclusively by the community owner. Contact admins to request badge adjustments.
                  </p>
                </div>

                {/* Verlyn Subscription Card */}
                <div className="p-3.5 rounded-xl bg-[#050508] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Award size={13} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-200 block">Verlyn Premium</span>
                      <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest">Unlocks 5 server boosts</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = !isVerlynPremium;
                      setIsVerlynPremium(val);
                      if (currentUser?.id) {
                        localStorage.setItem(`verlyn_premium_${currentUser.id}`, val ? 'true' : 'false');
                        
                        const userRole = communityMembers.find(m => m.user_id === currentUser?.id)?.role || 'member';
                        const username = currentUser?.username?.toLowerCase() || '';
                        const isDev = username === 'shinichiro' || username === 'shayan' || username === 's';
                        const isMod = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';
                        
                        if (!isDev && !isMod) {
                          const newLimit = val ? 5 : 3;
                          if (memberBoostsUsed > newLimit) {
                            const excess = memberBoostsUsed - newLimit;
                            setBoostsCount(prev => Math.max(0, prev - excess));
                            setMemberBoostsUsed(newLimit);
                            localStorage.setItem(`global_boosts_used_${currentUser.id}`, newLimit.toString());
                            
                            const auditMsg = `@${currentUser?.username || 'user'} unsubscribed. Refunded ${excess} excess community boosts.`;
                            setAuditLogs(prev => [
                              {
                                id: Math.random().toString(36).substring(2, 9),
                                time: new Date().toLocaleTimeString(),
                                type: 'boost',
                                desc: auditMsg,
                                actor: currentUser?.username || 'system'
                              },
                              ...prev
                            ]);
                          }
                        }
                      }
                    }}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all",
                      isVerlynPremium
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    )}
                  >
                    {isVerlynPremium ? 'Active' : 'Subscribe'}
                  </button>
                </div>

                {/* Boosting interface */}
                {(() => {
                  const userRole = communityMembers.find(m => m.user_id === currentUser?.id)?.role || 'member';
                  const username = currentUser?.username?.toLowerCase() || '';
                  const isDev = username === 'shinichiro' || username === 'shayan' || username === 's';
                  const isMod = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';
                  const isPremium = isVerlynPremium || isDev || isMod;
                  
                  let limit = 3;
                  let tierName = "Standard Member";
                  let badgeColor = "bg-white/5 border-white/10 text-neutral-400";
                  if (isDev) {
                    limit = Infinity;
                    tierName = "System Developer";
                    badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                  } else if (isMod) {
                    limit = Infinity;
                    tierName = "Community Moderator";
                    badgeColor = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
                  } else if (isPremium) {
                    limit = 5;
                    tierName = "Verlyn Premium";
                    badgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                  }

                  const hasBoostQuota = limit === Infinity || memberBoostsUsed < limit;

                  const handlePerformBoost = () => {
                    if (!hasBoostQuota) return;
                    const nextCount = boostsCount + 1;
                    const nextMemberCount = memberBoostsUsed + 1;
                    setBoostsCount(nextCount);
                    setMemberBoostsUsed(nextMemberCount);
                    if (currentUser?.id) {
                      localStorage.setItem(`global_boosts_used_${currentUser.id}`, nextMemberCount.toString());
                    }
                    
                    const auditMsg = `@${currentUser?.username || 'user'} boosted the community! Total boosts: ${nextCount}.`;
                    setAuditLogs(prev => [
                      {
                        id: Math.random().toString(36).substring(2, 9),
                        time: new Date().toLocaleTimeString(),
                        type: 'boost',
                        desc: auditMsg,
                        actor: currentUser?.username || 'member'
                      },
                      ...prev
                    ]);
                    alert(`🎉 Thank you for boosting! Community total: ${nextCount}.`);
                  };

                  return (
                    <div className="bg-[#050508] border border-white/5 p-4 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className="text-indigo-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">Server Boosts</span>
                        </div>
                        <span className={clsx("text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border", badgeColor)}>
                          {tierName}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Your Boosts</span>
                        <span className="text-white font-black font-mono">
                          {limit === Infinity ? `${memberBoostsUsed} / Unlimited` : `${memberBoostsUsed} of ${limit}`}
                        </span>
                      </div>

                      {limit !== Infinity && (
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (memberBoostsUsed / limit) * 100)}%` }}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePerformBoost}
                        disabled={!hasBoostQuota}
                        className={clsx(
                          "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm border",
                          hasBoostQuota
                            ? "bg-white text-black border-white hover:bg-neutral-200"
                            : "bg-transparent border-white/5 text-neutral-600 cursor-not-allowed"
                        )}
                      >
                        <Sparkles size={11} />
                        {hasBoostQuota ? 'Boost' : 'Quota Exhausted'}
                      </button>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
