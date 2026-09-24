"""Pack backgrounds: fill the art-pack bg holes the game probes at runtime.

game.js buildArtPack() tries assets/<pack>/bg/*.png and assets/<pack>/tiles/
background.png for the drawing/neon packs and falls back on 404 (drawing =
runtime sketchify of the default, neon = default). The 404s are caught but
spam the console, so we pre-generate the exact files instead:

- assets/neon/bg/*.png + neon/tiles/background.png: byte copies of the
  defaults (neon's fallback IS the default, so zero visual change).
- assets/drawing/bg/*.png + drawing/tiles/background.png: sketchify() applied
  offline, mirroring the JS filter exactly (grayscale + contrast x1.35 +
  5-level posterize + darken edge pixels to <=40).

Stdlib only.
"""
import os
import shutil
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
BG_NAMES = ["bg-meadow", "bg-glacier", "bg-volcano", "bg-desert",
            "bg-cave", "bg-space", "bg-sunset"]


def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", path
    pos = 8
    idat = b""
    w = h = bd = ct = inter = None
    while pos < len(d):
        (ln,) = struct.unpack(">I", d[pos:pos + 4])
        typ = d[pos + 4:pos + 8]
        data = d[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct, _comp, _filt, inter = struct.unpack(">IIBBBBB", data)
        elif typ == b"IDAT":
            idat += data
        elif typ == b"IEND":
            break
        pos += 12 + ln
    assert bd == 8 and inter == 0, (path, bd, inter)
    assert ct in (0, 2, 6), (path, ct)
    ch = {0: 1, 2: 3, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(w * h * ch)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if f == 1:  # Sub
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 255
        elif f == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:  # Average
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:  # Paeth
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        elif f != 0:
            raise ValueError("filter %d in %s" % (f, path))
        out[y * stride:(y + 1) * stride] = line
        prev = line
    # normalize to RGBA
    if ct == 6:
        px = [tuple(out[i:i + 4]) for i in range(0, len(out), 4)]
    elif ct == 2:
        px = [(out[i], out[i + 1], out[i + 2], 255)
              for i in range(0, len(out), 3)]
    else:
        px = [(out[i], out[i], out[i], 255) for i in range(len(out))]
    return w, h, px


def write_png(path, w, h, px):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in px[y * w:(y + 1) * w])
                   for y in range(h))

    def ck(t, dd):
        c = t + dd
        return struct.pack(">I", len(dd)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) +
        ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", os.path.relpath(path, HERE))


def sketchify(w, h, px):
    """Mirror of sketchify() in js/game.js."""
    gray = [0] * (w * h)
    for i, (r, g, b, a) in enumerate(px):
        if a == 0:
            continue
        v = 0.299 * r + 0.587 * g + 0.114 * b
        v = (v - 128) * 1.35 + 128
        v = max(0, min(255, v))
        gray[i] = round(v / 255 * 4) * (255 / 4)
    res = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            r, g, b, a = px[i]
            if a == 0:
                res.append((r, g, b, a))
                continue
            edge = (x == 0 or y == 0 or x == w - 1 or y == h - 1 or
                    px[i - 1][3] == 0 or px[i + 1][3] == 0 or
                    px[i - w][3] == 0 or px[i + w][3] == 0)
            v = int(min(gray[i], 40)) if edge else int(gray[i])
            res.append((v, v, v, a))
    return res


def main():
    jobs = [("assets/bg/%s.png" % n,
               "assets/drawing/bg/%s.png" % n,
               "assets/neon/bg/%s.png" % n) for n in BG_NAMES]
    jobs.append(("assets/tiles/background.png",
                 "assets/drawing/tiles/background.png",
                 "assets/neon/tiles/background.png"))
    for src_rel, draw_rel, neon_rel in jobs:
        src = os.path.join(HERE, src_rel)
        w, h, px = read_png(src)
        # neon: fallback is the default image -> byte copy
        dst = os.path.join(HERE, neon_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
        print("copied", os.path.relpath(dst, HERE))
        # drawing: fallback is sketchify(default) -> bake it in
        dst = os.path.join(HERE, draw_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        write_png(dst, w, h, sketchify(w, h, px))


if __name__ == "__main__":
    main()
