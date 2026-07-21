'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Award, ChevronRight, Crown, Gem, Shield, Star, X, Zap } from 'lucide-react';
import { BadgeType, BadgeRarity, BADGE_CONFIG } from './IdentityBadge';
import IdentityBadge from './IdentityBadge';

// ─── Badge Copy ───────────────────────────────────────────────────────────────
const BADGE_COPY: Partial<Record<BadgeType, { meaning: string; benefits: string[]; lore?: string }>> = {
  white_heart: {
    lore: 'There is only one.',
    meaning: "This is the rarest badge in all of Verlyn. It has been given to exactly one person in the platform's entire history. It means this person is the heart of the whole thing — not a feature, not a title. Just the one person who this place was made for.",
    benefits: ['One of one — never duplicated', 'Permanent place in Verlyn history', 'Exists on a level no other badge reaches'],
  },
  sovereign: { meaning: 'Your identity has been verified. You own your digital space here. Sovereign means no one can impersonate you and your account is authentic.', benefits: ['Shows verified identity to everyone', 'Priority visibility in searches', 'Trusted by the platform'] },
  architect: { meaning: 'You helped build this platform. The code, the design, the systems — some of it runs because of you. This badge is only given to people who worked on building Verlyn.', benefits: ['Shows system-level trust', 'Recognized as a platform builder', 'Can access dev-level tools'] },
  guardian: { meaning: 'Your security score is above 85. That means you have 2FA on, a complete profile, no violations, and strong account health. Other people can trust you.', benefits: ['Extended API access', 'High trust weight in the network', 'Access to security diagnostics'] },
  founding: { meaning: 'You were here before most people even knew Verlyn existed. This badge marks you as a founding member — someone who joined in the earliest days and helped the community start.', benefits: ['Historical proof of early membership', 'Beta access to new features first', 'Special weight in community votes'] },
  streak_3: { meaning: 'You logged in 3 days in a row. A small start but the streak is alive.', benefits: ['First step in the streak system', 'Foundation for higher streak badges'] },
  streak_7: { meaning: 'Seven days straight. A full week without missing a single day.', benefits: ['Shows weekly commitment', 'Halfway to the 30-day badge'] },
  streak_30: { meaning: 'Thirty days in a row. A whole month of showing up consistently. Most people stop before this.', benefits: ['Rare streak achievement', 'Proves consistent daily presence'] },
  streak_100: { meaning: '100 days straight. This is where most streaks die. You did not stop.', benefits: ['Top 5% of all users', 'Epic-level recognition of commitment'] },
  streak_365: { meaning: 'A full year. Every single day for 365 days. This is not a badge — this is proof of something.', benefits: ['Legendary streak achievement', 'One of the rarest activity badges', 'Unlocks special profile effects'] },
  first_follower: { meaning: 'Someone followed you for the first time. You are not invisible anymore.', benefits: ['First social milestone on Verlyn'] },
  connected: { meaning: '10 people follow you. A small but real community has found you.', benefits: ['Social presence established', 'Eligible for community features'] },
  popular: { meaning: '100 people follow you. What you post reaches real people.', benefits: ['Significant social presence', 'Content reaches a wide audience'] },
  influencer: { meaning: '500 followers. Your voice carries weight here.', benefits: ['Top-tier social recognition', 'High platform influence score'] },
  legend: { meaning: '1000+ followers. People know your name on this platform.', benefits: ['Legendary social standing', 'Name recognition across the community', 'Platform-wide reach'] },
  first_post: { meaning: 'You posted on Verlyn for the first time. Every voice starts somewhere.', benefits: ['First step into the content creator path'] },
  liked: { meaning: 'One of your posts got 10 likes. People genuinely enjoyed what you shared.', benefits: ['First content engagement milestone'] },
  viral_post: { meaning: 'One of your posts got 100 likes. That post really connected with people.', benefits: ['Viral content creator recognition', 'Top post eligible for featured placement'] },
  bookmark_king: { meaning: 'Your posts have been saved 50+ times by other people. They are keeping your content.', benefits: ['High-quality content recognition', 'Posts recommended more often'] },
  top_creator: { meaning: 'You are one of the most active and consistent creators on the platform right now.', benefits: ['Featured in creator spotlights', 'Algorithm boost for new posts', 'Top creator recognition across the platform'] },
  avatar_set: { meaning: 'You added a profile picture. You have a face here now.', benefits: ['Profile visibility improved', 'More likely to get followers'] },
  bio_written: { meaning: 'You wrote a bio. People can now understand who you are when they visit your profile.', benefits: ['Stronger profile first impression'] },
  complete_profile: { meaning: 'Every section of your profile is filled in — avatar, bio, banner, location, and links.', benefits: ['Maximum profile trust score', 'Appears higher in discovery feeds'] },
  banner_hero: { meaning: 'You set a custom banner on your profile. Your profile looks complete and personal.', benefits: ['Professional profile appearance'] },
  peacekeeper: { meaning: 'Zero violations. No warnings, no bans, no reports upheld. You keep it clean.', benefits: ['Trust badge visible to everyone', 'Higher trust weight in community actions'] },
  veteran: { meaning: 'You have been on Verlyn for more than one full year. You have seen this place grow.', benefits: ['Legendary community standing', 'Recognition as a long-term member'] },
  early_adopter: { meaning: 'You joined Verlyn in the very first month of its existence. Not many people can say that.', benefits: ['Epic-level historical badge', 'Recognized as a pioneer on the platform'] },
  helper: { meaning: 'You have left genuinely helpful comments 10 or more times. People here are better off because of it.', benefits: ['Community trust badge', 'Positive impact recognition'] },
  post_10: { meaning: 'You have made 10 posts. You are finding your rhythm.', benefits: ['First posting milestone unlocked'] },
  post_50: { meaning: '50 posts. You are consistent and committed to sharing.', benefits: ['Established creator milestone', 'Higher algorithm weight for your content'] },
  post_100: { meaning: '100 posts. You are a real part of what this place is made of.', benefits: ['Top creator tier milestone', 'Epic recognition for prolific posting'] },
  comment_50: { meaning: 'You have commented 50 times. You are part of the conversation, not just a viewer.', benefits: ['Active community participant badge'] },
  explorer: { meaning: 'You have visited 100 different profiles. You are curious and engaged with the community.', benefits: ['Community explorer recognition'] },
  night_owl: { meaning: 'You are usually online after midnight. The late night is your time.', benefits: ['Unique activity pattern badge'] },
  early_bird: { meaning: 'You are usually online before 8am. You start the day before most people.', benefits: ['Unique activity pattern badge'] },
  curator: { meaning: 'You have shared 50+ posts. You spread good things to people who might have missed them.', benefits: ['Community amplifier recognition'] },
};

