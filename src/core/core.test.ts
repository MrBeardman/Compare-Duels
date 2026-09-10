import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { accuracy, band, roundPoints, percentOff } from './scoring'
import { mulberry32, hashSeed } from './rng'
import { createRun, startRound, submitGuess, nextRound, averageAccuracy, ghostOf } from './run'
import { maxTierFor, ratioWindow, pickPair } from './pairs'
import type { SizeObject, RunConfig } from './types'
import { DEFAULT_CONFIG } from './types'

const pool: SizeObject[] = JSON.parse(fs.readFileSync('public/data/pool.json', 'utf8'))

describe('scoring', () => {
  it('matches the design numbers', () => {
    expect(accuracy(5, 5)).toBe(100)
    expect(accuracy(4.7, 5)).toBe(91)       // "6% off" ≈ 92 in the mock; 91 with exact log
    expect(accuracy(5.3, 5)).toBe(92)
    expect(accuracy(7.05, 5)).toBe(50)      // 41% off (log2(1.41)=0.496)
    expect(accuracy(10, 5)).toBe(0)         // double = 0
    expect(accuracy(2.5, 5)).toBe(0)        // half = 0
    expect(accuracy(20, 5)).toBe(0)
  })
  it('is symmetric on a log scale', () => {
    expect(accuracy(6, 5)).toBe(accuracy(5 / 1.2, 5))
  })
  it('bands', () => {
    expect(band(100)).toBe('bullseye'); expect(band(95)).toBe('bullseye')
    expect(band(94)).toBe('close'); expect(band(80)).toBe('close')
    expect(band(79)).toBe('notbad'); expect(band(50)).toBe('notbad')
    expect(band(49)).toBe('wayoff'); expect(band(1)).toBe('wayoff')
    expect(band(0)).toBe('miss')
  })
  it('points grow with round index and streak', () => {
    expect(roundPoints(92, 0, 0)).toBe(736)
    expect(roundPoints(92, 3, 0)).toBe(828)
    expect(roundPoints(92, 3, 4)).toBe(994)
    expect(roundPoints(0, 10, 10)).toBe(0)
  })
  it('percentOff is signed', () => {
    expect(percentOff(4.7, 5)).toBe(-6)
    expect(percentOff(7.05, 5)).toBe(41)
  })
})

describe('rng', () => {
  it('is deterministic', () => {
    const a = mulberry32(42), b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })
  it('hashSeed is stable', () => {
    expect(hashSeed('2026-09-11')).toBe(hashSeed('2026-09-11'))
    expect(hashSeed('2026-09-11')).not.toBe(hashSeed('2026-09-12'))
  })
})

describe('pairs', () => {
  const cfg: RunConfig = { ...DEFAULT_CONFIG, seed: 1, mode: 'endless', category: 'all' }
  it('escalates tier and ratio window', () => {
    expect(maxTierFor(0)).toBe(1)
    expect(maxTierFor(15)).toBe(4)
    const [lo0, hi0] = ratioWindow(0, cfg)
    const [lo15, hi15] = ratioWindow(15, cfg)
    expect(lo0).toBeCloseTo(0.5); expect(hi0).toBeCloseTo(2)
    expect(lo15).toBeCloseTo(cfg.minRatio); expect(hi15).toBeCloseTo(cfg.maxRatio)
  })
  it('always yields pairs inside the reserved window and never starts near the answer', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed)
      const used = new Set<string>()
      for (let r = 0; r < 20; r++) {
        const p = pickPair({ pool, roundIndex: r, cfg, rng, used })
        used.add(p.reference.id); used.add(p.target.id)
        expect(p.ratio).toBeGreaterThanOrEqual(cfg.minRatio)
        expect(p.ratio).toBeLessThanOrEqual(cfg.maxRatio)
        expect(p.reference.tier).toBeLessThanOrEqual(2)
        expect(p.target.tier).toBeLessThanOrEqual(maxTierFor(r))
        expect(Math.abs(Math.log2(p.startRatio / p.ratio))).toBeGreaterThanOrEqual(0.2)
        expect(p.reference.id).not.toBe(p.target.id)
      }
    }
  })
  it('works for every single category', () => {
    for (const category of ['animals', 'vehicles', 'landmarks', 'space', 'objects'] as const) {
      const c = { ...cfg, category }
      const rng = mulberry32(7)
      const used = new Set<string>()
      for (let r = 0; r < 8; r++) {
        const p = pickPair({ pool, roundIndex: r, cfg: c, rng, used })
        expect(p.reference.category).toBe(category)
      }
    }
  })
})

describe('run', () => {
  it('plays a deterministic run and ends after three misses', () => {
    let run = startRound(createRun(pool, 123, 'endless'))
    expect(run.state.phase).toBe('round')
    const first = run.state.current!.target.id
    // perfect guess
    run = submitGuess(run, run.state.current!.ratio)
    expect(run.state.results[0].accuracy).toBe(100)
    expect(run.state.phase).toBe('reveal')
    run = nextRound(run)
    expect(run.state.roundIndex).toBe(1)
    // three misses
    for (let i = 0; i < 3; i++) {
      run = submitGuess(run, run.state.current!.ratio * 4)
      if (run.state.phase === 'reveal') run = nextRound(run)
    }
    expect(run.state.phase).toBe('over')
    expect(run.state.livesLeft).toBe(0)
    expect(run.state.results.length).toBe(4)
    expect(averageAccuracy(run.state.results)).toBe(25)
    // same seed → same first target
    const again = startRound(createRun(pool, 123, 'endless'))
    expect(again.state.current!.target.id).toBe(first)
  })
  it('ghost is tiny', () => {
    let run = startRound(createRun(pool, 9, 'endless'))
    for (let i = 0; i < 5; i++) { run = submitGuess(run, run.state.current!.ratio * 1.1); run = nextRound(run) }
    const g = ghostOf(run)
    expect(g.guesses.length).toBe(5)
    expect(JSON.stringify(g).length).toBeLessThan(160)
  })
  it('timeout still scores the current size', () => {
    let run = startRound(createRun(pool, 5, 'endless'))
    run = submitGuess(run, run.state.current!.startRatio, true)
    expect(run.state.results[0].timedOut).toBe(true)
  })
})
