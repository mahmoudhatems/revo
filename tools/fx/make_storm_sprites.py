#!/usr/bin/env python3
"""REVO dust-storm sprite set (MD fx 1.0).

The storm asset pack referenced by the design doc was not uploaded with the task,
so these placeholders match REVO's existing pixel palette (sampled from
public/assets/revo/surface/ground_base.png) with hard-edged, dithered alpha like
the rest of the art. Rerun any time:  python3 tools/fx/make_storm_sprites.py
Outputs: public/assets/revo/storm/{cloud_0..3, wisp_0..1, speck, haze}.png
"""
import os
import random
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "assets", "revo", "storm")
os.makedirs(OUT, exist_ok=True)

# Dust palette pulled from the Mars tiles (warm ochres, no blues).
CORE = (232, 177, 120)   # lit dust
MID = (217, 139, 74)     # body
DARK = (169, 90, 40)     # shaded edge
SHADOW = (122, 61, 28)   # deep edge
LIT = (242, 208, 160)    # sun-lit rim

random.seed(7)


def dither_alpha(v: float, x: int, y: int) -> int:
    """Solid core, Bayer-dithered rim only (classic pixel-art puff)."""
    if v > 0.55:
        return 255
    bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y % 4][x % 4] / 16.0
    if v > 0.28:
        return 255 if v > bayer else 128
    return 128 if v > bayer * 0.45 else 0


def shade(r: float) -> tuple:
    """Colour by relative radius r in 0..1 (0 = core)."""
    if r < 0.30:
        return CORE
    if r < 0.55:
        return MID
    if r < 0.80:
        return DARK
    return SHADOW


def make_cloud(seed: int) -> Image.Image:
    """64x40 billowing puff: 3 lobes, dithered edges, ragged per frame."""
    rng = random.Random(seed)
    w, h = 64, 40
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    lobes = [(20 + rng.randint(-4, 4), 24 + rng.randint(-3, 3), 13 + rng.randint(-2, 2)),
             (36 + rng.randint(-4, 4), 18 + rng.randint(-3, 3), 11 + rng.randint(-2, 3))]
    lobes.append((rng.choice([12, 48 + rng.randint(-3, 3)]), 26 + rng.randint(-2, 2), 9 + rng.randint(-1, 3)))
    for y in range(h):
        for x in range(w):
            best_v, best_r = 0.0, 1.0
            for (cx, cy, cr) in lobes:
                cr = cr * 1.35
                # wobble the rim per frame so billows morph
                ang = (x - cx) * 0.35 + (y - cy) * 0.21 + seed * 1.7
                rr = cr * (1.0 + 0.13 * ((int(ang * 1000) % 7) - 3) / 3.0)
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if rr > 0:
                    v = max(0.0, 1.0 - d / rr)
                    if v > best_v:
                        best_v, best_r = v, min(1.0, d / rr)
            if best_v <= 0:
                continue
            a = dither_alpha(best_v, x, y)
            if a:
                col = shade(best_r)
                # sun rim on upper-left of big lobe
                if best_r < 0.28 and x - lobes[1][0] + (lobes[1][1] - y) < -2:
                    col = LIT
                px[x, y] = (col[0], col[1], col[2], a)
    return img


def make_wisp(seed: int) -> Image.Image:
    """48x10 streak of sand grains, denser at centre-left, tapered ends."""
    rng = random.Random(100 + seed)
    w, h = 48, 10
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for i in range(160):
        x = rng.randrange(w)
        t = x / w  # taper both ends
        if rng.random() > (0.25 + 0.75 * (1 - abs(t - 0.35) * 1.8)):
            continue
        y = rng.randrange(2, 8)
        dy = abs(y - 5) / 5.0
        a = dither_alpha(1.0 - dy * 0.8 - t * 0.25, x, y)
        if a:
            col = rng.choice([CORE, MID, LIT])
            px[x, y] = (col[0], col[1], col[2], a)
    # a couple of bright lead grains
    for (x, y) in [(4 + seed % 3, 4), (10 + seed * 2 % 5, 5)]:
        px[x, y] = (LIT[0], LIT[1], LIT[2], 255)
    return img


def make_speck() -> Image.Image:
    img = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    px = img.load()
    px[1, 2] = (MID[0], MID[1], MID[2], 255)
    px[2, 2] = (CORE[0], CORE[1], CORE[2], 255)
    px[2, 1] = (LIT[0], LIT[1], LIT[2], 180)
    return img


def make_haze() -> Image.Image:
    """128x48 soft band for distance fog, low-alpha dither, transparent edges."""
    rng = random.Random(42)
    w, h = 128, 48
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        vfade = 1.0 - abs(y - h * 0.55) / (h * 0.55)
        for x in range(w):
            xf = min(x, w - x) / (w * 0.5)
            n = 0.72 + 0.28 * rng.random()
            v = max(0.0, vfade) * max(0.0, min(1.0, xf)) * n * 0.85
            a = dither_alpha(v, x, y)
            if a:
                col = rng.choice([MID, CORE, DARK])
                px[x, y] = (col[0], col[1], col[2], int(a * 0.55))
    return img


names = []
for i in range(4):
    make_cloud(1000 + i * 37).save(os.path.join(OUT, f"cloud_{i}.png"))
    names.append(f"cloud_{i}.png")
for i in range(2):
    make_wisp(i).save(os.path.join(OUT, f"wisp_{i}.png"))
    names.append(f"wisp_{i}.png")
make_speck().save(os.path.join(OUT, "speck.png"))
make_haze().save(os.path.join(OUT, "haze.png"))
names += ["speck.png", "haze.png"]
print("wrote", len(names), "sprites ->", OUT)
for n in names:
    p = os.path.join(OUT, n)
    im = Image.open(p)
    print(f"  {n:14s} {im.size[0]}x{im.size[1]} {os.path.getsize(p)}B")