// ─── Rarity config ────────────────────────────────────────────────────────────
const RARITY_DOTS: Record<BadgeRarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, singularity: 6 };
const RARITY_META: Record<BadgeRarity, { icon: any; label: string; tagline: string }> = {
  singularity: { icon: Crown, label: 'Singularity', tagline: 'Beyond measurement. Beyond category.' },
  mythic:      { icon: Star,  label: 'Mythic',      tagline: 'Fewer than 1% of users hold this.' },
  legendary:   { icon: Gem,   label: 'Legendary',   tagline: 'Only the most dedicated earn this.' },
  epic:        { icon: Zap,   label: 'Epic',         tagline: 'A mark of exceptional achievement.' },
  rare:        { icon: Shield,label: 'Rare',         tagline: 'This sets you apart from the crowd.' },
  common:      { icon: Award, label: 'Common',       tagline: 'The start of something greater.' },
};

// ─── Pre-computed stars (no Math.random in render) ─────────────────────────
const WH_STARS = [
  { x: 7,  y: 10, s: 1, lo: 0.08, hi: 0.45, d: 2.8, dl: 0.0 },
  { x: 22, y: 6,  s: 1, lo: 0.05, hi: 0.28, d: 3.5, dl: 0.7 },
  { x: 79, y: 4,  s: 2, lo: 0.10, hi: 0.55, d: 2.2, dl: 1.2 },
  { x: 92, y: 14, s: 1, lo: 0.06, hi: 0.32, d: 4.0, dl: 0.3 },
  { x: 14, y: 34, s: 1, lo: 0.05, hi: 0.22, d: 3.2, dl: 1.8 },
  { x: 87, y: 29, s: 2, lo: 0.10, hi: 0.48, d: 2.6, dl: 0.9 },
  { x: 4,  y: 54, s: 1, lo: 0.06, hi: 0.25, d: 3.8, dl: 2.1 },
  { x: 96, y: 49, s: 1, lo: 0.05, hi: 0.30, d: 2.9, dl: 0.4 },
  { x: 29, y: 71, s: 2, lo: 0.08, hi: 0.45, d: 3.3, dl: 1.5 },
  { x: 71, y: 76, s: 1, lo: 0.06, hi: 0.22, d: 4.2, dl: 0.6 },
  { x: 44, y: 89, s: 1, lo: 0.05, hi: 0.35, d: 2.5, dl: 2.4 },
  { x: 83, y: 86, s: 2, lo: 0.10, hi: 0.50, d: 3.0, dl: 1.1 },
  { x: 11, y: 81, s: 1, lo: 0.06, hi: 0.25, d: 3.7, dl: 0.8 },
  { x: 56, y: 2,  s: 1, lo: 0.05, hi: 0.30, d: 2.7, dl: 1.9 },
  { x: 41, y: 21, s: 1, lo: 0.08, hi: 0.40, d: 3.4, dl: 0.2 },
  { x: 63, y: 93, s: 1, lo: 0.06, hi: 0.25, d: 2.3, dl: 2.7 },
  { x: 17, y: 49, s: 1, lo: 0.05, hi: 0.20, d: 4.5, dl: 0.5 },
  { x: 74, y: 61, s: 2, lo: 0.09, hi: 0.50, d: 2.8, dl: 1.3 },
  { x: 34, y: 96, s: 1, lo: 0.06, hi: 0.30, d: 3.1, dl: 2.0 },
  { x: 50, y: 43, s: 1, lo: 0.03, hi: 0.12, d: 5.0, dl: 3.0 },
  { x: 3,  y: 20, s: 1, lo: 0.04, hi: 0.18, d: 4.1, dl: 2.8 },
  { x: 60, y: 15, s: 1, lo: 0.06, hi: 0.28, d: 2.9, dl: 1.6 },
  { x: 33, y: 55, s: 2, lo: 0.08, hi: 0.42, d: 3.6, dl: 0.7 },
  { x: 88, y: 68, s: 1, lo: 0.05, hi: 0.22, d: 3.3, dl: 1.4 },
  { x: 20, y: 90, s: 1, lo: 0.07, hi: 0.35, d: 2.6, dl: 2.2 },
];

