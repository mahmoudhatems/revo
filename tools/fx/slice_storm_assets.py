#!/usr/bin/env python3
"""Slice the uploaded PixelLab storm sheets into per-frame transparent PNGs.

Source sheets (untouched originals): /home/ubuntu/upload/storm/storm/*.png
Output: public/assets/revo/storm_lab/<name>_0..N.png (tight-cropped, NEAREST-safe)

Run:  python3 tools/fx/slice_storm_assets.py [SRC_DIR]
"""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/ubuntu/upload/storm/storm"
OUT = os.path.join(ROOT, "public", "assets", "revo", "storm_lab")
os.makedirs(OUT, exist_ok=True)


def cells(im, cols, rows, y0=None, y1=None):
    w, h = im.size
    cw = w / cols
    ch = h / rows
    for r in range(rows):
        for c in range(cols):
            top = int(round(r * ch)) if y0 is None else y0
            bot = int(round((r + 1) * ch)) if y1 is None else y1
            box = (int(round(c * cw)), top, int(round((c + 1) * cw)), bot)
            yield box


def emit(im, name, cols, rows, y0=None, y1=None, min_px=4):
    made = 0
    for i, box in enumerate(cells(im, cols, rows, y0, y1)):
        cell = im.crop(box)
        bb = cell.getbbox()
        if not bb:
            continue
        cell = cell.crop(bb)
        if cell.width < 2 or cell.height < 2:
            continue
        # keep pixel crispness; drop fully transparent noise border only
        cell.save(os.path.join(OUT, f"{name}_{made}.png"))
        made += 1
        if made >= min(12, cols * rows):
            break
    print(f"  {name}: {made} frames")
    return made


JOBS = [
    # (file, out name, cols, rows, y-band or None)
    ("pixellab-Create-a-6-frame-pixel-art-ani-1794445444629.png", "swirl", 3, 2),      # 6-frame dust swirls
    ("pixellab-Create-a-6-frame-pixel-art-atm-1794446029907.png", "billow", 3, 2),     # atmospheric cloud puffs
    ("pixellab-Create-a-production-ready-2D-p-1794445660182.png", "tornado", 6, 1),    # orange tornado walk cycle
    ("pixellab-Create-a-production-ready-pixe-1794443270169.png", "devil", 3, 2),      # dust devils / vortex mix
    ("pixellab-Create-a-production-ready-pixe-1794444747660.png", "debris", 6, 1),     # one-shot debris burst
    ("pixellab-Create-a-production-ready-pixe-1794444977276.png", "curtain", 2, 1),    # dust band / veil
    ("pixellab-Create-a-production-ready-pixe-1794442969326.png", "specks", 3, 2),     # floating debris clusters
    ("wind_gust_revo_spritesheet.png", "gust", 6, 1, 384, 768),                        # 6-frame gust curls (mid row)
]

total = 0
for f, name, cols, rows, *band in JOBS:
    path = os.path.join(SRC, f)
    if not os.path.exists(path):
        print(f"  MISSING {f}")
        continue
    im = Image.open(path).convert("RGBA")
    y0 = band[0] if band else None
    y1 = band[1] if len(band) > 1 else None
    total += emit(im, name, cols, rows, y0, y1)

# quick montage for eyeballing
files = sorted(os.listdir(OUT))
cols = 6
cw = 110
rows_n = (len(files) + cols - 1) // cols
mont = Image.new("RGBA", (cols * cw, rows_n * cw), (40, 60, 40, 255))
for i, fn in enumerate(files):
    im = Image.open(os.path.join(OUT, fn))
    s = min(1.0, (cw - 6) / max(im.size))
    im2 = im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST)
    mont.alpha_composite(im2, ((i % cols) * cw + 3, (i // cols) * cw + 3))
mont.convert("RGB").save(os.path.join(ROOT, "docs", "storm_frames_montage.png"))
print(f"total {total} frames -> {OUT}")
print("montage -> docs/storm_frames_montage.png")
