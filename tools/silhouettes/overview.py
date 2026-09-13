"""Overview grid of traced silhouettes for a batch: one row per item, one column per seed.
usage: python overview.py <items.json> [seeds=4] -> out/overview-<batchname>.png
"""
import sys, json, re
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
items = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
seeds = int(sys.argv[2]) if len(sys.argv) > 2 else 4
CELL, LBL = 170, 22
sheet = Image.new("RGB", (120 + seeds * CELL, len(items) * (CELL + LBL) + 10), (215, 215, 215))
d = ImageDraw.Draw(sheet)
for r, it in enumerate(items):
    y = 5 + r * (CELL + LBL)
    d.text((6, y + CELL // 2), it["id"], fill=(0, 0, 0))
    for n in range(1, seeds + 1):
        x = 120 + (n - 1) * CELL
        pv = HERE / "out" / f"{it['id']}-{n}.preview.png"; svg = HERE / "out" / f"{it['id']}-{n}.svg"
        d.rectangle([x, y, x + CELL - 4, y + CELL - 4], fill=(255, 255, 255))
        if pv.exists():
            p = Image.open(pv).convert("RGB"); p.thumbnail((CELL - 16, CELL - 16))
            sheet.paste(p, (x + (CELL - 4 - p.width) // 2, y + (CELL - 4 - p.height) // 2))
        if svg.exists():
            m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg.read_text())
            if m: d.text((x + 4, y + CELL - 2), f"#{n} {float(m[1]) / float(m[2]):.2f}", fill=(40, 40, 40))
out = HERE / "out" / f"overview-{Path(sys.argv[1]).stem}.png"; sheet.save(out); print(out)
