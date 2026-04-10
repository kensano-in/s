"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  ChevronRight, 
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Plus
} from "lucide-react";
import { User } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { createGroupDB, joinGroupByCodeDB } from "@/app/(main)/messages/actions";
import clsx from "clsx";

interface NewMessageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSelectUser: (user: any) => void;
  onCreated?: (id: string) => void;
}

type View = "main" | "createGroup" | "joinGroup";

export default function NewMessageOverlay({ 
  isOpen, 
  onClose, 
  currentUser,
  onSelectUser,
  onCreated
}: NewMessageOverlayProps) {
  const [view, setView] = useState<View>("main");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [groupName, setGroupName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    } else {
      setView("main");
      setError(null);
    }
  }, [isOpen]);

  async function fetchUsers() {
    if (!currentUser) return;
    setLoading(true);
    const supabase = createClient();
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUser.id)
      .limit(20);
    
    if (data) setUsers(data);
    setLoading(false);
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;
    setIsSubmitting(true);
    setError(null);

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const res = await createGroupDB(currentUser.id, groupName, code);
    
    if (res.success) {
      onCreated?.(res.data.id);
      onClose();
    } else {
      setError(res.error || "Failed to create group.");
    }
    setIsSubmitting(false);
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim() || !currentUser) return;
    setIsSubmitting(true);
    setError(null);

    const res = await joinGroupByCodeDB(currentUser.id, joinCodeInput);
    if (res.success) {
      onCreated?.(res.data.id);
      onClose();
    } else {
      setError(res.error || "Invalid or full group.");
    }
    setIsSubmitting(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-surface border-t border-surface-border rounded-t-[2rem] z-[101] shadow-2xl flex flex-col overflow-hidden h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {view === "main" ? "New Conversation" : view === "createGroup" ? "Create Group" : "Join Group"}
                </h2>
                <p className="text-foreground-muted text-xs font-medium">
                  {view === "main" ? "Connect with someone directly" : "Build or join a community"}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-foreground-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {view === "main" && (
                <>
                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
                    <input 
                      type="text"
                      placeholder="Search by name or username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-foreground-muted"
                    />
                  </div>

                  {/* Group Actions */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                      onClick={() => setView("createGroup")}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl bg-surface-elevated border border-surface-border hover:border-primary/40 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={20} />
                      </div>
                      <span className="text-sm font-bold">Create Group</span>
                    </button>
                    <button
                      onClick={() => setView("joinGroup")}
                      className="flex flex-col items-center gap-3 p-4 rounded-xl bg-surface-elevated border border-surface-border hover:border-emerald-500/40 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <LinkIcon size={20} />
                      </div>
                      <span className="text-sm font-bold">Join Group</span>
                    </button>
                  </div>

                  {/* Users List */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4 px-1">
                      Suggested Contacts
                    </h3>
                    <div className="space-y-1">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => onSelectUser(user)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-elevated transition-colors group"
                        >
                          <img 
                            src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                            className="w-11 h-11 rounded-full object-cover border border-white/5"
                            alt={user.username}
                          />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-foreground-muted truncate">@{user.username}</p>
                          </div>
                          <ChevronRight size={16} className="text-foreground-muted opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </button>
                      ))}
                      {filteredUsers.length === 0 && !loading && (
                        <p className="text-center py-8 text-sm text-foreground-muted">No users found.</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {view === "createGroup" && (
                <div className="animate-fade-in">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-2 block">Group Name</label>
                      <input 
                        type="text"
                        placeholder="Project Alpha, Family, HQ..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full bg-surface-elevated border border-surface-border rounded-xl py-4 px-5 text-white focus:outline-none focus:border-primary/50 transition-all"
                        autoFocus
                      />
                    </div>
                    
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs text-primary/80 leading-relaxed font-medium">
                        Groups in Verlyn are private by default. You can invite members using a unique 6-character code after creation.
                      </p>
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setView("main")}
                        className="flex-1 py-4 font-bold text-sm bg-surface-border rounded-xl hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateGroup}
                        disabled={!groupName.trim() || isSubmitting}
                        className="flex-[2] py-4 bg-primary rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? "Creating..." : "Confirm & Create"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {view === "joinGroup" && (
                <div className="animate-fade-in content-center h-full max-h-[300px]">
                  <div className="text-center space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted mb-4 block">Enter Group Code</label>
                      <input 
                        type="text"
                        placeholder="X7K2P9"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-surface-elevated border border-surface-border rounded-2xl py-6 text-center text-3xl font-black text-white focus:outline-none focus:border-primary/50 transition-all font-mono tracking-[0.3em]"
                        maxLength={8}
                        autoFocus
                      />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setView("main")}
                        className="flex-1 py-4 font-bold text-sm bg-surface-border rounded-xl hover:bg-white/10 transition-all"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleJoinByCode}
                        disabled={joinCodeInput.length < 4 || isSubmitting}
                        className="flex-[2] py-4 bg-emerald-600 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? "Joining..." : "Join Community"}
                      </button>
                    </div>
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
