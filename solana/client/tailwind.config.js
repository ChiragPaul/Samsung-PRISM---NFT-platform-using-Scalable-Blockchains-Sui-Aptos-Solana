/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#9945FF',
          50: '#f4ecff',
          100: '#e6d4ff',
          200: '#cba8ff',
          300: '#b07dff',
          400: '#9945FF',
          500: '#7d28e6',
          600: '#641eb8',
          700: '#4c168a',
          800: '#350f5e',
          900: '#1f0838',
        },
        accent: {
          DEFAULT: '#14F195',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(6%, -8%) scale(1.12)' },
          '66%': { transform: 'translate(-7%, 6%) scale(0.92)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        blob: 'blob 18s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
