'use client';

import { useAppStore } from '@/lib/store';
import { ShieldCheck, ShieldAlert, Zap, Target, Loader2, Info, CheckCircle2, ChevronRight, Award, Lock, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccountIntegrity() {
  const { currentUser } = useAppStore();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchStats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('users').select('profile_completeness, security_score, last_login').eq('id', currentUser.id).single();
      if (data) setProfileData(data);
      setLoading(false);
    };
    fetchStats();
  }, [currentUser?.id]);

  const securityStatus = useMemo(() => {
      if (!profileData) return { label: 'Analyzing...', color: 'text-on-surface-variant', bg: 'bg-surface-high', icon: ShieldAlert };
      const score = profileData.security_score;
      if (score >= 80) return { label: 'High Security (Prime)', color: 'text-v-emerald', bg: 'bg-v-emerald/10', icon: ShieldCheck, border: 'border-v-emerald/20' };
      if (score >= 50) return { label: 'Medium Security', color: 'text-v-cyan', bg: 'bg-v-cyan/10', icon: ShieldCheck, border: 'border-v-cyan/20' };
      return { label: 'Low Security (Protocol Risk)', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: ShieldAlert, border: 'border-rose-400/20' };
  }, [profileData]);

  if (loading) return (
      <div className="flex items-center justify-center h-32 opacity-50">
        <Loader2 className="animate-spin" />
      </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mb-10">
      {/* Security Status Box */}
      <div className={`p-6 rounded-[32px] border ${securityStatus.border} ${securityStatus.bg} relative overflow-hidden group shadow-2xl`}>
         <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <securityStatus.icon size={120} />
         </div>
         <div className="relative z-10 flex flex-col justify-between h-full space-y-4 italic">
            <div>
               <div className="flex items-center gap-2 mb-2">
                 <div className={`w-2 h-2 rounded-full ${securityStatus.color} animate-pulse shadow-[0_0_8px_currentColor]`} />
                 <span className={`text-[10px] font-black uppercase tracking-widest ${securityStatus.color}`}>Sovereign Shield Active</span>
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                  {securityStatus.label}
               </h3>
               <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest mt-2">
                  SCORE: {profileData?.security_score ?? 0}% • ENCRYPTION KERNEL: ACTIVE
               </p>
            </div>
            <div className="flex gap-2">
               {profileData?.security_score < 80 && (
                   <button className="px-4 py-2 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-v-cyan transition-colors shadow-lg active:scale-95">
                      Boost Protocols
                   </button>
               )}
               <button className="px-4 py-2 bg-surface-high/50 text-on-surface-variant border border-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-black transition-all">
                  Audit Logs
               </button>
            </div>
         </div>
      </div>

      {/* Profile Integrity Box */}
      <div className="p-6 rounded-[32px] border border-white/5 bg-surface-lowest/40 relative overflow-hidden group shadow-xl italic">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award size={100} />
         </div>
         <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
               <Target size={14} className="text-v-violet" /> Identity Completion
            </div>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                 <span className="text-4xl font-black text-white italic truncate pr-2">
                    {profileData?.profile_completeness ?? 0}%
                 </span>
                 <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest pb-1.5">Network Signal Strong</span>
              </div>
              <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${profileData?.profile_completeness ?? 0}%` }}
                  className="h-full bg-primary-gradient shadow-[0_0_12px_rgba(108,99,255,0.4)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                    <CheckCircle2 size={12} className={profileData?.profile_completeness > 20 ? "text-v-emerald" : ""} /> AVATAR
                 </div>
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                    <CheckCircle2 size={12} className={profileData?.profile_completeness > 40 ? "text-v-emerald" : ""} /> BIO DATA
                 </div>
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                    <CheckCircle2 size={12} className={profileData?.profile_completeness > 60 ? "text-v-emerald" : ""} /> USERNAME
                 </div>
                 <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                    <CheckCircle2 size={12} className={profileData?.profile_completeness > 80 ? "text-v-emerald" : ""} /> EMAIL AUTH
                 </div>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
