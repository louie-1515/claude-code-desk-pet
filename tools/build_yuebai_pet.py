from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "月白档案员动作母版.png"
FRAMES = ROOT / "frames"
FINAL = ROOT / "final"
QA = ROOT / "qa"
ASSETS = ROOT / "assets"

ASSET_SCALE = 2
CELL_W = 192 * ASSET_SCALE
CELL_H = 208 * ASSET_SCALE
COLUMNS = 8
ROWS = 9
ATLAS_W = CELL_W * COLUMNS
ATLAS_H = CELL_H * ROWS

ROW_SPECS = [
    ("idle", 0, 6),
    ("running-right", 1, 8),
    ("running-left", 2, 8),
    ("waving", 3, 4),
    ("jumping", 4, 5),
    ("failed", 5, 8),
    ("waiting", 6, 6),
    ("running", 7, 6),
    ("review", 8, 6),
]

SOURCE_BOXES = {
    "idle": [
        (54, 174, 184, 338),
        (217, 173, 346, 338),
        (380, 174, 507, 338),
        (545, 174, 672, 338),
        (699, 174, 826, 338),
        (849, 174, 976, 338),
    ],
    "review": [
        (48, 425, 178, 596),
        (209, 424, 340, 596),
        (371, 424, 501, 596),
        (537, 424, 667, 596),
        (694, 425, 823, 596),
        (843, 425, 972, 596),
    ],
    "waiting": [
        (53, 679, 173, 833),
        (209, 679, 329, 833),
        (371, 677, 492, 833),
        (551, 679, 671, 833),
        (707, 678, 826, 832),
        (860, 679, 976, 833),
    ],
    "running": [
        (47, 917, 176, 1057),
        (202, 916, 333, 1057),
        (365, 915, 497, 1057),
        (520, 914, 653, 1057),
        (692, 917, 815, 1057),
        (854, 917, 975, 1057),
    ],
    "waving": [
        (51, 1136, 170, 1275),
        (219, 1136, 334, 1275),
        (378, 1136, 492, 1275),
        (543, 1135, 652, 1275),
        (705, 1134, 812, 1275),
        (852, 1136, 959, 1275),
    ],
    "failed": [
        (61, 1359, 183, 1483),
        (223, 1362, 334, 1483),
        (379, 1352, 485, 1483),
        (535, 1352, 644, 1484),
        (705, 1344, 812, 1484),
        (854, 1343, 961, 1484),
    ],
}

TARGET_HEIGHT = {
    "idle": 154 * ASSET_SCALE,
    "review": 160 * ASSET_SCALE,
    "waiting": 154 * ASSET_SCALE,
    "running": 156 * ASSET_SCALE,
    "waving": 160 * ASSET_SCALE,
    "failed": 146 * ASSET_SCALE,
}


