/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { walnut: '#4A2F1B', teak: '#8B5A2B', cream: '#F6EFE3', sawdust: '#E8DCC6', forest: '#2F5D3A', brass: '#C9993A', bark: '#2B1A0E', ember: '#1A110A' },
      fontFamily: { serif: ['Merriweather', 'Playfair Display', 'Georgia', 'serif'], sans: ['Inter', 'Noto Sans Tamil', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 2px 12px rgba(74,47,27,0.10)', lift: '0 8px 24px rgba(74,47,27,0.18)' },
    },
  },
  plugins: [],
};
