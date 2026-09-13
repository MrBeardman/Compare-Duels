"""
Compact review grid: one seed (default #1) per item, many items per page, for fast eyeballing.
usage: python index_sheet.py <items.json> [seed=1] [cols=8] [page_size=64]
Writes out/index-<items-stem>-<page>.png
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent

def main():
    items_path = Path(sys.argv[1])
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    page_size = int(sys.argv[4]) if len(sys.argv) > 4 else 64
    items = json.loads(items_path.read_text(encoding='utf-8'))
    cell, pad, label_h = 130, 8, 28
    try: font = ImageFont.truetype('DejaVuSans.ttf', 12)
    except Exception: font = ImageFont.load_default()

    pages = [items[i:i + page_size] for i in range(0, len(items), page_size)]
    for pi, page in enumerate(pages):
        rows = (len(page) + cols - 1) // cols
        w, h = cols * (cell + pad) + pad, rows * (cell + label_h + pad) + pad
        img = Image.new('RGB', (w, h), 'white')
        draw = ImageDraw.Draw(img)
        for i, it in enumerate(page):
            r, c = divmod(i, cols)
            x, y = pad + c * (cell + pad), pad + r * (cell + label_h + pad)
            prev = HERE / 'out' / f"{it['id']}-{seed}.preview.png"
            draw.rectangle([x, y, x + cell, y + cell], outline='#ccc')
            if prev.exists():
                im = Image.open(prev).convert('RGBA')
                bg = Image.new('RGBA', im.size, 'white'); bg.paste(im, (0, 0), im)
                im = bg.convert('RGB')
                im.thumbnail((cell - 4, cell - 4))
                img.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
            else:
                draw.text((x + 4, y + cell // 2), 'MISSING', fill='red', font=font)
            draw.text((x, y + cell + 2), it['id'][:20], fill='black', font=font)
        out = HERE / 'out' / f"index-{items_path.stem}-{pi}.png"
        img.save(out)
        print(f'{out} ({len(page)} items)')

if __name__ == '__main__':
    main()
