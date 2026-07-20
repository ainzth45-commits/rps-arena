from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path("/Users/iceth/Desktop/เกมกระตุ้นยอดขาย/เกมที่3")
BASE = Path("/Users/iceth/.codex/generated_images/019f7e93-7284-79d3-9d13-9c51d2562af1/call_BwCENIA3buHqQm6Rl2EYydBu.png")
OUT = ROOT / "generated-assets" / "paoyingchub-arena-logo-corrected-thai.png"
FONT = Path("/Users/iceth/Library/Fonts/NotoSansThaiLooped-Black.ttf")
MAGICK = "/opt/homebrew/bin/magick"


def render_text(text: str, pointsize: int, fill: str, out: Path) -> None:
    subprocess.run(
        [
            MAGICK,
            "-background",
            "none",
            "-font",
            str(FONT),
            "-pointsize",
            str(pointsize),
            "-fill",
            fill,
            f"label:{text}",
            str(out),
        ],
        check=True,
    )


def add_text_effect(
    layer_path: Path,
    out: Path,
    outline_color: tuple[int, int, int, int],
    outline_radius: int,
    shadow_color: tuple[int, int, int, int],
    shadow_offset: tuple[int, int],
) -> None:
    text = Image.open(layer_path).convert("RGBA")
    pad = outline_radius * 2 + max(abs(shadow_offset[0]), abs(shadow_offset[1])) + 6
    canvas = Image.new("RGBA", (text.width + pad * 2, text.height + pad * 2), (0, 0, 0, 0))

    alpha = Image.new("L", canvas.size, 0)
    alpha.paste(text.getchannel("A"), (pad, pad))
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(outline_radius * 2 + 1))

    shadow_alpha = alpha.filter(ImageFilter.MaxFilter(17))
    shadow = Image.new("RGBA", canvas.size, shadow_color)
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_layer.paste(shadow, shadow_offset, shadow_alpha)
    canvas.alpha_composite(shadow_layer)

    outline = Image.new("RGBA", canvas.size, outline_color)
    canvas.paste(outline, (0, 0), outline_alpha)
    canvas.alpha_composite(text, (pad, pad))
    bbox = canvas.getchannel("A").getbbox()
    if bbox:
        canvas = canvas.crop(bbox)
    canvas.save(out)


def paste_fit(base: Image.Image, layer_path: Path, box: tuple[int, int, int, int]) -> None:
    layer = Image.open(layer_path).convert("RGBA")
    max_w = box[2] - box[0]
    max_h = box[3] - box[1]
    scale = min(max_w / layer.width, max_h / layer.height)
    new_size = (int(layer.width * scale), int(layer.height * scale))
    layer = layer.resize(new_size, Image.Resampling.LANCZOS)
    x = box[0] + (max_w - layer.width) // 2
    y = box[1] + (max_h - layer.height) // 2
    base.alpha_composite(layer, (x, y))


def rounded_panel(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], radius: int) -> None:
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle((x1 - 18, y1 - 18, x2 + 18, y2 + 18), radius=radius + 18, fill=(255, 255, 255, 245))
    draw.rounded_rectangle((x1 - 8, y1 - 8, x2 + 8, y2 + 8), radius=radius + 8, fill=(2, 5, 14, 255))
    draw.rounded_rectangle((x1, y1, x2, y2), radius=radius, fill=(5, 20, 50, 255))
    draw.rounded_rectangle((x1 + 14, y1 + 12, x2 - 14, y2 - 14), radius=max(8, radius - 12), outline=(22, 64, 116, 180), width=5)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    base = Image.open(BASE).convert("RGBA")
    draw = ImageDraw.Draw(base, "RGBA")

    rounded_panel(draw, (205, 365, 1328, 620), 54)
    rounded_panel(draw, (275, 620, 1262, 835), 48)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        top_shadow = tmp / "top_shadow.png"
        top_main = tmp / "top_main.png"
        bottom_shadow = tmp / "bottom_shadow.png"
        bottom_main = tmp / "bottom_main.png"
        top_effect = tmp / "top_effect.png"
        bottom_effect = tmp / "bottom_effect.png"

        render_text("เป่ายิ้งฉุบ!", 205, "#FFEBC2", top_main)
        render_text("อารีน่า!", 215, "#FFB000", bottom_main)
        add_text_effect(top_main, top_effect, (3, 13, 34, 255), 22, (246, 169, 0, 180), (8, 16))
        add_text_effect(bottom_main, bottom_effect, (3, 13, 34, 255), 24, (138, 52, 0, 190), (8, 16))

        paste_fit(base, top_effect, (235, 372, 1293, 606))
        paste_fit(base, bottom_effect, (318, 632, 1212, 810))

    base.convert("RGB").save(OUT)


if __name__ == "__main__":
    main()
