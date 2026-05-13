/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg:           '#0a0a0a',
        surface:      '#111111',
        'surface-2':  '#161616',
        card:         '#1a1a1a',
        'card-hover': '#1f1f1f',
        border:       '#242424',
        'border-2':   '#2e2e2e',
        accent:       '#f5c518',
        'accent-hover': '#e6b800',
        'accent-dim': 'rgba(245,197,24,0.12)',
        muted:        '#71717a',
        secondary:    '#a1a1aa',
        green:        '#22c55e',
        red:          '#ef4444',
        blue:         '#3b82f6',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'modal': '0 25px 50px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
}
