"""Drawing pack: hand-style B&W doodle redraws of every editor tile. Stdlib only.
Style: paper fill, thick ink outlines, hatch shading. 32x32, RGBA.
Output: assets/drawing/tiles/*.png (same basenames as assets/tiles/)."""
import zlib, struct, os, math
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\drawing\tiles"
INK = (22, 22, 28, 255)
PAPER = (246, 244, 236, 255)
GRAY = (155, 155, 158, 255)
LGRAY = (208, 208, 202, 255)
T = (0, 0, 0, 0)

def wp(path, px, w=32, h=32):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in px)
    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", os.path.basename(path))

def new():
    return [[T] * 32 for _ in range(32)]

def setp(cv, x, y, c):
    if 0 <= x < 32 and 0 <= y < 32:
        cv[y][x] = c

def hline(cv, x0, x1, y, c):
    for x in range(max(0, x0), min(32, x1 + 1)):
        cv[y][x] = c

def vline(cv, x, y0, y1, c):
    for y in range(max(0, y0), min(32, y1 + 1)):
        cv[y][x] = c

def fillrect(cv, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(32, y1 + 1)):
        for x in range(max(0, x0), min(32, x1 + 1)):
            cv[y][x] = c

def rect(cv, x0, y0, x1, y1, c, w=1):
    for _ in range(w):
        hline(cv, x0, x1, y0, c); hline(cv, x0, x1, y1, c)
        vline(cv, x0, y0, y1, c); vline(cv, x1, y0, y1, c)
        x0 += 1; y0 += 1; x1 -= 1; y1 -= 1

def circle(cv, cx, cy, r, c, fill=None):
    x, y, d = r, 0, 1 - r
    pts = set()
    while x >= y:
        for px, py in [(x, y), (y, x), (-x, y), (-y, x), (x, -y), (y, -x), (-x, -y), (-y, -x)]:
            pts.add((cx + px, cy + py))
        y += 1
        if d < 0: d += 2 * y + 1
        else: x -= 1; d += 2 * (y - x) + 1
    if fill is not None:
        for yy in range(cy - r, cy + r + 1):
            for xx in range(cx - r, cx + r + 1):
                if (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r:
                    setp(cv, xx, yy, fill)
    for px, py in pts:
        setp(cv, px, py, c)

def hatch(cv, x0, y0, x1, y1, c, step=4):
    for y in range(max(0, y0), min(32, y1 + 1)):
        for x in range(max(0, x0), min(32, x1 + 1)):
            if (x + y) % step == 0 and cv[y][x] != T:
                cv[y][x] = c

def tri(cv, ax, ay, bx, by, cx2, cy2, c, fill=None):
    # outline via three lines
    for f in (lambda t: (int(ax + (bx - ax) * t), int(ay + (by - ay) * t)),
              lambda t: (int(bx + (cx2 - bx) * t), int(by + (cy2 - by) * t)),
              lambda t: (int(cx2 + (ax - cx2) * t), int(cy2 + (ay - cy2) * t))):
        for i in range(64):
            setp(cv, *f(i / 63), c)
    if fill is not None:
        for yy in range(32):
            for xx in range(32):
                if point_in_tri(xx, yy, ax, ay, bx, by, cx2, cy2):
                    setp(cv, xx, yy, fill)

def point_in_tri(x, y, ax, ay, bx, by, cx, cy):
    def s(px, py, qx, qy, rx, ry): return (qx - px) * (ry - py) - (qy - py) * (rx - px)
    d1 = s(x, y, ax, ay, bx, by); d2 = s(x, y, bx, by, cx, cy); d3 = s(x, y, cx, cy, ax, ay)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)

def brick_base(cv, grass_top=False):
    fillrect(cv, 1, 1, 30, 30, PAPER)
    rect(cv, 0, 0, 31, 31, INK, 2)
    for y in (10, 20):
        hline(cv, 1, 30, y, INK)
    for x in (10, 21):
        vline(cv, x, 2, 9, INK)
    for x in (16, 27):
        vline(cv, x, 11, 19, INK)
    for x in (10, 21):
        vline(cv, x, 21, 29, INK)
    hatch(cv, 22, 22, 30, 30, GRAY)
    if grass_top:
        for x in range(0, 32):
            setp(cv, x, 0, INK); setp(cv, x, 1, INK)
        for x in range(2, 30, 4):
            vline(cv, x, 2, 4, INK)

