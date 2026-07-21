export interface ShapeDefinition {
  id: string;
  name: string;
  category: 'basic' | 'professional' | 'developer' | 'tech' | 'gaming' | 'creator' | 'business';
  viewBox: string;
  path: string;
}

export const SHAPE_LIBRARY: ShapeDefinition[] = [
  // ── BASIC SHAPES ──
  {
    id: 'circle',
    name: 'Circle',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<circle cx="12" cy="12" r="10" />'
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<rect x="2" y="2" width="20" height="20" />'
  },
  {
    id: 'rounded-rect',
    name: 'Rounded Rectangle',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<rect x="2" y="2" width="20" height="20" rx="4" ry="4" />'
  },
  {
    id: 'square',
    name: 'Square',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<rect x="3" y="3" width="18" height="18" />'
  },
  {
    id: 'triangle',
    name: 'Triangle',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="12,2 22,22 2,22" />'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="12,2 22,12 12,22 2,12" />'
  },
  {
    id: 'star',
    name: 'Star',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />'
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />'
  },
  {
    id: 'arrow',
    name: 'Arrow',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<path d="M16 13H4v-2h12V7l6 5-6 5v-4z" />'
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="12,2 22,9 18,21 6,21 2,9" />'
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />'
  },
  {
    id: 'octagon',
    name: 'Octagon',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" />'
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<polygon points="9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" />'
  },
  {
    id: 'shield',
    name: 'Shield',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<path d="M12 2L2 7v6c0 5.52 4.48 10 10 10s10-4.48 10-10V7L12 2z" />'
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12l4 4V4c0-1.1-.9-2-2-2z" />'
  },
  {
    id: 'cloud',
    name: 'Cloud',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />'
  },
  {
    id: 'capsule',
    name: 'Capsule',
    category: 'basic',
    viewBox: '0 0 32 16',
    path: '<rect x="1" y="1" width="30" height="14" rx="7" ry="7" />'
  },
  {
    id: 'line',
    name: 'Line',
    category: 'basic',
    viewBox: '0 0 24 24',
    path: '<line x1="2" y1="12" x2="22" y2="12" stroke-linecap="round" />'
  },

  // ── PROFESSIONAL DESIGN OBJECTS ──
  {
    id: 'organic-blob-1',
    name: 'Liquid Blob A',
    category: 'professional',
    viewBox: '0 0 100 100',
    path: '<path d="M25,-32.8C31.5,-28.9,35.3,-20.1,38.9,-10.8C42.4,-1.5,45.7,8.2,43.2,16.8C40.6,25.4,32.2,32.9,22.7,39.3C13.2,45.7,2.7,51.1,-6.6,49.8C-16,48.5,-24.1,40.4,-33.4,32.5C-42.6,24.6,-53.1,16.8,-55.8,6.8C-58.4,-3.2,-53.2,-15.4,-45.5,-24.5C-37.7,-33.6,-27.4,-39.7,-17.4,-41.8C-7.4,-44,2.2,-42.2,12.5,-39.2C22.7,-36.1,18.6,-36.8,25,-32.8Z" transform="translate(50 50)" />'
  },
  {
    id: 'organic-blob-2',
    name: 'Liquid Blob B',
    category: 'professional',
    viewBox: '0 0 100 100',
    path: '<path d="M38.3,-45.3C50.2,-37.8,60.9,-27.1,64,-14.2C67,-1.3,62.4,13.7,55,26.4C47.7,39.1,37.6,49.4,25.1,54.8C12.7,60.2,-2.1,60.7,-16.8,57.1C-31.4,53.4,-45.9,45.6,-53.6,33.5C-61.3,21.5,-62.2,5.2,-59.8,-9.6C-57.3,-24.4,-51.5,-37.8,-41,-45.6C-30.6,-53.5,-15.3,-55.7,-1.2,-54.3C12.9,-52.8,26.5,-52.8,38.3,-45.3Z" transform="translate(50 50)" />'
  },
  {
    id: 'glass-panel',
    name: 'Frosted Glass Panel',
    category: 'professional',
    viewBox: '0 0 100 100',
    path: '<rect x="5" y="5" width="90" height="90" rx="8" />'
  },
  {
    id: 'corner-bracket',
    name: 'Corner Guide',
    category: 'professional',
    viewBox: '0 0 24 24',
    path: '<path d="M5 11V5H11M19 13V19H13" fill="none" stroke-linecap="round" stroke-linejoin="round" />'
  },
  {
    id: 'spotlight-glow',
    name: 'Spotlight Cone',
    category: 'professional',
    viewBox: '0 0 100 100',
    path: '<polygon points="50,5 95,95 5,95" opacity="0.15" />'
  },

  // ── DEVELOPER ELEMENTS ──
  {
    id: 'terminal-window',
    name: 'Terminal Window',
    category: 'developer',
    viewBox: '0 0 24 24',
    path: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" /><circle cx="5" cy="8" r="0.75" /><circle cx="7.5" cy="8" r="0.75" /><circle cx="10" cy="8" r="0.75" /><path d="M5 12l2.5 2L5 16M9 16h5" fill="none" stroke-linecap="round" />'
  },
  {
    id: 'browser-window',
    name: 'Browser Window',
    category: 'developer',
    viewBox: '0 0 24 24',
    path: '<rect x="2" y="4" width="20" height="16" rx="2" fill="none" /><line x1="2" y1="9" x2="22" y2="9" /><circle cx="5" cy="6.5" r="0.6" /><circle cx="7" cy="6.5" r="0.6" /><circle cx="9" cy="6.5" r="0.6" />'
  },
  {
    id: 'code-box',
    name: 'Code Container',
    category: 'developer',
    viewBox: '0 0 24 24',
    path: '<path d="M8 6L2 12l6 6M16 6l6 6-6 6M10 18l4-12" fill="none" stroke-linecap="round" />'
  },
  {
    id: 'git-branch',
    name: 'Git Branch',
    category: 'developer',
    viewBox: '0 0 24 24',
    path: '<circle cx="6" cy="6" r="3" fill="none" /><circle cx="18" cy="18" r="3" fill="none" /><circle cx="6" cy="18" r="3" fill="none" /><path d="M6 9v6M9 18h6a3 3 0 0 0 3-3v-3" fill="none" />'
  },
  {
    id: 'cursor-point',
    name: 'Dev Cursor',
    category: 'developer',
    viewBox: '0 0 24 24',
    path: '<polygon points="4,2 4,22 9.5,16.5 16,22 19,20 12.5,14.5 19,14.5" />'
  },

  // ── TECH HUD & SCANNERS ──
  {
    id: 'cyber-ring',
    name: 'Cybernetic Rings',
    category: 'tech',
    viewBox: '0 0 100 100',
    path: '<circle cx="50" cy="50" r="45" fill="none" stroke-dasharray="8 6" /><circle cx="50" cy="50" r="35" fill="none" stroke-dasharray="1 3" /><circle cx="50" cy="50" r="25" fill="none" stroke-dasharray="25 10" />'
  },
  {
    id: 'crosshair-target',
    name: 'HUD Targeter',
    category: 'tech',
    viewBox: '0 0 24 24',
    path: '<circle cx="12" cy="12" r="9" fill="none" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="1" x2="12" y2="5" fill="none" /><line x1="12" y1="19" x2="12" y2="23" fill="none" /><line x1="1" y1="12" x2="5" y2="12" fill="none" /><line x1="19" y1="12" x2="23" y2="12" fill="none" />'
  },
  {
    id: 'radar-scanner',
    name: 'Active Radar',
    category: 'tech',
    viewBox: '0 0 24 24',
    path: '<circle cx="12" cy="12" r="10" fill="none" /><circle cx="12" cy="12" r="6" fill="none" /><line x1="12" y1="2" x2="12" y2="22" fill="none" /><line x1="2" y1="12" x2="22" y2="12" fill="none" /><line x1="12" y1="12" x2="19" y2="5" stroke-linecap="round" />'
  },
  {
    id: 'hex-grid',
    name: 'Hexagonal Grid',
    category: 'tech',
    viewBox: '0 0 40 40',
    path: '<path d="M20 0 L40 11.5 L40 34.5 L20 46 L0 34.5 L0 11.5 Z M20 40 L35 31.5 L35 14.5 L20 6 L5 14.5 L5 31.5 Z" fill="none" opacity="0.4" />'
  },

  // ── GAMING ELEMENTS ──
  {
    id: 'health-bar',
    name: 'HUD Health Bar',
    category: 'gaming',
    viewBox: '0 0 100 16',
    path: '<rect x="2" y="2" width="96" height="12" rx="3" fill="none" /><rect x="6" y="5" width="65" height="6" rx="1" />'
  },
  {
    id: 'loot-frame',
    name: 'Loot Highlight Box',
    category: 'gaming',
    viewBox: '0 0 32 32',
    path: '<rect x="2" y="2" width="28" height="28" fill="none" stroke-width="1.5" /><path d="M2 10V2H10 M30 10V2H22 M2 22v8h8 M30 22v8h-8" fill="none" />'
  },
  {
    id: 'xp-tier-bar',
    name: 'XP Progress Arc',
    category: 'gaming',
    viewBox: '0 0 32 32',
    path: '<path d="M4 16 A 12 12 0 0 1 28 16" fill="none" stroke-linecap="round" /><path d="M4 16 A 12 12 0 0 1 20 6" fill="none" stroke-width="2" stroke-linecap="round" />'
  },

  // ── CREATOR ASSETS ──
  {
    id: 'price-tag',
    name: 'Minimal Tag',
    category: 'creator',
    viewBox: '0 0 24 24',
    path: '<path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8c-.83 0-1.5-.67-1.5-1.5S4.67 5 5.5 5 7 5.67 7 6.5 6.33 8 5.5 8z" />'
  },
  {
    id: 'marker-underline',
    name: 'Marker Swoosh',
    category: 'creator',
    viewBox: '0 0 100 20',
    path: '<path d="M5 12 C 25 16, 65 6, 95 14 C 70 8, 30 18, 5 12" stroke-linecap="round" />'
  },
  {
    id: 'hand-drawn-arrow',
    name: 'Sketch Arrow',
    category: 'creator',
    viewBox: '0 0 32 32',
    path: '<path d="M4 16 C 12 15, 20 20, 26 14 M20 8 C 22 10, 26 14, 28 16 M20 22 C 22 20, 26 16, 28 16" fill="none" stroke-linecap="round" stroke-linejoin="round" />'
  },

  // ── BUSINESS & CHART GRAPHICS ──
  {
    id: 'mini-graph',
    name: 'Stat Vector Line',
    category: 'business',
    viewBox: '0 0 48 24',
    path: '<path d="M4 20 L12 14 L20 18 L32 8 L44 12" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /><circle cx="32" cy="8" r="2.5" />'
  },
  {
    id: 'progress-ring',
    name: 'Infographic Loop',
    category: 'business',
    viewBox: '0 0 32 32',
    path: '<circle cx="16" cy="16" r="12" fill="none" opacity="0.15" /><path d="M16 4 A 12 12 0 1 1 6 22" fill="none" stroke-linecap="round" />'
  },
  {
    id: 'timeline-node',
    name: 'Timeline Node',
    category: 'business',
    viewBox: '0 0 48 16',
    path: '<line x1="2" y1="8" x2="46" y2="8" fill="none" /><circle cx="16" cy="8" r="4" /><circle cx="32" cy="8" r="2.5" />'
  }
];
