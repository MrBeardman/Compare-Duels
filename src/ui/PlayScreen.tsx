import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Run } from '../core'
import { BAND_LABEL, CATEGORIES } from '../core'
import { Silhouette, pixelBox } from './Silhouette'
import { formatSize, formatPoints } from './format'
import { CAMERA, fillFraction, gridCellPx, zoomAdjust } from './camera'

const BAND_STYLE: Record<string, string> = {
  bullseye: 'bg-teal text-white border-text', close: 'bg-amber text-text', notbad: 'bg-paper-2 text-text',
  wayoff: 'bg-coral text-white', miss: 'bg-text text-paper',
}

export function Hearts({ total, left, size = 18 }: { total: number; left: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`${left} of ${total} lives`}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 21 C6 16 2 12.5 2 8.5 C2 5.5 4.3 3.5 7 3.5 C9 3.5 11 4.8 12 6.3 C13 4.8 15 3.5 17 3.5 C19.7 3.5 22 5.5 22 8.5 C22 12.5 18 16 12 21 Z"
            fill={i < left ? 'var(--coral)' : 'none'} stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}

interface Props {
  run: Run
  /** Live guess ratio during the round. */
  onLock: (guessRatio: number, timedOut: boolean) => void
  onNext: () => void
  showHint: boolean
  onHintDone: () => void
}

