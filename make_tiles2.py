"""Batch-2 tile sprites: djOrb, crusher, saw, ice, mud, half, halfT. Stdlib only."""
import zlib, struct, os, math, random
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\tiles"
def wp(path,w,h,px):
    raw=b"".join(b"\x00"+b"".join(struct.pack("4B",*c) for c in r) for r in px)
    def ck(t,d):
        c=t+d; return struct.pack(">I",len(d))+c+struct.pack(">I",zlib.crc32(c)&0xffffffff)
    open(path,"wb").write(b"\x89PNG\r\n\x1a\n"+ck(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+ck(b"IDAT",zlib.compress(raw,9))+ck(b"IEND",b""))
    print("wrote",os.path.basename(path))
T=(0,0,0,0)

def djOrb():
    cv=[[T]*32 for _ in range(32)]
    cx=cy=16
    for y in range(32):
        for x in range(32):
            d=math.hypot(x-cx,y-cy)
            if d<=11:
                if d>10: cv[y][x]=(20,90,80,255)
                elif d>8: cv[y][x]=(46,230,255,255)
                else: cv[y][x]=(120,255,240,255)
                if d<5: cv[y][x]=(230,255,250,255)
            elif 11<d<=13: cv[y][x]=(46,230,255,90)
    # double chevron up (the "x2 jump" read)
    W=(255,255,255,255)
    for ox,oy in [(0,0),(0,6)]:
        for i in range(5):
            cv[12+oy-i][13+i]=W; cv[12+oy-i][19-i]=W
    return cv

def crusher():
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y<26:
                edge = (x in (0,1,30,31) or y in (0,1))
                if edge: cv[y][x]=(40,44,58,255)
                else:
                    cv[y][x]=(110,116,134,255) if (x+y)%2==0 else (96,102,120,255)
                    if y in (24,25): cv[y][x]=(60,64,80,255)
            else:
                # spike teeth along the bottom
                tx = x % 8
                if tx <= 6 - (y-26)*1: cv[y][x]=(200,205,220,255)
    for x,y in [(4,4),(27,4),(4,21),(27,21)]:
        cv[y][x]=(30,32,44,255)
    # warning stripe
    for x in range(4,28):
        if (x//4)%2==0: cv[13][x]=(255,210,60,255)
    return cv

def saw():
    cv=[[T]*32 for _ in range(32)]
    cx=cy=16
    for y in range(32):
        for x in range(32):
            dx,dy=x-cx,y-cy
            d=math.hypot(dx,dy)
            if d<=15:
                ang=(math.degrees(math.atan2(dy,dx))%360)
                tooth = int(ang//22.5)%2==0
                edge = 12<d<=15
                if edge and tooth: cv[y][x]=(190,195,210,255)
                elif edge: continue
                elif d<=4: cv[y][x]=(200,40,50,255)
                elif d<=6: cv[y][x]=(120,20,30,255)
                else: cv[y][x]=(150,155,170,255) if (x+y)%2==0 else (135,140,155,255)
    cv[16][16]=(255,230,230,255)
    return cv

def brick_base(top, c1, c2, mort):
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y<top: continue
            cv[y][x]=c1 if (x//8+y//8)%2==0 else c2
            if x%8==0 or y%8==0: cv[y][x]=mort
    return cv

def ice():
    cv=brick_base(0,(150,200,245,255),(120,175,230,255),(200,235,255,255))
    # shine streaks
    for y in range(3,29):
        cv[y][5]=(235,248,255,255); cv[y][6]=(235,248,255,255)
    R=random.Random(7)
    for _ in range(5):
        x,y=R.randint(10,28),R.randint(2,28)
        cv[y][x]=(255,255,255,255); cv[y][min(31,x+1)]=(255,255,255,255)
    return cv

def mud():
    cv=brick_base(0,(122,84,52,255),(100,68,42,255),(58,40,26,255))
    R=random.Random(11)
    for _ in range(14):
        x,y=R.randint(1,30),R.randint(1,30)
        cv[y][x]=(70,48,30,255)
        if x<31: cv[y][x+1]=(70,48,30,255)
    return cv

def half(bottom):
    cv=[[T]*32 for _ in range(32)]
    rows = range(16,32) if bottom else range(0,16)
    for y in rows:
        for x in range(32):
            cv[y][x]=(155,105,65,255) if (x//8)%2==(y//8)%2 else (120,80,50,255)
            if x%8==0 or y%8==0: cv[y][x]=(45,35,30,255)
    edge = 16 if bottom else 15
    for x in range(32): cv[edge][x]=(85,170,55,255)
    return cv

os.makedirs(OUT, exist_ok=True)
wp(os.path.join(OUT,"djOrb.png"),32,32,djOrb())
wp(os.path.join(OUT,"crusher.png"),32,32,crusher())
wp(os.path.join(OUT,"saw.png"),32,32,saw())
wp(os.path.join(OUT,"ice.png"),32,32,ice())
wp(os.path.join(OUT,"mud.png"),32,32,mud())
wp(os.path.join(OUT,"half.png"),32,32,half(True))
wp(os.path.join(OUT,"halfT.png"),32,32,half(False))
print("done")
