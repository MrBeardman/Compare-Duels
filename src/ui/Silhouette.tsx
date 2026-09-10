import type { SizeObject } from '../core'

/**
 * Silhouettes. Real shapes come from public/data/silhouettes.json (built from tools/silhouettes/lib);
 * anything without one falls back to a generic placeholder chosen by category + measured axis.
 * Every shape declares its intrinsic aspect (w/h) so the renderer can size the measured axis
 * exactly and let the other follow.
 */
export type Shape = { aspect: number; path: string; box: [number, number]; real?: boolean }

let LIB: Record<string, { w: number; h: number; d: string }> = {}
/** Called once at boot with the manifest; objects whose id has an entry render the real outline. */
export function registerSilhouettes(lib: Record<string, { w: number; h: number; d: string }>) { LIB = lib }
export function hasRealSilhouette(id: string) { return id in LIB }

const SHAPES: Record<string, Shape> = {
  // wide four-legged body, side view (100 × 62)
  quadruped: { aspect: 100 / 62, box: [100, 62], path: 'M8 40 C6 22 20 12 40 12 L64 12 C74 12 80 16 84 22 L96 20 L98 30 L90 36 L86 44 L80 44 L80 58 L72 58 L72 46 L52 46 L52 58 L44 58 L44 46 L24 46 L24 58 L16 58 L16 44 C10 44 8 42 8 40 Z' },
  // upright standing figure / tall animal (40 × 100)
  tall: { aspect: 40 / 100, box: [40, 100], path: 'M20 2 C26 2 30 6 30 12 C30 17 27 20 24 21 L34 40 L34 62 L28 62 L28 96 L22 96 L22 66 L18 66 L18 96 L12 96 L12 62 L6 62 L6 40 L16 21 C13 20 10 17 10 12 C10 6 14 2 20 2 Z' },
  // bird / plane from above: wingspan wide (100 × 36)
  wings: { aspect: 100 / 36, box: [100, 36], path: 'M50 4 C54 4 56 8 56 12 L98 16 L98 20 L58 24 L56 32 L50 34 L44 32 L42 24 L2 20 L2 16 L44 12 C44 8 46 4 50 4 Z' },
  // fish / submarine / long vehicle (100 × 34)
  long: { aspect: 100 / 34, box: [100, 34], path: 'M4 17 C20 4 40 2 66 6 L84 4 L92 2 L88 12 L96 17 L88 22 L92 32 L84 30 L66 28 C40 32 20 30 4 17 Z' },
  // tower / building / bottle (34 × 100)
  tower: { aspect: 34 / 100, box: [34, 100], path: 'M17 2 L21 14 L21 30 L25 34 L25 96 L9 96 L9 34 L13 30 L13 14 Z' },
  // box-ish object / vehicle side view (100 × 48)
  box: { aspect: 100 / 48, box: [100, 48], path: 'M10 36 L12 20 L30 10 L70 10 L88 20 L90 36 L84 36 A6 6 0 0 0 72 36 L28 36 A6 6 0 0 0 16 36 Z M10 36 L90 36 L90 42 L10 42 Z' },
  // round object (100 × 100)
  disc: { aspect: 1, box: [100, 100], path: 'M50 4 A46 46 0 1 1 49.9 4 Z' },
}

export function shapeFor(o: SizeObject): Shape {
  const real = LIB[o.silhouette ?? o.id]
  if (real) return { aspect: real.w / real.h, box: [real.w, real.h], path: real.d, real: true }
  const sub = o.subcategory
  if (o.category === 'animals') {
    if (/bird/.test(sub)) return o.axis === 'width' ? SHAPES.wings : SHAPES.tall
    if (/standing height/.test(o.dimension)) return SHAPES.tall
    if (/fish|marine|invertebrate|reptile|amphibian|insect|arachnid/.test(sub)) return o.axis === 'width' ? SHAPES.long : SHAPES.tower
    return SHAPES.quadruped // mammals & dinosaurs: shoulder height, withers, body length all measure the same side view
  }
  if (o.category === 'vehicles' || o.category === 'space') return o.axis === 'height' ? SHAPES.tower : (/aircraft|plane|boeing|airbus|cessna|helicopter/i.test(o.id) ? SHAPES.wings : SHAPES.box)
  if (/diameter|edge/.test(o.dimension)) return SHAPES.disc
  if (o.axis === 'height') return /human/.test(sub) ? SHAPES.tall : SHAPES.tower
  return SHAPES.box
}

/** Pixel box for an object when its measured axis is `px` pixels long. */
export function pixelBox(o: SizeObject, px: number): { w: number; h: number } {
  const s = shapeFor(o)
  return o.axis === 'height' ? { w: px * s.aspect, h: px } : { w: px, h: px / s.aspect }
}

export function Silhouette({ obj, w, h, color, fillOpacity = 0.2, dashed = false, strokeWidth = 3 }:
  { obj: SizeObject; w: number; h: number; color: string; fillOpacity?: number; dashed?: boolean; strokeWidth?: number }) {
  const s = shapeFor(obj)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${s.box[0]} ${s.box[1]}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <path d={s.path} fill={color} fillOpacity={dashed ? 0 : fillOpacity} stroke={color} fillRule="evenodd"
        strokeWidth={strokeWidth} strokeDasharray={dashed ? '6 5' : undefined} strokeOpacity={dashed ? 0.55 : 1}
        strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
