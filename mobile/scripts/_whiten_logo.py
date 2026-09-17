from pathlib import Path

import numpy as np
from PIL import Image

src = Path(
    r"C:\Users\thahs\.cursor\projects\c-Users-thahs-Stride\assets"
    r"\c__Users_thahs_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"5319be572a4682f45de75e8eff8e9cfa_images_ChatGPT_Image_Sep_17__2026__"
    r"10_14_52_AM-ff55f260-de2c-4ba7-a87b-da48bd374502.png"
)
outs = [
    Path(r"c:\Users\thahs\Stride\web\public\logo.png"),
    Path(r"c:\Users\thahs\Stride\web\public\icon.png"),
    Path(r"c:\Users\thahs\Stride\mobile\assets\icon.png"),
]

img = Image.open(src).convert("RGBA")
arr = np.asarray(img).copy()
r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

luma = (
    0.2126 * r.astype(np.float32)
    + 0.7152 * g.astype(np.float32)
    + 0.0722 * b.astype(np.float32)
)
blueish = (b.astype(np.int16) - np.maximum(r, g).astype(np.int16)) > 8
near_black = (luma < 42) & ~blueish
transparent = a < 200
mask = near_black | transparent

arr[mask, 0] = 255
arr[mask, 1] = 255
arr[mask, 2] = 255
arr[mask, 3] = 255

out = Image.fromarray(arr, "RGBA")
rgb = Image.new("RGB", out.size, (255, 255, 255))
rgb.paste(out, mask=out.split()[-1])
for p in outs:
    p.parent.mkdir(parents=True, exist_ok=True)
    rgb.save(p, "PNG", optimize=True)
    print(p, p.stat().st_size)
print("done", out.size)
