'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck, Terminal, Shield, Sparkles,
  Heart, Flame, Zap, Crown, Trophy,
  Star, UserPlus, Users, TrendingUp, Bookmark,
  Image as ImageIcon, FileText, CheckCircle2, Layers, Medal,
  Rocket, PenLine, BookOpen, MessageCircle, Award,
  Eye, Globe, Clock, Hash, Activity, Palette, Link2, MapPin, Smile, Gift, Fingerprint
} from 'lucide-react';

// ─── Public Types ────────────────────────────────────────────────────────────
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'singularity';

export type BadgeType =
  // Singularity & Verification
  | 'white_heart' | 'sovereign' | 'architect' | 'guardian' | 'founding'
  // Original Badges
  | 'first_follower' | 'connected' | 'popular' | 'influencer' | 'legend'
  | 'first_post' | 'liked' | 'viral_post' | 'bookmark_king' | 'top_creator'
  | 'avatar_set' | 'bio_written' | 'complete_profile' | 'profile_complete' | 'banner_hero'
  | 'peacekeeper' | 'veteran' | 'early_adopter' | 'helper'
  | 'post_10' | 'post_50' | 'post_100' | 'comment_50'
  | 'explorer' | 'night_owl' | 'early_bird' | 'curator'

  // Category 1: Singularity & Special (25 badges)
  | 'special_alpha' | 'special_beta' | 'special_bug_hunter' | 'special_security_auditor' | 'special_donor'
  | 'special_vip' | 'special_staff' | 'special_mod' | 'special_partner' | 'special_contest_winner'
  | 'special_artist' | 'special_writer' | 'special_musician' | 'special_pioneer' | 'special_legendary_node'
  | 'special_night_watch' | 'special_first_block' | 'special_crypto_verified' | 'special_premium' | 'special_anniversary_1'

  // Category 2: Streak & Activity (25 badges)
  | 'streak_1' | 'streak_2' | 'streak_3' | 'streak_5' | 'streak_7'
  | 'streak_10' | 'streak_14' | 'streak_21' | 'streak_30' | 'streak_45'
  | 'streak_60' | 'streak_75' | 'streak_90' | 'streak_100' | 'streak_120'
  | 'streak_150' | 'streak_180' | 'streak_200' | 'streak_240' | 'streak_270'
  | 'streak_300' | 'streak_330' | 'streak_365' | 'streak_500' | 'streak_1000'

  // Category 3: Profile & Customization (25 badges)
  | 'profile_avatar_1' | 'profile_avatar_update_5' | 'profile_avatar_update_10' | 'profile_avatar_update_20' | 'profile_banner_1'
  | 'profile_bio_1' | 'profile_links_1' | 'profile_location_1' | 'profile_pronouns_1' | 'profile_theme_1'
  | 'profile_theme_5' | 'profile_status_1' | 'profile_music_1' | 'profile_aesthetic_1'
  | 'profile_expert_1' | 'profile_expert_3' | 'profile_pin_1' | 'profile_bg_1' | 'profile_bg_premium'
  | 'profile_pfp_gold' | 'profile_pfp_neon' | 'profile_pfp_glitch' | 'profile_pfp_retro' | 'profile_pfp_cosmic'

  // Category 4: Engagement & Content (25 badges)
  | 'content_post_1' | 'content_post_5' | 'content_post_10' | 'content_post_25' | 'content_post_50'
  | 'content_post_100' | 'content_post_250' | 'content_post_500' | 'content_post_1000' | 'content_comment_1'
  | 'content_comment_10' | 'content_comment_50' | 'content_comment_100' | 'content_comment_500' | 'content_like_1'
  | 'content_like_10' | 'content_like_50' | 'content_like_100' | 'content_like_500' | 'content_like_1000'
  | 'content_save_1' | 'content_save_10' | 'content_save_50' | 'content_repost_1' | 'content_repost_25'

  // Category 5: Social & Connections (25 badges)
  | 'social_follower_1' | 'social_follower_5' | 'social_follower_10' | 'social_follower_25' | 'social_follower_50'
  | 'social_follower_100' | 'social_follower_250' | 'social_follower_500' | 'social_follower_1000' | 'social_follower_2500'
  | 'social_follower_5000' | 'social_follower_10000' | 'social_following_1' | 'social_following_10' | 'social_following_50'
  | 'social_following_100' | 'social_mutual_1' | 'social_mutual_5' | 'social_mutual_10' | 'social_chat_1'
  | 'social_chat_5' | 'social_share_profile' | 'social_security_90' | 'social_security_100' | 'social_karma_high';

export interface BadgeConfig {
  label: string;
  description: string;
  category: string;
  icon: any;
  rarity: BadgeRarity;
  colorClass: string;
  ringClass: string;
  glowColor: string;
  primaryColor: string;
  secondaryColor: string;
  bgGradient: string;
  ringGradient: string;
  rarityLabel: string;
  rarityColor: string;
}

