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
        on: {
          surface: '#E5E1E4',
          surfaceVariant: '#CBC3D9',
        },
        outline: {
          DEFAULT: '#948DA2',
          variant: '#494456',
        }
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ambient': '0 32px 64px -12px rgba(229, 225, 228, 0.06)', // Subliminal tonal shadow
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(208, 188, 255, 0.1) 0%, rgba(98, 44, 204, 0.1) 100%)',
        'primary-gradient': 'linear-gradient(135deg, #D0BCFF 0%, #622CCC 100%)',
      }
    },
  },
  plugins: [],
}
