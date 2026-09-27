"""Torture Chamber generator — 12 varied sections, audited jump math.
Limits baked in: rise<=2/step, gaps<=4 (5 max w/ launch), orb bounce +4.
Writes to Temp (NOT Levels/ — do not bundle without asking)."""
import json, os

COLS, ROWS = 60, 200
tiles = []
def T(c, r, id, rot=0):
    if not (0 <= c < COLS and 0 <= r < ROWS):
        raise ValueError(f"oob {c},{r}")
    t = {"c": c, "r": r, "id": id}
    if rot:
        t["rot"] = rot
    tiles.append(t)
def surf(c0, c1, r, id="brick", thick=2):
    for c in range(c0, c1 + 1):
        for k in range(thick):
            T(c, r + k, id)
def spike(c, r, rot=0):
    T(c, r, "spike", rot)
def coin(c, r, v):
    T(c, r, {10: "coin10", 50: "coin50", 100: "coin100", 500: "coin500"}[v])
def cp(c, r):
    T(c, r, "checkpoint")
texts = []
def label(c, r, text, color="#ffffff", scale=2):
    texts.append({"id": f"tx{len(texts):03d}", "c": c, "r": r, "text": text, "color": color, "scale": scale})

# ---------- base + spawn ----------
surf(0, 59, 197)
spawn = {"c": 4, "r": 194}

# ---------- S1 warmup (r196) ----------
for c in (14, 22, 30):
    spike(c, 196)
cp(36, 196)
label(6, 192, "TORTURE (probably)", "#ff2a3c", 3)
coin(18, 194, 10); coin(26, 194, 10); coin(34, 194, 10)

# ---------- S2 stairs: SOLID staircase (no underpass), top r188 ----------
T(38, 196, "brick"); T(39, 196, "brick")  # entry step
for c in range(40, 44):
    for r in range(194, 199):
        T(c, r, "brick")
for c in range(44, 48):
    for r in range(192, 199):
        T(c, r, "brick")
for c in range(48, 52):
    for r in range(190, 199):
        T(c, r, "brick")
# tread4 extends left under O1: takeoff for the orb chain is feet r188
for c in range(50, 60):
    for r in range(188, 199):
        T(c, r, "brick")
spike(43, 193)  # edge hop onto tread2
cp(56, 187)
label(44, 184, "warmup over", "#2ee6ff", 2)
coin(46, 190, 10); coin(54, 186, 10)

# ---------- S3 orb alley (vertical shaft, drift to ledge) ----------
T(50, 186, "orb"); T(50, 183, "orb"); T(50, 180, "orb")
surf(40, 48, 178)  # east end col 48: O3 bounces rise bonk-free (ledge underside killed them)
cp(44, 177)
label(42, 172, "orb alley", "#3ee07a", 2)
coin(49, 183, 50)
for c in range(32, 40): T(c, 176, "brick"); T(c, 177, "brick")  # flat run to surf-174 (was hop lottery)
surf(20, 32, 175, "brick", 1)  # surf ends col 32
T(33, 175, "slopeR")  # ramp up westbound (slopes never flush-pin, unlike hops)

# ---------- S4 slopes (lip 177, land 178) ----------
T(19, 174, "brick")
T(18, 174, "brick")  # flat run (was slopeL: pocketed S4 against the S5 bump)
for c, r in ((17, 175), (16, 176), (15, 177)):
    T(c, r, "slopeL")
surf(2, 10, 178)
surf(2, 21, 184); surf(2, 21, 185)
for c in range(11, 20):
    spike(c, 183)
cp(5, 177)
label(11, 170, "wheee", "#ffd23c", 3)
coin(12, 174, 50)

# ---------- S5 conveyor (belt r172, bed r176-177) ----------
for c in range(10, 14): T(c, 176, "brick"); T(c, 177, "brick")
for c in range(12, 18): T(c, 174, "brick")  # extended west: S5 landing room, S4 falls later onto (10-13,176)
# (bump removed: belt at floor level needs no mount; S4 crosses flat)
for c in range(14, 17): T(c, 175, "brick")
# (no bridge here: S5 hops onto the belt at col 22, S4 cruises under)
for c in range(18, 33):
    T(c, 174, "convR")  # belt ends col 32: hop zone above S4 face stays clear
