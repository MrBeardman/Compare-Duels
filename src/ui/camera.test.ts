import { describe, it, expect } from 'vitest'
import { CAMERA, fillFraction, gridCellPx, zoomAdjust } from './camera'

const space = { availH: 300, maxW: 200, pairW: 300 }

describe('camera', () => {
  it('fill is the tightest constraint', () => {
    // height-bound
    expect(fillFraction({ w: 50, h: 150 }, [{ w: 50, h: 240 }], space)).toBeCloseTo(0.8)
    // pair-width-bound
    expect(fillFraction({ w: 120, h: 50 }, [{ w: 150, h: 50 }], space)).toBeCloseTo(0.9)
    // single-width-bound
    expect(fillFraction({ w: 10, h: 10 }, [{ w: 190, h: 10 }], space)).toBeCloseTo(0.95)
  })
  it('does nothing inside the comfort band', () => {
    expect(zoomAdjust(0.31)).toBe(1)
    expect(zoomAdjust(0.6)).toBe(1)
    expect(zoomAdjust(0.84)).toBe(1)
  })
  it('re-fits to comfort outside the band', () => {
    expect(zoomAdjust(0.9)).toBeCloseTo(CAMERA.comfort / 0.9)   // zoom out
    expect(zoomAdjust(0.2)).toBeCloseTo(CAMERA.comfort / 0.2)   // zoom in
    expect(zoomAdjust(0)).toBe(1)
  })
  it('is stable: after a re-fit the scene is inside the band, so no second adjustment', () => {
    for (const fill of [0.05, 0.25, 0.86, 1.4, 3]) {
      const after = fill * zoomAdjust(fill)
      expect(after).toBeCloseTo(CAMERA.comfort)
      expect(zoomAdjust(after)).toBe(1)
    }
  })
  it('grid cells snap to power-of-two steps and stay readable', () => {
    for (const z of [0.1, 0.3, 0.7, 1, 1.4, 2.9, 8]) {
      const c = gridCellPx(z)
      expect(c).toBeGreaterThanOrEqual(24 / Math.SQRT2 - 1e-9)
      expect(c).toBeLessThanOrEqual(24 * Math.SQRT2 + 1e-9)
    }
    expect(gridCellPx(1)).toBe(24); expect(gridCellPx(2)).toBe(24); expect(gridCellPx(0.5)).toBe(24)
  })
})
