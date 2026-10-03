"""All UN member flag skins in the country-badge format: 64x64 circle-cropped
flags on transparency (matches skin-51/52). Stdlib only.
Usage: python3 make_countries.py   (writes assets/skins/skin-<id>.png +
countries_entries.txt with the SHOP_SKINS lines, ids continue from 53)
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
W = H = 64
T = (0, 0, 0, 0)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def new():
    return [[T] * W for _ in range(H)]


def bands(cv, horizontal, parts):
    """parts: list of (color, weight)."""
    total = sum(w for _, w in parts)
    if horizontal:
        y = 0
        for ci, (c, w) in enumerate(parts):
            h = H * w / total if ci < len(parts) - 1 else H - y
            for yy in range(int(y), int(y + h) + 1):
                for x in range(W):
                    cv[min(63, yy)][x] = c
            y += h
    else:
        x = 0
        for ci, (c, w) in enumerate(parts):
            ww = W * w / total if ci < len(parts) - 1 else W - x
            for xx in range(int(x), int(x + ww) + 1):
                for y in range(H):
                    cv[y][min(63, xx)] = c
            x += ww


def disc(cv, cx, cy, r, c):
    for y in range(H):
        for x in range(W):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                cv[y][x] = c


def ring(cv, cx, cy, r, w, c):
    for y in range(H):
        for x in range(W):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if abs(d - r) <= w:
                cv[y][x] = c


def star5(cv, cx, cy, r, c, rot=-90):
    pts = []
    for i in range(10):
        ang = math.radians(rot + i * 36)
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    minx = max(0, int(min(p[0] for p in pts)) - 1)
    maxx = min(W - 1, int(max(p[0] for p in pts)) + 1)
    miny = max(0, int(min(p[1] for p in pts)) - 1)
    maxy = min(H - 1, int(max(p[1] for p in pts)) + 1)

    def inside(x, y):
        c_ = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi):
                c_ = not c_
            j = i
        return c_

    for y in range(miny, maxy + 1):
        for x in range(minx, maxx + 1):
            if inside(x + 0.5, y + 0.5):
                cv[y][x] = c


def crescent(cv, cx, cy, r, c, bg, dx):
    disc(cv, cx, cy, r, c)
    disc(cv, cx + dx, cy, r * 0.85, bg)


def triangle_left(cv, x_tip, c):
    for y in range(H):
        for x in range(W):
            t = abs(y - 31.5) / 31.5
            if x <= x_tip * t + 2:
                cv[y][x] = c


def nordic(cv, bg, fg, vx0=18, vx1=26, hy0=28, hy1=36, fw=0):
    for y in range(H):
        for x in range(W):
            cv[y][x] = bg
    for y in range(H):
        for x in range(vx0, vx1 + 1):
            cv[y][x] = fg
    for y in range(hy0, hy1 + 1):
        for x in range(W):
            cv[y][x] = fg
    if fw:
        for y in range(H):
            for x in range(vx0 - fw, vx1 + fw + 1):
                if 0 <= x < W and (cv[y][x] == bg):
                    pass
        for y in range(hy0 - fw, hy1 + fw + 1):
            for x in range(W):
                if 0 <= y < H and cv[y][x] == bg:
                    pass


def diag_split(cv, c1, c2):
    for y in range(H):
        for x in range(W):
            cv[y][x] = c1 if x + y < 64 else c2


def mask_circle(cv, r=30):
    for y in range(H):
        for x in range(W):
            if (x - 31.5) ** 2 + (y - 31.5) ** 2 > r * r:
                cv[y][x] = T


def wp(path, cv):
    mask_circle(cv)
    raw = b"".join(b"\x00" + b"".join(struct.pack("4B", *c) for c in r) for r in cv)

    def ck(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    full = os.path.join(HERE, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "wb").write(b"\x89PNG\r\n\x1a\n" + ck(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) + ck(b"IDAT", zlib.compress(raw, 9)) + ck(b"IEND", b""))

# ---------------- country table ----------------
# kinds: H/V bands ([colors], [weights]); XN nordic; XNW nordic w/ fimbriation;
# XC centered cross; DOT/DISC/SUN/RING/ELLIPSE shapes; STAR; C/CSTAR crescents;
# TRI left triangle; DIA diagonal halves; DIAG3/D3 diagonal w/ stripe;
# DIAGBAND(S) diagonal bands; DIAGBW; BAND left band; HBAR/VBAR splits;
# CANTON_UK mini union jack; CANTON_SQ/V/VR/W/TW colored canton (+opt star);
# QUARTER/QUARTER2 quartered; XC2 cross-on-cross; CHEV Jordan chevron;
# TRAP black trapezoid; STRIPE3V vertical tricolor block; RHOMBUS; RECT;
# BLOB; SWORD sword bar; CROSS2/S cross variants; NEPAL/GEORGIA/GR/UK/US;
# ZAF South Africa; TAEGEUK Korea; LK Sri Lanka; PLAIN+extras; SKIP existing.
COUNTRIES = [
 ("Afghanistan", "V", ["#000000", "#D32011", "#007A36"]),
 ("Albania", "DOT", "#E41E26", "#000000"),
 ("Algeria", "HALF", "#006233", "#FFFFFF", ("CSTAR", "#D21034")),
 ("Andorra", "V", ["#10066F", "#FFD617", "#D50000"]),
 ("Angola", "H", ["#CC092F", "#000000"], [1, 1], ("STAR", "#FFEC00", 32, 32, 9)),
 ("Antigua and Barbuda", "SKIP",),
 ("Argentina", "H", ["#74ACDF", "#FFFFFF", "#74ACDF"], [1, 1, 1], ("DOT", "#F6B40E")),
 ("Armenia", "H", ["#D90012", "#0033A0", "#F2A800"]),
 ("Australia", "CANTON_UK", "#00247D", [("DOT", "#FFFFFF", 32, 48, 7), ("DOT", "#FFFFFF", 48, 24, 4), ("DOT", "#FFFFFF", 52, 32, 4), ("DOT", "#FFFFFF", 48, 40, 4), ("DOT", "#FFFFFF", 56, 32, 4)]),
 ("Austria", "H", ["#EF3340", "#FFFFFF", "#EF3340"]),
 ("Azerbaijan", "H", ["#00B5E2", "#EF3340", "#509E2F"], [1, 1, 1], ("CSTAR", "#FFFFFF")),
 ("Bahamas", "H", ["#00778B", "#FFC72C", "#00778B"], [1, 1, 1], ("TRI", "#000000")),
 ("Bahrain", "BAND", "#CE1126", "#FFFFFF"),
 ("Bangladesh", "D", "#006A4E", "#F42A41", 36, 32, 11),
 ("Barbados", "V", ["#00267F", "#FFC726", "#00267F"], [1, 1, 1], ("DOT", "#000000")),
 ("Belarus", "SKIP",),
 ("Belgium", "V", ["#000000", "#FDDA24", "#EF3340"]),
 ("Belize", "H", ["#003F87", "#FFFFFF", "#003F87"], [1, 1, 1], ("DOT", "#FFFFFF")),
 ("Benin", "CANTON_V", "#008751", ["#FFCE00", "#E8112D"]),
 ("Bhutan", "DIA", "#FFCC33", "#FF4E12", ("DOT", "#FFFFFF")),
 ("Bolivia", "H", ["#D52B1E", "#F9E300", "#007934"]),
 ("Bosnia and Herzegovina", "DIAGBAND", "#002395", "#FFC400"),
 ("Botswana", "H", ["#75AADB", "#000000", "#FFFFFF", "#000000", "#75AADB"], [4, 1, 1, 1, 1]),
 ("Brazil", "RHOMBUS", "#009739", "#FEDF00", "#012169"),
 ("Brunei", "DIAGBW", "#FCE216", "#000000", "#FFFFFF"),
 ("Bulgaria", "H", ["#FFFFFF", "#00966E", "#D62612"]),
 ("Burkina Faso", "H", ["#EF2D00", "#009E60"], [1, 1], ("STAR", "#FFCE00", 32, 32, 9)),
 ("Burundi", "DIA", "#CE1126", "#1EB53A", ("DISC", "#FFFFFF", 12), ("DOTS", "#CE1126", [(32, 24), (26, 38), (38, 38)], 3)),
 ("Cambodia", "H", ["#032EA1", "#E00025", "#032EA1"], [1, 2, 1], ("RECT", "#FFFFFF", 26, 26, 12, 12)),
 ("Cameroon", "V", ["#007A5E", "#CE1126", "#FCD116"], [1, 1, 1], ("STAR", "#FCD116", 32, 32, 8)),
 ("Canada", "V", ["#FF0000", "#FFFFFF", "#FF0000"], [1, 2, 1], ("RECT", "#FF0000", 28, 24, 8, 16)),
 ("Cape Verde", "H", ["#003893", "#FFFFFF", "#CF2027", "#003893"], [6, 1, 1, 2], ("DOTS", "#FFC400", [(32, 22), (38, 26), (38, 34), (32, 38), (26, 34), (26, 26)], 2)),
 ("Central African Republic", "H", ["#003082", "#FFFFFF", "#009E60", "#FFCE00"], [1, 1, 1, 1], ("STAR", "#CE1126", 14, 32, 7)),
 ("Chad", "V", ["#002654", "#FCD116", "#CE1126"]),
 ("Chile", "H", ["#FFFFFF", "#D52B1E"], [1, 1], ("CANTON_SQ", "#0039A6", 22, 22, ("STAR", "#FFFFFF", 11, 11, 6))),
 ("China", "PLAIN", "#EE1C25", ("STAR", "#FFDE00", 16, 20, 9), ("DOTS", "#FFDE00", [(36, 12), (42, 20), (42, 30), (36, 38)], 3)),
 ("Colombia", "H", ["#FCD116", "#003893", "#CE1126"], [2, 1, 1]),
 ("Comoros", "H", ["#FFC300", "#FFFFFF", "#CE1126", "#3A5DAE"], [1, 1, 1, 1], ("CRESCENT_G", "#FFFFFF")),
 ("Congo", "DIAG3", "#009543", "#FBDE4A", "#DC241F"),
 ("Costa Rica", "H", ["#002B7F", "#FFFFFF", "#CE1126", "#FFFFFF", "#002B7F"], [1, 1, 2, 1, 1]),
 ("Croatia", "H", ["#FF0000", "#FFFFFF", "#171796"], [1, 1, 1], ("RECT", "#FF0000", 28, 24, 8, 8)),
 ("Cuba", "STRIPES_TRISTAR", ["#002A8F", "#FFFFFF"], ("TRI", "#CF142B"), ("STAR", "#FFFFFF", 10, 32, 7)),
 ("Cyprus", "PLAIN", "#FFFFFF", ("BLOB", "#C7874A")),
 ("Czechia", "H", ["#FFFFFF", "#D7141A"], [1, 1], ("TRI", "#11457E")),
 ("Denmark", "XN", "#C8102E", "#FFFFFF"),
 ("Djibouti", "H", ["#6AB2E7", "#12AD2B"], [1, 1], ("TRI", "#FFFFFF"), ("STAR", "#D7141A", 10, 32, 6)),
 ("Dominica", "PLAIN", "#006A4E", ("CROSS2", "#FFD100", "#000000", "#FFFFFF")),
 ("Dominican Republic", "QUARTER", "#002D62", "#CE1126", "#FFFFFF"),
 ("DR Congo", "DIAGBAND_B", "#00A1DF", "#F7D618", ("STAR", "#F7D618", 16, 16, 7)),
 ("Ecuador", "H", ["#FFCC00", "#0072C6", "#CE1126"], [2, 1, 1], ("DOT", "#7A4A21")),
 ("Egypt", "H", ["#CE1126", "#FFFFFF", "#000000"], [1, 1, 1], ("DOT", "#C09300")),
 ("El Salvador", "H", ["#0047AB", "#FFFFFF", "#0047AB"], [1, 2, 1]),
 ("Equatorial Guinea", "H", ["#0073CE", "#FFFFFF", "#3E9E4F"], [1, 1, 1], ("TRI", "#3E9E4F")),
 ("Eritrea", "TRI3", "#EA0437", "#0BACBE", "#0000CD"),
 ("Estonia", "H", ["#0072CE", "#000000", "#FFFFFF"]),
 ("Eswatini", "H", ["#3E5EB9", "#FFFFFF", "#FF0000", "#FFFFFF", "#3E5EB9"], [3, 1, 2, 1, 3], ("DOT", "#000000")),
 ("Ethiopia", "H", ["#078930", "#FCDD09", "#DA121A"], [1, 1, 1], ("DISCSTAR", "#0F47AF", "#FCDD09")),
 ("Fiji", "CANTON_UK", "#68BFE5", []),
 ("Finland", "XN", "#FFFFFF", "#002F6C"),
 ("France", "V", ["#0055A4", "#FFFFFF", "#EF4135"]),
 ("Gabon", "H", ["#009E60", "#FCD116", "#3A75C4"]),
 ("Gambia", "H", ["#CE1126", "#FFFFFF", "#0C1C8C", "#FFFFFF", "#3A7728"], [3, 1, 2, 1, 3]),
 ("Georgia", "GEORGIA",),
 ("Germany", "H", ["#000000", "#DD0000", "#FFCE00"]),
 ("Ghana", "H", ["#CE1126", "#FCD116", "#006B3F"], [1, 1, 1], ("STAR", "#000000", 32, 32, 9)),
 ("Greece", "GR",),
 ("Grenada", "PLAIN", "#CE1126", ("STAR", "#FCD116", 32, 32, 8)),
 ("Guatemala", "V", ["#4997D0", "#FFFFFF", "#4997D0"], [1, 2, 1]),
 ("Guinea", "V", ["#CE1126", "#FCD116", "#009E60"]),
 ("Guinea-Bissau", "CANTON_VR", "#CE1126", ["#FCD116", "#009E60"], ("STAR", "#000000", 11, 32, 7)),
 ("Guyana", "TRI2", "#009E49", "#CE1126", "#FCD116", "#000000", "#FFFFFF"),
 ("Haiti", "H", ["#00209F", "#D21034"], [1, 1]),
 ("Honduras", "H", ["#0073CF", "#FFFFFF", "#0073CF"], [1, 2, 1], ("DOTS", "#0073CF", [(24, 32), (29, 32), (34, 32), (39, 32), (44, 32)], 2)),
 ("Hungary", "H", ["#CE2939", "#FFFFFF", "#477050"]),
 ("Iceland", "XNW", "#02529B", "#FFFFFF", "#DC1E35"),
 ("India", "H", ["#FF9933", "#FFFFFF", "#138808"], [1, 1, 1], ("DOT", "#06038D")),
 ("Indonesia", "H", ["#FF0000", "#FFFFFF"], [1, 1]),
 ("Iran", "H", ["#239F40", "#FFFFFF", "#DA0000"], [1, 1, 1], ("DOT", "#DA0000")),
 ("Iraq", "H", ["#CE1126", "#FFFFFF", "#000000"], [1, 1, 1], ("DOT", "#007A3D")),
 ("Ireland", "V", ["#169B62", "#FFFFFF", "#FF883E"]),
 ("Israel", "SKIP",),
 ("Italy", "V", ["#009246", "#FFFFFF", "#CE2B37"]),
 ("Ivory Coast", "V", ["#F77F00", "#FFFFFF", "#009E60"]),
 ("Jamaica", "SALTIRE", "#009B3A", "#FED100", "#000000"),
 ("Japan", "D", "#FFFFFF", "#BC002D", 32, 32, 11),
 ("Jordan", "H", ["#000000", "#FFFFFF", "#007A3D"], [1, 1, 1], ("CHEV", "#CE1126"), ("STAR", "#FFFFFF", 12, 32, 6)),
 ("Kazakhstan", "PLAIN", "#00AFCA", ("SUN", "#FEC50C")),
 ("Kenya", "H", ["#000000", "#FFFFFF", "#BB0000", "#FFFFFF", "#006600"], [3, 1, 3, 1, 3], ("ELLIPSE", "#BB0000")),
 ("Kiribati", "H", ["#CE1126", "#003DA5", "#FCD116", "#003DA5", "#FCD116", "#003DA5", "#FCD116"], [1, 1, 1, 1, 1, 1, 1]),
 ("Kosovo", "PLAIN", "#244AA5", ("DOT", "#D4A017")),
 ("Kuwait", "H", ["#007A3D", "#FFFFFF", "#CE1126"], [1, 1, 1], ("TRAP", "#000000")),
 ("Kyrgyzstan", "PLAIN", "#E30613", ("RING", "#FFEE00")),
 ("Laos", "H", ["#CE1126", "#002868", "#CE1126"], [1, 2, 1], ("DISC", "#FFFFFF", 10)),
 ("Latvia", "H", ["#9D2235", "#FFFFFF", "#9D2235"], [2, 1, 2]),
 ("Lebanon", "H", ["#EE1C25", "#FFFFFF", "#EE1C25"], [1, 2, 1], ("TRI_SM", "#00A651")),
 ("Lesotho", "H", ["#00209F", "#FFFFFF", "#009E60"], [1, 2, 1], ("DOT", "#000000")),
 ("Liberia", "STRIPES_CANTON", ["#BF0A30", "#FFFFFF"], ("CANTON_SQ", "#002868", 24, 24, ("STAR", "#FFFFFF", 12, 12, 6))),
 ("Libya", "H", ["#E70013", "#000000", "#007A5D"], [1, 2, 1], ("CSTAR", "#FFFFFF")),
 ("Liechtenstein", "H", ["#002B7F", "#CE1126"], [1, 1], ("DOT", "#FCD116")),
 ("Lithuania", "H", ["#FDB913", "#006A44", "#C1272D"]),
 ("Luxembourg", "H", ["#EF3340", "#FFFFFF", "#00A1DE"]),
 ("Madagascar", "CANTON_VW", "#FFFFFF", ["#FC3D32", "#007E3A"]),
 ("Malawi", "H", ["#000000", "#CE1126", "#007A5D"], [1, 1, 1], ("SUNRISE", "#CE1126")),
 ("Malaysia", "STRIPES_CANTON2", ["#CC0001", "#FFFFFF"], ("CANTON_SQ", "#010066", 30, 26, ("CSTAR", "#FFCC00", 15, 13, 7))),
 ("Maldives", "PLAIN", "#D21034", ("RECT", "#007E3A", 16, 16, 32, 32), ("CRESCENT_G", "#FFFFFF", None)),
 ("Mali", "V", ["#14B53A", "#FCD116", "#CE1126"]),
 ("Malta", "V", ["#FFFFFF", "#CF142B"], [1, 1], ("CROSS_SM", "#CF142B")),
 ("Marshall Islands", "H", ["#003893", "#DD7500", "#FFFFFF", "#003893"], [3, 1, 1, 3], ("STAR", "#FFFFFF", 46, 18, 7)),
 ("Mauritania", "H", ["#D21034", "#006233", "#D21034"], [1, 4, 1], ("CSTAR", "#FFC400")),
 ("Mauritius", "H", ["#EA2839", "#1A206D", "#FFD500", "#00A651"]),
 ("Mexico", "V", ["#006847", "#FFFFFF", "#CE1126"], [1, 1, 1], ("DOT", "#8C6D3F")),
 ("Micronesia", "PLAIN", "#75B2DD", ("DOTS", "#FFFFFF", [(22, 22), (42, 22), (22, 42), (42, 42)], 4)),
 ("Moldova", "V", ["#003DA5", "#FFD100", "#C8102E"], [1, 1, 1], ("DOT", "#6B4226")),
 ("Monaco", "H", ["#CE1126", "#FFFFFF"], [1, 1]),
 ("Mongolia", "V", ["#C4272F", "#015197", "#C4272F"], [1, 1, 1], ("RECT", "#FFD100", 6, 10, 6, 18)),
 ("Montenegro", "PLAIN", "#C6363C", ("DOT", "#D4A017")),
 ("Morocco", "PLAIN", "#C1272D", ("STAR", "#006233", 32, 32, 11)),
 ("Mozambique", "H", ["#009739", "#000000", "#FEDF00", "#000000", "#EF3340"], [1, 1, 1, 1, 1], ("STAR", "#FFFFFF", 14, 32, 7)),
 ("Myanmar", "H", ["#FECB00", "#34B233", "#EA2839"], [1, 1, 1], ("STAR", "#FFFFFF", 32, 32, 10)),
 ("Namibia", "DIAG3W", "#003580", "#FFFFFF", "#CC082F", "#FFFFFF", "#009A44", ("SUN", "#FFCC00")),
 ("Nauru", "H", ["#002B7F", "#FFC72C", "#002B7F"], [5, 1, 5], ("STAR", "#FFFFFF", 20, 22, 7)),
 ("Nepal", "NEPAL",),
 ("Netherlands", "H", ["#AE1C28", "#FFFFFF", "#21468B"]),
 ("New Zealand", "CANTON_UK", "#00247D", [("DOTS", "#FF0000", [(48, 20), (52, 30), (48, 40), (44, 30)], 3)]),
 ("Nicaragua", "H", ["#0067C6", "#FFFFFF", "#0067C6"], [1, 2, 1]),
 ("Niger", "H", ["#E05206", "#FFFFFF", "#0DB02B"], [1, 1, 1], ("DOT", "#E05206")),
 ("Nigeria", "V", ["#008751", "#FFFFFF", "#008751"]),
 ("North Korea", "H", ["#024FA2", "#FFFFFF", "#ED1C24", "#FFFFFF", "#024FA2"], [1, 1, 4, 1, 1], ("DISCSTAR", "#FFFFFF", "#ED1C24")),
 ("North Macedonia", "PLAIN", "#D20000", ("SUN", "#FFE600")),
 ("Norway", "XNW", "#BA0C2F", "#FFFFFF", "#00205B"),
 ("Oman", "HBAR", ["#FFFFFF", "#EE1C25", "#009639"], ("VBAR", "#EE1C25", 0, 22)),
 ("Pakistan", "VBAR", "#01411C", "#FFFFFF", 0, 16, ("CSTAR", "#FFFFFF")),
 ("Palau", "D", "#4AADD6", "#FFDE00", 30, 32, 10),
 ("Palestine", "H", ["#000000", "#FFFFFF", "#007A3D"], [1, 1, 1], ("TRI", "#CE1126")),
 ("Panama", "QUARTER2", "#FFFFFF", "#002654", "#D21034"),
 ("Papua New Guinea", "DIA", "#CE1126", "#000000", ("DOTS", "#FFFFFF", [(44, 16), (50, 22), (44, 30), (38, 22)], 2), ("STAR", "#FFCC00", 44, 44, 6)),
 ("Paraguay", "H", ["#D52B1E", "#FFFFFF", "#0038A8"], [1, 1, 1]),
 ("Peru", "V", ["#D91023", "#FFFFFF", "#D91023"]),
 ("Philippines", "HB", ["#0038A8", "#CE1126"], ("TRI", "#FFFFFF"), ("SUNDOTS", "#FCD116")),
 ("Poland", "H", ["#FFFFFF", "#DC143C"], [1, 1]),
 ("Portugal", "V", ["#046A38", "#DA291C"], [2, 3], ("DOT", "#FFE900")),
 ("Qatar", "BAND", "#8A1538", "#FFFFFF"),
 ("Romania", "V", ["#002B7F", "#FCD116", "#CE1126"]),
 ("Russia", "H", ["#FFFFFF", "#0039A6", "#D52B1E"]),
 ("Rwanda", "H", ["#00A1DE", "#FAD201", "#20603D"], [2, 1, 1], ("SUN", "#FAD201", 50, 16)),
 ("Samoa", "CANTON_SQ", "#CE1126", "#002654", 26, 26, ("CROSS_S", "#FFFFFF")),
 ("San Marino", "H", ["#FFFFFF", "#5EB6E4"], [1, 1]),
 ("Sao Tome and Principe", "H", ["#078930", "#FFCE00", "#078930"], [1, 2, 1], ("TRI", "#000000"), ("STAR", "#000000", 40, 20, 5), ("STAR", "#000000", 46, 32, 5)),
 ("Saudi Arabia", "PLAIN", "#006C35", ("SWORD", "#FFFFFF")),
 ("Senegal", "V", ["#00853F", "#FDEF42", "#E40521"], [1, 1, 1], ("STAR", "#00853F", 32, 32, 8)),
 ("Serbia", "H", ["#C6363C", "#0C4076", "#FFFFFF"], [1, 1, 1]),
 ("Seychelles", "DIAGBANDS", ["#003F87", "#FCD116", "#D62828", "#FFFFFF", "#007A5B"]),
 ("Sierra Leone", "H", ["#1EB53A", "#FFFFFF", "#007DB8"]),
 ("Singapore", "H", ["#EF3340", "#FFFFFF"], [1, 1], ("CSTAR", "#FFFFFF"), ("DOTS", "#FFFFFF", [(34, 12), (40, 16), (40, 24), (34, 28), (28, 24), (28, 16)], 2)),
 ("Slovakia", "H", ["#FFFFFF", "#0B4EA2", "#EE1C25"], [1, 1, 1], ("RECT", "#FFFFFF", 12, 22, 10, 16)),
 ("Slovenia", "H", ["#FFFFFF", "#0000FF", "#FF0000"], [1, 1, 1]),
 ("Solomon Islands", "DIA", "#215B33", "#0051BA", ("LINE_Y", "#FFDE00")),
 ("Somalia", "PLAIN", "#4189DD", ("STAR", "#FFFFFF", 32, 32, 11)),
 ("South Africa", "ZAF",),
 ("South Korea", "TAEGEUK",),
 ("South Sudan", "H", ["#000000", "#FFFFFF", "#DA291C", "#FFFFFF", "#00A651", "#FFFFFF", "#0F47AF"], [3, 1, 2, 1, 2, 1, 3], ("TRI", "#0F47AF"), ("STAR", "#FEDF00", 12, 32, 6)),
 ("Spain", "H", ["#AA151B", "#F1BF00", "#AA151B"], [1, 2, 1]),
 ("Sri Lanka", "LK",),
 ("Sudan", "H", ["#D21034", "#FFFFFF", "#000000"], [1, 1, 1], ("TRI", "#007229")),
 ("Suriname", "H", ["#078930", "#FFFFFF", "#B40A2D", "#FFFFFF", "#078930"], [2, 1, 4, 1, 2], ("STAR", "#ECC81D", 32, 32, 8)),
 ("Sweden", "XN", "#006AA7", "#FECC00"),
 ("Switzerland", "XC", "#DA291C", "#FFFFFF", 10),
 ("Syria", "H", ["#CE1126", "#FFFFFF", "#000000"], [1, 1, 1], ("DOTS", "#007A3D", [(26, 32), (38, 32)], 3)),
 ("Taiwan", "CANTON_TW", "#FE0000", "#000080", ("SUN", "#FFFFFF", 16, 16)),
 ("Tajikistan", "H", ["#CC0000", "#FFFFFF", "#006600"], [2, 3, 2], ("DOT", "#F8C300")),
 ("Tanzania", "DIAG3", "#1EB53A", "#FCD116", "#000000"),
 ("Thailand", "H", ["#A51931", "#F4F5F8", "#2D2A4A", "#F4F5F8", "#A51931"], [1, 1, 2, 1, 1]),
 ("Timor-Leste", "PLAIN", "#DC241F", ("TRIYL", "#FFC726", "#000000"), ("STAR", "#FFFFFF", 14, 32, 7)),
 ("Togo", "H", ["#006A4E", "#FFCE00", "#006A4E", "#FFCE00", "#006A4E"], [1, 1, 1, 1, 1], ("CANTON_SQ", "#D21034", 22, 22, ("STAR", "#FFFFFF", 11, 11, 5))),
 ("Tonga", "XC2", "#C10000", "#FFFFFF", ("CROSS_SM", "#C10000")),
 ("Trinidad and Tobago", "DIAG3", "#CE1126", "#FFFFFF", "#000000"),
 ("Tunisia", "PLAIN", "#E70013", ("DISC", "#FFFFFF", 13), ("CSTAR", "#E70013")),
 ("Turkey", "PLAIN", "#E30A17", ("CSTAR", "#FFFFFF")),
 ("Turkmenistan", "H", ["#00843D", "#FFFFFF", "#00843D"], [3, 1, 3], ("VBAR", "#D22630", 8, 14), ("CSTAR", "#FFFFFF"), ("DOTS", "#FFFFFF", [(40, 14), (46, 20), (46, 30), (40, 36)], 2)),
 ("Tuvalu", "PLAIN", "#00247D", ("DOTS", "#FFC726", [(20, 14), (30, 12), (40, 16), (46, 26), (40, 36), (30, 40), (22, 34), (18, 24), (30, 26)], 2)),
 ("Uganda", "H", ["#000000", "#FCDC04", "#D21034", "#000000", "#FCDC04", "#D21034"], [1, 1, 1, 1, 1, 1], ("DISC", "#FFFFFF", 8)),
 ("Ukraine", "H", ["#005BBB", "#FFD500"], [1, 1]),
 ("United Arab Emirates", "HBAR", ["#00732F", "#FFFFFF", "#000000"], ("VBAR", "#FF0000", 0, 20)),
 ("United Kingdom", "UK",),
 ("United States", "US",),
 ("Uruguay", "STRIPES_CANTON3", ["#FFFFFF", "#0038A8"], ("CANTON_SQ", "#FFFFFF", 22, 18, ("SUN", "#FCD116", 11, 9))),
 ("Uzbekistan", "H", ["#0099B5", "#FFFFFF", "#CE1126", "#FFFFFF", "#1EB53A"], [4, 1, 1, 1, 4], ("CSTAR", "#FFFFFF"), ("DOTS", "#FFFFFF", [(38, 14), (44, 20), (44, 30), (38, 36)], 2)),
 ("Vanuatu", "H", ["#CE1126", "#000000", "#009543"], [2, 1, 2], ("TRIYL", "#FFD100", "#000000")),
 ("Vatican City", "V", ["#FFE000", "#FFFFFF"], [1, 1]),
 ("Venezuela", "H", ["#FCD116", "#003893", "#CE1126"], [2, 1, 1], ("DOTS", "#FFFFFF", [(24, 16), (32, 13), (40, 16)], 2)),
 ("Vietnam", "PLAIN", "#DA251D", ("STAR", "#FFDE00", 32, 32, 12)),
 ("Yemen", "H", ["#CE1126", "#FFFFFF", "#000000"]),
 ("Zambia", "PLAIN", "#198A00", ("RECT", "#EF7D00", 40, 44, 24, 8), ("STRIPE3V", ["#CE1126", "#000000", "#EF7D00"], 40, 52, 24, 6)),
 ("Zimbabwe", "H", ["#006400", "#FFD200", "#DE2010", "#000000", "#DE2010", "#FFD200", "#006400"], [1, 1, 1, 1, 1, 1, 1], ("TRI", "#FFFFFF"), ("DOT", "#000000")),
]

# ---------------- engine ----------------
def rect(cv, x0, y0, w, h, c):
    for y in range(max(0, y0), min(H, y0 + h)):
        for x in range(max(0, x0), min(W, x0 + w)):
            cv[y][x] = c


def line(cv, x0, y0, x1, y1, w, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0), 1) * 2 + 1)
    for i in range(n + 1):
        t = i / n
        cx = x0 + (x1 - x0) * t
        cy = y0 + (y1 - y0) * t
        for yy in range(int(cy - w), int(cy + w) + 1):
            for xx in range(int(cx - w), int(cx + w) + 1):
                if 0 <= xx < W and 0 <= yy < H and (xx - cx) ** 2 + (yy - cy) ** 2 <= w * w:
                    cv[yy][xx] = c


def poly(cv, pts, c):
    ys = range(max(0, int(min(p[1] for p in pts))), min(H, int(max(p[1] for p in pts)) + 1))
    n = len(pts)
    for y in ys:
        xs = []
        for i in range(n):
            x1, y1 = pts[i]
            x2, y2 = pts[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                xs.append(x1 + (y - y1) / (y2 - y1) * (x2 - x1))
        xs.sort()
        for i in range(0, len(xs) - 1, 2):
            for x in range(max(0, int(xs[i])), min(W, int(xs[i + 1]) + 1)):
                cv[y][x] = c


def cross(cv, cx, cy, arm, w, c):
    rect(cv, cx - arm, cy - w, arm * 2, w * 2, c)
    rect(cv, cx - w, cy - arm, w * 2, arm * 2, c)


def hstripes(cv, seq):
    n = len(seq)
    for i, c in enumerate(seq):
        y0 = int(i * H / n)
        y1 = int((i + 1) * H / n) if i < n - 1 else H
        rect(cv, 0, y0, W, y1 - y0, hx(c))


def sun(cv, cx, cy, r, c, rays=12, loo=4):
    disc(cv, cx, cy, r, c)
    for i in range(rays):
        a = math.radians(i * 360 / rays)
        line(cv, cx + int((r + 1) * math.cos(a)), cy + int((r + 1) * math.sin(a)),
             cx + int((r + loo) * math.cos(a)), cy + int((r + loo) * math.sin(a)), 1, c)


def cstar(cv, cx, cy, r, c):
    for y in range(H):
        for x in range(W):
            d1 = (x - cx) ** 2 + (y - cy) ** 2
            d2 = (x - cx - r * 0.45) ** 2 + (y - cy) ** 2
            if d1 <= r * r and d2 > (r * 0.82) ** 2:
                cv[y][x] = c
    star5(cv, cx + int(r * 0.55), cy, max(2, int(r * 0.45)), c)


def draw_canton(cv, color, w, h, inner):
    rect(cv, 0, 0, w, h, hx(color))
    if not inner:
        return
    k = inner[0]
    if k in ("STAR", "CSTAR", "SUN", "DOTS", "DOT", "DISC", "RECT"):
        apply_extra(cv, inner)
    elif k == "CROSS_SM":
        cross(cv, w // 2, h // 2, min(w, h) // 2 - 2, 3, hx(inner[1]))
    elif k == "CROSS_S":
        for (x, y) in [(20, 6), (14, 12), (18, 16), (22, 12), (16, 20)]:
            disc(cv, x, y, 2, hx(inner[1]))


def apply_extra(cv, spec):
    k = spec[0]
    if k == "DOT":
        disc(cv, 32, 32, 7, hx(spec[1]))
    elif k == "DISC":
        disc(cv, 32, 32, spec[2], hx(spec[1]))
    elif k == "STAR":
        star5(cv, spec[2], spec[3], spec[4], hx(spec[1]))
    elif k == "DOTS":
        for (x, y) in spec[2]:
            disc(cv, x, y, spec[3], hx(spec[1]))
    elif k == "SUN":
        sun(cv, spec[2] if len(spec) > 2 else 32, spec[3] if len(spec) > 3 else 32,
            spec[4] if len(spec) > 4 else 8, hx(spec[1]))
    elif k == "RING":
        ring(cv, 32, 32, 10, 2, hx(spec[1]))
        line(cv, 32, 18, 32, 46, 2, hx(spec[1]))
        line(cv, 18, 32, 46, 32, 2, hx(spec[1]))
        line(cv, 22, 22, 42, 42, 2, hx(spec[1]))
        line(cv, 42, 22, 22, 42, 2, hx(spec[1]))
    elif k == "ELLIPSE":
        for y in range(H):
            for x in range(W):
                t = ((x - 32) / 10) ** 2 + ((y - 32) / 14) ** 2
                if t < 1:
                    cv[y][x] = hx(spec[1])
        for y in range(H):
            for x in range(W):
                t = ((x - 32) / 6) ** 2 + ((y - 32) / 9) ** 2
                if t < 1:
                    cv[y][x] = hx("#FFFFFF")
        for y in range(H):
            for x in range(W):
                if ((x - 32) / 4) ** 2 + ((y - 32) / 7) ** 2 < 1:
                    cv[y][x] = hx(spec[1])
    elif k == "RECT":
        rect(cv, spec[2], spec[3], spec[4], spec[5], hx(spec[1]))
    elif k == "CSTAR":
        cstar(cv, spec[2] if len(spec) > 2 else 32, spec[3] if len(spec) > 3 else 32,
              spec[4] if len(spec) > 4 else 11, hx(spec[1]))
    elif k == "CRESCENT_G":
        if len(spec) < 3 or spec[2]:
            triangle_left(cv, 26, hx(spec[2] if len(spec) > 2 and spec[2] else "#007A36"))
        cstar(cv, 36, 32, 10, hx(spec[1]))
        for (x, y) in [(36, 16), (48, 32), (36, 48), (26, 32)]:
            star5(cv, x, y, 3, hx(spec[1]))
    elif k == "BLOB":
        for y in range(H):
            for x in range(W):
                if ((x - 32) / 12) ** 2 + ((y - 32) / 9) ** 2 < 1:
                    cv[y][x] = hx(spec[1])
        disc(cv, 26, 28, 6, hx(spec[1]))
    elif k == "SWORD":
        rect(cv, 14, 40, 36, 4, hx(spec[1]))
        rect(cv, 20, 24, 24, 7, hx(spec[1]))
    elif k == "CROSS_SM":
        cross(cv, 11, 11, 7, 2, hx(spec[1]))
    elif k == "CROSS_S":
        for (x, y) in [(20, 6), (14, 12), (18, 16), (22, 12), (16, 20)]:
            disc(cv, x, y, 2, hx(spec[1]))
    elif k == "CROSS2":
        rect(cv, 0, 28, W, 8, hx(spec[1]))
        rect(cv, 28, 0, 8, H, hx(spec[1]))
        rect(cv, 0, 29, W, 5, hx(spec[2]))
        rect(cv, 29, 0, 5, H, hx(spec[2]))
        rect(cv, 0, 31, W, 2, hx(spec[3]))
        rect(cv, 31, 0, 2, H, hx(spec[3]))
    elif k == "SUNRISE":
        sun(cv, 32, 32, 10, hx(spec[1]))
    elif k == "DISCSTAR":
        disc(cv, 32, 32, 11, hx(spec[1]))
        star5(cv, 32, 32, 6, hx(spec[2]))
    elif k == "SUNDOTS":
        sun(cv, 16, 32, 7, hx(spec[1]), rays=8)
        for (x, y) in [(6, 10), (6, 54), (26, 32)]:
            disc(cv, x, y, 3, hx(spec[1]))
    elif k == "TRI":
        triangle_left(cv, spec[2] if len(spec) > 2 else 24, hx(spec[1]))
    elif k == "TRI_SM":
        poly(cv, [(32, 24), (23, 42), (41, 42)], hx(spec[1]))
    elif k == "TRIYL":
        triangle_left(cv, 30, hx(spec[1]))
        triangle_left(cv, 22, hx(spec[2]))
    elif k == "TRAP":
        for y in range(H):
            edge = 8 + 16 * (1 - abs(y - 31.5) / 31.5)
            for x in range(int(edge)):
                cv[y][x] = hx(spec[1])
    elif k == "CHEV":
        triangle_left(cv, 28, hx(spec[1]))
    elif k == "STRIPE3V":
        cols, x0, y0, w, h = spec[1], spec[2], spec[3], spec[4], spec[5]
        for i, c in enumerate(cols):
            rect(cv, x0 + i * w // 3, y0, w // 3 + 1, h, hx(c))
    elif k == "VBAR":
        rect(cv, spec[2], 0, spec[3], H, hx(spec[1]))
    elif k == "LINE_Y":
        for y in range(H):
            for x in range(W):
                if abs(x + y - 62) < 6:
                    cv[y][x] = hx(spec[1])
        for (x, y) in [(44, 14), (50, 18), (46, 26), (52, 30), (40, 22)]:
            disc(cv, x, y, 2, hx("#FFFFFF"))
    elif k == "CANTON_SQ":
        draw_canton(cv, spec[1], spec[2], spec[3], spec[4] if len(spec) > 4 else None)
    else:
        raise ValueError("unknown extra " + k)


def uk_canton(cv, size=32):
    rect(cv, 0, 0, size, size, hx("#00247D"))
    for y in range(size):
        for x in range(size):
            if abs(x - y) < 4 or abs(x + y - size + 1) < 4:
                cv[y][x] = hx("#FFFFFF")
    rect(cv, 12, 0, 8, size, hx("#FFFFFF"))
    rect(cv, 0, 12, size, 8, hx("#FFFFFF"))
    rect(cv, 14, 0, 4, size, hx("#CE1126"))
    rect(cv, 0, 14, size, 4, hx("#CE1126"))


def build(entry):
    name, kind = entry[0], entry[1]
    cv = new()
    rest = entry[2:]
    if kind in ("H", "V"):
        cols = [hx(c) for c in rest[0]]
        idx = 1
        wts = None
        if len(rest) > 1 and isinstance(rest[1], list):
            wts = rest[1]
            idx = 2
        bands(cv, kind == "H", list(zip(cols, wts or [1] * len(cols))))
        for e in rest[idx:]:
            apply_extra(cv, e)
    elif kind == "DOT":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        if name == "Albania":
            for y in range(H):
                for x in range(W):
                    if ((x - 32) / 9) ** 2 + ((y - 32) / 11) ** 2 < 1:
                        cv[y][x] = hx(rest[1])
        else:
            disc(cv, 32, 32, 7, hx(rest[1]))
    elif kind == "HALF":
        rect(cv, 0, 0, 32, H, hx(rest[0]))
        rect(cv, 32, 0, 32, H, hx(rest[1]))
        for e in rest[2:]:
            apply_extra(cv, e)
    elif kind == "D":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        disc(cv, rest[2], rest[3], rest[4], hx(rest[1]))
    elif kind == "XN":
        nordic(cv, hx(rest[0]), hx(rest[1]))
    elif kind == "XNW":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        rect(cv, 0, 15, W, 14, hx(rest[1]))
        rect(cv, 15, 0, 14, H, hx(rest[1]))
        rect(cv, 0, 19, W, 6, hx(rest[2]))
        rect(cv, 19, 0, 6, H, hx(rest[2]))
    elif kind == "XC":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        w = rest[2]
        rect(cv, 32 - w, 0, w * 2, H, hx(rest[1]))
        rect(cv, 0, 32 - w, W, w * 2, hx(rest[1]))
    elif kind == "XC2":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        rect(cv, 0, 0, 28, 28, hx(rest[1]))
        cross(cv, 14, 14, 10, 3, hx(rest[2][1]))
    elif kind == "DIA":
        diag_split(cv, hx(rest[0]), hx(rest[1]))
        for e in rest[2:]:
            apply_extra(cv, e)
    elif kind in ("DIAGBAND", "DIAGBAND_B"):
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        if kind == "DIAGBAND_B":
            line(cv, 0, H - 1, W - 1, 0, 9, hx("#CE1021"))
            line(cv, 0, H - 1, W - 1, 0, 6, hx(rest[1]))
        else:
            line(cv, 0, H - 1, W - 1, 0, 7, hx(rest[1]))
        for e in rest[2:]:
            apply_extra(cv, e)
    elif kind == "SALTIRE":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        for y in range(H):
            for x in range(W):
                if abs(x - y) < 5 or abs(x + y - 63) < 5:
                    cv[y][x] = hx(rest[1])
        for y in range(16):
            for x in range(W):
                if abs(x - 32) < (16 - y) * 1.2:
                    cv[y][x] = hx(rest[2])
        for y in range(48, H):
            for x in range(W):
                if abs(x - 32) < (y - 48) * 1.2:
                    cv[y][x] = hx(rest[2])
    elif kind == "DIAG3":
        for y in range(H):
            for x in range(W):
                d = x + y
                cv[y][x] = hx(rest[0]) if d < 54 else (hx(rest[1]) if d < 74 else hx(rest[2]))
    elif kind == "DIAG3W":
        for y in range(H):
            for x in range(W):
                d = x + y
                cv[y][x] = hx(rest[0]) if d < 44 else (hx(rest[1]) if d < 50 else (hx(rest[2]) if d < 66 else (hx(rest[3]) if d < 72 else hx(rest[4]))))
        for e in rest[5:]:
            apply_extra(cv, e)
    elif kind == "DIAGBANDS":
        cols = [hx(c) for c in rest[0]]
        for y in range(H):
            for x in range(W):
                f = x / (x + 63 - y + 1)
                cv[y][x] = cols[0] if f < 0.2 else (cols[1] if f < 0.4 else (cols[2] if f < 0.6 else (cols[3] if f < 0.8 else cols[4])))
    elif kind == "DIAGBW":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
                d = x + y
                if 46 <= d <= 54:
                    cv[y][x] = hx(rest[2])
                elif 56 <= d <= 72:
                    cv[y][x] = hx(rest[1])
    elif kind == "RHOMBUS":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
                if abs(x - 32) / 24 + abs(y - 32) / 20 <= 1:
                    cv[y][x] = hx(rest[1])
        disc(cv, 32, 32, 9, hx(rest[2]))
    elif kind == "BAND":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        rect(cv, 0, 0, 16, H, hx(rest[1]))
    elif kind == "HBAR":
        cols = [hx(c) for c in rest[0]]
        bands(cv, True, [(c, 1) for c in cols])
        for e in rest[1:]:
            apply_extra(cv, e)
    elif kind == "VBAR":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        rect(cv, rest[2], 0, rest[3], H, hx(rest[1]))
        for e in rest[4:]:
            apply_extra(cv, e)
    elif kind == "HB":
        cols = [hx(c) for c in rest[0]]
        bands(cv, True, [(cols[0], 1), (cols[1], 1)])
        for e in rest[1:]:
            apply_extra(cv, e)
    elif kind == "TRI2":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        triangle_left(cv, 44, hx(rest[4]))
        triangle_left(cv, 40, hx(rest[3]))
        triangle_left(cv, 36, hx(rest[2]))
        triangle_left(cv, 30, hx(rest[1]))
    elif kind == "TRI3":
        for y in range(H):
            edge = 48 * (1 - abs(y - 31.5) / 31.5)
            for x in range(W):
                cv[y][x] = hx(rest[0]) if x < edge else (hx(rest[1]) if y < 32 else hx(rest[2]))
    elif kind == "QUARTER":
        rect(cv, 0, 0, 32, 32, hx(rest[0]))
        rect(cv, 32, 0, 32, 32, hx(rest[1]))
        rect(cv, 0, 32, 32, 32, hx(rest[1]))
        rect(cv, 32, 32, 32, 32, hx(rest[0]))
        rect(cv, 28, 0, 8, H, hx(rest[2]))
        rect(cv, 0, 28, W, 8, hx(rest[2]))
    elif kind == "QUARTER2":
        rect(cv, 0, 0, 32, 32, hx(rest[0]))
        rect(cv, 32, 0, 32, 32, hx(rest[2]))
        rect(cv, 0, 32, 32, 32, hx(rest[1]))
        rect(cv, 32, 32, 32, 32, hx(rest[0]))
        star5(cv, 16, 16, 6, hx(rest[1]))
        star5(cv, 48, 48, 6, hx(rest[2]))
    elif kind == "PLAIN":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        for e in rest[1:]:
            apply_extra(cv, e)
    elif kind == "STRIPES_TRISTAR":
        hstripes(cv, [rest[0][0], rest[0][1]] * 2 + [rest[0][0]])
        for e in rest[1:]:
            apply_extra(cv, e)
    elif kind in ("STRIPES_CANTON", "STRIPES_CANTON2", "STRIPES_CANTON3"):
        n = 11 if kind == "STRIPES_CANTON" else (14 if kind == "STRIPES_CANTON2" else 9)
        hstripes(cv, [rest[0][i % 2] for i in range(n)])
        spec = rest[1]
        draw_canton(cv, spec[1], spec[2], spec[3], spec[4] if len(spec) > 4 else None)
    elif kind == "CANTON_UK":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        uk_canton(cv)
        ex = []
        for e in rest[1:]:
            ex += e if isinstance(e, list) else [e]
        for e in ex:
            apply_extra(cv, e)
    elif kind == "CANTON_V":
        rect(cv, 0, 0, 22, H, hx(rest[0]))
        rect(cv, 22, 0, 42, 32, hx(rest[1][0]))
        rect(cv, 22, 32, 42, 32, hx(rest[1][1]))
    elif kind == "CANTON_VR":
        rect(cv, 0, 0, 22, H, hx(rest[0]))
        rect(cv, 22, 0, 42, 32, hx(rest[1][0]))
        rect(cv, 22, 32, 42, 32, hx(rest[1][1]))
        for e in rest[2:]:
            apply_extra(cv, e)
    elif kind == "CANTON_VW":
        rect(cv, 0, 0, 22, H, hx(rest[0]))
        rect(cv, 22, 0, 42, 32, hx(rest[1][0]))
        rect(cv, 22, 32, 42, 32, hx(rest[1][1]))
    elif kind == "CANTON_TW":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        rect(cv, 0, 0, 32, 32, hx(rest[1]))
        for e in rest[2:]:
            apply_extra(cv, e)
    elif kind == "CANTON_SQ":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx(rest[0])
        draw_canton(cv, rest[1], rest[2], rest[3], rest[4])
    elif kind == "GEORGIA":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx("#FFFFFF")
        rect(cv, 29, 0, 6, H, hx("#FF0000"))
        rect(cv, 0, 29, W, 6, hx("#FF0000"))
        for (cx, cy) in [(16, 16), (48, 16), (16, 48), (48, 48)]:
            cross(cv, cx, cy, 5, 2, hx("#FF0000"))
    elif kind == "GR":
        hstripes(cv, ["#0D5EAF", "#FFFFFF"] * 4 + ["#0D5EAF"])
        rect(cv, 0, 0, 22, 22, hx("#0D5EAF"))
        rect(cv, 8, 0, 6, 22, hx("#FFFFFF"))
        rect(cv, 0, 8, 22, 6, hx("#FFFFFF"))
    elif kind == "UK":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx("#012169")
        for y in range(H):
            for x in range(W):
                if abs(x - y) < 7 or abs(x + y - 63) < 7:
                    cv[y][x] = hx("#FFFFFF")
        for y in range(H):
            for x in range(W):
                if abs(x - y) < 2 or abs(x + y - 63) < 2:
                    cv[y][x] = hx("#C8102E")
        rect(cv, 22, 0, 20, H, hx("#FFFFFF"))
        rect(cv, 0, 22, W, 20, hx("#FFFFFF"))
        rect(cv, 26, 0, 12, H, hx("#C8102E"))
        rect(cv, 0, 26, W, 12, hx("#C8102E"))
    elif kind == "US":
        hstripes(cv, ["#B31942", "#FFFFFF"] * 6 + ["#B31942"])
        rect(cv, 0, 0, 26, 34, hx("#0A3161"))
        for r in range(4):
            for c in range(5):
                rect(cv, 3 + c * 5, 4 + r * 8, 2, 2, hx("#FFFFFF"))
    elif kind == "ZAF":
        rect(cv, 0, 0, W, 32, hx("#E03C31"))
        rect(cv, 0, 32, W, 32, hx("#001489"))
        line(cv, 0, 10, 26, 32, 5, hx("#FFFFFF"))
        line(cv, 0, 54, 26, 32, 5, hx("#FFFFFF"))
        line(cv, 26, 32, 64, 32, 5, hx("#FFFFFF"))
        line(cv, 0, 10, 26, 32, 2, hx("#007749"))
        line(cv, 0, 54, 26, 32, 2, hx("#007749"))
        line(cv, 26, 32, 64, 32, 2, hx("#007749"))
        triangle_left(cv, 18, hx("#000000"))
    elif kind == "TAEGEUK":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx("#FFFFFF")
        disc(cv, 32, 32, 12, hx("#CD2E3A"))
        for y in range(32, H):
            for x in range(W):
                if (x - 32) ** 2 + (y - 32) ** 2 <= 12 * 12:
                    cv[y][x] = hx("#0047A0")
        for (bx, by) in [(6, 8), (50, 8), (6, 54), (50, 54)]:
            for i in range(3):
                rect(cv, bx, by + i * 3, 8, 2, hx("#000000"))
    elif kind == "LK":
        for y in range(H):
            for x in range(W):
                cv[y][x] = hx("#FEBE10")
        rect(cv, 4, 4, 9, 56, hx("#007A5E"))
        rect(cv, 13, 4, 9, 56, hx("#FF7518"))
        rect(cv, 22, 4, 38, 56, hx("#8D153A"))
        disc(cv, 42, 32, 7, hx("#FEBE10"))
        for (x, y) in [(28, 10), (54, 10), (28, 54), (54, 54)]:
            disc(cv, x, y, 2, hx("#FEBE10"))
    elif kind == "NEPAL":
        poly(cv, [(6, 6), (38, 22), (6, 34)], hx("#DC143C"))
        poly(cv, [(6, 34), (30, 48), (6, 58)], hx("#DC143C"))
        disc(cv, 16, 20, 4, hx("#FFFFFF"))
        disc(cv, 16, 46, 5, hx("#FFFFFF"))
    else:
        raise ValueError("unknown kind " + kind + " for " + name)
    return cv


def main():
    start = 53
    entries = []
    n = 0
    for e in COUNTRIES:
        if e[1] == "SKIP":
            continue
        sid = start + n
        n += 1
        cv = build(e)
        wp("assets/skins/skin-%d.png" % sid, cv)
        nm = e[0].replace('"', "")
        entries.append('  { id: %d, name: "%s", src: "assets/skins/skin-%d.png", hint: "Buy in the shop", shopCat: "countries", unlock: { type: "shop", cost: 100 } },' % (sid, nm, sid))
    open(os.path.join(HERE, "countries_entries.txt"), "w", encoding="utf-8").write("\n".join(entries) + "\n")
    print("wrote %d skins, ids %d..%d" % (n, start, start + n - 1))


if __name__ == "__main__":
    main()

