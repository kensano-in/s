'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, UserPlus, Zap, Bell, Award,
  Check, ShieldAlert, Coins, CornerDownRight, Send,
  Users, X, Clock, Trash2, AtSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '@/lib/types';
import clsx from 'clsx';
import { getAvatarUrl } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { sendInlineNotificationReply, markNotificationRead, deleteNotification } from '@/app/(main)/notifications/actions';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: Notification;
  onDelete?: (id: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const TYPE_ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  award: Award,
  system: Bell,
  community: Users,
  earnings: Coins,
  security: ShieldAlert,
  dm: MessageCircle,
};

// Per-type icon animation personalities
const ICON_ANIMATIONS: Record<string, { anim: any; trans: any }> = {
  like:      { anim: { scale: [1, 1.5, 1, 1.3, 1] }, trans: { duration: 0.5, times: [0, 0.2, 0.4, 0.7, 1] } },
  comment:   { anim: { y: [0, -3, 0] }, trans: { duration: 0.4, ease: 'easeOut' } },
  follow:    { anim: { x: [0, 3, 0] }, trans: { duration: 0.4, ease: 'easeOut' } },
  mention:   { anim: { rotate: [0, 360] }, trans: { duration: 0.5, ease: 'easeInOut' } },
  award:     { anim: { rotate: [0, -15, 15, -8, 0], scale: [1, 1.2, 1] }, trans: { duration: 0.55 } },
  community: { anim: { y: [0, -4, 1, -2, 0] }, trans: { duration: 0.45 } },
  dm:        { anim: { scale: [1, 1.3, 0.9, 1.1, 1] }, trans: { duration: 0.4 } },
  earnings:  { anim: { y: [0, -5, 0] }, trans: { duration: 0.5 } },
  security:  { anim: { scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }, trans: { duration: 0.8, repeat: Infinity, repeatDelay: 1 } },
  system:    { anim: { rotate: [0, -10, 10, 0] }, trans: { duration: 0.5 } },
};

interface StyleConfig {
  iconBg: string;
  iconColor: string;
  accentBar: string;
  dotColor: string;
  unreadBg: string;
  unreadBorder: string;
  badgeBg: string;
}

const TYPE_STYLES: Record<string, StyleConfig> = {
  like: {
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-300',
    accentBar: 'bg-rose-400',
    dotColor: 'bg-rose-400',
    unreadBg: 'rgba(244,63,94,0.04)',
    unreadBorder: 'rgba(244,63,94,0.15)',
    badgeBg: 'bg-rose-500/10 border-rose-400/20 text-rose-300',
  },
  comment: {
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-300',
    accentBar: 'bg-sky-400',
    dotColor: 'bg-sky-400',
    unreadBg: 'rgba(56,189,248,0.04)',
    unreadBorder: 'rgba(56,189,248,0.15)',
    badgeBg: 'bg-sky-500/10 border-sky-400/20 text-sky-300',
  },
  follow: {
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-300',
    accentBar: 'bg-emerald-400',
    dotColor: 'bg-emerald-400',
    unreadBg: 'rgba(52,211,153,0.04)',
    unreadBorder: 'rgba(52,211,153,0.15)',
    badgeBg: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300',
  },
  mention: {
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-300',
    accentBar: 'bg-violet-400',
    dotColor: 'bg-violet-400',
    unreadBg: 'rgba(167,139,250,0.04)',
    unreadBorder: 'rgba(167,139,250,0.15)',
    badgeBg: 'bg-violet-500/10 border-violet-400/20 text-violet-300',
  },
  award: {
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-300',
    accentBar: 'bg-amber-400',
    dotColor: 'bg-amber-400',
    unreadBg: 'rgba(251,191,36,0.04)',
    unreadBorder: 'rgba(251,191,36,0.15)',
    badgeBg: 'bg-amber-500/10 border-amber-400/20 text-amber-300',
  },
  community: {
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-300',
    accentBar: 'bg-indigo-400',
    dotColor: 'bg-indigo-400',
    unreadBg: 'rgba(129,140,248,0.04)',
    unreadBorder: 'rgba(129,140,248,0.15)',
    badgeBg: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-300',
  },
  dm: {
    iconBg: 'bg-teal-500/15',
    iconColor: 'text-teal-300',
    accentBar: 'bg-teal-400',
    dotColor: 'bg-teal-400',
    unreadBg: 'rgba(45,212,191,0.04)',
    unreadBorder: 'rgba(45,212,191,0.15)',
    badgeBg: 'bg-teal-500/10 border-teal-400/20 text-teal-300',
  },
  earnings: {
    iconBg: 'bg-yellow-500/15',
    iconColor: 'text-yellow-300',
    accentBar: 'bg-yellow-400',
    dotColor: 'bg-yellow-400',
    unreadBg: 'rgba(234,179,8,0.04)',
    unreadBorder: 'rgba(234,179,8,0.15)',
    badgeBg: 'bg-yellow-500/10 border-yellow-400/20 text-yellow-300',
  },
  security: {
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-300',
    accentBar: 'bg-red-400',
    dotColor: 'bg-red-400',
    unreadBg: 'rgba(239,68,68,0.05)',
    unreadBorder: 'rgba(239,68,68,0.2)',
    badgeBg: 'bg-red-500/10 border-red-400/20 text-red-300',
  },
  system: {
    iconBg: 'bg-stone-500/15',
    iconColor: 'text-stone-300',
    accentBar: 'bg-stone-400',
    dotColor: 'bg-stone-400',
    unreadBg: 'rgba(168,162,158,0.04)',
    unreadBorder: 'rgba(168,162,158,0.1)',
    badgeBg: 'bg-stone-500/10 border-stone-400/20 text-stone-300',
  },
};