// ─── Pre-computed orbit particles ─────────────────────────────────────────────
const WH_ORBIT = [
  { a: 0,   d: 10,  sz: 6, cw: true,  g: 14, op: 1.00 },
  { a: 45,  d: 16,  sz: 3, cw: false, g: 8,  op: 0.75 },
  { a: 90,  d: 8,   sz: 5, cw: true,  g: 12, op: 0.95 },
  { a: 135, d: 22,  sz: 3, cw: false, g: 7,  op: 0.70 },
  { a: 180, d: 11,  sz: 6, cw: true,  g: 14, op: 1.00 },
  { a: 225, d: 18,  sz: 3, cw: false, g: 8,  op: 0.75 },
  { a: 270, d: 9,   sz: 5, cw: true,  g: 12, op: 0.95 },
  { a: 315, d: 14,  sz: 3, cw: false, g: 7,  op: 0.70 },
  // Inner ring — tighter orbit
  { a: 22,  d: 7,   sz: 3, cw: true,  g: 6,  op: 0.60 },
  { a: 112, d: 13,  sz: 3, cw: false, g: 6,  op: 0.55 },
  { a: 202, d: 7.5, sz: 3, cw: true,  g: 6,  op: 0.60 },
  { a: 292, d: 15,  sz: 3, cw: false, g: 6,  op: 0.55 },
];

