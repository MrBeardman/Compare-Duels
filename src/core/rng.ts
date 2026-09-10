// Seeded PRNG (mulberry32). Same seed → same run → ghosts and dailies are just a seed + guesses.
export type RNG = () => number

export function mulberry32(seed: number): RNG {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a: turn any string (a date, a share code) into a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function rngInt(rng: RNG, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

export function rngPick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** Random float in [min, max] on a log scale (uniform in log space). */
export function rngLog(rng: RNG, min: number, max: number): number {
  const a = Math.log(min), b = Math.log(max)
  return Math.exp(a + rng() * (b - a))
}
