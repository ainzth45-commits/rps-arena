from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "theme-samples" / "assets-batch"

SCALE = 4
SIZE = 512
W = SIZE * SCALE

BLACK = "#10121f"
NAVY = "#16226b"
BLUE = "#1098f7"
CYAN = "#26d4ff"
PURPLE = "#6a2fd0"
PINK = "#e82f9c"
GOLD = "#ffd93d"
ORANGE = "#ff9f1c"
PEACH = "#ffd0a1"
PEACH_DARK = "#f49a5c"
WHITE = "#ffffff"
CREAM = "#fff0c2"
GRAY_PURPLE = "#66548f"


def sc(v: float) -> int:
    return round(v * SCALE)


def pts(values: list[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(sc(x), sc(y)) for x, y in values]


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    img.save(OUT / name.replace(".png", ".webp"), "WEBP", lossless=True, quality=100, method=6)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=BLACK, width=18):
    b = tuple(sc(v) for v in box)
    draw.ellipse(b, fill=outline)
    inset = sc(width)
    draw.ellipse((b[0] + inset, b[1] + inset, b[2] - inset, b[3] - inset), fill=fill)


def roundrect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=BLACK, width=18):
    b = tuple(sc(v) for v in box)
    draw.rounded_rectangle(b, radius=sc(radius), fill=outline)
    inset = sc(width)
    draw.rounded_rectangle(
        (b[0] + inset, b[1] + inset, b[2] - inset, b[3] - inset),
        radius=max(1, sc(radius - width)),
        fill=fill,
    )


def poly(draw: ImageDraw.ImageDraw, values, fill, outline=BLACK, width=18):
    draw.line(pts(values + [values[0]]), fill=outline, width=sc(width * 2), joint="curve")
    draw.polygon(pts(values), fill=fill)
    draw.line(pts(values + [values[0]]), fill=outline, width=sc(width), joint="curve")


def line(draw: ImageDraw.ImageDraw, values, fill, width=18):
    draw.line(pts(values), fill=BLACK, width=sc(width + 16), joint="curve")
    draw.line(pts(values), fill=fill, width=sc(width), joint="curve")


def star(cx, cy, r1, r2, spikes=8, start=-math.pi / 2):
    out = []
    for i in range(spikes * 2):
        r = r1 if i % 2 == 0 else r2
        a = start + i * math.pi / spikes
        out.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return out


def lightning(cx=256, cy=256, scale=1.0):
    raw = [(-22, -150), (72, -150), (28, -35), (112, -35), (-38, 158), (2, 35), (-92, 35)]
    return [(cx + x * scale, cy + y * scale) for x, y in raw]


def small_spark(draw, x, y, color=GOLD, r=34):
    poly(draw, star(x, y, r, r * 0.42, 4), color, width=8)


def draw_bust(draw, cx, cy, color, scale_factor=1.0, front=False):
    head = 74 * scale_factor
    body_w = 152 * scale_factor
    body_h = 104 * scale_factor
    ellipse(draw, (cx - head / 2, cy - head, cx + head / 2, cy), PEACH if front else color, width=13)
    roundrect(
        draw,
        (cx - body_w / 2, cy - 4, cx + body_w / 2, cy + body_h),
        42 * scale_factor,
        color,
        width=14,
    )
    if front:
        ellipse(draw, (cx - 18, cy - 54, cx - 3, cy - 39), BLACK, outline=BLACK, width=0)
        ellipse(draw, (cx + 3, cy - 54, cx + 18, cy - 39), BLACK, outline=BLACK, width=0)
        draw.arc(tuple(sc(v) for v in (cx - 24, cy - 38, cx + 24, cy - 12)), 10, 170, fill=BLACK, width=sc(7))


def icon_players():
    img, d = canvas()
    poly(d, star(256, 276, 204, 156, 16), PINK, width=16)
    draw_bust(d, 166, 220, BLUE, 0.86)
    draw_bust(d, 346, 220, PURPLE, 0.86)
    draw_bust(d, 256, 250, GOLD, 1.05, front=True)
    save(img, "icon-players.png")


