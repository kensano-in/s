import { 
  Rocket, Code, BookOpen, Music, Palette, Plane, BatteryCharging, Flame, Tv, Moon, Coffee, Smile, LucideIcon 
} from 'lucide-react';

export interface StructuredOccupation {
  title: string;
  category?: string;
}

export interface StructuredEducation {
  level?: string;
  degree?: string;
  fieldOfStudy?: string;
  institution?: string;
}

export interface StructuredLocation {
  country?: string;
  state?: string;
  city?: string;
}

export interface ProfileMetadata {
  statusText?: string;
  statusEmoji?: string;
  tags?: string[];
  occupation?: string;
  education?: string;
  location?: string;
  birthdayVisible?: boolean;
  birthday?: string;
  birthdayMode?: 'date_month' | 'date_month_year';
  structuredOccupation?: StructuredOccupation;
  structuredEducation?: StructuredEducation;
  structuredLocation?: StructuredLocation;
  structuredPronouns?: string;
  privacySettings?: {
    bio?: 'public' | 'followers' | 'mutuals' | 'private';
    occupation?: 'public' | 'followers' | 'mutuals' | 'private';
    education?: 'public' | 'followers' | 'mutuals' | 'private';
    location?: 'public' | 'followers' | 'mutuals' | 'private';
    pronouns?: 'public' | 'followers' | 'mutuals' | 'private';
    customLink?: 'public' | 'followers' | 'mutuals' | 'private';
  };
  selectedFrameBadge?: string;
  selectedPrimaryBadge?: string;
  hideBadgesFromProfile?: boolean;
  hideBadgeCount?: boolean;
  badgeGlowAura?: boolean;
  chromaBorder?: boolean;
  heartbeatPulse?: boolean;
  notifiedBadges?: string[];
}

export interface StatusIconConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  emoji: string;
  animationClass: string;
}

export const STATUS_ICONS: Record<string, StatusIconConfig> = {
  rocket: { key: 'rocket', label: 'Building', icon: Rocket, color: 'text-rose-400', emoji: '🚀', animationClass: 'animate-pulse' },
  code: { key: 'code', label: 'Coding', icon: Code, color: 'text-blue-400', emoji: '💻', animationClass: '' },
  book: { key: 'book', label: 'Studying', icon: BookOpen, color: 'text-amber-400', emoji: '📚', animationClass: '' },
  music: { key: 'music', label: 'Listening', icon: Music, color: 'text-emerald-400', emoji: '🎧', animationClass: 'animate-bounce [animation-duration:2s]' },
  palette: { key: 'palette', label: 'Designing', icon: Palette, color: 'text-pink-400', emoji: '🎨', animationClass: '' },
  plane: { key: 'plane', label: 'Traveling', icon: Plane, color: 'text-cyan-400', emoji: '✈️', animationClass: 'hover:translate-x-0.5 transition-transform' },
  battery: { key: 'battery', label: 'Charging', icon: BatteryCharging, color: 'text-green-400', emoji: '🔋', animationClass: 'animate-pulse' },
  fire: { key: 'fire', label: 'Hustling', icon: Flame, color: 'text-orange-400', emoji: '🔥', animationClass: 'animate-pulse' },
  popcorn: { key: 'popcorn', label: 'Watching', icon: Tv, color: 'text-purple-400', emoji: '🍿', animationClass: '' },
  moon: { key: 'moon', label: 'Resting', icon: Moon, color: 'text-indigo-400', emoji: '💤', animationClass: '' },
  coffee: { key: 'coffee', label: 'Focused', icon: Coffee, color: 'text-amber-600', emoji: '☕', animationClass: '' },
};

export function getStatusIcon(keyOrEmoji: string | null | undefined): StatusIconConfig {
  if (!keyOrEmoji) {
    return { key: 'smile', label: 'Status', icon: Smile, color: 'text-white/40', emoji: '💬', animationClass: '' };
  }
  const key = keyOrEmoji.toLowerCase().trim();
  
  if (key === 'rocket' || keyOrEmoji === '🚀') return STATUS_ICONS.rocket;
  if (key === 'code' || key === 'laptop' || keyOrEmoji === '💻') return STATUS_ICONS.code;
  if (key === 'book' || key === 'books' || keyOrEmoji === '📚') return STATUS_ICONS.book;
  if (key === 'music' || key === 'headphones' || keyOrEmoji === '🎧' || keyOrEmoji === '🎵') return STATUS_ICONS.music;
  if (key === 'palette' || key === 'art' || keyOrEmoji === '🎨') return STATUS_ICONS.palette;
  if (key === 'plane' || key === 'travel' || keyOrEmoji === '✈️') return STATUS_ICONS.plane;
  if (key === 'battery' || keyOrEmoji === '🔋') return STATUS_ICONS.battery;
  if (key === 'fire' || keyOrEmoji === '🔥') return STATUS_ICONS.fire;
  if (key === 'popcorn' || key === 'tv' || keyOrEmoji === '🍿') return STATUS_ICONS.popcorn;
  if (key === 'moon' || key === 'zzz' || keyOrEmoji === '💤' || keyOrEmoji === '🌙') return STATUS_ICONS.moon;
  if (key === 'coffee' || keyOrEmoji === '☕' || keyOrEmoji === '🍳') return STATUS_ICONS.coffee;
  
  return { key: 'smile', label: 'Status', icon: Smile, color: 'text-white/40', emoji: '💬', animationClass: '' };
}

