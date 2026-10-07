"""DashPoint textures v2: richer remake of the DEFAULT 32x32 tile set.
Same silhouettes/palette, added bevels, speckle, outlines, glow.
Writes ONLY to <Temp>/opencode/textures-v2/ (review folder, NOT the game).
Stdlib only. Usage: python3 make_textures_v2.py
"""
import math
import os
import random
import struct
import zlib

OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\textures-v2"
W = H = 32
T = (0, 0, 0, 0)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def new():
    return [[T] * W for _ in range(H)]


def rect(cv, x0, y0, w, h, c):
    for y in range(max(0, y0), min(H, y0 + h)):
        for x in range(max(0, x0), min(W, x0 + w)):
            cv[y][x] = c


def bevel(cv, x0=0, y0=0, w=W, h=H, light=None, dark=None):
    for x in range(x0, min(W, x0 + w)):
        if y0 < H and cv[y0][x] != T and light:
            cv[y0][x] = light
        if y0 + h - 1 < H and cv[y0 + h - 1][x] != T and dark:
            cv[y0 + h - 1][x] = dark
    for y in range(y0, min(H, y0 + h)):
        if x0 < W and cv[y][x0] != T and light:
            cv[y][x0] = light
        if x0 + w - 1 < W and cv[y][x0 + w - 1] != T and dark:
            cv[y][x0 + w - 1] = dark


def speckle(cv, colors, density, seed, region=None):
    x0, y0, w, h = region or (0, 0, W, H)
    rnd = random.Random(seed)
    n = int(w * h * density)
    for _ in range(n):
        x = rnd.randrange(x0, x0 + w)
        y = rnd.randrange(y0, y0 + h)
        if cv[y][x] != T:
            cv[y][x] = rnd.choice(colors)


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


def disc(cv, cx, cy, r, c, fill=True):
    for y in range(H):
        for x in range(W):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if (fill and d <= r) or (not fill and abs(d - r) < 0.7):
                cv[y][x] = c


def spike_tri(cv, x0, x1, ybase, ytip, c, dark=None, light=None):
    for y in range(min(ybase, ytip), max(ybase, ytip) + 1):
        t = (y - ytip) / max(1, (ybase - ytip)) if ybase != ytip else 0
        hw = (x1 - x0) / 2 * t
        cx = (x0 + x1) / 2
        for x in range(int(cx - hw), int(cx + hw) + 1):
            if 0 <= x < W and 0 <= y < H:
                cc = c
                if light and x < cx - hw * 0.3:
                    cc = light
                if dark and x > cx + hw * 0.3:
                    cc = dark
                cv[y][x] = cc


def spike_trio(cv, base, tip, c, dark, light):
    spike_tri(cv, 1, 11, base, tip, c, dark, light)
    spike_tri(cv, 11, 21, base, tip - 1, c, dark, light)
    spike_tri(cv, 21, 31, base, tip, c, dark, light)


DIGITS = {
 "0": ["111", "101", "101", "101", "111"],
 "1": ["010", "110", "010", "010", "111"],
 "5": ["111", "100", "110", "001", "110"],
}


def coin(num):
    cv = new()
    disc(cv, 15.5, 15.5, 13, hx("#8a5a00"))
    disc(cv, 15.5, 15.5, 12, hx("#ffd23c"))
    disc(cv, 15.5, 15.5, 9, hx("#ffe27a"))
    disc(cv, 12, 12, 3, hx("#fff6c8"))
    s = str(num)
    tw = len(s) * 4 - 1
    xoff = (32 - tw * 2) // 2
    for i, ch in enumerate(s):
        g = DIGITS[ch]
        for y in range(5):
            for x in range(3):
                if g[y][x] == "1":
                    rect(cv, xoff + i * 8 + x * 2, 11 + y * 2, 2, 2, hx("#7a4d00"))
    speckle(cv, [hx("#e8a90c"), hx("#fff0a0")], 0.04, 40 + num)
    outline(cv, hx("#5b3a00"))
    return cv


