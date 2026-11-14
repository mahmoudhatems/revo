# REVO — submission answers (copy-paste sheet)
**Deadline: Saturday 14 November 2026, 13:00 Cairo time — BOTH the Cairo form and NASA “Submit for Judging”.**

Public links used below (all open with no login):
- Final project (play): https://revo-neon.vercel.app
- Demo deck PDF (7 slides): https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf
- Project document PDF (Cairo): https://revo-neon.vercel.app/demo/REVO-Project-Document.pdf
- Source code: https://github.com/mahmoudhatems/revo (branch `feat/intro-cutscene`)
- [NASA Project page link — paste after Submit for Judging]

---

# Part A — NASA Project page fields

## Project Name
REVO — Mars Colony Survival (Junior Astronaut Mission Trainer)

## High Level Project Summary
REVO is a browser game that turns the 2026 challenge “Build a Junior Astronaut Mission Trainer” into a 20-minute classroom mission. The student commands ARES-2 at Jezero Crater and has 30 sols to build a base, survive five crises, drive a rover expedition and graduate. Every action spends one of five meters — power, water, oxygen, radiation and readiness — so a cheap choice on Sol 3 can cause a blackout on Sol 11. It answers the challenge directly (students run a Martian outpost and balance competing demands) and it uses five NASA data resources to set the ranges. It matters because it makes an abstract engineering trade-off physical for a nine-year-old in a single tap, and it runs anywhere, offline, with no accounts.

## Link to Project Demo
https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf (7 slides, English)

## Link to Final Project
https://revo-neon.vercel.app — open in a private window; NEW GAME starts the run.

## Detailed Project Description
REVO is a single-page web game built with TypeScript, React, Vite and the Web Audio API, deployed as a static site and installable as an offline PWA. The run has four beats: build the base in five missions (solar array, water recycler, oxygen garden, radiation shelter, lab — each a small mini-game), survive five crises between Sols 11 and 26 (dust storm, nitrogen leak, solar particle event, water loss, hull breach), explore the surface in a battery-limited rover expedition on Sols 27–30, and graduate with a report card, a sticker album and one of three endings. Five meters drive everything and are shown as bars a child can read at a glance; below two bars, the companion robot N.E.I.L. speaks a warning, and in Junior Mode the game shortens text, enlarges tap targets and reads aloud. A Safe-Mode capsule replaces hard failure, so a young player recovers and keeps learning.

Main task a judge can try in 60 seconds: open the site, click NEW GAME, skip the intro, play the solar-array mission, press CONTINUE to Sol 11, choose “Robot panel sweep”, and swipe the three dirty panels — power recovers, a sticker unlocks, and the mission report updates.

What works today: the full 30-sol loop, five missions, five crises, the rover expedition, three ending tiers, the sticker album, the science passport, the logbook, “Ask Earth”, Junior Mode, read-aloud, local save and reset, a story intro film, and a credits screen that lists every source and the AI declaration. Verified by a full live playthrough on 14 November 2026 plus 57 automated tests.

Not finished yet: small-phone layout for the surface grid, cloud saves, adaptive difficulty for older students, and the teacher worksheet pack and classroom dashboard. Next: pilot in three Cairo schools, an Arabic voice pack, a teacher dashboard and a mission editor so a class can design its own sol.

Tools: TypeScript, React 19, Vite, Tailwind CSS, Canvas 2D for the dust storm, Web Audio API for mixing, Service Worker for offline, Python and FFmpeg for the asset pipelines, Vitest for tests, Vercel for hosting. No backend and no database requirements.

