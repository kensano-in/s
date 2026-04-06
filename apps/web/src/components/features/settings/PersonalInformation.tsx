'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Camera, Save, Loader2, CheckCircle2, User as UserIcon, Mail, Phone, AtSign, FileText as BioIcon, AlertCircle } from 'lucide-react';
import { updateProfileInfo, checkUsernameUniqueness } from '@/app/(main)/settings/actions';
import { uploadMedia } from '@/app/(main)/feed/upload';
import { motion, AnimatePresence } from 'framer-motion';

export default function PersonalInformation() {
  const { currentUser, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [formData, setFormData] = useState({
    display_name: currentUser?.displayName || '',
    username: currentUser?.username || '',
    bio: currentUser?.bio || '',
    phone: '',
  });

  // Real-time username check
  useEffect(() => {
    if (!formData.username || formData.username === currentUser?.username) {
        setUsernameValid(null);
        return;
    }
    const timer = setTimeout(async () => {
        setCheckingUsername(true);
        const { isUnique } = await checkUsernameUniqueness(formData.username);
        setUsernameValid(isUnique);
        setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, currentUser?.username]);

  const handleSave = async () => {
    if (!currentUser?.id) return;
    if (usernameValid === false) { setError('Username is already broadcast in this network.'); return; }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfileInfo(currentUser.id, formData);
    if (result.success) {
      setUser({
        ...currentUser,
        displayName: formData.display_name,
        username: formData.username,
        bio: formData.bio,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');

    const result = await uploadMedia(fd);
    if ('url' in result) {
      await updateProfileInfo(currentUser.id, { avatar_url: result.url });
      setUser({ ...currentUser, avatar: result.url });
      setSuccess(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-6 p-8 glass-card border-none bg-surface-lowest/40 rounded-[32px] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <UserIcon size={120} />
        </div>
        <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input')?.click()}>
          <div className="w-24 h-24 rounded-[28px] overflow-hidden bg-surface-high border-2 border-white/5 group-hover:border-v-cyan transition-all shadow-xl p-0.5">
             <img src={currentUser?.avatar} alt="Avatar" className="w-full h-full object-cover rounded-[24px] group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[28px] flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
          <input id="avatar-input" type="file" className="hidden" accept="image/*" onChange={handleAvatar} />
        </div>
        <div className="relative z-10 italic">
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1">Identity Vector</h3>
          <p className="text-[10px] uppercase font-black tracking-widest text-on-surface-variant opacity-60">SOVEREIGN BROADCAST CORE • AUTHENTICATED</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputRow 
          icon={UserIcon} 
          label="Display Identity" 
          value={formData.display_name} 
          onChange={(v: string) => setFormData({...formData, display_name: v})} 
          placeholder="e.g. Neo Tokyo Agent"
        />
        <div className="space-y-2 relative">
             <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2 px-1 italic">
               <AtSign size={14} className="text-v-cyan" /> Network Username
             </label>
             <input
               className={`w-full bg-surface-lowest border ${usernameValid === false ? 'border-rose-500/50 ring-2 ring-rose-500/10' : 'border-white/5'} rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-v-cyan/30 transition-all font-mono font-bold italic`}
               value={formData.username}
               onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
               placeholder="username_null"
             />
             <div className="absolute right-4 bottom-4 flex items-center gap-2">
                {checkingUsername && <Loader2 size={14} className="animate-spin text-on-surface-variant opacity-50" />}
                {usernameValid === true && <CheckCircle2 size={14} className="text-v-emerald" />}
                {usernameValid === false && <AlertCircle size={14} className="text-rose-500" />}
             </div>
             {usernameValid === false && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Signal exists. Select alternate node.</p>}
        </div>

        <div className="md:col-span-2">
            <InputRow 
                icon={Mail} 
                label="Primary Intelligence Channel" 
                value={currentUser?.email || 'authenticated@verlyn.in'} 
                disabled 
                desc="CRITICAL IDENTITY SIGNAL (MODIFICATION RESTRICTED BY CORE PROTOCOL)"
            />
        </div>
        <div className="md:col-span-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2 px-1 italic">
              <BioIcon size={14} className="text-v-violet" /> Biosignature Intelligence
            </label>
            <textarea
              className="w-full bg-surface-lowest border border-white/5 rounded-3xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-v-violet/30 transition-all font-medium min-h-[140px] resize-none italic leading-relaxed"
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              placeholder="Inject identity data into the network..."
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                EXCEPTION: {error}
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end pt-6">
        <button
          onClick={handleSave}
          disabled={loading || checkingUsername || usernameValid === false}
          className="group relative flex items-center gap-3 px-10 py-4 bg-primary-gradient rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_15px_30px_rgba(108,99,255,0.3)] hover:scale-105 hover:shadow-[0_20px_40px_rgba(108,99,255,0.4)] transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          {loading ? <Loader2 size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {loading ? 'MODULATING...' : success ? 'DATA PERSISTED' : 'COMMIT IDENTITY'}
        </button>
      </div>
    </div>
  );
}

function InputRow({ icon: Icon, label, value, onChange, placeholder, disabled, desc }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2 px-1 italic">
        <Icon size={14} className="text-on-surface-variant opacity-60" /> {label}
      </label>
      <input
        type="text"
        disabled={disabled}
        className="w-full bg-surface-lowest border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light/30 transition-all font-bold italic disabled:opacity-40 disabled:cursor-not-allowed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {desc && <p className="text-[8px] text-on-surface-variant/40 font-black px-1 uppercase tracking-widest leading-normal max-w-sm">{desc}</p>}
    </div>
  );
}
