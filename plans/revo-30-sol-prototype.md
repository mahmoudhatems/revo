# REVO: Playable 30-Sol Pixel-Art UI Prototype (React + Vite + Tailwind)

## 1. Goal and success criteria

Build a browser-playable prototype of the full REVO run: Phase 1 (Missions 1–5, Sol 1–10), Phase 2 (Crises 1–5, Sol 11–26) and Phase 3 (Rover expedition and Ares-2 touchdown, Sol 27–30). It runs as a React prototype in this workspace, not in Phaser. The colony map image works as a clickable hub. The UI is English only.

The prototype is done when:

- A player can go from the title screen to one of the three endings, and every card from the scenario document can be picked.
- Every value in the scenario document (costs, gains, locks, cascades) drives the simulation. Places where the document is ambiguous use the documented interpretations in section 4.2. Each one is isolated in `rules.ts` so it can be changed in one place.
- The whole interface is strictly pixel art. That means crisp edges (`image-rendering: pixelated`), stepped pixel borders, hard drop shadows, a limited palette and pixel fonts. It must have no rounded corners, smooth gradients, blur, glassmorphism, soft shadows or emojis. Scenario emojis are replaced with pixel icons.
- The game works with mouse, touch and keyboard. It is landscape-first and fits screens from desktop down to phones held in landscape. Text is short and readable for ages 7–12.
- Progress is autosaved, so a reload resumes at the last screen boundary.
- Domain tests pass (`pnpm test`), `pnpm build` succeeds, and the code is formatted with `pnpm format`.

Out of scope: Phaser integration, audio, Arabic or RTL, a free-walking character, Tiled maps and deployment.

## 2. Visual system (pixel-art rules)

- **Palette** (from the existing `tokens.js`, extended only with two Mars tones). These are the only colors allowed. They are Tailwind v4 `@theme` colors in `src/index.css`:
  - UI: space `#101827`, panel `#182438`, surface `#24344a`, dgray `#343b45`, white `#e8e8e2`, muted `#8493a8`, orange `#f28c28`, orangeHi `#ffae5c`, orangeLo `#b5611a`, cyan `#36d6e8`, cyanLo `#1c7f8c`, success `#55d68b`, warning `#f2c14e`, danger `#f15b5b`, black `#000000`.
  - Mars tones: mars `#c8542a`, marsLo `#8a3418`.
- **Fonts:** load from a Google Fonts CSS2 `@import`, placed first in `index.css`.
  - "Press Start 2P" for titles, HUD labels and buttons, at multiples of 8px.
  - "Pixelify Sans" for dialogue and body text, so N.E.I.L. lines stay readable for kids.
  - Font smoothing is disabled.
- **Frames:** a `PixelFrame` component makes stepped corners with layered hard `box-shadow` pixel offsets, with no `border-radius`. It has variants `panel`, `inset`, `alert`, `neil` and `locked` (hatched with a 2px hard-stop repeating pattern). All shadows are hard offsets such as `4px 4px 0 #000`.
- **Buttons** (`PixelButton`): default, hover, selected and disabled states, styled to match the pack's HOVER/DEFAULT/SELECTED/DISABLED button sprites. Pressing shifts the button 2px down. Any motion uses `steps()` timing only, never easing.
- **Meters** (`SegmentMeter`): 10 square segments with half-segment support. Colors: green for 4+ bars, yellow for 2–3, red for 0–1. A pixel icon sits beside the meter, plus a passive-drain chip (for example `-0.5/SOL`) that blinks in two steps.
- **Icons:**
  - Copy icons from `REVO_Categorized_Assets/02_32x32_Where_Possible/UI_Icons`: O2, battery, radiation, warning, info, shield, N.E.I.L. face, N.E.I.L. alert face, tools, radar, antenna, mail and badge frames.
  - A `PixelIcon` component draws inline SVG `<rect>` grids for glyphs the pack lacks: sun, drop, heart, thermometer, clock, rover, plant, bed, rocket, lock and fuse.
