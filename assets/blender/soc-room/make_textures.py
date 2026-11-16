"""Procedural textures for the rebuilt SOC room (screens, wall display, rack fronts,
pegboard). Pure Pillow, deterministic (seeded), written next to this script in tex/."""
import math, os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")
os.makedirs(OUT, exist_ok=True)
rnd = random.Random(7)

BG = (6, 14, 32)
CYAN = (56, 189, 248)
BLUE = (59, 130, 246)
VIOLET = (139, 92, 246)
GREEN = (52, 211, 153)
WHITE = (226, 238, 255)


def font(size, bold=True):
    for name in (["arialbd.ttf", "segoeuib.ttf"] if bold else ["arial.ttf", "segoeui.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def panel(w, h):
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    for x in range(0, w, 32):
        d.line([(x, 0), (x, h)], fill=(12, 26, 52))
    for y in range(0, h, 32):
        d.line([(0, y), (w, y)], fill=(12, 26, 52))
    d.rectangle([2, 2, w - 3, h - 3], outline=(30, 64, 120), width=3)
    return im, d


def glow(im):
    g = im.filter(ImageFilter.GaussianBlur(3))
    return Image.blend(im, g, 0.35)


def screen_map(w=512, h=320):
    im, d = panel(w, h)
    d.text((16, 12), "GLOBAL THREAT MAP", font=font(18), fill=CYAN)
    pts = [(rnd.randint(30, w - 30), rnd.randint(60, h - 30)) for _ in range(26)]
    for (x, y) in pts:
        for _ in range(2):
            q = rnd.choice(pts)
            d.line([(x, y), q], fill=(30, 90, 160), width=1)
    for (x, y) in pts:
        c = rnd.choice([CYAN, CYAN, VIOLET, (248, 113, 113)])
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=c)
    d.ellipse([w // 2 - 70, h // 2 - 60, w // 2 + 70, h // 2 + 80], outline=(40, 120, 200), width=2)
    return glow(im)


def screen_chart(w=512, h=320, title="TRAFFIC  Gbps", color=CYAN):
    im, d = panel(w, h)
    d.text((16, 12), title, font=font(18), fill=color)
    base = h - 30
    prev = None
    for i in range(0, w - 40, 8):
        v = base - 40 - 90 * abs(math.sin(i / 37.0)) - rnd.randint(0, 50)
        p = (24 + i, v)
        if prev:
            d.line([prev, p], fill=color, width=3)
            d.polygon([prev, p, (p[0], base), (prev[0], base)], fill=(color[0] // 6, color[1] // 6, color[2] // 5))
        prev = p
    for i in range(6):
        x = 40 + i * 76
        d.rectangle([x, base + 8, x + 40, base + 14], fill=(30, 64, 120))
    return glow(im)


def screen_code(w=512, h=320):
    im, d = panel(w, h)
    d.text((16, 12), "SIEM  /  LIVE EVENTS", font=font(18), fill=GREEN)
    y = 44
    while y < h - 16:
        x = 16
        for _ in range(rnd.randint(2, 6)):
            ln = rnd.randint(20, 90)
            c = rnd.choice([WHITE, CYAN, CYAN, GREEN, (148, 163, 184), VIOLET])
            d.rectangle([x, y, x + ln, y + 6], fill=c)
            x += ln + 10
            if x > w - 40:
                break
        y += 14
    return glow(im)


def screen_shield(w=512, h=320):
    im, d = panel(w, h)
    d.text((16, 12), "PERIMETER  STATUS", font=font(18), fill=CYAN)
    cx, cy = w // 2, h // 2 + 14
    shield = [(cx, cy - 92), (cx + 78, cy - 62), (cx + 66, cy + 30), (cx, cy + 88), (cx - 66, cy + 30), (cx - 78, cy - 62)]
    d.polygon(shield, outline=CYAN, width=5)
    d.rectangle([cx - 26, cy - 6, cx + 26, cy + 34], outline=CYAN, width=4)
    d.arc([cx - 18, cy - 34, cx + 18, cy + 6], 180, 360, fill=CYAN, width=4)
    d.text((cx - 54, h - 34), "SECURE", font=font(22), fill=GREEN)
    return glow(im)


def screen_bars(w=512, h=320):
    im, d = panel(w, h)
    d.text((16, 12), "ALERTS BY SEVERITY", font=font(18), fill=VIOLET)
    for i in range(10):
        bh = rnd.randint(40, 220)
        x = 30 + i * 46
        c = [CYAN, BLUE, VIOLET][i % 3]
        d.rectangle([x, h - 24 - bh, x + 28, h - 24], fill=c)
    return glow(im)


def wall_display(w=1024, h=640):
    im, d = panel(w, h)
    # network constellation
    pts = [(rnd.randint(500, w - 30), rnd.randint(40, h - 40)) for _ in range(40)]
    for (x, y) in pts:
        for _ in range(2):
            q = rnd.choice(pts)
            d.line([(x, y), q], fill=(30, 100, 180), width=2)
    for (x, y) in pts:
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=CYAN)
    d.text((60, h // 2 - 120), "R2C", font=font(150), fill=WHITE)
    d.text((64, h // 2 + 60), "DATA CENTER", font=font(64), fill=WHITE)
    d.text((66, h // 2 + 150), "OPERATION BROKEN SHIELD", font=font(26, bold=False), fill=CYAN)
    return glow(im)


def rack_front(w=256, h=768):
    im = Image.new("RGB", (w, h), (12, 16, 24))
    d = ImageDraw.Draw(im)
    u = h / 42.0
    y = 6
    while y < h - 10:
        units = rnd.choice([1, 1, 2, 2, 3])
        uh = units * u - 3
        d.rectangle([10, y, w - 11, y + uh], fill=(22, 28, 40), outline=(40, 52, 72))
        # drive bays / vents
        for k in range(rnd.randint(4, 10)):
            x = 18 + k * 20
            if x > w - 60:
                break
            d.rectangle([x, y + 3, x + 14, y + uh - 3], fill=(30, 38, 54))
        # status LEDs
        for k in range(rnd.randint(1, 4)):
            c = rnd.choice([CYAN, CYAN, BLUE, GREEN, GREEN, (250, 204, 21)])
            lx = w - 40 + k * 7
            d.rectangle([lx, y + uh / 2 - 2, lx + 4, y + uh / 2 + 2], fill=c)
        y += units * u
    return im


def pegboard(w=512, h=256):
    im = Image.new("RGB", (w, h), (236, 240, 245))
    d = ImageDraw.Draw(im)
    for x in range(8, w, 16):
        for y in range(8, h, 16):
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(190, 198, 210))
    colors = [(239, 68, 68), (250, 204, 21), (34, 197, 94), (59, 130, 246), (30, 41, 59), (234, 88, 12)]
    x = 24
    while x < w - 24:
        c = rnd.choice(colors)
        length = rnd.randint(70, 160)
        d.rectangle([x, 30, x + 8, 30 + length], fill=(55, 65, 81))
        d.rectangle([x - 4, 30 + length - 40, x + 12, 30 + length], fill=c)
        x += rnd.randint(26, 40)
    return im


def printer_glow(w=256, h=256):
    im = Image.new("RGB", (w, h), (8, 20, 48))
    d = ImageDraw.Draw(im)
    d.rectangle([w // 2 - 50, h - 90, w // 2 + 50, h - 30], fill=(59, 130, 246))
    d.polygon([(w // 2 - 30, h - 90), (w // 2, h - 150), (w // 2 + 30, h - 90)], fill=(96, 165, 250))
    return glow(im)


def save(name, im, q=88):
    im.save(os.path.join(OUT, name), "PNG", optimize=True)


save("screen_map.png", screen_map())
save("screen_chart.png", screen_chart())
save("screen_chart2.png", screen_chart(title="BANDWIDTH  /  EDGE", color=VIOLET))
save("screen_code.png", screen_code())
save("screen_shield.png", screen_shield())
save("screen_bars.png", screen_bars())
save("wall_display.png", wall_display())
save("rack_front.png", rack_front())
save("pegboard.png", pegboard())
save("printer_glow.png", printer_glow())
print("textures:", sorted(os.listdir(OUT)))
