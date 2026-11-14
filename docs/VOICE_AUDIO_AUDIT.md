# REVO — Voice, Audio & Feedback Audit (STAGE 1)

Audit of the complete REVO Mars Survival Game source (React 19 + Vite + Tailwind v4, ~10,300 LOC),
performed before the audio overhaul. The game state machine lives in `src/game/engine.ts`; all UI
reads state through `GameProvider` (`src/ui/GameProvider.tsx`) and renders fixed 1280×720 screens
(`src/ui/Stage.tsx`, `src/App.tsx`).

---

## 1. Game structure (inspected, verified against the code — not screen names)

### Screens (`GameState.screen` in `src/game/types.ts`)
`title → hub → briefing → (install | decision | fuse | roverPrep) → (mini-game overlay) → result →
sleep → (summary1 | summary2 | hub) → … → roverLaunch → roverGrid → finale → ending → report`

### Steps (`src/game/content/`)
| Step | Kind | Sol range | Screens used | Mini-games (`MiniGames.tsx miniFor`) |
|---|---|---|---|---|
| m1–m5 | mission | setup (10 days) | hub, briefing, decision, result, sleep | drag, spin, tap, swipe, hold (m3 has a pre-step `install`) |
| c1–c5 | crisis | Sol 11–26 | same + `fuse` for c4 | c2 pre-step `install` (drag coils), c3 swipe lever under countdown, c5 tap/spin |
| p3 | expedition | Sol 27–30 | roverPrep (hold charge), roverLaunch (2 buttons), roverGrid (5×5 tiles), finale (beacon), ending, report | hold |

- **Five crises** with per-crisis overlays (`overlay:` dust/cold/flare/blackout/fatigue/dark) and
  hazard banners (`CrisisBanner` in `Hud.tsx`).
- **Crisis 3** runs a live countdown (`Countdown` in `Decision.tsx`, 15 s / 20 s Junior Mode) that
  dispatches `TIMEOUT` and auto-plays the `hesitate` card.
- **Crisis 4** sets `neilOffline = true` in `OPEN_BRIEFING`; the fuse screen and briefing show the
  offline "SYSTEM MESSAGE" bubble; Ask Earth is disabled (`askEarthEnabled`); `neilOffline` clears
  in `finishChoice`. **Any Neil voice must be suppressed while `neilOffline` is true.**
- **Three endings** (`ending()` in `engine.ts`): `legendary`, `cautious`, `emergency`, rendered by
  `Ending` (`Rover.tsx`). `Report` follows.

### State-changing events relevant to feedback
| Game event | Where it happens (verified) |
|---|---|
| Meter increase/decrease | `applyDeltas` → all reducers via `finishChoice`, `tick`, `ROVER_CHARGE`, `ROVER_LAUNCH`, `arriveAtGoal`, `CONTINUE_SUMMARY` |
| Meter hits 0 → Safe-Mode Capsule | `checkSafeMode` (Sols 1–29): restores 2 bars, adds alert "SAFE-MODE: …", awards `capsule-camper` sticker, logs |
| Meter hits 0 in Phase 3 | `checkSafeMode` → `finalZero` + "Escape Pod" alert → emergency ending |
| Water tank empty | `checkWaterEmpty` → readiness −2 + alert |
| Sticker unlocked | `awardSticker` (card choice, capsule, launch timing, rover-captain); shown as toast on `result` |
| Decision made / outcome graded | `CHOOSE`/`TIMEOUT`/`FUSE_SUBMIT` → `finishChoice` sets `lastOutcome` (`good/warn/bad`), `lastResultText`, `lastDeltas`, then `screen: "result"` |
| Crisis start / end | hub → `OPEN_BRIEFING`/`BRIEFING_CTA` for step c1–c5; resolves through `result → sleep → hub` (`WAKE`) |
| Mission complete | same path for m1–m5; phase ends via `SLEEP→WAKE` on m5/c5 → `summary1/summary2` |
| Rover move (terrain cost) | `ROVER_MOVE` in `roverGrid`; stuck → `arriveAtGoal(towed)`; goal → arrival |
| Towing | `arriveAtGoal(…, towed=true)` → −2 power/−2 oxygen, log |
| Scout / beacon | `USE_SCOUT` (one-shot, 3 s reveal), `ACTIVATE_BEACON` |
| Alert queue | `state.alerts[]` shown by `AlertModal` (`Overlays.tsx`) |
| Ask Earth | HUD button (`Hud.tsx`) → `ASK_EARTH` → 5 s wait panel → `earthTip` |
| Neil hint | HUD NEIL button → `helper {kind:"neil", text: step.neilHint}` |
| Glossary word | `NeilDialog` → `WordPopup` |
| Panels | overlays: logbook, pause, howto, stickers, meter, station, word |
| Settings | `revo.settings.v1` (localStorage): `junior`, `voice` (Read Aloud) |
| Save/load | `revo.save.v1` autosave at screen/step boundaries in `GameProvider` |

## 2. Existing audio implementation

- `src/ui/voice.ts` (65 lines): `lineId(text)` = FNV hash of the **dialogue text** → recorded
  `public/assets/revo/vo/<id>.mp3` if a HEAD request says it exists, else browser
  `speechSynthesis`. `stopSpeaking()` on bubble unmount. Only consumer: `NeilDialog`
  (`Pixel.tsx`) auto-speaks whenever a bubble mounts, plus a manual Speak button (also used by the
  offline bubble). **No recording files exist** (`public/assets/revo/vo/` absent) — today every line
  falls back to the browser's TTS, and only Neil bubbles speak at all.
