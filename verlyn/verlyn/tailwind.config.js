/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Verlyn Design Tokens
        verlyn: {
          violet: '#6C63FF',
          'violet-light': '#8B85FF',
          'violet-dark': '#4D45CC',
          cyan: '#00D4FF',
          'cyan-dark': '#00A8CC',
          pink: '#FF63A5',
          gold: '#FFD700',
          green: '#00E5A0',
          red: '#FF4B6B',
          orange: '#FF8C42',
        },
        // Themes
        surface: {
          DEFAULT: '#0D0D1A',
          elevated: '#131325',
          card: '#16162E',
          hover: '#1C1C38',
          border: 'rgba(255,255,255,0.06)',
        },
        // Light theme
        light: {
          bg: '#F8F8FF',
          surface: '#FFFFFF',
          card: '#F0F0FF',
          border: 'rgba(0,0,0,0.08)',
          text: '#1A1A2E',
        },
      },
      backgroundImage: {
        'verlyn-gradient': 'linear-gradient(135deg, #6C63FF 0%, #00D4FF 100%)',
        'verlyn-radial': 'radial-gradient(ellipse at top, #1a1040 0%, #0D0D1A 70%)',
        'card-glow': 'radial-gradient(ellipse at top left, rgba(108,99,255,0.12) 0%, transparent 60%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'verlyn': '0 0 40px rgba(108,99,255,0.15), 0 4px 24px rgba(0,0,0,0.4)',
        'verlyn-sm': '0 0 20px rgba(108,99,255,0.1), 0 2px 12px rgba(0,0,0,0.3)',
        'glow-violet': '0 0 30px rgba(108,99,255,0.4)',
        'glow-cyan': '0 0 30px rgba(0,212,255,0.3)',
        'card': '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 6s linear infinite',
        'bounce-soft': 'bounceSoft 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(108,99,255,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(108,99,255,0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
