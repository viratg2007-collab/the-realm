import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#07060f',
        dark: '#0d0b1a',
        surface: '#161328',
        'surface-2': '#1e1b35',
        gold: '#d4a843',
        'gold-dim': '#8a6c28',
        crimson: '#c01c3c',
        royal: '#2044a0',
        'text-base': '#e8dfc8',
        'text-muted': '#9a917a',
        parchment: '#f5f0e8',
        ink: '#1a1208',
      },
      fontFamily: {
        serif: ['Cinzel', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(212,168,67,0.25)',
        'gold-lg': '0 0 40px rgba(212,168,67,0.35)',
        crimson: '0 0 20px rgba(192,28,60,0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} satisfies Config;
