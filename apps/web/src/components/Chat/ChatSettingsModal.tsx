"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  Clock,
  ShieldAlert,
  MessageSquareOff,
  MessageSquare,
  Edit3,
  ChevronRight,
  Bell,
  BellOff,
  Check,
  Trash2,
  Volume2,
  VolumeX,
  Star,
  Info,
  Lock,
  Plus,
  Search,
  MoreHorizontal,
  Link as LinkIcon,
  Users,
  CircleDashed,
  Camera,
  Loader2,
  LogOut,
  EyeOff,
  UserMinus,
  ShieldX,
  FolderOpen,
  ChevronLeft,
  Zap,
  Volume1,
  Sparkles,
  Cpu,
  Compass,
  Shield,
  Music,
  Flame,
  Radio,
  Activity,
  Disc,
  Gem,
  Waves,
  Sun
} from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { CustomThemeSelector } from "./CustomThemeSelector";
import TouchRipple from "@/components/ui/TouchRipple";
import { createClient } from "@/lib/supabase/client";
import { getAvatarUrl, getCommunityIconUrl } from "@/lib/utils";
import { parseBio } from "@/lib/profile-metadata";
import { playSound, stopAllSounds } from "@/lib/sound-generator";
import {
  getGroupMembersDB,
  getAllUsersForInviteDB,
  addUsersToGroupDB,
  setMemberRoleDB,
  muteMemberDB,
  unmuteMemberDB,
  removeMemberDB,
  updateDMSettingsDB,
  cleanupDisappearingMessagesDB,
  setGroupMemberNicknameDB,
  getGroupJoinRequestsDB,
  approveGroupJoinRequestDB,
  rejectGroupJoinRequestDB,
} from "@/app/(main)/messages/actions";

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  partnerUsername?: string;
  partnerAvatar: string | null;
  dmSettings: any;
  setDmSettings: (settings: any) => void;
  privacyShieldActive?: boolean;
  onTogglePrivacyShield?: () => void;
  initialScreen?: "main" | "nickname" | "disappearing" | "bubble" | "theme";
  onBlock?: () => void;
  onReport?: () => void;
  onClearChat?: () => void;
  onSearch?: () => void;
  onUpdateGroupAvatar?: (url: string) => void;
  onLeaveGroup?: () => void;
  onHideChat?: (code: string) => void;
  activeConvId?: string | null;
  groupJoinCode?: string;
  isBlocked?: boolean;
  isBlockedByPartner?: boolean;
  onUnblock?: () => void;
  className?: string;
  // currentUserId is needed to persist nickname to DB
  currentUserId?: string;
  isGroup?: boolean;
  onMute?: (muted: boolean) => void;
  onUpdateSettings?: (updates: any) => void;
  onOpenVault?: () => void;
}

type Screen =
  | "main"
  | "theme"
  | "nickname"
  | "disappearing"
  | "bubble"
  | "add_people"
  | "people_list"
  | "privacy"
  | "privacy_policy"
  | "hide_setup"
  | "options"
  | "join_requests"
  | "notifications"
  | "typing";

interface NotificationPrefs {
  mute_duration?: string;
  mention_only?: boolean;
  priority?: boolean;
  preview?: boolean;
  silent?: boolean;
  sound?: string;
  vibrate?: boolean;
}


export const TYPING_INDICATORS = [
  { id: "dots", label: "Classic Dots", desc: "Clean & professional bouncing dots" },
  { id: "heartbeat", label: "Romantic Pulse", desc: "Couples • Glowing heartbeat wave" },
  { id: "wave", label: "Homie Wave", desc: "Homies • Smooth low-frequency wave" },
  { id: "shrug", label: "Bruh Bounce", desc: "Banter • Comedic bouncing patterns" },
  { id: "sparkles", label: "Bestie Spark", desc: "Best Friends • Intertwined glowing stars" },
  { id: "cyber", label: "Tech Terminal", desc: "Gamers • Monospace terminal cursor" },
  { id: "coffee", label: "Cozy Steam", desc: "Chill • Coffee mug with rising steam" },
  { id: "pencil", label: "Fountain Pen", desc: "Creative • Elegant fountain pen stroke" },
  { id: "flame", label: "Hype Fire", desc: "Excited • Dynamic glowing flame embers" },
  { id: "whisper", label: "Whisper Wave", desc: "Secret • Extremely subtle fading dots" },
  { id: "nebula", label: "Deep Nebula", desc: "Mindful • Morphing color gradient sphere" },
  { id: "party", label: "Celebration Pop", desc: "Festive • Exploding colorful confetti" },
];