export function parseBio(fullBio: string | null | undefined): {
  visibleBio: string;
  metadata: ProfileMetadata;
} {
  if (!fullBio) return { visibleBio: '', metadata: {} };
  
  const markerIndex = fullBio.search(/[\[|]identity:/);
  if (markerIndex !== -1) {
    const visibleBio = fullBio.slice(0, markerIndex).trim();
    const identityPart = fullBio.slice(markerIndex);
    
    const startBrace = identityPart.indexOf('{');
    const endBrace = identityPart.lastIndexOf('}');
    
    if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
      const jsonStr = identityPart.slice(startBrace, endBrace + 1);
      try {
        const metadata = JSON.parse(jsonStr);
        return { visibleBio, metadata };
      } catch (e) {
        return { visibleBio, metadata: {} };
      }
    }
    return { visibleBio, metadata: {} };
  }
  
  return { visibleBio: fullBio.trim(), metadata: {} };
}

export function serializeBio(visibleBio: string, metadata: ProfileMetadata): string {
  const cleanBio = (visibleBio || '').trim();
  const cleanMeta: ProfileMetadata = {};
  
  if (metadata.statusText?.trim()) cleanMeta.statusText = metadata.statusText.trim();
  if (metadata.statusEmoji?.trim()) cleanMeta.statusEmoji = metadata.statusEmoji.trim();
  if (metadata.tags && metadata.tags.length > 0) {
    cleanMeta.tags = metadata.tags.map(t => t.trim()).filter(Boolean);
  }
  if (metadata.occupation?.trim()) cleanMeta.occupation = metadata.occupation.trim();
  if (metadata.education?.trim()) cleanMeta.education = metadata.education.trim();
  if (metadata.location?.trim()) cleanMeta.location = metadata.location.trim();
  if (metadata.birthdayVisible !== undefined) cleanMeta.birthdayVisible = metadata.birthdayVisible;
  if (metadata.birthday?.trim()) cleanMeta.birthday = metadata.birthday.trim();
  if (metadata.birthdayMode?.trim()) cleanMeta.birthdayMode = metadata.birthdayMode;
  
  if (metadata.structuredOccupation) cleanMeta.structuredOccupation = metadata.structuredOccupation;
  if (metadata.structuredEducation) cleanMeta.structuredEducation = metadata.structuredEducation;
  if (metadata.structuredLocation) cleanMeta.structuredLocation = metadata.structuredLocation;
  if (metadata.structuredPronouns?.trim()) cleanMeta.structuredPronouns = metadata.structuredPronouns.trim();
  if (metadata.privacySettings) cleanMeta.privacySettings = metadata.privacySettings;
  
  if (metadata.selectedFrameBadge) cleanMeta.selectedFrameBadge = metadata.selectedFrameBadge;
  if (metadata.selectedPrimaryBadge) cleanMeta.selectedPrimaryBadge = metadata.selectedPrimaryBadge;
  if (metadata.hideBadgesFromProfile !== undefined) cleanMeta.hideBadgesFromProfile = metadata.hideBadgesFromProfile;
  if (metadata.hideBadgeCount !== undefined) cleanMeta.hideBadgeCount = metadata.hideBadgeCount;
  if (metadata.badgeGlowAura !== undefined) cleanMeta.badgeGlowAura = metadata.badgeGlowAura;
  if (metadata.chromaBorder !== undefined) cleanMeta.chromaBorder = metadata.chromaBorder;
  if (metadata.heartbeatPulse !== undefined) cleanMeta.heartbeatPulse = metadata.heartbeatPulse;
  if (metadata.notifiedBadges) cleanMeta.notifiedBadges = metadata.notifiedBadges;

  if (Object.keys(cleanMeta).length === 0) {
    return cleanBio;
  }

  const jsonStr = JSON.stringify(cleanMeta);
  return `${cleanBio} [identity:${jsonStr}]`.trim();
}
