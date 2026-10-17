"""Generate the native app icons and splash screens from assets/icon-1024.png.

Run after changing the icon:  python scripts/gen_native_assets.py   (needs Pillow)

- iOS app icon: full-bleed, opaque (no alpha). App Store Connect rejects icons with transparency;
  iOS applies its own rounded mask.
- Android adaptive icon foreground: the chip artwork alone (navy tile removed), centred inside the
  launcher's safe zone, over the navy background colour (values/ic_launcher_background.xml).
  Launchers crop adaptive icons into their own shape, so the tile must not be in the foreground.
- Splash screens (Android + iOS): the icon centred on the app's white background, at every size the
  native projects already use.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon-1024.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
IOS = ROOT / "ios" / "App" / "App" / "Assets.xcassets"

NAVY = (11, 16, 32)  # #0B1020, the icon tile; matches ic_launcher_background
WHITE = (255, 255, 255)
ADAPTIVE_ART = 0.54  # artwork width as a share of the 108dp canvas (safe zone is ~61-66%)
SPLASH_ICON = 0.22  # icon width as a share of the splash's shorter side


def opaque_icon(icon: Image.Image) -> Image.Image:
    """The icon flattened onto a full navy square: no transparent corners, no alpha."""
    flat = Image.new("RGB", icon.size, NAVY)
    flat.paste(icon, mask=icon.getchannel("A"))
    return flat


def chip_artwork(icon: Image.Image) -> Image.Image:
    """The icon with its navy tile and transparent corners removed, cropped to the artwork."""
    px = icon.load()
    out = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    opx = out.load()
    for y in range(icon.height):
        for x in range(icon.width):
            r, g, b, a = px[x, y]
            # Anything close to the tile colour (or transparent) is background.
            if a < 128 or (abs(r - NAVY[0]) + abs(g - NAVY[1]) + abs(b - NAVY[2])) < 40:
                continue
            opx[x, y] = (r, g, b, a)
    return out.crop(out.getbbox())


def adaptive_foreground(art: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    w = round(size * ADAPTIVE_ART)
    scaled = art.resize((w, round(art.height * w / art.width)), Image.LANCZOS)
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2), scaled)
    return canvas


def splash(icon: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, WHITE)
    w = round(min(size) * SPLASH_ICON)
    scaled = icon.resize((w, w), Image.LANCZOS)
    canvas.paste(scaled, ((size[0] - w) // 2, (size[1] - w) // 2), scaled)
    return canvas


def main() -> None:
    icon = Image.open(SRC).convert("RGBA")
    art = chip_artwork(icon)

    ios_icon = IOS / "AppIcon.appiconset" / "AppIcon-512@2x.png"
    opaque_icon(icon).save(ios_icon)
    print("wrote", ios_icon.relative_to(ROOT))

    for fg in sorted(RES.glob("mipmap-*/ic_launcher_foreground.png")):
        size = Image.open(fg).width
        adaptive_foreground(art, size).save(fg)
        print("wrote", fg.relative_to(ROOT), size)

    for path in sorted(RES.glob("drawable*/splash.png")) + sorted((IOS / "Splash.imageset").glob("*.png")):
        size = Image.open(path).size
        splash(icon, size).save(path, optimize=True)
        print("wrote", path.relative_to(ROOT), size)


if __name__ == "__main__":
    main()
