import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#121826',
        surfaceLight: '#1E293B',
        accent: {
          netflix: '#E50914',
          disney: '#0063E5',
          spotify: '#1DB954',
          prime: '#00A8E1',
          hbo: '#9933FF',
          youtube: '#FF0000',
        },
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#1E1B4B',
        },
      },
      boxShadow: {
        glow: '0 0 25px -5px rgba(99, 102, 241, 0.4)',
        'glow-netflix': '0 0 20px -3px rgba(229, 9, 20, 0.35)',
        'glow-disney': '0 0 20px -3px rgba(0, 99, 229, 0.35)',
        'glow-spotify': '0 0 20px -3px rgba(29, 185, 84, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;