- **Sprites:**
  - REVO uses `Astronaut_*` frames: helmet frames for EVA and curly-hair frames indoors, animated with a `steps()` cycle.
  - The robot uses `Drone_*` frames.
  - Station animations use the generated water, solar and oxygen sheets and atlas JSON from the changed-files zip.
- **Backgrounds:** zoomed crops of the colony map image on the relevant building, with a hard-edged palette tint and a 2px scanline pattern. They never use blur.
  - Storm, cold, flare and blackout overlays use dithered checkerboard patterns.
- **Motion:** step-based only. Uses include meters ticking one segment at a time, typewriter dialogue, blinking alerts, an integer-pixel screen shake for the CME, and a 4-step black fade between sols.

## 3. Assets

Copy only the files we use into `public/assets/revo/`:

- `map/colony-grid.png`: the colony map image.
- `icons/*`: the selected UI icons.
- `astronaut/*`: the 8–10 frames we need.
- `drone/*`: 4 robot frames.
- `tiles/*`: 4–6 Ground_Tileset tiles for the rover grid (flat, ice, crater and rock looks), picked by inspecting the tiles.
- `stations/*`: the three station sprite sheets plus their JSON.

`src/game/assets.ts` holds typed path constants. `public/assets/revo/ASSETS.md` records the source filename of each copied file and marks the license "UNVERIFIED / pending owner approval", as in the existing manifest. The text-fragment crops in `UI_Elements` are not used.

## 4. Simulation model (pure TypeScript, no React)

### 4.1 State (`src/game/types.ts`)

`GameState`:

- Position: `sol` (1–30), `phase` (`title | p1 | p2 | p3 | ending`), `stepId` (m1–m5, c1–c5, p3) and `screen` (`hub | briefing | decision | result | summary | ...`).
- Meters:
  - `remainingSetupDays` (10 → 0).
  - `power`: net available power bars. It can exceed 10; the HUD shows `clamp(power,0,10)` plus a "+N RESERVE" chip.
  - `waterL` (0–300).
  - `oxygen`, `radiation` and `readiness` (0–10, with 0.5 steps).
- Systems: `grid`, `waterSystem` (`tank|oven|recycler|full`), `heatMode` / `habitatTemp`, `shield` (`hull|soil|water|fortress`), `crop` (`CR03|CR01|CR02|CR04|null`), `greenhouseLocked` and `fitnessUnit`.
- Flags: `pipesInsulated`, `neilOffline` and `peakFitness`.
- Rover: `roverMovePoints`, `roverPos`, `roverPath` and `launchTiming`.
- Ending: `safeModeTriggered`.
- History: `decisions[]` (step, card, sol, deltas) and `logbook[]` (each entry has a label `NASA FACT | REVO MISSION EVENT | GAME SIMULATION`, sol, section, text and `unread`).

### 4.2 Interpretations of ambiguous rules

All of these are named constants in `src/game/rules.ts`, each with a comment citing the scenario section.

1. **Power bars:** after Mission 1, power = grid bars/day − 1 (base load). This matches the doc's "Emergency Grid leaves 5 net power bars". Later `-N Power/Day` system costs and one-time crisis `-N Power` both subtract from `power`. The original kWh values are not shown.
2. **Time:** in Phase 1, sol = 11 − remainingSetupDays. After Mission 5, unspent setup days are skipped to the end of Sol 10. Crises use the doc's fixed sol ranges.
3. **Passive drains are applied per sol advanced:**
   - Oxygen: −0.5 per sol plus the heat-mode output once installed (low +0.5, balanced +1.0, core +1.5, max fills to 10 then +1.0).
   - Radiation: −0.2 per sol, stopping once any shield is built. Skipping the shield then gives 3.4 at Sol 18, as in the doc.
   - Readiness: −0.2 per sol from Sol 1. This gives 6 at Sol 10 when Mission 5 is skipped, as in the doc.
   - Water: −12 L per sol plus recovery (tank 0, oven +4, recycler +9, full +13), capped at 300.
