'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Download, AlertTriangle, Trash2, ShieldAlert, Loader2, X, CheckCircle2, ChevronRight, Scale, Info, Zap, ShieldCheck } from 'lucide-react';
import { deleteAccountPermanently } from '@/app/(main)/settings/actions';
import { requestDataExport } from '@/app/(main)/settings/export-actions';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function AccountControl() {
  const { currentUser } = useAppStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    // Artificial delay for "processing" feel
    await new Promise(resolve => setTimeout(resolve, 3000));

    const res = await requestDataExport();
    if (res.error) {
       setError(res.error);
       setIsExporting(false);
       return;
    }

    if (res.archive) {
        const blob = new Blob([res.archive], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VERLYN_ARCHIVE_${currentUser?.username || 'USER'}_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 5000);
    }

    setIsExporting(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE PERMANENTLY' || !currentUser?.id) return;
    setLoading(true);
    const res = await deleteAccountPermanently(currentUser.id);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="space-y-12 max-w-4xl animate-fade-in pb-20 italic">
      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <Download size={18} className="text-v-cyan" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface">Data Sovereignty</h2>
        </div>
        <div className="glass-card p-10 border-none bg-surface-lowest/40 rounded-[40px] overflow-hidden relative group shadow-2xl">
           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Download size={140} />
           </div>
           
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3 mb-2 opacity-50">
                  <ShieldCheck size={14} className="text-v-cyan" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-v-cyan italic">Kernel_Access_Granted</span>
              </div>
              <h3 className="text-3xl font-black tracking-tighter text-white uppercase italic leading-none">Neural <br/>Archive Export</h3>
              <p className="text-sm font-medium text-on-surface-variant leading-relaxed opacity-60 max-w-md">
                 Initiate a complete cryptographic dump of your identity nodes, broadcast history, and neural interactions. Compliance mandated SIG_V4 dump.
              </p>
              
              <div className="pt-4">
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className={clsx(
                        'flex items-center gap-4 px-10 py-5 rounded-[26px] font-black uppercase tracking-widest text-[11px] shadow-3xl transition-all duration-500 overflow-hidden relative',
                        isExporting ? 'bg-white/10 text-v-cyan animate-pulse' : exportSuccess ? 'bg-v-emerald text-black shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-primary-gradient text-white hover:translate-y-[-4px] active:scale-95'
                    )}
                  >
                     {isExporting ? (
                         <>
                             <Loader2 size={16} className="animate-spin" />
                             Decrypting_Clusters...
                         </>
                     ) : exportSuccess ? (
                         <>
                             <CheckCircle2 size={16} />
                             Archive_Transmitted
                         </>
                     ) : (
                         <>
                             <Download size={16} strokeWidth={3} />
                             Initialize_Dump
                         </>
                     )}
                     <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
                  </button>
                  
                  {exportSuccess && (
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-[10px] font-black uppercase tracking-widest text-v-emerald">
                         Identity_Token_Saved_Locally. OK.
                      </motion.p>
                  )}
              </div>
           </div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <ShieldAlert size={18} className="text-rose-400" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-on-surface">Emergency Terminators</h2>
        </div>
        <div className="glass-card border-none bg-surface-lowest/30 rounded-[40px] overflow-hidden shadow-xl italic">
           <ControlRow 
             icon={AlertTriangle} 
             title="Deactivate Identity" 
             desc="Temporarily disable your presence. Your data remains on our orbital cluster. Re-verify anytime." 
             btn="DEACTIVATE" 
             variant="warning"
           />
           <div className="h-[1px] bg-white/5 mx-8" />
           <ControlRow 
             icon={Trash2} 
             title="Erase Identity" 
             desc="PERMANENTLY remove all traces of your identity. THIS ACTION IS IRREVERSIBLE. PURGE IMMEDIATELY." 
             btn="EXECUTE PURGE" 
             variant="danger"
             onClick={() => setShowDeleteModal(true)}
           />
        </div>
      </section>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-lg p-10 border-none bg-[#050505] shadow-[0_0_150px_rgba(244,63,94,0.2)] relative overflow-hidden rounded-[50px]"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-pulse" />
              <div className="flex flex-col items-center text-center space-y-8">
                <div className="w-24 h-24 rounded-[36px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.2)] relative overflow-hidden">
                  <AlertTriangle size={48} className="relative z-10" />
                  <div className="absolute inset-0 bg-rose-500 opacity-5 animate-pulse" />
                </div>
                <div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter italic text-white leading-none mb-4">Core Erasure</h3>
                    <p className="text-sm font-medium text-rose-400 opacity-60 max-w-sm">
                        You are about to permanently delete your Verlyn identity. All posts, likes, followers, and secured messages will be purged from the orbital cluster. No recovery protocols available.
                    </p>
                </div>
                <div className="w-full space-y-3">
                   <div className="flex items-center gap-2 mb-2 px-2">
                       <ShieldAlert size={12} className="text-rose-500" />
                       <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Auth Key: DELETE PERMANENTLY</p>
                   </div>
                   <input 
                     className="w-full bg-black/60 border-2 border-white/5 rounded-[30px] py-6 px-10 text-lg focus:outline-none focus:border-rose-500/30 transition-all font-mono text-center uppercase tracking-[0.3em] text-rose-500 font-black mb-8"
                     placeholder="CONFIRMATION_SIG..." 
                     value={deleteConfirm}
                     onChange={(e) => setDeleteConfirm(e.target.value)}
                   />
                   <div className="flex gap-4 w-full pt-4">
                      <button 
                         onClick={() => setShowDeleteModal(false)}
                         className="flex-1 py-5 px-3 rounded-[24px] bg-white/5 font-black uppercase tracking-widest text-[11px] text-white hover:bg-white hover:text-black transition-all"
                      >
                         ABORT MISSION
                      </button>
                      <button 
                         onClick={handleDelete}
                         disabled={loading || deleteConfirm !== 'DELETE PERMANENTLY'}
                         className="flex-1 py-5 px-3 rounded-[24px] bg-rose-500 text-white font-black uppercase tracking-widest text-[11px] shadow-3xl hover:translate-y-[-4px] active:scale-95 transition-all disabled:opacity-20"
                      >
                         {loading ? <Loader2 size={24} className="animate-spin mx-auto" /> : 'EXECUTE PURGE'}
                      </button>
                   </div>
                   {error && <p className="text-rose-400 text-[10px] mt-6 font-mono font-black uppercase tracking-widest bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">{error}</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlRow({ icon: Icon, title, desc, btn, variant, onClick }: any) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 px-10 py-10 transition-colors hover:bg-white/[0.04]">
      <div className="flex gap-6 max-w-lg italic">
        <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center flex-shrink-0 shadow-2xl ${
           variant === 'danger' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-v-amber/10 text-v-amber border border-v-amber/20'
        }`}>
          <Icon size={28} />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase mb-1 flex items-center gap-2">
              {title}
              {variant === 'danger' && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
          </h4>
          <p className="text-xs font-medium text-on-surface-variant opacity-50 leading-relaxed">{desc}</p>
        </div>
      </div>
      <button 
        onClick={onClick}
        className={clsx(
            'px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500',
            variant === 'danger' 
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white hover:shadow-2xl' 
                : 'bg-v-amber/10 text-v-amber border border-v-amber/20 hover:bg-v-amber hover:text-black hover:shadow-2xl'
        )}
      >
        {btn}
      </button>
    </div>
  );
}
