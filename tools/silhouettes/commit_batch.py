"""
Copy the chosen candidate for every item in a batch's items.json into lib/<id>.svg.
usage: python commit_batch.py <items.json> [overrides.json]
overrides.json: {"id": seedNumber, "id2": null}  -- null means skip (don't copy; leave placeholder).
Default seed is 1 for every item not listed in overrides.
"""
import json, shutil, sys
from pathlib import Path

HERE = Path(__file__).parent

def main():
    items = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    overrides = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')) if len(sys.argv) > 2 else {}
    copied, skipped, missing = 0, 0, 0
    for it in items:
        sid = it['id']
        if sid in overrides and overrides[sid] is None:
            skipped += 1; continue
        seed = overrides.get(sid, 1)
        src = HERE / 'out' / f'{sid}-{seed}.svg'
        if not src.exists():
            print('MISSING:', src); missing += 1; continue
        shutil.copy(src, HERE / 'lib' / f'{sid}.svg')
        copied += 1
    print(f'copied {copied}, skipped {skipped}, missing {missing}')

if __name__ == '__main__':
    main()
