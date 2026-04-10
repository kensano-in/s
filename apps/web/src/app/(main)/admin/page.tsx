'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Terminal, UserCheck, UserX, Users, AlertTriangle, X, ShieldAlert, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { escalateUserToPrime, demoteUserToPublic, getAllUsers } from './actions';

// ╔══════════════════════════════════╗
// ║  GHOST ADMIN CONSOLE — TIER 0   ║
// ║  Classified. Do not share URL.  ║
// ╚══════════════════════════════════╝

export default function AdminConsolePage() {
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
    if (passphrase === process.env.NEXT_PUBLIC_ADMIN_PASSPHRASE || passphrase === 'VERLYN_PRIME_2026') {
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
      addLog(`Loaded ${result.users.length} sovereign identities from the database.`);
    }
  };

  const handleEscalate = async () => {
    if (!targetUser) return;
    setIsPending(true);
    addLog(`Initiating PRIME escalation for @${targetUser}...`);

    const formData = new FormData();
    formData.set('passphrase', passphrase);
    formData.set('username', targetUser);
    const result = await escalateUserToPrime(formData);

    if (result.success) {
      addLog(`✓ @${targetUser} ELEVATED TO PRIME. Short-form namespaces now unlocked.`);
      setTargetUser('');
      loadUsers();
    } else {
      addLog(`✗ ESCALATION FAILED: ${result.error}`);
    }
    setIsPending(false);
  };

  const handleDemote = async () => {
    if (!targetUser) return;
    setIsPending(true);
    addLog(`Initiating demotion for @${targetUser}...`);

    const formData = new FormData();
    formData.set('passphrase', passphrase);
    formData.set('username', targetUser);
    const result = await demoteUserToPublic(formData);

    if (result.success) {
      addLog(`✓ @${targetUser} REVERTED TO PUBLIC.`);
      setTargetUser('');
      loadUsers();
    } else {
      addLog(`✗ DEMOTION FAILED: ${result.error}`);
    }
    setIsPending(false);
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 font-mono p-4 md:p-8 relative overflow-hidden">
      {/* Background scanlines effect */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.3) 2px, rgba(0,255,100,0.3) 4px)' }} />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border border-emerald-500/40 rounded-xl p-4 mb-6 bg-black/60 backdrop-blur">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={20} className="text-emerald-400" />
            <span className="text-emerald-400 font-bold text-lg tracking-widest">GHOST CONSOLE // TIER 0</span>
            <span className="ml-auto text-emerald-600 text-xs">SHINKEN SOVEREIGN ADMIN v1.0</span>
          </div>
          <p className="text-emerald-700 text-xs">Classified Terminal — Unauthorized access is a reportable offense.</p>
        </div>

        {/* Moderation Shortcut */}
        <Link
          href="/admin/moderation"
          className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors mb-6 group"
        >
          <ShieldAlert size={18} className="text-red-400" />
          <div>
            <p className="text-sm font-semibold text-white">Moderation Centre</p>
            <p className="text-xs text-white/30">Review user reports &amp; sticker submissions</p>
          </div>
          <ExternalLink size={14} className="text-white/20 ml-auto group-hover:text-white/50 transition-colors" />
        </Link>

        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="border border-emerald-500/30 rounded-xl p-6 bg-black/60"
            >
              <p className="text-emerald-500 mb-4 text-sm">&gt; Identity verification required. Enter admin passphrase:</p>
              <form onSubmit={handleAuth} className="flex gap-3">
                <input
                  type="password"
                  value={passphrase}
                  onChange={e => { setPassphrase(e.target.value); setAuthError(''); }}
                  className="flex-1 bg-transparent border border-emerald-500/40 rounded px-3 py-2 text-emerald-300 focus:outline-none focus:border-emerald-400 text-sm"
                  placeholder="Enter passphrase..."
                  autoFocus
                />
                <button type="submit" className="px-6 py-2 bg-emerald-900/50 border border-emerald-500/40 rounded text-emerald-400 hover:bg-emerald-800/50 transition text-sm font-bold">
                  AUTH →
                </button>
              </form>
              {authError && <p className="text-red-400 text-xs mt-3">{authError}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="console"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Command Terminal Log */}
              <div ref={logRef} className="border border-emerald-500/30 rounded-xl p-4 h-40 overflow-y-auto bg-black/80 hide-scrollbar">
                {log.map((line, i) => (
                  <p key={i} className={`text-xs mb-1 ${line.includes('✓') ? 'text-emerald-300' : line.includes('✗') || line.includes('FAIL') ? 'text-red-400' : 'text-emerald-600'}`}>{line}</p>
                ))}
                <span className="text-emerald-400 text-xs animate-pulse">█</span>
              </div>

              {/* Privilege Escalation Panel */}
              <div className="border border-emerald-500/30 rounded-xl p-5 bg-black/60">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal size={16} />
                  <span className="text-emerald-400 font-bold text-sm tracking-wider">NAMESPACE PRIVILEGE CONTROL</span>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-emerald-500/30 rounded px-3 py-2 bg-black/50">
                    <span className="text-emerald-600">@</span>
                    <input
                      type="text"
                      value={targetUser}
                      onChange={e => setTargetUser(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent text-emerald-300 focus:outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleEscalate}
                    disabled={isPending || !targetUser}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 border border-emerald-500/40 rounded text-emerald-300 hover:bg-emerald-800/50 transition text-sm font-bold disabled:opacity-40"
                  >
                    <UserCheck size={14} /> ESCALATE → PRIME
                  </button>
                  <button
                    onClick={handleDemote}
                    disabled={isPending || !targetUser}
                    className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 hover:bg-red-900/30 transition text-sm font-bold disabled:opacity-40"
                  >
                    <UserX size={14} /> DEMOTE → PUBLIC
                  </button>
                </div>
                <p className="text-emerald-700 text-xs mt-3">
                  <AlertTriangle size={10} className="inline mr-1" />
                  PRIME accounts bypass the 5-char namespace constraint. Short handles (1-4 chars) are unlocked.
                </p>
              </div>

              {/* User Table */}
              <div className="border border-emerald-500/30 rounded-xl p-5 bg-black/60">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span className="text-emerald-400 font-bold text-sm tracking-wider">SOVEREIGN REGISTRY ({allUsers.length})</span>
                  </div>
                  <button onClick={loadUsers} className="text-emerald-600 text-xs hover:text-emerald-400 transition">REFRESH</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-emerald-700 border-b border-emerald-900">
                        <th className="text-left pb-2">USERNAME</th>
                        <th className="text-left pb-2">DISPLAY NAME</th>
                        <th className="text-left pb-2">ROLE</th>
                        <th className="text-left pb-2">JOINED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id} className="border-b border-emerald-900/40 hover:bg-emerald-900/10">
                          <td className="py-2 text-emerald-300 cursor-pointer hover:text-emerald-100" onClick={() => setTargetUser(user.username)}>@{user.username}</td>
                          <td className="py-2 text-emerald-600">{user.display_name}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'PRIME' ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' : 'bg-emerald-900/30 text-emerald-600 border border-emerald-700/30'}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-2 text-emerald-700">{new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allUsers.length === 0 && <p className="text-emerald-700 text-xs text-center py-4">No users in registry yet.</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
