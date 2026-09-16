"""Heart icons for level likes: outline + filled. Stdlib only."""
import zlib, struct, os
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\ui"
S = 24
RED = (255, 90, 110, 255)
DARK = (140, 20, 40, 255)
WHITE = (255, 255, 255, 255)
T = (0, 0, 0, 0)

def heart_mask():
    m = [[False] * S for _ in range(S)]
    for y in range(S):
        for x in range(S):
            nx = (x - S / 2 + 0.5) / (S / 2)
            ny = -(y - S / 2 + 0.5) / (S / 2)
            if (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3 <= 0:
                m[y][x] = True
    return m

def edge_dist(m):
    import collections
    INF = 99
    d = [[INF] * S for _ in range(S)]
    q = collections.deque()
    for y in range(S):
        for x in range(S):
            if not m[y][x]:
                d[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            xx, yy = x + dx, y + dy
            if 0 <= xx < S and 0 <= yy < S and d[yy][xx] > d[y][x] + 1:
                d[yy][xx] = d[y][x] + 1
                q.append((xx, yy))
    return d

def wp(path, px):
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in px)
    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))
    print("wrote", os.path.basename(path))

m = heart_mask()
d = edge_dist(m)
# outline: 2px ink edge only
outline = [[T] * S for _ in range(S)]
for y in range(S):
    for x in range(S):
        if m[y][x] and d[y][x] <= 2:
            outline[y][x] = RED if d[y][x] == 1 else DARK
# filled: red body, dark edge, white shine
filled = [[T] * S for _ in range(S)]
for y in range(S):
    for x in range(S):
        if not m[y][x]:
            continue
        filled[y][x] = DARK if d[y][x] <= 1 else RED
for x, y in ((9, 7), (10, 7), (9, 8), (8, 8), (8, 9)):
    if m[y][x]:
        filled[y][x] = WHITE
os.makedirs(OUT, exist_ok=True)
wp(os.path.join(OUT, "heart.png"), outline)
wp(os.path.join(OUT, "heart-full.png"), filled)
print("done")
