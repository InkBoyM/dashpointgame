"""Revamped pack: enhanced pass over the original tile art (same basenames).
Enhance: saturation + contrast boost, top-light gradient, dark ink outlines
around opaque edges. Deterministic, stdlib only.
Reads assets/tiles/*.png -> writes assets/revamped/tiles/*.png."""
import zlib, struct, os
SRC = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\tiles"
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\revamped\tiles"

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
    ch = 4
    px = [[(0, 0, 0, 0)] * w for _ in range(h)]
    p = 0
    prev = [0] * (w * ch)
    for y in range(h):
        f = raw[p]
        p += 1
        cur = [0] * (w * ch)
        for x in range(w):
            for c in range(ch):
                v = raw[p]
                p += 1
                a = cur[(x - 1) * ch + c] if x > 0 else 0
                b = prev[x * ch + c]
                cc = prev[(x - 1) * ch + c] if x > 0 else 0
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
                cur[x * ch + c] = r
            px[y][x] = (cur[x * ch], cur[x * ch + 1], cur[x * ch + 2], cur[x * ch + 3])
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

def revamp(w, h, px):
    # pass 1: rich saturation + contrast, gentle top light / deep bottom
    out = [[(0, 0, 0, 0)] * w for _ in range(h)]
    for y in range(h):
        light = 1.10 - 0.42 * (y / max(1, h - 1))
        for x in range(w):
            r, g, b, a = px[y][x]
            if a == 0:
                continue
            # true saturation boost: push channels away from luminance
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            r2 = lum + (r - lum) * 1.55
            g2 = lum + (g - lum) * 1.55
            b2 = lum + (b - lum) * 1.55
            # contrast + light
            r2 = ((r2 - 128) * 1.15 + 128) * light
            g2 = ((g2 - 128) * 1.15 + 128) * light
            b2 = ((b2 - 128) * 1.15 + 128) * light
            out[y][x] = (clamp(r2), clamp(g2), clamp(b2), a)
    # distance-to-transparent (0 = transparent, 1-2 = near edge)
    def alpha_at(x, y):
        if x < 0 or y < 0 or x >= w or y >= h:
            return 0
        return out[y][x][3]
    # pass 2: 2px ink outline + bevel (lit top/left, shaded bottom/right)
    for y in range(h):
        for x in range(w):
            r, g, b, a = out[y][x]
            if a == 0:
                continue
            near = False
            near2 = False
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if alpha_at(x + dx, y + dy) == 0:
                    near = True
                    break
            if not near:
                for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, -1), (-1, 1), (1, 1)):
                    if alpha_at(x + dx, y + dy) == 0:
                        near2 = True
                        break
            if near:
                out[y][x] = (clamp(r * 0.18 + 3), clamp(g * 0.18 + 3), clamp(b * 0.24 + 12), a)
            else:
                if alpha_at(x, y - 1) == 0 or alpha_at(x - 1, y) == 0:
                    # bevel highlight just inside top/left edges (warm, restrained)
                    out[y][x] = (clamp(r * 0.75 + 48), clamp(g * 0.75 + 42), clamp(b * 0.75 + 28), a)
                elif alpha_at(x, y + 1) == 0 or alpha_at(x + 1, y) == 0:
                    # bevel shade just inside bottom/right edges (cool purple)
                    out[y][x] = (clamp(r * 0.45 + 10), clamp(g * 0.45 + 8), clamp(b * 0.6 + 34), a)
                elif near2:
                    out[y][x] = (clamp(r * 0.7 + 2), clamp(g * 0.7 + 2), clamp(b * 0.8 + 12), a)
    return out

def revamp_strip(w, h, px):
    # strips are 128x32: same enhance, outline pass wraps horizontally per frame
    return revamp(w, h, px)

FILES = ["brick.png", "grass.png", "spike.png", "gspike.png", "BounceOrb.png", "gravOrb.png",
    "djOrb.png", "BouncePad.png", "DashIcon.png", "goal.png", "checkpoint.png", "checkpoint-touched.png",
    "coin10.png", "coin50.png", "coin100.png", "coin500.png", "slopeL.png", "slopeR.png", "platform.png",
    "portalA.png", "portalB.png", "crusher.png", "saw.png", "ice.png", "mud.png", "half.png", "halfT.png",
    "convL.png", "convR.png", "water.png", "water-strip.png", "lava.png", "lava-strip.png"]

os.makedirs(OUT, exist_ok=True)
for name in FILES:
    w, h, px = read_png(os.path.join(SRC, name))
    write_png(os.path.join(OUT, name), w, h, revamp(w, h, px))
print("done")
