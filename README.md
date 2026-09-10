# SIZEGAME (working title)

A size-estimation web game. Each round shows a **reference** silhouette (blue, drawn at true scale, size shown) and a **target** (red, random scale, size hidden). Resize the target until it looks right, lock in before the timer runs out, and see how close you were. Three big misses end the run.

Built for CrazyGames first (mobile portrait, one tap to gameplay), then Poki / YouTube Playables from the same bundle.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # core logic tests (vitest)
npm run build        # production bundle in dist/, relative paths (CrazyGames requirement)
npm run shots        # headless walkthrough at 390×844 and 1280×800 → shots/, fails on console errors
npm run build:pool   # data/curated.csv → public/data/pool.json
```

Append `?cg=1` to the URL to force the CrazyGames SDK adapter locally; otherwise the mock platform is used.

## Layout

```
src/core/       pure TypeScript, no DOM. Deterministic and unit-tested.
  rng.ts        mulberry32 + string hash → seeds (dailies, ghosts)
  scoring.ts    accuracy 0–100, bands, points, difficulty curve
  pairs.ts      reference/target selection with escalation (tier, ratio window, cross-category)
  run.ts        run state machine: startRound → submitGuess → nextRound; ghostOf()
src/platform/   CrazyGames SDK v3 adapter + mock (ads, gameplay events, data, invite links)
src/ui/         React screens: Home, PlayScreen, Summary; Silhouette placeholders; formatting
src/index.css   Field Kit design tokens (light + dark), Tailwind v4 theme
data/           curated object list (CSV) → public/data/pool.json
scripts/        build-pool.mjs, shots.mjs
```

## Scoring

`accuracy = max(0, 100 − 100·|log2(guess / true)|)` — symmetric, exact = 100, double or half = 0 (a miss, costs a life).
Bands: Bullseye 95+ · Close 80–94 · Not bad 50–79 · Way off 1–49 · Miss 0.
Points = accuracy × (8 + round/3) × streak bonus; the ladder ranks on points, the player reads accuracy.

## Rendering rule (no information leaks)

The reference's pixel size depends only on the grid, never on the target. The renderer always reserves room for a target up to `maxRatio` (3.5×) and pairs are chosen inside `[minRatio, maxRatio]`, so nothing on screen hints at the answer. The target's starting size is random and never within 15% of the truth. No numeric scale is shown during a round; measurements appear only at reveal.

## Status

Playable prototype with placeholder silhouettes and the curated pool (434 objects). Next: silhouette library, Wikidata pool ingestion, ghost duels, ladder, stats, dark mode toggle.
