from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "theme-samples" / "assets-batch"
PREVIEW = OUT / "_batch-a-edge-check.png"

EXPECTED = [
    "icon-players.webp",
    "icon-duel.webp",
    "icon-offround.webp",
    "icon-ranking.webp",
    "icon-coin.webp",
    "icon-moveset.webp",
    "icon-history.webp",
    "icon-mail.webp",
    "icon-timer.webp",
    "icon-lock.webp",
    "icon-warning.webp",
    "icon-settings.webp",
    "icon-tutorial.webp",
    "avatar-placeholder.webp",
]


def alpha_bounds(img: Image.Image) -> tuple[int, int, int, int] | None:
    alpha = img.getchannel("A")
    return alpha.getbbox()


def main() -> None:
    errors: list[str] = []
    loaded: list[tuple[str, Image.Image]] = []
    for name in EXPECTED:
        path = OUT / name
        if not path.exists():
            errors.append(f"missing: {name}")
            continue
        img = Image.open(path).convert("RGBA")
        loaded.append((name, img))
        if img.size != (512, 512):
            errors.append(f"wrong size: {name} {img.size}")
        alpha = img.getchannel("A")
        if alpha.getextrema()[0] != 0:
            errors.append(f"not transparent somewhere: {name}")
        for xy in [(0, 0), (511, 0), (0, 511), (511, 511)]:
            if alpha.getpixel(xy) != 0:
                errors.append(f"corner not transparent: {name} {xy}")
        bounds = alpha_bounds(img)
        if bounds is None:
            errors.append(f"empty alpha: {name}")
        else:
            x1, y1, x2, y2 = bounds
            if min(x1, y1, 512 - x2, 512 - y2) < 10:
                errors.append(f"tight edge padding: {name} {bounds}")

    tile = 180
    cols = 7
    rows = 4
    sheet = Image.new("RGBA", (cols * tile, rows * tile), (0, 0, 0, 255))
    draw = ImageDraw.Draw(sheet)
    backgrounds = [(18, 20, 31, 255), (246, 244, 236, 255)]
    for idx, (_name, img) in enumerate(loaded):
        row = idx // cols
        col = idx % cols
        thumb = img.resize((128, 128), Image.Resampling.LANCZOS)
        for half, bg in enumerate(backgrounds):
            x = col * tile + 26
            y = (row * 2 + half) * 90 + 10
            draw.rounded_rectangle((x - 12, y - 8, x + 140, y + 140), radius=12, fill=bg)
            sheet.alpha_composite(thumb, (x, y))
    PREVIEW.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(PREVIEW)

    extras = sorted(
        p.name
        for p in OUT.glob("*.webp")
        if p.name not in EXPECTED
    )
    if extras:
        errors.append(f"unexpected webp files: {extras}")

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"verified {len(EXPECTED)} transparent webp assets")
    print(f"edge preview: {PREVIEW}")


if __name__ == "__main__":
    main()