for c in range(34, 42):
    T(c, 172, "convL")  # (overwritten by surf below: exit is plain floor)
surf(22, 39, 179)
for c in range(22, 40):
    spike(c, 178)
surf(33, 53, 172); surf(33, 53, 173)  # starts col 33: S5 exit bridge, high above S4 hop
cp(44, 171)
label(30, 167, "mind the gap", "#ff2a3c", 2)
coin(27, 170, 10); coin(38, 170, 10)

# ---------- S6 saw corridor (floor r172, ceil r168, steps) ----------
surf(42, 59, 172)
for c in range(40, 56):
    T(c, 168, "brick")
T(47, 171, "saw"); T(54, 171, "saw")
for c in range(57, 60): T(c, 170, "brick")
T(57, 171, "brick")  # face down to floor: no running under stepA into bonk loop
for c in (56, 57, 58): T(c, 168, "brick")  # gap col 59 (east end): S6 climbs through, S7 walks west gap-free
cp(57, 167)
label(47, 163, "sawbucks", "#ff2a3c", 2)
coin(50, 169, 50)
for c in range(52, 56): T(c, 166, "brick")
for c in range(51, 56): T(c, 167, "brick")  # 2-high face on the ceiling-run: hop it, land (48-51,164)
for c in range(48, 52): T(c, 164, "brick"); T(c, 165, "brick")

# ---------- S7 crusher hall (floor r164, ceil r158) ----------
surf(28, 51, 164)
for c in range(28, 44):
    T(c, 158, "brick")
T(32, 159, "crusher"); T(38, 159, "crusher")
for c in range(24, 28): T(c, 162, "brick"); T(c, 163, "brick")
for c in range(20, 24): T(c, 160, "brick"); T(c, 161, "brick")
cp(22, 159)
label(36, 154, "headache", "#ffd23c", 2)
coin(30, 162, 10); coin(42, 162, 10)

# ---------- S8 portals ----------
surf(8, 19, 160)
T(10, 159, "portalA")
surf(48, 55, 144)  # portal deck (chimney cols 44-47 open above the stairs)
T(50, 143, "portalB")
coin(48, 141, 50); coin(50, 140, 100); coin(52, 141, 50)
surf(48, 59, 152)
cp(52, 151)
label(46, 138, "magic", "#b45cff", 3)
for c in range(52, 56): T(c, 150, "brick"); T(c, 151, "brick")
for c in range(48, 52): T(c, 149, "brick"); T(c, 150, "brick")  # top 4768: 32px hop from (52-55,150), 72px headroom
for c in range(44, 46):
    T(c, 146, "brick"); T(c, 147, "brick")  # mass top 4672, open-topped via chimney
for c in range(46, 50): T(c, 148, "brick")  # 4-wide step: takeoff room, no flush pin
for c in range(40, 44): T(c, 144, "brick"); T(c, 145, "brick")
for c in range(36, 40): T(c, 142, "brick"); T(c, 143, "brick")

# ---------- S9 ice + mud ----------
for c in range(28, 36):
    T(c, 142, "ice"); T(c, 143, "ice")
for c in range(24, 28): T(c, 140, "mud"); T(c, 141, "mud")
for c in range(20, 24): T(c, 138, "mud"); T(c, 139, "mud")
surf(8, 19, 138)
for c in range(2, 6): T(c, 137, "brick")
for c in range(2, 6): T(c, 136, "brick")  # 6-wide: chained momentum survives
T(6, 136, "slopeR"); T(7, 137, "slopeR")  # ramp up WESTBOUND (S4-proven orientation)
cp(10, 137)
label(16, 132, "slip n slide", "#2ee6ff", 2)
coin(31, 140, 10)
for c in range(8, 14): T(c, 134, "brick"); T(c, 135, "brick")
T(8, 135, "slopeL"); T(9, 134, "slopeL")  # ramp (dedupe keep-last overwrites brick)
for c in range(12, 18): T(c, 132, "brick"); T(c, 133, "brick")
T(12, 133, "slopeL"); T(13, 132, "slopeL")  # ramp (dedupe keep-last overwrites brick)

