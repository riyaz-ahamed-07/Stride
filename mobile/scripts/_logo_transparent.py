from pathlib import Path

import numpy as np
from PIL import Image

src = Path(
    r"C:\Users\thahs\.cursor\projects\c-Users-thahs-Stride\assets"
    r"\c__Users_thahs_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"5319be572a4682f45de75e8eff8e9cfa_images_ChatGPT_Image_Sep_17__2026__"
    r"10_44_22_AM-6238533f-45d2-4f24-b563-5900ea466691.jpg"
)
outs = [
    Path(r"c:\Users\thahs\Stride\web\public\logo.png"),
    Path(r"c:\Users\thahs\Stride\web\public\icon.png"),
    Path(r"c:\Users\thahs\Stride\mobile\assets\icon.png"),
]

img = Image.open(src).convert("RGBA")
arr = np.asarray(img).copy().astype(np.uint8)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
luma = (
    0.2126 * r.astype(np.float32)
    + 0.7152 * g.astype(np.float32)
    + 0.0722 * b.astype(np.float32)
)
# Pure black square around the circle → transparent
black = (luma < 28) & (np.maximum(np.maximum(r, g), b) < 40)
arr[black, 3] = 0

# Soften fringe: near-black gets partial alpha
near = (luma < 55) & (arr[:, :, 3] > 0) & ~black
arr[near, 3] = np.clip((luma[near] / 55.0) * 255, 0, 255).astype(np.uint8)

out = Image.fromarray(arr, mode="RGBA")

# Crop to opaque content + small pad so header stays circular
alpha = np.asarray(out.split()[-1])
ys, xs = np.where(alpha > 10)
if len(xs) and len(ys):
    pad = 8
    left, right = max(0, xs.min() - pad), min(out.width, xs.max() + pad + 1)
    top, bottom = max(0, ys.min() - pad), min(out.height, ys.max() + pad + 1)
    # Keep square crop centered on content for clean circle display
    side = max(right - left, bottom - top)
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    half = side // 2
    left = max(0, cx - half)
    top = max(0, cy - half)
    right = min(out.width, left + side)
    bottom = min(out.height, top + side)
    out = out.crop((left, top, right, bottom))

for p in outs:
    p.parent.mkdir(parents=True, exist_ok=True)
    out.save(p, "PNG", optimize=True)
    print(p, p.stat().st_size, out.size)
print("done")
