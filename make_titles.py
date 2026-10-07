"""Pixel-art level title cards: chunky 3x5 lettering + per-level decorations.
Stdlib only. Usage: python3 make_titles.py
Writes assets/titles/<slug>.png + titles_sheet.png (contact sheet).
"""
import math
import os
import random
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
T = (0, 0, 0, 0)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


FONT = {
 "A": ["010", "101", "111", "101", "101"],
 "B": ["110", "101", "110", "101", "110"],
 "C": ["011", "100", "100", "100", "011"],
 "D": ["110", "101", "101", "101", "110"],
 "E": ["111", "100", "110", "100", "111"],
 "F": ["111", "100", "110", "100", "100"],
 "G": ["011", "100", "101", "101", "011"],
 "H": ["101", "101", "111", "101", "101"],
 "I": ["111", "010", "010", "010", "111"],
 "J": ["001", "001", "001", "101", "010"],
 "K": ["101", "110", "100", "110", "101"],
 "L": ["100", "100", "100", "100", "111"],
 "M": ["101", "111", "111", "101", "101"],
 "N": ["110", "111", "101", "101", "101"],
 "O": ["010", "101", "101", "101", "010"],
 "P": ["110", "101", "110", "100", "100"],
 "Q": ["010", "101", "101", "110", "011"],
 "R": ["110", "101", "110", "101", "101"],
 "S": ["011", "100", "010", "001", "110"],
 "T": ["111", "010", "010", "010", "010"],
 "U": ["101", "101", "101", "101", "111"],
 "V": ["101", "101", "101", "101", "010"],
 "W": ["101", "101", "111", "111", "101"],
 "X": ["101", "101", "010", "101", "101"],
 "Y": ["101", "101", "010", "010", "010"],
 "Z": ["111", "001", "010", "100", "111"],
 " ": ["000", "000", "000", "000", "000"],
 "!": ["010", "010", "010", "000", "010"],
 "'": ["010", "010", "000", "000", "000"],
 "-": ["000", "000", "111", "000", "000"],
 ".": ["000", "000", "000", "000", "010"],
}

PX = 8
OUTLINE = hx("#0a1420")


def split_lines(name):
    name = name.upper()
    if len(name) <= 14:
        return [name]
    words = name.split(" ")
    best = None
    for i in range(1, len(words)):
        a = " ".join(words[:i])
        b = " ".join(words[i:])
        score = abs(len(a) - len(b)) + max(len(a), len(b)) * 0.1
        if best is None or score < best[0]:
            best = (score, [a, b])
    return best[1]


def render_text(lines):
    widths = [len(l) * 4 - 1 for l in lines]
    W = max(widths)
    H = len(lines) * 6 - 1
    cv = [[T] * W for _ in range(H)]
    boxes = []
    for li, line in enumerate(lines):
        xoff = (W - widths[li]) // 2
        for ci, ch in enumerate(line):
            g = FONT.get(ch, FONT[" "])
            cx = xoff + ci * 4
            for y in range(5):
                for x in range(3):
                    if g[y][x] == "1":
                        cv[li * 6 + y][cx + x] = (255, 255, 255, 255)
            boxes.append((cx, li * 6, 3, 5))
    return cv, boxes, W, H


def scale(cv, s):
    H = len(cv)
    W = len(cv[0])
    out = [[T] * (W * s) for _ in range(H * s)]
    for y in range(H):
        for x in range(W):
            c = cv[y][x]
            if c != T:
                for dy in range(s):
                    for dx in range(s):
                        out[y * s + dy][x * s + dx] = c
    return out


