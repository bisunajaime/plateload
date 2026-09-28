import { useState } from 'react'
import { fmt } from '../lib/format'

/**
 * A scoreboard number that rolls, odometer style: only the digits that change
 * move, blurred while they travel. Going up, the old digit leaves upward and
 * the new one rises in from below; going down, the reverse.
 */
export function RollingNumber({ value, className = '' }: { value: number; className?: string }) {
  // The previous value and the direction, derived during render — each change
  // gets a new generation so its digits remount and the animation restarts,
  // even mid-roll when the scroll is quick.
  const [roll, setRoll] = useState({ now: value, before: value, dir: 1, gen: 0 })
  if (value !== roll.now) {
    setRoll({ now: value, before: roll.now, dir: value > roll.now ? 1 : -1, gen: roll.gen + 1 })
  }

  const next = fmt(roll.now)
  const prev = fmt(roll.before)
  const [a, b] = alignDigits(next, prev)
  const len = a.length
  const way = roll.dir > 0 ? 'up' : 'down'

  return (
    <span className={`roll ${className}`}>
      <span className="sr-only">{next}</span>
      <span aria-hidden="true" className="roll-digits">
        {Array.from(a, (digit, i) => {
          const was = b[i]
          if (roll.gen === 0 || digit === was) {
            return digit === ' ' ? null : (
              <span key={`s${i}`} className="roll-slot">
                {digit}
              </span>
            )
          }
          // The ones digit moves first and the rest follow, like an odometer.
          const delay = { animationDelay: `${(len - 1 - i) * 45}ms` }
          return (
            <span key={`r${i}-${roll.gen}`} className="roll-slot">
              {digit !== ' ' && (
                <span className={`roll-in ${way}`} style={delay}>
                  {digit}
                </span>
              )}
              {was !== ' ' && (
                <span className={`roll-out ${way}`} style={delay}>
                  {was}
                </span>
              )}
            </span>
          )
        })}
      </span>
    </span>
  )
}

/**
 * Line two numbers up on the decimal point, padding with spaces, so each
 * position compares like with like: 142.5 → 145 rolls the tens and ones, not
 * every digit shifted one place over.
 */
function alignDigits(x: string, y: string): [string, string] {
  const [xi, xf = ''] = x.split('.')
  const [yi, yf = ''] = y.split('.')
  const intLen = Math.max(xi.length, yi.length)
  const fracLen = Math.max(xf.length, yf.length)
  const shape = (i: string, f: string, hasPoint: boolean) =>
    i.padStart(intLen, ' ') + (fracLen ? (hasPoint ? '.' : ' ') + f.padEnd(fracLen, ' ') : '')
  return [shape(xi, xf, xf.length > 0), shape(yi, yf, yf.length > 0)]
}
