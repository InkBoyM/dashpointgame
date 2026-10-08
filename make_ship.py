"""Ship portal + ship sprites (32x32, transparent). Stdlib only.
Usage: python3 make_ship.py  -> assets/tiles/shipPortal.png, ship.png
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
W = H = 32
T = (0, 0, 0, 0)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def new():
    return [[T] * W for _ in range(H)]


def disc(cv, cx, cy, r, c, fill=True):
    for y in range(H):
        for x in range(W):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if (fill and d <= r) or (not fill and abs(d - r) < 0.8):
                cv[y][x] = c


def rect(cv, x0, y0, w, h, c):
    for y in range(max(0, y0), min(H, y0 + h)):
        for x in range(max(0, x0), min(W, x0 + w)):
            cv[y][x] = c


def outline(cv, color):
    src = [r[:] for r in cv]
    for y in range(H):
        for x in range(W):
            if src[y][x] != T:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and src[yy][xx] != T:
                        cv[y][x] = color
                        break
                else:
                    continue
                break


def ship_portal():
    cv = new()
    disc(cv, 15.5, 15.5, 14, hx("#0a3a4a"))
    disc(cv, 15.5, 15.5, 14, hx("#2ee6ff"), fill=False)
    disc(cv, 15.5, 15.5, 12, hx("#123f4d"))
    disc(cv, 15.5, 15.5, 10, hx("#7df0e8"), fill=False)
    disc(cv, 15.5, 15.5, 7, hx("#1a6a7a"))
    disc(cv, 15.5, 15.5, 4, hx("#e8fbff"))
    for i in range(8):
        ang = i * math.pi / 4 + 0.4
        x = int(15.5 + 12 * math.cos(ang))
        y = int(15.5 + 12 * math.sin(ang))
        if 0 <= x < W and 0 <= y < H:
            cv[y][x] = hx("#ffffff")
    outline(cv, hx("#062a33"))
    return cv


def ship():
    cv = new()
    DK, BD, WH, OR, YL, CY = (hx("#1c2333"), hx("#ff7b2e"), hx("#ffffff"),
                              hx("#ff9d2e"), hx("#ffd23c"), hx("#2ee6ff"))
    # flame (left)
    for i in range(5):
        x = 1 + i
        hw = 4 - abs(i - 2)
        for y in range(14 - hw, 18 + hw):
            if 0 <= y < H:
                cv[y][x] = YL if i > 1 else OR
    # tail fins
    for i in range(6):
        cv[8 + i][7 - i // 2] = BD
        cv[23 - i][7 - i // 2] = BD
    # body
    for y in range(12, 22):
        for x in range(6, 24):
            cv[y][x] = BD
    for y in range(12, 15):
        for x in range(6, 24):
            cv[y][x] = OR
    # nose cone (right)
    for i in range(8):
        x = 24 + i
        hw = 5 - int(i * 5 / 8)
        for y in range(17 - hw, 17 + hw + 1):
            if 0 <= x < W and 0 <= y < H:
                cv[y][x] = WH if i > 4 else OR
    # cockpit canopy
    for y in range(9, 13):
        for x in range(13, 20):
            cv[y][x] = CY
    rect(cv, 13, 12, 7, 1, WH)
    # wing stripe
    for x in range(8, 22):
        cv[20][x] = YL
    outline(cv, DK)
    return cv


def wp(name, cv):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in cv)

    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    full = os.path.join(HERE, "assets", "tiles", name)
    open(full, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))


if __name__ == "__main__":
    wp("shipPortal.png", ship_portal())
    wp("ship.png", ship())
    print("wrote shipPortal.png + ship.png")
