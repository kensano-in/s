export interface StickerDefinition {
  id: string;
  packId: string;
  name: string;
  type: 'svg' | 'webp' | 'gif' | 'lottie';
  value: string; // URL link or SVG element path
  animated: boolean;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  category: 'trending' | 'new' | 'premium' | 'free' | 'creator';
  artist: string;
  isVerifiedArtist: boolean;
  price: string;
  description: string;
  stickers: StickerDefinition[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'cyber-pack',
    name: 'Cyberpunk Neon',
    icon: '⚡',
    category: 'trending',
    artist: 'HoloBlade Studio',
    isVerifiedArtist: true,
    price: 'Free',
    description: 'Neon signs, glitch assets, and interface targets for dark creators.',
    stickers: [
      { id: 'cy-1', packId: 'cyber-pack', name: 'Glitch Skull', type: 'webp', value: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 'cy-2', packId: 'cyber-pack', name: 'HUD Ring', type: 'webp', value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 'cy-3', packId: 'cyber-pack', name: 'Zero Day Alert', type: 'gif', value: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h1ZXU2eWZsa2dybzY2dHhrZ2M3am4ycWRmOGZ6ZXpsczV5NW0waiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7qE1YN7aBOFPRw8E/giphy.gif', animated: true }
    ]
  },
  {
    id: 'meme-pack',
    name: 'Internet Legends',
    icon: '🐸',
    category: 'trending',
    artist: 'DankLord V',
    isVerifiedArtist: true,
    price: 'Free',
    description: 'Essential internet reaction templates and viral vector faces.',
    stickers: [
      { id: 'me-1', packId: 'meme-pack', name: 'Success Kid', type: 'webp', value: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 'me-2', packId: 'meme-pack', name: 'Thug Glasses', type: 'webp', value: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 'me-3', packId: 'meme-pack', name: 'Confused Cat', type: 'gif', value: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOWlzd3dyMmhyazRvd3hhdDR3NnF4czkzdmszdW94ZTFtNm96OWk3OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/Vp3ftHKfKpASA/giphy.gif', animated: true }
    ]
  },
  {
    id: 'lottie-pack',
    name: 'Lottie Animations',
    icon: '🎬',
    category: 'premium',
    artist: 'LottieFiles Official',
    isVerifiedArtist: true,
    price: '$1.99',
    description: 'High-performance interactive Lottie animations scaling up to 120FPS.',
    stickers: [
      { id: 'lo-1', packId: 'lottie-pack', name: 'Floating Rocket', type: 'lottie', value: 'https://assets5.lottiefiles.com/packages/lf20_xl3srfal.json', animated: true },
      { id: 'lo-2', packId: 'lottie-pack', name: 'Particle Pulse', type: 'lottie', value: 'https://assets9.lottiefiles.com/packages/lf20_49rdyysj.json', animated: true },
      { id: 'lo-3', packId: 'lottie-pack', name: 'Confetti Explosion', type: 'lottie', value: 'https://assets1.lottiefiles.com/packages/lf20_k9w243tt.json', animated: true }
    ]
  },
  {
    id: 'developer-pack',
    name: 'Commit Log',
    icon: '💻',
    category: 'creator',
    artist: 'GitMaster General',
    isVerifiedArtist: false,
    price: 'Free',
    description: 'Git commits, console logs, merge requests, and debug badges.',
    stickers: [
      { id: 'de-1', packId: 'developer-pack', name: 'Git Commit Badge', type: 'webp', value: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 'de-2', packId: 'developer-pack', name: 'Bugs Bunny', type: 'webp', value: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=100&auto=format&fit=crop&q=60', animated: false }
    ]
  },
  {
    id: 'retro-pack',
    name: 'Vaporwave 80s',
    icon: '🌴',
    category: 'new',
    artist: 'GridCrawler',
    isVerifiedArtist: true,
    price: 'Free',
    description: 'Grid suns, VHS static overlays, and 16-bit retro icons.',
    stickers: [
      { id: 're-1', packId: 'retro-pack', name: 'Grid Sun', type: 'webp', value: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=100&auto=format&fit=crop&q=60', animated: false },
      { id: 're-2', packId: 'retro-pack', name: 'VHS Static', type: 'webp', value: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=100&auto=format&fit=crop&q=60', animated: false }
    ]
  },
  {
    id: 'cute-pack',
    name: 'Kawaii Doodles',
    icon: '🧸',
    category: 'free',
    artist: 'Sakura Designs',
    isVerifiedArtist: true,
    price: 'Free',
    description: 'Chibi kittens, sweet treats, and colorful sparkles.',
    stickers: [
      { id: 'cu-1', packId: 'cute-pack', name: 'Sparkles Duo', type: 'webp', value: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=100&auto=format&fit=crop&q=60', animated: false }
    ]
  }
];