def brick_base(top=None):
    cv = new()
    base, mortar = hx("#5a6b8c"), hx("#2e3d55")
    for y in range(H):
        for x in range(W):
            cv[y][x] = base
    for y in range(0, H, 8):
        for x in range(W):
            cv[y][x] = mortar
    for r in range(4):
        off = 8 if r % 2 else 0
        for y in range(r * 8 + 1, r * 8 + 8):
            for xx in (off, off + 16):
                if xx < W:
                    cv[y][xx] = mortar
    if top:
        for y in range(top):
            for x in range(W):
                cv[y][x] = T
    bevel(cv, light=hx("#7d90b5"), dark=hx("#3a4a68"))
    speckle(cv, [hx("#6b7fa3"), hx("#4a5a78")], 0.05, 7)
    return cv


def orb_jobs(core, mid, dark, spark):
    cv = new()
    disc(cv, 15.5, 15.5, 14, dark)
    disc(cv, 15.5, 15.5, 12, mid)
    disc(cv, 15.5, 15.5, 8, core)
    disc(cv, 12, 12, 3, spark)
    disc(cv, 20, 20, 1, spark)
    speckle(cv, [core], 0.03, 9)
    return cv


TILES = {}


def reg(name, fn, wide=False):
    TILES[name] = fn


def _grass():
    cv = brick_base()
    for y in range(8):
        for x in range(W):
            cv[y][x] = hx("#2ea85c") if y < 6 else hx("#3ee07a")
    for x in range(1, W, 3):
        cv[6][x] = hx("#3ee07a")
        if x % 2:
            cv[5][x] = hx("#3ee07a")
    bevel(cv, light=hx("#7d90b5"), dark=hx("#3a4a68"))
    speckle(cv, [hx("#57d977"), hx("#1e7a44")], 0.08, 11, region=(0, 0, W, 9))
    return cv


reg("brick", lambda: brick_base())
reg("grass", _grass)


def _spikes(moss=False):
    cv = new()
    spike_trio(cv, 31, 5, hx("#8b93a8"), hx("#3a4358"), hx("#e8ecf5"))
    if moss:
        rnd = random.Random(21)
        for _ in range(14):
            x = rnd.randrange(0, W)
            y = rnd.randrange(26, 32)
            if cv[y][x] != T:
                cv[y][x] = hx("#3ee07a")
        for x in range(W):
            if cv[31][x] != T:
                cv[31][x] = hx("#2ea85c")
            if cv[30][x] != T and x % 2 == 0:
                cv[30][x] = hx("#3ee07a")
    outline(cv, hx("#1c2333"))
    return cv


reg("spike", lambda: _spikes(False))
reg("gspike", lambda: _spikes(True))


def _flag(color):
    cv = new()
    rect(cv, 14, 6, 3, 20, hx("#3a4358"))
    rect(cv, 14, 6, 1, 20, hx("#6b7a99"))
    for i in range(11):
        w = 11 - int(i * 0.7)
        for x in range(17, 17 + w):
            cv[6 + i][x] = color
    for i in range(11):
        cv[6 + i][17] = hx("#ffffff") if i % 3 == 0 else color
    rect(cv, 10, 26, 12, 5, hx("#2ea85c"))
    rect(cv, 10, 26, 12, 1, hx("#57d977"))
    outline(cv, hx("#1c2333"))
    return cv


reg("checkpoint", lambda: _flag(hx("#ffd23c")))
reg("checkpoint-touched", lambda: _flag(hx("#2ee6ff")))


def _goal():
    cv = new()
    rect(cv, 7, 4, 3, 24, hx("#5b3a00"))
    rect(cv, 7, 4, 1, 24, hx("#8a5f14"))
    for i in range(13):
        w = 15 - int(i * 0.9)
        for x in range(10, 10 + w):
            cv[5 + i][x] = hx("#ffd23c") if (x + i) % 2 == 0 else hx("#e8a90c")
    rect(cv, 5, 28, 9, 3, hx("#5b3a00"))
    outline(cv, hx("#1c2333"))
    return cv


