"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  Clock,
  ShieldAlert,
  MessageSquareOff,
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
} from "lucide-react";
import { CustomThemeSelector } from "./CustomThemeSelector";
import { createClient } from "@/lib/supabase/client";
import {
  getGroupMembersDB,
  getAllUsersForInviteDB,
  addUsersToGroupDB,
  setMemberRoleDB,
  muteMemberDB,
  unmuteMemberDB,
  removeMemberDB,
  updateDMSettingsDB,
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
  className?: string;
  // currentUserId is needed to persist nickname to DB
  currentUserId?: string;
  isGroup?: boolean;
  onMute?: (muted: boolean) => void;
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
  | "options";

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
    id: "solid",
    label: "Solid",
    desc: "Clean & opaque",
    sentBg: "rgb(79,70,229)",
    sentBorder: "transparent",
    recvBg: "rgb(28,28,38)",
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
  // ── God-Tier New Additions ──
  {
    id: "liquid",
    label: "Liquid Metal",
    desc: "Molten chrome glow",
    sentBg: "rgba(0,255,150,0.25)",
    sentBorder: "rgba(0,255,150,0.8)",
    recvBg: "rgba(10,30,20,0.9)",
    filter: "blur(5px)",
    neonShadow: "0 0 25px rgba(0,255,150,0.3)",
  },
  {
    id: "glitch",
    label: "Glitch-Step",
    desc: "RGB distortion layer",
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
    label: "Bio-Slime",
    desc: "Toxic green drip",
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
    label: "Fire-Heart",
    desc: "Smoldering coal pulse",
    sentBg: "rgba(255,69,0,0.3)",
    sentBorder: "rgba(255,140,0,0.9)",
    recvBg: "rgba(40,20,10,0.9)",
    filter: "none",
    neonShadow: "0 0 20px rgba(255,69,0,0.5)",
  },
  {
    id: "toxic",
    label: "Radioactive",
    desc: "Deadly neon isotope",
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
  // ── Absolute God-Tier ──────────────────────────────────────────────────────
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
  onReport,
  onClearChat,
  activeConvId,
  groupJoinCode,
  className,
  currentUserId,
  isGroup,
  onMute,
}: ChatSettingsModalProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hideInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hidePasscode, setHidePasscode] = useState("");

  // Nickname state
  const [theirNick, setTheirNick] = useState(dmSettings?.their_nickname || "");
  const [nickSaved, setNickSaved] = useState(false);
  // Mute state
  const muted = dmSettings?.muted === true;

  // Disappearing
  const disappearing = dmSettings?.disappearing_mode || "off";

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

  // Sync external settings changes into local state
  useEffect(() => {
    setTheirNick(dmSettings?.their_nickname || "");
  }, [dmSettings?.their_nickname]);

  // Sync screen to initialScreen whenever modal opens (deep-link support from 3-dot menu)
  useEffect(() => {
    if (isOpen) {
      setScreen(initialScreen);
      // Fetch members if it's a group
      if (isGroup && activeConvId) {
        getGroupMembersDB(activeConvId).then((res) => {
          if (res.success && res.data) {
            const membersData = res.data as any[];
            setMembers(membersData);
            // Detect current user's role using supabase client
            const supabase = createClient();
            supabase.auth.getUser().then(({ data }) => {
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
      setTimeout(() => setScreen("main"), 300);
      setSelectedInvitees([]);
      setNickEditUser(null);
    }
  }, [isOpen, initialScreen, activeConvId, partnerUsername]);

  const patch = (patch: Record<string, any>) => {
    setDmSettings({ ...dmSettings, ...patch });
  };

  const handleApplyTheme = (themeData: {
    theme_id: string;
    theme_blur: number;
  }) => {
    patch(themeData);
  };

  const handleSaveNicknames = async () => {
    const trimmed = theirNick.trim();
    patch({ their_nickname: trimmed });
    // Persist to DB if we have required IDs
    if (currentUserId && activeConvId && partnerUsername) {
      await updateDMSettingsDB(currentUserId, activeConvId, { their_nickname: trimmed });
    }
    setNickSaved(true);
    setTimeout(() => setNickSaved(false), 2000);
  };

  const handleSetDisappearing = (value: string) => {
    patch({ disappearing_mode: value });
  };

  const handleToggleMute = () => {
    patch({ muted: !muted });
  };

  const handleSaveGroupNick = () => {
    if (!nickEditUser) return;
    const newNicks = { ...groupNicks, [nickEditUser.id]: tempNick.trim() };
    setGroupNicks(newNicks);
    patch({ nicknames: newNicks });
    setNickEditUser(null);
  };

  const handleAddSelectedToGroup = async () => {
    if (!activeConvId || selectedInvitees.length === 0) return;
    setIsMutatingGroup(true);
    const res = await addUsersToGroupDB(activeConvId, selectedInvitees);
    setIsMutatingGroup(false);
    if (!res.success) {
      alert(res.error);
    } else {
      setSelectedInvitees([]);
      alert("Users added.");
      setScreen("main");
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

      const { data, error } = await supabase.storage
        .from("chat-files")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("chat-files")
        .getPublicUrl(data.path);
      onUpdateGroupAvatar(urlData.publicUrl);
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
            className="fixed inset-0 bg-black/60 z-[60] md:hidden"
          />

          {/* Panel */}
          <motion.div
            variants={slide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#0f0f15] border-l border-white/[0.08] z-[70] flex flex-col shadow-2xl ${className || ""}`}
          >
            {/* Header */}
            <div className="flex-shrink-0 h-14 border-b border-white/[0.07] flex items-center gap-3 px-5">
              {screen === "main" ? (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <button
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
                    className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-4"
                  >
                    <div className="flex flex-col items-center px-6">
                      <div className="relative mb-3 group/avatar">
                        <img
                          src={
                            partnerAvatar ||
                            (partnerUsername
                              ? `https://api.dicebear.com/7.x/notionists/svg?seed=${partnerName}&backgroundColor=e5e7eb`
                              : "https://i.pinimg.com/736x/95/92/ff/9592ff3c0903cb6d38e21183cf9c77e6.jpg")
                          }
                          className="w-[100px] h-[100px] rounded-full object-cover border-2 border-surface-high ring-4 ring-black"
                          alt=""
                        />
                        {/* Group Avatar Upload Overlay */}
                        {!partnerUsername && onUpdateGroupAvatar && (
                          <div
                            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer border border-white/20 backdrop-blur-sm"
                            onClick={() =>
                              !isUploading && fileInputRef.current?.click()
                            }
                            title="Update Group Avatar"
                          >
                            {isUploading ? (
                              <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md" />
                            ) : (
                              <Camera className="w-8 h-8 text-white drop-shadow-md" />
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
                      <h2 className="text-[22px] font-bold text-white tracking-tight">
                        {theirNick || partnerName}
                      </h2>
                      {partnerUsername ? (
                        <p className="text-sm font-medium text-white/40 mt-0.5">
                          @{partnerUsername}
                        </p>
                      ) : (
                        <button
                          onClick={() =>
                            !isUploading && fileInputRef.current?.click()
                          }
                          className="text-sm font-bold text-indigo-400 hover:text-indigo-300 mt-1"
                        >
                          Change name and image
                        </button>
                      )}
                    </div>

                    {/* CIRCULAR ACTIONS ROW */}
                    <div className="flex justify-center gap-6 mt-8 mb-6 px-6">
                      <button
                        onClick={() => setScreen("add_people")}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[11px] font-semibold text-white/70">
                          Add
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          onSearch?.();
                          onClose();
                        }}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[11px] font-semibold text-white/70">
                          Search
                        </span>
                      </button>
                      <button
                        onClick={handleToggleMute}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div
                          className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${muted ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/10 text-white group-hover:bg-white/10"}`}
                        >
                          {muted ? (
                            <BellOff className="w-5 h-5" />
                          ) : (
                            <Bell className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-white/70">
                          {muted ? "Unmute" : "Mute"}
                        </span>
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setOptionsDropOpen(!optionsDropOpen)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[11px] font-semibold text-white/70">
                            Options
                          </span>
                        </button>

                        <AnimatePresence>
                          {optionsDropOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                                onClick={() => setOptionsDropOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 150 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 150 }}
                                className="fixed bottom-0 left-0 right-0 bg-[#0a0a0c] rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[70] pb-10 pt-4"
                              >
                                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
                                {(!partnerUsername || groupJoinCode) && (
                                  <button
                                    onClick={() => {
                                      onLeaveGroup?.();
                                      setOptionsDropOpen(false);
                                      onClose();
                                    }}
                                    className="w-full text-left px-5 py-3 text-white font-semibold hover:bg-white/5 flex items-center gap-3"
                                  >
                                    <LogOut size={20} className="text-white" />{" "}
                                    Leave
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setScreen("hide_setup");
                                    setOptionsDropOpen(false);
                                  }}
                                  className="w-full text-left px-5 py-3 text-white font-semibold hover:bg-white/5 flex items-center gap-3"
                                >
                                  <EyeOff size={20} className="text-white" />{" "}
                                  Hide
                                </button>
                                {partnerUsername && (
                                  <button
                                    onClick={() => {
                                      alert(
                                        "Restrict feature pending deployment.",
                                      );
                                      setOptionsDropOpen(false);
                                    }}
                                    className="w-full text-left px-5 py-3 text-white font-semibold hover:bg-white/5 flex items-center gap-3"
                                  >
                                    <UserMinus
                                      size={20}
                                      className="text-white"
                                    />{" "}
                                    Restrict
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm("Block this entity?")) {
                                      onBlock?.();
                                      setOptionsDropOpen(false);
                                      onClose();
                                    }
                                  }}
                                  className="w-full text-left px-5 py-3 text-white font-semibold hover:bg-white/5 flex items-center gap-3"
                                >
                                  <ShieldX size={20} className="text-white" />{" "}
                                  Block
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm("Report violation?")) {
                                      onReport?.();
                                      setOptionsDropOpen(false);
                                      onClose();
                                    }
                                  }}
                                  className="w-full text-left px-5 py-3 text-red-500 font-semibold hover:bg-white/5 flex items-center gap-3"
                                >
                                  <ShieldAlert
                                    size={20}
                                    className="text-red-500"
                                  />{" "}
                                  Report
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* SETTINGS LIST */}
                    <div className="mt-4 px-2">
                      <SettingRowMinimal
                        icon={
                          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 block shadow-sm border border-white/20" />
                        }
                        label="Theme"
                        sub={
                          themeId.startsWith("http")
                            ? "Custom Photo"
                            : themeId
                                .replace(/-/g, " ")
                                .replace(/\b\w/g, (c: string) => c.toUpperCase())
                        }
                        onClick={() => setScreen("theme")}
                      />

                      {/* Only conditionally show code if it's a group, checking partnerUsername presence as proxy, or if joinCode is passed */}
                      {(!partnerUsername || groupJoinCode) && (
                        <SettingRowMinimal
                          icon={<LinkIcon className="w-[18px] h-[18px]" />}
                          label="Invite Link"
                          sub={`https://verlyn.in/j/${groupJoinCode || ""}`}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://verlyn.in/j/${groupJoinCode || ""}`,
                            );
                            alert("Copied to clipboard");
                          }}
                          hideChevron
                        />
                      )}

                      <SettingRowMinimal
                        icon={<Users className="w-[18px] h-[18px]" />}
                        label="People"
                        sub={
                          members.length > 0
                            ? `${members
                                .slice(0, 3)
                                .map((m) => m.username)
                                .join(
                                  ", ",
                                )}${members.length > 3 ? " and others" : ""}`
                            : "View all participants"
                        }
                        onClick={() => setScreen("people_list")}
                      />
                    </div>

                    <div className="mt-3 px-2 border-t border-white/[0.05] pt-3">
                      <SettingRowMinimal
                        icon={<ShieldAlert className="w-[18px] h-[18px]" />}
                        label="Privacy & safety"
                        onClick={() => setScreen("privacy")}
                      />
                      <SettingRowMinimal
                        icon={
                          <MessageSquareOff className="w-[18px] h-[18px]" />
                        }
                        label="Disappearing messages"
                        sub={disappearingLabel}
                        onClick={() => setScreen("disappearing")}
                      />
                      <SettingRowMinimal
                        icon={<Edit3 className="w-[18px] h-[18px]" />}
                        label="Nicknames"
                        sub={theirNick ? `Set as "${theirNick}"` : "Not set"}
                        onClick={() => setScreen("nickname")}
                      />
                      <SettingRowMinimal
                        icon={<CircleDashed className="w-[18px] h-[18px]" />}
                        label="Bubble Style"
                        sub={
                          BUBBLE_STYLES.find(
                            (b) =>
                              b.id === (dmSettings?.bubble_style || "glass"),
                          )?.label ?? "Glass"
                        }
                        onClick={() => setScreen("bubble")}
                      />

                      {(!partnerUsername || groupJoinCode) && (
                        <SettingRowMinimal
                          icon={<Users className="w-[18px] h-[18px]" />}
                          label="Create a new group chat"
                          onClick={() => {}}
                          hideChevron
                        />
                      )}
                    </div>

                    {onClearChat && (
                      <div className="mt-8 px-5">
                        <button
                          onClick={() => {
                            onClearChat();
                            onClose();
                          }}
                          className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-all text-sm tracking-wide"
                        >
                          Clear History
                        </button>
                      </div>
                    )}
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
                      // ── DM Nickname ─────────────────
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 text-white/40 text-[12px]">
                          <Info size={14} />
                          <span>Set a private nickname for this user.</span>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-white/40 uppercase mb-2">
                            Nickname for {partnerName}
                          </label>
                          <input
                            value={theirNick}
                            onChange={(e) => setTheirNick(e.target.value)}
                            placeholder={partnerName}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/10"
                          />
                        </div>
                        <button
                          onClick={handleSaveNicknames}
                          className={`w-full py-3.5 rounded-2xl font-bold transition-all shadow-lg ${nickSaved ? "bg-emerald-600 shadow-emerald-500/20" : "bg-indigo-600 shadow-indigo-500/20 active:scale-[0.98]"}`}
                        >
                          {nickSaved ? "Changes Saved" : "Save Nickname"}
                        </button>
                      </div>
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
                            <button
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
                                      m.avatarUrl ||
                                      `https://api.dicebear.com/7.x/notionists/svg?seed=${m.displayName}&backgroundColor=e5e7eb`
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
                          <p className="text-sm text-white/50">
                            {"https://verlyn.in/j/" + groupJoinCode}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `https://verlyn.in/j/${groupJoinCode}`,
                            );
                            alert("Link Copied");
                          }}
                          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm text-white transition-colors"
                        >
                          Copy
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
                                  u.avatar_url ||
                                  `https://api.dicebear.com/7.x/notionists/svg?seed=${u.display_name}&backgroundColor=e5e7eb`
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
                    {selectedInvitees.length > 0 && (
                      <div className="absolute bottom-4 left-4 right-4 animate-in fade-in slide-in-from-bottom-4">
                        <button
                          disabled={isMutatingGroup}
                          onClick={handleAddSelectedToGroup}
                          className="w-full py-4 bg-indigo-600 rounded-2xl font-bold text-white shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          {isMutatingGroup ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : null}{" "}
                          Add {selectedInvitees.length}{" "}
                          {selectedInvitees.length === 1 ? "person" : "people"}
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
                            className="fixed inset-0 bg-black/70 z-[80]"
                            onClick={() => setMemberAction(null)}
                          />
                          <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#0c0c12] border-t border-white/10 rounded-t-3xl z-[90] pb-10 pt-4 shadow-2xl"
                          >
                            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                            <div className="px-5 mb-4 flex items-center gap-3">
                              <img
                                src={memberAction.member.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${memberAction.member.displayName}`}
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
                                  <button
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
                                  <button
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
                                  <button
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
                                <button
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
                            <button
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
                                src={m.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.displayName}&backgroundColor=e5e7eb`}
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
                                  <button
                                    onClick={() => setMemberAction({ member: m, type: 'role' })}
                                    className="p-2 rounded-xl hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors text-xs font-bold"
                                    title="Change role"
                                  >
                                    <Star size={15} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setMemberAction({ member: m, type: 'mute' })}
                                  className="p-2 rounded-xl hover:bg-amber-500/10 text-white/30 hover:text-amber-400 transition-colors"
                                  title="Mute member"
                                >
                                  <VolumeX size={15} />
                                </button>
                                <button
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
                      <button
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
                    {BUBBLE_STYLES.map((st) => (
                      <button
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
                      <button
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
                    <button
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
                    <button
                      onClick={() => setScreen("main")}
                      className="w-full py-4 text-white/40 font-bold hover:text-white transition-colors"
                    >
                      Cancel
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
    <button
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

function SettingRowMinimal({ icon, label, sub, onClick, hideChevron }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 active:bg-white/[0.05] sm:hover:bg-white/[0.02] rounded-2xl transition-colors group"
    >
      <div className="flex items-center gap-4">
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
          className="text-white/20 group-hover:text-white/50 transition-colors"
        />
      )}
    </button>
  );
}
