/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './app/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        steel: 'rgb(var(--steel) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
        flame: 'rgb(var(--flame) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['Unbounded', 'Inter var', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      spacing: { 18: '4.5rem' },
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
