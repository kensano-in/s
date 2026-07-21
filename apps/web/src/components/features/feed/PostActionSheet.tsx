'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Trash2, Pin, Archive, MessageSquareOff, BarChart2, Share2, 
  Bookmark, QrCode, Star, EyeOff, VolumeX, UserMinus, Flag, Info, HelpCircle, 
  X, Check, Sparkles, Trophy, Users, ShieldAlert, ArrowRight
} from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';
import QRCode from 'qrcode';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  post: any;
  isOwner: boolean;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onReport: () => void;
  isPinned: boolean;
  onPin: () => void;
  commentsDisabled: boolean;
  onToggleComments: () => void;
  isArchived: boolean;
  onToggleArchive: () => void;
}

export default function PostActionSheet({
  isOpen,
  onClose,
  post,
  isOwner,
  saved,
  onSave,
  onShare,
  onDelete,
  onEdit,
  onReport,
  isPinned,
  onPin,
  commentsDisabled,
  onToggleComments,
  isArchived,
  onToggleArchive
}: Props) {
  const [activeDialog, setActiveDialog] = useState<'main' | 'analytics' | 'about' | 'why' | 'qr' | 'archive_confirm'>('main');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [favorites, setFavorites] = useState(false);

  // Generate QR Code when QR dialog active
  useEffect(() => {
    if (activeDialog === 'qr') {
      const url = `${window.location.origin}/feed/${post.id}`;
      QRCode.toDataURL(url, {
        color: {
          dark: '#000000',
          light: '#00000000' // transparent background
        },
        width: 256,
        margin: 2
      })
      .then(setQrCodeUrl)
      .catch((err: any) => console.error('QR code generation failed', err));
    }
  }, [activeDialog, post.id]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="action-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Action Bottom Sheet Container */}
      <motion.div
        key="action-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end pointer-events-none"
      >
        <div 
          className="w-full max-w-[540px] bg-[#121212] border border-white/[0.08] rounded-t-[32px] overflow-hidden flex flex-col pointer-events-auto shadow-ambient max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Grab Handle */}
          <div className="flex justify-center py-3 shrink-0 cursor-pointer">
            <div className="w-12 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" onClick={onClose} />
          </div>

          <div className="overflow-y-auto px-6 pb-8 space-y-6">
            <AnimatePresence mode="wait">
              
              {/* 1. Main Options Dialog */}
              {activeDialog === 'main' && (
                <motion.div
                  key="main-options"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Top Header Card */}
                  <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl shrink-0">
                    <img 
                      src={getAvatarUrl(post.author?.username || 'user', post.author?.avatar)}
                      alt="avatar" 
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white/30 uppercase tracking-widest leading-none mb-1">Post Link</p>
                      <p className="text-sm font-bold text-white truncate leading-none">@{post.author?.username}</p>
                    </div>
                    <button 
                      onClick={onClose}
                      className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Grid Quick Share/Save Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => { onSave(); onClose(); }}
                      className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl gap-2 hover:bg-white/[0.04] transition-colors group text-center"
                    >
                      <Bookmark size={20} className={saved ? "text-amber-500 fill-amber-500" : "text-white/40 group-hover:text-white transition-colors"} />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">{saved ? 'Saved' : 'Save Post'}</span>
                    </button>

                    <button 
                      onClick={() => setActiveDialog('qr')}
                      className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl gap-2 hover:bg-white/[0.04] transition-colors group text-center"
                    >
                      <QrCode size={20} className="text-white/40 group-hover:text-white transition-colors" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white/80">QR Code</span>
                    </button>
                  </div>

                  {/* Vertically stacked custom list of premium controls */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden divide-y divide-white/[0.04]">
                    {isOwner ? (
                      /* Owner actions */
                      <>
                        <button 
                          onClick={() => { onEdit(); onClose(); }}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                              <Pencil size={16} />
                            </div>
                            <span className="tracking-tight">Edit details</span>
                          </div>
                          <span className="text-xs text-white/20 font-medium">Content & Media</span>
                        </button>

                        <button 
                          onClick={() => setActiveDialog('analytics')}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                              <BarChart2 size={16} />
                            </div>
                            <span className="tracking-tight">Performance Analytics</span>
                          </div>
                          <span className="text-xs text-white/20 font-medium">Insights</span>
                        </button>

                        <button 
                          onClick={onPin}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                              <Pin size={16} className={isPinned ? "rotate-45" : ""} />
                            </div>
                            <span className="tracking-tight">{isPinned ? 'Unpin from profile' : 'Pin to profile'}</span>
                          </div>
                          <span className="text-xs text-white/20 font-medium">{isPinned ? 'Pinned' : 'Vault'}</span>
                        </button>

                        <button 
                          onClick={onToggleComments}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                              <MessageSquareOff size={16} />
                            </div>
                            <span className="tracking-tight">{commentsDisabled ? 'Turn on commenting' : 'Turn off commenting'}</span>
                          </div>
                        </button>

                        <button 
                          onClick={isArchived ? onToggleArchive : () => setActiveDialog('archive_confirm')}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
                              <Archive size={16} />
                            </div>
                            <span className="tracking-tight">{isArchived ? 'Move to profile' : 'Archive post'}</span>
                          </div>
                        </button>
                      </>
                    ) : (
                      /* Non-owner actions */
                      <>
                        <button 
                          onClick={() => setFavorites(!favorites)}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                              <Star size={16} className={favorites ? "fill-yellow-400 text-yellow-400" : ""} />
                            </div>
                            <span className="tracking-tight">{favorites ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => setActiveDialog('why')}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                              <HelpCircle size={16} />
                            </div>
                            <span className="tracking-tight">Why am I seeing this post</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => setActiveDialog('about')}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                              <Info size={16} />
                            </div>
                            <span className="tracking-tight">About this account</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => { alert('Account muted successfully'); onClose(); }}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                              <VolumeX size={16} />
                            </div>
                            <span className="tracking-tight">Mute @{post.author?.username}</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => { alert('Account unfollowed successfully'); onClose(); }}
                          className="w-full flex items-center justify-between px-6 py-4.5 text-sm font-bold text-white hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                              <UserMinus size={16} />
                            </div>
                            <span className="tracking-tight">Unfollow @{post.author?.username}</span>
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Danger Zone / Separate Card */}
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden">
                    {isOwner ? (
                      <button 
                        onClick={() => { onDelete(); onClose(); }}
                        className="w-full flex items-center gap-4 px-6 py-5 text-sm font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 transition-all text-left"
                      >
                        <Trash2 size={16} />
                        Delete Post
                      </button>
                    ) : (
                      <button 
                        onClick={() => { onReport(); onClose(); }}
                        className="w-full flex items-center gap-4 px-6 py-5 text-sm font-black uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/20 transition-all text-left"
                      >
                        <Flag size={16} />
                        Report Post
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* 2. Analytics Dialog */}
              {activeDialog === 'analytics' && (
                <motion.div
                  key="analytics-dialog"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <BarChart2 size={16} className="text-teal-400" />
                      Post Insights
                    </h3>
                    <button 
                      onClick={() => setActiveDialog('main')}
                      className="text-xs font-extrabold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  {/* Analytics Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center">
                      <p className="text-[20px] font-bold text-white">{post.likeCount}</p>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Likes</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center">
                      <p className="text-[20px] font-bold text-white">{post.commentCount}</p>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Comments</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-center">
                      <p className="text-[20px] font-bold text-white">{(post.shareCount || 0) * 8 + post.likeCount * 3}</p>
                      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mt-1">Impressions</p>
                    </div>
                  </div>

                  {/* Graph mock */}
                  <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-4">
                    <p className="text-xs font-extrabold text-white/50 uppercase tracking-widest">Dwell Duration Distribution</p>
                    <div className="h-20 flex items-end gap-1.5 pt-4">
                      <div className="flex-1 h-[20%] bg-teal-500/10 rounded-t-sm" />
                      <div className="flex-1 h-[40%] bg-teal-500/20 rounded-t-sm" />
                      <div className="flex-1 h-[80%] bg-teal-500/50 rounded-t-sm animate-pulse" />
                      <div className="flex-1 h-[95%] bg-teal-400 rounded-t-sm" />
                      <div className="flex-1 h-[60%] bg-teal-500/40 rounded-t-sm" />
                      <div className="flex-1 h-[30%] bg-teal-500/20 rounded-t-sm" />
                      <div className="flex-1 h-[10%] bg-teal-500/10 rounded-t-sm" />
                    </div>
                    <div className="flex justify-between text-[9px] font-extrabold text-white/20 uppercase tracking-widest">
                      <span>0s</span>
                      <span>5s (Optimal)</span>
                      <span>20s+</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 3. About Dialog */}
              {activeDialog === 'about' && (
                <motion.div
                  key="about-dialog"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 text-center"
                >
                  <div className="flex items-center justify-between text-left">
                    <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Info size={16} className="text-blue-400" />
                      About this Account
                    </h3>
                    <button 
                      onClick={() => setActiveDialog('main')}
                      className="text-xs font-extrabold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  <div className="flex flex-col items-center py-4 space-y-4">
                    <img 
                      src={getAvatarUrl(post.author?.username || 'user', post.author?.avatar)}
                      alt="avatar" 
                      className="w-20 h-20 rounded-[28px] object-cover ring-2 ring-white/10"
                    />
                    <div>
                      <h4 className="text-lg font-bold text-white leading-none mb-1.5">{post.author?.displayName}</h4>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">@{post.author?.username}</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl divide-y divide-white/[0.04] text-left">
                    <div className="px-6 py-4 flex justify-between items-center text-sm">
                      <span className="text-white/40 font-bold">Account Status</span>
                      <span className="text-white font-extrabold">Active</span>
                    </div>
                    <div className="px-6 py-4 flex justify-between items-center text-sm">
                      <span className="text-white/40 font-bold">Verification</span>
                      <span className="text-white font-extrabold flex items-center gap-1">
                        {post.author?.isVerified ? 'Verified Account' : 'Standard Account'}
                      </span>
                    </div>
                    <div className="px-6 py-4 flex justify-between items-center text-sm">
                      <span className="text-white/40 font-bold">Account Type</span>
                      <span className="text-white font-extrabold uppercase tracking-wider text-teal-400">{post.author?.role}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 4. Why Dialog */}
              {activeDialog === 'why' && (
                <motion.div
                  key="why-dialog"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-400" />
                      Algorithmic Distribution
                    </h3>
                    <button 
                      onClick={() => setActiveDialog('main')}
                      className="text-xs font-extrabold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs">1</div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/60">Account Connection</p>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed pl-11">
                        You are following this account or interact with their posts frequently.
                      </p>
                    </div>

                    <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs">2</div>
                        <p className="text-xs font-black uppercase tracking-widest text-white/60">High Engagement</p>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed pl-11">
                        This post is currently popular and has high activity relative to when it was posted.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 5. QR Dialog */}
              {activeDialog === 'qr' && (
                <motion.div
                  key="qr-dialog"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 text-center flex flex-col items-center"
                >
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-md font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <QrCode size={16} className="text-white" />
                      Post QR Code
                    </h3>
                    <button 
                      onClick={() => setActiveDialog('main')}
                      className="text-xs font-extrabold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                    >
                      Back
                    </button>
                  </div>

                  {/* QR Output */}
                  <div className="p-6 bg-white rounded-3xl w-60 h-60 flex items-center justify-center relative overflow-hidden ring-1 ring-white/10 shadow-premium mt-4">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="qr code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-black/5 animate-pulse rounded-2xl flex items-center justify-center text-black/20 font-bold text-xs">Generating...</div>
                    )}
                  </div>

                  <p className="text-xs text-white/30 uppercase tracking-widest font-black max-w-[280px] leading-relaxed mt-2">
                    Scan this QR code with a device camera to view the post instantly.
                  </p>
                </motion.div>
              )}

              {/* 6. Archive Confirmation Dialog */}
              {activeDialog === 'archive_confirm' && (
                <motion.div
                  key="archive-confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 text-center flex flex-col items-center py-4"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Archive size={22} />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[16px] font-bold text-white">Archive this post?</h3>
                    <p className="text-[12px] text-slate-400 max-w-[285px] leading-relaxed">
                      Only you will be able to see this post. Other users will not be able to view it on your profile or feed.
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => {
                        onToggleArchive();
                        onClose();
                      }}
                      className="w-full py-3.5 rounded-xl bg-white text-black text-[12px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-premium"
                    >
                      Yes, archive
                    </button>
                    <button
                      onClick={() => setActiveDialog('main')}
                      className="w-full py-3.5 rounded-xl bg-white/5 text-slate-400 text-[12px] font-black uppercase tracking-widest hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
