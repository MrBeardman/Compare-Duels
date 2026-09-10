import type { Category, Pair, RunConfig, SizeObject } from './types'
import { difficulty } from './scoring'
import { rngLog, rngPick, type RNG } from './rng'

/** Highest tier allowed for the target at this point in the run: 1 early, 4 late. */
export function maxTierFor(roundIndex: number): 1 | 2 | 3 | 4 {
  const d = difficulty(roundIndex)
  return (1 + Math.floor(d * 3.999)) as 1 | 2 | 3 | 4
}

/** Allowed target/reference ratio window: narrow early, the full reserved window late. */
export function ratioWindow(roundIndex: number, cfg: RunConfig): [number, number] {
  const d = difficulty(roundIndex)
  const lo = Math.exp(Math.log(0.5) + d * (Math.log(cfg.minRatio) - Math.log(0.5)))
  const hi = Math.exp(Math.log(2) + d * (Math.log(cfg.maxRatio) - Math.log(2)))
  return [lo, hi]
}

/** Cross-category pairs unlock as the run progresses. */
export function crossCategoryChance(roundIndex: number): number {
  return difficulty(roundIndex) * 0.6
}

export interface PairPickOptions {
  pool: SizeObject[]
  roundIndex: number
  cfg: RunConfig
  rng: RNG
  /** ids already used this run, avoided when possible */
  used: Set<string>
}

/**
 * Deterministic pair selection. Reference: recognisable (tier ≤ 2) so the player always has an anchor.
 * Target: tier ≤ maxTierFor(round), ratio inside the window, same category unless a cross-category roll succeeds.
 */
export function pickPair(o: PairPickOptions): Pair {
  const { pool, roundIndex, cfg, rng, used } = o
  const inCat = (x: SizeObject) => cfg.category === 'all' || x.category === cfg.category
  const refs = pool.filter(x => x.tier <= 2 && inCat(x))
  const maxTier = maxTierFor(roundIndex)
  const [lo, hi] = ratioWindow(roundIndex, cfg)
  const cross = rng() < crossCategoryChance(roundIndex)

  // Try a few references until one has a valid target; deterministic given the rng.
  for (let attempt = 0; attempt < 40; attempt++) {
    const reference = rngPick(rng, refs)
    const candidates = pool.filter(t => {
      if (t.id === reference.id) return false
      if (t.tier > maxTier) return false
      if (!cross && t.category !== reference.category) return false
      if (cross && cfg.category !== 'all' && !inCat(t)) return false
      const r = t.size_m / reference.size_m
      return r >= lo && r <= hi
    })
    const fresh = candidates.filter(t => !used.has(t.id))
    const from = fresh.length ? fresh : candidates
    if (!from.length) continue
    // Prefer harder (higher-tier) targets as difficulty rises.
    const d = difficulty(roundIndex)
    const weighted = from.filter(t => rng() < 0.35 + 0.65 * (t.tier / maxTier) * d || d < 0.05)
    const target = rngPick(rng, weighted.length ? weighted : from)
    const ratio = target.size_m / reference.size_m
    // Start size: random in the full reserved window, independent of the truth.
    let startRatio = rngLog(rng, cfg.minRatio, cfg.maxRatio)
    // Never start within 15% of the answer: no free points.
    if (Math.abs(Math.log2(startRatio / ratio)) < 0.2) startRatio = ratio * (startRatio > ratio ? 1.6 : 0.6)
    return { reference, target, ratio, startRatio }
  }
  throw new Error('No valid pair found for this pool/config')
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'animals', label: 'Animals' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'landmarks', label: 'Landmarks' },
  { id: 'space', label: 'Space' },
  { id: 'objects', label: 'Everyday' },
]