4. **Mission 3:** the "1 Day Total" is the mandatory install day. The mode card adds no extra days.
5. **Mission 5 costs:** crop days, water (bars × 30 L) and power follow the doc's table. Fitness is optional (+1 day, −1 power, +2 readiness). Card 4 includes fitness (3 days total).
   - Crop rewards apply when the crop matures, counted from planting.
   - Lock rules follow the doc exactly: the greenhouse locks if water is tank-only or below 90 L; soybeans need the recycler, 2+ days and 3+ power; with 0 days left everything is skipped.
   - The tank-only dehydration penalty (−2 readiness) applies at Phase 2 start.
6. **Crisis 1 Card 3:** −3 power total with a medium or giant grid, otherwise −9 (−3/day × 3 sols). This makes small grids hit 0, as the doc describes.
7. **Crisis 2:** a `cold` habitat takes an extra −1 readiness and −1 power. `pipesInsulated` is set afterwards.
8. **Crisis 3 Card 1:** water and fortress shields lose 0, soil −1 and hull −3. The fortress shield cancels radiation loss on Cards 2 and 3 too ("immunity even if the hatch isn't sealed").
9. **Crisis 4 fuse:** a config ≤10 A that leaves out MOXIE or the Heater (not covered by the doc) uses the minimal outcome plus −1 oxygen, with an explanation line.
10. **Crisis 5 Card 1:** +3 readiness with the fitness unit, otherwise +1.5. Choosing Card 3 or ending with readiness < 4 sets `peakFitness = false`.
11. **Safe-Mode Capsule:** when power, oxygen, radiation or readiness hits 0, `safeModeTriggered` is set. That meter is restored to 1 bar ("the capsule kept you safe"), an alert and a logbook entry are shown, and the run continues to the Safe-Mode ending.

- Water reaching 0 does not trigger the capsule. It applies a one-time −2 readiness instead.

12. **Endings:**

- Safe-Mode if the capsule was ever triggered.
- Otherwise Legendary if all four meters are ≥ 4 at Sol 30.
- Otherwise Cautious Touchdown.

### 4.3 Engine (`src/game/engine.ts`, `selectors.ts`)

- **Reducer:** `reduce(state, action)` handles `NEW_GAME`, `LOAD`, `GO(screen)`, `CHOOSE_CARD {stepId, cardId, extras}`, `CRISIS_TIMEOUT`, `WIRE_SUBMIT {cables}`, `ROVER_CHARGE`, `ROVER_LAUNCH {timing}`, `ROVER_MOVE {x,y}`, `ACTIVATE_BEACON`, `SLEEP` (advances sols with passive drains and moves to the next step) and `MARK_LOG_READ`.
- **Card effects** are data where possible: `{ days, powerPerDay, power, oxygen, radiation, readiness, waterL, sets }`. Conditional effects use small resolver functions keyed by card id.
- **Selectors:**
  - `availability(card, state)` returns `{locked, reason}` with a kid-friendly reason.
  - `previewDeltas(card, state)` feeds the confirm modal.
  - `meterStatus(value)` and `ending(state)`.
  - `overnightDeltas` for the sleep summary.
- **Content:** `src/game/content/` has one file per step (`m1`–`m5`, `c1`–`c5`, `p3`) plus `facts.ts`. Each step file holds:
  - The N.E.I.L. briefing line, CTA label and location (map building id plus background crop).
  - Cards: title, icon, cost/reward rows, hidden risk, lock rule and animation key.
  - Result lines per card (success and warning variants), the NASA tip and the logbook template.
  - Mission 3's logbook entry lists the amp ratings used by the Crisis 4 fuse box.
- **Text** is taken verbatim from the scenario, with emojis removed and "Rivo" normalized to "REVO" to match the decision log naming.

### 4.4 Save (`src/game/save.ts`)

- The game autosaves to `localStorage` key `revo.save.v1` (versioned) after each action that changes `screen` or `stepId`.
- The title screen shows CONTINUE when a save exists, NEW GAME (with confirmation if it would overwrite a save) and HOW TO PLAY.
- A corrupt or old save is discarded with a notice.

## 5. Screens and flow (`src/ui/`)

