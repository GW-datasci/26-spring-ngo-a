/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg: '#0b0f1a',
        surface: '#131929',
        'surface-2': '#1a2438',
        border: { DEFAULT: '#1e2d45', bright: '#2d4060' },
        ink: { DEFAULT: '#e8eef7', muted: '#6b7fa3', faint: '#3d5070' },
        dem: '#4a8ff5',
        rep: '#e8433a',
        ind: '#a78bfa',
        gold: '#f0b429',
      },
    },
  },
  plugins: [],
}
