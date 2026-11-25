/**
 * Earcons, synthesised with Web Audio: no files to download, nothing to
 * preload over the network, and every sound is a few milliseconds of maths.
 *
 * Off by default. Nothing plays until the person turns sound on, and the
 * audio context is only ever created from inside a tap, so a page load is
 * always silent. Where Safari supports it the audio session is "ambient",
 * which respects the iPhone's silent switch and mixes with their music.
 */

export type Sound =
  /** A key or a step: a dry, short click. */
  | 'click'
  /** A plate seating on the sleeve — a rubber thunk with a touch of steel. */
  | 'seat'
  /** A plate coming off: quieter than going on. */
  | 'unseat'
  /** Saved, copied, applied. */
  | 'chime'
  /** Can't be loaded. */
  | 'thud'
  /** A milestone. */
  | 'fanfare'

let enabled = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
const last: Partial<Record<Sound, number>> = {}

/** Two of the same sound closer than this are one sound: a held stepper must not buzz. */
const MIN_GAP_MS = 32

export const setSoundEnabled = (on: boolean) => {
  enabled = on
  if (!on && ctx && ctx.state === 'running') void ctx.suspend()
}
export const soundEnabled = () => enabled

type AudioCtor = typeof AudioContext
function context(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null
  if (!ctx) {
    const AC: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
    if (!AC) return null
    try {
      // Safari 17+: obey the silent switch and don't duck other audio.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'ambient'
    } catch {
      /* not supported — fine */
    }
    ctx = new AC({ latencyHint: 'interactive' })
    master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
    // One shared buffer of white noise, made once: the raw material for every transient.
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(c: AudioContext, at: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', endFreq?: number) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, at + dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(master!)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

function burst(c: AudioContext, at: number, dur: number, gain: number, freq: number, filter: BiquadFilterType = 'bandpass', q = 1) {
  const src = c.createBufferSource()
  src.buffer = noise
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(f).connect(g).connect(master!)
  src.start(at, Math.random() * 0.3)
  src.stop(at + dur + 0.02)
}

export interface PlayOptions {
  /** Start this many ms from now — for sounds that land with an animation. */
  delay?: number
  /** 0 (smallest change plate) … 1 (a full-size bumper): bigger plates sound lower. */
  size?: number
}

export function play(sound: Sound, { delay = 0, size = 0.7 }: PlayOptions = {}) {
  const c = context()
  if (!c || !master) return
  const now = performance.now() + delay
  if (now - (last[sound] ?? -Infinity) < MIN_GAP_MS) return
  last[sound] = now
  const at = c.currentTime + delay / 1000 + 0.005
  const s = Math.min(1, Math.max(0, size))
  switch (sound) {
    case 'click':
      burst(c, at, 0.018, 0.3, 3600, 'bandpass', 1.4)
      tone(c, at, 2300, 0.022, 0.035, 'triangle')
      break
    case 'seat':
      tone(c, at, 150 - s * 55, 0.16, 0.5, 'sine', (150 - s * 55) * 0.62)
      burst(c, at, 0.06, 0.32, 1100 - s * 400, 'lowpass')
      tone(c, at + 0.004, 1700 + (1 - s) * 900, 0.09, 0.035, 'triangle')
      break
    case 'unseat':
      burst(c, at, 0.045, 0.14, 700, 'lowpass')
      tone(c, at, 220, 0.06, 0.08, 'sine', 160)
      break
    case 'chime':
      tone(c, at, 784, 0.14, 0.11)
      tone(c, at + 0.075, 1175, 0.26, 0.09)
      break
    case 'thud':
      tone(c, at, 115, 0.22, 0.42, 'sine', 62)
      burst(c, at, 0.08, 0.22, 320, 'lowpass')
      break
    case 'fanfare':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, at + i * 0.085, f, i === 3 ? 0.5 : 0.22, 0.085, 'triangle'))
      break
  }
}

/** Warm the context up from inside a tap, so the first real sound isn't late. */
export function primeSound() {
  context()
}
