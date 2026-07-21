'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Lock, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { updatePassword } from '../actions';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold text-[13px] py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]"
    >
      {pending ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          <ShieldCheck size={16} />
          <span>Update Password</span>
          <ArrowRight size={14} className="ml-1" />
        </>
      )}
    </button>
  );
}

export default function UpdatePasswordContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordTooWeak = password.length > 0 && password.length < 12;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md bg-zinc-950/40 p-8 sm:p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-xl relative z-10 flex flex-col shadow-2xl"
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 text-blue-400">
          <Lock className="w-6 h-6 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight font-display">Update Password</h1>
        <p className="text-zinc-500 text-xs mb-8 max-w-[320px] leading-relaxed">
          Create a strong, unique password to secure your account.
        </p>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-xl flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
            {message}
          </span>
        </motion.div>
      )}

      <form action={updatePassword} className="space-y-6">
        <div className="space-y-2 relative">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">New Password</label>
          <div className="relative flex items-center">
            <input
              key={showPassword ? 'text-input' : 'password-input'}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-white/[0.04] rounded-xl pl-4 pr-12 py-3 text-sm font-medium text-white focus:outline-none placeholder-neutral-700 transition-all font-sans"
              placeholder="••••••••"
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-neutral-500 hover:text-white transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isPasswordTooWeak && (
            <p className="text-[10px] text-rose-500/80 font-medium ml-1">
              Password must be at least 12 characters long.
            </p>
          )}
        </div>

        <div className="pt-2">
          <SubmitButton disabled={isPasswordTooWeak || !password} />
        </div>

        <div className="pt-4 border-t border-white/5 flex justify-center">
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-white font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </form>
    </motion.div>
  );
}
