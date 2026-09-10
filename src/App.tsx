import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRun, startRound, submitGuess, nextRound, averageAccuracy, ghostOf, hashSeed, type Category, type Run, type SizeObject, type RunMode } from './core'
import { createPlatform, mockPlatform, type Platform } from './platform'
import { Home } from './ui/Home'
import { PlayScreen } from './ui/PlayScreen'
import { Summary } from './ui/Summary'

type Screen = 'home' | 'play' | 'summary'

interface Meta {
  runs: number
  accuracies: number[]     // last 30 run averages
  bestAvg: number | null
  bestPoints: number
  hintSeen: boolean
  dailyLast: string | null // YYYY-MM-DD
  dailyStreak: number
}
const META_KEY = 'sizegame.meta.v1'
const defaultMeta = (): Meta => ({ runs: 0, accuracies: [], bestAvg: null, bestPoints: 0, hintSeen: false, dailyLast: null, dailyStreak: 0 })
const today = () => new Date().toISOString().slice(0, 10)

export default function App() {
  const [pool, setPool] = useState<SizeObject[] | null>(null)
  const [platform, setPlatform] = useState<Platform>(mockPlatform)
  const [meta, setMeta] = useState<Meta>(defaultMeta)
  const [screen, setScreen] = useState<Screen>('home')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [run, setRun] = useState<Run | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [continued, setContinued] = useState(false)
  const metaRef = useRef(meta); metaRef.current = meta

  // boot: pool + platform + saved meta
  useEffect(() => {
    fetch('./data/pool.json').then(r => r.json()).then(setPool)
    createPlatform().then(p => { setPlatform(p); setMeta(p.getData<Meta>(META_KEY) ?? defaultMeta()) })
  }, [])
  const saveMeta = useCallback((m: Meta) => { setMeta(m); platform.setData(META_KEY, m) }, [platform])

  const begin = (mode: RunMode, seed: number) => {
    if (!pool) return
    const r = startRound(createRun(pool, seed, mode, category))
    setRun(r); setContinued(false); setShowHint(!metaRef.current.hintSeen); setScreen('play')
    platform.gameplayStart()
  }
  const onPlay = () => begin('endless', (Math.random() * 2 ** 32) >>> 0)
  const onDaily = () => begin('daily', hashSeed(`daily:${today()}`))

  const finishRun = useCallback((r: Run) => {
    platform.gameplayStop()
    const avg = averageAccuracy(r.state.results)
    const m = metaRef.current
    const isDaily = r.state.config.mode === 'daily'
    const next: Meta = {
      ...m,
      runs: m.runs + 1,
      accuracies: [...m.accuracies, avg].slice(-30),
      bestAvg: m.bestAvg == null ? avg : Math.max(m.bestAvg, avg),
      bestPoints: Math.max(m.bestPoints, r.state.points),
      dailyLast: isDaily ? today() : m.dailyLast,
      dailyStreak: isDaily ? (m.dailyLast === today() ? m.dailyStreak : m.dailyStreak + 1) : m.dailyStreak,
    }
    saveMeta(next)
    setScreen('summary')
  }, [platform, saveMeta])

  const onLock = (guessRatio: number, timedOut: boolean) => {
    setRun(r => r ? submitGuess(r, guessRatio, timedOut) : r)
  }
  const onNext = () => {
    setRun(r => {
      if (!r) return r
      if (r.state.phase === 'over') { finishRun(r); return r }
      return nextRound(r)
    })
  }
  const onHintDone = () => { setShowHint(false); saveMeta({ ...metaRef.current, hintSeen: true }) }

  // rewarded continue: casual endless only, once per run
  const onContinue = run && run.state.config.mode === 'endless' && !continued ? async () => {
    const ok = await platform.requestAd('rewarded')
    if (!ok) return false
    setContinued(true)
    setRun(r => r ? { ...r, state: { ...r.state, livesLeft: 1, phase: 'reveal' } } : r)
    setScreen('play')
    platform.gameplayStart()
    return true
  } : undefined

  const ghostLink = useMemo(() => {
    if (!run) return ''
    const g = ghostOf(run)
    return platform.inviteLink({ seed: String(g.seed), cat: g.category, g: g.guesses.join('_') })
  }, [run, platform])

  const allTime = meta.accuracies.length ? Math.round(meta.accuracies.reduce((a, b) => a + b, 0) / meta.accuracies.length) : null
  const personalBest = !!run && meta.bestAvg != null && averageAccuracy(run.state.results) >= meta.bestAvg && meta.runs > 1

  if (!pool) return <div className="h-full grid place-items-center text-muted">Loading…</div>

  if (screen === 'play' && run?.state.current) {
    return <PlayScreen run={run} onLock={onLock} onNext={onNext} showHint={showHint} onHintDone={onHintDone} />
  }
  if (screen === 'summary' && run) {
    return <Summary run={run} allTimeAccuracy={allTime} personalBest={personalBest} ghostLink={ghostLink}
      onPlayAgain={() => begin(run.state.config.mode, run.state.config.mode === 'daily' ? run.state.config.seed : (Math.random() * 2 ** 32) >>> 0)}
      onHome={() => setScreen('home')} onContinue={onContinue} />
  }
  return <Home category={category} onCategory={setCategory} onPlay={onPlay} onDaily={onDaily} dailyStreak={meta.dailyStreak} bestAccuracy={meta.bestAvg} />
}
