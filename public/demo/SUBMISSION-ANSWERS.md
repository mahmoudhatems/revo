# REVO — form fill sheet (NASA global page + Cairo local form)
**Copy every value below exactly. English only. Deadline: 14 Nov 2026, 1:00 p.m. Cairo. Save Progress ≠ Submit for Judging.**

Public links (test in a private window first):
- Demo (7 slides, PDF): https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf
- Final project (game): https://revo-neon.vercel.app
- Source: https://github.com/mahmoudhatems/revo
- Project PDF: https://revo-neon.vercel.app/demo/REVO-Project-Document.pdf

---

## A. NASA global page — Project tab

### A1. Project Name
```
REVO — Mars Colony Survival
```

### A2. Summary (138 words — limit is 50–200)
```
REVO is a browser game that turns the 2026 challenge “Build a Junior Astronaut Mission Trainer” into a 20-minute classroom mission. A student commands a Martian outpost at Jezero Crater for 30 sols: five build missions, five crises, a rover expedition and three endings. Every action spends one of five meters — power, water, oxygen, radiation and readiness — so a cheap fix on Sol 3 can cause a blackout on Sol 11. Five NASA sources set the ranges, and a companion robot narrates 131 clips, reads aloud and keeps the tone kind for 8-12 year olds. It runs on any browser, installs offline, needs no login, and ends with a report card and stickers the teacher can read. It matters because it makes a real mission trade-off physical in one tap instead of abstract on a page.
```

### A3. Link to Project Demo
```
https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf
```

### A4. Link to Final Project
```
https://revo-neon.vercel.app
```

### A5. Detailed Project Description (474 words)
```
WHAT IT DOES: REVO is a single-page web game set at Jezero Crater. The run has four beats: build the base in five missions (solar array, water recycler, oxygen garden, radiation shelter, lab), survive five crises between Sol 11 and Sol 26 (dust storm, nitrogen leak, solar particle event, water loss, hull breach), explore with a battery-limited rover on Sols 27-30, then graduate with a report card, a sticker album and one of three endings. Five meters drive everything and are shown as bars a child can read at a glance; below two bars the companion robot N.E.I.L. speaks a warning. Junior Mode shortens text, enlarges targets and reads aloud, and a Safe-Mode capsule replaces hard failure so a young player can recover and keep learning.

BENEFITS AND IMPACT: a 20-minute STEM session with no prep, no accounts and no install; screen time that ends in a conversation; a visible record of learning (stickers + science passport) that a parent or teacher can read.

HOW NASA DATA MADE IT POSSIBLE: Mars Trek shaped the Jezero surface tiles and base sites; MEDA supplied dust, pressure and wind behaviour that set the storm calendar and solar output; DONKI classified the flare timing behind the Sol 21 particle event; MSL RAD sized the radiation meter drain; the MER Opportunity archive supplied the June 2018 dust-storm timeline behind the Sol 11 crisis and the emergency ending. CSA Canadian Nutrient File set the ration costs.

TOOLS: TypeScript, React 19, Vite, Tailwind CSS, Canvas 2D for the dust storm, Web Audio API for mixing, a Service Worker for offline play, Python + NumPy + FFmpeg for the asset pipelines, Vitest for tests, GitHub and Vercel for source and hosting. No backend, no database, no hardware.

CREATIVITY AND FACTORS WE CONSIDERED: the storm on screen is driven by the same state as the meters, so the world visibly reacts to the choice; stickers act as learning receipts; the companion is the difficulty dial. We balanced reading level (short lines, one idea per screen), safety (no gore, no punishment loop), honesty (documented simplifications) and accessibility (read-aloud, large targets, colour plus labels).

TRY IT IN 60 SECONDS: open the site, NEW GAME, skip the intro, play the solar array mission, CONTINUE to Sol 11, choose “Robot panel sweep”, swipe three panels. Power recovers, a sticker unlocks.

WHAT WORKS / WHAT DOES NOT: the full 30-sol loop, all five crises, the rover, three endings, stickers, logbook, Junior Mode and offline install are live and were played through in a browser on 14 November 2026; 57 automated tests pass and the type-check is clean. Not finished: small-phone layout for the surface grid, cloud saves, adaptive difficulty, and the teacher dashboard and worksheet pack.

NEXT: pilot in three Cairo schools, Arabic voice pack, teacher dashboard, a mission editor so a class can design its own sol.
```

### A6. Use of Super Intelligence (SI) — checkboxes
Select **all** of these (do **not** select “I did not use SI”):
- SI used to generate or assist **text** (documentation, deck copy, code comments)
- SI used to generate **images** (pixel VFX sheets, deck artwork)
- SI used to generate **video** (assisted editing of our own footage)
- SI used to generate **audio** (N.E.I.L. voice, four music loops)
- SI used to generate or assist **code** (build scripts, audio pipeline, refactors reviewed by the team)

