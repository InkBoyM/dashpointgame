"""Neon pack: dark glass tiles with glowing saturated edges.
Hue comes from the original art, so lava glows orange, portals blue, etc.
Reads assets/tiles/*.png -> writes assets/neon/tiles/*.png. Stdlib only."""
import zlib, struct, os
SRC = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\tiles"
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\neon\tiles"

def read_png(path):
    buf = open(path, "rb").read()
    pos = 8
    w = h = None
    depth = ct = None
    idat = b""
    while True:
        ln = struct.unpack(">I", buf[pos:pos + 4])[0]
        typ = buf[pos + 4:pos + 8]
        dat = buf[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h = struct.unpack(">II", dat[:8])
            depth, ct = dat[8], dat[9]
        elif typ == b"IDAT":
            idat += dat
        pos += 12 + ln
        if typ == b"IEND":
            break
    assert depth == 8 and ct == 6, (path, depth, ct)
    raw = zlib.decompress(idat)
    px = [[(0, 0, 0, 0)] * w for _ in range(h)]
    p = 0
    prev = [0] * (w * 4)
    for y in range(h):
        f = raw[p]
        p += 1
        cur = [0] * (w * 4)
        for x in range(w):
            for c in range(4):
                v = raw[p]
                p += 1
                a = cur[(x - 1) * 4 + c] if x > 0 else 0
                b = prev[x * 4 + c]
                cc = prev[(x - 1) * 4 + c] if x > 0 else 0
                if f == 0:
                    r = v
                elif f == 1:
                    r = (v + a) & 255
                elif f == 2:
                    r = (v + b) & 255
                elif f == 3:
                    r = (v + ((a + b) >> 1)) & 255
                else:
                    pr = a + b - cc
                    pa, pb, pc = abs(pr - a), abs(pr - b), abs(pr - cc)
                    r = (v + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else cc))) & 255
                cur[x * 4 + c] = r
            px[y][x] = (cur[x * 4], cur[x * 4 + 1], cur[x * 4 + 2], cur[x * 4 + 3])
        prev = cur
    return w, h, px

def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in px)
    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", os.path.basename(path))

def clamp(v):
    return 0 if v < 0 else (255 if v > 255 else int(v))

def tile_glow(px, w, h):
    # one dominant hue per tile: most saturated bright opaque pixel
    bx, by, bs = 0, 0, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[y][x]
            if a < 128:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            score = (mx - mn) + mx * 0.25
            if score > bs:
                bs, bx, by = score, x, y
    if bs < 0:
        return (130, 220, 255)
    r, g, b, _ = px[by][bx]
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 12:
        return (130, 220, 255)  # grayish art -> ice-blue glow
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    nr = lum + (r - lum) * 1.8
    ng = lum + (g - lum) * 1.8
    nb = lum + (b - lum) * 1.8
    m2 = max(nr, ng, nb, 1)
    s = 225 / m2  # normalize peak, never wash past it
    return (clamp(nr * s), clamp(ng * s), clamp(nb * s))

def neonize(w, h, px, glow=None):
    gr, gg, gb = glow or tile_glow(px, w, h)
    out = [[(0, 0, 0, 0)] * w for _ in range(h)]
    def alpha_at(x, y):
        if x < 0 or y < 0 or x >= w or y >= h:
            return 0
        return px[y][x][3]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[y][x]
            if a == 0:
                # 1px outer halo in the tile hue
                touch = False
                for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and 0 <= yy < h and px[yy][xx][3] > 0:
                        touch = True
                        break
                if touch:
                    out[y][x] = (gr, gg, gb, 70)
                continue
            edge = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if alpha_at(x + dx, y + dy) == 0:
                    edge = True
                    break
            if edge:
                # hot core: tile hue pushed toward white
                out[y][x] = (clamp(gr * 0.55 + 115), clamp(gg * 0.55 + 115), clamp(gb * 0.55 + 115), a)
            else:
                near = False
                for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
                    if alpha_at(x + dx, y + dy) == 0:
                        near = True
                        break
                if near:
                    # glow falloff ring in tile hue
                    out[y][x] = (clamp(r * 0.25 + gr * 0.55), clamp(g * 0.25 + gg * 0.55), clamp(b * 0.25 + gb * 0.55), a)
                else:
                    # dark glass interior, faint hue
                    out[y][x] = (clamp(r * 0.14 + gr * 0.06), clamp(g * 0.14 + gg * 0.06), clamp(b * 0.16 + gb * 0.08), a)
    return out

FILES = ["brick.png", "grass.png", "spike.png", "gspike.png", "BounceOrb.png", "gravOrb.png",
    "djOrb.png", "BouncePad.png", "DashIcon.png", "goal.png", "checkpoint.png", "checkpoint-touched.png",
    "coin10.png", "coin50.png", "coin100.png", "coin500.png", "slopeL.png", "slopeR.png", "platform.png",
    "portalA.png", "portalB.png", "crusher.png", "saw.png", "ice.png", "mud.png", "half.png", "halfT.png",
    "convL.png", "convR.png", "water.png", "water-strip.png", "lava.png", "lava-strip.png"]

os.makedirs(OUT, exist_ok=True)
# gray-source tiles get their gameplay-color glow
HUE_OVERRIDES = {
    "spike.png": (255, 70, 90),
    "gspike.png": (255, 70, 90),
    "checkpoint.png": (62, 224, 122),
    "checkpoint-touched.png": (62, 224, 122),
}
for name in FILES:
    w, h, px = read_png(os.path.join(SRC, name))
    write_png(os.path.join(OUT, name), w, h, neonize(w, h, px, HUE_OVERRIDES.get(name)))
print("done")
