'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Terminal, UserCheck, UserX, Users, AlertTriangle, X, ShieldAlert, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { escalateUserToPrime, demoteUserToPublic, getAllUsers } from './actions';

export default function AdminConsoleContent() {
  const [passphrase, setPassphrase] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [log, setLog] = useState<string[]>(['> SHINKEN Ghost Console v1.0.0', '> Awaiting authentication...']);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [targetUser, setTargetUser] = useState('');
  const [isPending, setIsPending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const addLog = (msg: string) => setLog(prev => [...prev, `> ${msg}`]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase === process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE) {
      setUnlocked(true);
      addLog('Authentication successful. Welcome, Administrator.');
      loadUsers();
    } else {
      setAuthError('ACCESS DENIED: Invalid passphrase.');
      addLog('AUTH FAILURE: Invalid passphrase attempt logged.');
    }
  };

  const loadUsers = async () => {
    const result = await getAllUsers();
    if (result.users) {
      setAllUsers(result.users);
      addLog(`Loaded ${result.users.length} user profiles from the database.`);
    }
  };

  const handleEscalate = async (username: string) => {
    if (!username.trim()) return;
    setIsPending(true);
    addLog(`Initiating PRIME escalation for @${username}...`);
    try {
      const formData = new FormData();
      formData.set('passphrase', passphrase);
      formData.set('username', username);
      const res = await escalateUserToPrime(formData);
      if (res.success) {
        addLog(`SUCCESS: @${username} is now a PRIME citizen.`);
        loadUsers();
      } else {
        addLog(`ERROR: ${res.error}`);
      }
    } catch (e: any) {
      addLog(`FATAL: ${e.message}`);
    } finally {
      setIsPending(false);
      setTargetUser('');
    }
  };

  const handleDemote = async (username: string) => {
    if (!username.trim()) return;
    setIsPending(true);
    addLog(`Initiating demotion for @${username} to PUBLIC tier...`);
    try {
      const formData = new FormData();
      formData.set('passphrase', passphrase);
      formData.set('username', username);
      const res = await demoteUserToPublic(formData);
      if (res.success) {
        addLog(`SUCCESS: @${username} demoted to PUBLIC.`);
        loadUsers();
      } else {
        addLog(`ERROR: ${res.error}`);
      }
    } catch (e: any) {
      addLog(`FATAL: ${e.message}`);
    } finally {
      setIsPending(false);
      setTargetUser('');
    }
  };

  return (
    <div className="w-full space-y-8 py-6 font-mono text-zinc-300">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <Shield size={18} className="animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Security Level: Tier 0</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-500" />
            GHOST ADMIN GATEWAY
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/moderation"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all text-neutral-400 hover:text-white"
          >
            <ShieldAlert size={14} />
            Safety & Moderation
            <ExternalLink size={12} className="opacity-50" />
          </Link>
        </div>
      </div>

      {!unlocked ? (
        <div className="max-w-md mx-auto py-12">
          <form onSubmit={handleAuth} className="glass-card p-8 rounded-2xl border border-zinc-800/80 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Passphrase Required</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                This console is classified. Authorized access only.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                placeholder="ENTER PASSPHRASE"
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-center tracking-widest text-sm focus:outline-none focus:border-red-500/30 transition-all"
                autoFocus
              />
              {authError && (
                <p className="text-[10px] text-red-500 text-center font-bold uppercase tracking-wider">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all"
            >
              Verify Passphrase
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Terminal Output */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 ml-1">
              <span>SYSTEM_CONSOLE_STREAM</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                ONLINE
              </span>
            </div>
            
            <div 
              ref={logRef}
              className="w-full h-[350px] bg-black border border-zinc-800 rounded-2xl p-6 font-mono text-[11px] leading-relaxed overflow-y-auto space-y-2 selection:bg-zinc-800"
            >
              {log.map((line, idx) => (
                <div key={idx} className={clsx(
                  line.includes('SUCCESS') && 'text-emerald-400',
                  line.includes('ERROR') && 'text-red-400',
                  line.includes('AUTH') && 'text-yellow-500',
                  line.includes('escalate') && 'text-blue-400',
                  line.includes('demote') && 'text-orange-400',
                  !line.includes('SUCCESS') && !line.includes('ERROR') && !line.includes('AUTH') && !line.includes('escalate') && !line.includes('demote') && 'text-zinc-400'
                )}>
                  {line}
                </div>
              ))}
            </div>

            {/* Quick Actions Form */}
            <div className="glass-card p-6 rounded-2xl border border-zinc-800/80 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Target Manipulation</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="TARGET_USERNAME"
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value.replace('@', ''))}
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-zinc-700 transition-all font-mono"
                  disabled={isPending}
                />
                <button
                  onClick={() => handleEscalate(targetUser)}
                  disabled={isPending || !targetUser}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <UserCheck size={14} />
                  Escalate
                </button>
                <button
                  onClick={() => handleDemote(targetUser)}
                  disabled={isPending || !targetUser}
                  className="px-5 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <UserX size={14} />
                  Demote
                </button>
              </div>
            </div>
          </div>

          {/* Right: User Directory */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 ml-1">
              <span>USER_DIRECTORY</span>
              <span className="flex items-center gap-1">
                <Users size={12} />
                {allUsers.length} total
              </span>
            </div>

            <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden h-[490px] overflow-y-auto">
              {allUsers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-600">
                  No directory entries
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {allUsers.map((u) => (
                    <div key={u.id} className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-950/40 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">@{u.username}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{u.display_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          'text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded border',
                          u.tier === 'PRIME' 
                            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
                            : 'text-zinc-500 bg-zinc-500/5 border-zinc-800'
                        )}>
                          {u.tier}
                        </span>
                        
                        <div className="flex gap-1">
                          {u.tier !== 'PRIME' ? (
                            <button
                              type="button"
                              onClick={() => handleEscalate(u.username)}
                              disabled={isPending}
                              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400 transition-colors"
                              title="Escalate to PRIME"
                            >
                              <UserCheck size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDemote(u.username)}
                              disabled={isPending}
                              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-orange-400 transition-colors"
                              title="Demote to PUBLIC"
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
