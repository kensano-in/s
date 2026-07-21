'use client';

import { useState, useTransition } from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, Calendar, KeyRound, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { requestPasswordResetAction } from './actions';
import { submitManualAuditRequest } from '../login/audit-actions';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [tab, setTab] = useState<'standard' | 'manual'>('standard');
  const [identifier, setIdentifier] = useState('');
  
  // Standard Recovery States
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Manual Review States
  const [manualUsername, setManualUsername] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualStatement, setManualStatement] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState(false);

  // Advanced structured verification states
  const [creationMonth, setCreationMonth] = useState('');
  const [creationYear, setCreationYear] = useState('');
  const [lastPassword, setLastPassword] = useState('');
  const [location, setLocation] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [frequentContacts, setFrequentContacts] = useState('');
  const [selectedOAuth, setSelectedOAuth] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [profileGender, setProfileGender] = useState('');
  const [communities, setCommunities] = useState('');
  const [caseRef, setCaseRef] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your username or email address.');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await requestPasswordResetAction(identifier);
      if (res.success) {
        setSuccessMessage(res.message || 'If a matching account exists, a secure password reset link has been dispatched.');
      } else {
        setError(res.error || 'Failed to request recovery. Please try again.');
      }
    });
  };

  const handleManualAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUsername.trim() && !manualEmail.trim()) {
      setManualError('Please enter at least your username or registered email.');
      return;
    }
    if (!manualStatement.trim() || manualStatement.trim().length < 20) {
      setManualError('Please provide a statement explaining your ownership details (minimum 20 characters).');
      return;
    }

    setManualError(null);

    startTransition(async () => {
      const res = await submitManualAuditRequest(manualUsername || manualEmail, {
        username: manualUsername,
        email: manualEmail,
        displayName,
        phoneLast4,
        profileGender,
        communities,
        creationMonth,
        creationYear,
        lastPassword,
        location,
        frequentContacts,
        linkedOAuth: selectedOAuth,
        devices: selectedDevices,
        userStatement: manualStatement.trim(),
      });
      if (res.success) {
        setManualSuccess(true);
        setManualStatement('');
        setManualUsername('');
        setManualEmail('');
        setCreationMonth('');
        setCreationYear('');
        setLastPassword('');
        setLocation('');
        setSelectedDevices([]);
        setBirthMonth('');
        setBirthYear('');
        setFrequentContacts('');
        setSelectedOAuth([]);
        setDisplayName('');
        setPhoneLast4('');
        setProfileGender('');
        setCommunities('');
        // Generate complex 24-char case reference
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const ts = Date.now().toString(36).toUpperCase();
        const rand = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        setCaseRef(`VRL-${ts}-${rand.slice(0,6)}-${rand.slice(6,12)}-${rand.slice(12)}-${new Date().getFullYear()}`);
      } else {
        setManualError(res.error || 'Failed to submit manual review request.');
      }
    });
  };

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-start relative overflow-x-hidden overflow-y-auto py-12 px-4 font-sans">
      {/* Premium Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none opacity-50"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full ${tab === 'manual' ? 'max-w-xl' : 'max-w-md'} bg-zinc-955/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl relative z-10 flex flex-col shadow-2xl border-outline-variant/10 transition-all duration-500 ease-in-out`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 text-blue-400">
            <Mail className="w-6 h-6" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Recover Account</h1>
          <p className="text-zinc-500 text-xs mb-6 max-w-[320px] leading-relaxed">
            Choose a recovery method to regain access to your account.
          </p>

          {/* Tab Selection */}
          <div className="flex w-full bg-white/[0.02] border border-white/5 p-1 rounded-xl mb-6">
            <button
              onClick={() => {
                setTab('standard');
                setError(null);
                setManualError(null);
              }}
              disabled={isPending}
              className={`flex-1 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${tab === 'standard' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              Reset Link
            </button>
            <button
              onClick={() => {
                setTab('manual');
                setError(null);
                setManualError(null);
              }}
              disabled={isPending}
              className={`flex-1 py-2 text-[11px] font-extrabold uppercase tracking-wider rounded-lg transition-all ${tab === 'manual' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              Manual Review
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'standard' ? (
            successMessage ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-xl flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <span className="text-[12px] font-medium leading-relaxed">
                    {successMessage}
                  </span>
                </div>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center bg-white text-black font-extrabold text-[13px] py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-center"
                >
                  Back to Login
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleReset}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Username or Email</label>
                  <input
                    type="text"
                    placeholder="name@example.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value.toLowerCase())}
                    disabled={isPending}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-[13px] py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                <div className="pt-4 border-t border-white/5 flex justify-center">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-white font-bold transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel and Return
                  </Link>
                </div>
              </motion.form>
            )
          ) : (
            manualSuccess ? (
              <motion.div
                key="manual-success"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                className="space-y-5 text-left"
              >
                {/* Case Filed Confirmation */}
                <div className="p-5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-400">Case Filed Successfully</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Your identity audit request has been registered and assigned to our Security Compliance Team. A case reference has been created.
                    </p>
                  </div>
                </div>

                {/* Case Reference */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Case Reference ID</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(caseRef);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest border transition-all ${
                        copiedRef
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {copiedRef ? <Check size={9} className="stroke-[3]" /> : <span>⎘</span>}
                      {copiedRef ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] font-extrabold text-white tracking-[0.18em] font-mono break-all leading-relaxed">
                    {caseRef}
                  </p>
                </div>

                {/* Review Timeline */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Review Process</p>
                  <div className="space-y-0 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {[
                      {
                        step: '01',
                        title: 'Audit Received',
                        desc: 'Your submission is now in the queue. Our compliance system logs every request with a timestamp.',
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/8',
                        status: 'done'
                      },
                      {
                        step: '02',
                        title: 'Data Cross-Check (0–12 hrs)',
                        desc: 'Our team verifies each data point you provided against secured account records — username, email, profile metadata, device history, and contact graph.',
                        color: 'text-amber-400',
                        bg: 'bg-amber-500/8',
                        status: 'active'
                      },
                      {
                        step: '03',
                        title: 'Decision Issued (12–24 hrs)',
                        desc: 'A compliance officer issues a formal Verified or Rejected decision. A secure notification is sent to the registered email of record.',
                        color: 'text-purple-400',
                        bg: 'bg-purple-500/8',
                        status: 'pending'
                      },
                    ].map(item => (
                      <div key={item.step} className={`p-4 flex items-start gap-3.5 ${item.bg}`}>
                        <span className={`text-[10px] font-black font-mono shrink-0 mt-0.5 ${item.color}`}>{item.step}</span>
                        <div className="space-y-0.5">
                          <p className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${item.color}`}>{item.title}</p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outcome Scenarios */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Possible Outcomes</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Verified */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-400">If Verified</p>
                      </div>
                      <ul className="space-y-1.5 text-[9.5px] text-zinc-400 leading-relaxed">
                        <li>→ Secure reset link sent to account email</li>
                        <li>→ Temporary access window of 15 minutes</li>
                        <li>→ You will be prompted to update password & re-verify identity</li>
                        <li>→ Account security log is updated</li>
                      </ul>
                    </div>

                    {/* Rejected */}
                    <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-rose-400">If Not Verified</p>
                      </div>
                      <ul className="space-y-1.5 text-[9.5px] text-zinc-400 leading-relaxed">
                        <li>→ Request is formally denied</li>
                        <li>→ No account changes are made</li>
                        <li>→ Case is closed & logged for security</li>
                        <li>→ You may re-appeal after 72 hours</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How We Contact You */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400">How We Will Contact You</p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    All communications are sent <span className="text-white font-semibold">only to the registered email address</span> on the account — not the email you submitted here. We will <span className="text-white font-semibold">never</span> ask for your password over email or DM. Official Verlyn compliance emails come from <span className="text-blue-400 font-semibold">security@verlyn.in</span> only.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-[13px] py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors uppercase tracking-wider text-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Login
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key="manual-form"
                onSubmit={handleManualAudit}
                className="space-y-5 text-left"
              >
                {/* Secure Compliance Header Badge */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">Cryptographic Identity Audit</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Provide structured metadata below. Our security compliance office will verify the information against audit history within 24 hours.
                    </p>
                  </div>
                </div>

                {/* Account Identifier: Username + Email */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Username */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 text-sm">@</span>
                      <input
                        type="text"
                        placeholder="your_username"
                        value={manualUsername}
                        onChange={e => setManualUsername(e.target.value.toLowerCase())}
                        disabled={isPending}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-8 pr-4 py-3 text-sm font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                      />
                    </div>
                  </div>

                  {/* Registered Email */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={manualEmail}
                        onChange={e => setManualEmail(e.target.value.toLowerCase())}
                        disabled={isPending}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-8 pr-4 py-3 text-sm font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* High-Signal Identity Signals: Display Name + Phone + Gender + Communities */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Display Name</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 text-xs font-bold">✦</span>
                      <input
                        type="text"
                        placeholder="Your visible name"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        disabled={isPending}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-8 pr-4 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Last 4 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Phone Last 4 Digits</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 text-xs font-bold">#</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="e.g. 4821"
                        value={phoneLast4}
                        onChange={e => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        disabled={isPending}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-8 pr-4 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all tracking-[0.3em]"
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Type + Communities */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Profile Gender / Avatar Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Profile Type</label>
                    <select
                      value={profileGender}
                      onChange={e => setProfileGender(e.target.value)}
                      disabled={isPending}
                      className="w-full bg-[#0a0a0d] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl px-3 py-3 text-xs font-medium text-white focus:outline-none transition-all cursor-pointer"
                      style={{ backgroundColor: '#0a0a0d', color: profileGender ? '#ffffff' : '#737373' }}
                    >
                      <option value="" style={{ backgroundColor: '#0a0a0d', color: '#737373' }}>Select type</option>
                      <option value="Male" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>Male</option>
                      <option value="Female" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>Female</option>
                      <option value="Non-binary" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>Non-binary</option>
                      <option value="Prefer not to say" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>Prefer not to say</option>
                    </select>
                  </div>

                  {/* Communities Joined */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Communities / Topics</label>
                    <input
                      type="text"
                      placeholder="e.g. anime, tech, music"
                      value={communities}
                      onChange={e => setCommunities(e.target.value)}
                      disabled={isPending}
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl px-3 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                    />
                  </div>
                </div>


                {/* Frequent Contacts */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Frequent Contacts</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 text-sm">@</span>
                    <input
                      type="text"
                      placeholder="nahoya, shinichiro"
                      value={frequentContacts}
                      onChange={e => setFrequentContacts(e.target.value)}
                      disabled={isPending}
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-8 pr-4 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                    />
                  </div>
                </div>


                {/* Linked OAuth Toggles */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Linked OAuth Providers</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Google Account', value: 'Google' },
                      { label: 'GitHub Account', value: 'GitHub' },
                      { label: 'Discord Account', value: 'Discord' }
                    ].map(provider => {
                      const isSelected = selectedOAuth.includes(provider.value);
                      return (
                        <button
                          key={provider.value}
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setSelectedOAuth(prev =>
                              prev.includes(provider.value)
                                ? prev.filter(p => p !== provider.value)
                                : [...prev, provider.value]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                              : 'bg-white/[0.01] border-white/5 text-neutral-500 hover:text-white hover:border-white/15'
                          }`}
                        >
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                          {provider.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Structured Columns */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Approximate Creation */}
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Approx. Creation</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={creationMonth}
                        onChange={e => setCreationMonth(e.target.value)}
                        disabled={isPending}
                        required
                        className="w-full bg-[#0a0a0d] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl px-3 py-3 text-xs font-medium text-white focus:outline-none transition-all cursor-pointer"
                        style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}
                      >
                        <option value="" className="text-neutral-500 bg-[#0a0a0d]" style={{ backgroundColor: '#0a0a0d', color: '#737373' }}>Month</option>
                        {[
                          { value: '01', label: 'Jan' },
                          { value: '02', label: 'Feb' },
                          { value: '03', label: 'Mar' },
                          { value: '04', label: 'Apr' },
                          { value: '05', label: 'May' },
                          { value: '06', label: 'Jun' },
                          { value: '07', label: 'Jul' },
                          { value: '08', label: 'Aug' },
                          { value: '09', label: 'Sep' },
                          { value: '10', label: 'Oct' },
                          { value: '11', label: 'Nov' },
                          { value: '12', label: 'Dec' }
                        ].map(m => (
                          <option key={m.value} value={m.value} className="text-white bg-[#0a0a0d]" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>{m.label}</option>
                        ))}
                      </select>

                      <select
                        value={creationYear}
                        onChange={e => setCreationYear(e.target.value)}
                        disabled={isPending}
                        required
                        className="w-full bg-[#0a0a0d] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl px-3 py-3 text-xs font-medium text-white focus:outline-none transition-all cursor-pointer"
                        style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}
                      >
                        <option value="" className="text-neutral-500 bg-[#0a0a0d]" style={{ backgroundColor: '#0a0a0d', color: '#737373' }}>Year</option>
                        {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                          const y = String(new Date().getFullYear() - i);
                          return (
                            <option key={y} value={y} className="text-white bg-[#0a0a0d]" style={{ backgroundColor: '#0a0a0d', color: '#ffffff' }}>{y}</option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Last Known Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Last Password (optional)</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={lastPassword}
                        onChange={e => setLastPassword(e.target.value)}
                        disabled={isPending}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-11 pr-4 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Box */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Registered Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. New York, USA"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      disabled={isPending}
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-11 pr-4 py-3 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all"
                    />
                  </div>
                </div>

                {/* Device Pill Buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Associated Devices</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'iPhone/iPad', value: 'iOS' },
                      { label: 'Android Phone', value: 'Android' },
                      { label: 'Windows PC', value: 'Windows' },
                      { label: 'MacBook/Mac', value: 'macOS' },
                      { label: 'Linux PC', value: 'Linux' }
                    ].map(device => {
                      const isSelected = selectedDevices.includes(device.value);
                      return (
                        <button
                          key={device.value}
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setSelectedDevices(prev =>
                              prev.includes(device.value)
                                ? prev.filter(d => d !== device.value)
                                : [...prev, device.value]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                              : 'bg-white/[0.01] border-white/5 text-neutral-500 hover:text-white hover:border-white/15'
                          }`}
                        >
                          {isSelected && <Check size={10} className="stroke-[3]" />}
                          {device.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Statement Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Ownership Statement</label>
                    <span className="text-[9px] text-neutral-600 font-bold">{manualStatement.length} chars</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Describe any extra context (connected OAuth accounts, last active date, billing card last 4 digits) to verify ownership."
                    value={manualStatement}
                    onChange={e => setManualStatement(e.target.value)}
                    disabled={isPending}
                    required
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-2xl p-4 text-xs font-medium text-white focus:outline-none placeholder-neutral-700 transition-all resize-none leading-relaxed"
                  />
                </div>

                {manualError && (
                  <div className="p-4 rounded-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">{manualError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-[13px] py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Submit Audit Request</span>
                  )}
                </button>

                <div className="pt-4 border-t border-white/5 flex justify-center">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-white font-bold transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel and Return
                  </Link>
                </div>
              </motion.form>
            )
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
