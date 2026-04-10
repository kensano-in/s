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
  X,
  Info
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  showBack?: boolean;
}

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
  showBack = true,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-surface-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      {/* Back Button (Mobile) */}
      {showBack && (
        <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
      )}

      {/* Profile Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative shrink-0">
          <img
            src={participant.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`}
            alt={participant.name}
            className="w-10 h-10 rounded-full object-cover border border-white/10"
          />
          {participant.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h1 className="text-[15px] font-bold text-white leading-none truncate mb-1">
            {participant.name}
          </h1>
          <div className="flex items-center gap-2">
            {isOtherTyping ? (
              <span className="text-[11px] font-bold text-primary animate-pulse uppercase tracking-wider">
                typing...
              </span>
            ) : participant.isOnline ? (
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                Active Now
              </span>
            ) : (
              <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-widest">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button 
          onClick={onCall} 
          className="p-2.5 text-foreground-muted hover:text-white hover:bg-white/5 rounded-full transition-all"
        >
          <Phone size={20} />
        </button>
        <button 
          onClick={onVideoCall} 
          className="p-2.5 text-foreground-muted hover:text-white hover:bg-white/5 rounded-full transition-all"
        >
          <Video size={20} />
        </button>
        <button 
          onClick={onOpenSettings} 
          className="p-2.5 text-foreground-muted hover:text-white hover:bg-white/5 rounded-full transition-all"
        >
          <Info size={20} />
        </button>
        
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="p-2.5 text-foreground-muted hover:text-white hover:bg-white/5 rounded-full transition-all">
              <MoreVertical size={20} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content 
              className="z-[100] min-w-[200px] bg-surface-elevated border border-surface-border rounded-xl p-1 shadow-2xl animate-fade-in"
              align="end"
            >
              <DropdownMenu.Item 
                onClick={onViewProfile}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none"
              >
                <UserCircle size={18} />
                View Profile
              </DropdownMenu.Item>

              <DropdownMenu.Item 
                onClick={onSearch}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none"
              >
                <Search size={18} />
                Search Conversation
              </DropdownMenu.Item>

              <DropdownMenu.Item 
                onClick={onExportChat}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-lg cursor-pointer outline-none"
              >
                <FileText size={18} />
                Export Chat
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-surface-border my-1" />

              <DropdownMenu.Item 
                onClick={onBlock}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none font-medium"
              >
                <ShieldX size={18} />
                Block User
              </DropdownMenu.Item>

              <DropdownMenu.Item 
                onClick={onReport}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none font-medium"
              >
                <AlertCircle size={18} />
                Report Violation
              </DropdownMenu.Item>

              <DropdownMenu.Item 
                onClick={onClearChat}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none font-medium"
              >
                <Trash2 size={18} />
                Clear Chat
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
