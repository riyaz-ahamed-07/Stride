"""Process icon/symbol-only full-color + white variants."""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"c:\Users\thahs\Stride")
ASSETS = Path(
    r"C:\Users\thahs\.cursor\projects\c-Users-thahs-Stride\assets"
)

ICON_COLOR = ASSETS / (
    "c__Users_thahs_AppData_Roaming_Cursor_User_workspaceStorage_"
    "5319be572a4682f45de75e8eff8e9cfa_images_ChatGPT_Image_Sep_17__2026__"
    "10_51_08_AM-355a5786-7ff4-43b8-8770-cdcb794f4bd8.png"
)
ICON_WHITE = ASSETS / (
    "c__Users_thahs_AppData_Roaming_Cursor_User_workspaceStorage_"
    "5319be572a4682f45de75e8eff8e9cfa_images_ChatGPT_Image_Sep_17__2026__"
    "10_55_27_AM-54766692-1efa-4bf2-8d53-1e68d03511fa.png"
)

OUT_DIRS = [
    ROOT / "web" / "public" / "brand",
    ROOT / "mobile" / "assets" / "brand",
]


def crop_to_alpha(img: Image.Image, pad: int = 10) -> Image.Image:
    alpha = np.asarray(img.split()[-1])
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return img
    left, right = max(0, xs.min() - pad), min(img.width, xs.max() + pad + 1)
    top, bottom = max(0, ys.min() - pad), min(img.height, ys.max() + pad + 1)
    side = max(right - left, bottom - top)
    cx, cy = (left + right) // 2, (top + bottom) // 2
    half = side // 2
    left = max(0, cx - half)
    top = max(0, cy - half)
    right = min(img.width, left + side)
    bottom = min(img.height, top + side)
    return img.crop((left, top, right, bottom))


def color_icon_transparent(src: Path) -> Image.Image:
    arr = np.asarray(Image.open(src).convert("RGBA")).copy()
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    luma = (
        0.2126 * r.astype(np.float32)
        + 0.7152 * g.astype(np.float32)
        + 0.0722 * b.astype(np.float32)
    )
    blueish = (b.astype(np.int16) - np.maximum(r, g).astype(np.int16)) > 6
    # Keep pale globe disc too (light blues / near-white blues)
    pale_disc = (luma > 140) & (b >= r) & (b >= g)
    keep = blueish | pale_disc | ((luma > 55) & blueish)
    # Broader keep: anything not near-black
    keep = (luma > 28) | blueish | pale_disc
    out = arr.copy()
    out[~keep, 3] = 0
    # Soften near-black fringe
    fringe = (luma <= 45) & keep
    out[fringe, 3] = np.clip((luma[fringe] / 45.0) * 255, 0, 255).astype(np.uint8)
    return crop_to_alpha(Image.fromarray(out, mode="RGBA"))


def white_icon_transparent(src: Path) -> Image.Image:
    arr = np.asarray(Image.open(src).convert("RGBA")).copy()
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    luma = (
        0.2126 * r.astype(np.float32)
        + 0.7152 * g.astype(np.float32)
        + 0.0722 * b.astype(np.float32)
    )
    out = np.zeros_like(arr)
    mark = luma > 40
    soft = (luma > 18) & (luma <= 40)
    out[mark, 0] = 255
    out[mark, 1] = 255
    out[mark, 2] = 255
    out[mark, 3] = np.clip(luma[mark], 0, 255).astype(np.uint8)
    out[soft, 0] = 255
    out[soft, 1] = 255
    out[soft, 2] = 255
    out[soft, 3] = np.clip((luma[soft] / 40.0) * 200, 0, 255).astype(np.uint8)
    return crop_to_alpha(Image.fromarray(out, mode="RGBA"))


def save(name: str, img: Image.Image) -> None:
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        path = d / name
        img.save(path, "PNG", optimize=True)
        print("wrote", path, img.size, path.stat().st_size)


def main() -> None:
    icon = color_icon_transparent(ICON_COLOR)
    icon_white = white_icon_transparent(ICON_WHITE)
    save("icon.png", icon)
    save("icon-white.png", icon_white)

    # Favicon / launcher aliases
    for alias in [
        ROOT / "web" / "public" / "icon.png",
        ROOT / "web" / "public" / "logo.png",
        ROOT / "mobile" / "assets" / "icon.png",
    ]:
        icon.save(alias, "PNG", optimize=True)
        print("alias", alias)


if __name__ == "__main__":
    main()
