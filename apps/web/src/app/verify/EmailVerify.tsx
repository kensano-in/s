'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowRight, Activity, ShieldCheck, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmailVerify() {
  const supabase = createClient();
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState('');

  const handleResend = async () => {
    setResending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/feed` }
      });
      if (error) setMsg(error.message);
      else setMsg('Verification email queued. Check your inbox.');
    } else {
      setMsg('Unable to verify current user session.');
    }
    setResending(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-zinc-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-xl relative z-10 flex flex-col items-center text-center shadow-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>
        
        <h1 className="text-2xl font-medium text-white mb-2 tracking-tight">Access Restricted</h1>
        <p className="text-zinc-400 mb-8 max-w-[280px] leading-relaxed">
          Your identity must be verified before entering the platform. A secure link has been dispatched to your email.
        </p>

        <button type="button" 
          onClick={handleResend}
          disabled={resending}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {resending ? <Activity className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
          {resending ? 'Dispatched...' : 'Resend Verification Link'}
        </button>

        {msg && (
          <p className="mt-4 text-sm text-blue-400 min-h-[20px]">{msg}</p>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 w-full flex justify-center">
          <button type="button" 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out & return
          </button>
        </div>
      </motion.div>
    </div>
  );
}
