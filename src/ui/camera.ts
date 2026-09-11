/**
 * Adaptive camera for the play grid. The grid keeps its screen size; the pixels-per-unit scale
 * changes so both silhouettes stay comfortably in view. Zoom depends only on what is DISPLAYED
 * (reference + current guess, plus the true outline once revealed), never on the hidden answer.
 */
export interface Box { w: number; h: number }
export interface Space {
  /** vertical room above the ground line */
  availH: number
  /** max width of a single object */
  maxW: number
  /** max combined width of the two objects side by side */
  pairW: number
}

export const CAMERA = {
  /** no zoom change while the tightest constraint is inside this band */
  bandLow: 0.3,
  bandHigh: 0.85,
  /** where the scene settles after a zoom change */
  comfort: 0.66,
  /** per-frame easing toward the target zoom (≈ 0.3 s to settle at 60 fps) */
  ease: 0.14,
  /** never let the reference get smaller than this many px on its measured axis */
  minRefPx: 20,
}

/** Fraction of the available space used by the tightest constraint (1 = touching the edge). */
export function fillFraction(ref: Box, others: Box[], space: Space): number {
  const all = [ref, ...others]
  const maxH = Math.max(...all.map(b => b.h)) / space.availH
  const maxW = Math.max(...all.map(b => b.w)) / space.maxW
  const pair = (ref.w + Math.max(...others.map(b => b.w))) / space.pairW
  return Math.max(maxH, maxW, pair)
}

/**
 * Given the current fill, return the zoom multiplier to apply (1 = keep). Outside the comfort band
 * the scene is re-fitted to `comfort`; inside it nothing changes (hysteresis = no flapping).
 */
export function zoomAdjust(fill: number): number {
  if (!(fill > 0)) return 1
  if (fill > CAMERA.bandHigh || fill < CAMERA.bandLow) return CAMERA.comfort / fill
  return 1
}

/** Grid cell size that follows the zoom but snaps to power-of-two steps, like map zoom levels. */
export function gridCellPx(zoom: number, base = 24): number {
  const k = Math.pow(2, Math.round(Math.log2(Math.max(zoom, 1e-6))))
  return base * zoom / k
}