reg("goal", _goal)
reg("BounceOrb", lambda: orb_jobs(hx("#7dff8a"), hx("#2ee66e"), hx("#0e6e3e"), hx("#eaffea")))
def _djorb():
    cv = orb_jobs(hx("#bcdcff"), hx("#5b7fb8"), hx("#2e3d55"), hx("#ffffff"))
    for y, x in [(12, 16), (13, 16), (14, 14), (14, 15), (14, 16), (14, 17), (15, 14), (16, 12), (16, 13), (16, 14), (17, 12), (18, 12)]:
        if 0 <= x < W and 0 <= y < H:
            cv[y][x] = hx("#ffd23c")
    outline(cv, hx("#1c2333"))
    return cv


reg("djOrb", _djorb)


def _gravorb():
    cv = orb_jobs(hx("#d9a0ff"), hx("#8b3fd9"), hx("#3d1470"), hx("#f4e8ff"))
    for i in range(9):
        ang = i * 0.7
        x = int(15.5 + 9 * math.cos(ang))
        y = int(15.5 + 6 * math.sin(ang))
        if 0 <= x < W and 0 <= y < H:
            cv[y][x] = hx("#f4e8ff")
    outline(cv, hx("#1c2333"))
    return cv


reg("gravOrb", _gravorb)


def _pad():
    cv = new()
    rect(cv, 4, 22, 24, 7, hx("#8c1f28"))
    rect(cv, 2, 16, 28, 7, hx("#e63946"))
    rect(cv, 2, 16, 28, 2, hx("#ff8a94"))
    rect(cv, 2, 21, 28, 2, hx("#a11d26"))
    speckle(cv, [hx("#f4a4ac")], 0.05, 31)
    outline(cv, hx("#1c2333"))
    return cv


reg("BouncePad", _pad)


def _dash():
    cv = new()
    for k, xo in enumerate([4, 14]):
        for i in range(12):
            for w in range(4):
                x = xo + i + (w if i > 5 else 0)
                y = 10 + i
                if 0 <= x < W:
                    cv[y][x] = hx("#ffd23c") if w < 3 else hx("#e8a90c")
    outline(cv, hx("#5b3a00"))
    return cv


reg("DashIcon", _dash)


def _key():
    cv = new()
    disc(cv, 8, 15, 6, hx("#8a5a00"))
    disc(cv, 8, 15, 5, hx("#ffd23c"))
    disc(cv, 8, 15, 2, T)
    rect(cv, 12, 14, 14, 3, hx("#ffd23c"))
    rect(cv, 12, 14, 14, 1, hx("#ffe27a"))
    rect(cv, 21, 17, 3, 5, hx("#ffd23c"))
    rect(cv, 25, 17, 2, 4, hx("#e8a90c"))
    disc(cv, 6, 13, 1, hx("#fff6c8"))
    outline(cv, hx("#5b3a00"))
    return cv


reg("key", _key)


def _door():
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#6e4a2f")
    for x in range(0, W, 6):
        for y in range(H):
            cv[y][x] = hx("#4a2f1d")
    rect(cv, 0, 0, W, 2, hx("#8a613c"))
    rect(cv, 0, 0, 2, H, hx("#8a613c"))
    rect(cv, W - 2, 0, 2, H, hx("#3a2412"))
    rect(cv, 0, H - 2, W, 2, hx("#3a2412"))
    disc(cv, 24, 16, 3, hx("#3a2412"))
    disc(cv, 24, 16, 2, hx("#ffd23c"))
    disc(cv, 23, 15, 1, hx("#fff6c8"))
    speckle(cv, [hx("#7d5738")], 0.05, 33)
    return cv


reg("door", _door)
reg("coin10", lambda: coin(10))
reg("coin50", lambda: coin(50))
reg("coin100", lambda: coin(100))
reg("coin500", lambda: coin(500))


def _conv(right=True):
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#5b4632")
    for y in range(0, H, 6):
        for x in range(W):
            cv[y][x] = hx("#3a2d20")
    for i in range(3):
        cx = 5 + i * 10
        for k in range(6):
            for w in range(3):
                x = cx + (k if right else -k) + (w if k > 2 else 0)
                y = 12 + k
                if 0 <= x < W:
                    cv[y][x] = hx("#ffd23c") if w < 2 else hx("#e8a90c")
    bevel(cv, light=hx("#7d6448"), dark=hx("#2e2419"))
    speckle(cv, [hx("#6b5540")], 0.04, 35)
    return cv


