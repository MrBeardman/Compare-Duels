import { CATEGORIES, rankFor, type SizeObject } from '../core'
import type { Meta } from './meta'
import { Silhouette, pixelBox } from './Silhouette'

interface Props {
  meta: Meta
  pool: SizeObject[]
  onBack: () => void
}

export function Stats({ meta, pool, onBack }: Props) {
  const rank = rankFor(meta.totalPoints)
  const acc = meta.accuracies
  const half = Math.max(1, Math.floor(acc.length / 2))
  const firstAvg = acc.length ? avg(acc.slice(0, half)) : 0
  const secondAvg = acc.length ? avg(acc.slice(half)) : 0
  const trend = acc.length < 4 ? 'steady' : secondAvg > firstAvg + 2 ? 'up' : secondAvg < firstAvg - 2 ? 'down' : 'steady'

  const byId = new Map(pool.map(o => [o.id, o]))
  const hardest = Object.entries(meta.objectStats)
    .filter(([, s]) => s.n >= 2)
    .map(([id, s]) => ({ id, name: s.name, avg: Math.round(s.sum / s.n) }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)

  return (
    <div className="h-full flex flex-col px-5 pt-6 pb-6 gap-5 max-w-[520px] mx-auto w-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !py-2 !px-3" onClick={onBack}>‹ Back</button>
        <div className="font-bold text-[20px]">Stats</div>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-[17px]">{rank.title} · Lv {rank.level}</div>
          <div className="text-muted text-[12px] mt-0.5">{meta.runs} run{meta.runs === 1 ? '' : 's'} played</div>
        </div>
        <div className="mono text-[13px] text-muted">{rank.xpInLevel}/{rank.xpForLevel} XP</div>
      </div>

      <div className="card p-4">
        <div className="text-[12px] font-bold tracking-wider text-muted mb-2">ACCURACY · last {acc.length} run{acc.length === 1 ? '' : 's'}</div>
        <div className="flex items-end gap-3">
          <Sparkline values={acc} />
          <div className="text-right">
            <div className="mono text-[28px] leading-none font-semibold">{meta.bestAvg ?? '–'}</div>
            <div className="text-muted text-[12px] mt-1">
              best run {trend === 'up' ? '▲ improving' : trend === 'down' ? '▼ slipping' : '· steady'}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-[12px] font-bold tracking-wider text-muted mb-3">ACCURACY BY CATEGORY</div>
        <div className="flex flex-col gap-2.5">
          {CATEGORIES.map(c => {
            const s = meta.categoryAcc[c.id]
            const v = s ? Math.round(s.sum / s.n) : null
            const best = v != null && v > 0 && CATEGORIES.every(o => {
              const os = meta.categoryAcc[o.id]
              return !os || v >= Math.round(os.sum / os.n)
            })
            return (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-[86px] shrink-0 text-[12px] font-bold truncate">{c.label}</div>
                <div className="flex-1 h-2.5 rounded-full bg-[var(--card-border)] overflow-hidden">
                  <div className="h-full bg-teal rounded-full" style={{ width: `${v ?? 0}%` }} />
                </div>
                <div className="mono text-[13px] w-8 text-right">{v ?? '–'}</div>
                {best && <span className="sticker bg-amber !text-[10px] !py-0.5 !px-2">Best</span>}
              </div>
            )
          })}
        </div>
      </div>

      {hardest.length > 0 && (
        <div className="card p-4">
          <div className="text-[12px] font-bold tracking-wider text-muted mb-2">HARDEST OBJECTS FOR YOU</div>
          <div className="flex flex-col divide-y divide-[var(--card-border)]">
            {hardest.map(h => {
              const obj = byId.get(h.id)
              const b = obj ? pixelBox(obj, 24) : { w: 24, h: 24 }
              return (
                <div key={h.id} className="flex items-center gap-3 py-2">
                  <div className="w-7 flex justify-center">
                    {obj && <Silhouette obj={obj} w={Math.min(28, b.w)} h={Math.min(24, b.h)} color="var(--target)" strokeWidth={2} />}
                  </div>
                  <div className="flex-1 font-bold text-[14px] truncate">{h.name}</div>
                  <div className="mono text-[14px]">{h.avg}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function avg(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }

function Sparkline({ values }: { values: number[] }) {
  const w = 120, h = 40
  if (values.length < 2) return <svg width={w} height={h} />
  const max = Math.max(...values, 100), min = Math.min(...values, 0)
  const span = Math.max(1, max - min)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
