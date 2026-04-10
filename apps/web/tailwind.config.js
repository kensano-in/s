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
        // Ethereal Archive / Obsidian
        background: '#131315',
        surface: {
          lowest: '#0E0E10',
          low: '#1C1B1E',
          DEFAULT: '#201F22',
          high: '#2A2A2C',
          highest: '#353437',
        },
        primary: {
          DEFAULT: '#6200EE',
          light: '#D0BCFF',
          dark: '#622CCC',
        },
        secondary: {
          DEFAULT: '#03B5D3',
          light: '#4CD7F6',
          dark: '#00424E',
        },
        'on-surface': '#E5E1E4',
        'on-surface-variant': '#CBC3D9',
        outline: {
          DEFAULT: '#948DA2',
          variant: '#494456',
        },
        'v-cyan': 'var(--v-cyan)',
        'v-violet': 'var(--v-violet)',
        'v-emerald': 'var(--v-emerald)',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.2)',
        'out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        'micro': '100ms',
        'normal': '190ms',
        'page': '280ms',
      },
      boxShadow: {
        'ambient': '0 32px 64px -12px rgba(0, 0, 0, 0.5)',
        'glow': '0 0 20px 0 rgba(255,255,255,0.05)',
        'glow-primary': '0 0 20px 0 rgba(59,130,246,0.2)',
        'inner-light': 'inset 0 1px 1px rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.0) 100%)',
        'primary-gradient': 'linear-gradient(135deg, #1f2937 0%, #050505 100%)',
      }
    },
  },
  plugins: [],
}
