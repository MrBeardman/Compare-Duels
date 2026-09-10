import type { Band } from './types'

/**
 * Accuracy 0–100, symmetric on a log scale.
 * exact = 100, 6% off ≈ 92, 41% off ≈ 51, double or half = 0.
 */
export function accuracy(guess: number, truth: number): number {
  if (!(guess > 0) || !(truth > 0)) return 0
  const err = Math.abs(Math.log2(guess / truth))
  return Math.max(0, Math.round(100 - 100 * err))
}

/** Signed percentage the guess is off by, e.g. +6 means guessed 6% too big. */
export function percentOff(guess: number, truth: number): number {
  return Math.round(((guess - truth) / truth) * 100)
}

export function band(acc: number): Band {
  if (acc >= 95) return 'bullseye'
  if (acc >= 80) return 'close'
  if (acc >= 50) return 'notbad'
  if (acc >= 1) return 'wayoff'
  return 'miss'
}

export const BAND_LABEL: Record<Band, string> = {
  bullseye: 'Bullseye!',
  close: 'Close!',
  notbad: 'Not bad',
  wayoff: 'Way off',
  miss: 'Miss',
}

/** Rounds get more valuable as the run goes on; streaks of ≥80 add up to +50%. */
export function roundPoints(acc: number, roundIndex: number, streak: number): number {
  const base = 8 + Math.floor(roundIndex / 3)
  const streakMult = 1 + Math.min(streak, 10) * 0.05
  return Math.round(acc * base * streakMult)
}

/** Difficulty 0→1 across the first 15 rounds, then flat. */
export function difficulty(roundIndex: number): number {
  return Math.min(1, roundIndex / 15)
}
