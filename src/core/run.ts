import { DEFAULT_CONFIG, type Category, type RunConfig, type RunMode, type RunState, type SizeObject, type RoundResult } from './types'
import { mulberry32, type RNG } from './rng'
import { accuracy, band, percentOff, roundPoints } from './scoring'
import { pickPair } from './pairs'

export interface Run {
  state: RunState
  pool: SizeObject[]
  rng: RNG
  used: Set<string>
}

export function createRun(pool: SizeObject[], seed: number, mode: RunMode, category: Category | 'all' = 'all'): Run {
  const config: RunConfig = { ...DEFAULT_CONFIG, seed, mode, category }
  return {
    pool,
    rng: mulberry32(seed),
    used: new Set(),
    state: {
      config,
      roundIndex: 0,
      livesLeft: config.lives,
      streak: 0,
      bestStreak: 0,
      points: 0,
      results: [],
      current: null,
      phase: 'idle',
    },
  }
}

/** Start the next round: picks a pair deterministically. */
export function startRound(run: Run): Run {
  const s = run.state
  if (s.phase === 'over') return run
  const pair = pickPair({ pool: run.pool, roundIndex: s.roundIndex, cfg: s.config, rng: run.rng, used: run.used })
  run.used.add(pair.reference.id); run.used.add(pair.target.id)
  return { ...run, state: { ...s, current: pair, phase: 'round' } }
}

/** Lock in a guess. `guessRatio` is the target's displayed size as a multiple of the reference. */
export function submitGuess(run: Run, guessRatio: number, timedOut = false): Run {
  const s = run.state
  if (s.phase !== 'round' || !s.current) return run
  const pair = s.current
  const truth = pair.target.size_m
  const guessSize = guessRatio * pair.reference.size_m
  const acc = accuracy(guessSize, truth)
  const b = band(acc)
  const streak = acc >= 80 ? s.streak + 1 : 0
  const pts = roundPoints(acc, s.roundIndex, s.streak)
  const result: RoundResult = {
    index: s.roundIndex, pair, guessRatio, guessSize, accuracy: acc, band: b, points: pts,
    percentOff: percentOff(guessSize, truth), timedOut,
  }
  const livesLeft = b === 'miss' ? s.livesLeft - 1 : s.livesLeft
  return {
    ...run,
    state: {
      ...s,
      results: [...s.results, result],
      points: s.points + pts,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      livesLeft,
      phase: livesLeft <= 0 ? 'over' : 'reveal',
    },
  }
}

/** Advance from reveal to the next round (or end). */
export function nextRound(run: Run): Run {
  const s = run.state
  if (s.phase !== 'reveal') return run
  return startRound({ ...run, state: { ...s, roundIndex: s.roundIndex + 1, current: null, phase: 'idle' } })
}

export function endRun(run: Run): Run {
  return { ...run, state: { ...run.state, phase: 'over' } }
}

export function averageAccuracy(results: RoundResult[]): number {
  if (!results.length) return 0
  return Math.round(results.reduce((a, r) => a + r.accuracy, 0) / results.length)
}

/** Everything needed to replay a run as a ghost: seed + guesses. ~100 bytes. */
export function ghostOf(run: Run): { seed: number; category: Category | 'all'; guesses: number[] } {
  return { seed: run.state.config.seed, category: run.state.config.category, guesses: run.state.results.map(r => +r.guessRatio.toFixed(4)) }
}
