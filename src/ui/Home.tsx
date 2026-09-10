import { CATEGORIES, type Category } from '../core'

interface Props {
  category: Category | 'all'
  onCategory: (c: Category | 'all') => void
  onPlay: () => void
  onDaily: () => void
  dailyStreak: number
  bestAccuracy: number | null
}

export function Home({ category, onCategory, onPlay, onDaily, dailyStreak, bestAccuracy }: Props) {
  const chips: { id: Category | 'all'; label: string }[] = [...CATEGORIES, { id: 'all', label: 'All' }]
  return (
    <div className="h-full flex flex-col px-5 pt-8 pb-6 gap-6 max-w-[520px] mx-auto w-full">
      <div className="text-center">
        <div className="text-[40px] leading-none font-bold tracking-tight">SIZEGAME</div>
        <div className="text-muted mt-2">How big is it, really?</div>
      </div>

      <button className="btn btn-primary w-full text-[22px] !py-5 shadow-md" onClick={onPlay}>PLAY</button>

      <div className="flex flex-wrap gap-2 justify-center">
        {chips.map(c => (
          <button key={c.id} onClick={() => onCategory(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-bold border-2 transition-colors ${category === c.id ? 'bg-teal border-teal text-white' : 'border-[var(--card-border)] text-ink bg-paper-2'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile title="Daily" sub={dailyStreak > 0 ? `${dailyStreak} day streak` : 'Same 5 for everyone'} onClick={onDaily} />
        <Tile title="Challenge" sub="Coming soon" disabled />
        <Tile title="Ladder" sub="Coming soon" disabled />
        <Tile title="Stats" sub={bestAccuracy != null ? `Best run: ${bestAccuracy}` : 'Play a run first'} disabled />
      </div>
    </div>
  )
}

function Tile({ title, sub, onClick, disabled }: { title: string; sub: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="card p-4 text-left disabled:opacity-50">
      <div className="font-bold text-[16px]">{title}</div>
      <div className="text-muted text-[13px] mt-0.5">{sub}</div>
    </button>
  )
}