def median_corner_colour(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    w, h = rgb.size
    samples = []
    for box in [(0, 0, 20, 20), (w - 20, 0, w, 20), (0, h - 20, 20, h), (w - 20, h - 20, w, h)]:
        stat = ImageStat.Stat(rgb.crop(box))
        samples.append(tuple(round(v) for v in stat.mean))
    return tuple(sorted(channel)[len(channel) // 2] for channel in zip(*samples))


def alpha_from_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bg = median_corner_colour(rgba)
    pixels = rgba.load()
    w, h = rgba.size
    background = Image.new("L", rgba.size, 0)
    bg_pixels = background.load()
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    def is_background_like(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        distance = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
        return distance < 72

    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= w or y >= h:
            continue
        seen.add((x, y))
        if not is_background_like(x, y):
            continue
        bg_pixels[x, y] = 255
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    background = background.filter(ImageFilter.MaxFilter(3))
    return background.point(lambda value: 0 if value else 255)


def connected_components(mask: Image.Image) -> list[list[tuple[int, int]]]:
    data = mask.load()
    w, h = mask.size
    seen: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(h):
        for x in range(w):
            if data[x, y] == 0 or (x, y) in seen:
                continue
            queue = deque([(x, y)])
            seen.add((x, y))
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                            continue
                        if data[nx, ny] == 0:
                            continue
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            components.append(component)
    return components


def keep_main_sprite(mask: Image.Image) -> Image.Image:
    binary = mask.point(lambda value: 255 if value > 0 else 0)
    components = connected_components(binary)
    if not components:
        return mask
    largest = max(len(component) for component in components)
    keep = Image.new("L", mask.size, 0)
    keep_pixels = keep.load()
    source_pixels = mask.load()
    for component in components:
        xs = [p[0] for p in component]
        ys = [p[1] for p in component]
        width = max(xs) - min(xs) + 1
        height = max(ys) - min(ys) + 1
        area = len(component)
        if area >= max(160, largest * 0.05) and width >= 12 and height >= 12:
            for x, y in component:
                keep_pixels[x, y] = source_pixels[x, y]
    return keep


def clear_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    data = bytearray(rgba.tobytes())
    for index in range(0, len(data), 4):
        if data[index + 3] == 0:
            data[index] = 0
            data[index + 1] = 0
            data[index + 2] = 0
    return Image.frombytes("RGBA", rgba.size, bytes(data))


def trim_transparent(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def extract_pose(source: Image.Image, box: tuple[int, int, int, int], key: str) -> Image.Image:
    crop = source.crop(box).convert("RGBA")
    alpha = keep_main_sprite(alpha_from_background(crop))
    crop.putalpha(alpha)
    sprite = trim_transparent(crop)
    target_h = TARGET_HEIGHT[key]
    scale = target_h / sprite.height
    target_w = round(sprite.width * scale)
    sprite = sprite.resize((target_w, target_h), Image.Resampling.NEAREST)
    return clear_transparent_rgb(sprite)


def lean_sprite(sprite: Image.Image, degrees: float) -> Image.Image:
    if degrees == 0:
        return sprite
    return sprite.rotate(degrees, resample=Image.Resampling.NEAREST, expand=True)


def scaled_offset(offset: tuple[int, int]) -> tuple[int, int]:
    return (round(offset[0] * ASSET_SCALE), round(offset[1] * ASSET_SCALE))


def place_in_cell(
    sprite: Image.Image,
    offset: tuple[int, int] = (0, 0),
    *,
    mirror: bool = False,
    sx: float = 1.0,
    sy: float = 1.0,
    lean: float = 0.0,
    run_direction: str | None = None,
    accent_phase: int = 0,
) -> Image.Image:
    art = ImageOps.mirror(sprite) if mirror else sprite.copy()
    if sx != 1.0 or sy != 1.0:
        width = max(1, round(art.width * sx))
        height = max(1, round(art.height * sy))
        art = art.resize((width, height), Image.Resampling.NEAREST)
    art = lean_sprite(art, lean)
    cell = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    dx, dy = scaled_offset(offset)
    x = (CELL_W - art.width) // 2 + dx
    y = CELL_H - art.height - 18 * ASSET_SCALE + dy
    cell.alpha_composite(art, (x, y))
    if run_direction:
        add_run_accents(cell, run_direction, accent_phase)
    return clear_transparent_rgb(cell)


def add_run_accents(cell: Image.Image, direction: str, phase: int) -> None:
    draw = ImageDraw.Draw(cell)
    cyan = (88, 216, 224, 150)
    dust = (196, 182, 160, 120)
    step = phase % 4
    y_base = CELL_H - 58 * ASSET_SCALE + step * 2 * ASSET_SCALE
    if direction == "right":
        x0 = 28 * ASSET_SCALE + step * 4 * ASSET_SCALE
        line_sets = [
            (x0, y_base, x0 + 24 * ASSET_SCALE, y_base),
            (x0 + 10 * ASSET_SCALE, y_base + 13 * ASSET_SCALE, x0 + 40 * ASSET_SCALE, y_base + 13 * ASSET_SCALE),
        ]
        dust_x = 46 * ASSET_SCALE
    else:
        x0 = CELL_W - (52 + step * 4) * ASSET_SCALE
        line_sets = [
            (x0, y_base, x0 - 24 * ASSET_SCALE, y_base),
            (x0 - 10 * ASSET_SCALE, y_base + 13 * ASSET_SCALE, x0 - 40 * ASSET_SCALE, y_base + 13 * ASSET_SCALE),
        ]
        dust_x = CELL_W - 58 * ASSET_SCALE
    for line in line_sets:
        draw.line(line, fill=cyan, width=max(2, 2 * ASSET_SCALE))
    for index in range(3):
        r = (2 + index) * ASSET_SCALE
        cx = dust_x + (index * 8 - step * 2) * ASSET_SCALE * (1 if direction == "right" else -1)
        cy = CELL_H - (28 - index * 3) * ASSET_SCALE
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=dust)


def build_sequences(poses: dict[str, list[Image.Image]]) -> dict[str, list[Image.Image]]:
    sequences: dict[str, list[Image.Image]] = {}
    sequences["idle"] = [place_in_cell(frame) for frame in poses["idle"]]
    sequences["review"] = [place_in_cell(frame) for frame in poses["review"]]
    sequences["waiting"] = [place_in_cell(frame) for frame in poses["waiting"]]
    sequences["running"] = [place_in_cell(frame) for frame in poses["running"]]
    sequences["waving"] = [place_in_cell(frame) for frame in poses["waving"][:4]]

    failed_frames = [
        place_in_cell(poses["failed"][2], offset=(0, 12)),
        place_in_cell(poses["failed"][3], offset=(0, 10)),
        place_in_cell(poses["failed"][4], offset=(0, 9)),
        place_in_cell(poses["failed"][5], offset=(0, 8)),
        place_in_cell(poses["failed"][4], offset=(0, 9)),
        place_in_cell(poses["failed"][3], offset=(0, 10)),
        place_in_cell(poses["failed"][2], offset=(0, 11)),
        place_in_cell(poses["failed"][3], offset=(0, 10)),
    ]
    sequences["failed"] = failed_frames

    run_base = poses["idle"][0]
    run_blink = poses["idle"][1]
    sequences["running-left"] = [
        place_in_cell(run_base, offset=(-12, 6), sx=0.99, sy=1.0, lean=3, run_direction="left", accent_phase=0),
        place_in_cell(run_blink, offset=(-7, 2), sx=1.0, sy=0.99, lean=5, run_direction="left", accent_phase=1),
        place_in_cell(run_base, offset=(-1, 5), sx=0.99, sy=1.01, lean=4, run_direction="left", accent_phase=2),
        place_in_cell(run_blink, offset=(6, 1), sx=1.01, sy=0.98, lean=6, run_direction="left", accent_phase=3),
        place_in_cell(run_base, offset=(12, 6), sx=0.99, sy=1.0, lean=3, run_direction="left", accent_phase=0),
        place_in_cell(run_blink, offset=(7, 2), sx=1.0, sy=0.99, lean=5, run_direction="left", accent_phase=1),
        place_in_cell(run_base, offset=(1, 5), sx=0.99, sy=1.01, lean=4, run_direction="left", accent_phase=2),
        place_in_cell(run_blink, offset=(-6, 2), sx=1.0, sy=0.99, lean=5, run_direction="left", accent_phase=3),
    ]
    sequences["running-right"] = [
        place_in_cell(run_base, offset=(12, 6), mirror=True, sx=0.99, sy=1.0, lean=-3, run_direction="right", accent_phase=0),
        place_in_cell(run_blink, offset=(7, 2), mirror=True, sx=1.0, sy=0.99, lean=-5, run_direction="right", accent_phase=1),
        place_in_cell(run_base, offset=(1, 5), mirror=True, sx=0.99, sy=1.01, lean=-4, run_direction="right", accent_phase=2),
        place_in_cell(run_blink, offset=(-6, 1), mirror=True, sx=1.01, sy=0.98, lean=-6, run_direction="right", accent_phase=3),
        place_in_cell(run_base, offset=(-12, 6), mirror=True, sx=0.99, sy=1.0, lean=-3, run_direction="right", accent_phase=0),
        place_in_cell(run_blink, offset=(-7, 2), mirror=True, sx=1.0, sy=0.99, lean=-5, run_direction="right", accent_phase=1),
        place_in_cell(run_base, offset=(-1, 5), mirror=True, sx=0.99, sy=1.01, lean=-4, run_direction="right", accent_phase=2),
        place_in_cell(run_blink, offset=(6, 2), mirror=True, sx=1.0, sy=0.99, lean=-5, run_direction="right", accent_phase=3),
    ]

    jump_base = poses["idle"][0]
    jump_peak = poses["waving"][2]
    sequences["jumping"] = [
        place_in_cell(jump_base, offset=(0, 14), sx=1.04, sy=0.94),
        place_in_cell(jump_peak, offset=(0, 5), sx=0.98, sy=1.02),
        place_in_cell(jump_peak, offset=(0, -12), sx=1.0, sy=1.0),
        place_in_cell(jump_peak, offset=(0, 2), sx=0.98, sy=1.02),
        place_in_cell(jump_base, offset=(0, 14), sx=1.04, sy=0.94),
    ]
    return sequences


def make_contact_sheet(atlas: Image.Image, frame_counts: list[int]) -> Image.Image:
    scale = 0.25
    label_h = 24
    cell_w = round(CELL_W * scale)
    cell_h = round(CELL_H * scale)
    sheet = Image.new("RGB", (cell_w * COLUMNS, ROWS * (cell_h + label_h)), "#f6f4ef")
    draw = ImageDraw.Draw(sheet)
    names = [spec[0] for spec in ROW_SPECS]
    for row, name in enumerate(names):
        top = row * (cell_h + label_h)
        draw.rectangle((0, top, sheet.width, top + label_h - 1), fill="#23262d")
        draw.text((6, top + 5), f"row {row}: {name}", fill="#ffffff")
        for column in range(COLUMNS):
            crop = atlas.crop((column * CELL_W, row * CELL_H, (column + 1) * CELL_W, (row + 1) * CELL_H))
            crop = crop.resize((cell_w, cell_h), Image.Resampling.NEAREST)
            bg = Image.new("RGB", (cell_w, cell_h), "#ffffff")
            alt = Image.new("RGB", (8, 8), "#ece8e0")
            for y in range(0, cell_h, 8):
                for x in range(0, cell_w, 8):
                    if (x // 8 + y // 8) % 2:
                        bg.paste(alt, (x, y))
            bg.paste(crop, (0, 0), crop)
            x = column * cell_w
            sheet.paste(bg, (x, top + label_h))
            outline = "#3aa0a4" if column < frame_counts[row] else "#c25763"
            draw.rectangle((x, top + label_h, x + cell_w - 1, top + label_h + cell_h - 1), outline=outline)
    return sheet


def save_frames(sequences: dict[str, list[Image.Image]]) -> None:
    for state, frames in sequences.items():
        state_dir = FRAMES / state
        state_dir.mkdir(parents=True, exist_ok=True)
        for index, frame in enumerate(frames):
            frame.save(state_dir / f"frame_{index:02d}.png")


def save_atlas(sequences: dict[str, list[Image.Image]]) -> None:
    atlas = Image.new("RGBA", (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
    frame_counts = []
    for state, row, expected in ROW_SPECS:
        frames = sequences[state]
        frame_counts.append(len(frames))
        if len(frames) != expected:
            raise RuntimeError(f"{state} expected {expected} frames, got {len(frames)}")
        for column, frame in enumerate(frames):
            atlas.alpha_composite(frame, (column * CELL_W, row * CELL_H))
    atlas = clear_transparent_rgb(atlas)
    FINAL.mkdir(parents=True, exist_ok=True)
    atlas.save(FINAL / "spritesheet.png")
    atlas.save(FINAL / "spritesheet.webp", lossless=True, method=6)
    make_contact_sheet(atlas, frame_counts).save(QA / "contact-sheet.png")


def copy_assets() -> None:
    manifest = {
        "id": "yuebai-archivist",
        "displayName": "月白档案员",
        "description": "给 Claude Code CLI 用的月白档案员桌宠。",
        "cell": {"width": CELL_W, "height": CELL_H},
        "atlas": {"columns": 8, "rows": 9},
        "animations": {
            "idle": {"row": 0, "frames": 6, "frameDurationMs": 180},
            "running-right": {"row": 1, "frames": 8, "frameDurationMs": 120},
            "running-left": {"row": 2, "frames": 8, "frameDurationMs": 120},
            "waving": {"row": 3, "frames": 4, "frameDurationMs": 150},
            "jumping": {"row": 4, "frames": 5, "frameDurationMs": 150},
            "failed": {"row": 5, "frames": 8, "frameDurationMs": 160},
            "waiting": {"row": 6, "frames": 6, "frameDurationMs": 170},
            "running": {"row": 7, "frames": 6, "frameDurationMs": 130},
            "review": {"row": 8, "frames": 6, "frameDurationMs": 150},
        },
    }
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "pet.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (FINAL / "pet.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Image.open(FINAL / "spritesheet.png").save(ASSETS / "spritesheet.png")


def build() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    poses = {name: [extract_pose(source, box, name) for box in boxes] for name, boxes in SOURCE_BOXES.items()}
    sequences = build_sequences(poses)
    FRAMES.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    save_frames(sequences)
    save_atlas(sequences)
    copy_assets()


if __name__ == "__main__":
    build()
