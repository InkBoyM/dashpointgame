"""Key + locked-door tiles. Stdlib only. 32x32 RGBA, black outlines.
Outputs: assets/tiles/key.png, assets/tiles/door.png (+ editor copy),
drawing variants (sketchified like the runtime fallback) and neon copies.
"""
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
T = (0, 0, 0, 0)
BLK = (0, 0, 0, 255)
GOLD = (255, 210, 60, 255)
GOLD_D = (190, 140, 20, 255)
WHT = (255, 255, 255, 255)
WOOD = (138, 90, 43, 255)
WOOD_D = (94, 60, 28, 255)


def new():
    return [[T] * 32 for _ in range(32)]


def setp(cv, x, y, c):
    if 0 <= x < 32 and 0 <= y < 32:
        cv[y][x] = c


def rect(cv, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(32, y1 + 1)):
        for x in range(max(0, x0), min(32, x1 + 1)):
            cv[y][x] = c


def disc(cv, cx, cy, r, c, fill=True):
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if fill and d <= r * r:
                setp(cv, x, y, c)
            elif not fill and abs(d - r * r) < r * 1.6:
                setp(cv, x, y, c)


def wp(path, cv):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in cv)

    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    full = os.path.join(HERE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", 32, 32, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", path)


def make_key():
    cv = new()
    # ring (bow) at left
    disc(cv, 9, 16, 6, BLK)
    disc(cv, 9, 16, 4, GOLD)
    disc(cv, 9, 16, 2, T)
    # shaft
    rect(cv, 13, 14, 26, 17, BLK)
    rect(cv, 14, 15, 25, 16, GOLD)
    # teeth
    rect(cv, 21, 17, 23, 21, BLK)
    rect(cv, 22, 18, 22, 20, GOLD)
    rect(cv, 25, 17, 26, 19, BLK)
    # shine
    setp(cv, 7, 13, WHT)
    setp(cv, 15, 15, WHT)
    return cv


def make_door():
    cv = new()
    # frame
    rect(cv, 5, 2, 26, 29, BLK)
    # wood fill
    rect(cv, 7, 4, 24, 27, WOOD)
    # planks
    for x in (11, 16, 21):
        rect(cv, x, 4, x, 27, WOOD_D)
    # panels
    rect(cv, 9, 6, 14, 12, WOOD_D)
    rect(cv, 17, 6, 22, 12, WOOD_D)
    rect(cv, 9, 15, 14, 25, WOOD_D)
    rect(cv, 17, 15, 22, 25, WOOD_D)
    rect(cv, 10, 7, 13, 11, WOOD)
    rect(cv, 18, 7, 21, 11, WOOD)
    rect(cv, 10, 16, 13, 24, WOOD)
    rect(cv, 18, 16, 21, 24, WOOD)
    # knob + keyhole
    disc(cv, 22, 16, 2, GOLD_D)
    setp(cv, 22, 16, GOLD)
    rect(cv, 15, 13, 16, 15, BLK)
    return cv


def sketchify(cv):
    out = [[T] * 32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            r, g, b, a = cv[y][x]
            if a == 0:
                continue
            v = 0.299 * r + 0.587 * g + 0.114 * b
            v = (v - 128) * 1.35 + 128
            v = max(0, min(255, v))
            v = round(v / 255 * 4) * (255 / 4)
            edge = x == 0 or y == 0 or x == 31 or y == 31 or cv[y][x - 1][3] == 0 or cv[y][x + 1 if x < 31 else x][3] == 0 or cv[y - 1][x][3] == 0 or cv[y + 1 if y < 31 else y][x][3] == 0
            v = int(min(v, 40)) if edge else int(v)
            out[y][x] = (v, v, v, a)
    return out


def main():
    key, door = make_key(), make_door()
    wp("assets/tiles/key.png", key)
    wp("assets/tiles/door.png", door)
    wp("editor/assets/tiles/key.png", key)
    wp("editor/assets/tiles/door.png", door)
    wp("assets/drawing/tiles/key.png", sketchify(key))
    wp("assets/drawing/tiles/door.png", sketchify(door))
    # neon falls back to default art at runtime: copy it so no 404s are probed
    wp("assets/neon/tiles/key.png", key)
    wp("assets/neon/tiles/door.png", door)


if __name__ == "__main__":
    main()
