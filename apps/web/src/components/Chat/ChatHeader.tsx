"use client";

import { useState } from "react";
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
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export interface ConversationParticipant {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  joinCode?: string;
  isGroup?: boolean;
}

interface ChatHeaderProps {
  participant: ConversationParticipant;
  isOtherTyping: boolean;
  onBack: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  onViewProfile: () => void;
  onSearch: () => void;
  onBlock: () => void;
  onReport: () => void;
  onClearChat: () => void;
  onExportChat: () => void;
  onOpenSettings: () => void;
  onLeaveGroup?: () => void;
  onOpenVault?: () => void;
  onCatchUp?: () => void;
  showBack?: boolean;
}

const menuItemClass =
  "flex items-center gap-3 px-3 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl cursor-pointer outline-none transition-all group/item";
const dangerItemClass =
  "flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/[0.1] hover:text-red-300 rounded-xl cursor-pointer outline-none transition-all font-medium group/item";

const HeaderBtn = ({ onClick, icon: Icon, label }: { onClick: () => void; icon: any; label: string }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.08, y: -1 }}
    whileTap={{ scale: 0.92 }}
    transition={{ type: "spring", stiffness: 600, damping: 30 }}
    aria-label={label}
    className="p-2.5 text-white/40 hover:text-white rounded-xl hover:bg-white/[0.07] transition-colors"
  >
    <Icon size={20} />
  </motion.button>
);

export default function ChatHeader({
  participant,
  isOtherTyping,
  onBack,
  onCall,
  onVideoCall,
  onViewProfile,
  onSearch,
  onBlock,
  onReport,
  onClearChat,
  onExportChat,
  onOpenSettings,
  onLeaveGroup,
  onOpenVault,
  onCatchUp,
  showBack = true,
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
      className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] z-50 shrink-0"
      style={{
        background: "rgba(5, 5, 10, 0.88)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
      }}
    >
      {/* Back Button — always visible on mobile */}
      {showBack && (
        <motion.button
          onClick={onBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 600, damping: 30 }}
          className="md:hidden p-2 -ml-1 text-white/50 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors shrink-0"
        >
          <ArrowLeft size={22} />
        </motion.button>
      )}

      {/* Avatar + Info */}
      <motion.div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={participant.isGroup ? onOpenSettings : onViewProfile}
        whileHover={{ x: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="relative shrink-0">
          <div
            className={clsx(
              "rounded-full p-0.5 transition-all duration-500",
              participant.isGroup
                ? "bg-gradient-to-br from-violet-600 to-purple-500"
                : participant.isOnline
                ? "bg-gradient-to-br from-emerald-500 to-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.4)]"
                : isOtherTyping
                ? "bg-gradient-to-br from-primary to-purple-500 shadow-[0_0_16px_rgba(98,0,238,0.4)] animate-pulse"
                : "bg-white/10"
            )}
          >
            <img
              src={
                participant.avatarUrl ||
                (participant.isGroup
                  ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(participant.name)}&backgroundColor=6200EE&textColor=ffffff`
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`)
              }
              alt={participant.name}
              className="w-9 h-9 rounded-full object-cover block bg-surface-elevated"
            />
          </div>
          {/* Online dot for DMs */}
          {!participant.isGroup && participant.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#05050a]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h1 className="text-[15px] font-semibold text-white leading-none truncate mb-0.5">
            {participant.name}
          </h1>
          <AnimatePresence mode="popLayout" initial={false}>
            {isOtherTyping ? (
              <motion.span key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] font-medium text-primary tracking-wide">
                typing…
              </motion.span>
            ) : participant.isGroup ? (
              <motion.span key="group" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] text-white/30 tracking-wide">
                Group chat
              </motion.span>
            ) : participant.isOnline ? (
              <motion.span key="online" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] font-medium text-emerald-400 tracking-wide">
                online
              </motion.span>
            ) : (
              <motion.span key="offline" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[11px] text-white/25 tracking-wide">
                offline
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!participant.isGroup && (
          <>
            <HeaderBtn onClick={onCall} icon={Phone} label="Voice call" />
            <HeaderBtn onClick={onVideoCall} icon={Video} label="Video call" />
          </>
        )}
        {onCatchUp && (
          <HeaderBtn onClick={onCatchUp} icon={Sparkles} label="AI Catch Up" />
        )}
        {onOpenVault && (
          <HeaderBtn onClick={onOpenVault} icon={FolderOpen} label="Media Vault" />
        )}
        <HeaderBtn onClick={onOpenSettings} icon={Info} label="Details" />

        {/* Three-Dot Menu */}
        <DropdownMenu.Root onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <motion.button
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className={clsx(
                "p-2.5 rounded-xl transition-colors",
                menuOpen ? "bg-white/[0.1] text-white" : "text-white/40 hover:text-white hover:bg-white/[0.07]"
              )}
            >
              <MoreVertical size={20} />
            </motion.button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[200] min-w-[230px] p-1.5 rounded-2xl shadow-2xl outline-none"
              style={{
                background: "rgba(10, 10, 18, 0.96)",
                backdropFilter: "blur(40px) saturate(200%)",
                WebkitBackdropFilter: "blur(40px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.06)",
              }}
              align="end"
              sideOffset={8}
            >
              {participant.isGroup ? (
                /* ── GROUP MENU ── */
                <>
                  <DropdownMenu.Item onClick={onOpenSettings} className={menuItemClass}>
                    <Settings2 size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    <span>Group Settings</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={handleCopyInvite} className={menuItemClass}>
                    {copiedLink ? (
                      <Check size={17} className="text-emerald-400" />
                    ) : (
                      <LinkIcon size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    )}
                    <span>{copiedLink ? "Link Copied!" : "Copy Invite Link"}</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={menuItemClass}>
                    <BellOff size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    <span>Mute Notifications</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1.5" />
                  <DropdownMenu.Item onClick={onReport} className={dangerItemClass}>
                    <AlertCircle size={17} />
                    <span>Report Group</span>
                  </DropdownMenu.Item>
                  {onLeaveGroup && (
                    <DropdownMenu.Item onClick={onLeaveGroup} className={dangerItemClass}>
                      <LogOut size={17} />
                      <span>Leave Group</span>
                    </DropdownMenu.Item>
                  )}
                </>
              ) : (
                /* ── DM MENU ── */
                <>
                  <DropdownMenu.Item onClick={onViewProfile} className={menuItemClass}>
                    <UserCircle size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    <span>View Profile</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={onSearch} className={menuItemClass}>
                    <Search size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    <span>Search Messages</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={onExportChat} className={menuItemClass}>
                    <FileText size={17} className="text-white/40 group-hover/item:text-white/80 transition-colors" />
                    <span>Export Chat</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-white/[0.06] my-1.5" />
                  <DropdownMenu.Item onClick={onBlock} className={dangerItemClass}>
                    <ShieldX size={17} />
                    <span>Block User</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={onReport} className={dangerItemClass}>
                    <AlertCircle size={17} />
                    <span>Report User</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={onClearChat} className={dangerItemClass}>
                    <Trash2 size={17} />
                    <span>Clear Chat</span>
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
