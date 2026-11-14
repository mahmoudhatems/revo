# REVO — Mars Colony Survival
### Junior Astronaut Mission Trainer · Team REVO · NASA Space Apps Challenge, Cairo 2026

**Live build (no login):** https://revo-neon.vercel.app
**Source code:** https://github.com/mahmoudhatems/revo (branch `feat/intro-cutscene`)
**Demo deck (7 slides):** https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf
**This document (PDF):** https://revo-neon.vercel.app/demo/REVO-Project-Document.pdf

---

## 1. Project identity and summary

**Project name:** REVO — Mars Colony Survival
**Team name:** REVO
**Members:** Mahmoud Hatem · Nourhan Mahmoud · Ahmed Saad · Mohammed Osama · Hanya ElMasry
**Selected 2026 challenge:** *Build a Junior Astronaut Mission Trainer*

REVO is a browser game that turns the "Junior Astronaut Mission Trainer" challenge into a 20-minute classroom-ready mission. A student becomes the commander of ARES-2 at Jezero Crater and has 30 sols to build a base, survive five crises, drive a rover expedition and graduate. Nothing is free: every action spends one of five meters — power, water, oxygen, radiation headroom and readiness. A choice that saves power on Sol 3 can cause a blackout on Sol 11, which is exactly the lesson the challenge asks for: astronauts on a lunar or Martian outpost must balance competing demands, and every decision carries a resource cost that compounds over time.

**Why it matters.** Nine- and ten-year-olds understand "we need power", but they rarely feel the trade-off between power, life support and science. REVO makes that trade-off tactile in a single tap, then mirrors it back as a mission report with stickers — evidence that the lesson landed. Teachers get a no-prep activity that runs on any school laptop or tablet, and keeps working offline after the first visit.

---

## 2. Project details

### 2.1 What the player does
1. **Build (Sols 1–10, five missions):** solar array, water recycler, oxygen garden, radiation shelter and a lab — each mission is a mini-game (wire routing, valve balancing, panel swiping, dial alignment) and each spends resources.
2. **Survive (Sols 11–26, five crises):** a dust storm that halves solar output, a nitrogen leak, a solar particle event, a water loss, and a hull breach. Every crisis offers three operational paths; the story, the meters and the visuals react to the chosen path.
3. **Explore (Sols 27–30):** a grid-based rover expedition with battery limits, signal range and towing risk.
4. **Graduate:** a mission report card, a sticker album and a science passport, then one of three endings (legendary, cautious, emergency) that explains what failed and why.

### 2.2 How it works (systems)
- **Meters are the model.** Power, water, oxygen, radiation and readiness are integers that move on every decision; the HUD converts them to a bar display a child can read at a glance and adds a spoken warning below two bars.
- **N.E.I.L., the companion.** A small rover-brained assistant narrates 130+ voiced clips: briefings, hints, praise, warnings and jokes. It is the difficulty dial too — Junior Mode shortens text, enlarges tap targets and adds read-aloud.
- **Safe-Mode capsule.** A forgiving fail-safe: instead of a hard game over, the player loses sols and comfort, so a young player can recover and keep learning.
- **Stickers as receipts.** Every completed mission unlocks a sticker and a one-line science fact, giving a visible record of progress for parents and teachers.
- **Storm you can see.** A canvas dust-storm layer (three parallax layers, gust events, wind audio) is driven by the same crisis state as the meters, so the world visibly reacts to the choice — the calm path thins the storm, the cheap path thickens it.

### 2.3 Tools, languages and software
- **Front end:** TypeScript, React 19, Vite, Tailwind CSS, custom pixel-art CSS system, Web Audio API, Canvas 2D, Service Worker (offline PWA).
- **Content:** data-driven scenario files (missions, crises, dialogue, stickers) separated from the engine, so teachers or the team can add content without touching code.
- **Build pipeline:** Python scripts for sprite slicing, storm-sheet generation, SFX synthesis (numpy), audio conversion (FFmpeg), and a manifest builder that keeps 130+ voice clips in sync with the dialogue.
- **Quality:** 57 automated engine tests (Vitest), TypeScript strict type-check, production builds verified before submission, manual playthroughs of the full 30-sol loop on desktop and tablet viewports.
- **Deployment:** Vercel, single-page static build with a pinned production branch, installable as a PWA from the browser.