`App.tsx` renders `GameProvider` (useReducer, context and autosave) and a fixed 16:9 `Stage` (1280x720 logical units, scaled to fit, letterboxed in the space color). Portrait phones get a pixel "ROTATE DEVICE" panel.

1. **Title:** dithered colony map backdrop, a pixel REVO logo with a hard orange shadow, and the menu.
2. **HUD (top bar during play):**
   - Sol tracker. Phase 1 shows "SOL n / 30 · n SETUP DAYS LEFT"; later phases show "SOL n / 30 · n DAYS UNTIL ARES-2".
   - Meters appear as they are introduced: Power and Water at M1, Oxygen and the Temperature indicator at M3, Radiation at M4, Readiness at M5, and the Rover meter in P3.
   - Clicking a meter opens a popover with its value, the per-sol change and the station that affects it.
   - Right side: Logbook button with an unread badge, Map and Pause.
   - Crisis banners show the DONKI hazard chip, "SIGNAL LOST · OFFLINE" and storm/cold status.
3. **Hub map:**
   - The map image has 8 percentage-positioned hotspots: Greenhouse (top-left), Solar Power (left), Central Command Dome (center), Oxygen & Heating (top-right), Water & Recycling (right), Radiation Shelter / Crew Quarters (bottom-left), Airlock & Rover Garage (bottom-center) and Ares-2 Landing Pad (bottom-right).
   - Hovering or focusing a hotspot shows pixel corner brackets and a name tag.
   - The building for the current step shows a blinking alert marker, and clicking it continues the story.
   - Other buildings open a `StationPanel` with system state, installed equipment (station sprite where available), the related meter and a labeled LEARN fact.
   - N.E.I.L. shows a one-line prompt pointing at the next building. The player returns to the hub after every "Go to Sleep Pod".
4. **Briefing:** cropped building background, REVO sprite, `NeilDialog` (face icon, typewriter text, click to complete) and a big CTA button with a pixel icon.
5. **Decision:**
   - 3–4 `DecisionCard`s show an icon, title, cost rows (clock, bolt and drop icons), reward rows and a hidden risk revealed by an INSPECT toggle.
   - Locked cards show the lock reason.
   - Choosing a card opens a `ConfirmModal` with before → after meters, plus CONFIRM and BACK.
   - M3 adds the mandatory "INSTALL THERMAL HEATER & MOXIE UNIT (-1 DAY)" step first.
   - M5 is a dual decision: crop cards plus a fitness panel, with a live check of the days budget.
6. **Result:**
   - Step animation for the chosen card (sprite sheet or composited pixel effect), with HUD meters ticking.
   - N.E.I.L. tip or its warning variant, and a blinking "NEW LOGBOOK ENTRY" notice.
   - "GO TO SLEEP POD" plays a stepped black fade, shows an "OVERNIGHT" per-sol delta strip and returns to the hub.
7. **Summaries:** the Sol 10 end-of-Phase-1 report card and the Sol 26 Phase 2 completion, each with all meters, the decisions made and the N.E.I.L. announcement.
8. **Crises:**
   - C1: dust dither overlay and an orange solar icon.
   - C2: frost-pixel border.
   - C3: 12-second pixel countdown bar. It pauses while an overlay is open and times out to Card 3.
   - C4: N.E.I.L. is replaced by a red EMERGENCY SYSTEM panel, with a 4-step shake and red lighting.
     - **Fuse Box mini-game:** 4 cable switches (MOXIE 4A, Heater 3A, Shield Pump 2A, LEDs 4A), a 10A gauge, a LOGBOOK shortcut and CONNECT.
     - Outcomes are smart, minimal, overload (spark animation, auto-reset) or the rule-9 fallback.
     - N.E.I.L. returns on reconnection.
   - C5: fatigue pulse on the readiness meter.
