import { useState } from 'react'
import type { Run } from '../core'
import { averageAccuracy, ghostAccuracyAt } from '../core'
import { Silhouette, pixelBox } from './Silhouette'

interface Props {
  run: Run
  ghostLink: string
  onRematch: () => void
  onHome: () => void
}

export function GhostResult({ run, ghostLink, onRematch, onHome }: Props) {
  const s = run.state
  const [copied, setCopied] = useState(false)
  const rows = s.results.map((r, i) => {
    const theirs = ghostAccuracyAt(run, i)
    return { r, theirs: theirs ?? 0 }
  })
  const wins = rows.filter(x => x.r.accuracy > x.theirs).length
  const losses = rows.filter(x => x.r.accuracy < x.theirs).length
  const yourAvg = averageAccuracy(s.results)
  const theirAvg = rows.length ? Math.round(rows.reduce((a, x) => a + x.theirs, 0) / rows.length) : 0
  const verdict = wins > losses ? `You win ${wins}–${losses}` : losses > wins ? `You lose ${wins}–${losses}` : `Tied ${wins}–${losses}`
  const share = async () => {
    try { await navigator.clipboard.writeText(ghostLink); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }

  return (
    <div className="h-full flex flex-col px-5 pt-6 pb-5 gap-4 max-w-[520px] mx-auto w-full">
      <div className="text-center">
        <span className={`sticker ${wins >= losses ? 'bg-amber' : 'bg-paper-2'}`}>{verdict}</span>
        <div className="flex justify-center gap-10 mt-4">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-muted">YOU</div>
            <div className="mono text-[36px] leading-none font-semibold text-ink">{yourAvg}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-muted">OPPONENT</div>
            <div className="mono text-[36px] leading-none font-semibold text-coral">{theirAvg}</div>
          </div>
        </div>
      </div>

      <div className="card divide-y divide-[var(--card-border)] overflow-y-auto max-h-[42vh]">
        {rows.map(({ r, theirs }) => {
          const b = pixelBox(r.pair.target, 26)
          const dot = r.accuracy > theirs ? 'bg-teal' : r.accuracy < theirs ? 'bg-coral' : 'bg-muted'
          return (
            <div key={r.index} className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 flex justify-center"><Silhouette obj={r.pair.target} w={Math.min(30, b.w)} h={Math.min(26, b.h)} color="var(--target)" strokeWidth={2} /></div>
              <div className="flex-1 font-bold text-[15px] truncate">{r.pair.target.name}</div>
              <div className="mono text-[14px] w-8 text-right">{r.accuracy}</div>
              <span className="text-muted text-[11px]">vs</span>
              <div className="mono text-[14px] w-8 text-right text-muted">{theirs}</div>
              <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button className="btn btn-primary w-full" onClick={onRematch}>PLAY AGAIN</button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-ghost !py-3" onClick={share}>{copied ? 'Link copied' : 'Challenge someone else'}</button>
          <button className="btn btn-ghost !py-3" onClick={onHome}>Home</button>
        </div>
      </div>
    </div>
  )
}
