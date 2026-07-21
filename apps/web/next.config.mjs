// Validate required environment variables on startup/build
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'ADMIN_PASSPHRASE',
  'INVITE_JWT_SECRET',
  'INVITE_SCRYPT_SALT',
  'STEP_TOKEN_SECRET',
  'HCAPTCHA_SECRET_KEY'
];

const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(
    `\n\n[WARNING] Missing environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nThis is a warning during config evaluation. Runtime validation will enforce these.\n`
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  compiler: {
    // Strip all console.log statements in production builds to reduce runtime overhead
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      'three',
      '@react-three/drei',
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Disable client-side source maps in PRODUCTION builds only so source code is never exposed in browser,
    // while keeping fast incremental HMR evaluation active during development (dev mode).
    if (!dev && !isServer) {
      config.devtool = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content-Security-Policy (CSP)
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hcaptcha.com https://*.hcaptcha.com https://apis.google.com https://accounts.google.com https://www.dropbox.com https://cdnjs.cloudflare.com https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com; connect-src 'self' http: https: ws: wss:; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' blob: data: http: https:; frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://accounts.google.com https://docs.google.com;",
          },
          // Blocks browser-based display capture / screen recording API
          {
            key: 'Permissions-Policy',
            value: 'display-capture=()',
          },
          // Prevents MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevents clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Referrer Policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS (Strict-Transport-Security)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // X-DNS-Prefetch-Control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/(.*)\\.(png|jpg|jpeg|gif|svg|webp|ico|woff2)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
// Trigger build with fully rotated Supabase API keys