def paint(cv, fill, outline):
    H = len(cv)
    W = len(cv[0])
    mask = [[cv[y][x] != T for x in range(W)] for y in range(H)]
    out = [[T] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if mask[y][x]:
                out[y][x] = fill
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and mask[yy][xx]:
                        out[y][x] = outline
                        break
                else:
                    continue
                break
    return out


def spike_row(cv, y, color, up, step=4, w=3, h=4):
    H = len(cv)
    W = len(cv[0])
    x = 1
    while x < W - 1:
        for i in range(h):
            yy = y - i if up else y + i
            half = w - int(w * i / h) - 1
            if 0 <= yy < H:
                for xx in range(x - half, x + half + 1):
                    if 0 <= xx < W:
                        cv[yy][xx] = color
        x += step


def dots(cv, n, color, seed, y0=0, y1=None, x0=0, x1=None):
    H = len(cv)
    W = len(cv[0])
    y1 = H if y1 is None else y1
    x1 = W if x1 is None else x1
    rnd = random.Random(seed)
    for _ in range(n):
        cv[rnd.randrange(y0, y1)][rnd.randrange(x0, x1)] = color


def circle(cv, cx, cy, r, color, fill=False):
    H = len(cv)
    W = len(cv[0])
    for y in range(max(0, cy - r - 1), min(H, cy + r + 2)):
        for x in range(max(0, cx - r - 1), min(W, cx + r + 2)):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if (abs(d - r) < 0.8) or (fill and d < r):
                cv[y][x] = color


def hline(cv, x0, x1, y, color, w=1):
    H = len(cv)
    W = len(cv[0])
    for yy in range(y, y + w):
        if 0 <= yy < H:
            for x in range(max(0, x0), min(W, x1)):
                cv[yy][x] = color


def chevrons(cv, y, color, n=5):
    H = len(cv)
    W = len(cv[0])
    gap = W // (n + 1)
    for i in range(1, n + 1):
        cx = i * gap
        for k in range(5):
            for dx, dy in ((0, 0), (-1, 1), (1, 1), (-2, 2), (2, 2)):
                xx, yy = cx + dx + (k - 2), y + dy
                if 0 <= xx < W and 0 <= yy < H:
                    cv[yy][xx] = color


def drops(cv, y, color, seed=7, n=7):
    H = len(cv)
    W = len(cv[0])
    rnd = random.Random(seed)
    for _ in range(n):
        x = rnd.randrange(2, W - 2)
        r = rnd.randrange(2, 4)
        circle(cv, x, y + r, r, color, fill=True)
        for i in range(r):
            yy = y + r - i - 1
            if 0 <= yy < H:
                cv[yy][x] = color


def flames(cv, y, c1, c2, seed=3):
    H = len(cv)
    W = len(cv[0])
    rnd = random.Random(seed)
    x = 0
    while x < W:
        h = rnd.randrange(3, 7)
        w = rnd.randrange(2, 4)
        for i in range(h):
            yy = y - i
            half = max(0, w - int(w * i / h) - 1)
            if 0 <= yy < H:
                for xx in range(x - half, x + half + 1):
                    if 0 <= xx < W:
                        cv[yy][xx] = c1 if i < h - 2 else c2
        x += w + 1


def battlements(cv, y, color, h=4, w=6):
    H = len(cv)
    W = len(cv[0])
    for x in range(0, W, w * 2):
        for yy in range(y - h, y):
            if 0 <= yy < H:
                for xx in range(x, min(W, x + w)):
                    cv[yy][xx] = color


def brick_frame(cv, color):
    H = len(cv)
    W = len(cv[0])
    for x in range(0, W, 8):
        for xx in range(x, min(W, x + 6)):
            cv[0][xx] = color
            cv[1][xx] = color
            cv[H - 1][xx] = color
            cv[H - 2][xx] = color
    for x in range(4, W, 8):
        for xx in range(x, min(W, x + 6)):
            cv[2][xx] = color
            cv[H - 3][xx] = color
    for y in range(0, H, 8):
        for yy in range(y, min(H, y + 6)):
            cv[yy][0] = color
            cv[yy][1] = color
            cv[yy][W - 1] = color
            cv[yy][W - 2] = color


def hills(cv, y, c1, c2):
    H = len(cv)
    W = len(cv[0])
    x = 0
    i = 0
    while x < W:
        r = 8 + (i % 3) * 4
        circle(cv, x + r, y + r - 2, r, c1 if i % 2 == 0 else c2)
        x += r + 3
        i += 1


def star(cv, cx, cy, r, color):
    for i in range(10):
        ang = math.pi * 2 * i / 10 - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.45
        x = int(cx + rr * math.cos(ang))
        y = int(cy + rr * math.sin(ang))
        if 0 <= x < len(cv[0]) and 0 <= y < len(cv):
            cv[y][x] = color
    if 0 <= cx < len(cv[0]) and 0 <= cy < len(cv):
        cv[cy][cx] = color


def wind(cv, y0, color, seed=11, n=4):
    H = len(cv)
    W = len(cv[0])
    rnd = random.Random(seed)
    for i in range(n):
        y = y0 + i * 5
        amp = rnd.randrange(1, 3)
        ph = rnd.randrange(0, 6)
        for x in range(W):
            yy = y + int(amp * math.sin(x / 6 + ph))
            if 0 <= yy < H:
                cv[yy][x] = color
                if yy + 1 < H:
                    cv[yy + 1][x] = color


LEVELS = [
 ("00_welcome", "Welcome", "#ffd23c", lambda cv, W, H: (
    dots(cv, 26, hx("#ffd23c"), 5), dots(cv, 14, hx("#ffffff"), 6),
    hills(cv, H - 4, hx("#3ee07a"), hx("#2ea85c")))),
 ("cool_run", "Cool Run", "#9beaff", lambda cv, W, H: (
    dots(cv, 40, hx("#ffffff"), 8), dots(cv, 20, hx("#9beaff"), 9),
    spike_row(cv, 6, hx("#dff6ff"), True))),
 ("orb_run", "Orb run", "#b45cff", lambda cv, W, H: (
    circle(cv, 12, 12, 7, hx("#b45cff")), circle(cv, 12, 12, 4, hx("#e8c4ff")),
    circle(cv, W - 12, H - 12, 7, hx("#b45cff")), circle(cv, W - 12, H - 12, 4, hx("#e8c4ff")),
    dots(cv, 24, hx("#8b5cf6"), 10))),
 ("spike_run", "spike run", "#c8d8f0", lambda cv, W, H: (
    spike_row(cv, 8, hx("#ff4d62"), True), spike_row(cv, H - 8, hx("#ff4d62"), False),
    spike_row(cv, 4, hx("#c8d8f0"), True))),
 ("the_climb", "the climb", "#3ee07a", lambda cv, W, H: (
    chevrons(cv, 3, hx("#3ee07a")), chevrons(cv, 10, hx("#b6ffd0"), 4),
    dots(cv, 16, hx("#3ee07a"), 12))),
 ("the_hill", "The Hill", "#8ddc5f", lambda cv, W, H: (
    hills(cv, H - 5, hx("#3ee07a"), hx("#1e7a44")),
    dots(cv, 12, hx("#ffd23c"), 13))),
 ("the_rush", "The Rush", "#ff9d2e", lambda cv, W, H: (
    hline(cv, 0, 40, 6, hx("#ff9d2e"), 2), hline(cv, 0, 30, 14, hx("#ffd23c"), 2),
    hline(cv, W - 40, W, H - 10, hx("#ff9d2e"), 2), hline(cv, W - 30, W, H - 18, hx("#ffd23c"), 2))),
 ("the_tunnel", "tunnel", "#8b93a8", lambda cv, W, H: (
    brick_frame(cv, hx("#3a4358")), dots(cv, 18, hx("#232b3d"), 14))),
 ("the_dropper", "The Dropper!!", "#4f96ff", lambda cv, W, H: (
    drops(cv, 2, hx("#4f96ff"), 15, 8), drops(cv, 2, hx("#bcdcff"), 16, 5))),
 ("the_blow", "The Blow", "#2ee6ff", lambda cv, W, H: (
    wind(cv, 6, hx("#2ee6ff"), 17, 3), wind(cv, H - 16, hx("#b6f4ff"), 18, 3))),
 ("agony", "Agony", "#ff2e3e", lambda cv, W, H: (
    spike_row(cv, 7, hx("#ff2e3e"), True, step=3), spike_row(cv, H - 7, hx("#ff2e3e"), False, step=3),
    dots(cv, 20, hx("#7a0e18"), 19))),
 ("the_tower_of_torture", "The Tower of Torture", "#ff5a1a", lambda cv, W, H: (
    battlements(cv, 5, hx("#5b2d8e")), flames(cv, H - 3, hx("#ff5a1a"), hx("#ffd23c"), 20),
    spike_row(cv, 10, hx("#c8d8f0"), True, step=6))),
 ("the_tower_of_agony", "The Tower of Agony", "#dc143c", lambda cv, W, H: (
    battlements(cv, 5, hx("#3a4358")), spike_row(cv, H - 6, hx("#dc143c"), False, step=3),
    dots(cv, 16, hx("#5b0e18"), 21))),
]


def wp(path, cv):
    H = len(cv)
    W = len(cv[0])
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in cv)

    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    full = os.path.join(HERE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))


def main():
    for slug, name, color, deco in LEVELS:
        lines = split_lines(name)
        cv, boxes, W, H = render_text(lines)
        cv = scale(cv, PX)
        cv = paint(cv, hx(color), OUTLINE)
        W2 = len(cv[0])
        H2 = len(cv)
        pad = 14
        big = [[T] * (W2 + pad * 2) for _ in range(H2 + pad * 2 + 8)]
        deco(big, W2 + pad * 2, H2 + pad * 2 + 8)
        for y in range(H2):
            for x in range(W2):
                if cv[y][x] != T:
                    big[y + pad][x + pad] = cv[y][x]
        wp("assets/titles/title-%s.png" % slug, big)
        print("wrote", slug, len(big[0]), "x", len(big))


if __name__ == "__main__":
    main()