## NASA Data
Five NASA resources set the numbers and the story, and one partner dataset sets the rations. **Mars Trek** (https://trek.nasa.gov/mars/) provided the Jezero Crater terrain character and crater/dune layout used for the surface tiles and hub map. **MEDA on Perseverance** (https://mars.nasa.gov/mars2020/weather/) supplied dust-opacity, pressure and wind behaviour at Jezero, which set the storm calendar and the solar-output curve; the **InSight weather archive** (https://mars.nasa.gov/insight/weather/) cross-checked the seasonal dust pattern. **DONKI** (https://ccmc.gsfc.nasa.gov/tools/DONKI/) classified the flare/CME timing that the Sol 21 solar particle event is built on. **MSL RAD on Curiosity** (https://mars.nasa.gov/msl/spacecraft/instruments/rad/) gave the surface dose range used to size the radiation meter drain. The **MER Opportunity archive** (https://pds-geosciences.wustl.edu/missions/mer/) supplied the June 2018 global dust-storm timeline that the Sol 11 crisis and the emergency ending follow. Values are deliberately compressed into readable ranges and documented for each meter in the repository (`/docs`, `src/game/content/*`), including where we simplified.

## Space Agency Partner Data and Other References
Canadian Space Agency — Canadian Nutrient File (https://food-nutrition.canada.ca/cnf-fce/): ration and nutrition costs behind the readiness economy. pixelfx (https://github.com/patch-gg/pixelfx, MIT): tornado, fog and confetti sprite sheets, recoloured to our palette. PixelLab (https://www.pixellab.ai): generated pixel storm/VFX sheets, labelled as SI-generated. Google Fonts: Press Start 2P and Pixelify Sans (SIL OFL). Lucide icons (https://lucide.dev, ISC). NASA insignia and the Space Apps Cairo logo are used unmodified for credit/event contexts. Everything else — story, characters, dialogue, level design, code, sprites, stickers, poster and deck — was created by Team REVO, with attribution kept in `docs/CREDITS.md` and in the in-game credits.

## Use of Super Intelligence (AI)
We used SI tools as production assistants; the idea, design, story, pedagogy, data mapping and all testing were decided and done by the team. Manus AI (LLM) assisted with code and build scripts, which the team reviewed, tested and corrected. A studio text-to-speech model performed N.E.I.L.'s 130+ lines (text and direction written by the team; labelled “AI GENERATED” in the credits and tagged in every MP3's metadata). Four music loops were generated with an AI music model and tagged the same way. PixelLab generated the pixel storm/VFX sheets, which the team recoloured and wired into the game (labelled in the credits). AI image generation produced only the artwork in our 7-slide demo deck, captioned “AI-generated artwork (SI)” on the slides that use it. The 29-second intro film was cut, graded and spliced by the team from our own footage using AI-assisted editing tools, with a burned-in on-video label. No NASA logo, flag or mission identifier was generated or altered by SI.

---

# Part B — Cairo Local Submission form

**Email:** the signed-in Google account (record it).
**Team Name:** REVO
**Challenge:** Build a Junior Astronaut Mission Trainer
**Team Leader Name:** Mahmoud Hatem
**Team Leader Email:** [put the leader's email here]
**Have you made changes to the core idea or solution since registration?** Compare with what the team wrote at registration. If the plan said “game / interactive Mars survival”, answer **No**; if the plan was a different idea, answer **Yes** and fill the “New Solution” section.
**Previous Solution Category:** Game
**Current Solution Category:** Game

Then paste, per field (same text as Part A where the field matches): link of the global project page, project demonstration link, final project link, high level summary, project details, NASA data, partner/other data, AI/SI use, and the project documentation PDF link.

---

# Part C — Pre-submit checklist (tick every line)

| # | Check | Status |
|---|---|---|
| 1 | All five members accepted at Cairo, listed on the team page | verify |
| 2 | NASA Project page: every required field, English | do it |
| 3 | Demo ≤ 7 slides, English, public link opens in private window | done |
| 4 | Final project link opens with no login, NEW GAME works | done |
| 5 | Project PDF public, readable, matches the page and this sheet | done |
| 6 | NASA data, sources, licences and AI/SI use explained | done |
| 7 | No images or voices of anyone under 18 in demo or project | verify photos |
| 8 | Cairo form submitted | do it |
| 9 | NASA “Submit for Judging” clicked, success banner seen | do it |
| 10 | Both done before 13:00 Cairo, 14 Nov 2026 | do it |

Two places to submit: the Cairo local form, and NASA Space Apps → My Team → Project → Edit → Submit for Judging. Saving a draft is not submitting.
