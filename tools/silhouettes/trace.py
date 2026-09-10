"""Silhouette pipeline: generated PNG on white -> mask -> SVG path + preview.
usage: python trace.py <in.png> <out-basename> [threshold]
Writes <out>.svg (path in a viewBox tightly cropped to the shape) and <out>.preview.png.
"""
import sys, json
import numpy as np
from PIL import Image, ImageFilter
import potrace

src, out = sys.argv[1], sys.argv[2]
thr = int(sys.argv[3]) if len(sys.argv) > 3 else 215

img = Image.open(src).convert('RGBA')
# composite on white in case of alpha, then grayscale
bg = Image.new('RGBA', img.size, (255, 255, 255, 255)); bg.alpha_composite(img)
g = np.asarray(bg.convert('L').filter(ImageFilter.GaussianBlur(0.8)))
mask = g < thr                                   # object = darker than near-white

# keep only the largest connected component (drops stray specks)
from collections import deque
h, w = mask.shape; seen = np.zeros_like(mask, bool); best = None
for y in range(h):
    for x in range(w):
        if mask[y, x] and not seen[y, x]:
            comp = []; dq = deque([(y, x)]); seen[y, x] = True
            while dq:
                cy, cx = dq.popleft(); comp.append((cy, cx))
                for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; dq.append((ny, nx))
            if best is None or len(comp) > len(best): best = comp
clean = np.zeros_like(mask)
ys, xs = zip(*best); clean[list(ys), list(xs)] = True
y0, y1, x0, x1 = min(ys), max(ys) + 1, min(xs), max(xs) + 1
crop = clean[y0:y1, x0:x1]

# Shadow trim: generated renders often leave a thin contact shadow under the object. In the bottom
# band, clip each row to the horizontal span of the object just above the band, then drop bottom
# rows that got much narrower than that span (the shadow's own thickness).
ch0 = crop.shape[0]; band = max(3, int(ch0 * 0.08)); refy = ch0 - band - 1
# 1) intensity: a contact shadow is lighter than the object. In the bottom band keep only pixels
#    about as dark as the object's own body (median of the middle rows + margin).
gc = g[y0:y1, x0:x1]
body = gc[int(ch0 * 0.3):int(ch0 * 0.7)][crop[int(ch0 * 0.3):int(ch0 * 0.7)]]
if len(body):
    dark = np.median(body) + 25
    crop[refy + 1:] &= gc[refy + 1:] < dark
# 2) geometry: the span may widen by at most 1 px per row below the band start.
cols = np.where(crop[refy])[0]
if len(cols):
    lo, hi = int(cols.min()), int(cols.max())
    # walking down, the span may widen by at most 1 px per row: a sudden flare is shadow, not object
    for y in range(refy + 1, ch0):
        rc = np.where(crop[y])[0]
        if not len(rc): break
        lo, hi = max(lo - 1, int(rc.min())), min(hi + 1, int(rc.max()))
        crop[y, :lo] = False; crop[y, hi + 1:] = False
        rc = np.where(crop[y])[0]
        if not len(rc): break
        lo, hi = int(rc.min()), int(rc.max())  # track the actual span so the allowance never accumulates
    # drop the shadow's own thin rows under the object: bottom rows much emptier than the ones above
    for y in range(ch0 - 1, refy, -1):
        if crop[y].sum() < 0.6 * crop[y - 3].sum(): crop[y] = False
        else: break
    ys2 = np.where(crop.any(axis=1))[0]; xs2 = np.where(crop.any(axis=0))[0]
    crop = crop[ys2.min():ys2.max() + 1, xs2.min():xs2.max() + 1]
ch, cw = crop.shape

# trace: potrace wants 1 = black
bmp = potrace.Bitmap(~crop)  # potracer bool convention: True = white; it inverts internally
path = bmp.trace(turdsize=6, alphamax=1.0, opttolerance=0.3)
d = []
for curve in path:
    s = curve.start_point
    d.append(f"M{s.x:.1f} {s.y:.1f}")
    for seg in curve:
        if seg.is_corner:
            d.append(f"L{seg.c.x:.1f} {seg.c.y:.1f} L{seg.end_point.x:.1f} {seg.end_point.y:.1f}")
        else:
            d.append(f"C{seg.c1.x:.1f} {seg.c1.y:.1f} {seg.c2.x:.1f} {seg.c2.y:.1f} {seg.end_point.x:.1f} {seg.end_point.y:.1f}")
    d.append("Z")
pathd = " ".join(d)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cw} {ch}">'
       f'<path d="{pathd}" fill="#000" fill-rule="evenodd"/></svg>')
open(out + '.svg', 'w', encoding='utf-8').write(svg)

# preview: silhouette on white, 400px wide
pv = Image.fromarray(np.where(crop, 0, 255).astype(np.uint8))
pv.thumbnail((400, 400)); pv.save(out + '.preview.png')
print(json.dumps({"src": src, "w": cw, "h": ch, "aspect": round(cw / ch, 3),
                  "fill_frac": round(float(crop.mean()), 3), "svg_bytes": len(svg), "threshold": thr}))