def spike_shape(cv, grass=False):
    tri(cv, 16, 3, 4, 28, 28, 28, INK, PAPER)
    tri(cv, 16, 9, 9, 25, 23, 25, GRAY, None)
    hline(cv, 2, 29, 29, INK); hline(cv, 2, 29, 30, INK)
    if grass:
        for x in (4, 9, 23, 28):
            setp(cv, x, 27, INK); setp(cv, x, 26, INK)

def orb_shape(cv, inner):
    circle(cv, 16, 16, 11, INK, PAPER)
    circle(cv, 16, 16, 8, INK)
    inner(cv)
    for x, y in ((4, 4), (27, 4), (4, 27), (27, 27)):
        setp(cv, x, y, GRAY)

def chev_up(cv, cx, cy, s, c):
    for i in range(s + 1):
        setp(cv, cx - s + i, cy + i, c)
        setp(cv, cx + s - i, cy + i, c)

# ---- individual tiles ----
def brick(): cv = new(); brick_base(cv); return cv
def grass(): cv = new(); brick_base(cv, True); return cv
def spike(): cv = new(); spike_shape(cv); return cv
def gspike(): cv = new(); spike_shape(cv, True); return cv

def orb():
    cv = new()
    def inner(cv):
        setp(cv, 16, 16, INK)
        hline(cv, 13, 19, 16, INK); vline(cv, 16, 13, 19, INK)
    orb_shape(cv, inner); return cv

def gravOrb():
    cv = new()
    def inner(cv):
        for i in range(5):
            setp(cv, 14 + i, 12, INK); setp(cv, 14 + i, 20, INK)
        vline(cv, 16, 12, 20, INK)
    orb_shape(cv, inner); return cv

def djOrb():
    cv = new()
    def inner(cv):
        chev_up(cv, 16, 13, 3, INK); chev_up(cv, 16, 19, 3, INK)
    orb_shape(cv, inner); return cv

def pad():
    cv = new()
    fillrect(cv, 6, 26, 25, 29, PAPER); rect(cv, 6, 26, 25, 29, INK, 1)
    for x in (10, 16, 22):
        setp(cv, x, 25, INK)
    # spring zigzag
    pts = [(8, 24), (24, 20), (8, 16), (24, 12)]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for i in range(32):
            setp(cv, int(x0 + (x1 - x0) * i / 31), int(y0 + (y1 - y0) * i / 31), INK)
    fillrect(cv, 6, 6, 25, 10, PAPER); rect(cv, 6, 6, 25, 10, INK, 1)
    hatch(cv, 7, 7, 24, 9, GRAY)
    return cv

def dash():
    cv = new()
    for ox in (2, 11, 20):
        for y in range(6, 27):
            x = ox + 6 - abs(y - 16)
            setp(cv, x, y, INK); setp(cv, x + 1, y, INK)
    return cv

def goal():
    cv = new()
    vline(cv, 5, 4, 29, INK); vline(cv, 6, 4, 29, INK)
    vline(cv, 25, 4, 29, INK); vline(cv, 26, 4, 29, INK)
    hline(cv, 5, 26, 4, INK); hline(cv, 5, 26, 5, INK)
    # star
    for x, y in ((16, 12), (15, 14), (17, 14), (14, 16), (18, 16), (15, 18), (17, 18), (16, 20)):
        setp(cv, x, y, INK)
    setp(cv, 16, 16, INK)
    hatch(cv, 7, 24, 24, 28, GRAY)
    return cv

