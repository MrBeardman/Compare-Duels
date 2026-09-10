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
