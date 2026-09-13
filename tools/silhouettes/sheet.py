"""Contact sheet: raw render (top) + traced silhouette (bottom) for each seed of an item.
usage: python sheet.py <id> [seeds=4]  -> out/sheet-<id>.png
"""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
item_id = sys.argv[1]; seeds = int(sys.argv[2]) if len(sys.argv) > 2 else 4
cols = []
for n in range(1, seeds + 1):
    raw = HERE / "raw" / f"{item_id}-{n}.png"; pv = HERE / "out" / f"{item_id}-{n}.preview.png"
    if not raw.exists(): continue
    r = Image.open(raw).convert("RGB"); r.thumbnail((240, 240))
    p = Image.open(pv).convert("RGB") if pv.exists() else Image.new("RGB", (240, 240), (255, 200, 200))
    p.thumbnail((240, 300))
    col = Image.new("RGB", (250, 240 + 300 + 30), (225, 225, 225))
    col.paste(r, (5 + (240 - r.width) // 2, 5)); col.paste(p, (5 + (240 - p.width) // 2, 255 + (300 - p.height) // 2))
    d = ImageDraw.Draw(col)
    svg = HERE / "out" / f"{item_id}-{n}.svg"
    if svg.exists():
        import re
        m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg.read_text())
        if m: d.text((8, 552), f"#{n}  aspect {float(m[1]) / float(m[2]):.3f}", fill=(0, 0, 0))
    cols.append(col)
if not cols: sys.exit(f"no renders for {item_id}")
sheet = Image.new("RGB", (sum(c.width for c in cols) + 10, cols[0].height + 10), (200, 200, 200))
x = 5
for c in cols: sheet.paste(c, (x, 5)); x += c.width
out = HERE / "out" / f"sheet-{item_id}.png"; sheet.save(out); print(out)
