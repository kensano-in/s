'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Loader2, ArrowRight } from 'lucide-react';
import { joinGroupByCodeDB } from '@/app/(main)/messages/actions';

export default function JoinGroupClient({ code, group, userId }: { code: string, group: any, userId: string | null }) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!userId) {
      // Not logged in -> push to auth and tell it where to jump back
      router.push(`/auth`);
      return;
    }

    setIsJoining(true);
    setError('');

    const res = await joinGroupByCodeDB(userId, code);
    if (res.success && res.data) {
      // Boom. In the group.
      router.push(`/messages`);
    } else {
      setError(res.error || 'Failed to initialize sequence.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Massive ambient core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMSkiLz48L3N2Zz4=')] opacity-50 z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm bg-black/40 backdrop-blur-3xl rounded-[2.5rem] p-8 text-center relative z-10 border border-white/[0.08] shadow-[0_0_80px_-15px_rgba(79,70,229,0.25)]"
      >
        {/* Animated Cyber Ring */}
        <div className="relative mx-auto w-32 h-32 mb-8 group flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[-10px] rounded-full border border-dashed border-indigo-500/40 border-t-indigo-400"
          />
          <motion.div 
            animate={{ rotate: -360 }} 
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-[-20px] rounded-full border border-white/10"
          />
          
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)]">
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0a0a0c] rounded-full flex items-center justify-center border border-indigo-500/50 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Users size={16} className="text-indigo-400" />
          </div>
        </div>

        <div className="inline-block px-3 py-1 mb-4 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-[0.3em] uppercase backdrop-blur-md">
          Sanctuary Protocol
        </div>
        
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-400 mb-2 drop-shadow-xl">{group.name}</h1>
        <p className="text-white/40 text-[13px] mb-8 font-mono tracking-tight">
          YOU HAVE BEEN SUMMONED TO INITIALIZE A SECURE CONNECTION TERMINAL.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] font-mono shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            [ERR] {error}
          </div>
        )}

        <button 
          onClick={handleJoin}
          disabled={isJoining}
          className="relative w-full h-[60px] flex items-center justify-center gap-3 rounded-2xl overflow-hidden group transition-all"
        >
          {/* Button Background & Border Base */}
          <div className="absolute inset-0 bg-indigo-600/20 border border-indigo-500/50 rounded-2xl transition-colors group-hover:bg-indigo-500 group-hover:border-indigo-400" />
          {/* Cyber lines animation */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_2s_infinite_linear] opacity-0 group-hover:opacity-100" />

          {/* Button content */}
          <span className="relative z-10 flex items-center gap-3 text-[14px] font-bold tracking-widest uppercase text-indigo-300 group-hover:text-white transition-colors duration-300">
            {isJoining ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {userId ? 'Accept Authorization' : 'Initialize to Join'}
                <ArrowRight size={18} />
              </>
            )}
          </span>
        </button>

        <div className="mt-8 pt-6 border-t border-white/[0.05]">
          <p className="text-white/30 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            NODE: {code} <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </p>
        </div>
      </motion.div>
    </div>
  );
}
