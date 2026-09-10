export type Category = 'animals' | 'vehicles' | 'landmarks' | 'space' | 'objects'

/** One object in the pool. `size_m` is the length of the silhouette's major axis in metres. */
export interface SizeObject {
  id: string
  name: string
  category: Category
  subcategory: string
  /** What is measured: "shoulder height", "wingspan", "length"… Drives the silhouette axis. */
  dimension: string
  /** Whether size_m runs along the silhouette's width or height. */
  axis: 'width' | 'height'
  size_m: number
  /** 1 = everyone knows it … 4 = niche. */
  tier: 1 | 2 | 3 | 4
  /** Silhouette asset id (SVG symbol). Placeholder until the library exists. */
  silhouette?: string
}

export interface Pair {
  reference: SizeObject
  target: SizeObject
  /** target.size_m / reference.size_m */
  ratio: number
  /** Displayed starting size of the target as a multiple of the reference (random, uncorrelated with truth). */
  startRatio: number
}

export type Band = 'bullseye' | 'close' | 'notbad' | 'wayoff' | 'miss'

export interface RoundResult {
  index: number
  pair: Pair
  /** Player's guess as a multiple of the reference size. */
  guessRatio: number
  guessSize: number
  accuracy: number
  band: Band
  points: number
  percentOff: number
  timedOut: boolean
}

export type RunMode = 'endless' | 'daily' | 'ghost'

export interface RunConfig {
  seed: number
  mode: RunMode
  category: Category | 'all'
  lives: number
  roundSeconds: number
  /** Fixed max target/reference ratio the renderer always reserves room for. Pairs never exceed it. */
  maxRatio: number
  minRatio: number
}

export interface RunState {
  config: RunConfig
  roundIndex: number
  livesLeft: number
  streak: number
  bestStreak: number
  points: number
  results: RoundResult[]
  current: Pair | null
  phase: 'idle' | 'round' | 'reveal' | 'over'
}

export const DEFAULT_CONFIG: Omit<RunConfig, 'seed' | 'mode' | 'category'> = {
  lives: 3,
  roundSeconds: 12,
  maxRatio: 3.5,
  minRatio: 1 / 8,
}
