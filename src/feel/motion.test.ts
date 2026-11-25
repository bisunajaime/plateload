/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { duration, ease, stagger } from './motion'

// Read from disk: Vitest hands CSS imports back empty.
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

const cssVar = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim()

describe('motion tokens', () => {
  it('CSS and TypeScript agree on every duration', () => {
    for (const [k, ms] of Object.entries(duration)) expect(cssVar(`dur-${k}`)).toBe(`${ms}ms`)
  })

  it('CSS and TypeScript agree on the curves', () => {
    expect(cssVar('ease-out')).toBe(ease.out)
    expect(cssVar('ease-in')).toBe(ease.in)
    expect(cssVar('ease-in-out')).toBe(ease.inOut)
    // The spring is only switched on where linear() is supported.
    expect(css).toContain(`--ease-seat: ${ease.seat};`)
  })

  it('CSS and TypeScript agree on the staggers', () => {
    expect(cssVar('stagger-plate')).toBe(`${stagger.plate}ms`)
    expect(cssVar('stagger-digit')).toBe(`${stagger.digit}ms`)
  })

  it('the seat spring starts at rest, overshoots a little, and lands exactly', () => {
    const pts = ease.seat.slice('linear('.length, -1).split(',').map(Number)
    expect(pts[0]).toBe(0)
    expect(pts.at(-1)).toBe(1)
    const peak = Math.max(...pts)
    expect(peak).toBeGreaterThan(1)
    // Heavy, not bouncy: under 5% overshoot.
    expect(peak).toBeLessThan(1.05)
  })

  it('nothing in the app hard-codes the old one-off curves', () => {
    expect(css).not.toMatch(/cubic-bezier\(0\.2,\s*0\.75/)
  })
})
