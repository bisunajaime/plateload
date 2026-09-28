import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarbellSVG } from '../components/BarbellSVG'
import type { Brand, PlateDef } from '../data/plates'
import { COLLARS, IWF } from '../data/plates'
import { snapToLoadable, solve } from '../lib/combinations'
import { fmt } from '../lib/format'
import { applyBrand, buildSolveInput, defaultSettings, resolveLoadout } from '../lib/settings'
import { prefersReducedMotion } from '../hooks/useSettings'
import { LoadingBay, RollingPlate, ScrollMarquee } from './scroll'
import { useScrollVar } from './useScroll'

const APP_URL = '/app/'

/** Weights a meet would call — one tap each in the demo. */
const ATTEMPTS: Record<Brand, number[]> = {
  eleiko: [60, 100, 142.5, 180],
  metcon: [135, 225, 315, 405],
}
const RANGE: Record<Brand, { max: number; step: number }> = {
  eleiko: { max: 250, step: 2.5 },
  metcon: { max: 550, step: 5 },
}

/* ------------------------------------------------------------------ reveal */

/** Adds `is-in` once the element scrolls into view. CSS does the rest. */
function useReveal<T extends Element>() {
  const ref = useRef<T>(null)
  // Without an observer there is nothing to wait for — show it straight away.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView])
  return [ref, inView] as const
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, inView] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal ${inView ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------- demo */

/** The app reads its weight and brand from the URL, so "load it" opens on that exact bar. */
const appLink = (brand: Brand, target: number) =>
  `${APP_URL}?${new URLSearchParams({ w: String(target), brand }).toString()}`

function Demo() {
  const [brand, setBrand] = useState<Brand>('eleiko')
  const [target, setTarget] = useState(142.5)
  const animate = !prefersReducedMotion()

  const settings = useMemo(() => ({ ...applyBrand(defaultSettings(), brand), target, closeUp: false }), [brand, target])
  const loadout = useMemo(() => resolveLoadout(settings), [settings])
  const input = useMemo(() => buildSolveInput(settings), [settings])
  const result = useMemo(() => solve(input), [input])
  const combo = result.ok ? result.combos[0] : null
  const byId = useMemo(() => new Map<string, PlateDef>(loadout.plates.map((p) => [p.id, p])), [loadout.plates])

  const unit = settings.unit
  const { max, step } = RANGE[brand]
  const min = loadout.base
  const set = (w: number) => setTarget(snapToLoadable(input, Math.min(max, Math.max(min, w))))

  const switchBrand = (b: Brand) => {
    if (b === brand) return
    setBrand(b)
    // Same real load, the other plate system — then snapped to what that gym can build.
    const next = applyBrand(settings, b)
    setTarget(snapToLoadable(buildSolveInput(next), next.target))
  }

  const pctOfRange = ((target - min) / (max - min)) * 100

  return (
    <div className="demo relative">
      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 sm:px-5">
          <span className="live-dot font-cond text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            On the bar
          </span>
          <div className="brand-switch" role="group" aria-label="Plate system">
            {(['eleiko', 'metcon'] as Brand[]).map((b) => (
              <button key={b} type="button" aria-pressed={brand === b} onClick={() => switchBrand(b)}>
                {b === 'eleiko' ? 'Eleiko · kg' : 'Metcon · lb'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 px-4 pb-4 pt-3 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-6 sm:px-5">
          <div className="flex items-baseline gap-2" aria-live="polite">
            <span className="font-cond text-[76px] font-extrabold leading-[0.85] tabular-nums text-white sm:text-[96px]">
              {fmt(target)}
            </span>
            <span className="font-cond text-2xl font-semibold uppercase text-white/50">{unit}</span>
          </div>

          <div className="min-w-0">
            <div className="font-cond text-[13px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Each side{combo ? ` · ${fmt(combo.perSide)} ${unit}` : ''}
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Plates each side, heaviest first">
              {combo && combo.plates.length > 0 ? (
                combo.plates.map((p) => {
                  const def = byId.get(p.id)
                  return (
                    <li
                      key={p.id}
                      className="plate-chip"
                      style={{ background: def?.color ?? '#333', color: def?.textColor ?? '#fff' }}
                    >
                      {p.count > 1 && <span className="opacity-75">{p.count}×</span>}
                      {fmt(p.weight)}
                    </li>
                  )
                })
              ) : (
                <li className="plate-chip bg-white/10 text-white/70">Bar only</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* The bar itself — the app's own renderer */}
      <div className="platform">
        <div className="flex justify-center px-2 pt-4 sm:px-6">
          <BarbellSVG
            bar={loadout.bar}
            plates={loadout.plates}
            combo={combo}
            collarKind={settings.collars ? settings.collarKind : null}
            collarWidthMm={COLLARS[settings.collarKind].widthMm}
            unit={unit}
            animate={animate}
            className="block h-auto w-full max-w-[640px]"
          />
        </div>

        {/* Controls */}
        <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-5">
          <div className="flex items-center gap-3">
            <button type="button" className="step-btn" onClick={() => set(target - step)} aria-label={`Minus ${step} ${unit}`}>
              −
            </button>
            <label className="sr-only" htmlFor="demo-weight">
              Target weight in {unit}
            </label>
            <input
              id="demo-weight"
              type="range"
              className="knurl"
              min={min}
              max={max}
              step={step}
              value={target}
              style={{ ['--fill' as string]: `${pctOfRange}%` }}
              onChange={(e) => set(Number(e.target.value))}
            />
            <button type="button" className="step-btn" onClick={() => set(target + step)} aria-label={`Plus ${step} ${unit}`}>
              +
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden font-cond text-[13px] font-semibold uppercase tracking-[0.22em] text-white/45 min-[420px]:inline">Call it</span>
            {ATTEMPTS[brand].map((w) => (
              <button key={w} type="button" className="attempt-chip" aria-pressed={w === target} onClick={() => set(w)}>
                {fmt(w)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <a href={appLink(brand, target)} className="cta-primary mt-4 w-full sm:w-auto">
        Load {fmt(target)} {unit} in the app
        <Arrow />
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/** Three referee lights — white is a good lift. They come on as you reach them. */
function JudgeLights({ on }: { on: boolean }) {
  return (
    <span className="flex gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`judge ${on ? 'is-on' : ''}`} style={{ transitionDelay: `${250 + i * 160}ms` }} />
      ))}
    </span>
  )
}

function Attempt({ n, title, children, delay }: { n: string; title: string; children: ReactNode; delay: number }) {
  const [ref, inView] = useReveal<HTMLLIElement>()
  return (
    <li ref={ref} className={`attempt reveal ${inView ? 'is-in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="font-cond text-sm font-semibold uppercase tracking-[0.22em] text-white/50">{n} attempt</span>
        <JudgeLights on={inView} />
      </div>
      <h3 className="mt-6 font-display text-2xl font-bold leading-tight text-white sm:text-[28px]">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-white/65">{children}</p>
    </li>
  )
}

const FEATURES: { color: string; title: string; body: string }[] = [
  {
    color: IWF.red,
    title: 'Only the plates you own',
    body: 'Count your gym’s plates once. PlateLoad never suggests a pair of 25s you don’t have.',
  },
  {
    color: IWF.blue,
    title: 'Every way, ranked',
    body: 'Fewest plates, competition order, fewest change plates — every symmetric load, best first.',
  },
  {
    color: IWF.yellow,
    title: 'Warm-ups that load',
    body: 'Ramp to your work set with every step snapped to a weight your plates can actually build.',
  },
  {
    color: IWF.green,
    title: 'Nearest loadable',
    body: 'Asked for 101? It tells you the closest weights either side and loads them in one tap.',
  },
  {
    color: IWF.white,
    title: 'Drawn to scale',
    body: 'Real Eleiko and Metcon geometry, so the bar on screen is the bar in front of you — sleeve room included.',
  },
  {
    color: '#8A9098',
    title: 'Works in a basement',
    body: 'Installs to your home screen and runs offline. No account, no backend, nothing to sign into.',
  },
]

/* -------------------------------------------------------------------- page */

export function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollVar(rootRef)

  return (
    <div ref={rootRef} className="landing min-h-dvh overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-black">
        Skip to content
      </a>

      {/* ---------------------------------------------------------- nav */}
      <header className="nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white">
            <span className="stripe-mark" aria-hidden="true" />
            PlateLoad
          </a>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Page">
            <a href="#how" className="nav-link hidden sm:inline-flex">
              How it works
            </a>
            <a href="#features" className="nav-link hidden sm:inline-flex">
              Features
            </a>
            <a href={APP_URL} className="cta-small">
              Open the app
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* --------------------------------------------------------- hero */}
        <section id="top" className="hero">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-center lg:gap-14 lg:pb-24">
            <div className="hero-copy">
              <p className="eyebrow">Barbell plate calculator</p>
              <h1 className="mt-4 font-display text-[44px] font-extrabold leading-[0.95] tracking-tight text-white sm:text-[64px] lg:text-[76px]">
                Skip the
                <br />
                plate <span className="chalk-underline">math.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
                Call a weight. PlateLoad finds every way to load it with the plates your gym actually owns, and
                draws the bar so you can load it at a glance — between sets, rest timer running.
              </p>
              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 font-cond text-[15px] font-semibold uppercase tracking-[0.16em] text-white/55">
                <li>Free</li>
                <li aria-hidden="true" className="text-white/25">/</li>
                <li>No account</li>
                <li aria-hidden="true" className="text-white/25">/</li>
                <li>Works offline</li>
              </ul>
            </div>

            <Demo />
          </div>
        </section>

        {/* ---------------------------------------------- plate marquee */}
        <ScrollMarquee />

        {/* ------------------------------------------------- loading bay */}
        <LoadingBay />

        {/* ------------------------------------------------- how it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 max-w-2xl font-display text-[34px] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl">
              Three attempts. <span className="text-white/40">All good lifts.</span>
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            <Attempt n="1st" title="Call your weight" delay={0}>
              Type it, slide it, or nudge it in plate-sized steps. PlateLoad takes off the bar and collars and
              works out what’s left for each side.
            </Attempt>
            <Attempt n="2nd" title="See every way to load it" delay={120}>
              Every symmetric combination your plates can make, ranked — the recommended load first, with
              competition order and fewest-plates a tap away.
            </Attempt>
            <Attempt n="3rd" title="Load it. Lift it." delay={240}>
              The bar is drawn plate for plate, heaviest in, so you match what’s on screen and get back under
              the bar.
            </Attempt>
          </ol>
        </section>

        {/* ----------------------------------------------------- features */}
        <section id="features" className="features relative scroll-mt-20">
          <RollingPlate weight="25" color={IWF.red} size={340} className="-right-24 top-16 sm:right-[-60px]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-end">
              <div>
                <p className="eyebrow">Built for the platform</p>
                <h2 className="mt-4 max-w-md font-display text-[34px] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl">
                  Knows your gym, not a textbook.
                </h2>
              </div>
              <p className="max-w-lg text-lg leading-relaxed text-white/65 lg:justify-self-end">
                Most calculators assume a perfect rack of plates. PlateLoad starts from what’s actually on your
                gym’s wall — and the bar, collars and sleeve length you’re really lifting with.
              </p>
            </Reveal>

            <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="feature">
                  <Reveal delay={(i % 3) * 90}>
                    <span className="feature-plate" style={{ ['--plate' as string]: f.color }} aria-hidden="true" />
                    <h3 className="mt-5 font-display text-lg font-bold text-white">{f.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/60">{f.body}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------- final CTA */}
        <section className="final">
          <RollingPlate weight="20" color={IWF.blue} size={260} direction={-1} className="-left-20 bottom-6" />
          <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <Reveal>
              <p className="eyebrow justify-center">Your next set is waiting</p>
              <h2 className="mx-auto mt-5 max-w-3xl font-display text-[40px] font-extrabold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Chalk up.
                <br />
                <span className="chalk-underline">Load up.</span>
              </h2>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={APP_URL} className="cta-primary">
                  Open PlateLoad
                  <Arrow />
                </a>
                <span className="text-sm text-white/50">Then Share → Add to Home Screen to keep it offline.</span>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2.5 font-display font-bold text-white/80">
            <span className="stripe-mark" aria-hidden="true" />
            PlateLoad
          </span>
          <span>Plate geometry from Eleiko competition specs and the Metcon Group PH bumper range.</span>
        </div>
      </footer>
    </div>
  )
}
