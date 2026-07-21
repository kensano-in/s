"use client";

import { useState, useEffect, memo } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  UserCircle,
  Search,
  ShieldX,
  Trash2,
  FileText,
  AlertCircle,
  Info,
  LogOut,
  Link as LinkIcon,
  Check,
  BellOff,
  Settings2,
  FolderOpen,
  Sparkles,
  Star,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import TouchRipple from "@/components/ui/TouchRipple";
import { getAvatarUrl, getCommunityIconUrl } from "@/lib/utils";

export interface ConversationParticipant {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  joinCode?: string;
  isGroup?: boolean;
  presenceExpiresAt?: string | null;
  invisibleMode?: boolean;
}

interface ChatHeaderProps {
  participant: ConversationParticipant;
  isOtherRecording?: boolean;
  onBack: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onViewProfile?: () => void;
  onSearch?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  isBlocked?: boolean;
  isBlockedByPartner?: boolean;
  onReport?: () => void;
  onClearChat?: () => void;
  onExportChat?: () => void;
  onOpenSettings?: () => void;
  onLeaveGroup?: () => void;
  onOpenVault?: () => void;
  onOpenStarredMessages?: () => void;
  onCatchUp?: () => void;
  showBack?: boolean;
  isMuted?: boolean;
  onMute?: (muted: boolean) => void;
}

const menuItemClass =
  "flex items-center gap-3 px-3 py-2.5 text-sm text-white/55 hover:text-white hover:bg-white/[0.07] rounded-[var(--radius-sm)] cursor-pointer outline-none transition-all group/item relative overflow-hidden";
const dangerItemClass =
  "flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/[0.1] hover:text-rose-300 rounded-[var(--radius-sm)] cursor-pointer outline-none transition-all font-medium group/item relative overflow-hidden";

const HeaderBtn = ({ onClick, icon: Icon, label, disabled }: { onClick?: () => void; icon: any; label: string; disabled?: boolean }) => (
  <motion.button
    onClick={disabled ? undefined : onClick}
    whileHover={disabled ? {} : { scale: 1.08 }}
    whileTap={disabled ? {} : { scale: 0.88 }}
    transition={{ type: "spring", stiffness: 620, damping: 32 }}
    aria-label={label}
    className={clsx(
      "p-2.5 rounded-xl transition-[background,color] duration-[80ms] ease-out relative overflow-hidden",
      disabled
        ? "text-white/10 cursor-not-allowed opacity-30"
        : "text-white/38 hover:text-white/85 hover:bg-white/[0.055]"
    )}
  >
    {!disabled && <TouchRipple color="rgba(255,255,255,0.12)" />}
    <Icon size={18} strokeWidth={1.6} className="relative z-10" />
  </motion.button>
);

const getLastSeenText = (presenceExpiresAt: string | null | undefined): string => {
  if (!presenceExpiresAt) return "last seen recently";
  try {
    let cleanStr = presenceExpiresAt.trim();
    // If the database timestamp lacks a timezone indicator (Z or +/- offset), force UTC (Z)
    if (!cleanStr.endsWith("Z") && !cleanStr.match(/[+-]\d{2}:?\d{2}$/)) {
      // Replace space separator with 'T' for standard ISO compatibility
      cleanStr = cleanStr.replace(" ", "T");
      if (!cleanStr.includes("Z")) {
        cleanStr += "Z";
      }
    }
    const expiredTime = new Date(cleanStr).getTime();
    if (isNaN(expiredTime)) return "last seen recently";

    const now = Date.now();

    // presenceExpiresAt is a future expiry — if still in future, user is online
    if (expiredTime > now) return "online";

    // User is offline — presenceExpiresAt is approx when they went offline
    const diffMs = now - expiredTime;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return "last seen just now";
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    if (diffHours < 24) return `last seen ${diffHours}h ago`;
    if (diffDays === 1) return "last seen yesterday";
    if (diffDays < 7) return `last seen ${diffDays}d ago`;
    return "last seen a while ago";
  } catch {
    return "last seen recently";
  }
};

const LastSeenStatus = memo(function LastSeenStatus({ presenceExpiresAt }: { presenceExpiresAt?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.span key="offline" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] text-muted-foreground/80 tracking-wide font-medium lowercase">
      {getLastSeenText(presenceExpiresAt)}
    </motion.span>
  );
});

