# REVO — Mars Dust Storm FX implementation report (MD fx 2.0)

## 1. Assets used
**Uploaded PixelLab pack (storm.zip, originals untouched)** — sliced by
`tools/fx/slice_storm_assets.py` into `public/assets/revo/storm_lab/` (44 frames):
- `swirl_0..5` — 6-frame dust vortex swirls (mid layer, spinning)
- `billow_0..5` — atmospheric dust clouds (far layer, parallax)
- `tornado_0..5` — small orange tornado walk cycles (ground-level events)
- `devil_0..5` — bigger dust devils
- `debris_0..5` — one-shot debris burst (played on hard gusts)
- `curtain_0..1` — horizontal dust bands (fast near veils)
- `specks_0..5` — floating grit clusters
- `gust_0..5` — 6-frame wind gust curls (one-shot, cross-screen, from
  `wind_gust_revo_spritesheet.png`, mid row 384..768)

**pixelgame.io effects library** (open-source engine behind the page:
github patch-gg/pixelfx, MIT) rendered with `node tools/render.mjs <id> --sheet
--no-actor --opts JSON` into `public/assets/revo/fx_lib/` (PNG sheet + JSON frames):
- `tornado` — 20-frame hero tornado, recolored to REVO Mars palette
- `fog` — 48-frame dithered haze, recolored (distance-fog band)
- `confetti` + `collect-burst` — sticker unlock celebration

Skipped uploaded assets: the grey/white tornado sheet and `images (4).png`
(white tornado on opaque gray background) — palette conflicts with REVO's art
direction and the orange PixelLab tornado covers the same role.
Placeholders from the pre-upload step remain in `public/assets/revo/storm/`
unused (kept as fallback for assetless checkouts); generator: `tools/fx/make_storm_sprites.py`.

## 2. Files created / modified
- created `src/fx/FxSheet.ts` — pixelfx sheet+JSON loader (cached, fails soft)
- created `src/fx/DustStorm.tsx` — reusable layered storm engine (one `level` prop)
- created `src/fx/StickerFx.tsx` — sticker unlock celebration overlay
- created `tools/fx/slice_storm_assets.py`, `docs/storm_frames_montage.png`
- modified `src/App.tsx` — storm trigger from existing c1 state + gust/level → audio
- modified `src/ui/audio.ts` — `setWind(level)` ambience channel (duck-aware, gesture-safe)
- modified `src/ui/screens/Result.tsx` — mounts StickerFx when `lastStickers` is non-empty

## 3. Three phases
Phase A (briefing) `level 0.35`: light wash + few billows, wind at 35%, gusts rare.
Phase B (decision/install/result) `0.8–1.0`: dense layered particles, gust bursts
(gust curls + debris + shake + wind_gust/gust_hard), dust devils/tornado crossings,
hero pixelfx tornado at ≥0.95, fog band dims far objects while near structures stay crisp.
Phase C (leaving the crisis) `target 0`: same easing path (τ≈3.5 s fall) thins particles,
ends tornadoes naturally (instances finish their crossing), fog/wash fade out.
All transitions are exponential eases — no jumps. `?storm=0..1` forces a level for testing.

## 4. Scenario integration
Trigger reads only existing state: `STEP_ORDER[stepIndex] === "c1"` ("THE OPPORTUNITY
DUST STORM", Sol 11–13) plus `screen` and `lastChoice` — result level reacts to the
chosen path (Robot Sweep 0.85 loses grip, Hibernation 0.95, Full Ops 1.0).
No gameplay/battery/resource/outcome logic changed (engine untouched, 57/57 tests pass).
Indoor/outdoor: canvas z-[5] sits above surface art and below every z-10+ panel;
dialogs, cards, meters and minigames were screenshot-verified readable at full storm.
Audio respects READ ALOUD: the wind ducks 30% while Neil speaks and respects the
autoplay policy like music.

## 5. Limitations
- Uploaded `images (4).png` and the white tornado sheet unused (palette mismatch; explained above).
- Storm is a screen-space overlay (2.5D parallax), not per-object occlusion — depth is faked
  with fog band + parallax + haze, consistent with the current canvas DOM renderer
  (the game is React+canvas, not Phaser as assumed in the task doc).
- Tornado hero event needs level ≥0.95 (peak of Phase B only).

## 6. Build & test results
`tsc --noEmit` clean · `vite build` clean · 57/57 vitest pass ·
live browser: phases A/B verified on real c1 save, gust sfx + amb_wind + VO ducking,
sticker unlock → confetti + collect-burst + sounds → album shows STORM SWEEPER,
particle motion probe (5351/7680 px changed/350ms) confirms animation at 60 fps,
no console errors; storm canvas fully unmounted-safe (rAF + pools released in effect cleanup).