9. **Phase 3:**
   - Sol 27 Command Dome: "CHARGE ROVER BATTERY (-2 POWER)", then the automatic fitness check (10 or 8 move points; not at peak fitness costs −1 power and −1 oxygen).
   - Then the launch window choice: MORNING QUIET WINDOW (+1 radiation) or DELAY (−1 oxygen).
   - **Rover grid:**
     - 5x5 pixel tiles with a legend; the rover starts at (0,0) and the beacon is at (4,4).
     - Only orthogonally adjacent tiles are highlighted and clickable, with a cost preview on hover. The move-points meter counts down.
     - Running out of points triggers the robot tow (−2 power, −2 oxygen).
     - Layout, as (col,row): ice at (3,0) and (3,3), mountains at (2,2) and (3,2), plus authored craters. Craters are placed so every shortest 8-move path crosses a non-flat tile, while an all-flat route needs at least 10 moves.
     - Taking a route longer than 8 moves applies the doc's "long detour −2 oxygen". The layout is validated by a test.
10. **Sol 30 finale:**
    - Big red "ACTIVATE LANDING BEACON" button, a pixel radio-wave animation to an Earth icon, the Mission Control quote and the Ares-2 touchdown (sprite drop plus a dust-plume dither).
    - Then the ending tier screen, with medal art from pixel icons and badge frames.
    - The **Final Science Report Card** lists each step's decision, its outcome and its dataset (Mars Trek, MEDA, DONKI, RadLab, OSDR, CSA), plus PLAY AGAIN.
11. **Logbook overlay:** a pixel notebook with tabs (Power, Water, Air & Heat, Shield, Greenhouse & Health, Crises, Facts). Entries carry fact labels, and opening the logbook marks them read.
12. **Pause overlay:** Resume, Logbook, How to Play, Restart (confirmed) and Main Menu. Esc or P toggles it. Any overlay pauses the C3 timer.

## 6. Accessibility and input

- All controls are real `<button>`s with a stepped 2px cyan focus outline.
- Keyboard: 1–4 pick cards, Enter confirms, Esc closes or pauses, arrow keys drive the rover.
- Touch targets are at least 48 logical px.
- `prefers-reduced-motion` turns off shake and blinking (static highlight instead).

## 7. File layout

```
src/
  App.tsx, index.css (font import, @theme palette, pixel utilities in @layer base/utilities)
  game/ types.ts rules.ts engine.ts selectors.ts save.ts assets.ts terrain.ts
        content/ m1..m5.ts c1..c5.ts p3.ts facts.ts index.ts
  ui/ GameProvider.tsx Stage.tsx
      components/ PixelFrame PixelButton PixelIcon SegmentMeter NeilDialog DecisionCard ConfirmModal Overlay SpriteAnim Typewriter
      hud/ Hud MeterPopover CrisisBanner
      screens/ Title HubMap StationPanel Briefing Decision Result PhaseSummary FuseBox RoverPrep RoverGrid Finale Ending ReportCard
      overlays/ Logbook Pause HowToPlay
tests/ engine.test.ts terrain.test.ts endings.test.ts save.test.ts
public/assets/revo/...
```

## 8. Verification

- Add `vitest` as a dev dependency and a `"test": "vitest run"` script.
- Unit tests cover:
  - Each card's deltas.
  - All lock rules.
  - Doc-checked numbers: radiation 3.4 at Sol 18 with no shield, readiness 6 at Sol 10 when M5 is skipped, tank-only water reaching 0 at Sol 25, and Emergency Grid + C1 Card 3 triggering safe mode.
  - Fuse outcomes, terrain path guarantees (BFS), ending tiers and the save round-trip.
- Scripted full playthroughs in tests must each reach a set ending:
  - Optimal path → Legendary: Giant grid, recycler, balanced heat, water shield, potatoes + fitness, cleaning, backup loop, seal hatch, smart wiring, full recovery and an efficient route.
  - Tank-only with the shield skipped → Safe-Mode.
  - A mixed path → Cautious.
  - If the doc's numbers make a target ending unreachable, adjust only the rule-2 constants and report it.
- Run `pnpm test`, `pnpm build` and `pnpm format`. Then check in the running preview that a full playthrough works at 1280x720 and in phone landscape (about 844x390). Confirm no screen has rounded or soft-shadow styling.
