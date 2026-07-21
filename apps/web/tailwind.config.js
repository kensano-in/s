/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Forced dark mode logic or structural toggle
  theme: {
    extend: {
      colors: {
        // Professional Obsidian Palette — Deep Mineral Tones
        obsidian: {
          950: '#050508',
          900: '#07070A',
          800: '#0C0C10',
          700: '#141418',
          600: '#1F1F24',
          500: '#2E2E35',
        },
        // Refined Tech Accent — Muted for Professionalism
        'tech-blue': {
          DEFAULT: '#3B82F6',
          muted: 'rgba(59, 130, 246, 0.1)',
        },
        'v-cyan': 'var(--v-accent, #00D1FF)',
        'v-violet': 'var(--v-accent, #6C63FF)',
        background: 'hsl(var(--background))',
        surface: {
          lowest: '#050507',
          low: '#08080B',
          DEFAULT: 'hsl(var(--card))',
          high: '#15151A',
          highest: '#1F1F26',
          elevated: 'hsl(var(--card))',
          border: 'hsl(var(--border))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          blue: '#3B82F6',
          dark: '#2563EB',
        },
        'on-surface': 'hsl(var(--foreground))',
        'on-surface-variant': 'hsl(var(--muted-foreground))',
        outline: {
          DEFAULT: 'hsl(var(--border))',
          variant: 'rgba(255,255,255,0.03)',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      transitionTimingFunction: {
        'spring-weighted': 'var(--ease-spring)',
        'out-quint': 'var(--ease-out-smooth)',
      },
      transitionDuration: {
        'micro': 'var(--duration-micro)',
        'normal': 'var(--duration-primary)',
        'page': 'var(--duration-page)',
      },
      boxShadow: {
        'ambient': '0 32px 64px -12px rgba(0, 0, 0, 0.9)',
        'premium': '0 20px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        'lux-inner': 'inset 0 1px 1px rgba(255,255,255,0.05)',
        'soft-depth': '0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        'glass-highlight': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.0) 100%)',
        'surface-gradient': 'linear-gradient(180deg, rgba(25, 25, 28, 0.6) 0%, rgba(12, 12, 14, 0.6) 100%)',
      }
    },
  },
  plugins: [],
}