reg("convL", lambda: _conv(False))
reg("convR", lambda: _conv(True))


def _crusher():
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#4a4f5e")
    for i in range(4):
        x = 2 + i * 8
        for k in range(5):
            xx, yy = x + k, 24 + k
            if xx < W and yy < H:
                cv[yy][xx] = hx("#ffd23c")
            if xx + 1 < W and yy + 1 < H:
                cv[yy + 1][xx + 1] = hx("#8a5a00")
    for cx, cy in [(3, 3), (28, 3), (3, 20), (28, 20)]:
        disc(cv, cx, cy, 2, hx("#2e323d"))
        disc(cv, cx, cy, 1, hx("#8b93a8"))
    bevel(cv, light=hx("#6b7285"), dark=hx("#2e323d"))
    speckle(cv, [hx("#5a6172")], 0.04, 37)
    return cv


reg("crusher", _crusher)


def _half(top=False):
    cv = new()
    y0 = 0 if top else 16
    for y in range(y0, y0 + 16):
        for x in range(W):
            cv[y][x] = hx("#c96a2e")
    bevel(cv, y0=y0, h=16, light=hx("#eda75e"), dark=hx("#7d3f16"))
    speckle(cv, [hx("#d97f42")], 0.05, 39)
    return cv


reg("half", lambda: _half(False))
reg("halfT", lambda: _half(True))


