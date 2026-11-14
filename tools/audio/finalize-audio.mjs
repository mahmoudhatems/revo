#!/usr/bin/env node
// Convert masters (wav) to in-game mp3 assets, rewrite voice manifest paths,
// and verify every manifest id resolves to an existing file.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SRC = "/home/ubuntu/revo-audio";
const PUB = "/home/ubuntu/revo/public/assets/revo/audio";
const jobs = JSON.parse(fs.readFileSync(path.join(SRC, "vo-jobs.json"), "utf8"));

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

// 1) VO wavs -> mp3 (stereo 44.1k, VBR q2 ~190kbps: transparent for voice)
let n = 0;
for (const j of jobs) {
  const rel = j.wav.replace(SRC + "/vo-master/", "vo/");
  const out = path.join(PUB, rel.replace(/\.wav$/, ".mp3"));
  if (!fs.existsSync(j.wav)) { console.error("MISSING MASTER:", j.wav); continue; }
  ensureDir(path.dirname(out));
  execSync(`ffmpeg -y -v error -i "${j.wav}" -codec:a libmp3lame -q:a 2 -ar 44100 "${out}"`);
  n++;
}
console.log("vo mp3:", n);

// 2) SFX -> mp3 (mono q4)
let s = 0;
const sfxDir = path.join(SRC, "sfx-master");
for (const f of fs.readdirSync(sfxDir).filter(x => x.endsWith(".wav"))) {
  const out = path.join(PUB, "sfx", f.replace(/\.wav$/, ".mp3"));
  ensureDir(path.dirname(out));
  execSync(`ffmpeg -y -v error -i "${path.join(sfxDir, f)}" -codec:a libmp3lame -q:a 4 -ac 1 -ar 44100 "${out}"`);
  s++;
}
console.log("sfx mp3:", s);

// 3) Music loops -> mp3 (stereo q3, keep 8s loopable files as-is: they loop seamlessly)
let m = 0;
const musDir = path.join(SRC, "music-master");
if (fs.existsSync(musDir)) {
  for (const f of fs.readdirSync(musDir).filter(x => /\.(wav|mp3)$/i.test(x))) {
    const out = path.join(PUB, "music", f.replace(/\.wav$/, ".mp3"));
    ensureDir(path.dirname(out));
    if (f.endsWith(".mp3")) { fs.copyFileSync(path.join(musDir, f), out); }
    else {
      execSync(`ffmpeg -y -v error -i "${path.join(musDir, f)}" -codec:a libmp3lame -q:a 3 -ar 44100 "${out}"`);
    }
    m++;
  }
}
console.log("music mp3:", m);

// 4) Rewrite manifest: mp3 paths under /assets/revo/audio/vo/...
const manifestPath = "/home/ubuntu/revo/src/game/content/voice-manifest.json";
const man = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
for (const e of Object.values(man)) {
  for (const k of Object.keys(e)) {
    e[k] = e[k].replace(/^vo\//, "/assets/revo/audio/vo/").replace(/\.wav$/, ".mp3");
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(man, null, 1) + "\n");
console.log("manifest entries:", Object.keys(man).length);

// 5) Verify: every manifest URL exists on disk
let miss = 0;
for (const [id, e] of Object.entries(man)) {
  for (const [k, url] of Object.entries(e)) {
    const p = path.join("/home/ubuntu/revo/public", url);
    if (!fs.existsSync(p)) { console.error("MISSING ASSET:", id, k, url); miss++; }
  }
}
console.log(miss ? `${miss} missing` : "all manifest assets present");
