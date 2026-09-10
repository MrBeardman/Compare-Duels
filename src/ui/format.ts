/** Human-friendly metric size: 0.0005 → "0.5 mm", 0.18 → "18 cm", 5 → "5.0 m", 12190 → "12.2 km". */
export function formatSize(m: number): string {
  if (m < 0.01) return `${trim(m * 1000, 2)} mm`
  if (m < 1) return `${trim(m * 100, 1)} cm`
  if (m < 1000) return `${m < 10 ? m.toFixed(1) : trim(m, 0)} m`
  return `${trim(m / 1000, 1)} km`
}

function trim(v: number, decimals: number): string {
  const s = v.toFixed(decimals)
  return decimals ? s.replace(/\.?0+$/, '') : s
}

export function formatPoints(p: number): string {
  return p.toLocaleString('en-US')
}
