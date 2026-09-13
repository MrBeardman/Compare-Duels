/**
 * Rank/level from lifetime points. Purely a local progression system — there is no server, so this
 * is never presented as a competitive standing against other players (see Ladder screen).
 */
export interface RankInfo {
  level: number
  title: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  xpInLevel: number
  xpForLevel: number
}

const TITLES = ['Recruit', 'Scout', 'Surveyor', 'Analyst', 'Calibrator', 'Adjudicator', 'Chief Surveyor', 'Master Surveyor', 'Legend']

/** Lifetime points needed to REACH this level (level 1 = 0). Quadratic: each level costs a bit more than the last. */
export function levelThreshold(level: number): number {
  return 300 * (level - 1) * (level - 1)
}

export function rankFor(totalPoints: number): RankInfo {
  let level = 1
  while (levelThreshold(level + 1) <= totalPoints) level++
  const base = levelThreshold(level)
  const next = levelThreshold(level + 1)
  const title = TITLES[Math.min(level - 1, TITLES.length - 1)]
  const tier = level >= 8 ? 'platinum' : level >= 5 ? 'gold' : level >= 3 ? 'silver' : 'bronze'
  return { level, title, tier, xpInLevel: totalPoints - base, xpForLevel: next - base }
}

/** ISO-ish week key ("2026-W37") so a weekly point delta can be tracked without a server. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = (t.getUTCDay() + 6) % 7 // Monday = 0
  t.setUTCDate(t.getUTCDate() - day + 3)
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
