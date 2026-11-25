/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './app/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Seven sizes and no more: caption, small, body, title, heading, display —
    // the hero number sizes itself to its column.
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem' }],
      xl: ['1.75rem', { lineHeight: '2rem' }],
      '2xl': ['2.5rem', { lineHeight: '2.75rem' }],
      // The landing's headline sizes (Tailwind's own), used only there.
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
    },
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        edge: 'rgb(var(--edge) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
        steel: 'rgb(var(--steel) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
      },
      // The landing's type: Barlow to read, Barlow Condensed for numbers (a
      // scoreboard fits a big weight in a narrow column), Unbounded for the name.
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        cond: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Barlow', 'system-ui', 'sans-serif'],
      },
      // Motion tokens live in index.css (and src/feel/motion.ts); these just name them.
      transitionDuration: {
        DEFAULT: 'var(--dur-quick)',
        press: 'var(--dur-press)',
        quick: 'var(--dur-quick)',
        base: 'var(--dur-base)',
        settle: 'var(--dur-settle)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-out)',
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        seat: 'var(--ease-seat)',
      },
      // One press depth for small controls, a shallower one for wide ones.
      scale: { press: '0.96', 'press-wide': '0.985' },
    },
  },
  plugins: [],
}