If a free-text box appears, paste:
```
Manus AI assisted with code, the audio and asset pipelines, documentation and the deck; every output was reviewed, tested and corrected by the team. A studio text-to-speech model performed N.E.I.L.'s 131 lines (text and direction by the team). Four music loops were generated with an AI music model. PixelLab generated pixel VFX sheets, recoloured by the team. AI image generation produced only the artwork in the demo deck. The intro film was cut and graded by the team with AI-assisted editing tools. Labels: visible watermark on generated video, ID3 metadata on all generated audio, captions on generated images, text notes in the credits and docs. No NASA branding, flag or mission identifier was generated or modified.
```

### A7. NASA Data — six rows (Link Text | Link Url)
| Link Text | Link Url |
|---|---|
| Mars Trek — Jezero terrain (NASA JPL) | https://trek.nasa.gov/mars/ |
| MEDA — Perseverance weather at Jezero (NASA JPL) | https://mars.nasa.gov/mars2020/weather/ |
| DONKI — solar flare and CME catalog (NASA CCMC) | https://ccmc.gsfc.nasa.gov/tools/DONKI/ |
| MSL RAD — Curiosity surface radiation (NASA JPL) | https://mars.nasa.gov/msl/spacecraft/instruments/rad/ |
| MER Opportunity archive — 2018 dust storm (NASA PDS) | https://pds-geosciences.wustl.edu/missions/mer/ |
| InSight weather archive — cross-check (NASA JPL) | https://mars.nasa.gov/insight/weather/ |

### A8. Space Agency Partner & Other Data — rows
| Link Text | Link Url |
|---|---|
| Canadian Nutrient File (Canadian Space Agency) | https://food-nutrition.canada.ca/cnf-fce/ |
| pixelfx — pixel FX sprite sheets (MIT) | https://github.com/patch-gg/pixelfx |
| PixelLab — pixel art generation (SI) | https://www.pixellab.ai |
| Manus AI — SI assistant used in development | https://manus.im |
| React | https://react.dev |
| Vite | https://vite.dev |
| TypeScript | https://www.typescriptlang.org |
| Tailwind CSS | https://tailwindcss.com |
| Vitest | https://vitest.dev |
| FFmpeg | https://ffmpeg.org |
| Google Fonts — Press Start 2P, Pixelify Sans (OFL) | https://fonts.google.com |
| Lucide icons (ISC) | https://lucide.dev |
| Vercel — hosting | https://vercel.com |
| NASA insignia — brand center (credit use only) | https://www.nasa.gov/nasa-brand-center/ |

### A9. Verification
Tick both boxes (Terms and Conditions; Confirm All Work is Original). Every outside resource we used is in A7/A8. Then click **Submit for Judging** and wait for the success banner.

---

## B. Cairo local form

| Field | Value |
|---|---|
| Email | the Google account you sign in with |
| Team Name | `REVO` |
| Challenge | `Build a Junior Astronaut Mission Trainer` (exact wording) |
| Team Leader Name | `Mahmoud Hatem` |
| Team Leader Email | [leader email] |
| Core idea changed since registration? | `No` if the team registered a Mars survival game / interactive game; otherwise `Yes` and paste the current idea |
| Previous solution category | `Game` |
| Current solution category | `Game` |
| Global project page link | [paste the NASA project page URL after Save Progress] |
| Project demonstration link | `https://revo-neon.vercel.app/demo/REVO-Demo-7-Slides.pdf` |
| Final project link | `https://revo-neon.vercel.app` |
| High level summary | A2 above |
| Project details | A5 above |
| NASA data | A7 above (paste as text, keep the links) |
| Partner / other data | A8 above |
| AI / SI use | A6 above |
| Project documentation PDF | `https://revo-neon.vercel.app/demo/REVO-Project-Document.pdf` |

---

## C. Why the 7 slides pass the official demo tips

| Official requirement | Where it is in the deck |
|---|---|
| Team name | Slide 1 and 7 — “TEAM REVO” |
| Names of team members | Slide 1 and 7 — five names |
| Challenge selected | Slide 1 — “Challenge 03 · Build a Junior Astronaut Mission Trainer” |
| Display an image of the project | Slides 3 and 4 — live captures of the build |
| Describe the user experience | Slide 4 — brief → choose a path → keep the proof, plus the 60-second task |
| How NASA / partner open data and technology make it possible | Slide 5 (data → meters) and slide 6 (stack + what SI did) |
| Limit words, strong visuals | 7 slides, image-led, ~40 words per slide on average |
| English | all slides |
| 7 slides including title and intro | 7 total, cover is slide 1 |

Judging criteria coverage: Impact (slide 2 + 7), Creativity (3, 4, 6), Validity (5, 6 evidence), Relevance (1, 5), Presentation (whole deck).
