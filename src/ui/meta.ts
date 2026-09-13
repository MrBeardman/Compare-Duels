import type { Category, Run } from '../core'
import { averageAccuracy } from '../core'

export interface CategoryStat { sum: number; n: number }
export interface ObjectStat { sum: number; n: number; name: string }
export interface WeekSnapshot { key: string; points: number }

/** Everything persisted across sessions via platform.getData/setData. Cross-device on CrazyGames. */
export interface Meta {
  runs: number
  accuracies: number[]     // last 30 run averages
  bestAvg: number | null
  bestPoints: number
  hintSeen: boolean
  dailyLast: string | null // YYYY-MM-DD
  dailyStreak: number
  /** Lifetime points across every run — drives the rank/level shown on the Ladder screen. */
  totalPoints: number
  categoryAcc: Partial<Record<Category, CategoryStat>>
  objectStats: Record<string, ObjectStat>
  darkMode: boolean
  weekSnapshot: WeekSnapshot | null
}

export const META_KEY = 'sizegame.meta.v1'
export const today = () => new Date().toISOString().slice(0, 10)

export const defaultMeta = (): Meta => ({
  runs: 0, accuracies: [], bestAvg: null, bestPoints: 0, hintSeen: false,
  dailyLast: null, dailyStreak: 0, totalPoints: 0, categoryAcc: {}, objectStats: {},
  darkMode: false, weekSnapshot: null,
})

/** Folds a finished run's rounds into the running stats: category/object breakdown, lifetime points, streaks. */
export function foldRun(m: Meta, run: Run): Meta {
  const avg = averageAccuracy(run.state.results)
  const isDaily = run.state.config.mode === 'daily'
  const categoryAcc = { ...m.categoryAcc }
  const objectStats = { ...m.objectStats }
  for (const r of run.state.results) {
    const cat = r.pair.target.category
    const ca = categoryAcc[cat] ?? { sum: 0, n: 0 }
    categoryAcc[cat] = { sum: ca.sum + r.accuracy, n: ca.n + 1 }
    const id = r.pair.target.id
    const os = objectStats[id] ?? { sum: 0, n: 0, name: r.pair.target.name }
    objectStats[id] = { sum: os.sum + r.accuracy, n: os.n + 1, name: r.pair.target.name }
  }
  return {
    ...m,
    runs: m.runs + 1,
    accuracies: [...m.accuracies, avg].slice(-30),
    bestAvg: m.bestAvg == null ? avg : Math.max(m.bestAvg, avg),
    bestPoints: Math.max(m.bestPoints, run.state.points),
    totalPoints: m.totalPoints + run.state.points,
    categoryAcc,
    objectStats,
    dailyLast: isDaily ? today() : m.dailyLast,
    dailyStreak: isDaily ? (m.dailyLast === today() ? m.dailyStreak : m.dailyStreak + 1) : m.dailyStreak,
  }
}