def _ice():
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#bcdcff")
    for i in range(24):
        x = 4 + i
        if x < W:
            cv[i // 2][x] = hx("#ffffff")
    rnd = random.Random(41)
    x, y = 6, 8
    for _ in range(14):
        cv[y][x] = hx("#ffffff")
        x += rnd.choice([1, 1, 2])
        y += rnd.choice([0, 1, 1, 2])
        if x >= W - 1 or y >= H - 1:
            break
    bevel(cv, light=hx("#ffffff"), dark=hx("#7aa8d0"))
    return cv


reg("ice", _ice)


def _mud():
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#6e4a2f")
    rnd = random.Random(43)
    for _ in range(12):
        disc(cv, rnd.randrange(2, 30), rnd.randrange(2, 30), rnd.randrange(2, 4), hx("#4a2f1d"))
    for _ in range(8):
        disc(cv, rnd.randrange(2, 30), rnd.randrange(2, 30), 1, hx("#8a613c"))
    bevel(cv, light=hx("#8a613c"), dark=hx("#3a2412"))
    return cv


reg("mud", _mud)


def _platform():
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#5a6b8c")
    rect(cv, 0, 0, W, 3, hx("#8b9bbd"))
    rect(cv, 0, H - 3, W, 3, hx("#2e3d55"))
    for x in range(4, W, 8):
        disc(cv, x, 16, 2, hx("#2e3d55"))
        disc(cv, x, 16, 1, hx("#8b9bbd"))
    speckle(cv, [hx("#6b7fa3")], 0.04, 45)
    return cv


reg("platform", _platform)


def _portal(color, light):
    cv = new()
    disc(cv, 15.5, 15.5, 14, color)
    disc(cv, 15.5, 15.5, 11, hx("#0a1420"))
    disc(cv, 15.5, 15.5, 8, color)
    disc(cv, 15.5, 15.5, 4, light)
    for i in range(6):
        ang = i * 1.05
        x = int(15.5 + 12 * math.cos(ang))
        y = int(15.5 + 12 * math.sin(ang))
        if 0 <= x < W and 0 <= y < H and cv[y][x] == T:
            cv[y][x] = light
    return cv


reg("portalA", lambda: _portal(hx("#2e6ff2"), hx("#bcdcff")))
reg("portalB", lambda: _portal(hx("#f2762e"), hx("#ffe27a")))


def _saw():
    cv = new()
    for i in range(12):
        ang = i * math.pi / 6
        tx, ty = 15.5 + 15 * math.cos(ang), 15.5 + 15 * math.sin(ang)
        bx, by = 15.5 + 9 * math.cos(ang + 0.26), 15.5 + 9 * math.sin(ang + 0.26)
        steps = 12
        for s_ in range(steps):
            t = s_ / steps
            x = int(bx + (tx - bx) * t)
            y = int(by + (ty - by) * t)
            if 0 <= x < W and 0 <= y < H:
                cv[y][x] = hx("#8b93a8")
    disc(cv, 15.5, 15.5, 10, hx("#6b7285"))
    disc(cv, 15.5, 15.5, 7, hx("#3a3f4d"))
    disc(cv, 15.5, 15.5, 4, hx("#e63946"))
    disc(cv, 14, 14, 1, hx("#ff8a94"))
    outline(cv, hx("#1c2333"))
    return cv


reg("saw", _saw)


def _slope(right=False):
    cv = new()
    for y in range(H):
        for x in range(W):
            if (x + y >= 31) if not right else (32 - x + y >= 31):
                cv[y][x] = hx("#2ea8a0")
    for y in range(H):
        for x in range(W):
            if cv[y][x] == T:
                continue
            on = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < W and 0 <= yy < H and cv[yy][xx] == T:
                        on = True
            if on and ((x + y < 36) if not right else (32 - x + y < 36)):
                cv[y][x] = hx("#7df0e8")
    speckle(cv, [hx("#35bcb4"), hx("#1e7a74")], 0.05, 47)
    outline(cv, hx("#123f3c"))
    return cv


reg("slopeL", lambda: _slope(False))
reg("slopeR", lambda: _slope(True))


def _water(phase=0):
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#1e5fd0") if y > 20 else hx("#2e7ff2")
    for x in range(W):
        s = int(3 * math.sin((x + phase * 8) / 5))
        for y in range(4 + s, 8 + s):
            if 0 <= y < H:
                cv[y][x] = hx("#9beaff")
        cv[8 + s][x] = hx("#ffffff") if 0 <= 8 + s < H else cv[8 + s][x]
    rnd = random.Random(49 + phase)
    for _ in range(8):
        disc(cv, rnd.randrange(0, 32), rnd.randrange(12, 30), 1, hx("#9beaff"))
    return cv


def _lava(phase=0):
    cv = new()
    for y in range(H):
        for x in range(W):
            cv[y][x] = hx("#c22e12") if y < 6 else hx("#e6531a")
    for x in range(W):
        for y in range(6):
            cv[y][x] = hx("#5b1a0c")
    rnd = random.Random(51 + phase)
    for _ in range(10):
        disc(cv, rnd.randrange(0, 32), rnd.randrange(8, 30), rnd.randrange(1, 3), hx("#ffd23c"))
    for _ in range(6):
        disc(cv, rnd.randrange(0, 32), rnd.randrange(8, 30), 1, hx("#ff8a3c"))
    return cv


reg("water", lambda: _water(0))
reg("lava", lambda: _lava(0))


def _strip(fn, n=4):
    big = [[T] * (W * n) for _ in range(H)]
    for i in range(n):
        cv = fn(i)
        for y in range(H):
            for x in range(W):
                big[y][i * W + x] = cv[y][x]
    return big


reg("water-strip", lambda: _strip(_water), wide=True)
reg("lava-strip", lambda: _strip(_lava), wide=True)


def _background():
    cv = new()
    for y in range(H):
        t = y / (H - 1)
        c = (int(168 + t * 20), int(196 + t * 16), int(220 + t * 12), 255)
        for x in range(W):
            cv[y][x] = c
    speckle(cv, [(190, 214, 232, 255)], 0.03, 53)
    return cv


reg("background", _background)


def wp(path, cv, w=None, h=None):
    H_ = len(cv)
    W_ = len(cv[0])
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in cv)

    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", W_, H_, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))


def main():
    os.makedirs(OUT, exist_ok=True)
    names = []
    for name, fn in TILES.items():
        cv = fn()
        if name.endswith("-strip"):
            wp(name + ".png", cv)
        else:
            wp(name + ".png", cv)
        names.append(name)
        print("wrote", name)
    print(len(names), "tiles ->", OUT)


if __name__ == "__main__":
    main()

