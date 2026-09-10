import { useState } from 'react'
import type { Run } from '../core'
import { averageAccuracy } from '../core'
import { Silhouette, pixelBox } from './Silhouette'
import { formatPoints } from './format'

interface Props {
  run: Run
  allTimeAccuracy: number | null
  personalBest: boolean
  onPlayAgain: () => void
  onHome: () => void
  onContinue?: () => Promise<boolean>
  ghostLink: string
}

const DOT: Record<string, string> = { bullseye: 'bg-teal', close: 'bg-amber', notbad: 'bg-muted', wayoff: 'bg-coral', miss: 'bg-text' }

export function Summary({ run, allTimeAccuracy, personalBest, onPlayAgain, onHome, onContinue, ghostLink }: Props) {
  const s = run.state
  const avg = averageAccuracy(s.results)
  const [copied, setCopied] = useState(false)
  const [adBusy, setAdBusy] = useState(false)
  const share = async () => {
    try { await navigator.clipboard.writeText(ghostLink); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <div className="h-full flex flex-col px-5 pt-6 pb-5 gap-4 max-w-[520px] mx-auto w-full">
      <div className="text-center">
        <span className={`sticker ${personalBest ? 'bg-amber' : 'bg-paper-2'}`}>{personalBest ? 'Personal best!' : 'Run over'}</span>
        <div className="text-[12px] font-bold tracking-wider text-muted mt-4">ACCURACY · avg over {s.results.length} round{s.results.length === 1 ? '' : 's'}</div>
        <div className="mono text-[56px] leading-none font-semibold text-ink mt-1">{avg}</div>
        <div className="mono text-muted text-[14px] mt-2">{formatPoints(s.points)} pts · best streak x{s.bestStreak}</div>
      </div>

      <div className="card divide-y divide-[var(--card-border)] overflow-y-auto max-h-[38vh]">
        {s.results.map(r => {
          const b = pixelBox(r.pair.target, 26)
          return (
            <div key={r.index} className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 flex justify-center"><Silhouette obj={r.pair.target} w={Math.min(30, b.w)} h={Math.min(26, b.h)} color="var(--target)" strokeWidth={2} /></div>
              <div className="flex-1 font-bold text-[15px] truncate">{r.pair.target.name}</div>
              <div className="mono text-[15px] w-10 text-right">{r.accuracy}</div>
              <span className={`w-2.5 h-2.5 rounded-full ${DOT[r.band]}`} />
            </div>
          )
        })}
      </div>

      <div className="text-[13px] text-muted text-center">
        Your average accuracy: this run <b className="mono text-text">{avg}</b>{allTimeAccuracy != null && <> · all-time <b className="mono text-text">{allTimeAccuracy}</b></>}
      </div>

      {onContinue && (
        <button className="card p-3 text-left flex items-center gap-3 disabled:opacity-50" disabled={adBusy}
          onClick={async () => { setAdBusy(true); const ok = await onContinue(); setAdBusy(false); if (!ok) { /* ad unavailable: nothing changes */ } }}>
          <span className="text-ink text-[18px]">▶</span>
          <span>
            <div className="font-bold text-[15px]">{adBusy ? 'Loading…' : 'One more life? Watch a short ad'}</div>
            <div className="text-muted text-[12px]">Casual runs only, not ranked</div>
          </span>
        </button>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <button className="btn btn-primary w-full" onClick={onPlayAgain}>PLAY AGAIN</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost !py-3" onClick={share}>{copied ? 'Link copied' : 'Challenge a friend'}</button>
          <button className="btn btn-ghost !py-3" onClick={onHome}>Home</button>
        </div>
      </div>
    </div>
  )
}