def checkpoint(touched=False):
    cv = new()
    fillrect(cv, 13, 26, 18, 29, PAPER); rect(cv, 13, 26, 18, 29, INK, 1)
    vline(cv, 15, 6, 26, INK); vline(cv, 16, 6, 26, INK)
    circle(cv, 15, 5, 3, INK, PAPER if not touched else INK)
    for x in range(17, 28):
        setp(cv, x, 8, INK); setp(cv, x, 16, INK)
    for y in range(8, 17):
        setp(cv, 17, y, INK)
        setp(cv, 27 - (y - 8), y, INK)
    if touched:
        for x in range(19, 25):
            for y in range(10, 15):
                if (x + y) % 2 == 0: setp(cv, x, y, INK)
    return cv

def coin(pips):
    cv = new()
    circle(cv, 16, 16, 12, INK, PAPER)
    circle(cv, 16, 16, 9, INK)
    for i in range(pips):
        setp(cv, 13 + i * 2, 16, INK); setp(cv, 13 + i * 2, 17, INK)
    setp(cv, 10, 9, INK); setp(cv, 11, 8, INK)
    return cv

def slopeL():
    cv = new()
    tri(cv, 2, 29, 29, 29, 29, 2, INK, PAPER)
    for i in range(0, 26, 3):
        setp(cv, 28 - i, 4 + i, INK)
    hatch(cv, 18, 22, 28, 28, GRAY)
    return cv

def slopeR():
    cv = new()
    tri(cv, 2, 2, 2, 29, 29, 29, INK, PAPER)
    for i in range(0, 26, 3):
        setp(cv, 3 + i, 4 + i, INK)
    hatch(cv, 3, 22, 13, 28, GRAY)
    return cv

def platform():
    cv = new()
    fillrect(cv, 2, 12, 29, 23, PAPER); rect(cv, 2, 12, 29, 23, INK, 2)
    hline(cv, 3, 28, 15, GRAY); hline(cv, 3, 28, 20, GRAY)
    for x in (6, 13, 20, 27):
        setp(cv, x, 14, INK); setp(cv, x, 21, INK)
    for x in range(4, 28):
        setp(cv, x, 25, INK)
    return cv

def portal(center):
    cv = new()
    circle(cv, 16, 16, 13, INK)
    circle(cv, 16, 16, 10, INK, PAPER)
    circle(cv, 16, 16, 6, INK)
    center(cv)
    for a in range(0, 360, 45):
        x = int(16 + 13 * math.cos(math.radians(a))); y = int(16 + 13 * math.sin(math.radians(a)))
        setp(cv, x, y, INK)
    return cv

def portalA(): return portal(lambda cv: setp(cv, 16, 16, INK))
def portalB():
    def cross(cv):
        hline(cv, 13, 19, 16, INK); vline(cv, 16, 13, 19, INK)
    return portal(cross)

