"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  ChevronRight,
  X,
  Link as LinkIcon,
  ArrowLeft,
  MessageCircle,
  Plus,
  Camera,
  Check,
  UserPlus,
  Shield,
  Lock,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createGroupDB,
  joinGroupByCodeDB,
  getGroupByJoinCodeDB,
} from "@/app/(main)/messages/actions";
import { getAvatarUrl } from "@/lib/utils";
import { parseBio } from "@/lib/profile-metadata";

interface NewMessageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  // FIX-3: renamed so the parent always uses requestAnimationFrame before navigation
  onSelectUser: (user: any) => void;
  onCreated?: (id: string, groupData?: any) => void;
}

type View = "main" | "createGroup" | "joinGroup" | "profile";
type CreateStep = 1 | 2 | 3;

const DEBOUNCE_MS = 280;

// ─── Create Group Step 1: Name + Icon + Settings ─────────────────────────────
function CreateGroupStep1({
  name, setName, description, setDescription,
  iconPreview, onIconChange, requiresApproval, setRequiresApproval,
  onNext,
}: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="p-5 space-y-5 flex flex-col h-full">
      {/* Icon picker */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/[0.12] hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all flex items-center justify-center group overflow-hidden"
        >
          {iconPreview ? (
            <>
              <img src={iconPreview} className="absolute inset-0 w-full h-full object-cover" alt="Group icon" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={18} className="text-white" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Camera size={20} className="text-white/30 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[10px] text-white/25 font-medium">Photo</span>
            </div>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onIconChange} />
      </div>

      {/* Group name */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2 block">
          Group Name <span className="text-indigo-400">*</span>
        </label>
        <input
          type="text"
          placeholder="Family, Work, Squad..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoFocus
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-4 px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-white/20"
        />
        <p className="text-[10px] text-white/20 text-right mt-1">{name.length}/50</p>
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2 block">
          Description <span className="text-white/20">(optional)</span>
        </label>
        <textarea
          placeholder="What's this group about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 px-5 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-white/20 resize-none"
        />
      </div>

      {/* Admin approval toggle */}
      <button
        type="button"
        onClick={() => setRequiresApproval(!requiresApproval)}
        className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all w-full text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          requiresApproval ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.05] text-white/30"
        }`}>
          <Shield size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Require Admin Approval</p>
          <p className="text-xs text-white/30 mt-0.5">New members wait for your approval before joining</p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          requiresApproval ? "border-amber-400 bg-amber-400" : "border-white/20"
        }`}>
          {requiresApproval && <Check size={11} className="text-black" strokeWidth={3} />}
        </div>
      </button>

      <div className="flex-1" />
      <button
        type="button"
        onClick={onNext}
        disabled={!name.trim()}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 active:scale-[0.98] shadow-lg shadow-indigo-500/20"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Create Group Step 2: Add Members ────────────────────────────────────────
function CreateGroupStep2({
  currentUserId, selectedMembers, setSelectedMembers, onNext, onSkip, isCreating,
}: any) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<any>(null);

  const fetchUsers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("users")
        .select("id, username, display_name, avatar_url, is_online")
        .neq("id", currentUserId);
      if (q.trim()) {
        query = query.or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`);
      }
      const { data } = await query.order("username").limit(30);
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(val), 280);
  };

  const toggle = (user: any) => {
    setSelectedMembers((prev: any[]) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="px-5 pt-3 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={15} />
          <input
            type="text"
            placeholder="Search people to add..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-white/25"
          />
        </div>
      </div>

      {/* Selected preview chips */}
      {selectedMembers.length > 0 && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          {selectedMembers.map((u: any) => (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/25 rounded-full text-xs text-indigo-300 hover:bg-red-500/15 hover:border-red-500/25 hover:text-red-300 transition-all"
            >
              <img src={getAvatarUrl(u.username, u.avatar_url)} className="w-4 h-4 rounded-full" alt="" />
              {u.display_name || u.username}
              <X size={10} />
            </button>
          ))}
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-5 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
              <div className="w-10 h-10 rounded-full bg-white/[0.05] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/[0.05] rounded-full w-2/5" />
                <div className="h-2 bg-white/[0.03] rounded-full w-1/4" />
              </div>
            </div>
          ))
        ) : users.map((user) => {
          const isSelected = !!selectedMembers.find((u: any) => u.id === user.id);
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => toggle(user)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                isSelected ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/[0.05] border border-transparent"
              }`}
            >
              <div className="relative shrink-0">
                <img src={getAvatarUrl(user.username, user.avatar_url)} className="w-10 h-10 rounded-full object-cover" alt={user.username} />
                {user.is_online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0f0f15] rounded-full" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.display_name || user.username}</p>
                <p className="text-xs text-white/30 truncate">@{user.username}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected ? "border-indigo-400 bg-indigo-400" : "border-white/20"
              }`}>
                {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={isCreating}
          className="flex-1 py-3.5 text-sm font-semibold rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] transition-all text-white/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isCreating}
          className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selectedMembers.length > 0 ? `Add ${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""}` : "Create Group"}
        </button>
      </div>
    </div>
  );
}

// ─── Join Group: code input + preview ────────────────────────────────────────
function JoinGroupView({ currentUser, onCreated, onClose, onBack }: any) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"joined" | "pending" | null>(null);
  const debounceRef = useRef<any>(null);

  const handleCodeChange = (val: string) => {
    // Alphanumeric, case-insensitive (clean up spaces/hyphens for robustness)
    const clean = val.replace(/[^a-zA-Z0-9]/g, "");
    setCode(clean);
    setError(null);
    setPreview(null);
    setSuccess(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clean.length >= 6) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await getGroupByJoinCodeDB(clean);
          if (res.success) setPreview(res.data);
          else setError("Group not found with this code.");
        } finally {
          setLoading(false);
        }
      }, 400);
    }
  };

  const handleJoin = async () => {
    if (!code.trim() || !currentUser || !preview) return;
    setJoining(true);
    setError(null);
    try {
      const res = await joinGroupByCodeDB(currentUser.id, code);
      if (res.success) {
        if (res.data?.pending_approval) {
          setSuccess("pending");
        } else {
          setSuccess("joined");
          setTimeout(() => {
            onCreated?.(res.data.id, res.data);
            onClose();
          }, 1200);
        }
      } else {
        setError(res.error || "Failed to join group.");
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      {/* Code input */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-2 block">
          Invite Code
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. H4K9PX2L"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-4 px-5 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all placeholder:text-white/20 font-mono tracking-widest"
            maxLength={10}
            autoFocus
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={16} className="text-white/30 animate-spin" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400 mt-2 px-1">{error}</p>}
      </div>

      {/* Group preview card */}
      <AnimatePresence>
        {preview && !success && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center overflow-hidden shrink-0">
              {preview.icon_url ? (
                <img src={preview.icon_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <Users size={20} className="text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{preview.name}</p>
              {preview.requires_join_approval && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={11} className="text-amber-400" />
                  <p className="text-[11px] text-amber-400/80">Admin approval required</p>
                </div>
              )}
            </div>
            {preview.requires_join_approval ? (
              <Lock size={16} className="text-amber-400/60 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400/60 shrink-0" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success states */}
      <AnimatePresence>
        {success === "joined" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
          >
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300 font-medium">You've joined <strong>{preview?.name}</strong>!</p>
          </motion.div>
        )}
        {success === "pending" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
          >
            <Clock size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Request sent!</p>
              <p className="text-xs text-amber-400/60 mt-0.5">Waiting for admin approval to join <strong>{preview?.name}</strong>.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!success && (
        <button
          type="button"
          onClick={handleJoin}
          disabled={!preview || joining}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {joining ? (
            <><Loader2 size={16} className="animate-spin" /> Joining...</>
          ) : (
            <><UserPlus size={16} /> {preview?.requires_join_approval ? "Request to Join" : "Join Group"}</>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewMessageOverlay({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onCreated,
}: NewMessageOverlayProps) {
  const [view, setView] = useState<View>("main");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Create Group wizard state
  const [createStep, setCreateStep] = useState<CreateStep>(1);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIconFile, setGroupIconFile] = useState<File | null>(null);
  const [groupIconPreview, setGroupIconPreview] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async (query = "") => {
    if (!currentUser) return;
    setLoading(true);
    setIsTyping(false);
    try {
      const supabase = createClient();
      let q = supabase
        .from("users")
        .select("id, username, display_name, avatar_url, bio, is_online, follower_count, following_count")
        .neq("id", currentUser.id);
      if (query.trim()) {
        q = q.or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`);
      }
      const { data } = await q.order("username", { ascending: true }).limit(30);
      if (data) setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setFocusedIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), 150);
    } else {
      // Reset all state on close
      setView("main");
      setSearch("");
      setError(null);
      setIsTyping(false);
      setCreateStep(1);
      setGroupName("");
      setGroupDescription("");
      setGroupIconFile(null);
      setGroupIconPreview(null);
      setRequiresApproval(false);
      setSelectedMembers([]);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    }
  }, [isOpen, fetchUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setFocusedIndex(-1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim()) setIsTyping(true);
    else setIsTyping(false);
    searchDebounceRef.current = setTimeout(() => fetchUsers(value), DEBOUNCE_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (view !== "main") return;
    const total = users.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((i) => Math.min(i + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusedIndex >= 0 && users[focusedIndex]) {
      e.preventDefault();
      setSelectedUser(users[focusedIndex]);
      setView("profile");
    } else if (e.key === "Escape") onClose();
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupIconFile(file);
    const url = URL.createObjectURL(file);
    setGroupIconPreview(url);
  };

  const handleCreateGroup = async () => {
    if (isCreating) return;
    if (!groupName.trim() || !currentUser) return;
    setIsCreating(true);
    setError(null);
    try {
      let iconUrl: string | undefined;
      if (groupIconFile) {
        const supabase = createClient();
        const ext = groupIconFile.name.split(".").pop();
        const path = `group-avatars/${Date.now()}.${ext}`;
        
        try {
          const formData = new FormData();
          formData.append("file", groupIconFile, groupIconFile.name);
          formData.append("folder", "chat-files");
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Upload API returned non-200");
          const resData = await res.json();
          iconUrl = resData.url;
        } catch (apiErr) {
          console.warn("R2 upload failed for group icon, trying Supabase storage:", apiErr);
          const { error: upErr } = await supabase.storage.from("chat-files").upload(path, groupIconFile, { upsert: true });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
            iconUrl = urlData.publicUrl;
          }
        }
      }

      const memberIds = selectedMembers.map((u) => u.id);
      const res = await createGroupDB(
        currentUser.id,
        groupName.trim(),
        undefined,
        iconUrl,
        groupDescription.trim() || undefined,
        requiresApproval,
        memberIds
      );

      if (res.success) {
        onCreated?.(res.data.id, res.data);
        onClose();
      } else {
        setError(res.error || "Failed to create group.");
      }
    } catch (err: any) {
      console.error("handleCreateGroup error:", err);
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (view === "main") return "New Message";
    if (view === "createGroup") return createStep === 1 ? "Create Group" : "Add Members";
    if (view === "joinGroup") return "Join Group";
    if (view === "profile") return "Profile";
    return "New Message";
  }, [view, createStep]);

  const showSkeleton = isTyping || loading;
  const showEmptySearch = !showSkeleton && users.length === 0 && search.trim();
  const showEmptySuggested = !showSkeleton && users.length === 0 && !search.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 240 }}
            className="absolute bottom-0 left-0 right-0 max-w-xl mx-auto bg-[#0f0f15] border border-white/[0.06] rounded-t-[2rem] z-[101] shadow-2xl flex flex-col overflow-hidden h-[90vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                {view !== "main" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (view === "createGroup" && createStep > 1) {
                        setCreateStep((s) => (s - 1) as CreateStep);
                      } else {
                        setView("main");
                        setError(null);
                      }
                    }}
                    className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white leading-none">{headerTitle}</h2>
                  {view === "createGroup" && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {[1, 2].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-all ${
                            createStep >= step ? "w-6 bg-indigo-500" : "w-3 bg-white/15"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  {view === "profile" && selectedUser?.username && (
                    <p className="text-white/30 text-xs mt-0.5">@{selectedUser.username}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: "none" }}>

              {/* ── Main View ──────────────────────────────────────────────── */}
              {view === "main" && (
                <div className="p-5">
                  {/* Search */}
                  <div className="relative mb-5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={16} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search people..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all placeholder:text-white/25"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => { handleSearchChange(""); searchInputRef.current?.focus(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Group actions — only shown when not searching */}
                  {!search.trim() && (
                    <div className="grid grid-cols-2 gap-2.5 mb-6">
                      <button
                        type="button"
                        onClick={() => { setView("createGroup"); setCreateStep(1); }}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                          <Users size={18} />
                        </div>
                        <span className="text-sm font-semibold text-white/80">Create Group</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("joinGroup")}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                          <LinkIcon size={18} />
                        </div>
                        <span className="text-sm font-semibold text-white/80">Join Group</span>
                      </button>
                    </div>
                  )}

                  {/* Users section */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25 mb-3 px-1">
                      {search.trim() ? "Results" : "Suggested"}
                    </p>

                    {showSkeleton && (
                      <div className="space-y-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl animate-pulse">
                            <div className="w-11 h-11 rounded-full bg-white/[0.05] shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-white/[0.05] rounded-full w-2/5" />
                              <div className="h-2.5 bg-white/[0.03] rounded-full w-1/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!showSkeleton && (
                      <div className="space-y-0.5">
                        {users.map((user, idx) => {
                          const isFocused = focusedIndex === idx;
                          return (
                            <button
                              type="button"
                              key={user.id}
                              onClick={() => { setSelectedUser(user); setView("profile"); }}
                              onMouseEnter={() => setFocusedIndex(idx)}
                              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${
                                isFocused ? "bg-white/[0.07]" : "hover:bg-white/[0.05]"
                              }`}
                            >
                              <div className="relative shrink-0">
                                <img
                                  src={getAvatarUrl(user.username, user.avatar_url)}
                                  className="w-11 h-11 rounded-full object-cover"
                                  alt={user.username}
                                />
                                {user.is_online && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0f0f15] rounded-full" />
                                )}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user.display_name || user.username}</p>
                                <p className="text-xs text-white/30 truncate">@{user.username}</p>
                              </div>
                              <ChevronRight size={15} className="text-white/20 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {showEmptySearch && (
                      <div className="py-12 text-center">
                        <p className="text-white/25 text-sm">No results for <span className="text-white/50">"{search}"</span></p>
                      </div>
                    )}
                    {showEmptySuggested && (
                      <div className="py-12 text-center">
                        <p className="text-white/20 text-sm">Type a name to start searching</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Create Group View ──────────────────────────────────────── */}
              {view === "createGroup" && (
                <div className="flex flex-col h-full min-h-0">
                  {createStep === 1 && (
                    <CreateGroupStep1
                      name={groupName}
                      setName={setGroupName}
                      description={groupDescription}
                      setDescription={setGroupDescription}
                      iconPreview={groupIconPreview}
                      onIconChange={handleIconChange}
                      requiresApproval={requiresApproval}
                      setRequiresApproval={setRequiresApproval}
                      onNext={() => setCreateStep(2)}
                    />
                  )}
                  {createStep === 2 && (
                    <div className="flex flex-col h-full">
                      <CreateGroupStep2
                        currentUserId={currentUser?.id}
                        selectedMembers={selectedMembers}
                        setSelectedMembers={setSelectedMembers}
                        isCreating={isCreating}
                        onSkip={handleCreateGroup}
                        onNext={handleCreateGroup}
                      />
                      {error && (
                        <div className="px-5 pb-2">
                          <p className="text-sm text-red-400 text-center">{error}</p>
                        </div>
                      )}
                      {isCreating && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-t-[2rem]">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 size={28} className="text-indigo-400 animate-spin" />
                            <p className="text-white/60 text-sm">Creating group...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Join Group View ────────────────────────────────────────── */}
              {view === "joinGroup" && (
                <JoinGroupView
                  currentUser={currentUser}
                  onCreated={onCreated}
                  onClose={onClose}
                  onBack={() => setView("main")}
                />
              )}

              {/* ── Profile View ───────────────────────────────────────────── */}
              {view === "profile" && selectedUser && (
                <div className="flex flex-col items-center px-6 pt-8 pb-6 space-y-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
                      <img
                        src={getAvatarUrl(selectedUser.username, selectedUser.avatar_url)}
                        className="w-full h-full object-cover"
                        alt={selectedUser.username}
                      />
                    </div>
                    {selectedUser.is_online && (
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 border-2 border-[#0f0f15] rounded-full shadow-lg" />
                    )}
                  </div>

                  {/* Name + username */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white">{selectedUser.display_name || selectedUser.username}</h3>
                    <p className="text-sm text-indigo-400 mt-0.5">@{selectedUser.username}</p>
                    {selectedUser.is_online && (
                      <p className="text-xs text-emerald-400/70 mt-1">● Active now</p>
                    )}
                  </div>

                  {/* Bio */}
                  {selectedUser.bio && (
                    <p className="text-sm text-white/40 text-center max-w-xs leading-relaxed px-4">
                      {parseBio(selectedUser.bio).visibleBio || selectedUser.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-10 text-center py-5 border-y border-white/[0.06] w-full justify-center">
                    <div>
                      <p className="text-xl font-bold text-white">{selectedUser.follower_count ?? "—"}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mt-0.5">Followers</p>
                    </div>
                    <div className="w-px bg-white/[0.06]" />
                    <div>
                      <p className="text-xl font-bold text-white">{selectedUser.following_count ?? "—"}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mt-0.5">Following</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => setView("main")}
                      className="flex-1 py-3.5 text-sm font-semibold rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] transition-all text-white/60 active:scale-[0.98]"
                    >
                      Back
                    </button>
                    {/* FIX-3: Use requestAnimationFrame to yield before calling onSelectUser */}
                    {/* This prevents the crash caused by Next.js route change firing during exit animation */}
                    <button
                      type="button"
                      onClick={() => {
                        const user = selectedUser;
                        console.log('[DEBUG] Message button clicked for user:', user);
                        onClose(); // Close first (starts exit animation)
                        // Wait for the exit animation (spring damping/stiffness) to finish completely (~350ms)
                        // to prevent Framer Motion from crashing during the Next.js route transition.
                        setTimeout(() => {
                          onSelectUser(user);
                        }, 350);
                      }}
                      className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