### 2.4 Benefits and goals
- **For students:** feel a real mission trade-off in one turn; learn that resources are coupled (no power means no oxygen scrubbing).
- **For teachers:** a 20-minute session with a printable-style report card at the end; no accounts, no installs, works offline.
- **For parents:** screen time that ends with a conversation instead of a high score.
- **Design goals:** readable at a glance, kind when it fails, replayable in three different operational styles.

### 2.5 What works now — evidence
- The complete 30-sol loop is playable in the live build: base missions, five crises, rover expedition, report card, three ending tiers, sticker album, logbook, "Ask Earth" helper, Junior Mode, read-aloud, save/reset and a credits screen.
- A full playthrough was driven in a real browser session on 14 November 2026: Sol 11 dust-storm crisis → chose "Robot panel sweep" → completed the swipe mini-game → power recovered → sticker unlocked → summary and ending verified.
- 57/57 unit tests pass (`npm test`); `tsc --noEmit` is clean; the production build used for submission is the same commit that is deployed.
- Offline check: after one visit, the service worker serves the app shell and the cached assets with the network disabled (tested in Chromium).
- The 29-second intro film plays inside the game, is skippable, and can be replayed from the title menu.

### 2.6 Limits and unfinished parts (stated plainly)
- Layout is tuned for 1280×960 and larger; on small phones the surface grid needs landscape polish.
- Progress saves to the browser only — no accounts, no cloud sync, so a wiped browser loses the save.
- Voice is AI narration; a few proper nouns required phonetic spelling, and one or two clips still sound slightly synthetic.
- Mini-games are single-difficulty; an adaptive version for older students is designed but not shipped.
- The teacher worksheet pack, classroom dashboard and Arabic voice pack are planned, not built.

---

## 3. NASA data and resources

Values in the meters and the story beats were derived from, or sanity-checked against, the following NASA resources. They are used as **design references and calibration ranges**, not as live operational telemetry — this simplification is deliberate and is documented in the repository (`/docs`, `src/game/content/*`).

| Resource | Link | What we took from it | Where it appears |
|---|---|---|---|
| **Mars Trek** (JPL) | https://trek.nasa.gov/mars/ | Jezero Crater terrain character, crater and dune layouts, elevation layering | Surface tiles, crater field, base-site layout on the hub map |
| **MEDA — Perseverance weather** (JPL) | https://mars.nasa.gov/mars2020/weather/ | Dust opacity and pressure behaviour, wind patterns at Jezero | Storm timing, solar output curve, wind audio intensity |
| **InSight weather archive** (JPL) | https://mars.nasa.gov/insight/weather/ | Cross-check of pressure/dust seasonality | Seasonal drift of the storm calendar |
| **DONKI** (NASA CCMC) | https://ccmc.gsfc.nasa.gov/tools/DONKI/ | Solar flare and CME event classification and timing | Sol 21 solar particle event: warning lead time and severity bands |
| **MSL RAD — Curiosity** (JPL) | https://mars.nasa.gov/msl/spacecraft/instruments/rad/ | Surface radiation dose ranges on Mars | Radiation meter drain per sol and per EVA |
| **MER Opportunity archive** (NASA PDS) | https://pds-geosciences.wustl.edu/missions/mer/ | The June 2018 global dust-storm timeline and its effect on solar power | Sol 11 crisis narrative, "power versus safety" decision, emergency ending text |
| **NASA image library** (visual reference) | https://images.nasa.gov/ | Suit, habitat and rover silhouettes for pixel-art proportions | Character and base sprites |

**NASA dataset requirement:** five NASA resources are used in the build (Mars Trek, MEDA, DONKI, MSL RAD, MER Opportunity archive), which satisfies the "at least one NASA dataset" rule for Global Award eligibility.

---

## 4. Other sources, credits and licences

