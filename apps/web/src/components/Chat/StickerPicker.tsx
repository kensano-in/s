'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Sticker as StickerIcon, Upload, X, Globe, Lock, Loader2, Plus } from 'lucide-react';
import { getStickersDB, uploadStickerDB } from '@/app/(main)/messages/actions';
import { createClient } from '@/lib/supabase/client';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onStickerSelect: (imageUrl: string) => void;
  userId: string;
}

type StickerItem = {
  id: string;
  image_url: string;
  status: string;
  is_public: boolean;
};

export default function StickerPicker({ isOpen, onClose, onStickerSelect, userId }: StickerPickerProps) {
  const [tab, setTab] = useState<'mine' | 'upload'>('mine');
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && tab === 'mine') loadStickers();
  }, [isOpen, tab]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const loadStickers = async () => {
    setLoading(true);
    const res = await getStickersDB(userId);
    if (res.success) setStickers(res.data ?? []);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = uploadFile.name.split('.').pop();
      const path = `stickers/${userId}/${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from('media')
        .upload(path, uploadFile, { contentType: uploadFile.type });
      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      const res = await uploadStickerDB(userId, publicUrl, isPublic);
      if (!res.success) throw new Error(res.error);

      setToast(isPublic ? 'Submitted for review! Admins will approve it soon.' : 'Sticker saved privately!');
      setTimeout(() => setToast(null), 3500);
      setUploadPreview(null);
      setUploadFile(null);
      setTab('mine');
      loadStickers();
    } catch (e: any) {
      setToast(`Upload failed: ${e.message}`);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="absolute bottom-full right-0 mb-3 z-50 w-80 bg-[#18181f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header Tabs */}
          <div className="flex items-center gap-1 p-3 border-b border-white/5">
            <button
              onClick={() => setTab('mine')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'mine' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <StickerIcon size={13} /> My Stickers
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tab === 'upload' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Upload size={13} /> Upload
            </button>
          </div>

          {/* My Stickers */}
          <AnimatePresence mode="wait">
            {tab === 'mine' && (
              <motion.div
                key="mine"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-3"
              >
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-white/20" />
                  </div>
                ) : stickers.length === 0 ? (
                  <div className="text-center py-8">
                    <StickerIcon size={36} className="mx-auto mb-3 text-white/10" />
                    <p className="text-xs text-white/30">No stickers yet.</p>
                    <button
                      onClick={() => setTab('upload')}
                      className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <Plus size={12} /> Add your first sticker
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {stickers.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { onStickerSelect(s.image_url); onClose(); }}
                        className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.03] hover:bg-white/10 border border-white/[0.06] transition-all hover:scale-105 active:scale-95"
                      >
                        <img src={s.image_url} alt="sticker" className="w-full h-full object-contain p-1.5" />
                        {s.status === 'PENDING_REVIEW' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-[8px] text-amber-400 font-bold">REVIEW</span>
                          </div>
                        )}
                        {!s.is_public && s.status === 'PRIVATE' && (
                          <div className="absolute top-1 right-1">
                            <Lock size={8} className="text-white/30" />
                          </div>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setTab('upload')}
                      className="aspect-square rounded-xl border border-dashed border-white/10 flex items-center justify-center hover:border-white/30 hover:bg-white/5 transition-all"
                    >
                      <Plus size={16} className="text-white/30" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Upload Tab */}
            {tab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-4"
              >
                {!uploadPreview ? (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-indigo-400/40 hover:bg-indigo-500/5 transition-all"
                  >
                    <Upload size={24} className="text-white/20" />
                    <span className="text-xs text-white/30">Click to upload PNG or GIF</span>
                  </button>
                ) : (
                  <div className="relative">
                    <img src={uploadPreview} alt="preview" className="w-full h-32 object-contain rounded-2xl bg-white/[0.03]" />
                    <button
                      onClick={() => { setUploadPreview(null); setUploadFile(null); }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/80 transition-colors"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Public toggle */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Globe size={14} className="text-indigo-400" /> : <Lock size={14} className="text-white/30" />}
                    <span className="text-xs text-white/60">{isPublic ? 'Public (needs admin approval)' : 'Private only'}</span>
                  </div>
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? 'bg-indigo-500' : 'bg-white/10'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${isPublic ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {isPublic && (
                  <p className="text-[10px] text-amber-400/70 px-1">
                    ⚠️ Public stickers require admin approval. Inappropriate content will result in account action.
                  </p>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading…' : 'Upload Sticker'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-3 mb-3 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
