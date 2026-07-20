from __future__ import annotations

from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path("/Users/iceth/Desktop/เกมกระตุ้นยอดขาย/เกมที่3")
SAMPLES = ROOT / "theme-samples"
FRAME = SAMPLES / "logo-frame-clean.png"
FONT = Path("/Users/iceth/Library/Fonts/DB HelvethaicaMon X Bd v3.2.ttf")

TOP_TEXT = "เป่า ยิ้ง ฉุบ!"
BOTTOM_TEXT = "อารีน่า!"

CANVAS = (1536, 1024)


def load_frame(scale: float = 1.0) -> Image.Image:
    frame = remove_green_fringes(Image.open(FRAME).convert("RGBA"))
    if scale != 1.0:
        frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
    return frame


def remove_green_fringes(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    data = []
    for r, g, b, a in img.getdata():
        green_key = g > 115 and g - r > 55 and g - b > 55
        if green_key:
            data.append((r, g, b, 0))
        else:
            data.append((r, g, b, a))
    img.putdata(data)
    return img


def paste_center(base: Image.Image, item: Image.Image, center: tuple[int, int]) -> None:
    x = round(center[0] - item.width / 2)
    y = round(center[1] - item.height / 2)
    base.alpha_composite(item, (x, y))


def gradient(size: tuple[int, int], colors: Sequence[tuple[int, int, int, int]]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    bands = len(colors) - 1
    for y in range(h):
        t = y / max(1, h - 1)
        pos = min(bands - 1, int(t * bands)) if bands else 0
        local_t = (t * bands) - pos if bands else 0
        c1, c2 = colors[pos], colors[pos + 1]
        row = tuple(round(c1[i] + (c2[i] - c1[i]) * local_t) for i in range(4))
        for x in range(w):
            px[x, y] = row
    return img


def text_layer(
    text: str,
    font_size: int,
    fill_colors: Sequence[tuple[int, int, int, int]],
    cream: tuple[int, int, int, int] = (255, 246, 205, 255),
    dark: tuple[int, int, int, int] = (8, 22, 54, 255),
    shadow: tuple[int, int, int, int] = (2, 8, 31, 255),
    outer: int = 22,
    inner: int = 10,
    tilt: float = 0.0,
) -> Image.Image:
    font = ImageFont.truetype(str(FONT), font_size)
    probe = Image.new("L", (10, 10), 0)
    draw = ImageDraw.Draw(probe)
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=outer)
    w = bbox[2] - bbox[0] + 110
    h = bbox[3] - bbox[1] + 120
    x = 55 - bbox[0]
    y = 52 - bbox[1]

    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    for dx, dy in [(24, 28), (18, 22), (12, 16)]:
        d.text((x + dx, y + dy), text, font=font, fill=shadow, stroke_width=outer + 4, stroke_fill=shadow)

    d.text((x, y), text, font=font, fill=cream, stroke_width=outer, stroke_fill=cream)
    d.text((x, y), text, font=font, fill=dark, stroke_width=inner, stroke_fill=dark)

    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.text((x, y), text, font=font, fill=255)
    layer.alpha_composite(Image.composite(gradient((w, h), fill_colors), Image.new("RGBA", (w, h), (0, 0, 0, 0)), mask))

    shine = Image.new("L", (w, h), 0)
    sd = ImageDraw.Draw(shine)
    sd.text((x - 4, y - 5), text, font=font, fill=120)
    shine = Image.composite(shine, Image.new("L", (w, h), 0), mask)
    shine_overlay = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    shine_overlay.putalpha(shine.point(lambda v: min(v, 70)))
    layer.alpha_composite(shine_overlay)

    alpha_bbox = layer.getbbox()
    if alpha_bbox:
        layer = layer.crop(alpha_bbox)
    if tilt:
        layer = layer.rotate(tilt, expand=True, resample=Image.Resampling.BICUBIC)
    return layer


def star(draw: ImageDraw.ImageDraw, cx: int, cy: int, r1: int, r2: int, color: tuple[int, int, int, int], outline=(6, 15, 42, 255)) -> None:
    import math

    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    draw.polygon(pts, fill=outline)
    pts2 = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        r = max(1, r1 - 8) if i % 2 == 0 else max(1, r2 - 5)
        pts2.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    draw.polygon(pts2, fill=color)


def bolt(draw: ImageDraw.ImageDraw, pts: Iterable[tuple[int, int]], fill=(255, 223, 37, 255), outline=(8, 22, 54, 255), width: int = 14) -> None:
    pts = list(pts)
    draw.line(pts, fill=outline, width=width + 16, joint="curve")
    draw.line(pts, fill=(255, 255, 255, 255), width=width + 6, joint="curve")
    draw.line(pts, fill=fill, width=width, joint="curve")


def jagged_badge(size=(1200, 500), fill=(72, 37, 188, 255), rim=(255, 46, 158, 255)) -> Image.Image:
    w, h = size
    pts = [
        (80, 120), (210, 72), (340, 92), (420, 34), (535, 82), (620, 44),
        (730, 78), (850, 54), (970, 112), (1120, 100), (1160, 230),
        (1085, 350), (940, 386), (820, 456), (650, 430), (520, 472),
        (392, 420), (232, 438), (140, 338), (50, 288),
    ]
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for off, color in [(34, (8, 18, 45, 255)), (22, (255, 246, 205, 255)), (12, (8, 18, 45, 255)), (0, rim)]:
        scaled = [(x + (off if x < w / 2 else -off), y + (off if y < h / 2 else -off)) for x, y in pts]
        d.polygon(scaled, fill=color)
    inner = [(x + (48 if x < w / 2 else -48), y + (48 if y < h / 2 else -48)) for x, y in pts]
    d.polygon(inner, fill=fill)
    hi = Image.new("RGBA", size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.polygon(inner, fill=(255, 255, 255, 40))
    hi = hi.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(hi)
    return img


def variant_one() -> Image.Image:
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame = load_frame(1.02)
    paste_center(canvas, frame, (768, 516))
    top = text_layer(TOP_TEXT, 180, [(255, 255, 238, 255), (255, 208, 58, 255), (255, 122, 44, 255)], outer=21, inner=10, tilt=-1.2)
    bottom = text_layer(BOTTOM_TEXT, 240, [(255, 255, 238, 255), (255, 213, 54, 255), (255, 45, 142, 255)], outer=25, inner=12, tilt=-1.2)
    paste_center(canvas, top, (755, 520))
    paste_center(canvas, bottom, (765, 705))
    d = ImageDraw.Draw(canvas)
    bolt(d, [(210, 770), (265, 708), (238, 832), (318, 750)], width=9)
    bolt(d, [(1300, 760), (1260, 710), (1285, 840), (1215, 752)], fill=(0, 175, 255, 255), width=9)
    star(d, 393, 287, 32, 14, (255, 47, 157, 255))
    star(d, 1150, 302, 26, 11, (0, 169, 255, 255))
    return canvas


def variant_two() -> Image.Image:
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    for i, color in enumerate([(20, 145, 255, 120), (255, 45, 156, 120), (255, 215, 0, 120)]):
        star(d, 768, 575, 410 - i * 52, 130 - i * 20, color, outline=(255, 246, 205, 255) if i == 0 else (8, 20, 55, 255))
    frame = load_frame(0.86)
    paste_center(canvas, frame, (770, 476))
    top = text_layer(TOP_TEXT, 205, [(255, 246, 205, 255), (255, 225, 59, 255), (255, 118, 33, 255)], outer=24, inner=12, tilt=2.5)
    bottom = text_layer(BOTTOM_TEXT, 300, [(255, 255, 255, 255), (255, 66, 175, 255), (125, 55, 255, 255)], outer=31, inner=14, tilt=2.5)
    paste_center(canvas, top, (766, 474))
    paste_center(canvas, bottom, (768, 706))
    bolt(d, [(500, 110), (570, 210), (535, 190), (620, 330)], fill=(255, 229, 35, 255), width=13)
    bolt(d, [(1020, 126), (940, 220), (980, 207), (890, 340)], fill=(255, 255, 255, 255), width=12)
    star(d, 285, 628, 34, 14, (255, 225, 37, 255))
    star(d, 1238, 630, 34, 14, (255, 47, 157, 255))
    return canvas


def variant_three() -> Image.Image:
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    badge = jagged_badge((1190, 530), fill=(48, 30, 151, 255), rim=(255, 47, 157, 255))
    paste_center(canvas, badge, (768, 610))
    frame = load_frame(0.72)
    # Keep the mascots and hand symbols as an upper crest while the custom badge carries the words.
    paste_center(canvas, frame, (768, 405))
    d.rounded_rectangle((238, 762, 1298, 842), radius=28, fill=(9, 26, 70, 255), outline=(255, 246, 205, 255), width=16)
    for y, color in [(782, (0, 178, 255, 255)), (814, (255, 48, 159, 255))]:
        d.line((275, y, 1262, y), fill=color, width=10)
    top = text_layer(TOP_TEXT, 205, [(255, 255, 245, 255), (255, 219, 54, 255), (255, 131, 32, 255)], outer=26, inner=12, tilt=-3.0)
    bottom = text_layer(BOTTOM_TEXT, 260, [(255, 255, 255, 255), (255, 205, 42, 255), (255, 53, 155, 255)], outer=29, inner=14, tilt=-3.0)
    paste_center(canvas, top, (758, 542))
    paste_center(canvas, bottom, (775, 710))
    bolt(d, [(203, 536), (282, 607), (236, 602), (332, 706)], fill=(255, 228, 38, 255), width=12)
    bolt(d, [(1328, 528), (1246, 610), (1298, 599), (1198, 704)], fill=(0, 180, 255, 255), width=12)
    star(d, 390, 390, 28, 11, (255, 50, 158, 255))
    star(d, 1138, 390, 28, 11, (255, 224, 40, 255))
    return canvas


def trim_and_center(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    cropped = img.crop(bbox)
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    paste_center(out, cropped, (CANVAS[0] // 2, CANVAS[1] // 2))
    return out


def main() -> None:
    assert TOP_TEXT == "เป่า ยิ้ง ฉุบ!"
    assert BOTTOM_TEXT == "อารีน่า!"
    makers = [variant_one, variant_two, variant_three]
    for i, maker in enumerate(makers, start=1):
        out = remove_green_fringes(trim_and_center(maker()))
        out.save(SAMPLES / f"logo-new-{i}.png")


if __name__ == "__main__":
    main()