const defaultStyle: StyleConfig = {
  iconBg: 'bg-white/10',
  iconColor: 'text-white/40',
  accentBar: 'bg-white/30',
  dotColor: 'bg-white/40',
  unreadBg: 'rgba(255,255,255,0.025)',
  unreadBorder: 'rgba(255,255,255,0.08)',
  badgeBg: 'bg-white/5 border-white/10 text-white/40',
};

export default function NotificationItem({ notification, onDelete, isSelectMode, isSelected, onSelect }: NotificationItemProps) {
  const toggleFollow = useAppStore(s => s.toggleFollow);
  const isFollowing = useAppStore(s => s.isFollowing);
  const currentUser = useAppStore(s => s.currentUser);
  const markNotifRead = useAppStore(s => s.markNotifRead);
  const router = useRouter();
  const [isReadLocal, setIsReadLocal] = useState(notification.isRead);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const snoozedUntil = sessionStorage.getItem(`snooze:${notification.id}`);
    if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) setIsSnoozed(true);
  }, [notification.id]);

  useEffect(() => { setIsReadLocal(notification.isRead); }, [notification.isRead]);

  const commentContent = notification.commentContent ?? null;
  const actorCount = notification.metadata?.actor_count || 1;
  const isGrouped = actorCount > 1 && notification.metadata?.actors;
  const actorList = notification.metadata?.actors || [];
  const primaryActor = notification.actor;
  const actorName = primaryActor?.display_name || primaryActor?.username || 'Someone';

  const type = notification.type;
  const entityOverride = notification.entity_type === 'security' ? 'security'
    : notification.entity_type === 'earnings' ? 'earnings' : null;
  const resolvedType = entityOverride || type;
  const Icon = TYPE_ICONS[resolvedType] || Bell;
  const style = TYPE_STYLES[resolvedType] || defaultStyle;
  const iconAnim = ICON_ANIMATIONS[resolvedType];

  const amFollowing = isFollowing(notification.actor_id || '');

  const bodyText = useMemo(() => {
    if (isGrouped) {
      const restCount = actorCount - 1;
      const secondActor = actorList[1];
      const secondName = secondActor?.display_name || secondActor?.username || 'Someone';
      if (actorCount === 2) {
        return (<><span className="font-semibold text-white/90">{actorName}</span>{' and '}<span className="font-semibold text-white/90">{secondName}</span>{' '}{notification.body}</>);
      }
      return (<><span className="font-semibold text-white/90">{actorName}</span>{', '}<span className="font-semibold text-white/90">{secondName}</span>{' and '}<span className="font-semibold text-white/90">{restCount - 1} {restCount - 1 === 1 ? 'other' : 'others'}</span>{' '}{notification.body}</>);
    }
    return (<><span className="font-semibold text-white/90">{actorName}</span>{' '}{notification.body}</>);
  }, [isGrouped, actorCount, actorList, actorName, notification.body]);

  const handleCardClick = async () => {
    if (!isReadLocal && currentUser?.id) {
      setIsReadLocal(true);
      markNotifRead(notification.id);
      await markNotificationRead(notification.id, currentUser.id);
    }
    if (['like', 'comment', 'mention'].includes(notification.type) && notification.entity_id) {
      router.push(`/feed/${notification.entity_id}`);
    } else if (notification.type === 'follow' && primaryActor?.username) {
      router.push(`/profile/${primaryActor.username}`);
    } else if (notification.type === 'community' && notification.entity_id) {
      router.push(`/communities/${notification.entity_id}`);
    } else if (notification.type === 'dm' && notification.entity_id) {
      router.push(`/messages/${notification.entity_id}`);
    }
  };

  const handleFollowBack = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!notification.actor_id) return;
    toggleFollow(notification.actor_id);
    setActionDone('Following');
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!replyText.trim()) return;
    setIsReplying(true);
    const res = await sendInlineNotificationReply(notification.entity_id || 'simulated-post', replyText);
    if (res.success) {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: `Replied to @${primaryActor?.username || 'user'}`, type: 'success' } }));
      setActionDone(`Replied`);
      setShowReplyForm(false);
      setReplyText('');
    } else {
      window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: res.error || 'Failed to post reply', type: 'error' } }));
    }
    setIsReplying(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setIsDeleting(true);
    onDelete?.(notification.id);
    await deleteNotification(notification.id);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    sessionStorage.setItem(`snooze:${notification.id}`, String(Date.now() + 60 * 60 * 1000));
    setIsSnoozed(true);
    window.dispatchEvent(new CustomEvent('verlyn:toast', { detail: { message: 'Snoozed for 1 hour', type: 'success' } }));
  };

  if (isSnoozed) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={isDeleting ? { opacity: 0, scale: 0.96, height: 0, marginBottom: 0 } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={isSelectMode ? (e) => { e.stopPropagation(); onSelect?.(notification.id); } : handleCardClick}
      className={clsx(
        'group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300',
        isSelectMode && isSelected ? 'ring-1 ring-amber-400/40' : '',
      )}
      style={{
        background: !isReadLocal
          ? `linear-gradient(135deg, ${style.unreadBg} 0%, rgba(255,255,255,0.01) 100%)`
          : isHovered ? 'rgba(255,255,255,0.022)' : 'transparent',
        border: !isReadLocal
          ? `1px solid ${style.unreadBorder}`
          : isHovered ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      }}
    >
      {/* Unread accent bar on left */}
      {!isReadLocal && (
        <div className={clsx('absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full', style.accentBar)} />
      )}

      <div className="px-4 py-3.5">
        {/* TOP ROW: avatar + content + actions */}
        <div className={clsx('flex items-start gap-3.5', isSelectMode && 'pl-5')}>

          {/* BULK CHECKBOX */}
          {isSelectMode && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <div className={clsx(
                'w-4 h-4 rounded border flex items-center justify-center transition-all',
                isSelected ? 'bg-violet-500 border-violet-500' : 'border-white/20'
              )}>
                {isSelected && <Check size={9} className="text-white" />}
              </div>
            </div>
          )}

          {/* AVATAR STACK */}
          <div className="relative shrink-0 mt-0.5">
            {isGrouped ? (
              <div className="flex -space-x-3">
                {actorList.slice(0, 3).map((a: any, i: number) => (
                  <img
                    key={i}
                    src={getAvatarUrl(a?.username || 'user', a?.avatar_url)}
                    alt="actor"
                    className={clsx('w-9 h-9 rounded-full object-cover border-2 border-[#0f0d0b]', i === 0 ? 'z-30' : i === 1 ? 'z-20' : 'z-10')}
                  />
                ))}
              </div>
            ) : (
              <div className="relative">
                <img
                  src={getAvatarUrl(primaryActor?.username || 'user', primaryActor?.avatar_url)}
                  alt={actorName}
                  className="w-10 h-10 rounded-full object-cover"
                  style={{ border: '2px solid rgba(255,255,255,0.08)' }}
                />
                {/* Animated type badge */}
                <motion.div
                  className={clsx(
                    'absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center',
                    style.iconBg, style.iconColor
                  )}
                  style={{ border: '2px solid #0f0d0b' }}
                  animate={isHovered && iconAnim ? iconAnim.anim : {}}
                  transition={isHovered && iconAnim ? iconAnim.trans : {}}
                >
                  <Icon size={8} />
                </motion.div>
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] leading-snug text-white/70 font-normal flex-1">
                {bodyText}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {!isReadLocal && (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    className={clsx('w-1.5 h-1.5 rounded-full shrink-0', style.dotColor)}
                  />
                )}
                {/* Hover action buttons */}
                <AnimatePresence>
                  {isHovered && !isSelectMode && (
                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1"
                    >
                      <button
                        onClick={handleSnooze}
                        title="Snooze 1 hour"
                        className="p-1 rounded-full text-white/20 hover:text-violet-300/70 hover:bg-violet-400/10 transition-all duration-150"
                      >
                        <Clock size={10} />
                      </button>
                      <button
                        onClick={handleDelete}
                        title="Dismiss"
                        className="p-1 rounded-full text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-all duration-150"
                      >
                        <X size={10} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Comment quote */}
            {commentContent && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 pl-3 text-[11.5px] text-white/40 italic leading-relaxed line-clamp-2 select-text rounded-r-lg"
                style={{ borderLeft: `2px solid ${style.unreadBorder}` }}
              >
                &ldquo;{commentContent}&rdquo;
              </motion.div>
            )}

            {/* Timestamp */}
            <p className="mt-1.5 text-[11px] text-white/22 tracking-tight">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>

            {/* INLINE ACTIONS */}
            <AnimatePresence mode="wait">
              {actionDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-400/70 font-semibold"
                >
                  <Check size={11} />
                  <span>{actionDone}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2.5 flex flex-wrap items-center gap-1.5"
                >
                  {/* Follow back */}
                  {notification.type === 'follow' && !amFollowing && (
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={handleFollowBack}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-300 hover:text-emerald-200 transition-colors duration-200"
                    >
                      <UserPlus size={10} />
                      Follow Back
                    </motion.button>
                  )}

                  {/* Reply + reaction */}
                  {(notification.type === 'comment' || notification.type === 'mention') && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowReplyForm(!showReplyForm); }}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors duration-200',
                          showReplyForm
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            : 'bg-white/[0.03] border-white/[0.07] text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                        )}
                      >
                        <MessageCircle size={10} />
                        {showReplyForm ? 'Cancel' : 'Reply'}
                      </motion.button>

                      {/* Icon reaction row — no emoji, use lucide icons instead */}
                      <div className="flex items-center gap-0.5 bg-white/[0.025] border border-white/[0.05] px-1.5 py-1 rounded-full">
                        {[
                          { icon: Heart, color: 'hover:text-rose-400', label: 'heart' },
                          { icon: Zap, color: 'hover:text-amber-400', label: 'zap' },
                          { icon: Award, color: 'hover:text-violet-400', label: 'award' },
                        ].map(({ icon: ReIcon, color, label }) => (
                          <motion.button
                            key={label}
                            whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.85 }}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActionDone(`Reacted`); }}
                            className={clsx('p-1 text-white/25 transition-colors duration-150', color)}
                          >
                            <ReIcon size={10} />
                          </motion.button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Community invite */}
                  {notification.type === 'community' && (
                    <div className="flex items-center gap-1.5">
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActionDone('Joined'); }}
                        className="px-3 py-1.5 rounded-full text-[10px] font-semibold border border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-300 transition-colors duration-200"
                      >Accept</motion.button>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActionDone('Declined'); }}
                        className="px-3 py-1.5 rounded-full text-[10px] font-semibold border border-white/[0.06] bg-white/[0.02] text-white/35 hover:text-white/55 transition-colors duration-200"
                      >Decline</motion.button>
                    </div>
                  )}

                  {/* Security */}
                  {notification.entity_type === 'security' && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActionDone('Secured'); }}
                      className="px-3 py-1.5 rounded-full text-[10px] font-semibold border border-red-500/20 bg-red-500/8 hover:bg-red-500/15 text-red-300 transition-colors duration-200"
                    >Secure Account</motion.button>
                  )}

                  {/* Earnings */}
                  {notification.entity_type === 'earnings' && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setActionDone('Viewed'); }}
                      className="px-3 py-1.5 rounded-full text-[10px] font-semibold border border-amber-500/20 bg-amber-500/8 hover:bg-amber-500/15 text-amber-300 transition-colors duration-200"
                    >View Earnings</motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* INLINE REPLY FORM */}
            <AnimatePresence>
              {showReplyForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleReplySubmit}
                  onClick={(e) => e.stopPropagation()}
                  className="overflow-hidden mt-2.5"
                >
                  <div
                    className="flex gap-2 p-1.5 rounded-xl border transition-all duration-300 focus-within:border-sky-500/30"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="p-1 text-white/20 shrink-0 mt-0.5">
                      <CornerDownRight size={11} />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${primaryActor?.username || 'user'}...`}
                      className="flex-1 bg-transparent outline-none text-[11.5px] text-white/75 placeholder-white/20"
                    />
                    <motion.button
                      type="submit"
                      disabled={isReplying || !replyText.trim()}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg bg-sky-600/15 hover:bg-sky-600/25 border border-sky-500/20 text-sky-300 disabled:opacity-30 transition-all"
                    >
                      {isReplying
                        ? <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                        : <Send size={10} />
                      }
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