def fist(draw, side="left"):
    mirror = -1 if side == "right" else 1
    cx = 185 if side == "left" else 327
    wrist_x = 62 if side == "left" else 354
    line(draw, [(wrist_x, 320), (cx - 40 * mirror, 276)], BLUE if side == "left" else PINK, width=54)
    roundrect(draw, (cx - 92, 184, cx + 80, 322), 46, PEACH, width=16)
    for i, yy in enumerate([174, 170, 176, 196]):
        fx = cx - 82 + i * 38
        roundrect(d, (fx, yy, fx + 58, yy + 92), 28, PEACH, width=10)
    ellipse(draw, (cx + 30 * mirror - 36, 255, cx + 30 * mirror + 58, 350), PEACH_DARK, width=10)
    draw.arc(tuple(sc(v) for v in (cx - 60, 232, cx + 40, 310)), 15, 160, fill=BLACK, width=sc(7))


def icon_duel():
    img, global_d = canvas()
    global d
    d = global_d
    poly(d, star(256, 260, 224, 128, 14), PURPLE, width=15)
    poly(d, star(256, 258, 120, 52, 12), WHITE, width=9)
    fist(d, "left")
    fist(d, "right")
    save(img, "icon-duel.png")


def icon_offround():
    img, d = canvas()
    poly(d, star(256, 256, 216, 126, 10), BLUE, width=17)
    poly(d, star(164, 150, 78, 34, 5), PINK, width=10)
    poly(d, star(370, 348, 70, 28, 5), PINK, width=10)
    poly(d, lightning(262, 260, 1.12), GOLD, width=20)
    save(img, "icon-offround.png")


def draw_trophy(draw, cx=256, cy=240, scale_factor=1.0):
    cup = [(cx - 86, cy - 104), (cx + 86, cy - 104), (cx + 62, cy + 16), (cx + 28, cy + 50), (cx - 28, cy + 50), (cx - 62, cy + 16)]
    poly(draw, cup, GOLD, width=15)
    ellipse(draw, (cx - 38, cy + 38, cx + 38, cy + 100), GOLD, width=12)
    roundrect(draw, (cx - 104, cy + 94, cx + 104, cy + 138), 18, ORANGE, width=12)
    line(draw, [(cx - 82, cy - 74), (cx - 156, cy - 54), (cx - 120, cy + 20), (cx - 70, cy - 8)], GOLD, width=25)
    line(draw, [(cx + 82, cy - 74), (cx + 156, cy - 54), (cx + 120, cy + 20), (cx + 70, cy - 8)], GOLD, width=25)
    poly(draw, lightning(cx, cy - 28, 0.34), ORANGE, width=6)


def icon_ranking():
    img, d = canvas()
    roundrect(d, (70, 332, 204, 444), 18, BLUE, width=14)
    roundrect(d, (204, 276, 336, 444), 18, GOLD, width=14)
    roundrect(d, (336, 354, 456, 444), 18, PINK, width=14)
    draw_trophy(d, 256, 206)
    save(img, "icon-ranking.png")


def icon_coin():
    img, d = canvas()
    ellipse(d, (70, 70, 442, 442), GOLD, width=22)
    ellipse(d, (118, 118, 394, 394), ORANGE, width=14)
    ellipse(d, (142, 132, 364, 346), GOLD, outline=GOLD, width=0)
    poly(d, lightning(256, 260, 0.78), PINK, width=18)
    d.arc(tuple(sc(v) for v in (138, 100, 374, 320)), 205, 255, fill=WHITE, width=sc(14))
    save(img, "icon-coin.png")


def icon_moveset():
    img, d = canvas()
    cards = [
        ((92, 148, 238, 376), -13, BLUE),
        ((184, 112, 330, 392), 0, PURPLE),
        ((274, 148, 420, 376), 13, PINK),
    ]
    for box, angle, color in cards:
        layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        roundrect(ld, box, 22, color, width=15)
        x1, y1, x2, y2 = box
        small_spark(ld, (x1 + x2) / 2, (y1 + y2) / 2, GOLD, 38)
        layer = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(sc((x1 + x2) / 2), sc((y1 + y2) / 2)))
        img.alpha_composite(layer)
    save(img, "icon-moveset.png")


def icon_history():
    img, d = canvas()
    roundrect(d, (126, 104, 394, 414), 28, CREAM, width=18)
    for y in [156, 210, 264, 318]:
        line(d, [(178, y), (342, y)], PURPLE, width=9)
    for y in [152, 230, 308]:
        ellipse(d, (100, y, 152, y + 52), BLUE, width=10)
        line(d, [(126, y + 26), (166, y + 26)], BLUE, width=10)
    d.arc(tuple(sc(v) for v in (218, 242, 386, 410)), 35, 300, fill=PINK, width=sc(20))
    poly(d, [(360, 308), (418, 304), (390, 356)], PINK, width=9)
    save(img, "icon-history.png")