const INNER_ORBIT_RADIUS = 40;
const OUTER_ORBIT_RADIUS = 72;

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { isOpen: boolean; onClose: () => void; type: BadgeType | null; }

// ═══════════════════════════════════════════════════════════════════════════════
//  WHITE HEART — DIVINE SINGULARITY MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function WhiteHeartModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const copy = BADGE_COPY['white_heart']!;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">

          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/98 backdrop-blur-2xl"
          />

          {/* ── Distant halo behind card ── */}
          <motion.div
            className="fixed z-[99] pointer-events-none rounded-full"
            style={{ width: 600, height: 600, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            animate={{ opacity: [0.06, 0.18, 0.06], scale: [0.88, 1.08, 0.88] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-full h-full rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 65%)' }} />
          </motion.div>

          {/* ── Modal wrapper ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.80, y: 48 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.80, y: 48 }}
            transition={{ type: 'spring', duration: 0.70, bounce: 0.32 }}
            className="relative z-[100] w-full max-w-[430px] my-auto"
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Elegant white shimmer border ── */}
            <div className="relative rounded-[30px] overflow-hidden" style={{ padding: '1.5px' }}>

              {/* Single white light sweeping around — clean, not rainbow */}
              <motion.div
                className="absolute pointer-events-none"
                style={{
                  top: '-50%', left: '-50%', width: '200%', height: '200%',
                  background: 'conic-gradient(from 0deg, rgba(255,255,255,0.04), rgba(255,255,255,0.06), rgba(255,255,255,0.9), rgba(255,255,255,0.06), rgba(255,255,255,0.04))',
                }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />

              {/* ── Inner card ── */}
              <div
                className="relative rounded-[28px] [overflow-y:auto] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ background: '#030305', maxHeight: 'calc(90vh - 6px)' }}
              >

                {/* Scanlines for texture */}
                <div
                  className="absolute inset-0 pointer-events-none z-[60]"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.013) 3px, rgba(255,255,255,0.013) 4px)' }}
                />

                {/* Star field */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {WH_STARS.map((star, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full bg-white"
                      style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s }}
                      animate={{ opacity: [star.lo, star.hi, star.lo] }}
                      transition={{ duration: star.d, repeat: Infinity, delay: star.dl, ease: 'easeInOut' }}
                    />
                  ))}
                </div>

                {/* Shifting top ambient light */}
                <motion.div
                  className="absolute top-0 inset-x-0 h-64 pointer-events-none z-[1]"
                  animate={{
                    background: [
                      'radial-gradient(ellipse at 42% -5%, rgba(255,255,255,0.16), transparent 58%)',
                      'radial-gradient(ellipse at 58% -5%, rgba(180,190,255,0.11), transparent 58%)',
                      'radial-gradient(ellipse at 42% -5%, rgba(255,255,255,0.16), transparent 58%)',
                    ],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* ── HEADER ── */}
                <div className="relative z-10 flex justify-between items-center px-5 pt-5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Award size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.20)' }}>
                      Verlyn Credentials
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.span
                      animate={{ opacity: [0.12, 0.30, 0.12] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}
                    >
                      SINGULARITY‑001
                    </motion.span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-7 h-7 rounded-full flex items-center justify-center border transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.30)' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* ── BADGE SHOWCASE ── */}
                <div className="relative z-10 flex flex-col items-center pt-3 pb-1">

                  {/* Orbit arena */}
                  <div className="relative flex items-center justify-center" style={{ width: 190, height: 190 }}>

                    {/* Pulse rings */}
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: 84 + i * 20, height: 84 + i * 20,
                          border: `${1.4 - i * 0.25}px solid rgba(255,255,255,${0.45 - i * 0.08})`,
                        }}
                        animate={{
                          scale: [1, 1.22 - i * 0.03, 1],
                          opacity: [0.40 - i * 0.08, 0.03, 0.40 - i * 0.08],
                        }}
                        transition={{
                          duration: 2.6 + i * 0.55,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.42,
                        }}
                      />
                    ))}

                    {/* Outer orbit particles */}
                    {WH_ORBIT.slice(0, 8).map((p, i) => (
                      <motion.div
                        key={`outer-${i}`}
                        className="absolute inset-0"
                        style={{ transformOrigin: '50% 50%' }}
                        initial={{ rotate: p.a }}
                        animate={{ rotate: p.cw ? [p.a, p.a + 360] : [p.a, p.a - 360] }}
                        transition={{ duration: p.d, repeat: Infinity, ease: 'linear' }}
                      >
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: p.sz, height: p.sz,
                            backgroundColor: 'white',
                            top: '50%',
                            left: `calc(50% + ${OUTER_ORBIT_RADIUS}px)`,
                            transform: 'translate(-50%, -50%)',
                            opacity: p.op,
                            boxShadow: `0 0 ${p.g}px rgba(255,255,255,${p.op})`,
                          }}
                        />
                      </motion.div>
                    ))}

                    {/* Inner orbit particles */}
                    {WH_ORBIT.slice(8).map((p, i) => (
                      <motion.div
                        key={`inner-${i}`}
                        className="absolute inset-0"
                        style={{ transformOrigin: '50% 50%' }}
                        initial={{ rotate: p.a }}
                        animate={{ rotate: p.cw ? [p.a, p.a + 360] : [p.a, p.a - 360] }}
                        transition={{ duration: p.d, repeat: Infinity, ease: 'linear' }}
                      >
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: p.sz, height: p.sz,
                            backgroundColor: 'white',
                            top: '50%',
                            left: `calc(50% + ${INNER_ORBIT_RADIUS}px)`,
                            transform: 'translate(-50%, -50%)',
                            opacity: p.op,
                            boxShadow: `0 0 ${p.g}px rgba(255,255,255,${p.op * 0.8})`,
                          }}
                        />
                      </motion.div>
                    ))}

                    {/* Badge — breathing glow */}
                    <motion.div
                      className="relative z-10"
                      animate={{
                        filter: [
                          'drop-shadow(0 0 8px rgba(255,255,255,0.45)) drop-shadow(0 0 24px rgba(200,210,255,0.20))',
                          'drop-shadow(0 0 28px rgba(255,255,255,0.90)) drop-shadow(0 0 60px rgba(200,210,255,0.40))',
                          'drop-shadow(0 0 8px rgba(255,255,255,0.45)) drop-shadow(0 0 24px rgba(200,210,255,0.20))',
                        ],
                      }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <IdentityBadge type="white_heart" size="xl" revealDelay={60} />
                    </motion.div>
                  </div>

                  {/* ── ONE OF ONE row with flanking dots ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                          key={i}
                          className="rounded-full bg-white"
                          style={{ width: 4, height: 4 }}
                          animate={{ opacity: [0.15, 0.85, 0.15], scale: [1, i === 5 ? 1.6 : 1.1, 1] }}
                          transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.17, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                    <div
                      className="px-3 py-1 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.11)' }}
                    >
                      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.30em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
                        ONE OF ONE
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[5, 4, 3, 2, 1, 0].map((i) => (
                        <motion.div
                          key={i}
                          className="rounded-full bg-white"
                          style={{ width: 4, height: 4 }}
                          animate={{ opacity: [0.15, 0.85, 0.15], scale: [1, i === 5 ? 1.6 : 1.1, 1] }}
                          transition={{ duration: 1.7, repeat: Infinity, delay: i * 0.17, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  {/* ── Title block ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36 }}
                    className="text-center mt-2.5 space-y-1"
                  >
                    {/* Shimmer title */}
                    <div className="relative overflow-hidden inline-block">
                      <h2
                        style={{
                          fontSize: 32,
                          fontWeight: 900,
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                          background: 'linear-gradient(120deg, #94a3b8 0%, #f1f5f9 22%, #ffffff 44%, #f1f5f9 66%, #94a3b8 88%)',
                          backgroundSize: '220% auto',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        White Heart
                      </h2>
                      {/* Shimmer sweep overlay */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ x: ['-100%', '220%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.5, ease: 'linear' }}
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)', width: '40%' }}
                      />
                    </div>

                    {/* Lore line */}
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.24)', fontStyle: 'italic', fontWeight: 500, letterSpacing: '0.04em' }}>
                      "{copy.lore}"
                    </p>
                  </motion.div>
                </div>

                {/* ── EKG HEARTBEAT LINE ── */}
                <div className="relative z-10 px-6 py-0.5">
                  <svg width="100%" height="28" viewBox="0 0 390 28" preserveAspectRatio="none">
                    {/* Static baseline */}
                    <line x1="0" y1="14" x2="390" y2="14" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    {/* Animated pulse sweep */}
                    <motion.path
                      d="M-20,14 L85,14 L98,2 L106,26 L114,2 L124,26 L132,14 L215,14 L228,2 L236,26 L244,2 L254,26 L262,14 L410,14"
                      fill="none"
                      stroke="rgba(255,255,255,0.28)"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="145 1200"
                      animate={{ strokeDashoffset: [0, -1345] }}
                      transition={{ duration: 3.0, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 }}
                    />
                    {/* Bright dot at leading edge */}
                    <motion.circle
                      r="2.5"
                      fill="white"
                      fillOpacity="0.7"
                      animate={{
                        cx: [0, 390],
                        cy: [14, 14, 2, 26, 2, 26, 14, 14, 14, 2, 26, 2, 26, 14, 14],
                      }}
                      transition={{ duration: 3.0, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 }}
                    />
                  </svg>
                </div>

                {/* ── Gradient divider ── */}
                <div className="mx-5 mb-0 mt-1" style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)' }} />

                {/* ── BODY ── */}
                <div className="relative z-10 px-5 pt-4 pb-4 space-y-4">

                  {/* What it means */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.32 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-[2px] h-[14px] rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)' }} />
                      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                        What It Means
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.54)', lineHeight: 1.65, fontWeight: 500, paddingLeft: 10 }}>
                      {copy.meaning}
                    </p>
                  </motion.div>

                  {/* Privileges — glass cards */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.40 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-[2px] h-[14px] rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)' }} />
                      <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)' }}>
                        Privileges
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-[10px]">
                      {copy.benefits.map((b, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.46 + idx * 0.10 }}
                          className="relative flex items-start gap-3 px-3 py-2.5 rounded-xl overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          {/* Left accent bar */}
                          <div className="absolute left-0 top-[20%] bottom-[20%] w-[2px] rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.45), transparent)' }} />
                          {/* Shimmer sweep */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2.2, repeat: Infinity, delay: 2 + idx * 1.2, repeatDelay: 6, ease: 'linear' }}
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', width: '40%' }}
                          />
                          {/* Dot icon */}
                          <motion.div
                            className="relative z-10 shrink-0 flex items-center justify-center rounded-lg mt-0.5"
                            style={{ width: 18, height: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                            animate={{ boxShadow: ['0 0 0px rgba(255,255,255,0)', `0 0 8px rgba(255,255,255,0.3)`, '0 0 0px rgba(255,255,255,0)'] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: idx * 0.8, ease: 'easeInOut' }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                          </motion.div>
                          <span className="relative z-10" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', fontWeight: 500, lineHeight: 1.5 }}>
                            {b}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Genesis record */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.70 }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div>
                      <p style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.16)' }}>
                        Genesis Record
                      </p>
                      <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.26)', fontFamily: 'monospace', marginTop: 2 }}>
                        SINGULARITY‑001 · Granted Directly
                      </p>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.3, 1.0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
                      <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                        LIVE
                      </span>
                    </motion.div>
                  </motion.div>
                </div>

                {/* ── FOOTER BUTTON ── */}
                <div className="relative z-10 px-5 pb-5">
                  <motion.button
                    type="button"
                    onClick={() => { onClose(); window.location.href = '/badges'; }}
                    whileHover={{ scale: 1.025 }}
                    whileTap={{ scale: 0.965 }}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)' }}
                  >
                    {/* Shimmer sweep on button */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{ x: ['-100%', '220%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.8, ease: 'linear' }}
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)', width: '40%' }}
                    />
                    <span className="relative z-10" style={{ fontSize: 9.5, fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                      View All Credentials
                    </span>
                    <ChevronRight size={11} className="relative z-10" />
                  </motion.button>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STANDARD BADGE MODAL (all other badges)
// ═══════════════════════════════════════════════════════════════════════════════
function StandardModal({ isOpen, onClose, type }: Props & { type: BadgeType }) {
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  let copy = BADGE_COPY[type as keyof typeof BADGE_COPY];
  if (!copy) {
    copy = {
      meaning: `You have successfully unlocked the ${config.label} credential. This represents a key milestone under the ${config.category} category. ${config.description}`,
      benefits: [
        `Displays the animated ${config.label} badge on your profile header`,
        `Unlocks custom ${config.rarity} tier styling overrides`,
        `Increases overall account trust and prestige indicators`,
      ],
    };
  }

  const dotCount = RARITY_DOTS[config.rarity];
  const rarityMeta = RARITY_META[config.rarity];
  const RarityIcon = rarityMeta.icon;
  const isSingularity = config.rarity === 'singularity';
  const isMythic = config.rarity === 'mythic';
  const isLegendary = config.rarity === 'legendary';
  const isHighTier = isSingularity || isMythic || isLegendary;

  const particles = isHighTier ? [
    { x: 15, y: 20, delay: 0,   size: 2 },
    { x: 80, y: 15, delay: 0.8, size: 2 },
    { x: 65, y: 65, delay: 1.3, size: 2 },
    { x: 30, y: 70, delay: 0.5, size: 2 },
  ] : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', duration: 0.50, bounce: 0.24 }}
            className="w-full max-w-[430px] relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {isSingularity && (
              <motion.div
                animate={{ boxShadow: [`0 0 40px 8px ${config.primaryColor}20`, `0 0 70px 20px ${config.primaryColor}35`, `0 0 40px 8px ${config.primaryColor}20`] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-[28px] pointer-events-none"
              />
            )}

            <div className={`relative rounded-[28px] overflow-hidden border shadow-[0_40px_80px_rgba(0,0,0,0.95)] ${
              isSingularity ? 'border-white/[0.12] bg-[#080808]' :
              isMythic      ? 'border-purple-500/[0.18] bg-[#070510]' :
              isLegendary   ? 'border-amber-500/[0.15] bg-[#080600]' :
                              'border-white/[0.06] bg-neutral-950'
            }`}>

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((p, i) => (
                  <motion.div key={i} className="absolute rounded-full" style={{ width: p.size, height: p.size, backgroundColor: config.primaryColor, left: `${p.x}%`, top: `${p.y}%` }}
                    animate={{ y: [0, -28, 0], opacity: [0, 0.65, 0], scale: [0.6, 1.2, 0.6] }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
                  />
                ))}
              </div>

              <div className="absolute top-0 inset-x-0 h-48 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${config.glowColor.replace(/[\d.]+\)$/, '0.16)')}, transparent 68%)` }} />

              {/* Header */}
              <div className="flex justify-between items-center px-6 pt-5 pb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.primaryColor + '18', border: `1px solid ${config.primaryColor}30` }}>
                    <Award size={11} style={{ color: config.primaryColor }} />
                  </div>
                  <span className="text-[9.5px] font-black uppercase tracking-[0.18em] text-white/25">Verlyn Credentials</span>
                </div>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-white/35 hover:text-white flex items-center justify-center border border-white/[0.05] transition-all outline-none active:scale-95">
                  <X size={13} />
                </button>
              </div>

              <div className="h-[1px] mx-6 mb-0" style={{ backgroundColor: config.primaryColor + '14' }} />

              {/* Body */}
              <div className="px-6 pb-6 pt-4 space-y-5 relative z-10">
                <div className="flex flex-col items-center text-center gap-3 pt-1">
                  {isSingularity && (
                    <div className="absolute flex items-center justify-center pointer-events-none">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} className="absolute rounded-full border" style={{ borderColor: config.primaryColor + '20', width: 90 + i * 30, height: 90 + i * 30 }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.08, 0.4] }}
                          transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                        />
                      ))}
                    </div>
                  )}

                  <motion.div
                    animate={isSingularity ? { filter: [`drop-shadow(0 0 8px ${config.primaryColor}50)`, `drop-shadow(0 0 22px ${config.primaryColor}80)`, `drop-shadow(0 0 8px ${config.primaryColor}50)`] } : {}}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <IdentityBadge type={type} size="lg" revealDelay={80} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="flex items-center gap-2 flex-wrap justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-[0.16em] border"
                      style={{ color: config.rarityColor, backgroundColor: config.primaryColor + '15', borderColor: config.primaryColor + '30' }}>
                      <RarityIcon size={8} /> {rarityMeta.label}
                    </span>
                    <div className="flex gap-[4px] items-center">
                      {Array.from({ length: dotCount }, (_, i) => (
                        <motion.div key={i} animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
                          style={{ backgroundColor: config.primaryColor }} className="w-[5px] h-[5px] rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="space-y-1">
                    {copy.lore && <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1.5" style={{ color: config.primaryColor + 'aa' }}>{copy.lore}</p>}
                    <h2 className="text-[22px] font-black tracking-tight leading-none text-white">{config.label}</h2>
                    <p className="text-[9.5px] font-black uppercase tracking-[0.18em] mt-1" style={{ color: config.rarityColor + '99' }}>{config.category}</p>
                  </motion.div>

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }} className="text-[11px] text-white/28 font-semibold italic">
                    {rarityMeta.tagline}
                  </motion.p>
                </div>

                <div className="h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${config.primaryColor}22, transparent)` }} />

                {copy?.meaning && (
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.30 }} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: config.primaryColor + '80' }} />
                      <h3 className="text-[8.5px] font-black uppercase tracking-[0.18em] text-white/28">What It Means</h3>
                    </div>
                    <p className="text-[12.5px] text-white/58 leading-relaxed font-medium pl-[11px]">{copy.meaning}</p>
                  </motion.div>
                )}

                {copy?.benefits && copy.benefits.length > 0 && (
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 }} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-[3px] h-4 rounded-full" style={{ backgroundColor: config.primaryColor + '80' }} />
                      <h3 className="text-[8.5px] font-black uppercase tracking-[0.18em] text-white/28">What It Gives You</h3>
                    </div>
                    <ul className="space-y-2 pl-[11px]">
                      {copy.benefits.map((b, idx) => (
                        <motion.li key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 + idx * 0.08 }} className="flex items-start gap-2.5">
                          <motion.div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: config.primaryColor + '18', border: `1px solid ${config.primaryColor}35` }}
                            animate={isSingularity ? { boxShadow: [`0 0 0px ${config.primaryColor}00`, `0 0 6px ${config.primaryColor}60`, `0 0 0px ${config.primaryColor}00`] } : {}}
                            transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3, ease: 'easeInOut' }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.primaryColor }} />
                          </motion.div>
                          <span className="text-[12px] text-white/62 font-medium leading-relaxed">{b}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {isSingularity && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }}
                    className="rounded-2xl p-4 border border-white/[0.06] relative overflow-hidden" style={{ backgroundColor: config.primaryColor + '06' }}>
                    <div className="relative z-10 text-center space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/25">Singularity Tier</p>
                      <p className="text-[11.5px] text-white/48 font-medium leading-relaxed">
                        This badge exists outside the normal system. There is no tier above it. No achievement unlocks it.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="px-6 pb-6 relative z-10">
                <motion.button type="button" onClick={() => { onClose(); window.location.href = '/badges'; }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl font-black text-[10.5px] uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                  style={isSingularity
                    ? { background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.12)' }
                    : { background: config.primaryColor + '14', color: config.rarityColor, border: `1px solid ${config.primaryColor}25` }}>
                  <span className="relative z-10">View All Credentials</span>
                  <ChevronRight size={12} className="relative z-10" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function BadgeInfoModal({ isOpen, onClose, type }: Props) {
  if (!type) return null;

  // The White Heart gets a completely bespoke divine experience
  if (type === 'white_heart') {
    return <WhiteHeartModal isOpen={isOpen} onClose={onClose} />;
  }

  return <StandardModal isOpen={isOpen} onClose={onClose} type={type} />;
}
