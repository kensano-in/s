'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Loader2, Key, Smartphone, AlertCircle, Fingerprint, Cpu, Radio, Sparkles } from 'lucide-react';
import { enrollMFA, verifyMFA } from '@/app/(main)/settings/mfa-actions';
import QRCode from 'qrcode';
import clsx from 'clsx';

interface MfaModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function MfaModal({ onClose, onSuccess }: MfaModalProps) {
  const [step, setStep] = useState<'initial' | 'enroll' | 'verify' | 'success'>('initial');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [enrollmentId, setEnrollmentId] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'initial') {
      const timer = setTimeout(() => handleEnroll(), 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleEnroll = async () => {
    setStep('initial');
    const res = await enrollMFA();
    if (res.error) {
      setError(res.error);
      setStep('enroll'); // fallback
      return;
    }

    if (res.totp?.secret) setTotpSecret(res.totp.secret);
    if (res.id) setEnrollmentId(res.id);
    
    // Generate QR code as data URL
    if (res.totp?.uri) {
      const url = await QRCode.toDataURL(res.totp.uri, {
        width: 300,
        margin: 2,
        color: {
          dark: '#00FFFF',
          light: '#00000000'
        }
      });
      setQrUrl(url);
    }
    setStep('enroll');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    
    setIsVerifying(true);
    setError('');
    
    const res = await verifyMFA(enrollmentId, otpCode);
    if (res.error) {
      setError(res.error);
      setIsVerifying(false);
      return;
    }

    setStep('success');
    setTimeout(() => {
        onSuccess();
        onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background Blur */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-3xl" 
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative w-full max-w-[500px] glass-card border-none bg-surface-lowest/60 p-0 rounded-[40px] shadow-[0_0_100px_rgba(0,255,255,0.1)] overflow-hidden italic"
      >
        {/* Absolute Scanning Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-v-cyan shadow-[0_0_15px_var(--v-cyan)] z-50 animate-scan-y opacity-50" />

        {/* Content */}
        <div className="relative p-10 z-10">
          
          <div className="flex justify-between items-start mb-10">
            <div>
                 <div className="flex items-center gap-3 mb-2 opacity-50">
                    <ShieldCheck size={14} className="text-v-cyan" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Initialize_MFA_Protocol</span>
                 </div>
                 <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Security <br/><span className="text-v-cyan">Elevation</span></h2>
            </div>
            <button onClick={onClose} className="p-4 rounded-2xl bg-white/5 text-on-surface-variant hover:text-white transition-colors">
                <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'initial' && (
              <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-20 flex flex-col items-center justify-center text-center">
                 <Loader2 size={40} className="animate-spin mb-6 text-v-cyan" />
                 <p className="text-[11px] font-black uppercase tracking-[0.6em] text-v-cyan animate-pulse">Establishing_NeuralHub...</p>
              </motion.div>
            )}

            {step === 'enroll' && (
              <motion.div key="enroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                 <div className="flex flex-col items-center gap-8">
                     <div className="relative p-4 rounded-[40px] bg-black border-4 border-v-cyan/20">
                          {qrUrl ? (
                            <img src={qrUrl} className="w-48 h-48 rounded-[30px]" alt="QR" />
                          ) : (
                            <div className="w-48 h-48 flex items-center justify-center opacity-20">
                                <Radio size={40} className="animate-pulse" />
                            </div>
                          )}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-v-cyan rounded-full animate-ping opacity-30" />
                     </div>
                     <div className="text-center space-y-4 px-4">
                        <p className="text-sm font-black italic tracking-tight text-white leading-relaxed">
                            Scan this node identifier in your <span className="text-v-cyan underline decoration-v-cyan/30">Auth App</span> or inject the kernel manually.
                        </p>
                        {totpSecret && (
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant">Manual_Code</span>
                                <span className="text-lg font-mono tracking-[0.2em] text-white">{totpSecret}</span>
                            </div>
                        )}
                     </div>
                 </div>

                 <button 
                  onClick={() => setStep('verify')}
                  className="w-full py-5 rounded-[24px] bg-primary-gradient text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-3xl hover:translate-y-[-4px] active:scale-95 transition-all"
                 >
                  Proceed to Verification
                 </button>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
                 <div className="text-center mb-10">
                    <Fingerprint size={48} className="mx-auto mb-6 text-v-cyan opacity-40" />
                    <p className="text-sm font-black italic tracking-tight text-white leading-relaxed px-6">
                        Transmitting verified signal... Please enter the 6-digit node code generated by your app.
                    </p>
                 </div>

                 <form onSubmit={handleVerify} className="space-y-8">
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000 000"
                      className="w-full bg-black/40 border-2 border-white/5 rounded-[24px] py-6 text-center text-3xl font-mono tracking-[0.4em] text-v-cyan placeholder:text-white/5 focus:outline-none focus:border-v-cyan/30 transition-all font-black"
                      autoFocus
                    />
                    
                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500">
                           <AlertCircle size={16} />
                           <span className="text-[10px] font-black uppercase tracking-widest leading-none">{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={otpCode.length !== 6 || isVerifying}
                        className="w-full py-5 rounded-[24px] bg-v-cyan text-black text-[11px] font-black uppercase tracking-[0.3em] shadow-3xl disabled:opacity-20 hover:translate-y-[-4px] active:scale-95 transition-all"
                    >
                        {isVerifying ? 'VERIFYING_HUB...' : 'VERIFY IDENTITY'}
                    </button>
                 </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 flex flex-col items-center justify-center text-center">
                 <div className="w-24 h-24 rounded-[30px] bg-v-cyan/10 border border-v-cyan/40 flex items-center justify-center text-v-cyan mb-8 relative">
                    <ShieldCheck size={40} className="relative z-10" />
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-v-cyan rounded-[30px]" />
                 </div>
                 <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-3">Protocol Active</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-v-cyan flex items-center gap-2 justify-center">
                    <Sparkles size={12} /> IDENTITY_PRIME_ACTIVATED
                 </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Cpu size={14} className="opacity-20" />
                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-30 italic">KERNEL_AUTH_V4</span>
            </div>
            <div className="flex items-center gap-3 group">
                <span className="text-[8px] font-black uppercase tracking-widest text-v-cyan opacity-40 group-hover:opacity-100 transition-opacity">ENCRYPTION_ACTIVE</span>
                <div className="w-1.5 h-1.5 rounded-full bg-v-cyan shadow-[0_0_8px_var(--v-cyan)] animate-pulse" />
            </div>
        </div>
      </motion.div>
    </div>
  );
}
