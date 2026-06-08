/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        bg:           'var(--c-bg)',
        surface:      'var(--c-surface)',
        'surface-2':  'var(--c-surface-2)',
        card:         'var(--c-card)',
        'card-hover': 'var(--c-card-hover)',
        border:       'var(--c-border)',
        'border-2':   'var(--c-border-2)',
        foreground:   'var(--c-fg)',
        accent:       '#f5c518',
        'accent-hover': '#e6b800',
        'accent-dim': 'rgba(245,197,24,0.12)',
        muted:        'var(--c-muted)',
        secondary:    'var(--c-secondary)',
        green:        '#22c55e',
        red:          '#ef4444',
        blue:         '#3b82f6',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
        'modal': '0 25px 50px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