# ---------- S10 halves ----------
T(16, 131, "half"); T(17, 131, "half"); T(18, 131, "half"); T(19, 131, "half")
for c in range(20, 24): T(c, 130, "brick"); T(c, 131, "brick")
for c in (24, 25, 26, 27): T(c, 129, "half")
surf(24, 45, 128, "brick", 4)  # 4-thick: high-speed falls can't tunnel through it
for c in range(28, 46):
    T(c, 124, "brick")
for c in (32, 36, 40):
    T(c, 127, "half")
cp(41, 126)
label(34, 126, "tiny steps", "#ffffff", 2)
coin(33, 125, 50); coin(38, 125, 10)
# ramp up eastbound onto the S11 slab: walkable slopes, never pin, open headroom
for c, r in ((42, 127), (43, 126), (44, 125), (45, 124)):
    T(c, r, "slopeL")

# ---------- S11 water shaft ----------
surf(46, 59, 124)
for r in range(114, 122):
    T(54, r, "brick")  # high bottom (r121): slab-top walkers pass under with jump room
for r in range(112, 124):
    T(58, r, "brick")
for c in range(55, 58):
    for r in range(112, 124):
        T(c, r, "water")
    T(c, 124, "water")
surf(40, 53, 112)
cp(44, 111)
T(58, 123, "lava")
T(57, 110, "coin500")  # above the shaft mouth (coins in water punch detection holes)
label(45, 106, "don't breathe", "#2ee6ff", 2)
coin(56, 110, 50)

# ---------- S12 finale ----------
for c in range(36, 40): T(c, 110, "brick"); T(c, 111, "brick")
for c in range(32, 36): T(c, 108, "brick"); T(c, 109, "brick")
cp(34, 107)
T(30, 105, "orb"); T(30, 102, "orb")
coin(30, 103, 50)
surf(24, 31, 117)
for c in range(24, 32):
    spike(c, 116)
surf(8, 27, 106)
for c in range(16, 30):
    T(c, 102, "brick")
T(27, 103, "brick"); T(27, 104, "brick"); T(27, 105, "brick")
T(12, 105, "saw")
for c in range(4, 8):
    for r in range(104, 110):
        T(c, r, "brick")
# exit stairs west: 1-up hops mass -> r103 -> r102 -> r100 floor, pillar below plugs the pit
for c in range(0, 4): T(c, 103, "brick")
for c in range(0, 4):
    for r in range(104, 136):
        T(c, r, "brick")
surf(4, 9, 100)  # open sky above the finale pillar (cols 0-3): no slab-bonk exits
T(1, 102, "goal")  # walk-in goal above the pillar top
cp(6, 99)
coin(5, 97, 100); coin(3, 95, 50); coin(7, 95, 50)
label(3, 92, "YOU SURVIVED", "#ffd23c", 3)

# dedupe keep-last (e.g. water pit carved over floor)
seen = {}
deduped = []
for t in tiles:
    key = (t["c"], t["r"])
    if key in seen:
        deduped[seen[key]] = t
    else:
        seen[key] = len(deduped)
        deduped.append(t)

level = {
    "format": "dashpoint-level",
    "version": 1,
    "name": "Torture",
    "cols": COLS,
    "rows": ROWS,
    "tileSize": 32,
    "spawn": spawn,
    "tiles": deduped,
    "texts": texts,
    "gameplay": {"moveSpeed": 320, "accel": 2800, "friction": 2400, "airAccel": 2100,
                 "jumpForce": 660, "gravity": 2100, "maxFall": 1000,
                 "coyoteMs": 90, "bufferMs": 120, "jumpCut": 0.42},
    "triggers": [],
    "theme": {"top": "#0d0406", "mid": "#2a0a12", "bottom": "#48121a", "bg": "volcano"},
    "meta": {"editor": "DashPoint Level Builder 0.1"},
}
out = r"C:\Users\inkli\AppData\Local\Temp\opencode\Torture.dashpoint.json"
with open(out, "w") as f:
    json.dump(level, f)
print("wrote", out, len(deduped), "tiles,", len(texts), "texts")
