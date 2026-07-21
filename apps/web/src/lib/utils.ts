import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatFullTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function getAvatarUrl(username: string, avatarUrl?: string | null) {
  const isDefault = !avatarUrl || 
    avatarUrl === 'null' || 
    avatarUrl === 'undefined' || 
    avatarUrl.trim() === '' ||
    avatarUrl.toLowerCase().includes('placeholder') || 
    avatarUrl.toLowerCase().includes('default') ||
    avatarUrl.toLowerCase().includes('silhouette');

  if (!isDefault) return avatarUrl as string;

  let seed = username || 'shin';
  const lowerSeed = seed.toLowerCase().trim();
  if (lowerSeed === 'user' || lowerSeed === 'me' || lowerSeed === 'member' || lowerSeed === 'guest' || lowerSeed === 'default') {
    seed = 'shin';
  }
  const normalizedSeed = seed.toLowerCase().trim();

  const gradients = [
    { from: '#6366f1', to: '#8b5cf6' },
    { from: '#ec4899', to: '#f43f5e' },
    { from: '#14b8a6', to: '#06b6d4' },
    { from: '#f97316', to: '#eab308' },
    { from: '#8b5cf6', to: '#d946ef' },
    { from: '#3b82f6', to: '#6366f1' },
    { from: '#10b981', to: '#34d399' },
    { from: '#ef4444', to: '#f97316' },
    { from: '#0ea5e9', to: '#6366f1' },
    { from: '#a855f7', to: '#ec4899' },
  ];

  let hash = 0;
  for (let i = 0; i < normalizedSeed.length; i++) {
    hash = normalizedSeed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const idx = Math.abs(hash) % gradients.length;
  const g = gradients[idx];
  const initial = (normalizedSeed[0] || 'V').toUpperCase();
  const gId = `g${idx}`;
  const sId = `s${idx}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="${gId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${g.from}"/>
        <stop offset="100%" stop-color="${g.to}"/>
      </linearGradient>
      <radialGradient id="${sId}" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#${gId})"/>
    <circle cx="64" cy="64" r="64" fill="url(#${sId})"/>
    <circle cx="64" cy="64" r="56" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1.5"/>
    <text x="64" y="64" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#ffffff" fill-opacity="0.95" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}


export function getCommunityIconUrl(name: string, iconUrl?: string | null) {
  if (iconUrl) return iconUrl;

  const normalizedSeed = (name || 'community').toLowerCase();
  const gradients = [
    { start: '#1E293B', end: '#475569' }, // Slate -> Cool Grey
    { start: '#0D9488', end: '#0F766E' }, // Teal -> Dark Teal
    { start: '#4F46E5', end: '#4338CA' }, // Indigo -> Dark Indigo
    { start: '#0284C7', end: '#0369A1' }, // Sky Blue -> Dark Sky
    { start: '#7C3AED', end: '#5B21B6' }  // Violet -> Dark Violet
  ];

  let hash = 0;
  for (let i = 0; i < normalizedSeed.length; i++) {
    hash = normalizedSeed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  const grad = gradients[index];

  const firstLetter = (name?.[0] || 'C').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <linearGradient id="c_g_${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${grad.start}" />
      <stop offset="100%" stop-color="${grad.end}" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#c_g_${index})" />
  <text x="16" y="17.5" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateVectorAvatar(
  name: string,
  gradientIndex: number,
  type: 'initial' | 'silhouette'
): string {
  const gradients = [
    { start: '#4F46E5', end: '#06B6D4' }, // Indigo -> Cyan
    { start: '#7C3AED', end: '#D946EF' }, // Violet -> Fuchsia
    { start: '#F43F5E', end: '#F97316' }, // Rose -> Orange
    { start: '#10B981', end: '#14B8A6' }, // Emerald -> Teal
    { start: '#2563EB', end: '#7C3AED' }, // Blue -> Violet
    { start: '#FF416C', end: '#FF4B2B' }, // Sunset Red -> Orange
    { start: '#7F00FF', end: '#FF007F' }, // Electric Pink -> Magenta
    { start: '#1F1C2C', end: '#928DAB' }, // Dark Slate -> Silver
  ];
  
  const grad = gradients[gradientIndex % gradients.length];
  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  let innerContent = '';
  if (type === 'initial') {
    innerContent = `<text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="#ffffff" fill-opacity="0.95" text-anchor="middle" dominant-baseline="middle">${initial}</text>`;
  } else {
    innerContent = `<circle cx="64" cy="50" r="20" fill="#ffffff" fill-opacity="0.95" /><path d="M28 110 C 28 90, 40 82, 64 82 C 88 82, 100 90, 100 110 L 28 110 Z" fill="#ffffff" fill-opacity="0.95" />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128"><defs><linearGradient id="pv_g_${gradientIndex}_${type}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${grad.start}" /><stop offset="100%" stop-color="${grad.end}" /></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#pv_g_${gradientIndex}_${type})" />${innerContent}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
