"""Build Stride brand logo variants with transparent backgrounds."""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"c:\Users\thahs\Stride")
ASSETS = Path(
    r"C:\Users\thahs\.cursor\projects\c-Users-thahs-Stride\assets"
)

WHITE_SRC = ASSETS / (
    "c__Users_thahs_AppData_Roaming_Cursor_User_workspaceStorage_"
    "5319be572a4682f45de75e8eff8e9cfa_images_ChatGPT_Image_Sep_17__2026__"
    "10_46_39_AM-95c8b79a-36c3-4dc4-b8ad-a8693752527e.png"
)
# Black source is unusable (solid black). Derive from white mark.
PRIMARY_SRC = ROOT / "web" / "public" / "logo.png"

OUT_DIRS = [
    ROOT / "web" / "public" / "brand",
    ROOT / "mobile" / "assets" / "brand",
]


def crop_to_alpha(img: Image.Image, pad: int = 12) -> Image.Image:
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


def white_on_transparent(src: Path) -> Image.Image:
    arr = np.asarray(Image.open(src).convert("RGBA")).copy()
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    luma = (
        0.2126 * r.astype(np.float32)
        + 0.7152 * g.astype(np.float32)
        + 0.0722 * b.astype(np.float32)
    )
    # Black field → transparent; keep bright mark
    mark = luma > 40
    out = np.zeros_like(arr)
    out[mark, 0] = 255
    out[mark, 1] = 255
    out[mark, 2] = 255
    # Soft alpha from luma for antialiased edges
    out[mark, 3] = np.clip(luma[mark] * (255 / 255), 0, 255).astype(np.uint8)
    soft = (luma > 20) & (luma <= 40)
    out[soft, 0] = 255
    out[soft, 1] = 255
    out[soft, 2] = 255
    out[soft, 3] = np.clip((luma[soft] / 40.0) * 180, 0, 255).astype(np.uint8)
    return crop_to_alpha(Image.fromarray(out, mode="RGBA"))


def black_from_white(white: Image.Image) -> Image.Image:
    arr = np.asarray(white).copy()
    a = arr[:, :, 3]
    out = np.zeros_like(arr)
    visible = a > 0
    out[visible, 0] = 15
    out[visible, 1] = 23
    out[visible, 2] = 42
    out[visible, 3] = a[visible]
    return Image.fromarray(out, mode="RGBA")


def ensure_primary() -> Image.Image:
    img = Image.open(PRIMARY_SRC).convert("RGBA")
    return crop_to_alpha(img)


def save_all(name: str, img: Image.Image) -> None:
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        path = d / name
        img.save(path, "PNG", optimize=True)
        print("wrote", path, img.size, path.stat().st_size)


def main() -> None:
    primary = ensure_primary()
    white = white_on_transparent(WHITE_SRC)
    black = black_from_white(white)

    save_all("logo-primary.png", primary)
    save_all("logo-white.png", white)
    save_all("logo-black.png", black)
    # Icon/symbol for now = primary mark (user will supply dedicated icons later)
    save_all("icon.png", primary)
    save_all("icon-white.png", white)

    # Compat aliases used by favicon / existing paths
    for alias, img in [
        (ROOT / "web" / "public" / "logo.png", primary),
        (ROOT / "web" / "public" / "icon.png", primary),
        (ROOT / "mobile" / "assets" / "icon.png", primary),
    ]:
        img.save(alias, "PNG", optimize=True)
        print("alias", alias)


if __name__ == "__main__":
    main()