export const BUBBLE_STYLES = [
  // ── Classic ───────────────────────────────────────────────────────────────────
  {
    id: "glass",
    label: "Glass",
    desc: "Frosted crystal",
    sentBg: "rgba(79,70,229,0.82)",
    sentBorder: "rgba(129,120,255,0.25)",
    recvBg: "rgba(18,18,26,0.82)",
    filter: "blur(12px)",
  },
  {
    id: "messenger",
    label: "Messenger",
    desc: "Indigo gradient IG-style",
    sentBg: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)",
    sentBorder: "transparent",
    recvBg: "#262626",
    filter: "none",
  },
  {
    id: "solid",
    label: "Matte",
    desc: "Clean & opaque",
    sentBg: "rgb(63,58,184)",
    sentBorder: "transparent",
    recvBg: "rgb(32,32,42)",
    filter: "none",
  },
  {
    id: "transparent",
    label: "Aura",
    desc: "Barely there",
    sentBg: "rgba(79,70,229,0.15)",
    sentBorder: "rgba(129,120,255,0.2)",
    recvBg: "rgba(255,255,255,0.05)",
    filter: "blur(20px)",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Border only",
    sentBg: "transparent",
    sentBorder: "rgba(129,120,255,0.5)",
    recvBg: "transparent",
    filter: "none",
  },
  {
    id: "neon",
    label: "Neon",
    desc: "Electric glow",
    sentBg: "rgba(79,70,229,0.25)",
    sentBorder: "rgba(139,120,255,0.9)",
    recvBg: "rgba(18,18,26,0.3)",
    filter: "none",
    neonShadow: "0 0 18px rgba(99,80,255,0.55)",
  },
  {
    id: "soft",
    label: "Soft",
    desc: "Pastel dream",
    sentBg: "rgba(139,120,255,0.62)",
    sentBorder: "rgba(160,140,255,0.3)",
    recvBg: "rgba(40,36,60,0.8)",
    filter: "blur(8px)",
  },
  // ── Premium Dark ─────────────────────────────────────────────────────────────
  {
    id: "frosted",
    label: "Frosted",
    desc: "Heavy luxury frost",
    sentBg: "rgba(90,80,240,0.65)",
    sentBorder: "rgba(180,170,255,0.35)",
    recvBg: "rgba(255,255,255,0.08)",
    filter: "blur(28px) saturate(2)",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    desc: "Piano black matte",
    sentBg: "rgba(10,10,12,0.95)",
    sentBorder: "rgba(255,255,255,0.1)",
    recvBg: "rgba(20,20,25,0.95)",
    filter: "none",
  },
  {
    id: "silk",
    label: "Silk",
    desc: "Soft flowing colors",
    sentBg: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    sentBorder: "rgba(255,255,255,0.1)",
    recvBg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    filter: "blur(4px)",
  },
  {
    id: "midnight",
    label: "Midnight",
    desc: "Deep navy calm",
    sentBg: "rgba(14,22,70,0.92)",
    sentBorder: "rgba(60,80,200,0.35)",
    recvBg: "rgba(8,12,40,0.88)",
    filter: "none",
  },
  {
    id: "void",
    label: "Void",
    desc: "Dark matter",
    sentBg: "rgba(0,0,0,0.94)",
    sentBorder: "rgba(80,60,200,0.28)",
    recvBg: "rgba(0,0,0,0.88)",
    filter: "none",
    neonShadow: "0 0 10px rgba(60,40,150,0.3)",
  },
  // ── Gradient Fire ────────────────────────────────────────────────────────────
  {
    id: "sunset",
    label: "Sunset",
    desc: "Warm cinematic gradient",
    sentBg:
      "linear-gradient(135deg,rgba(255,110,50,0.88),rgba(200,50,130,0.88))",
    sentBorder: "rgba(255,130,80,0.3)",
    recvBg: "rgba(40,16,26,0.85)",
    filter: "none",
  },
  {
    id: "lava",
    label: "Lava",
    desc: "Volcanic fire glow",
    sentBg: "linear-gradient(135deg,rgba(200,40,20,0.9),rgba(255,120,20,0.9))",
    sentBorder: "rgba(255,100,40,0.3)",
    recvBg: "rgba(30,10,5,0.88)",
    filter: "none",
    neonShadow: "0 0 14px rgba(220,80,30,0.35)",
  },
  {
    id: "candy",
    label: "Candy",
    desc: "Sugar rush pastels",
    sentBg:
      "linear-gradient(135deg,rgba(255,100,180,0.82),rgba(180,100,255,0.82))",
    sentBorder: "rgba(255,150,200,0.3)",
    recvBg: "rgba(30,12,35,0.82)",
    filter: "blur(4px)",
  },
  // ── Cool Nature ───────────────────────────────────────────────────────────────
  {
    id: "ocean",
    label: "Ocean",
    desc: "Teal deep-sea drift",
    sentBg:
      "linear-gradient(135deg,rgba(10,130,200,0.85),rgba(20,180,170,0.85))",
    sentBorder: "rgba(40,180,180,0.3)",
    recvBg: "rgba(5,20,38,0.88)",
    filter: "none",
  },
  {
    id: "forest",
    label: "Forest",
    desc: "Deep woodland",
    sentBg: "rgba(18,70,34,0.9)",
    sentBorder: "rgba(40,160,60,0.35)",
    recvBg: "rgba(8,22,12,0.88)",
    filter: "none",
  },
  {
    id: "aurora",
    label: "Aurora",
    desc: "Northern lights",
    sentBg:
      "linear-gradient(135deg,rgba(20,200,120,0.78),rgba(80,50,200,0.78))",
    sentBorder: "rgba(80,200,140,0.3)",
    recvBg: "rgba(8,20,28,0.88)",
    filter: "blur(6px)",
  },
  {
    id: "sakura",
    label: "Sakura",
    desc: "Cherry blossom",
    sentBg: "rgba(220,100,140,0.78)",
    sentBorder: "rgba(255,150,180,0.3)",
    recvBg: "rgba(30,10,16,0.82)",
    filter: "blur(6px)",
  },
  // ── Cyberpunk & Sci-fi ─────────────────────────────────────────────────────
  {
    id: "cyber",
    label: "Neon Grid",
    desc: "Glowing lines",
    sentBg: "rgba(0,30,40,0.88)",
    sentBorder: "rgba(0,255,255,0.7)",
    recvBg: "rgba(0,15,20,0.85)",
    filter: "none",
    neonShadow: "0 0 16px rgba(0,220,220,0.4)",
  },
  {
    id: "gold",
    label: "Gold",
    desc: "Premium liquid amber",
    sentBg: "linear-gradient(135deg,rgba(160,110,10,0.9),rgba(220,170,30,0.9))",
    sentBorder: "rgba(220,180,40,0.4)",
    recvBg: "rgba(28,20,5,0.88)",
    filter: "none",
    neonShadow: "0 0 12px rgba(200,160,20,0.3)",
  },
  {
    id: "holographic",
    label: "Holo",
    desc: "Iridescent rainbow",
    sentBg:
      "linear-gradient(135deg,rgba(255,0,128,0.55),rgba(0,255,128,0.55),rgba(0,128,255,0.55))",
    sentBorder: "rgba(200,200,255,0.4)",
    recvBg: "rgba(20,18,30,0.85)",
    filter: "blur(8px)",
  },
  {
    id: "smoke",
    label: "Smoke",
    desc: "Grey cinematic haze",
    sentBg: "rgba(65,62,78,0.85)",
    sentBorder: "rgba(160,155,180,0.2)",
    recvBg: "rgba(28,26,35,0.85)",
    filter: "blur(10px)",
  },
  // ── Advanced ──────────────────────────────────────────────────────────────
  {
    id: "liquid",
    label: "Liquid Metal",
    desc: "Metallic finish",
    sentBg: "rgba(0,255,150,0.25)",
    sentBorder: "rgba(0,255,150,0.8)",
    recvBg: "rgba(10,30,20,0.9)",
    filter: "blur(5px)",
    neonShadow: "0 0 25px rgba(0,255,150,0.3)",
  },
  {
    id: "glitch",
    label: "Distorted Edge",
    desc: "Visual distortion layer",
    sentBg: "rgba(255,0,255,0.2)",
    sentBorder: "rgba(0,255,255,0.8)",
    recvBg: "rgba(20,0,20,0.9)",
    filter: "none",
    neonShadow: "2px 2px 0px #ff00ff, -2px -2px 0px #00ffff",
  },
  {
    id: "pixel",
    label: "8-Bit Retro",
    desc: "Classic arcade blocks",
    sentBg: "rgba(40,40,60,0.95)",
    sentBorder: "#ffffff",
    recvBg: "rgba(20,20,30,0.95)",
    filter: "none",
  },
  {
    id: "sketch",
    label: "Hand-Drawn",
    desc: "Pencil & paper feel",
    sentBg: "rgba(255,255,255,0.1)",
    sentBorder: "rgba(255,255,255,0.8)",
    recvBg: "rgba(0,0,0,0.2)",
    filter: "none",
  },
  {
    id: "steampunk",
    label: "Industrial",
    desc: "Copper & brass gears",
    sentBg: "rgba(139,69,19,0.9)",
    sentBorder: "rgba(218,165,32,0.8)",
    recvBg: "rgba(45,30,20,0.9)",
    filter: "none",
    neonShadow: "0 0 10px rgba(218,165,32,0.2)",
  },
  {
    id: "slime",
    label: "Emerald Drip",
    desc: "Vivid green accent",
    sentBg: "rgba(127,255,0,0.3)",
    sentBorder: "rgba(50,205,50,0.9)",
    recvBg: "rgba(15,30,15,0.9)",
    filter: "blur(4px)",
  },
  {
    id: "private_frame",
    label: "Private Frame",
    desc: "Transparent border",
    sentBg: "transparent",
    sentBorder: "rgba(139,120,255,0.95)",
    recvBg: "transparent",
    filter: "none",
    neonShadow: "0 0 20px rgba(139,120,255,0.6)",
  },
  {
    id: "ice",
    label: "Arctic Ice",
    desc: "Frosted diamond sharp",
    sentBg: "rgba(173,216,230,0.2)",
    sentBorder: "rgba(255,255,255,0.9)",
    recvBg: "rgba(240,248,255,0.1)",
    filter: "blur(15px)",
  },
  {
    id: "manga",
    label: "Manga Hero",
    desc: "Shonen halftone style",
    sentBg: "#ffffff",
    sentBorder: "#000000",
    recvBg: "#ffffff",
    filter: "none",
  },
  {
    id: "ember",
    label: "Ember",
    desc: "Deep coal pulse",
    sentBg: "rgba(255,69,0,0.3)",
    sentBorder: "rgba(255,140,0,0.9)",
    recvBg: "rgba(40,20,10,0.9)",
    filter: "none",
    neonShadow: "0 0 20px rgba(255,69,0,0.5)",
  },
  {
    id: "toxic",
    label: "Vivid Green",
    desc: "High-contrast accent",
    sentBg: "rgba(173,255,47,0.25)",
    sentBorder: "#adff2f",
    recvBg: "rgba(20,40,10,0.9)",
    filter: "none",
    neonShadow: "0 0 30px rgba(173,255,47,0.4)",
  },
  {
    id: "galaxy",
    label: "Deep Galaxy",
    desc: "Infinite space drift",
    sentBg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)",
    sentBorder: "rgba(100,100,255,0.4)",
    recvBg: "rgba(15,12,30,0.9)",
    filter: "none",
    neonShadow: "0 0 20px rgba(72,61,139,0.3)",
  },
  {
    id: "crystal",
    label: "White Quartz",
    desc: "Pure ethereal crystal",
    sentBg: "rgba(255,255,255,0.15)",
    sentBorder: "rgba(135,206,250,0.8)",
    recvBg: "rgba(10,20,40,0.8)",
    filter: "blur(20px)",
    neonShadow: "0 0 15px rgba(135,206,250,0.4)",
  },
  {
    id: "underwater",
    label: "Deep Sea",
    desc: "Bioluminescent abyss",
    sentBg: "rgba(0,105,148,0.4)",
    sentBorder: "rgba(0,255,255,0.4)",
    recvBg: "rgba(0,30,60,0.9)",
    filter: "blur(8px)",
  },
  {
    id: "retro",
    label: "Arcade Glow",
    desc: "80s synthwave pulse",
    sentBg: "rgba(255,20,147,0.2)",
    sentBorder: "#39ff14",
    recvBg: "rgba(20,0,30,0.95)",
    filter: "none",
    neonShadow: "3px 3px 0px #ff1493",
  },
  {
    id: "cosmic",
    label: "Nebula",
    desc: "Purple cosmic cloud",
    sentBg: "rgba(75,0,130,0.4)",
    sentBorder: "rgba(238,130,238,0.5)",
    recvBg: "rgba(15,0,25,0.9)",
    filter: "blur(12px)",
    neonShadow: "0 0 25px rgba(238,130,238,0.3)",
  },
  {
    id: "ruby",
    label: "Ruby",
    desc: "Crimson jewel",
    sentBg: "rgba(224,17,95,0.4)",
    sentBorder: "rgba(255,0,100,0.7)",
    recvBg: "rgba(30,0,10,0.9)",
    filter: "blur(6px)",
  },
  {
    id: "emerald",
    label: "Emerald",
    desc: "Jade luxury",
    sentBg: "rgba(80,200,120,0.4)",
    sentBorder: "rgba(0,255,128,0.7)",
    recvBg: "rgba(5,25,15,0.9)",
    filter: "blur(6px)",
  },
  {
    id: "sapphire",
    label: "Sapphire",
    desc: "Deep blue gem",
    sentBg: "rgba(15,82,186,0.4)",
    sentBorder: "rgba(0,150,255,0.7)",
    recvBg: "rgba(5,15,35,0.9)",
    filter: "blur(6px)",
  },
  // ── Premium ──────────────────────────────────────────────────────────────
  {
    id: "plasma",
    label: "Plasma",
    desc: "Superheated energy",
    sentBg: "rgba(150,0,255,0.4)",
    sentBorder: "rgba(0,255,255,0.9)",
    recvBg: "rgba(10,5,30,0.9)",
    filter: "none",
    neonShadow: "0 0 20px rgba(150,0,255,0.5)",
  },
  {
    id: "abyss",
    label: "The Abyss",
    desc: "Vantablack & crimson",
    sentBg: "rgba(5,0,0,0.98)",
    sentBorder: "rgba(255,0,50,0.8)",
    recvBg: "rgba(0,0,0,0.95)",
    filter: "none",
    neonShadow: "0 0 15px rgba(200,0,0,0.4)",
  },
  {
    id: "ethereal",
    label: "Ethereal",
    desc: "Angelic glowing aura",
    sentBg: "rgba(255,255,255,0.25)",
    sentBorder: "rgba(255,215,0,0.9)",
    recvBg: "rgba(255,255,255,0.1)",
    filter: "blur(10px)",
    neonShadow: "0 0 30px rgba(255,215,0,0.5)",
  },
  {
    id: "supernova",
    label: "Supernova",
    desc: "Explosive star core",
    sentBg: "linear-gradient(135deg,#ff4e50,#f9d423)",
    sentBorder: "rgba(255,255,255,0.5)",
    recvBg: "rgba(40,10,0,0.9)",
    filter: "blur(2px)",
    neonShadow: "0 0 25px rgba(249,212,35,0.6)",
  },
  {
    id: "holy",
    label: "Holy Light",
    desc: "Divine luminescence",
    sentBg: "rgba(255,250,240,0.9)",
    sentBorder: "rgba(255,223,0,0.8)",
    recvBg: "rgba(255,255,255,0.85)",
    filter: "none",
    neonShadow: "0 0 40px rgba(255,255,255,0.8)",
  },
  {
    id: "matrixgrid",
    label: "Terminal",
    desc: "Hacker green grid",
    sentBg: "rgba(0,20,0,0.95)",
    sentBorder: "#00ff00",
    recvBg: "rgba(0,10,0,0.95)",
    filter: "none",
    neonShadow: "0 0 10px rgba(0,255,0,0.3)",
  },
  {
    id: "cyberpink",
    label: "Vice City",
    desc: "Miami 1984 neon synth",
    sentBg: "rgba(255,0,150,0.3)",
    sentBorder: "#00e5ff",
    recvBg: "rgba(30,0,30,0.9)",
    filter: "none",
    neonShadow: "2px 2px 0px #ff0096, -2px -2px 0px #00e5ff",
  },
  {
    id: "diamond",
    label: "Diamond",
    desc: "Flawless frozen clarity",
    sentBg: "rgba(255,255,255,0.2)",
    sentBorder: "rgba(200,240,255,0.9)",
    recvBg: "rgba(5,15,25,0.9)",
    filter: "blur(12px)",
    neonShadow: "0 0 25px rgba(200,240,255,0.5)",
  },
  {
    id: "goldleaf",
    label: "Gold Leaf",
    desc: "Opulent dark gold",
    sentBg: "rgba(30,20,5,0.7)",
    sentBorder: "rgba(255,215,0,0.8)",
    recvBg: "rgba(10,5,0,0.9)",
    filter: "none",
    neonShadow: "0 0 15px rgba(255,215,0,0.4)",
  },
  {
    id: "bloodneon",
    label: "Blood Neon",
    desc: "Vampiric neon sign",
    sentBg: "rgba(255,0,0,0.2)",
    sentBorder: "rgba(255,0,0,1)",
    recvBg: "rgba(10,0,0,0.95)",
    filter: "none",
    neonShadow: "0 0 35px rgba(255,0,0,0.6)",
  },
  {
    id: "pearl",
    label: "Pearl",
    desc: "Soft pearl luxury (light text)",
    sentBg: "rgba(255,255,255,0.92)",
    sentBorder: "rgba(255,255,255,1)",
    sentTextColor: "#111115",
    recvBg: "rgba(255,255,255,0.06)",
    recvBorder: "rgba(255,255,255,0.1)",
    recvTextColor: "#ffffff",
    filter: "none",
  },
  {
    id: "emerald-lux",
    label: "Emerald Lux",
    desc: "Rich jade velvet",
    sentBg: "linear-gradient(135deg, #065f46 0%, #064e3b 100%)",
    sentBorder: "rgba(16,185,129,0.3)",
    recvBg: "rgba(6,78,59,0.2)",
    filter: "none",
  },
];

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: "off", desc: "Messages never vanish" },
  { label: "24 Hours", value: "24h", desc: "Auto-delete after 1 day" },
  { label: "7 Days", value: "7d", desc: "Auto-delete after a week" },
  { label: "30 Days", value: "30d", desc: "Auto-delete after a month" },
];

