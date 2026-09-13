import { rankFor } from '../core'
import { formatPoints } from './format'
import type { Meta } from './meta'

interface Props {
  meta: Meta
  weeklyChange: number
  onBack: () => void
}

const TIER_LABEL: Record<string, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }
const TIER_COLOR: Record<string, string> = { bronze: '#B08D57', silver: '#9AA6B4', gold: 'var(--amber)', platinum: 'var(--teal)' }

export function Ladder({ meta, weeklyChange, onBack }: Props) {
  const rank = rankFor(meta.totalPoints)
  const pct = rank.xpForLevel > 0 ? Math.min(100, Math.round((rank.xpInLevel / rank.xpForLevel) * 100)) : 100
  return (
    <div className="h-full flex flex-col px-5 pt-6 pb-6 gap-5 max-w-[520px] mx-auto w-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !py-2 !px-3" onClick={onBack}>‹ Back</button>
        <div className="font-bold text-[20px]">Ladder</div>
      </div>

      <div className="card p-5 text-center">
        <span className="sticker" style={{ background: TIER_COLOR[rank.tier], color: '#fff', border: 'none' }}>
          {TIER_LABEL[rank.tier]}
        </span>
        <div className="text-[13px] font-bold tracking-wider text-muted mt-4">RANK</div>
        <div className="text-[28px] font-bold mt-0.5">{rank.title} · Lv {rank.level}</div>
        <div className="w-full h-2.5 rounded-full bg-[var(--card-border)] overflow-hidden mt-4">
          <div className="h-full bg-ink rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="mono text-muted text-[12px] mt-1.5">{rank.xpInLevel} / {rank.xpForLevel} XP to next level</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-[12px] font-bold tracking-wider text-muted">LIFETIME POINTS</div>
          <div className="mono text-[22px] font-semibold mt-1">{formatPoints(meta.totalPoints)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[12px] font-bold tracking-wider text-muted">THIS WEEK</div>
          <div className="mono text-[22px] font-semibold mt-1">{weeklyChange >= 0 ? '+' : ''}{formatPoints(weeklyChange)}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-[12px] font-bold tracking-wider text-muted">BEST SINGLE RUN</div>
        <div className="mono text-[20px] font-semibold mt-1">{formatPoints(meta.bestPoints)} pts</div>
      </div>

      <div className="text-[13px] text-muted text-center mt-auto">
        Global ladder arrives with online duels. For now, this tracks your own rank — challenge a friend from your run summary to compare directly.
      </div>
    </div>
  )
}
