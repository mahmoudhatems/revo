# REVO audio pipeline (MD audio 1.0)

Recorded assets are already in `public/assets/revo/{vo/neil,sfx,music}` and wired at
runtime by `src/ui/voice.ts` (manifest text matching) and `src/ui/audio.ts` (SFX + music).

## Manifest
`src/game/content/voice/manifest.json` lists every authored line:
`{ id, text, file, emotion, priority, group, play, context, offline, record }`.
`text` must match the in-game bubble text (case/space-insensitive). The voice player
also matches bubbles that concatenate several authored sentences and queues them.

## Rebuilding the pipeline (optional, needs the masters folder)
1. `tools/audio/authored-lines.json` — authored script pools (hub, rover, alerts, endings).
2. `node --experimental-strip-types --no-warnings tools/audio/build-manifest.mjs`
   regenerates the manifest from content + authored lines (run from the project root).
3. Voice masters were produced with the Manus `generate_speech` MCP (voice: Leda,
   en-US-US variant) into `vo-master/<group>/*.wav`; music loops via `generate_music`;
   SFX via `python3 tools/audio/synth_sfx.py` (numpy, 92 chiptune effects).
4. `node tools/audio/finalize-audio.mjs` converts all masters to mono 96 kbps MP3 with
   fade-in / loop crossfade and writes them under `public/assets/revo/audio/…`;
   then move them to the manifest layout (`vo/neil/…`, `sfx/…`, `music/…`).

Volumes: music 0.30, sfx 0.55, VO full-scale; music ducks to ~4% while Neil talks.
Intro sting plays once per browser profile (`localStorage revo.intro.v1`).