// Helper to define simple gradient configurations
const makeColors = (rarity: BadgeRarity) => {
  switch (rarity) {
    case 'singularity':
      return {
        colorClass: 'text-white bg-white/10 border-white/30',
        ringClass: 'ring-white/20',
        glowColor: 'rgba(255,255,255,0.90)',
        primaryColor: '#ffffff',
        secondaryColor: '#e2e8f0',
        bgGradient: 'radial-gradient(circle at 35% 35%, #1e1e2e, #050508)',
        ringGradient: 'conic-gradient(from 0deg, #ffffff, #e2e8f0, #94a3b8, #cbd5e1, #ffffff)',
        rarityLabel: 'One of One',
        rarityColor: '#ffffff',
      };
    case 'mythic':
      return {
        colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        ringClass: 'ring-purple-500/20',
        glowColor: 'rgba(168,85,247,0.80)',
        primaryColor: '#c084fc',
        secondaryColor: '#a855f7',
        bgGradient: 'radial-gradient(circle at 35% 35%, #2e1065, #0a0516)',
        ringGradient: 'conic-gradient(from 0deg, #c084fc, #f472b6, #fb7185, #818cf8, #7c3aed, #a855f7, #c084fc)',
        rarityLabel: 'Mythic',
        rarityColor: '#ec4899',
      };
    case 'legendary':
      return {
        colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        ringClass: 'ring-amber-500/20',
        glowColor: 'rgba(251,191,36,0.70)',
        primaryColor: '#fbbf24',
        secondaryColor: '#d97706',
        bgGradient: 'radial-gradient(circle at 35% 35%, #451a03, #1c0701)',
        ringGradient: 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #d97706, #92400e, #451a03, #92400e, #d97706, #fbbf24)',
        rarityLabel: 'Legendary',
        rarityColor: '#f59e0b',
      };
    case 'epic':
      return {
        colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        ringClass: 'ring-cyan-500/20',
        glowColor: 'rgba(6,182,212,0.70)',
        primaryColor: '#67e8f9',
        secondaryColor: '#06b6d4',
        bgGradient: 'radial-gradient(circle at 35% 35%, #083344, #020c12)',
        ringGradient: 'conic-gradient(from 0deg, #67e8f9, #22d3ee, #06b6d4, #0891b2, #164e63, #0891b2, #06b6d4, #67e8f9)',
        rarityLabel: 'Epic',
        rarityColor: '#8b5cf6',
      };
    case 'rare':
      return {
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        ringClass: 'ring-emerald-500/20',
        glowColor: 'rgba(16,185,129,0.65)',
        primaryColor: '#6ee7b7',
        secondaryColor: '#10b981',
        bgGradient: 'radial-gradient(circle at 35% 35%, #052e16, #010d06)',
        ringGradient: 'conic-gradient(from 0deg, #6ee7b7, #34d399, #10b981, #059669, #064e3b, #059669, #10b981, #6ee7b7)',
        rarityLabel: 'Rare',
        rarityColor: '#06b6d4',
      };
    case 'common':
    default:
      return {
        colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        ringClass: 'ring-slate-500/15',
        glowColor: 'rgba(148,163,184,0.45)',
        primaryColor: '#cbd5e1',
        secondaryColor: '#94a3b8',
        bgGradient: 'radial-gradient(circle at 35% 35%, #1e293b, #050810)',
        ringGradient: 'conic-gradient(from 0deg, #cbd5e1, #94a3b8, #64748b, #334155, #cbd5e1)',
        rarityLabel: 'Common',
        rarityColor: '#94a3b8',
      };
  }
};