export function PlayScreen({ run, onLock, onNext, showHint, onHintDone }: Props) {
  const s = run.state
  const pair = s.current!
  const cfg = s.config
  const result = s.phase === 'reveal' || s.phase === 'over' ? s.results[s.results.length - 1] : null
  const revealed = !!result

  const gridRef = useRef<HTMLDivElement>(null)
  const [grid, setGrid] = useState({ w: 360, h: 480 })
  useLayoutEffect(() => {
    const el = gridRef.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setGrid({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  // Portrait: ground line sits above the reveal-card zone so the silhouettes stay visible with the card open.
  const portrait = grid.h > grid.w
  const groundY = portrait ? grid.h * 0.56 : grid.h * 0.82
  const space = useMemo(() => ({ availH: groundY - 28, maxW: grid.w * 0.56, pairW: grid.w * 0.8 }), [groundY, grid.w])

  const [ratio, setRatio] = useState(pair.startRatio)
  const clamp = (r: number) => Math.min(cfg.maxRatio, Math.max(cfg.minRatio, r))

  // ── adaptive camera ──
  // base scale: reference at 1 unit = a comfortable mid size; `zoom` multiplies it and is driven only by
  // what is displayed (reference + current guess, + true outline after reveal). See camera.ts.
  const basePx = Math.max(CAMERA.minRefPx, Math.min(space.availH * 0.45, grid.w * 0.28))
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1); zoomRef.current = zoom
  const zoomTarget = useRef(1)
  const fitNow = (r: number, includeTruth: boolean) => {
    const refB = pixelBox(pair.reference, basePx)
    const others = [pixelBox(pair.target, basePx * r)]
    if (includeTruth) others.push(pixelBox(pair.target, basePx * pair.ratio))
    return CAMERA.comfort / fillFraction(refB, others, space)
  }
  // new round: snap the camera to a fit of the START state (random, uncorrelated with the answer)
  useEffect(() => {
    setRatio(pair.startRatio)
    const z = Math.max(CAMERA.minRefPx / basePx, fitNow(pair.startRatio, false))
    zoomTarget.current = z; zoomRef.current = z; setZoom(z)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair])
  // hysteresis: only re-target when the displayed scene leaves the comfort band
  useEffect(() => {
    const refB = pixelBox(pair.reference, basePx * zoomRef.current)
    const others = [pixelBox(pair.target, basePx * zoomRef.current * ratio)]
    if (revealed) others.push(pixelBox(pair.target, basePx * zoomRef.current * pair.ratio))
    const adj = zoomAdjust(fillFraction(refB, others, space))
    if (adj !== 1) zoomTarget.current = Math.max(CAMERA.minRefPx / basePx, zoomRef.current * adj)
  }, [ratio, revealed, pair, basePx, space])
  // ease toward the target
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const z = zoomRef.current, t = zoomTarget.current
      if (Math.abs(t - z) > 1e-3) { const n = z + (t - z) * CAMERA.ease; zoomRef.current = n; setZoom(n) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const refPx = basePx * zoom
  const cellPx = gridCellPx(zoom)

  // ── timer ──
  const [tLeft, setTLeft] = useState(cfg.roundSeconds)
  const ratioRef = useRef(ratio); ratioRef.current = ratio
  const lockedRef = useRef(false)
  useEffect(() => {
    lockedRef.current = false; setTLeft(cfg.roundSeconds)
    if (revealed || showHint) return
    const t0 = performance.now()
    const id = setInterval(() => {
      const left = Math.max(0, cfg.roundSeconds - (performance.now() - t0) / 1000)
      setTLeft(left)
      if (left <= 0 && !lockedRef.current) { lockedRef.current = true; clearInterval(id); onLock(ratioRef.current, true) }
    }, 50)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, revealed, showHint])

  // ── input: drag (vertical), pinch, wheel ──
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch0 = useRef<{ d: number; r: number } | null>(null)
  const drag0 = useRef<{ y: number; r: number } | null>(null)
  const K = Math.log(4) / 300 // 300px vertical drag ≈ 4×

  const onPointerDown = (e: React.PointerEvent) => {
    if (revealed) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) drag0.current = { y: e.clientY, r: ratioRef.current }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch0.current = { d: Math.hypot(a.x - b.x, a.y - b.y), r: ratioRef.current }; drag0.current = null
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (revealed || !pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2 && pinch0.current) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      setRatio(clamp(pinch0.current.r * (d / Math.max(1, pinch0.current.d))))
    } else if (drag0.current) {
      setRatio(clamp(drag0.current.r * Math.exp(-(e.clientY - drag0.current.y) * K)))
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch0.current = null
    if (pointers.current.size === 0) drag0.current = null
    else if (pointers.current.size === 1) { const [p] = [...pointers.current.values()]; drag0.current = { y: p.y, r: ratioRef.current } }
  }
  const onWheel = (e: React.WheelEvent) => { if (!revealed) setRatio(clamp(ratioRef.current * Math.exp(-e.deltaY * 0.002))) }

  // ── layout ──
  const refBox = pixelBox(pair.reference, refPx)
  const tgtBox = pixelBox(pair.target, refPx * ratio)
  const trueBox = pixelBox(pair.target, refPx * pair.ratio)
  const refX = grid.w * 0.28 - refBox.w / 2
  const tgtCX = grid.w * 0.68
  const catLabel = CATEGORIES.find(c => c.id === pair.target.category)?.label ?? ''
  const timerPct = (tLeft / cfg.roundSeconds) * 100

  return (
    <div className="h-full flex flex-col px-4 pt-3 pb-4 gap-3 max-w-[1100px] mx-auto w-full">
      {/* HUD */}
      <div className="flex items-center justify-between text-[15px]">
        <div className="flex items-center gap-3">
          {cfg.mode === 'ghost'
            ? <span className="font-bold mono">Round {s.roundIndex + 1}/{cfg.ghostGuesses?.length ?? '?'}</span>
            : <><span className="font-bold">Round {s.roundIndex + 1}</span><Hearts total={cfg.lives} left={s.livesLeft} /></>}
        </div>
        <div className="mono text-[15px]"><b>{formatPoints(s.points)}</b>{s.streak > 0 && <span className="text-coral ml-2">x{s.streak}</span>}</div>
      </div>
      <div className="flex items-center justify-between">
        <span className="bg-teal text-white text-[13px] font-bold px-3 py-1 rounded-full">{catLabel}</span>
        {result && <span className={`sticker ${BAND_STYLE[result.band]}`}>{BAND_LABEL[result.band]}</span>}
      </div>

      {/* Grid map */}
      <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-[var(--card-border)]">
        {/* timer bar */}
        <div className="absolute left-0 right-0 top-0 h-[5px] bg-amber/25 z-10">
          <div className="h-full bg-amber transition-[width] duration-75" style={{ width: `${revealed ? 0 : timerPct}%`, background: tLeft < 3 && !revealed ? 'var(--coral)' : undefined }} />
        </div>
        <div ref={gridRef} className="grid-map absolute inset-0 touch-none cursor-ns-resize" style={{ backgroundSize: `${cellPx}px ${cellPx}px` }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
          {/* ground line */}
          <div className="absolute left-3 right-3 h-[2px]" style={{ top: groundY, background: 'var(--ground)' }} />

          {/* reference */}
          <div className="absolute" style={{ left: refX, top: groundY - refBox.h }}>
            <Silhouette obj={pair.reference} w={refBox.w} h={refBox.h} color="var(--ref)" />
          </div>
          <div className="absolute -translate-x-1/2 bg-amber text-text text-[13px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ left: refX + refBox.w / 2, top: groundY + 8 }}>
            {pair.reference.name} · {formatSize(pair.reference.size_m)}
          </div>

          {/* target: guess (solid during round, dashed ghost in reveal) */}
          <div className="absolute" style={{ left: tgtCX - tgtBox.w / 2, top: groundY - tgtBox.h }}>
            <Silhouette obj={pair.target} w={tgtBox.w} h={tgtBox.h} color="var(--target)" dashed={revealed} />
            {!revealed && <>
              <span className="absolute -left-2 -top-2 w-3 h-3 rounded-full bg-coral" />
              <span className="absolute -right-2 -bottom-2 w-3 h-3 rounded-full bg-coral" />
              <span className="absolute inset-0 rounded-md border-2 border-dashed border-coral/60 pointer-events-none" />
            </>}
          </div>
          {/* true outline + dimension line */}
          {revealed && <>
            <div className="absolute" style={{ left: tgtCX - trueBox.w / 2, top: groundY - trueBox.h }}>
              <Silhouette obj={pair.target} w={trueBox.w} h={trueBox.h} color="var(--target)" fillOpacity={0.25} strokeWidth={3.5} />
            </div>
            <DimensionLine axis={pair.target.axis} x={tgtCX + trueBox.w / 2 + 12} y={groundY} w={trueBox.w} h={trueBox.h} label={formatSize(pair.target.size_m)} cx={tgtCX} />
          </>}
          <div className="absolute -translate-x-1/2 bg-coral text-white text-[13px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
            style={{ left: tgtCX, top: groundY - Math.max(tgtBox.h, revealed ? trueBox.h : 0) - 30 }}>
            {pair.target.name}
          </div>

          {/* first-round hint */}
          {showHint && !revealed && (
            <div className="absolute inset-0 bg-text/55 flex items-center justify-center z-20" onPointerDown={e => e.stopPropagation()}>
              <div className="card p-5 text-center w-[240px]">
                <div className="text-[28px] mb-1">◯◯</div>
                <div className="font-bold mb-3">Pinch or drag to resize</div>
                <button className="btn btn-accent w-full !py-2.5" onClick={onHintDone}>Got it</button>
              </div>
            </div>
          )}
        </div>

        {/* reveal card slides over the lower part of the grid */}
        {result && (
          <div className="absolute left-3 right-3 bottom-3 card p-4 z-10 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[12px] font-bold tracking-wider text-muted">ACCURACY</div>
                <div className="flex items-center gap-3">
                  <span className="mono text-[40px] leading-none font-semibold text-ink">{result.accuracy}</span>
                </div>
              </div>
              <span className="mono text-[13px] bg-paper px-2.5 py-1 rounded-full border border-[var(--card-border)]">+{formatPoints(result.points)}</span>
            </div>
            <div className="text-[14px] text-muted mt-2">
              Guess {formatSize(result.guessSize)} · true {formatSize(pair.target.size_m)} · {Math.abs(result.percentOff)}% {result.percentOff >= 0 ? 'too big' : 'too small'}{result.timedOut ? ' · time ran out' : ''}
            </div>
          </div>
        )}
      </div>

      {revealed
        ? <button className="btn btn-accent w-full" onClick={onNext}>{s.phase === 'over' ? 'SEE RESULTS' : 'NEXT'}</button>
        : <button className="btn btn-primary w-full" disabled={showHint} onClick={() => { if (!lockedRef.current) { lockedRef.current = true; onLock(ratio, false) } }}>LOCK IN</button>}
    </div>
  )
}

function DimensionLine({ axis, x, y, w, h, label, cx }: { axis: 'width' | 'height'; x: number; y: number; w: number; h: number; label: string; cx: number }) {
  const c = 'var(--ink)'
  if (axis === 'height') {
    return (
      <svg className="absolute overflow-visible pointer-events-none" style={{ left: x, top: y - h }} width={40} height={h}>
        <line x1={0} x2={0} y1={0} y2={h} stroke={c} strokeWidth={2} />
        <line x1={-6} x2={6} y1={0} y2={0} stroke={c} strokeWidth={2} />
        <line x1={-6} x2={6} y1={h} y2={h} stroke={c} strokeWidth={2} />
        <text x={8} y={h / 2} fill={c} fontSize={14} fontWeight={600} fontFamily="var(--font-mono)" dominantBaseline="middle">{label}</text>
      </svg>
    )
  }
  const top = y - h - 14
  return (
    <svg className="absolute overflow-visible pointer-events-none" style={{ left: cx - w / 2, top }} width={w} height={20}>
      <line x1={0} x2={w} y1={10} y2={10} stroke={c} strokeWidth={2} />
      <line x1={0} x2={0} y1={4} y2={16} stroke={c} strokeWidth={2} />
      <line x1={w} x2={w} y1={4} y2={16} stroke={c} strokeWidth={2} />
      <text x={w / 2} y={-2} fill={c} fontSize={14} fontWeight={600} fontFamily="var(--font-mono)" textAnchor="middle">{label}</text>
    </svg>
  )
}