const slide = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", damping: 26, stiffness: 220 },
  },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.18 } },
};

export default function ChatSettingsModal({
  isOpen,
  onClose,
  partnerName,
  partnerUsername,
  partnerAvatar,
  dmSettings,
  setDmSettings,
  privacyShieldActive,
  onTogglePrivacyShield,
  initialScreen = "main",
  onSearch,
  onUpdateGroupAvatar,
  onLeaveGroup,
  onHideChat,
  onBlock,
  onUnblock,
  isBlocked = false,
  isBlockedByPartner = false,
  onReport,
  onClearChat,
  activeConvId,
  groupJoinCode,
  className,
  currentUserId,
  isGroup,
  onMute,
  onUpdateSettings,
  onOpenVault,
}: ChatSettingsModalProps) {
  const router = useRouter();
  const settingsRestricted = isBlocked || isBlockedByPartner;
  const [screen, setScreen] = useState<Screen>(initialScreen || "main");
  const hasOpenedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hideInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hidePasscode, setHidePasscode] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddLink, setCopiedAddLink] = useState(false);

  // Nickname state
  const [theirNick, setTheirNick] = useState(dmSettings?.their_nickname || "");
  const [myNick, setMyNick] = useState(dmSettings?.my_nickname || "");
  const [editingUserTarget, setEditingUserTarget] = useState<"me" | "partner" | null>(null);
  const [editNickVal, setEditNickVal] = useState("");
  const [nickSaved, setNickSaved] = useState(false);

  const [isPartnerFollowingMe, setIsPartnerFollowingMe] = useState(false);
  const [isNickSettingsOpen, setIsNickSettingsOpen] = useState(false);
  const [nickPermission, setNickPermission] = useState<"everyone" | "followers" | "only_me">(
    (dmSettings?.nickname_edit_permission as any) ?? "everyone"
  );
  const [nickLockMessage, setNickLockMessage] = useState<string | null>(null);

  useEffect(() => {
    setTheirNick(dmSettings?.their_nickname || "");
    setMyNick(dmSettings?.my_nickname || "");
    if (dmSettings?.nickname_edit_permission) {
      setNickPermission(dmSettings.nickname_edit_permission);
    }
  }, [dmSettings?.their_nickname, dmSettings?.my_nickname, dmSettings?.nickname_edit_permission]);

  useEffect(() => {
    if (!isOpen || isGroup || !currentUserId || !dmSettings?.partner_id) return;
    const checkFollow = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('followers')
          .select('id')
          .match({ follower_id: dmSettings.partner_id, following_id: currentUserId })
          .maybeSingle();
        setIsPartnerFollowingMe(!!data);
      } catch (err) {
        console.error('[ChatSettingsModal] checkFollow error:', err);
      }
    };
    checkFollow();
  }, [isOpen, isGroup, currentUserId, dmSettings?.partner_id]);

  // Mute state
  const muted = dmSettings?.muted === true;

  // Disappearing
  const disappearing = dmSettings?.disappearing_mode || "off";

  // Notifications preferences helper
  const parseNotificationPrefs = (): NotificationPrefs => {
    try {
      if (dmSettings?.partner_nickname) {
        const parsed = JSON.parse(dmSettings.partner_nickname);
        if (typeof parsed === 'object') {
          return {
            mute_duration: parsed.mute_duration ?? "permanent",
            mention_only: parsed.mention_only ?? false,
            priority: parsed.priority ?? false,
            preview: parsed.preview ?? true,
            silent: parsed.silent ?? false,
            sound: parsed.sound ?? "default",
            vibrate: parsed.vibrate ?? true,
          };
        }
      }
    } catch {}
    return {
      mute_duration: "permanent",
      mention_only: false,
      priority: false,
      preview: true,
      silent: false,
      sound: "default",
      vibrate: true,
    };
  };

  const updateNotificationPrefs = (updates: Partial<NotificationPrefs>) => {
    const current = parseNotificationPrefs();
    const next = { ...current, ...updates };
    patch({ partner_nickname: JSON.stringify(next) });
  };


  // Group Members State
  const [members, setMembers] = useState<any[]>([]);
  const [invitees, setInvitees] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<string[]>([]);
  const [isMutatingGroup, setIsMutatingGroup] = useState(false);
  const [myRole, setMyRole] = useState<'admin' | 'moderator' | 'member' | null>(null);
  const [memberAction, setMemberAction] = useState<{ member: any; type: 'mute' | 'remove' | 'role' } | null>(null);

  // Group nick aliases from local settings store
  const [groupNicks, setGroupNicks] = useState<Record<string, string>>(
    dmSettings?.nicknames || {},
  );
  const [nickEditUser, setNickEditUser] = useState<any | null>(null);
  const [tempNick, setTempNick] = useState("");

  // Dropdown options
  const [optionsDropOpen, setOptionsDropOpen] = useState(false);
  // Add-people feedback (replaces alert() calls)
  const [addInviteStatus, setAddInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [addInviteMsg, setAddInviteMsg] = useState('');

  // Group Join Requests
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [joinRequestError, setJoinRequestError] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchJoinRequests = React.useCallback(async () => {
    if (!isGroup || !activeConvId) return;
    setLoadingRequests(true);
    try {
      const res = await getGroupJoinRequestsDB(activeConvId);
      if (res.success && res.data) {
        setJoinRequests(res.data);
      }
    } catch (e) {
      console.error("[ChatSettingsModal] fetchJoinRequests error:", e);
    } finally {
      setLoadingRequests(false);
    }
  }, [isGroup, activeConvId]);

  // Fetch requests when admin/moderator role is detected
  useEffect(() => {
    if (isOpen && isGroup && (myRole === 'admin' || myRole === 'moderator')) {
      fetchJoinRequests();
    }
  }, [isOpen, isGroup, myRole, fetchJoinRequests]);

  // Sync external settings changes into local state
  useEffect(() => {
    setTheirNick(dmSettings?.their_nickname || "");
  }, [dmSettings?.their_nickname]);

  // Sync screen to initialScreen whenever modal opens (deep-link support from 3-dot menu)
  useEffect(() => {
    if (isOpen) {
      if (!hasOpenedRef.current) {
        hasOpenedRef.current = true;
        setScreen(initialScreen || "main");
      }
      // Fetch members if it's a group
      if (isGroup && activeConvId) {
        getGroupMembersDB(activeConvId).then((res) => {
          if (res.success && res.data) {
            const membersData = res.data as any[];
            setMembers(membersData);
            // Detect current user's role using supabase client
            const supabase = createClient();
            supabase.auth.getUser().then(({ data }: any) => {
              if (data?.user) {
                const me = membersData.find((m: any) => m.id === data.user.id);
                setMyRole(me?.role || 'member');
              }
            });
          } else console.error("[Modal] Failed to fetch members:", res.error);
        });
        getAllUsersForInviteDB([]).then((res) => {
          if (res.success && res.data) setInvitees(res.data);
          else console.error("[Modal] Failed to fetch invitees:", res.error);
        });
      }
    } else {
      hasOpenedRef.current = false;
      setTimeout(() => setScreen("main"), 300);
      setSelectedInvitees([]);
      setNickEditUser(null);
      setJoinRequests([]);
    }
  }, [isOpen, initialScreen, activeConvId, partnerUsername]);

  // Group-specific listeners (participants and join requests)
  useEffect(() => {
    if (!isOpen || !isGroup || !activeConvId) return;

    const handleParticipantsChange = () => {
      getGroupMembersDB(activeConvId).then((res) => {
        if (res.success && res.data) {
          const membersData = res.data as any[];
          setMembers(membersData);
          
          if (currentUserId) {
            const me = membersData.find((m: any) => m.id === currentUserId);
            if (!me) {
              onClose?.();
              router.replace('/messages');
              return;
            }
            setMyRole(me.role || 'member');
          }
        }
      });
    };

    const handleJoinRequestsChange = () => {
      if (myRole === 'admin' || myRole === 'moderator') {
        void fetchJoinRequests();
      }
    };

    window.addEventListener('verlyn:participants_change', handleParticipantsChange);
    window.addEventListener('verlyn:join_requests_change', handleJoinRequestsChange);

    return () => {
      window.removeEventListener('verlyn:participants_change', handleParticipantsChange);
      window.removeEventListener('verlyn:join_requests_change', handleJoinRequestsChange);
    };
  }, [isOpen, isGroup, activeConvId, currentUserId, myRole, fetchJoinRequests, onClose, router]);

  // Global nickname update listener (DMs & Groups)
  useEffect(() => {
    if (!isOpen || !activeConvId) return;

    const handleNicknameChange = (e: Event) => {
      const { chatId, userId, nickname } = (e as CustomEvent).detail || {};
      if (chatId === activeConvId) {
        if (isGroup) {
          getGroupMembersDB(activeConvId).then((res) => {
            if (res.success && res.data) {
              setMembers(res.data as any[]);
            }
          });
        } else {
          // DM: Update local state immediately
          if (userId === currentUserId) {
            setMyNick(nickname || "");
          } else {
            setTheirNick(nickname || "");
          }
        }
      }
    };

    window.addEventListener('verlyn:nickname_update', handleNicknameChange);
    return () => {
      window.removeEventListener('verlyn:nickname_update', handleNicknameChange);
    };
  }, [isOpen, isGroup, activeConvId, currentUserId]);


  const patch = (p: Record<string, any>) => {
    setDmSettings({ ...dmSettings, ...p });
    onUpdateSettings?.(p);
  };

  const handleApplyTheme = (themeData: {
    theme_id: string;
    theme_blur: number;
  }) => {
    patch(themeData);
  };

  const handleSaveNicknames = async () => {
    const trimmed = theirNick.trim();
    // FIX-6B: Route through patch() so onUpdateSettings fires → page.tsx setDmSettings → 
    // ChatHeader re-renders with the new nickname immediately (no page reload needed).
    // Previously this called updateDMSettingsDB directly and bypassed page state entirely.
    patch({ their_nickname: trimmed });
    setNickSaved(true);
    setTimeout(() => setNickSaved(false), 2000);
  };

  const handleUpdateNickPermission = async (val: "everyone" | "followers" | "only_me") => {
    setNickPermission(val);
    patch({ nickname_edit_permission: val });
    await updateDMSettingsDB(currentUserId!, activeConvId!, { nickname_edit_permission: val });
  };

  const handleSetDisappearing = (value: string) => {
    patch({ disappearing_mode: value });
    // Immediate cleanup when timer is set to a non-off value.
    // This ensures existing old messages are pruned immediately on toggle.
    if (value !== 'off' && currentUserId && activeConvId && !isGroup) {
      void cleanupDisappearingMessagesDB(currentUserId, activeConvId, value);
    }
  };

  const handleToggleMute = () => {
    patch({ muted: !muted });
  };

  const handleSaveGroupNick = async () => {
    if (!nickEditUser) return;
    const trimmed = tempNick.trim();
    const newNicks = { ...groupNicks, [nickEditUser.id]: trimmed };
    setGroupNicks(newNicks);
    patch({ nicknames: newNicks });
    // Persist group member nickname to DB
    if (activeConvId) {
      try {
        await setGroupMemberNicknameDB(activeConvId, nickEditUser.id, trimmed);
      } catch (e) {
        console.error('[ChatSettingsModal] handleSaveGroupNick DB persist failed:', e);
      }
    }
    setNickEditUser(null);
  };

  const handleAddSelectedToGroup = async () => {
    if (!activeConvId || selectedInvitees.length === 0) return;
    setIsMutatingGroup(true);
    setAddInviteStatus('idle');
    const res = await addUsersToGroupDB(activeConvId, selectedInvitees);
    setIsMutatingGroup(false);
    if (!res.success) {
      setAddInviteStatus('error');
      setAddInviteMsg(res.error || 'Failed to add users.');
      setTimeout(() => setAddInviteStatus('idle'), 3500);
    } else {
      setSelectedInvitees([]);
      setAddInviteStatus('success');
      setAddInviteMsg(`${selectedInvitees.length} member${selectedInvitees.length > 1 ? 's' : ''} added successfully.`);
      setTimeout(() => {
        setAddInviteStatus('idle');
        setScreen('main');
      }, 1500);
    }
  };

  // ── Removed Biometric Animation ──
  const isScanning = false;

  // Current disappearing label
  const disappearingLabel =
    DISAPPEARING_OPTIONS.find((o) => o.value === disappearing)?.label ?? "Off";

  // Active theme name
  const themeId = dmSettings?.theme_id || "midnight";

  const screenTitle: Record<Screen, string> = {
    main: "Details",
    theme: "Chat Theme",
    nickname: "Nicknames",
    disappearing: "Disappearing Messages",
    bubble: "Bubble Style",
    add_people: "Add people",
    people_list: "People",
    privacy: "Privacy & safety",
    privacy_policy: "Security Details",
    hide_setup: "Safety Passcode",
    options: "Options",
    join_requests: "Join Requests",
    notifications: "Notifications",
    typing: "Typing Indicator",
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateGroupAvatar) return;

    // Quick local validation
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `group-avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      let publicUrl = "";

      try {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("folder", "chat-files");
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload API returned non-200");
        const resData = await res.json();
        publicUrl = resData.url;
      } catch (apiErr) {
        console.warn("R2 upload failed for group avatar, trying Supabase storage:", apiErr);
        const { data, error } = await supabase.storage
          .from("chat-files")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage
          .from("chat-files")
          .getPublicUrl(data.path);
        publicUrl = urlData.publicUrl;
      }

      onUpdateGroupAvatar(publicUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (mobile only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 z-[60] md:hidden"
          />

          {/* Panel */}
          <motion.div
            variants={slide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute inset-y-0 right-0 w-full md:w-[400px] bg-[#0f0f15] border-l border-white/[0.08] z-[70] flex flex-col shadow-2xl ${className || ""}`}
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 border-b border-white/[0.07] flex items-center gap-3 px-5">
              {screen === "main" ? (
                <button type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button type="button"
                  onClick={() => setScreen("main")}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
              )}
              <span className="font-semibold text-white text-[15px]">
                {screenTitle[screen]}
              </span>
            </div>

            {/* ── Content Selection ────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
              <AnimatePresence mode="wait">
                {screen === "main" ? (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-y-auto custom-scrollbar"
                  >
                    {/* ── Avatar Hero ── */}
                    <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-white/[0.05]">
                      <div className="relative mb-4 group/avatar">
                        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                          <img
                            src={
                              partnerUsername
                                ? getAvatarUrl(partnerUsername, partnerAvatar)
                                : getCommunityIconUrl(partnerName, partnerAvatar)
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        {/* Group Avatar Upload Overlay */}
                        {!partnerUsername && onUpdateGroupAvatar && (
                          <div
                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            title="Update Group Avatar"
                          >
                            {isUploading ? (
                              <Loader2 className="w-7 h-7 text-white animate-spin" />
                            ) : (
                              <Camera className="w-7 h-7 text-white" />
                            )}
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarSelect}
                        />
                      </div>
                      <h2 className="text-[20px] font-bold text-white tracking-tight text-center">
                        {theirNick || partnerName}
                      </h2>
                      {partnerUsername ? (
                        <p className="text-[13px] font-medium text-white/40 mt-1">
                          @{partnerUsername}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                          className="text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 mt-1 transition-colors"
                        >
                          Change name and image
                        </button>
                      )}
                    </div>

                    <div className="px-4 py-4 space-y-3">
                      {settingsRestricted && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5">
                          <ShieldAlert className="w-[18px] h-[18px] text-rose-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[12px] font-bold text-rose-400 uppercase tracking-widest">Settings Restricted</p>
                            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                              Theme and other chat settings cannot be modified while messaging is restricted.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ── Conversation Settings ── */}
                      <div>
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-1 mb-2">Conversation</p>
                        <div className="bg-white/[0.03] rounded-[20px] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                          <SettingRowMinimal
                            icon={
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 block shadow-sm border border-white/20" />
                            }
                            label="Theme"
                            sub={
                              themeId.startsWith("http")
                                ? "Custom Photo"
                                : themeId
                                    .split('|')[0]
                                    .replace(/-/g, " ")
                                    .replace(/\b\w/g, (c: string) => c.toUpperCase())
                            }
                            disabled={settingsRestricted}
                            onClick={() => setScreen("theme")}
                          />

                          {partnerUsername && (
                            <SettingRowMinimal
                              icon={<Edit3 className="w-[18px] h-[18px]" />}
                              label="Nickname"
                              sub={theirNick || myNick ? "Configured" : "Not set"}
                              disabled={settingsRestricted}
                              onClick={() => { setEditingUserTarget(null); setScreen("nickname"); }}
                            />
                          )}
                          <SettingRowMinimal
                            icon={<MessageSquareOff className="w-[18px] h-[18px]" />}
                            label="Disappearing Messages"
                            sub={disappearingLabel}
                            disabled={settingsRestricted}
                            onClick={() => setScreen("disappearing")}
                          />
                          <SettingRowMinimal
                            icon={<MessageSquare className="w-[18px] h-[18px]" />}
                            label="Bubble Style"
                            sub={
                              BUBBLE_STYLES.find((b) => b.id === dmSettings?.bubble_style)?.label ?? "Auto"
                            }
                            disabled={settingsRestricted}
                            onClick={() => setScreen("bubble")}
                          />
                        </div>
                      </div>

                      {/* ── Group-specific settings ── */}
                      {(!partnerUsername || groupJoinCode) && (
                        <div>
                          <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-1 mb-2">Group</p>
                          <div className="bg-white/[0.03] rounded-[20px] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                            <SettingRowMinimal
                              icon={<Users className="w-[18px] h-[18px]" />}
                              label="People"
                              sub={
                                members.length > 0
                                  ? `${members.slice(0, 3).map((m) => m.username).join(", ")}${members.length > 3 ? " and others" : ""}`
                                  : "View all participants"
                              }
                              onClick={() => setScreen("people_list")}
                            />
                            <SettingRowMinimal
                              icon={<LinkIcon className="w-[18px] h-[18px]" />}
                              label="Invite Link"
                              sub={copiedLink ? "Copied!" : `verlyn.in/j/${groupJoinCode || ""}`}
                              onClick={() => {
                                const link = `${window.location.origin}/j/${groupJoinCode || ""}`;
                                navigator.clipboard.writeText(link).then(() => {
                                  setCopiedLink(true);
                                  setTimeout(() => setCopiedLink(false), 2000);
                                });
                              }}
                              hideChevron
                            />
                            {(myRole === 'admin' || myRole === 'moderator') && (
                              <>
                                <div className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/[0.02]">
                                  <div className="flex items-center gap-3.5">
                                    <div className="text-white/50">
                                      <ShieldAlert className="w-[18px] h-[18px]" />
                                    </div>
                                    <div className="text-left">
                                      <p className="font-semibold text-[14px] text-white">Require Approval</p>
                                      <p className="text-[11px] font-medium text-white/35">Approve new members manually</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => patch({ requires_join_approval: !dmSettings?.requires_join_approval })}
                                    className={`w-10 h-6 rounded-full p-1 transition-all ${dmSettings?.requires_join_approval ? "bg-indigo-600" : "bg-white/10"}`}
                                  >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-all ${dmSettings?.requires_join_approval ? "translate-x-4" : "translate-x-0"}`} />
                                  </button>
                                </div>
                                <SettingRowMinimal
                                  icon={<Lock className="w-[18px] h-[18px]" />}
                                  label="Join Requests"
                                  sub={joinRequests.length > 0 ? `${joinRequests.length} pending` : "No pending requests"}
                                  onClick={() => setScreen("join_requests")}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Privacy & Safety ── */}
                      <div>
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-1 mb-2">Privacy</p>
                        <div className="bg-white/[0.03] rounded-[20px] border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                          <SettingRowMinimal
                            icon={<ShieldAlert className="w-[18px] h-[18px]" />}
                            label="Privacy & Safety"
                            onClick={() => setScreen("privacy")}
                          />
                          {onOpenVault && (
                            <SettingRowMinimal
                              icon={<FolderOpen className="w-[18px] h-[18px]" />}
                              label="Media Vault"
                              sub="Encrypted shared files"
                              onClick={() => { onOpenVault(); onClose(); }}
                            />
                          )}
                          <SettingRowMinimal
                            icon={muted ? <BellOff className="w-[18px] h-[18px]" /> : <Bell className="w-[18px] h-[18px]" />}
                            label="Notifications"
                            sub={muted ? "Muted" : "On"}
                            onClick={() => setScreen("notifications")}
                          />
                          <SettingRowMinimal
                            icon={<Search className="w-[18px] h-[18px]" />}
                            label="Search in Conversation"
                            onClick={() => { onSearch?.(); onClose(); }}
                          />
                        </div>
                      </div>

                      {/* ── Danger Zone ── */}
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-red-400/50 uppercase tracking-widest px-1 mb-2">Danger Zone</p>
                        <div className="bg-red-500/[0.04] rounded-[20px] border border-red-500/[0.12] overflow-hidden divide-y divide-red-500/[0.08]">
                          {(!partnerUsername || groupJoinCode) && (
                            <button
                              type="button"
                              onClick={() => {
                                onLeaveGroup?.();
                                onClose();
                              }}
                              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <LogOut className="w-[18px] h-[18px] shrink-0" />
                              <span className="font-semibold text-[14px]">Leave Group</span>
                            </button>
                          )}
                          {partnerUsername && (
                            isBlocked ? (
                              <button
                                type="button"
                                onClick={() => { onUnblock?.(); onClose(); }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-emerald-400 hover:bg-emerald-500/10 transition-colors text-left"
                              >
                                <ShieldX className="w-[18px] h-[18px] shrink-0 text-emerald-400" />
                                <span className="font-semibold text-[14px]">Unblock User</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { onBlock?.(); onClose(); }}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <ShieldX className="w-[18px] h-[18px] shrink-0" />
                                <span className="font-semibold text-[14px]">Block User</span>
                              </button>
                            )
                          )}
                          {onClearChat && (
                            <button
                              type="button"
                              onClick={() => { onClearChat(); onClose(); }}
                              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <Trash2 className="w-[18px] h-[18px] shrink-0" />
                              <span className="font-semibold text-[14px]">Clear History</span>
                            </button>
                          )}
                          {partnerUsername && (
                            <button
                              type="button"
                              onClick={() => { onReport?.(); onClose(); }}
                              className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-500/70 hover:bg-red-500/10 transition-colors text-left"
                            >
                              <ShieldAlert className="w-[18px] h-[18px] shrink-0" />
                              <span className="font-semibold text-[14px]">Report</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom padding */}
                      <div className="h-4" />
                    </div>
                  </motion.div>
                ) : screen === "theme" ? (
                  <motion.div
                    key="theme"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 overflow-hidden flex flex-col"
                  >
                    <CustomThemeSelector
                      selectedTheme={dmSettings?.theme_id}
                      blur={dmSettings?.theme_blur}
                      updatedAt={dmSettings?.updated_at}
                      onApply={handleApplyTheme}
                    />
                  </motion.div>
                ) : screen === "nickname" ? (
                  <motion.div
                    key="nickname"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar"
                  >
                    {partnerUsername ? (
                      // ── DM Nicknames (Instagram Style) ───
                      editingUserTarget ? (
                        // ── Sub-screen: Edit Nickname (Done/Cancel flow) ───
                        <div className="space-y-6 flex flex-col h-full">
                          {/* Cancel / Edit nickname / Done header */}
                          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => setEditingUserTarget(null)}
                              className="text-sm font-semibold text-white/50 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <h3 className="text-sm font-bold text-white">Edit nickname</h3>
                            <button
                              type="button"
                              onClick={async () => {
                                const trimmed = editNickVal.trim();
                                if (editingUserTarget === "partner") {
                                  setTheirNick(trimmed);
                                  patch({ their_nickname: trimmed || null, partner_nickname: trimmed || null });
                                  await updateDMSettingsDB(currentUserId!, activeConvId!, { their_nickname: trimmed || null });
                                } else {
                                  setMyNick(trimmed);
                                  patch({ my_nickname: trimmed || null });
                                  await updateDMSettingsDB(currentUserId!, activeConvId!, { my_nickname: trimmed || null });
                                }
                                setEditingUserTarget(null);
                              }}
                              className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              Done
                            </button>
                          </div>

                          {/* Circular Avatar in Center */}
                          <div className="flex flex-col items-center py-6 gap-3">
                            <img
                              src={
                                editingUserTarget === "partner"
                                  ? (partnerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}`)
                                  : (useAppStore.getState().currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(useAppStore.getState().currentUser?.displayName || "Me")}`)
                              }
                              alt="Avatar"
                              className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                            />
                            <p className="text-[12px] text-white/40">
                              @{editingUserTarget === "partner" ? partnerUsername : useAppStore.getState().currentUser?.username}
                            </p>
                          </div>

                          {/* Input with length counter */}
                          <div className="relative">
                            <input
                              value={editNickVal}
                              maxLength={32}
                              onChange={(e) => setEditNickVal(e.target.value)}
                              placeholder={
                                editingUserTarget === "partner"
                                  ? partnerName
                                  : (useAppStore.getState().currentUser?.displayName || "Me")
                              }
                              className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/80 rounded-2xl pl-4 pr-16 py-3.5 text-sm text-white focus:outline-none placeholder:text-white/10 transition-colors"
                              autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/30 tabular-nums">
                              {editNickVal.length}/32
                            </span>
                          </div>

                          <p className="text-[12px] text-white/30 text-center leading-relaxed">
                            Everyone in the chat will see this nickname.
                          </p>
                        </div>
                      ) : (
                        // ── Main Nicknames List Screen ───
                        <div className="space-y-6">
                          {/* Back Button */}
                          <button
                            type="button"
                            onClick={() => setScreen("main")}
                            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="font-bold text-sm">Nicknames</span>
                          </button>

                          <div className="text-center py-2">
                            <p className="text-xs text-white/40">Nicknames are only displayed in this chat.</p>
                            <button
                              type="button"
                              onClick={() => setIsNickSettingsOpen(true)}
                              className="text-[11px] text-indigo-400 font-bold hover:underline mt-1"
                            >
                              Change who can edit your nickname
                            </button>
                          </div>

                          {nickLockMessage && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-semibold px-4 py-3 rounded-xl text-center animate-pulse">
                              {nickLockMessage}
                            </div>
                          )}

                          {/* List items (You & Partner) */}
                          <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                            {/* Partner Row */}
                            {(() => {
                              const partnerPermission = dmSettings?.partner_nickname_edit_permission ?? 'everyone';
                              const canEditPartnerNick = 
                                partnerPermission === 'everyone' || 
                                (partnerPermission === 'followers' && isPartnerFollowingMe);
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (canEditPartnerNick) {
                                      setEditingUserTarget("partner");
                                      setEditNickVal(theirNick);
                                    } else {
                                      let msg = `@${partnerUsername} has restricted who can change their nickname.`;
                                      if (partnerPermission === 'followers') {
                                        msg = `Only people @${partnerUsername} follows can change their nickname.`;
                                      }
                                      setNickLockMessage(msg);
                                      setTimeout(() => setNickLockMessage(null), 3000);
                                    }
                                  }}
                                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors text-left"
                                >
                                  <img
                                    src={partnerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}`}
                                    alt={partnerName}
                                    className="w-11 h-11 rounded-full object-cover shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                      {theirNick || partnerName}
                                    </p>
                                    <p className="text-[11px] text-white/40 truncate">
                                      @{partnerUsername}
                                    </p>
                                    {!canEditPartnerNick && (
                                      <p className="text-[10px] text-red-400 font-bold mt-0.5 flex items-center gap-1">
                                        <Lock size={10} className="shrink-0" />
                                        Editing locked
                                      </p>
                                    )}
                                  </div>
                                  {canEditPartnerNick ? (
                                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                                  ) : (
                                    <Lock className="w-4 h-4 text-red-500/40 shrink-0" />
                                  )}
                                </button>
                              );
                            })()}

                            {/* Self Row */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserTarget("me");
                                setEditNickVal(myNick);
                              }}
                              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03] transition-colors text-left"
                            >
                              <img
                                src={
                                  useAppStore.getState().currentUser?.avatar ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(useAppStore.getState().currentUser?.displayName || "Me")}`
                                }
                                alt="Me"
                                className="w-11 h-11 rounded-full object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                  {myNick || useAppStore.getState().currentUser?.displayName || "Me"}
                                </p>
                                <p className="text-[11px] text-white/40 truncate">
                                  @{useAppStore.getState().currentUser?.username}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                            </button>
                          </div>

                          {/* ── Nickname Settings Bottom Drawer ── */}
                          <AnimatePresence>
                            {isNickSettingsOpen && (
                              <>
                                {/* Backdrop */}
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm rounded-[24px]"
                                  onClick={() => setIsNickSettingsOpen(false)}
                                />
                                {/* Drawer */}
                                <motion.div
                                  initial={{ y: "100%" }}
                                  animate={{ y: 0 }}
                                  exit={{ y: "100%" }}
                                  transition={{ type: "spring", damping: 25, stiffness: 240 }}
                                  className="absolute bottom-0 left-0 right-0 z-40 bg-[#0A0A0A] border-t border-white/[0.08] rounded-t-[28px] p-6 pb-8 space-y-6"
                                >
                                  {/* Header handle line */}
                                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto cursor-pointer" onClick={() => setIsNickSettingsOpen(false)} />
                                  
                                  <div className="space-y-1">
                                    <h4 className="text-base font-bold text-white text-center">Settings</h4>
                                    <p className="text-xs text-white/40 text-center">Who can edit your nickname</p>
                                  </div>

                                  <div className="space-y-3">
                                    {[
                                      {
                                        value: "everyone",
                                        label: "Everyone in this chat",
                                        sub: `Both you and @${partnerUsername} can change your nickname.`
                                      },
                                      {
                                        value: "followers",
                                        label: "People you follow",
                                        sub: `Only you and people you follow can change your nickname.`
                                      },
                                      {
                                        value: "only_me",
                                        label: "Only you",
                                        sub: "Only you can change your nickname."
                                      }
                                    ].map((opt) => {
                                      const selected = nickPermission === opt.value;
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => handleUpdateNickPermission(opt.value as any)}
                                          className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] rounded-2xl text-left transition-all"
                                        >
                                          <div className="space-y-0.5">
                                            <p className="text-sm font-semibold text-white">{opt.label}</p>
                                            <p className="text-[11px] text-white/30">{opt.sub}</p>
                                          </div>
                                          <div className={clsx(
                                            "w-[20px] h-[20px] rounded-full border flex items-center justify-center transition-all",
                                            selected ? "border-indigo-500 bg-indigo-500" : "border-white/20"
                                          )}>
                                            {selected && <Check size={12} className="text-white font-bold" strokeWidth={3} />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setIsNickSettingsOpen(false)}
                                    className="w-full py-3.5 bg-white/5 text-white/80 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                                  >
                                    Close
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    ) : (
                      // ── Group Nicknames ────────────────
                      <div className="space-y-4">
                        {nickEditUser ? (
                          <div className="space-y-6">
                            <div
                              className="flex items-center gap-2 mb-4 cursor-pointer"
                              onClick={() => setNickEditUser(null)}
                            >
                              <ChevronRight className="rotate-180 w-5 h-5" />
                              <span className="font-bold text-white">Back</span>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-white/40 uppercase mb-2">
                                Nickname for {nickEditUser.displayName}
                              </label>
                              <input
                                value={tempNick}
                                onChange={(e) => setTempNick(e.target.value)}
                                placeholder={nickEditUser.displayName}
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/10"
                              />
                            </div>
                            <button type="button"
                              onClick={handleSaveGroupNick}
                              className="w-full py-3.5 rounded-2xl font-bold transition-all shadow-lg bg-indigo-600 shadow-indigo-500/20 active:scale-[0.98] text-white"
                            >
                              Save Nickname
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-white/60 mb-6 text-center">
                              Nicknames are only displayed in this chat.
                            </p>
                            {members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded-xl cursor-pointer"
                                onClick={() => {
                                  setNickEditUser(m);
                                  setTempNick(groupNicks[m.id] || "");
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={
                                      getAvatarUrl(m.username || 'user', m.avatarUrl)
                                    }
                                    className="w-12 h-12 rounded-full"
                                  />
                                  <div>
                                    <p className="font-bold text-white">
                                      {groupNicks[m.id] || m.displayName}
                                    </p>
                                    <p className="text-xs text-white/40">
                                      @{m.username}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight
                                  className="text-white/20"
                                  size={18}
                                />
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : screen === "add_people" ? (
                  <motion.div
                    key="add_people"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col pt-3 overflow-hidden"
                  >
                    {groupJoinCode && (
                      <div className="px-5 mb-5 border-b border-white/[0.05] pb-5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-[15px] text-white">
                            Invite link
                          </p>
                          <p className="text-xs text-white/40 font-mono mt-0.5">
                            {`${typeof window !== 'undefined' ? window.location.hostname : 'verlyn.in'}/j/${groupJoinCode}`}
                          </p>
                        </div>
                        <button type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/j/${groupJoinCode}`;
                            navigator.clipboard.writeText(link).then(() => {
                              setCopiedAddLink(true);
                              setTimeout(() => setCopiedAddLink(false), 2000);
                            });
                          }}
                          className={`px-4 py-1.5 rounded-xl font-semibold text-xs transition-all active:scale-[0.98] ${copiedAddLink ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/25' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                          {copiedAddLink ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                    <div className="px-5 pb-3">
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 font-bold text-[15px] text-white">
                          To:
                        </span>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-transparent pl-10 pr-4 py-2 text-white placeholder-white/30 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-20 space-y-2">
                      {invitees
                        .filter((u) =>
                          `${u.display_name} ${u.username}`
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((u) => (
                          <div
                            key={u.id}
                            onClick={() =>
                              setSelectedInvitees((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((id) => id !== u.id)
                                  : [...prev, u.id],
                              )
                            }
                            className="flex items-center justify-between py-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  getAvatarUrl(u.username || 'user', u.avatar_url)
                                }
                                className="w-12 h-12 rounded-full"
                              />
                              <div>
                                <p className="font-bold text-white text-[15px]">
                                  {u.display_name}
                                </p>
                                <p className="text-xs text-white/50">
                                  @{u.username}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedInvitees.includes(u.id) ? "bg-indigo-500 border-indigo-500" : "border-white/20 group-hover:border-white/40"}`}
                            >
                              {selectedInvitees.includes(u.id) && (
                                <Check size={14} className="text-white" />
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                    {/* ── Add-people feedback banner ── */}
                    {addInviteStatus !== 'idle' && (
                      <div className={`mx-4 mb-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-center transition-all ${
                        addInviteStatus === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}>
                        {addInviteMsg}
                      </div>
                    )}
                    {(selectedInvitees.length > 0 || addInviteStatus !== 'idle') && (
                      <div className="absolute bottom-4 left-4 right-4 animate-in fade-in slide-in-from-bottom-4">
                        <button type="button"
                          disabled={isMutatingGroup || addInviteStatus === 'success'}
                          onClick={handleAddSelectedToGroup}
                          className="w-full py-4 bg-indigo-600 rounded-2xl font-bold text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {isMutatingGroup ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : addInviteStatus === 'success' ? (
                            <Check size={18} />
                          ) : null}{" "}
                          {addInviteStatus === 'success' ? 'Added!' : `Add ${selectedInvitees.length} ${selectedInvitees.length === 1 ? "person" : "people"}`}
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : screen === "people_list" ? (
                  <motion.div
                    key="people_list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar"
                  >
                    {/* ── Mute Action Sheet ── */}
                    <AnimatePresence>
                      {memberAction && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 z-[80]"
                            onClick={() => setMemberAction(null)}
                          />
                          <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                            className="absolute bottom-0 left-0 right-0 bg-[#0c0c12] border-t border-white/10 rounded-t-3xl z-[90] pb-10 pt-4 shadow-2xl"
                          >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="px-5 mb-4 flex items-center gap-3">
                              <img
                                src={getAvatarUrl(memberAction.member.username || 'user', memberAction.member.avatarUrl)}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <p className="font-bold text-white">{memberAction.member.displayName}</p>
                                <p className="text-xs text-white/40 capitalize">{memberAction.member.role}</p>
                              </div>
                            </div>
                            {memberAction.type === 'mute' && (
                              <div className="px-5 space-y-1">
                                <p className="text-xs font-bold text-white/30 uppercase mb-3">Mute Duration</p>
                                {[
                                  { label: '5 minutes', ms: 5 * 60 * 1000 },
                                  { label: '30 minutes', ms: 30 * 60 * 1000 },
                                  { label: '1 hour', ms: 60 * 60 * 1000 },
                                  { label: '6 hours', ms: 6 * 60 * 60 * 1000 },
                                  { label: '12 hours', ms: 12 * 60 * 60 * 1000 },
                                ].map(opt => (
                                  <button type="button"
                                    key={opt.ms}
                                    onClick={async () => {
                                      if (!activeConvId) return;
                                      const supabase = createClient();
                                      const { data } = await supabase.auth.getUser();
                                      if (data?.user) {
                                        await muteMemberDB(data.user.id, activeConvId, memberAction.member.id, opt.ms);
                                        setMemberAction(null);
                                      }
                                    }}
                                    className="w-full text-left py-3 px-4 hover:bg-white/5 rounded-xl text-white font-medium transition-colors"
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {memberAction.type === 'role' && (
                              <div className="px-5 space-y-1">
                                <p className="text-xs font-bold text-white/30 uppercase mb-3">Change Role</p>
                                {memberAction.member.role !== 'moderator' && (
                                  <button type="button"
                                    onClick={async () => {
                                      if (!activeConvId) return;
                                      const supabase = createClient();
                                      const { data } = await supabase.auth.getUser();
                                      if (data?.user) {
                                        await setMemberRoleDB(data.user.id, activeConvId, memberAction.member.id, 'moderator');
                                        setMembers(prev => prev.map(mm => mm.id === memberAction.member.id ? { ...mm, role: 'moderator' } : mm));
                                        setMemberAction(null);
                                      }
                                    }}
                                    className="w-full text-left py-3 px-4 hover:bg-white/5 rounded-xl text-white font-medium transition-colors"
                                  >
                                    Promote to Moderator
                                  </button>
                                )}
                                {memberAction.member.role !== 'member' && (
                                  <button type="button"
                                    onClick={async () => {
                                      if (!activeConvId) return;
                                      const supabase = createClient();
                                      const { data } = await supabase.auth.getUser();
                                      if (data?.user) {
                                        await setMemberRoleDB(data.user.id, activeConvId, memberAction.member.id, 'member');
                                        setMembers(prev => prev.map(mm => mm.id === memberAction.member.id ? { ...mm, role: 'member' } : mm));
                                        setMemberAction(null);
                                      }
                                    }}
                                    className="w-full text-left py-3 px-4 hover:bg-white/5 rounded-xl text-white font-medium transition-colors"
                                  >
                                    Demote to Member
                                  </button>
                                )}
                              </div>
                            )}
                            {memberAction.type === 'remove' && (
                              <div className="px-5">
                                <p className="text-white/60 text-sm mb-4">Remove <span className="font-bold text-white">{memberAction.member.displayName}</span> from this group?</p>
                                <button type="button"
                                  onClick={async () => {
                                    if (!activeConvId) return;
                                    const supabase = createClient();
                                    const { data } = await supabase.auth.getUser();
                                    if (data?.user) {
                                      await removeMemberDB(data.user.id, activeConvId, memberAction.member.id);
                                      setMembers(prev => prev.filter(mm => mm.id !== memberAction.member.id));
                                      setMemberAction(null);
                                    }
                                  }}
                                  className="w-full py-3.5 rounded-2xl font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                >
                                  Remove from Group
                                </button>
                              </div>
                            )}
                            <button type="button"
                              onClick={() => setMemberAction(null)}
                              className="w-full px-5 mt-2 py-3 text-white/40 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Member Count Header */}
                    <div className="flex items-center justify-between mb-5">
                      <p className="font-bold text-[15px] text-white">
                        Members <span className="text-white/30">({members?.length || 0})</span>
                      </p>
                      {myRole && (
                        <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          myRole === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          myRole === 'moderator' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-white/10 text-white/40'
                        }`}>
                          You: {myRole}
                        </span>
                      )}
                    </div>

                    {/* Members List */}
                    <div className="space-y-2">
                      {(members || []).map((m) => {
                        const isAdmin = m.role === 'admin';
                        const isMod = m.role === 'moderator';
                        const canManage = (myRole === 'admin' || myRole === 'moderator') && !isAdmin;

                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] group transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={getAvatarUrl(m.username || 'user', m.avatarUrl)}
                                className="w-11 h-11 rounded-full object-cover"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-white text-[14px]">
                                    {groupNicks[m.id] || m.displayName}
                                  </p>
                                  {isAdmin && (
                                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                  )}
                                  {isMod && (
                                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Mod</span>
                                  )}
                                </div>
                                <p className="text-xs text-white/35">@{m.username}</p>
                              </div>
                            </div>

                            {canManage && (
                              <div className="flex items-center gap-1">
                                {myRole === 'admin' && (
                                  <button type="button"
                                    onClick={() => setMemberAction({ member: m, type: 'role' })}
                                    className="p-2 rounded-xl hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors text-xs font-bold"
                                    title="Change role"
                                  >
                                    <Star size={15} />
                                  </button>
                                )}
                                <button type="button"
                                  onClick={() => setMemberAction({ member: m, type: 'mute' })}
                                  className="p-2 rounded-xl hover:bg-amber-500/10 text-white/30 hover:text-amber-400 transition-colors"
                                  title="Mute member"
                                >
                                  <VolumeX size={15} />
                                </button>
                                <button type="button"
                                  onClick={() => setMemberAction({ member: m, type: 'remove' })}
                                  className="p-2 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                                  title="Remove member"
                                >
                                  <UserMinus size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : screen === "disappearing" ? (
                  <motion.div
                    key="disappearing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar"
                  >
                    {DISAPPEARING_OPTIONS.map((opt) => (
                      <button type="button"
                        key={opt.value}
                        onClick={() => handleSetDisappearing(opt.value)}
                        className={`w-full p-4 rounded-2xl border flex items-center justify-between ${disappearing === opt.value ? "bg-indigo-500/10 border-indigo-500" : "bg-white/5 border-white/10"}`}
                      >
                        <div className="text-left">
                          <p
                            className={`text-sm font-bold ${disappearing === opt.value ? "text-indigo-400" : "text-white"}`}
                          >
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-white/30">
                            {opt.desc}
                          </p>
                        </div>
                        {disappearing === opt.value && (
                          <Check size={16} className="text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                ) : screen === "bubble" ? (
                  <motion.div
                    key="bubble"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-2"
                  >
                    <button type="button"
                      onClick={() => patch({ bubble_style: null })}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${!dmSettings?.bubble_style ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/10" : "bg-white/5 border-white/10 hover:bg-white/[0.08]"}`}
                    >
                      <div className="w-12 h-8 rounded-lg flex items-center justify-center text-[10px] bg-white/10 border border-white/20 text-white/50">
                        auto
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold text-white">
                          Auto-match Theme
                        </p>
                        <p className="text-[11px] text-white/30">Automatically change bubble style to match selected theme</p>
                      </div>
                    </button>

                    {BUBBLE_STYLES.map((st) => (
                      <button type="button"
                        key={st.id}
                        onClick={() => patch({ bubble_style: st.id })}
                        className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${dmSettings?.bubble_style === st.id ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/10" : "bg-white/5 border-white/10 hover:bg-white/[0.08]"}`}
                      >
                        <div
                          className="w-12 h-8 rounded-lg flex items-center justify-center text-[10px]"
                          style={{
                            background: st.sentBg,
                            border: `1px solid ${st.sentBorder}`,
                            backdropFilter: st.filter,
                          }}
                        >
                          you
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-bold text-white">
                            {st.label}
                          </p>
                          <p className="text-[11px] text-white/30">{st.desc}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                ) : screen === "typing" ? (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-2"
                  >
                    <style dangerouslySetInnerHTML={{ __html: `
                      @keyframes dash {
                        to {
                          stroke-dashoffset: 0;
                        }
                      }
                    `}} />
                    {TYPING_INDICATORS.map((t) => (
                      <button type="button"
                        key={t.id}
                        onClick={() => patch({ typing_indicator: t.id })}
                        className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                          (dmSettings?.typing_indicator || "dots") === t.id
                            ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-500/10"
                            : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="w-12 h-8 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 overflow-hidden">
                          {t.id === "dots" && (
                            <div className="flex gap-1 items-center">
                              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                          {t.id === "heartbeat" && (
                            <div className="w-full flex items-center justify-center">
                              <svg className="w-8 h-4 text-red-500" viewBox="0 0 100 40">
                                <path
                                  d="M0,20 L30,20 L40,5 L50,35 L60,20 L100,20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="5"
                                  strokeDasharray="100"
                                  strokeDashoffset="100"
                                  style={{ animation: 'dash 1.2s linear infinite' }}
                                />
                              </svg>
                            </div>
                          )}
                          {t.id === "wave" && (
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-0.5 bg-teal-400 rounded-full animate-pulse" style={{ height: '60%', animationDelay: '0ms' }} />
                              <div className="w-0.5 bg-teal-400 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '200ms' }} />
                              <div className="w-0.5 bg-teal-400 rounded-full animate-pulse" style={{ height: '40%', animationDelay: '400ms' }} />
                              <div className="w-0.5 bg-teal-400 rounded-full animate-pulse" style={{ height: '80%', animationDelay: '600ms' }} />
                            </div>
                          )}
                          {t.id === "shrug" && (
                            <div className="flex gap-1 items-center">
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_alternate]" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_alternate]" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_alternate]" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                          {t.id === "sparkles" && (
                            <div className="flex gap-1.5 items-center justify-center">
                              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                            </div>
                          )}
                          {t.id === "cyber" && (
                            <div className="font-mono text-[10px] text-green-400 flex items-center gap-0.5">
                              <span>&gt;</span>
                              <span className="w-1.5 h-3 bg-green-400 animate-pulse" />
                            </div>
                          )}
                          {t.id === "coffee" && (
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex gap-0.5 justify-center h-2">
                                <div className="w-0.5 h-full bg-white/40 rounded animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '0ms' }} />
                                <div className="w-0.5 h-full bg-white/40 rounded animate-bounce" style={{ animationDuration: '1.2s', animationDelay: '200ms' }} />
                              </div>
                              <div className="w-4 h-3 bg-amber-800 rounded-b border border-amber-600/30 flex items-center justify-center" />
                            </div>
                          )}
                          {t.id === "pencil" && (
                            <div className="w-full flex items-center justify-center">
                              <svg className="w-8 h-4 text-sky-400" viewBox="0 0 100 40">
                                <path
                                  d="M10,35 C30,5 70,5 90,35"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  strokeDasharray="100"
                                  strokeDashoffset="100"
                                  style={{ animation: 'dash 1.8s ease-in-out infinite' }}
                                />
                              </svg>
                            </div>
                          )}
                          {t.id === "flame" && (
                            <div className="flex gap-1 items-end h-4">
                              <div className="w-1 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }} />
                              <div className="w-1 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                              <div className="w-1 bg-gradient-to-t from-orange-600 to-yellow-400 rounded-full animate-pulse" style={{ height: '50%', animationDuration: '0.8s' }} />
                            </div>
                          )}
                          {t.id === "whisper" && (
                            <div className="flex gap-0.5 items-center">
                              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                            </div>
                          )}
                          {t.id === "nebula" && (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-blue-500 animate-[spin_4s_linear_infinite] blur-[1px] opacity-70" />
                          )}
                          {t.id === "party" && (
                            <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
                              <div className="absolute w-1 h-1 bg-red-400 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
                              <div className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDuration: '1.2s', animationDelay: '200ms' }} />
                              <div className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDuration: '0.8s', animationDelay: '400ms' }} />
                            </div>
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-bold text-white">
                            {t.label}
                          </p>
                          <p className="text-[11px] text-white/30">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                ) : screen === "privacy" ? (
                  <motion.div
                    key="privacy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-6"
                  >
                    <div className="flex flex-col items-center py-6 text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4">
                        <ShieldAlert className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h3 className="font-bold text-white text-lg">
                        End-to-End Encrypted
                      </h3>
                      <p className="text-sm text-white/50 mt-2 max-w-[80%] mx-auto">
                        Your messages and calls are secured with
                        industry-leading encryption. Nobody outside of this
                        chat, not even Verlyn, can read or listen to them.
                      </p>
                    </div>
                    <div className="space-y-2 mt-4 text-center">
                      <button type="button"
                        onClick={() => setScreen("privacy_policy")}
                        className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors text-sm"
                      >
                        Learn More
                      </button>
                    </div>
                  </motion.div>
                ) : screen === "privacy_policy" ? (
                  <motion.div
                    key="privacy_policy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6 overflow-y-auto custom-scrollbar"
                  >
                    <div className="prose prose-invert prose-p:text-white/60 prose-headings:text-white/90 prose-p:text-[12px] prose-p:leading-relaxed max-w-none text-justify">
                      <div className="flex justify-center mb-6">
                        <div className="border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 rounded-full">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">
                            SECURE COMMUNICATION PROTOCOL
                          </span>
                        </div>
                      </div>
                      <h2 className="text-xl font-black tracking-tight text-white mb-6 uppercase text-center border-b border-white/10 pb-4">
                        Security Standards & Encryption Overview
                      </h2>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE I: END-TO-END ENCRYPTION & DATA PRIVACY
                      </p>
                      <p className="mb-5">
                        Verlyn employs industry-standard end-to-end encryption to ensure that your conversations remain private. 
                        By using decentralized cryptographic protocols, your data is protected from unauthorized access at all times. 
                        Verlyn operates as a secure relay, meaning only you and the intended recipient can access the contents of 
                        your messages. We do not store or have access to the keys required to decrypt your data.
                      </p>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE II: SECURE KEY EXCHANGE
                      </p>
                      <p className="mb-5">
                        Every session establishment utilizes secure key agreement protocols that are hardware-isolated. 
                        Unique identity keys are generated locally on your device and never leave your hardware. 
                        Our implementation ensures that the initial connection between users is mathematically 
                        secure and resistant to interception.
                      </p>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE III: MESSAGE SECURITY ROTATION
                      </p>
                      <p className="mb-5">
                        We use the Double Ratchet Algorithm to ensure that each message is encrypted with a new key. 
                        This provides Perfect Forward Secrecy, meaning past messages remain secure even if a 
                        session key is compromised. Your communication automatically self-heals into a 
                        secure state with every exchange.
                      </p>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE IV: PAYLOAD ENCRYPTION & DATA INTEGRITY
                      </p>
                      <p className="mb-5">
                        All message data is encrypted using AES-256-GCM, providing both confidentiality and integrity. 
                        This ensures that messages cannot be altered or tampered with while in transit. 
                        Any attempt to modify or inject data into the message stream will result in immediate 
                        authentication failure and will be rejected by the recipient client.
                      </p>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE V: PRIVACY & ANONYMITY
                      </p>
                      <p className="mb-5">
                        Verlyn emphasizes user privacy by design. Our communication channels 
                        are built to protect your identity during and after a session. 
                        We do not retain permanent cryptographic artifacts that can be used 
                        to retroactively identify senders, ensuring your conversations 
                        remain truly private.
                      </p>

                      <p className="font-bold text-white mb-2 text-sm">
                        ARTICLE VI: SECURE DATA REMOVAL
                      </p>
                      <p className="mb-5">
                        When using disappearing messages, Verlyn ensures that data is removed 
                        from your device securely. Expired records are overwritten and deleted 
                        from storage, making recovery mathematically impossible. 
                        Your privacy is maintained even if your device is physically accessed.
                      </p>

                      <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                        <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                          END OF DIRECTIVE
                        </p>
                        <p className="text-white/60 text-xs mt-2 italic">
                          “Privacy is not a feature, it's a fundamental right. 
                          We protect your communication with mathematics.”
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : screen === "hide_setup" ? (
                  <motion.div
                    key="hide_setup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-6 space-y-6 flex flex-col justify-center"
                  >
                    <div className="text-center space-y-2">
                      <ShieldAlert
                        size={36}
                        className="text-indigo-400 mx-auto mb-2"
                      />
                      <h3 className="font-black text-xl text-white tracking-widest uppercase">
                        Safety Passcode
                      </h3>
                      <p className="text-sm text-white/50 px-4">
                        This conversation will be hidden from your main message list. 
                        To access it again, search for this exact passcode.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={hideInputRef}
                        type="password"
                        placeholder="Enter secret passcode..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center font-mono tracking-widest text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/10"
                        value={hidePasscode}
                        onChange={(e) => setHidePasscode(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button type="button"
                      onClick={() => {
                        if (hidePasscode.trim().length > 0) {
                          onHideChat?.(hidePasscode.trim());
                          onClose();
                        } else {
                          alert("Code required");
                        }
                      }}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 active:scale-[0.98] text-white flex items-center justify-center gap-2"
                    >
                      <EyeOff size={18} /> Hide Conversation
                    </button>
                    <button type="button"
                      onClick={() => setScreen("main")}
                      className="w-full py-4 text-white/40 font-bold hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : screen === "join_requests" ? (
                  <motion.div
                    key="join_requests"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col min-h-0"
                  >
                    <p className="text-xs text-white/40 mb-4">
                      Review and manage pending requests to join this group.
                    </p>

                    {joinRequestError && (
                      <div className="mb-4 px-4 py-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold text-center animate-in fade-in duration-200">
                        {joinRequestError}
                      </div>
                    )}

                    {loadingRequests ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    ) : joinRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-white/30 space-y-2">
                        <Lock size={28} strokeWidth={1.5} />
                        <p className="text-sm font-semibold text-white">No pending requests</p>
                        <p className="text-xs max-w-[80%]">When people use your group's invite code, their requests will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {joinRequests.map((req) => (
                          <div
                            key={req.id}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={getAvatarUrl(req.users?.username || 'user', req.users?.avatar_url)}
                                className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                                alt=""
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white text-sm truncate">
                                  {req.users?.display_name || req.users?.username}
                                </p>
                                <p className="text-xs text-white/30 truncate">
                                  @{req.users?.username}
                                </p>
                              </div>
                            </div>
                            {req.users?.bio && parseBio(req.users.bio).visibleBio && (
                              <p className="text-xs text-white/50 italic bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                                "{parseBio(req.users.bio).visibleBio}"
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!activeConvId) return;
                                  setJoinRequestError("");
                                  const res = await approveGroupJoinRequestDB(activeConvId, req.id);
                                  if (res.success) {
                                    setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    getGroupMembersDB(activeConvId).then((mRes) => {
                                      if (mRes.success && mRes.data) setMembers(mRes.data);
                                    });
                                  } else {
                                    setJoinRequestError(res.error || "Failed to approve request.");
                                    setTimeout(() => setJoinRequestError(""), 3500);
                                  }
                                }}
                                className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!activeConvId) return;
                                  setJoinRequestError("");
                                  const res = await rejectGroupJoinRequestDB(activeConvId, req.id);
                                  if (res.success) {
                                    setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
                                  } else {
                                    setJoinRequestError(res.error || "Failed to reject request.");
                                    setTimeout(() => setJoinRequestError(""), 3500);
                                  }
                                }}
                                className="flex-1 py-2 bg-white/5 text-white/60 hover:bg-white/10 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : screen === "notifications" ? (
                  <motion.div
                    key="notifications"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-6 flex flex-col min-h-0 text-left"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setScreen("main")}
                        className="p-1 -ml-1 text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <h3 className="font-bold text-white text-[15px]">Notifications Settings</h3>
                    </div>

                    {/* Mute Section */}
                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-4 shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-white">Mute Conversation</p>
                          <p className="text-xs text-white/40">Silence alerts for this chat</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className={clsx(
                            "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none relative z-10",
                            muted ? "bg-indigo-500" : "bg-white/10"
                          )}
                        >
                          <div
                            className={clsx(
                              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
                              muted ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {muted && (
                        <div className="pt-2 border-t border-white/[0.04] space-y-2">
                          <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider">Mute Duration</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "1 Hour", value: "1h" },
                              { label: "8 Hours", value: "8h" },
                              { label: "24 Hours", value: "24h" },
                              { label: "Permanent", value: "permanent" },
                            ].map((dur) => {
                              const currentPrefs = parseNotificationPrefs();
                              const isActive = currentPrefs.mute_duration === dur.value;
                              return (
                                <button
                                  key={dur.value}
                                  type="button"
                                  onClick={() => updateNotificationPrefs({ mute_duration: dur.value })}
                                  className={clsx(
                                    "py-2.5 px-3 rounded-xl text-xs font-bold transition-all border",
                                    isActive
                                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                      : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04]"
                                  )}
                                >
                                  {dur.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notification Modes */}
                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-4 shrink-0">
                      <div>
                        <p className="font-semibold text-sm text-white">Alert Preferences</p>
                        <p className="text-xs text-white/40">Choose when to get notified</p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "All Messages", desc: "Notify for every incoming message", key: "all" },
                          { label: "Mentions Only", desc: "Only notify when @mentioned", key: "mentions" },
                          { label: "Silent Notifications", desc: "Show banner without sound", key: "silent" },
                        ].map((mode) => {
                          const prefs = parseNotificationPrefs();
                          const isActive =
                            mode.key === "mentions" ? prefs.mention_only :
                            mode.key === "silent" ? prefs.silent :
                            (!prefs.mention_only && !prefs.silent);

                          return (
                            <button
                              key={mode.key}
                              type="button"
                              onClick={() => {
                                updateNotificationPrefs({
                                  mention_only: mode.key === "mentions",
                                  silent: mode.key === "silent",
                                });
                              }}
                              className={clsx(
                                "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                isActive
                                  ? "bg-white/[0.06] border-white/[0.12] text-white"
                                  : "bg-transparent border-transparent text-white/60 hover:bg-white/[0.02]"
                              )}
                            >
                              <div>
                                <p className="text-xs font-bold">{mode.label}</p>
                                <p className="text-[10px] text-white/35">{mode.desc}</p>
                              </div>
                              {isActive && <Check size={16} className="text-indigo-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Granular Preferences */}
                    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] space-y-4 shrink-0">
                      {/* Priority */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-white">Priority Notifications</p>
                          <p className="text-xs text-white/40">Show at top of notification center</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const prefs = parseNotificationPrefs();
                            updateNotificationPrefs({ priority: !prefs.priority });
                          }}
                          className={clsx(
                            "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none relative z-10",
                            parseNotificationPrefs().priority ? "bg-indigo-500" : "bg-white/10"
                          )}
                        >
                          <div
                            className={clsx(
                              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
                              parseNotificationPrefs().priority ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Message Preview */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <div>
                          <p className="font-semibold text-sm text-white">Message Preview</p>
                          <p className="text-xs text-white/40">Show message content in banners</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const prefs = parseNotificationPrefs();
                            updateNotificationPrefs({ preview: !prefs.preview });
                          }}
                          className={clsx(
                            "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none relative z-10",
                            parseNotificationPrefs().preview ? "bg-indigo-500" : "bg-white/10"
                          )}
                        >
                          <div
                            className={clsx(
                              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
                              parseNotificationPrefs().preview ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Vibration */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                        <div>
                          <p className="font-semibold text-sm text-white">Vibrate on Alert</p>
                          <p className="text-xs text-white/40">Vibration pattern for new messages</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const prefs = parseNotificationPrefs();
                            updateNotificationPrefs({ vibrate: !prefs.vibrate });
                          }}
                          className={clsx(
                            "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none relative z-10",
                            parseNotificationPrefs().vibrate ? "bg-indigo-500" : "bg-white/10"
                          )}
                        >
                          <div
                            className={clsx(
                              "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
                              parseNotificationPrefs().vibrate ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>

                      {/* Notification Sound */}
                      <div className="pt-3 border-t border-white/[0.04] space-y-2">
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider">Alert Sound</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Default',      value: 'default',    iconName: 'bell' },
                            { label: 'Minimal',      value: 'minimal',    iconName: 'zap' },
                            { label: 'Soft',         value: 'soft',       iconName: 'volume1' },
                            { label: 'Glass',        value: 'glass',      iconName: 'sparkles' },
                            { label: 'Digital',      value: 'digital',    iconName: 'cpu' },
                            { label: 'Modern',       value: 'modern',     iconName: 'compass' },
                            { label: 'Premium',      value: 'premium',    iconName: 'shield' },
                            { label: 'Bell Sound',   value: 'bell',       iconName: 'music' },
                            { label: 'Nature',       value: 'nature',     iconName: 'flame' },
                            { label: 'Sci-Fi',       value: 'sci-fi',     iconName: 'radio' },
                            { label: 'Gaming',       value: 'gaming',     iconName: 'activity' },
                            { label: 'Retro',        value: 'retro',      iconName: 'disc' },
                            { label: 'Crystal',      value: 'crystal',    iconName: 'gem' },
                            { label: 'Mechanical',   value: 'mechanical', iconName: 'waves' },
                            { label: 'Cosmic Sweep', value: 'cosmic',     iconName: 'sun' },
                            { label: 'Celest Chime', value: 'chime',      iconName: 'bell' },
                            { label: 'Glass Ping',   value: 'glass-ping', iconName: 'gem' },
                            { label: 'Synth Rise',   value: 'synth-rise', iconName: 'zap' },
                            { label: 'Echo Bell',    value: 'echo-bell',  iconName: 'music' },
                          ].map((sound) => {
                            const prefs = parseNotificationPrefs();
                            const isActive = prefs.sound === sound.value;
                            
                            const localIconMap: Record<string, React.ComponentType<any>> = {
                              bell: Bell,
                              zap: Zap,
                              volume1: Volume1,
                              sparkles: Sparkles,
                              cpu: Cpu,
                              compass: Compass,
                              shield: Shield,
                              music: Music,
                              flame: Flame,
                              radio: Radio,
                              activity: Activity,
                              disc: Disc,
                              gem: Gem,
                              waves: Waves,
                              sun: Sun,
                            };
                            const IconComponent = localIconMap[sound.iconName] || Bell;

                            return (
                              <button
                                key={sound.value}
                                type="button"
                                onClick={() => {
                                  updateNotificationPrefs({ sound: sound.value });
                                  stopAllSounds();
                                  playSound(sound.value as any);
                                }}
                                className={clsx(
                                  "relative flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border text-center transition-all duration-200 select-none cursor-pointer",
                                  "hover:scale-[1.02] active:scale-[0.98]",
                                  isActive
                                    ? "bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_0_1px_rgba(99,102,241,0.4)] text-indigo-400"
                                    : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04] hover:text-white"
                                )}
                              >
                                <IconComponent size={18} className={isActive ? 'text-indigo-400' : 'text-white/40'} />
                                <span className="text-[9px] font-bold truncate w-full px-0.5 mt-0.5">{sound.label}</span>
                                {isActive && (
                                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 flex items-center justify-center">
                                    <Check size={6} className="text-white" strokeWidth={4} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScreen("main")}
                      className="w-full py-4 bg-white/5 text-white/60 hover:bg-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] shrink-0"
                    >
                      Back to Settings
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SettingRow({
  icon,
  iconBg,
  iconColor,
  label,
  sub,
  onClick,
  right,
}: any) {
  return (
    <button type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-3 rounded-2xl active:bg-white/[0.05] sm:hover:bg-white/[0.04] group transition-all"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}
        >
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-[11px] text-white/30">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <ChevronRight
          size={16}
          className="text-white/20 group-hover:text-white/50 transition-colors"
        />
      </div>
    </button>
  );
}

function SettingRowMinimal({ icon, label, sub, onClick, hideChevron, disabled }: any) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.01, backgroundColor: "rgba(255,255,255,0.03)" }}
      whileTap={disabled ? {} : { scale: 0.98, backgroundColor: "rgba(255,255,255,0.06)" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      type="button"
      onClick={disabled ? undefined : onClick}
      className={clsx(
        "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors group relative overflow-hidden",
        disabled ? "opacity-35 cursor-not-allowed" : ""
      )}
    >
      {!disabled && <TouchRipple />}
      <div className="flex items-center gap-4 relative z-10">
        <div className="text-white/70 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-semibold text-[15px] text-white">{label}</p>
          {sub && (
            <p className="text-[12px] font-medium text-white/40">{sub}</p>
          )}
        </div>
      </div>
      {!hideChevron && (
        <ChevronRight
          size={18}
          className="text-white/20 group-hover:text-white/50 transition-colors relative z-10"
        />
      )}
    </motion.button>
  );
}
