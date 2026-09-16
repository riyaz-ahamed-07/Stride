"""Generate placeholder Stride app icons until custom GPT assets are added."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
PRIMARY = "#2563EB"
TEAL = "#0D9488"
WHITE = "#FFFFFF"


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def draw_stride_mark(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: str) -> None:
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    cx, cy = x0 + w // 2, y0 + h // 2
    stroke = max(8, w // 18)
    # Forward motion: two chevrons + baseline arc (recovery path)
    points_a = [
        (cx - w * 0.22, cy - h * 0.02),
        (cx - w * 0.02, cy + h * 0.18),
        (cx - w * 0.22, cy + h * 0.38),
    ]
    points_b = [
        (cx + w * 0.02, cy - h * 0.02),
        (cx + w * 0.22, cy + h * 0.18),
        (cx + w * 0.02, cy + h * 0.38),
    ]
    draw.line(points_a, fill=color, width=stroke, joint="curve")
    draw.line(points_b, fill=color, width=stroke, joint="curve")
    draw.arc(
        (cx - w * 0.34, cy - h * 0.28, cx + w * 0.34, cy + h * 0.44),
        start=200,
        end=340,
        fill=color,
        width=max(6, stroke // 2),
    )


def make_app_icon(size: int = 1024) -> Image.Image:
    img = Image.new("RGB", (size, size), hex_rgb(PRIMARY))
    draw = ImageDraw.Draw(img)
    pad = size // 8
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=size // 5,
        fill=hex_rgb(WHITE),
    )
    inner = pad + size // 14
    draw_stride_mark(draw, (inner, inner, size - inner, size - inner), PRIMARY)
    return img


def make_adaptive_foreground(size: int = 1024) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    inset = size // 5
    draw_stride_mark(draw, (inset, inset, size - inset, size - inset), PRIMARY)
    return img


def make_logo_mark(size: int = 256) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = size // 10
    draw.rounded_rectangle(
        (pad, pad, size - pad, size - pad),
        radius=size // 6,
        fill=hex_rgb(WHITE),
    )
    inner = pad + size // 16
    draw_stride_mark(draw, (inner, inner, size - inner, size - inner), PRIMARY)
    return img


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    make_app_icon().save(ASSETS / "icon.png", "PNG")
    print(f"Wrote icon to {ASSETS / 'icon.png'}")


if __name__ == "__main__":
    main()