def crusher():
    cv = new()
    fillrect(cv, 2, 2, 29, 24, PAPER); rect(cv, 2, 2, 29, 24, INK, 2)
    for x in (6, 25):
        setp(cv, x, 5, INK); setp(cv, x, 21, INK)
    for x in range(5, 27):
        if (x // 3) % 2 == 0: setp(cv, x, 13, INK)
    for i, x in enumerate(range(2, 30, 4)):
        tri(cv, x, 25, x + 4, 25, x + 2, 31, INK, PAPER if i % 2 == 0 else None)
    return cv

def saw():
    cv = new()
    for i in range(16):
        a = math.radians(i * 22.5)
        x0, y0 = int(16 + 9 * math.cos(a)), int(16 + 9 * math.sin(a))
        x1, y1 = int(16 + 14 * math.cos(a + 0.2)), int(16 + 14 * math.sin(a + 0.2))
        for k in range(8):
            setp(cv, int(x0 + (x1 - x0) * k / 7), int(y0 + (y1 - y0) * k / 7), INK)
    circle(cv, 16, 16, 9, INK, PAPER)
    circle(cv, 16, 16, 3, INK, INK)
    return cv

def ice():
    cv = new(); brick_base(cv)
    vline(cv, 6, 3, 28, INK)
    for x, y in ((12, 6), (18, 12), (12, 18), (22, 22), (16, 26)):
        setp(cv, x, y, INK); setp(cv, x + 1, y + 1, INK)
    return cv

def mud():
    cv = new(); brick_base(cv)
    import random as _r
    R = _r.Random(5)
    for _ in range(10):
        x, y = R.randint(3, 28), R.randint(3, 28)
        setp(cv, x, y, INK)
        if R.random() < 0.5: setp(cv, x + 1, y, GRAY)
    return cv

def half(bottom=True):
    cv = new()
    y0, y1 = (16, 30) if bottom else (1, 15)
    fillrect(cv, 1, y0, 30, y1, PAPER)
    rect(cv, 0, y0 - 1 if bottom else y0, 31, y1 + 1 if not bottom else y1, INK, 2)
    vline(cv, 10, y0, y1, INK); vline(cv, 21, y0, y1, INK)
    return cv

def conv(left):
    cv = new(); brick_base(cv)
    fillrect(cv, 3, 13, 28, 18, PAPER); rect(cv, 3, 13, 28, 18, INK, 1)
    for cx in (8, 16, 24):
        for j in range(5):
            y = 14 + j
            if y > 17: break
            x = cx - 2 + abs(j - 2) if left else cx + 2 - abs(j - 2)
            setp(cv, x, y, INK)
    return cv

def water_frame(ph):
    cv = new()
    for x in range(32):
        y = 8 + int(2 * math.sin((x + ph * 8) / 32 * math.pi * 2))
        setp(cv, x, y, INK); setp(cv, x, y + 1, INK)
        for yy in range(y + 4, 32, 6):
            setp(cv, x, yy, GRAY)
    for i, bx in enumerate((6 + ph * 3, 20 - ph * 2)):
        circle(cv, bx % 30 + 1, 20 + (i * 5 + ph * 2) % 9, 2, INK)
    return cv

def lava_frame(ph):
    cv = new()
    for x in range(32):
        y = 9 + int(2 * math.sin((x + ph * 8) / 32 * math.pi * 2))
        for yy in range(y, 32):
            setp(cv, x, yy, PAPER if (x + yy + ph) % 5 else GRAY)
        setp(cv, x, y, INK); setp(cv, x, y - 1, INK)
    for i, bx in enumerate((8 + ph * 4, 22 - ph * 3)):
        circle(cv, bx % 28 + 2, 18 + (i * 4 + ph * 3) % 10, 3, INK)
    hline(cv, 0, 31, 30, INK)
    return cv

TILES = {
    "brick.png": brick(), "grass.png": (lambda: (lambda cv: (brick_base(cv, True), cv)[1])(new()))(),
    "spike.png": spike(), "gspike.png": gspike(),
    "BounceOrb.png": orb(), "gravOrb.png": gravOrb(), "djOrb.png": djOrb(),
    "BouncePad.png": pad(), "DashIcon.png": dash(), "goal.png": goal(),
    "checkpoint.png": checkpoint(False), "checkpoint-touched.png": checkpoint(True),
    "coin10.png": coin(1), "coin50.png": coin(2), "coin100.png": coin(3), "coin500.png": coin(4),
    "slopeL.png": slopeL(), "slopeR.png": slopeR(), "platform.png": platform(),
    "portalA.png": portalA(), "portalB.png": portalB(),
    "crusher.png": crusher(), "saw.png": saw(), "ice.png": ice(), "mud.png": mud(),
    "half.png": half(True), "halfT.png": half(False),
    "convL.png": conv(True), "convR.png": conv(False),
    "water.png": water_frame(0), "lava.png": lava_frame(0),
}

def strip(frames):
    out = [[T] * 128 for _ in range(32)]
    for f, fr in enumerate(frames):
        for y in range(32):
            for x in range(32):
                out[y][f * 32 + x] = fr[y][x]
    return out

os.makedirs(OUT, exist_ok=True)
for name, px in TILES.items():
    wp(os.path.join(OUT, name), px)

def wpstrip(path, px):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in px)
    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", 128, 32, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", os.path.basename(path))

wpstrip(os.path.join(OUT, "water-strip.png"), strip([water_frame(i) for i in range(4)]))
wpstrip(os.path.join(OUT, "lava-strip.png"), strip([lava_frame(i) for i in range(4)]))
print("done")