export default function ChatHeader({
  participant,
  isOtherRecording,
  onBack,
  onCall,
  onVideoCall,
  onViewProfile,
  onSearch,
  onBlock,
  onUnblock,
  isBlocked = false,
  isBlockedByPartner = false,
  onReport,
  onClearChat,
  onExportChat,
  onOpenSettings,
  onLeaveGroup,
  onOpenVault,
  onOpenStarredMessages,
  onCatchUp,
  showBack = true,
  isMuted,
  onMute,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyInvite = () => {
    const link = participant.joinCode
      ? `${window.location.origin}/j/${participant.joinCode}`
      : participant.joinCode ?? "";
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 shrink-0 z-30 sticky top-0"
      style={{
        background: "rgba(5,5,8,0.88)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.02), 0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Back Button — always visible on mobile */}
      {showBack && (
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className="md:hidden p-2 -ml-1 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors shrink-0 relative overflow-hidden"
        >
          <TouchRipple />
          <ArrowLeft size={22} className="relative z-10" />
        </motion.button>
      )}

      {/* Avatar + Info */}
      <motion.div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => participant.isGroup ? onOpenSettings?.() : onViewProfile?.()}
        whileHover={{ x: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="relative shrink-0">
          <div
            className={clsx(
              "rounded-full p-0.5 transition-all duration-500",
              participant.isGroup
                ? "bg-gradient-to-br from-primary/80 to-primary/40"
                : participant.isOnline
                ? "bg-emerald-500/30"
                : "bg-white/10"
            )}
          >
            <img
              src={
                participant.isGroup
                  ? getCommunityIconUrl(participant.name, participant.avatarUrl)
                  : getAvatarUrl(participant.username, participant.avatarUrl)
              }
              alt={participant.name}
              className="w-9 h-9 rounded-full object-cover block bg-surface-elevated"
            />
          </div>
          {/* Online dot for DMs */}
          {!participant.isGroup && participant.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-[#05050a]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h1 className="text-[15px] font-bold text-foreground leading-none truncate mb-0.5 tracking-tight">
            {participant.name}
            {participant.isOnline && !participant.invisibleMode && <span className="ml-1.5 w-1.2 h-1.2 rounded-full inline-block bg-emerald-500/40" title="Active" />}
          </h1>
          <AnimatePresence mode="popLayout" initial={false}>
            {participant.invisibleMode ? null : isOtherRecording ? (
              <motion.span key="recording" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] font-bold text-rose-400 tracking-wide uppercase animate-pulse">
                recording audio…
              </motion.span>
            ) : participant.isGroup ? (
              <motion.span key="group" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] text-muted-foreground tracking-wide font-medium">
                Group Chat
              </motion.span>
            ) : participant.isOnline ? (
              <motion.span key="online" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] font-medium text-emerald-500/50 tracking-wide lowercase">
                online
              </motion.span>
            ) : (
              <LastSeenStatus presenceExpiresAt={participant.presenceExpiresAt} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!participant.isGroup && (
          <>
            <HeaderBtn onClick={onCall} icon={Phone} label="Voice call" disabled={isBlocked || isBlockedByPartner} />
            <HeaderBtn onClick={onVideoCall} icon={Video} label="Video call" disabled={isBlocked || isBlockedByPartner} />
          </>
        )}
        <HeaderBtn onClick={onOpenSettings} icon={Info} label="Details" />

        {/* Three-Dot Menu */}
        <DropdownMenu.Root onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 620, damping: 32 }}
              className={clsx(
                "p-2.5 rounded-xl transition-[background,color] duration-[80ms] ease-out relative overflow-hidden",
                menuOpen ? "bg-white/[0.08] text-white/85" : "text-white/38 hover:text-white/85 hover:bg-white/[0.055]"
              )}
            >
              <TouchRipple color="rgba(255,255,255,0.12)" />
              <MoreVertical size={18} strokeWidth={1.6} className="relative z-10" />
            </motion.button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[200] min-w-[230px] p-1.5 rounded-[var(--radius-lg)] shadow-[0_8px_48px_rgba(0,0,0,0.7),0_2px_12px_rgba(0,0,0,0.5)] outline-none border border-white/[0.08] flex flex-col gap-0.5 max-h-[80vh] overflow-y-auto"
              style={{
                background: "#0f0f17",
                backdropFilter: "blur(24px) saturate(140%)",
                WebkitBackdropFilter: "blur(24px) saturate(140%)",
                isolation: "isolate",
                colorScheme: "dark",
              }}
              align="end"
              sideOffset={8}
              collisionPadding={8}
              avoidCollisions={true}
            >
              {participant.isGroup ? (
                /* ── GROUP MENU ── */
                <>
                  <DropdownMenu.Item onClick={() => onOpenSettings?.()} className={menuItemClass}>
                    <TouchRipple />
                    <Settings2 size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    <span className="relative z-10">Group Settings</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={handleCopyInvite} className={menuItemClass}>
                    <TouchRipple />
                    {copiedLink ? (
                      <Check size={17} className="text-emerald-400 relative z-10" />
                    ) : (
                      <LinkIcon size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    )}
                    <span className="relative z-10">{copiedLink ? "Link Copied!" : "Copy Invite Link"}</span>
                  </DropdownMenu.Item>
                  {onOpenStarredMessages && (
                    <DropdownMenu.Item onClick={onOpenStarredMessages} className={menuItemClass}>
                      <TouchRipple />
                      <Star size={17} className="text-white/40 group-hover/item:text-yellow-400 transition-colors relative z-10" />
                      <span className="relative z-10">Starred Messages</span>
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item onClick={() => onMute?.(!isMuted)} className={menuItemClass}>
                    <TouchRipple />
                    {isMuted ? (
                      <Check size={17} className="text-emerald-400 relative z-10" />
                    ) : (
                      <BellOff size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    )}
                    <span className="relative z-10">{isMuted ? "Unmute" : "Mute Notifications"}</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1.5" />
                  <DropdownMenu.Item onClick={() => onReport?.()} className={dangerItemClass}>
                    <TouchRipple />
                    <AlertCircle size={17} className="relative z-10" />
                    <span className="relative z-10">Report Group</span>
                  </DropdownMenu.Item>
                  {onLeaveGroup && (
                    <DropdownMenu.Item onClick={onLeaveGroup} className={dangerItemClass}>
                    <TouchRipple />
                    <LogOut size={17} className="relative z-10" />
                    <span className="relative z-10">Leave Group</span>
                  </DropdownMenu.Item>
                  )}
                </>
              ) : (
                /* ── DM MENU ── */
                <>
                  <DropdownMenu.Item onClick={() => onViewProfile?.()} className={menuItemClass}>
                    <TouchRipple />
                    <UserCircle size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    <span className="relative z-10">View Profile</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onSearch?.()} className={menuItemClass}>
                    <TouchRipple />
                    <Search size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    <span className="relative z-10">Search Messages</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onExportChat?.()} className={menuItemClass}>
                    <TouchRipple />
                    <FileText size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors relative z-10" />
                    <span className="relative z-10">Export Chat</span>
                  </DropdownMenu.Item>
                  {onOpenStarredMessages && (
                    <DropdownMenu.Item onClick={onOpenStarredMessages} className={menuItemClass}>
                      <TouchRipple />
                      <Star size={17} className="text-white/40 group-hover/item:text-yellow-400 transition-colors relative z-10" />
                      <span className="relative z-10">Starred Messages</span>
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Separator className="h-px bg-white/10 my-1.5" />
                  <DropdownMenu.Item onClick={() => onReport?.()} className={menuItemClass}>
                    <TouchRipple />
                    <AlertCircle size={17} className="text-rose-400 relative z-10" />
                    <span className="text-rose-400 relative z-10">Report User</span>
                  </DropdownMenu.Item>
                  {isBlocked ? (
                    <DropdownMenu.Item onClick={() => onUnblock?.()} className={menuItemClass}>
                      <TouchRipple />
                      <ShieldX size={17} className="text-emerald-400 relative z-10" />
                      <span className="text-emerald-400 relative z-10">Unblock User</span>
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item onClick={() => onBlock?.()} className={dangerItemClass}>
                      <TouchRipple />
                      <ShieldX size={17} className="relative z-10" />
                      <span className="relative z-10">Block User</span>
                    </DropdownMenu.Item>
                  )}
                  <DropdownMenu.Item onClick={() => onClearChat?.()} className={dangerItemClass}>
                    <TouchRipple />
                    <Trash2 size={17} className="relative z-10" />
                    <span className="relative z-10">Clear Chat History</span>
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