- **No sound effects, no music, no audio manager, no volume controls.** `Settings` is only
  `{junior, voice}`.
- Fragile references: hash-based ids break when a single word is edited (e.g. several
  `feedbackGood === feedbackWarn` duplicates were clearly authored by copy-paste).
- `NeilDialog` receives already-joined text (`step.neil.join(" ")`), so per-sentence ids are not
  representable today.

## 3. Dialogue inventory (spoken candidates found in source)

| Source | Count | Notes |
|---|---|---|
| `STEPS[*].neil` briefing bubbles | 22 lines (2/step) | ≤ 2 short sentences (Kid Edition rule) |
| `STEPS[*].feedbackGood / feedbackWarn` | 22 fields → 16 unique | 5 steps have identical good/warn (m1, m3, c2, c3, c5); p3 warn empty |
| `STEPS[*].neilHint` | 10 non-empty | c4 hint intentionally empty (offline) |
| `STEPS[*].earthTip` | 10 non-null | Neil relays Mission Control's tip |
| `STEPS[*].cards[*].result` | 32 captions | "see it happen" narration; 3 dynamic variants (c1 drain, c3 no-shield seal, c5 no-gym) + 4 fuse outcomes |
| Install screens (m3, c2) | 2 | hardcoded in `Decision.tsx Install()` |
| Hub prompts (welcome / next / signal lost) | 3 | hardcoded in `HubMap.tsx`; offline prompt must not use Neil voice |
| Rover screens | 9 | prep ×3, launch ×1, grid ×1, finale ×2 (+ SIGNAL text-only, EARTH message text-only), report ×1, towing note |
| Ending texts ×3 + capsule/escape alerts | 5 | `ENDINGS` in `Rover.tsx`; alert strings built in `engine.ts` (`SAFE-MODE`, `ESCAPE POD`, `water empty`, `thirsty`) |
| Not to be voiced (labels, card rows, logbook, did-you-know, glossary, UI chrome) | ~300 | per spec §4: do not read every UI label |

**≈ 115 authored story lines.** No variation system exists — every replay is identical, and the
same line repeats across the 30 Sols (e.g. C1's `feedbackWarn` doubles as the Safe-Mode narration).

## 4. Gaps and requirements

1. **Stable semantic voice ids** replacing `lineId(text)` (§12 of the brief): `neil.<scope>.<ctx>.<nn>`,
   central manifest (id, exact text, file, emotion, priority, variation group).
2. **Audio manager** with categories (voice/sfx/music), volumes, mutes, master volume, priority &
   interruption rules, queue (max 1 pending line), ducking, rate limiting, dedupe, cleanup on
   screen change, missing-file fallback to `speechSynthesis`, browser autoplay unlock.
3. **Central feedback event bus** driven by confirmed reducer transitions + explicit interaction
   hooks — not render diffs of arbitrary components. React StrictMode double-invokes reducers and
   updaters, so detection must be deduped (committed-state diff inside `GameProvider` effect,
   event-key guard for imperative emits).
4. **Presentation**: meter float indicators (+/− chips), meter fill/critical animation, card
   select/confirm/lock animation, sticker sparkle, alert flashes, crisis ambience overlays,
   terrain-specific rover movement sfx (rate limited), Ask Earth radio sequence, ending stingers.
5. **Neil reaction pools** (contextual variation, no consecutive duplicates) for: good pick,
   caution, mistake (kind), mission complete, sticker, resource-low (per meter), relief, unlock,
   surprise, return-to-colony, rover events.
6. **Settings UI + persistence**: Master/Voice/SFX/Music volumes, Voice/SFX/Music on-off,
   Read Aloud integrated (it becomes the Neil-voice master), Junior Mode preserved. Migrate
   `revo.settings.v1 → v2` without touching `revo.save.v1`.
7. **Crisis 4 offline rule**: system bubbles keep text + manual speak button (accessibility), but
   auto-play is replaced by radio-static SFX; Neil pools/ducking never fire while `neilOffline`.
8. **No gameplay changes**: all deltas, rules, stickers, endings, save formats remain untouched —
   audio hooks only observe transitions and present feedback.
9. **Missing assets** today: `public/assets/revo/vo/**`, `sfx/**`, `music/**` — all to be produced.
10. Tests exist for engine/save/surface (`tests/*.test.ts`, vitest) and must keep passing; add
    manifest + feedback-detection tests that don't require WebAudio.

## 5. Production plan (feeds STAGE 2/3)

- **Voice**: single consistent character (studio voice, medium pitch, bright/warm, youthful
  delivery), per-line emotion styles, one MP3 per manifest id at
  `public/assets/revo/vo/neil/<path>.mp3` (mono 44.1 kHz, loudness-normalised, trimmed).
- **SFX**: original, procedurally synthesised chiptune/futurist kit (no copyrighted material) in
  `public/assets/revo/sfx/`, plus seamless ambience loops (wind, habitat, static, rover motor).
- **Music**: 4 original loops (title/colony, mission-calm, crisis-tension, rover-exploration) in
  `public/assets/revo/music/`; ending identities covered by stingers.
- **Code**: `src/ui/audio.ts` (engine), `src/ui/feedback.ts` (events + mapping),
  `src/game/content/voice.ts` (manifest + pools), `src/ui/voice.ts` (refacade), settings &
  presentation updates in `GameProvider`, `Hud`, `Pixel`, `Decision`, `Result`, `Rover`,
  `MiniGames`, `Overlays`, `Title`, `HubMap`, `Fuse`, `Briefing`, `Summary`, `index.css`.