| Source | Link | Use | Licence / credit |
|---|---|---|---|
| **Canadian Space Agency — Canadian Nutrient File** | https://food-nutrition.canada.ca/cnf-fce/ | Ration and nutrition costs used for the food/readiness economy | Government of Canada open data; credited in-game and here |
| **pixelfx** (open-source pixel FX library) | https://github.com/patch-gg/pixelfx | Tornado, fog, confetti and collect-burst sprite sheets, recoloured to the REVO palette | MIT licence; attribution kept in `docs/CREDITS.md` |
| **PixelLab** | https://www.pixellab.ai | Pixel VFX sheet generation and storm sprite sheets (AI-generated, labelled) | Used under PixelLab terms; labelled as SI-generated |
| **Google Fonts:** Press Start 2P, Pixelify Sans | https://fonts.google.com | UI typography | SIL Open Font License |
| **Lucide icons** | https://lucide.dev | Interface icon set | ISC licence |
| **NASA insignia** | https://www.nasa.gov/nasa-brand-center/ | Event/credit contexts only, unmodified | NASA media usage guidelines |
| **Space Apps Cairo logo** | provided by the local event | Title/credits branding | Event-provided asset |
| **Team-made work** | — | Story, characters, dialogue, level design, code, sprites, stickers, poster, deck, documentation | Team REVO |

All third-party assets are attributed in the repository (`docs/CREDITS.md`) and inside the game's credits screen.

---

## 5. AI and Super Intelligence (SI) use

We used SI tools as production assistants. The challenge idea, the game design, the story, the pedagogical decisions, the data mapping and every acceptance test were decided and performed by the team.

| Tool | Where it was used | What it produced | Label applied |
|---|---|---|---|
| Manus AI agent (LLM) | Code assistance, build scripts, audio pipeline, documentation drafting | Assistance on code and scripts — reviewed, tested and corrected by the team | Declared here and in the repository |
| Studio TTS model (voice "Leda") | N.E.I.L. narration | 130+ spoken clips | "AI GENERATED" in the in-game credits; ID3 comment on every MP3 |
| AI music generation | Four music loops (title, mission, crisis, rover) | Background loops | Declared in credits; ID3 metadata on every file |
| PixelLab image generation | Storm VFX sheets, storm sprite sheets | Pixel art FX and storm frames | Visible label in the credits and on the storm FX documentation |
| AI image generation (deck) | Cover, storm, companion and horizon artwork in the 7-slide demo | Illustrations only — no gameplay screenshots | Caption "AI-generated artwork (SI)" on each slide that uses one |
| AI-assisted film editing | Intro film: cut, grade, loudness and splice of the team's footage | 29-second cutscene | Burned-in on-video label “SI-assisted animation · Team REVO” |

No NASA branding, flags or mission identifiers were generated or modified by SI tools; the NASA insignia used in the game and the deck is the official, unmodified asset.

---

## 6. How to try the project (for judges)

1. Open **https://revo-neon.vercel.app** in a private window — no login, no install.
2. Click **NEW GAME**, watch or skip the 29-second intro.
3. Play the first mission (solar array), then use **CONTINUE** to reach the Sol 11 dust-storm crisis.
4. In the crisis, choose **Robot panel sweep**, then swipe the dirty panels three times: power recovers and a sticker unlocks.
5. Open the **sticker album** and the **science passport** to see the mission report card.
6. Optional: **Junior Mode** and **Read Aloud** are on the title screen; **Credits** lists every source and the SI declaration.

Expected time: 5 minutes to the crisis, 20 minutes for a full 30-sol run.

---

## 7. Verification notes

- Tested browsers: Chrome 130+, Edge 130+, Safari 18 (desktop), iPad Safari (tablet viewport).
- Automated: 57 unit tests, type-check clean, deterministic engine (seeded crisis outcomes for the storm scenario).
- Evidence kept in the repository: `tests/` (test suite), `docs/AUDIO_PROVENANCE.md` (voice provenance), `docs/CREDITS.md` (source list), commit history of the deployed branch.
- The deployed build is the branch `feat/intro-cutscene`, commit recorded in the deployment metadata on Vercel.

---

*Team REVO · NASA Space Apps Challenge, Cairo 2026 · 14 November 2026*