// ─── Badge Registry (125 badges, 25 per category) ───────────────────────────
export const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  // === CATEGORY 1: SINGULARITY & SPECIAL (25 badges) ===
  white_heart: {
    label: 'White Heart',
    description: 'The absolute heart of Verlyn. Exclusive to S.',
    category: 'Special',
    icon: Heart,
    rarity: 'singularity',
    ...makeColors('singularity'),
  },
  sovereign: {
    label: 'Sovereign',
    description: 'Verified creator identity credential.',
    category: 'Special',
    icon: ShieldCheck,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  architect: {
    label: 'Architect',
    description: 'Helped build the core platform code.',
    category: 'Special',
    icon: Terminal,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  guardian: {
    label: 'Guardian',
    description: 'Maintained high account security and trust.',
    category: 'Special',
    icon: Shield,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  founding: {
    label: 'Founding Member',
    description: 'Joined during the platform genesis phase.',
    category: 'Special',
    icon: Sparkles,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  special_alpha: {
    label: 'Alpha Tester',
    description: 'Tested early alpha releases of Verlyn.',
    category: 'Special',
    icon: ShieldCheck,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_beta: {
    label: 'Beta Tester',
    description: 'Participated in public beta testing cycles.',
    category: 'Special',
    icon: Activity,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  special_bug_hunter: {
    label: 'Bug Hunter',
    description: 'Found and reported system-breaking bugs.',
    category: 'Special',
    icon: Sparkles,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_security_auditor: {
    label: 'Security Shield',
    description: 'Reported security issues to protect users.',
    category: 'Special',
    icon: Fingerprint,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  special_donor: {
    label: 'Donor',
    description: 'Supported the project development financially.',
    category: 'Special',
    icon: Gift,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  special_vip: {
    label: 'VIP',
    description: 'A very important profile in the community.',
    category: 'Special',
    icon: Crown,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  special_staff: {
    label: 'Official Staff',
    description: 'Verified Verlyn staff member profile.',
    category: 'Special',
    icon: Terminal,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  special_mod: {
    label: 'Moderator',
    description: 'Helps keep our community safe and clean.',
    category: 'Special',
    icon: ShieldCheck,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_partner: {
    label: 'Partner Node',
    description: 'Official verified integration partner node.',
    category: 'Special',
    icon: Globe,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  special_contest_winner: {
    label: 'Champion',
    description: 'Winner of a platform event or challenge.',
    category: 'Special',
    icon: Trophy,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  special_artist: {
    label: 'Featured Artist',
    description: 'Official artist verified on the network.',
    category: 'Special',
    icon: Palette,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_writer: {
    label: 'Wordsmith',
    description: 'Official writer recognized by Verlyn.',
    category: 'Special',
    icon: PenLine,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_musician: {
    label: 'Soundmaker',
    description: 'Official musician verified on the network.',
    category: 'Special',
    icon: Sparkles,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_pioneer: {
    label: 'Pioneer',
    description: 'One of the first 100 users on the site.',
    category: 'Special',
    icon: Rocket,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  special_legendary_node: {
    label: 'Legendary Node',
    description: 'Helped route system node traffic.',
    category: 'Special',
    icon: Layers,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  special_night_watch: {
    label: 'Night Watch',
    description: 'Keeps the site safe after midnight hours.',
    category: 'Special',
    icon: Eye,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  special_first_block: {
    label: 'Genesis Key',
    description: 'Held a key in the first network block.',
    category: 'Special',
    icon: Fingerprint,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  special_crypto_verified: {
    label: 'Web3 Signed',
    description: 'Connected and verified a crypto wallet.',
    category: 'Special',
    icon: ShieldCheck,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  special_premium: {
    label: 'Prestige Member',
    description: 'Active premium subscriber profile status.',
    category: 'Special',
    icon: Crown,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  special_anniversary_1: {
    label: 'One Year',
    description: 'Profile has been active for one full year.',
    category: 'Special',
    icon: Medal,
    rarity: 'rare',
    ...makeColors('rare'),
  },

  // === CATEGORY 2: STREAK & ACTIVITY (25 badges) ===
  streak_1: {
    label: 'Day One',
    description: 'Logged in for one day. A fresh start.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_2: {
    label: 'Double Up',
    description: 'Logged in 2 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_3: {
    label: 'Spark',
    description: 'Logged in 3 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_5: {
    label: 'Five Alive',
    description: 'Logged in 5 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_7: {
    label: 'Weekly Habit',
    description: 'Logged in 7 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_10: {
    label: 'Double Digits',
    description: 'Logged in 10 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_14: {
    label: 'Fortnight',
    description: 'Logged in 14 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_21: {
    label: 'Three Weeks',
    description: 'Logged in 21 days in a row.',
    category: 'Streak',
    icon: Flame,
    rarity: 'common',
    ...makeColors('common'),
  },
  streak_30: {
    label: 'Month Club',
    description: 'Logged in 30 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  streak_45: {
    label: 'Half Season',
    description: 'Logged in 45 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  streak_60: {
    label: 'Two Months',
    description: 'Logged in 60 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  streak_75: {
    label: 'Steady Burn',
    description: 'Logged in 75 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  streak_90: {
    label: 'Season Run',
    description: 'Logged in 90 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  streak_100: {
    label: 'Century Streak',
    description: 'Logged in 100 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  streak_120: {
    label: 'Four Months',
    description: 'Logged in 120 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  streak_150: {
    label: 'Five Months',
    description: 'Logged in 150 days in a row.',
    category: 'Streak',
    icon: Zap,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  streak_180: {
    label: 'Half Year',
    description: 'Logged in 180 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  streak_200: {
    label: 'Double Century',
    description: 'Logged in 200 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  streak_240: {
    label: 'Eight Months',
    description: 'Logged in 240 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  streak_270: {
    label: 'Nine Months',
    description: 'Logged in 270 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  streak_300: {
    label: 'Triple Century',
    description: 'Logged in 300 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  streak_330: {
    label: 'Near Year',
    description: 'Logged in 330 days in a row.',
    category: 'Streak',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  streak_365: {
    label: 'One Year Streak',
    description: 'Logged in 365 days in a row.',
    category: 'Streak',
    icon: Trophy,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  streak_500: {
    label: 'Half K',
    description: 'Logged in 500 days in a row.',
    category: 'Streak',
    icon: Trophy,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  streak_1000: {
    label: 'Millennium',
    description: 'Logged in 1000 days in a row.',
    category: 'Streak',
    icon: Trophy,
    rarity: 'singularity',
    ...makeColors('singularity'),
  },

  // === CATEGORY 3: PROFILE & CUSTOMIZATION (25 badges) ===
  profile_avatar_1: {
    label: 'Face Set',
    description: 'Set a profile picture for the first time.',
    category: 'Profile',
    icon: ImageIcon,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_avatar_update_5: {
    label: 'Shapeshifter',
    description: 'Changed your avatar 5 times.',
    category: 'Profile',
    icon: ImageIcon,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_avatar_update_10: {
    label: 'Fashionist',
    description: 'Changed your avatar 10 times.',
    category: 'Profile',
    icon: ImageIcon,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_avatar_update_20: {
    label: 'Cosplay Icon',
    description: 'Changed your avatar 20 times.',
    category: 'Profile',
    icon: ImageIcon,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  profile_banner_1: {
    label: 'Banner Set',
    description: 'Added a header banner to your profile.',
    category: 'Profile',
    icon: Layers,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_bio_1: {
    label: 'Self-Described',
    description: 'Added a bio to tell your story.',
    category: 'Profile',
    icon: FileText,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_links_1: {
    label: 'Connector',
    description: 'Added links to your social pages.',
    category: 'Profile',
    icon: Link2,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_location_1: {
    label: 'Geographer',
    description: 'Set your physical location on your profile.',
    category: 'Profile',
    icon: MapPin,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_pronouns_1: {
    label: 'Identity Set',
    description: 'Set your profile pronouns.',
    category: 'Profile',
    icon: Smile,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_theme_1: {
    label: 'Color Set',
    description: 'Customized your profile color theme.',
    category: 'Profile',
    icon: Palette,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_theme_5: {
    label: 'Interior Designer',
    description: 'Customized your theme 5 times.',
    category: 'Profile',
    icon: Palette,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  complete_profile: {
    label: 'Profile Complete',
    description: 'Filled every detail on your profile.',
    category: 'Profile',
    icon: CheckCircle2,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_complete: {
    label: 'Profile Complete',
    description: 'Filled every detail on your profile.',
    category: 'Profile',
    icon: CheckCircle2,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_status_1: {
    label: 'Status Active',
    description: 'Set a custom status line.',
    category: 'Profile',
    icon: Smile,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_music_1: {
    label: 'Vibe Set',
    description: 'Added a track player to your profile.',
    category: 'Profile',
    icon: Sparkles,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_aesthetic_1: {
    label: 'Aesthetic Elite',
    description: 'Added layout styling details.',
    category: 'Profile',
    icon: Sparkles,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  profile_expert_1: {
    label: 'Expert Tag',
    description: 'Added an expertise tag to your card.',
    category: 'Profile',
    icon: Hash,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_expert_3: {
    label: 'Polymap',
    description: 'Added 3 or more expertise tags.',
    category: 'Profile',
    icon: Hash,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_pin_1: {
    label: 'Feature Post',
    description: 'Pinned a top post to your profile board.',
    category: 'Profile',
    icon: Bookmark,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_bg_1: {
    label: 'Aura Unlocked',
    description: 'Unlocked a custom background aura.',
    category: 'Profile',
    icon: Sparkles,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  profile_bg_premium: {
    label: 'Luxury Background',
    description: 'Customized a premium profile background.',
    category: 'Profile',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  profile_pfp_gold: {
    label: 'Golden Glow',
    description: 'Unlocked a gold frame for your picture.',
    category: 'Profile',
    icon: Fingerprint,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  profile_pfp_neon: {
    label: 'Neon Circle',
    description: 'Unlocked a glowing neon profile border.',
    category: 'Profile',
    icon: Fingerprint,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  profile_pfp_glitch: {
    label: 'Glitch Border',
    description: 'Unlocked a system glitch profile border.',
    category: 'Profile',
    icon: Fingerprint,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  profile_pfp_retro: {
    label: 'Retro Border',
    description: 'Unlocked a pixelated retro profile border.',
    category: 'Profile',
    icon: Fingerprint,
    rarity: 'common',
    ...makeColors('common'),
  },
  profile_pfp_cosmic: {
    label: 'Cosmic Border',
    description: 'Unlocked a stellar space profile border.',
    category: 'Profile',
    icon: Fingerprint,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },

  // === CATEGORY 4: ENGAGEMENT & CONTENT (25 badges) ===
  content_post_1: {
    label: 'First Post',
    description: 'Wrote and published your first post.',
    category: 'Content',
    icon: PenLine,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_post_5: {
    label: 'Handful',
    description: 'Wrote 5 posts on the timeline.',
    category: 'Content',
    icon: PenLine,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_post_10: {
    label: 'Frequent Blogger',
    description: 'Wrote 10 posts on the timeline.',
    category: 'Content',
    icon: PenLine,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_post_25: {
    label: 'Active Writer',
    description: 'Published 25 posts.',
    category: 'Content',
    icon: PenLine,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  content_post_50: {
    label: 'Half Century Post',
    description: 'Published 50 posts.',
    category: 'Content',
    icon: PenLine,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  content_post_100: {
    label: 'Century Poster',
    description: 'Published 100 posts.',
    category: 'Content',
    icon: BookOpen,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  content_post_250: {
    label: 'Daily Streamer',
    description: 'Published 250 posts.',
    category: 'Content',
    icon: BookOpen,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  content_post_500: {
    label: 'Voice of the Net',
    description: 'Published 500 posts.',
    category: 'Content',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  content_post_1000: {
    label: 'Verlyn Library',
    description: 'Published 1000 posts.',
    category: 'Content',
    icon: Trophy,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  content_comment_1: {
    label: 'First Reply',
    description: 'Left a reply on someone else post.',
    category: 'Content',
    icon: MessageCircle,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_comment_10: {
    label: 'Replier',
    description: 'Commented 10 times on the feed.',
    category: 'Content',
    icon: MessageCircle,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_comment_50: {
    label: 'Active Talker',
    description: 'Commented 50 times on the feed.',
    category: 'Content',
    icon: MessageCircle,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  content_comment_100: {
    label: 'Discussion Lead',
    description: 'Commented 100 times on the feed.',
    category: 'Content',
    icon: MessageCircle,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  content_comment_500: {
    label: 'Echo chamber',
    description: 'Commented 500 times on the feed.',
    category: 'Content',
    icon: Trophy,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  content_like_1: {
    label: 'Noticed',
    description: 'Received 1 like on a post.',
    category: 'Content',
    icon: Heart,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_like_10: {
    label: 'Cool Post',
    description: 'Received 10 likes on a post.',
    category: 'Content',
    icon: Heart,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_like_50: {
    label: 'Rising Star',
    description: 'Received 50 likes on a post.',
    category: 'Content',
    icon: Heart,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  content_like_100: {
    label: 'Featured Post',
    description: 'Received 100 likes on a post.',
    category: 'Content',
    icon: Heart,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  content_like_500: {
    label: 'Platform Heat',
    description: 'Received 500 likes on a post.',
    category: 'Content',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  content_like_1000: {
    label: 'Superstar Post',
    description: 'Received 1000 likes on a post.',
    category: 'Content',
    icon: Trophy,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  content_save_1: {
    label: 'Saved Choice',
    description: 'Had one of your posts saved by a user.',
    category: 'Content',
    icon: Bookmark,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_save_10: {
    label: 'Bookmark Gold',
    description: 'Had 10 of your posts saved.',
    category: 'Content',
    icon: Bookmark,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  content_save_50: {
    label: 'Encyclopedia',
    description: 'Had 50 of your posts saved.',
    category: 'Content',
    icon: Bookmark,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  content_repost_1: {
    label: 'Shared Value',
    description: 'Reposted someone else post to your feed.',
    category: 'Content',
    icon: Sparkles,
    rarity: 'common',
    ...makeColors('common'),
  },
  content_repost_25: {
    label: 'Echo Master',
    description: 'Reposted 25 posts to amplify others.',
    category: 'Content',
    icon: Sparkles,
    rarity: 'rare',
    ...makeColors('rare'),
  },

  // === CATEGORY 5: SOCIAL & CONNECTIONS (25 badges) ===
  social_follower_1: {
    label: 'First Connection',
    description: 'Gained your first follower.',
    category: 'Social',
    icon: UserPlus,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_follower_5: {
    label: 'Grown Circle',
    description: 'Gained 5 followers.',
    category: 'Social',
    icon: UserPlus,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_follower_10: {
    label: 'Small Squad',
    description: 'Gained 10 followers.',
    category: 'Social',
    icon: Users,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_follower_25: {
    label: 'Quarter Century',
    description: 'Gained 25 followers.',
    category: 'Social',
    icon: Users,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_follower_50: {
    label: 'Half Century Squad',
    description: 'Gained 50 followers.',
    category: 'Social',
    icon: Users,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_follower_100: {
    label: 'Century Hub',
    description: 'Gained 100 followers.',
    category: 'Social',
    icon: Users,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_follower_250: {
    label: 'Audience Room',
    description: 'Gained 250 followers.',
    category: 'Social',
    icon: Star,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  social_follower_500: {
    label: 'Public Hall',
    description: 'Gained 500 followers.',
    category: 'Social',
    icon: Star,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  social_follower_1000: {
    label: 'Arena Host',
    description: 'Gained 1000 followers.',
    category: 'Social',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  social_follower_2500: {
    label: 'Stadium Star',
    description: 'Gained 2500 followers.',
    category: 'Social',
    icon: Crown,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  social_follower_5000: {
    label: 'Festival Host',
    description: 'Gained 5000 followers.',
    category: 'Social',
    icon: Trophy,
    rarity: 'mythic',
    ...makeColors('mythic'),
  },
  social_follower_10000: {
    label: 'Network Elite',
    description: 'Gained 10000 followers.',
    category: 'Social',
    icon: Trophy,
    rarity: 'singularity',
    ...makeColors('singularity'),
  },
  social_following_1: {
    label: 'First Scout',
    description: 'Followed your first user.',
    category: 'Social',
    icon: UserPlus,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_following_10: {
    label: 'Connector',
    description: 'Followed 10 profiles.',
    category: 'Social',
    icon: Users,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_following_50: {
    label: 'Web Builder',
    description: 'Followed 50 profiles.',
    category: 'Social',
    icon: Users,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_following_100: {
    label: 'Librarian',
    description: 'Followed 100 profiles.',
    category: 'Social',
    icon: Users,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  social_mutual_1: {
    label: 'Mutual Vibe',
    description: 'Have one mutual follower.',
    category: 'Social',
    icon: Users,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_mutual_5: {
    label: 'Friendly Team',
    description: 'Have 5 mutual followers.',
    category: 'Social',
    icon: Users,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_mutual_10: {
    label: 'Inner Trust',
    description: 'Have 10 mutual followers.',
    category: 'Social',
    icon: Crown,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  social_chat_1: {
    label: 'DM Opener',
    description: 'Started a direct message conversation.',
    category: 'Social',
    icon: MessageCircle,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_chat_5: {
    label: 'Social Node',
    description: 'Exchanged direct messages with 5 users.',
    category: 'Social',
    icon: MessageCircle,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_share_profile: {
    label: 'Promoter',
    description: 'Shared profile link to reference others.',
    category: 'Social',
    icon: Sparkles,
    rarity: 'common',
    ...makeColors('common'),
  },
  social_security_90: {
    label: 'High Secure',
    description: 'Security score above 90.',
    category: 'Social',
    icon: ShieldCheck,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  social_security_100: {
    label: 'Cyber Shield',
    description: 'Security score is perfect at 100.',
    category: 'Social',
    icon: ShieldCheck,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  social_karma_high: {
    label: 'Good Soul',
    description: 'Maintained a positive karma score.',
    category: 'Social',
    icon: Smile,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  // --- ORIGINAL COMPATIBILITY MAPS ---
  first_follower: {
    label: 'Not Alone',
    description: 'Someone followed you for the first time.',
    category: 'Social',
    icon: UserPlus,
    rarity: 'common',
    ...makeColors('common'),
  },
  connected: {
    label: 'Connected',
    description: '10 people follow you.',
    category: 'Social',
    icon: Users,
    rarity: 'common',
    ...makeColors('common'),
  },
  popular: {
    label: 'Popular',
    description: '100 people follow you.',
    category: 'Social',
    icon: Star,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  influencer: {
    label: 'Influencer',
    description: '500 people follow you.',
    category: 'Social',
    icon: Star,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  legend: {
    label: 'Legend',
    description: '1000+ followers. You are a household name.',
    category: 'Social',
    icon: Trophy,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  first_post: {
    label: 'First Words',
    description: 'You posted for the first time.',
    category: 'Content',
    icon: PenLine,
    rarity: 'common',
    ...makeColors('common'),
  },
  liked: {
    label: 'Liked',
    description: 'A post of yours got 10 likes.',
    category: 'Content',
    icon: Heart,
    rarity: 'common',
    ...makeColors('common'),
  },
  viral_post: {
    label: 'Viral',
    description: 'A post hit 100 likes.',
    category: 'Content',
    icon: TrendingUp,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  bookmark_king: {
    label: 'Bookmark King',
    description: 'Your posts were saved 50+ times.',
    category: 'Content',
    icon: Bookmark,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  top_creator: {
    label: 'Top Creator',
    description: 'One of the most active creators on Verlyn.',
    category: 'Content',
    icon: Award,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  avatar_set: {
    label: 'Got a Face',
    description: 'You set a profile picture.',
    category: 'Profile',
    icon: ImageIcon,
    rarity: 'common',
    ...makeColors('common'),
  },
  bio_written: {
    label: 'Has a Story',
    description: 'You wrote a bio.',
    category: 'Profile',
    icon: FileText,
    rarity: 'common',
    ...makeColors('common'),
  },
  banner_hero: {
    label: 'Banner Hero',
    description: 'You set a custom banner.',
    category: 'Profile',
    icon: Layers,
    rarity: 'common',
    ...makeColors('common'),
  },
  peacekeeper: {
    label: 'Peacekeeper',
    description: 'Zero violations. Clean record.',
    category: 'Special',
    icon: Shield,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  veteran: {
    label: 'Veteran',
    description: 'You have been on Verlyn for over a year.',
    category: 'Special',
    icon: Medal,
    rarity: 'legendary',
    ...makeColors('legendary'),
  },
  early_adopter: {
    label: 'Early Adopter',
    description: 'Joined in the first month of Verlyn.',
    category: 'Special',
    icon: Rocket,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  helper: {
    label: 'Helper',
    description: 'Left helpful comments 10+ times.',
    category: 'Special',
    icon: Heart,
    rarity: 'common',
    ...makeColors('common'),
  },
  post_10: {
    label: '10 Posts',
    description: 'Made 10 posts.',
    category: 'Content',
    icon: PenLine,
    rarity: 'common',
    ...makeColors('common'),
  },
  post_50: {
    label: '50 Posts',
    description: '50 posts made.',
    category: 'Content',
    icon: BookOpen,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  post_100: {
    label: '100 Posts',
    description: '100 posts.',
    category: 'Content',
    icon: BookOpen,
    rarity: 'epic',
    ...makeColors('epic'),
  },
  comment_50: {
    label: 'Voice',
    description: 'Left 50 comments.',
    category: 'Content',
    icon: MessageCircle,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  explorer: {
    label: 'Explorer',
    description: 'Visited 100 different profiles.',
    category: 'Special',
    icon: Globe,
    rarity: 'common',
    ...makeColors('common'),
  },
  night_owl: {
    label: 'Night Owl',
    description: 'Usually online after midnight.',
    category: 'Special',
    icon: Eye,
    rarity: 'rare',
    ...makeColors('rare'),
  },
  early_bird: {
    label: 'Early Bird',
    description: 'Usually online before 8am.',
    category: 'Special',
    icon: Clock,
    rarity: 'common',
    ...makeColors('common'),
  },
  curator: {
    label: 'Curator',
    description: 'Shared 50+ posts.',
    category: 'Special',
    icon: Activity,
    rarity: 'rare',
    ...makeColors('rare'),
  },
};

// ─── Size System ─────────────────────────────────────────────────────────────
interface SzCfg {
  container: number; badge: number; icon: number;
  ring: number; br: number; glowPx: number;
  particles: number; particlePx: number; breatheS: number;
}

const SZ: Record<'sm' | 'md' | 'lg' | 'xl', SzCfg> = {
  sm: { container: 24, badge: 20, icon: 10, ring: 1.5, br: 7,  glowPx: 8,  particles: 0, particlePx: 0,   breatheS: 2.5 },
  md: { container: 36, badge: 28, icon: 14, ring: 1.5, br: 9,  glowPx: 12, particles: 3, particlePx: 2,   breatheS: 2.5 },
  lg: { container: 54, badge: 42, icon: 21, ring: 2,   br: 13, glowPx: 20, particles: 5, particlePx: 2.5, breatheS: 3   },
  xl: { container: 80, badge: 64, icon: 32, ring: 2.5, br: 18, glowPx: 32, particles: 7, particlePx: 3,   breatheS: 3.5 },
};

const RING_SPEED: Record<BadgeRarity, number> = {
  common: 12, rare: 8, epic: 5.5, legendary: 3.5, mythic: 2.5, singularity: 1.8,
};

const PARTICLE_COUNT: Record<BadgeRarity, number> = {
  common: 0, rare: 2, epic: 4, legendary: 5, mythic: 6, singularity: 8,
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function setAlpha(rgba: string, a: number) {
  return rgba.replace(/,\s*[\d.]+\)$/, `, ${a})`);
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  type: BadgeType;
  onClick?: (type: BadgeType) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  revealDelay?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function IdentityBadge({
  type, onClick, size = 'md', className = '', revealDelay = 0,
}: Props) {
  const cfg = BADGE_CONFIG[type];
  const sz  = SZ[size];
  const rm  = useReducedMotion();

  const [revealed,  setRevealed]  = useState(false);
  const [shineTick, setShineTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80 + revealDelay);
    return () => clearTimeout(t);
  }, [revealDelay]);

  useEffect(() => {
    if (rm) return;
    const id = setInterval(
      () => setShineTick(n => n + 1),
      3200 + Math.random() * 2400,
    );
    return () => clearInterval(id);
  }, [rm]);

  if (!cfg) return null;

  const Icon  = cfg.icon;
  const speed = RING_SPEED[cfg.rarity];
  const inset = (sz.container - sz.badge) / 2;

  // Singularity badge gets extra particles at all sizes
  const particleCount = cfg.rarity === 'singularity'
    ? (size === 'sm' ? 2 : size === 'md' ? 4 : 6)
    : (cfg.rarity === 'common' ? 0 : sz.particles);

  const particles = particleCount > 0 && !rm
    ? Array.from({ length: particleCount }, (_, i) => {
        const startAngle = (360 / particleCount) * i;
        const dir        = i % 2 === 0 ? 1 : -1;
        const spd        = speed * (0.88 + i * 0.14);
        const pSize      = cfg.rarity === 'singularity' ? sz.particlePx * 0.8 : sz.particlePx;
        const color      = i % 3 === 0 ? cfg.primaryColor : cfg.secondaryColor;
        return (
          <motion.div
            key={i}
            style={{ position: 'absolute', inset: 0 }}
            initial={{ rotate: startAngle }}
            animate={{ rotate: startAngle + dir * 360 }}
            transition={{ duration: spd, repeat: Infinity, ease: 'linear' }}
          >
            <div style={{
              position: 'absolute',
              top: -pSize / 2,
              left: '50%',
              transform: 'translateX(-50%)',
              width:  pSize,
              height: pSize,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 ${pSize * 3}px ${color}`,
            }} />
          </motion.div>
        );
      })
    : null;

  const badge = (
    <motion.div
      className={className}
      style={{ position: 'relative', width: sz.container, height: sz.container, flexShrink: 0 }}
      initial={{ scale: 0.15, opacity: 0, filter: 'blur(10px)' }}
      animate={revealed
        ? { scale: 1, opacity: 1, filter: 'blur(0px)' }
        : { scale: 0.15, opacity: 0, filter: 'blur(10px)' }}
      transition={{
        scale:   { type: 'spring', stiffness: 220, damping: 16 },
        opacity: { duration: 0.3 },
        filter:  { duration: 0.4 },
      }}
      whileHover={rm ? {} : {
        scale: 1.22,
        filter: type === 'white_heart'
          ? 'drop-shadow(0 0 24px rgba(255,255,255,0.95))'
          : `drop-shadow(0 0 ${sz.glowPx * 1.8}px ${cfg.glowColor})`,
        transition: { type: 'spring', stiffness: 340, damping: 14 },
      }}
      whileTap={{ scale: 0.86 }}
    >
      {/* Breathing ambient glow */}
      {!rm && (
        <motion.div
          style={{ position: 'absolute', inset: inset - 3, borderRadius: sz.br + 3, zIndex: 0, pointerEvents: 'none' }}
          animate={{
            boxShadow: type === 'white_heart' ? [
              `0 0 ${sz.glowPx * 0.8}px 2px rgba(255,255,255,0.30)`,
              `0 0 ${sz.glowPx * 1.5}px 6px rgba(255,255,255,0.75)`,
              `0 0 ${sz.glowPx * 0.8}px 2px rgba(255,255,255,0.30)`,
            ] : [
              `0 0 ${sz.glowPx * 0.55}px 0px ${setAlpha(cfg.glowColor, 0.25)}`,
              `0 0 ${sz.glowPx}px 3px      ${setAlpha(cfg.glowColor, 0.65)}`,
              `0 0 ${sz.glowPx * 0.55}px 0px ${setAlpha(cfg.glowColor, 0.25)}`,
            ],
          }}
          transition={{ duration: type === 'white_heart' ? 1.2 : sz.breatheS, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Badge wrapper (overflow:hidden clips ring + shine) */}
      <div style={{ position: 'absolute', inset, borderRadius: sz.br, overflow: 'hidden', zIndex: 1 }}>
        {/* Rotating conic-gradient ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: -(sz.ring + 0.5),
            borderRadius: sz.br + sz.ring + 0.5,
            background: type === 'white_heart'
              ? 'conic-gradient(from 0deg, #ffffff, #e4e4e7, #71717a, #ffffff)'
              : cfg.ringGradient,
          }}
          animate={rm ? {} : { rotate: 360 }}
          transition={{ duration: type === 'white_heart' ? 1.0 : speed, repeat: Infinity, ease: 'linear' }}
        />

        {/* Badge body */}
        <div style={{
          position: 'absolute',
          inset: sz.ring,
          borderRadius: sz.br - sz.ring,
          background: type === 'white_heart'
            ? 'linear-gradient(135deg, #18181b 0%, #09090b 100%)'
            : cfg.bgGradient,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Depth shadow */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 72% 72%, rgba(0,0,0,0.55), transparent 65%)' }} />
          {/* Specular highlight */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 22% 22%, rgba(255,255,255,0.13), transparent 58%)' }} />

          {/* Shine sweep */}
          {!rm && (
            <motion.div
              key={shineTick}
              initial={{ x: '-260%', skewX: -12 }}
              animate={{ x: '260%' }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 28%, rgba(255,255,255,0.26) 50%, transparent 72%)', pointerEvents: 'none', zIndex: 2 }}
            />
          )}

          {/* Icon */}
          <div style={{ position: 'relative', zIndex: 3 }}>
            {type === 'white_heart' ? (
              <motion.div
                animate={rm ? {} : {
                  scale: [1, 1.20, 0.96, 1.20, 1],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.2, 0.4, 0.6, 1],
                }}
              >
                <Icon size={sz.icon} style={{ color: '#ffffff', filter: `drop-shadow(0 0 6px rgba(255,255,255,0.95))`, strokeWidth: 2.8 }} />
              </motion.div>
            ) : (
              <Icon size={sz.icon} style={{ color: cfg.primaryColor, filter: `drop-shadow(0 0 4px ${setAlpha(cfg.glowColor, 0.9)})`, strokeWidth: 2.5 }} />
            )}
          </div>
        </div>
      </div>

      {/* Particle layer */}
      {particles && (
        <div style={{ position: 'absolute', inset, zIndex: 2, pointerEvents: 'none' }}>
          {particles}
        </div>
      )}
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onClick(type); }}
        className="outline-none focus-visible:ring-2 focus-visible:ring-white/25 rounded-xl"
        style={{ display: 'inline-flex', verticalAlign: 'middle' }}
        title={cfg.label}
        aria-label={`${cfg.label} — ${cfg.rarityLabel} badge`}
      >
        {badge}
      </button>
    );
  }

  return badge;
}