def icon_mail():
    img, d = canvas()
    roundrect(d, (70, 138, 442, 378), 30, WHITE, width=20)
    line(d, [(90, 170), (256, 284), (422, 170)], PINK, width=20)
    line(d, [(90, 350), (210, 254)], BLUE, width=14)
    line(d, [(422, 350), (302, 254)], PURPLE, width=14)
    poly(d, lightning(256, 260, 0.44), GOLD, width=12)
    save(img, "icon-mail.png")


def icon_timer():
    img, d = canvas()
    roundrect(d, (204, 42, 308, 104), 20, GOLD, width=12)
    roundrect(d, (226, 86, 286, 132), 16, BLUE, width=10)
    ellipse(d, (92, 108, 420, 436), WHITE, width=22)
    ellipse(d, (138, 154, 374, 390), PURPLE, width=10)
    line(d, [(256, 272), (256, 182)], GOLD, width=18)
    line(d, [(256, 272), (326, 320)], PINK, width=18)
    small_spark(d, 122, 132, CYAN, 28)
    save(img, "icon-timer.png")


def icon_lock():
    img, d = canvas()
    line(d, [(166, 216), (166, 158), (256, 86), (346, 158), (346, 216)], GOLD, width=44)
    roundrect(d, (118, 202, 394, 420), 34, PINK, width=20)
    ellipse(d, (226, 276, 286, 336), NAVY, width=6)
    roundrect(d, (238, 318, 274, 374), 14, NAVY, outline=NAVY, width=0)
    save(img, "icon-lock.png")


def icon_warning():
    img, d = canvas()
    poly(d, [(256, 58), (452, 420), (60, 420)], GOLD, width=22)
    poly(d, lightning(258, 272, 0.58), PINK, width=16)
    save(img, "icon-warning.png")


def gear_points(cx=256, cy=256, teeth=10, r_outer=190, r_inner=148):
    out = []
    for i in range(teeth * 2):
        r = r_outer if i % 2 == 0 else r_inner
        a = -math.pi / 2 + i * math.pi / teeth
        out.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return out


def icon_settings():
    img, d = canvas()
    poly(d, gear_points(), PURPLE, width=20)
    ellipse(d, (156, 156, 356, 356), CYAN, width=18)
    ellipse(d, (212, 212, 300, 300), NAVY, width=10)
    save(img, "icon-settings.png")


def icon_tutorial():
    img, d = canvas()
    poly(d, [(80, 134), (240, 98), (256, 382), (96, 426)], WHITE, width=16)
    poly(d, [(432, 134), (272, 98), (256, 382), (416, 426)], CREAM, width=16)
    line(d, [(256, 114), (256, 386)], PURPLE, width=12)
    small_spark(d, 184, 218, GOLD, 31)
    line(d, [(320, 198), (386, 184)], PINK, width=9)
    line(d, [(318, 252), (388, 238)], BLUE, width=9)
    save(img, "icon-tutorial.png")


def icon_avatar_placeholder():
    img, d = canvas()
    roundrect(d, (84, 84, 428, 428), 64, BLUE, width=20)
    ellipse(d, (178, 136, 334, 292), CREAM, width=16)
    roundrect(d, (132, 302, 380, 406), 56, CREAM, width=16)
    ellipse(d, (206, 184, 236, 214), BLACK, outline=BLACK, width=0)
    ellipse(d, (276, 184, 306, 214), BLACK, outline=BLACK, width=0)
    draw = d
    draw.arc(tuple(sc(v) for v in (208, 208, 304, 260)), 20, 160, fill=BLACK, width=sc(8))
    save(img, "avatar-placeholder.png")


ICONS = [
    icon_players,
    icon_duel,
    icon_offround,
    icon_ranking,
    icon_coin,
    icon_moveset,
    icon_history,
    icon_mail,
    icon_timer,
    icon_lock,
    icon_warning,
    icon_settings,
    icon_tutorial,
    icon_avatar_placeholder,
]


if __name__ == "__main__":
    for fn in ICONS:
        fn()
    print(f"Generated {len(ICONS)} assets in {OUT}")
