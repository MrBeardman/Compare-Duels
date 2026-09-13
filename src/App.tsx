import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRun, startRound, submitGuess, nextRound, averageAccuracy, ghostOf, hashSeed, weekKey, CATEGORIES, type Category, type Run, type SizeObject, type RunMode, type RunConfig } from './core'
import { createPlatform, mockPlatform, type Platform } from './platform'
import { Home } from './ui/Home'
import { PlayScreen } from './ui/PlayScreen'
import { Summary } from './ui/Summary'
import { GhostResult } from './ui/GhostResult'
import { Stats } from './ui/Stats'
import { Ladder } from './ui/Ladder'
import { registerSilhouettes } from './ui/Silhouette'
import { type Meta, META_KEY, defaultMeta, foldRun, today } from './ui/meta'

type Screen = 'home' | 'play' | 'summary' | 'ghostresult' | 'stats' | 'ladder'

interface Challenge { seed: number; category: Category | 'all'; guesses: number[] }
const CAT_IDS = new Set<string>([...CATEGORIES.map(c => c.id), 'all'])

/** Reads ?seed=&cat=&g= from the URL (set by inviteLink) and clears them so a reload doesn't re-trigger it. */
function readIncomingChallenge(): Challenge | null {
  const p = new URLSearchParams(location.search)
  const seedStr = p.get('seed'), cat = p.get('cat'), g = p.get('g')
  if (!seedStr || !cat || !g || !CAT_IDS.has(cat)) return null
  const seed = Number(seedStr)
  const guesses = g.split('_').map(Number)
  if (!Number.isFinite(seed) || !guesses.length || guesses.some(x => !Number.isFinite(x) || x <= 0)) return null
  history.replaceState(null, '', location.pathname + location.hash)
  return { seed, category: cat as Category | 'all', guesses }
}

export default function App() {
  const [pool, setPool] = useState<SizeObject[] | null>(null)
  const [platform, setPlatform] = useState<Platform>(mockPlatform)
  const [meta, setMeta] = useState<Meta>(defaultMeta)
  const [screen, setScreen] = useState<Screen>('home')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [run, setRun] = useState<Run | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [continued, setContinued] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(() => readIncomingChallenge())
  const metaRef = useRef(meta)
  useEffect(() => { metaRef.current = meta }, [meta])

  // boot: pool + platform + saved meta
  useEffect(() => {
    Promise.all([
      fetch('./data/pool.json').then(r => r.json()),
      fetch('./data/silhouettes.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([p, lib]) => { registerSilhouettes(lib); setPool(p) })
    createPlatform().then(p => { setPlatform(p); setMeta(p.getData<Meta>(META_KEY) ?? defaultMeta()) })
  }, [])

  useEffect(() => {
    if (meta.darkMode) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
  }, [meta.darkMode])

  const saveMeta = useCallback((m: Meta) => { setMeta(m); platform.setData(META_KEY, m) }, [platform])

  const begin = (mode: RunMode, seed: number, overrides: Partial<RunConfig> = {}, cat: Category | 'all' = category) => {
    if (!pool) return
    const r = startRound(createRun(pool, seed, mode, cat, overrides))
    setRun(r); setContinued(false); setShowHint(mode !== 'ghost' && !metaRef.current.hintSeen); setScreen('play')
    platform.gameplayStart()
  }
  const onPlay = () => begin('endless', (Math.random() * 2 ** 32) >>> 0)
  const onDaily = () => begin('daily', hashSeed(`daily:${today()}`))
  const onChallenge = () => {
    if (!challenge) return
    begin('ghost', challenge.seed, { lives: challenge.guesses.length + 1, ghostGuesses: challenge.guesses }, challenge.category)
    setChallenge(null)
  }
  const onToggleDark = () => saveMeta({ ...metaRef.current, darkMode: !metaRef.current.darkMode })
  const onLadder = () => {
    const wk = weekKey()
    if (metaRef.current.weekSnapshot?.key !== wk) saveMeta({ ...metaRef.current, weekSnapshot: { key: wk, points: metaRef.current.totalPoints } })
    setScreen('ladder')
  }

  const finishRun = useCallback((r: Run) => {
    platform.gameplayStop()
    saveMeta(foldRun(metaRef.current, r))
    setScreen(r.state.config.mode === 'ghost' ? 'ghostresult' : 'summary')
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
  const weeklyChange = meta.weekSnapshot && meta.weekSnapshot.key === weekKey() ? meta.totalPoints - meta.weekSnapshot.points : 0

  if (!pool) return <div className="h-full grid place-items-center text-muted">Loading…</div>

  if (screen === 'play' && run?.state.current) {
    return <PlayScreen run={run} onLock={onLock} onNext={onNext} showHint={showHint} onHintDone={onHintDone} />
  }
  if (screen === 'ghostresult' && run) {
    return <GhostResult run={run} ghostLink={ghostLink}
      onRematch={() => begin('endless', (Math.random() * 2 ** 32) >>> 0)}
      onHome={() => setScreen('home')} />
  }
  if (screen === 'summary' && run) {
    return <Summary run={run} allTimeAccuracy={allTime} personalBest={personalBest} ghostLink={ghostLink}
      onPlayAgain={() => begin(run.state.config.mode, run.state.config.mode === 'daily' ? run.state.config.seed : (Math.random() * 2 ** 32) >>> 0)}
      onHome={() => setScreen('home')} onContinue={onContinue} />
  }
  if (screen === 'stats') return <Stats meta={meta} pool={pool} onBack={() => setScreen('home')} />
  if (screen === 'ladder') return <Ladder meta={meta} weeklyChange={weeklyChange} onBack={() => setScreen('home')} />
  return <Home category={category} onCategory={setCategory} onPlay={onPlay} onDaily={onDaily} dailyStreak={meta.dailyStreak} bestAccuracy={meta.bestAvg}
    hasChallenge={!!challenge} onChallenge={onChallenge} onLadder={onLadder} onStats={() => setScreen('stats')}
    darkMode={meta.darkMode} onToggleDark={onToggleDark} />
}
