#!/usr/bin/env python3
"""Render Eduflick avatar: paper mark on gradient ink (brand mark-stage recipe)."""

from __future__ import annotations

import math
from io import BytesIO
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MARK_SVG = ROOT / "assets/logo/mark-paper.svg"
OUT_DIR = ROOT / "assets/logo/social"
DOWNLOADS = Path.home() / "Downloads"

I_INK = np.array([11, 8, 34], dtype=np.float64)   # --i-ink
INK = np.array([10, 11, 16], dtype=np.float64)     # --ink
I500 = np.array([91, 91, 240], dtype=np.float64)   # --i-500 glow

MARK_FRAC = 172 / 400  # match existing avatar-ink-400 mark scale
GRAD_DEG = 140
RAD_FRAC = 440 / 1024  # mark-stage radial, scaled to canvas


def ink_gradient_bg(size: int) -> Image.Image:
    n = size
    xs = np.linspace(0, 1, n, dtype=np.float64)
    ys = np.linspace(0, 1, n, dtype=np.float64)
    xx, yy = np.meshgrid(xs, ys)

    rad = math.radians(GRAD_DEG)
    # CSS angle: 0° = up, clockwise
    gx, gy = math.sin(rad), math.cos(rad)
    t = (xx - 0.5) * gx + (yy - 0.5) * gy
    t = (t - t.min()) / (t.max() - t.min())

    base = (1 - t)[..., None] * I_INK + t[..., None] * INK

    cx, cy = 0.5, 0.5
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    r = RAD_FRAC
    glow = np.clip(1 - dist / r, 0, 1) * 0.18
    base = base + glow[..., None] * I500
    base = np.clip(base, 0, 255).astype(np.uint8)
    return Image.fromarray(base, "RGB")


def render_mark(px: int) -> Image.Image:
    scale = px / 180
    png = cairosvg.svg2png(
        url=str(MARK_SVG),
        output_width=int(180 * scale),
        output_height=int(180 * scale),
    )
    return Image.open(BytesIO(png)).convert("RGBA")


def compose(size: int) -> Image.Image:
    bg = ink_gradient_bg(size)
    mark_px = max(1, round(size * MARK_FRAC))
    mark = render_mark(mark_px)
    x = (size - mark_px) // 2
    y = (size - mark_px) // 2
    bg.paste(mark, (x, y), mark)
    return bg


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in (400, 1024):
        img = compose(size)
        name = f"avatar-ink-gradient-{size}.png"
        path = OUT_DIR / name
        img.save(path, optimize=True)
        print("wrote", path)

    ig = compose(400)
    dl = DOWNLOADS / "eduflick-ai-instagram-profile-pic.png"
    ig.save(dl, optimize=True)
    print("wrote", dl)

    compose(1024).save(DOWNLOADS / "eduflick-ai-instagram-profile-pic-1024.png", optimize=True)
    print("wrote", DOWNLOADS / "eduflick-ai-instagram-profile-pic-1024.png")


if __name__ == "__main__":
    main()
