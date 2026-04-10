import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

export type ChatTheme = 'midnight' | 'ocean' | 'crimson' | 'emerald';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ChatTheme;
  onSelectTheme: (theme: ChatTheme) => void;
}

const THEMES: { id: ChatTheme; name: string; colors: string; border: string }[] = [
  { id: 'midnight', name: 'Midnight', colors: 'bg-[#050505]', border: 'border-white/10' },
  { id: 'ocean', name: 'Ocean', colors: 'bg-gradient-to-br from-[#050b14] to-[#0a1128]', border: 'border-blue-500/30' },
  { id: 'crimson', name: 'Crimson', colors: 'bg-gradient-to-br from-[#140505] to-[#280a0a]', border: 'border-red-500/30' },
  { id: 'emerald', name: 'Emerald', colors: 'bg-gradient-to-br from-[#05140a] to-[#0a2814]', border: 'border-emerald-500/30' },
];

export default function ThemeModal({ isOpen, onClose, currentTheme, onSelectTheme }: ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-sm bg-[#151520] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Chat Theme</h3>
            <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                className={clsx(
                  'relative h-20 rounded-2xl border-2 transition-all overflow-hidden flex items-end p-3',
                  theme.colors,
                  currentTheme === theme.id ? theme.border : 'border-transparent hover:border-white/10'
                )}
              >
                <span className="text-sm font-medium text-white/90 drop-shadow-md z-10">{theme.name}</span>
                {currentTheme === theme.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center z-10">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                {/* Decorative overlay to make thumbnails look more like chat spaces */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
