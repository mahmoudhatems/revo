# Audio provenance — REVO

All spoken audio in REVO (character N.E.I.L.) is **SI-generated** with a studio text-to-speech model (voice "Leda"), directed by the team: every line's text, tone, pacing and emphasis were written and edited by Team REVO; the model performed the voice.

- Files: `public/assets/revo/vo/neil/**/*.mp3` (130+ clips, chained into longer lines at runtime).
- Metadata: each file carries `comment = "SI-generated audio (AI). Team REVO, NASA Space Apps Cairo 2026."`, `artist = "Team REVO"`, `album = "REVO - Mars Colony Survival"`.
- In-game label: the credits screen states "VOICE OF N.E.I.L. · AI GENERATED".
- Music: four loops (`public/assets/revo/music/*.mp3`) generated with an AI music model, mixed and looped by the team; tagged the same way.
- Sound effects: 92 clips synthesised procedurally by the team with Python/NumPy (`tools/audio/synth_sfx.py`) — not AI-generated.
- Pronunciation handling: a small respelling layer in `tools/audio/authored-lines.json` replaces tokens such as "NASA" or "Jezero" before synthesis, so the model says them correctly.
- Tempo/loudness: normalised to -16 LUFS for voice, -20 LUFS for music beds, ducking applied during speech.
