"""New tile sprites: slopeL/R, platform, portalA/B, gravOrb, water/lava (static+strip). Stdlib only."""
import zlib, struct, os, math, random
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\tiles"
def wp(path,w,h,px):
    raw=b"".join(b"\x00"+b"".join(struct.pack("4B",*c) for c in r) for r in px)
    def ck(t,d):
        c=t+d; return struct.pack(">I",len(d))+c+struct.pack(">I",zlib.crc32(c)&0xffffffff)
    open(path,"wb").write(b"\x89PNG\r\n\x1a\n"+ck(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+ck(b"IDAT",zlib.compress(raw,9))+ck(b"IEND",b""))
    print("wrote",os.path.basename(path))
T=(0,0,0,0)
BRK=(155,105,65,255); BRK2=(120,80,50,255); MORT=(45,35,30,255)
GRASS_TOP=(85,170,55,255)
# slopeL: low-left high-right? ◿ is like bottom-left triangle filled. We'll make slopeL = rising to right (floor diagonal up-right)
def slopeL():
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y >= 32 - x -1: # diagonal from bottom-left to top-right, fill below
                if y<4: cv[y][x]=GRASS_TOP
                elif y<6: cv[y][x]=BRK2
                else: cv[y][x]=BRK
                if x%8==0 or y%8==0: cv[y][x]=MORT
    # diagonal edge dark
    for y in range(32):
        x = 31 - y
        if 0<=x<32: cv[y][x]=MORT; 
        if 0<=x+1<32: cv[y][x+1]=MORT
    return cv
def slopeR(): # ◺ high-left low-right
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y >= x: # diagonal top-left to bottom-right, fill below? For slopeR we want rising to left
                if y<4+ (32-x)//8: pass
                if y<4: cv[y][x]=GRASS_TOP
                elif y<6: cv[y][x]=BRK2
                else: cv[y][x]=BRK
                if x%8==0 or y%8==0: cv[y][x]=MORT
                # for slopeR the top is at left, so grass along diagonal?
    # diagonal
    for y in range(32):
        x=y
        if 0<=x<32: cv[y][x]=MORT
        if 0<=x-1<32: cv[y][x-1]=MORT
    # fix to match slopeL but mirrored: regenerate properly
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y >= x:
                if y==x or y==x+1: cv[y][x]=MORT
                elif y<6 and x<6: cv[y][x]=GRASS_TOP
                else:
                    if x%8==0 or y%8==0: cv[y][x]=MORT
                    else: cv[y][x]=BRK
                # top grass line along diagonal
            # need grass cap on top of diagonal
    # rebuild with proper grass line
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            if y > x: # below diagonal
                if y==x+1 or y==x+2: cv[y][x]=GRASS_TOP
                elif y==x+3: cv[y][x]=BRK2
                else:
                    if (x%8==0 or y%8==0) and y>x+3: cv[y][x]=MORT
                    elif y>x+3: cv[y][x]=BRK
            elif y==x: cv[y][x]=MORT
            elif y==x-1: cv[y][x]=MORT
    return cv

def platform():
    cv=[[T]*32 for _ in range(32)]
    # metal platform 32x12 centered vertically
    for y in range(12,24):
        for x in range(2,30):
            if y in (12,23) or x in (2,29): cv[y][x]=(90,95,110,255)
            else: cv[y][x]=(160,165,180,255)
            if y==13 and x%6==0: cv[y][x]=(110,115,130,255)
    for x in (8,16,24): cv[15][x]=(70,75,90,255); cv[16][x]=(70,75,90,255)
    return cv

def portal(col):
    # col = (r,g,b) main, plus white swirl
    R,G,B=col
    cv=[[T]*32 for _ in range(32)]
    cx=cy=16; rx=11; ry=13
    for y in range(32):
        for x in range(32):
            nx=(x-cx)/rx; ny=(y-cy)/ry
            d=nx*nx+ny*ny
            if d<=1:
                if d>0.75: cv[y][x]=(20,20,30,255) # rim
                else:
                    # swirl
                    ang=math.atan2(ny,nx)+ (0.5 if ((x+y)%2==0) else -0.5)
                    dist=math.hypot(nx,ny)
                    v=int((math.sin(ang*3+dist*6)*0.5+0.5)*255)
                    cv[y][x]=(int(R*0.3+v*0.7) if v>128 else int(R*0.15), int(G*0.3+v*0.5), int(B*0.6+v*0.4),255)
                    if dist<0.3: cv[y][x]=(255,255,255,255)
            elif 1<d<=1.12: cv[y][x]=(20,20,30,180)
    return cv

def gravOrb():
    WHT2=(255,255,255,255)
    cv=[[T]*32 for _ in range(32)]
    cx=cy=16
    for y in range(32):
        for x in range(32):
            d=math.hypot(x-cx,y-cy)
            if d<=11: 
                if d>10: cv[y][x]=(60,20,90,255)
                elif d>8: cv[y][x]=(140,40,220,255)
                else: cv[y][x]=(180,90,255,255)
                if 13<=y<=15 and 8<=x<=24: # arrow
                    if x==16 or (y==14 and 10<=x<=22): cv[y][x]=WHT2
            elif 11<d<=13: cv[y][x]=(60,20,90,100)
    # up/down arrows
    cv[13][14]=WHT2; cv[13][18]=WHT2
    cv[12][16]=WHT2; cv[18][16]=WHT2
    cv[11][16]=WHT2; cv[19][16]=WHT2
    for x in range(12,21): cv[11][x]=WHT2 if abs(x-16)<=2 else cv[11][x]
    for x in range(12,21): cv[19][x]=WHT2 if abs(x-16)<=2 else cv[19][x]
    WHT=(255,255,255,255)
    # center dot
    cv[16][16]=WHT; cv[16][15]=WHT; cv[16][17]=WHT
    return cv

def water_frame(f):
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            wave=math.sin((x+f*4)*0.4)*2
            top=6+wave
            if y<top: continue
            elif y<top+3: cv[y][x]=(120,180,255,255)
            elif y<top+6: cv[y][x]=(70,140,255,255)
            else: cv[y][x]=(30,90,200,255)
            if y>top+8 and (x+f)%6==0: cv[y][x]=(90,160,255,255) # bubbles
    return cv

def lava_frame(f):
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            wave=math.sin((x+f*3)*0.5)*1.5
            top=8+wave
            if y<top: continue
            else:
                v=int(180+ math.sin((x*0.3+f)*2)*40 + random.Random(x*100+y+f*1000).randint(-20,20))
                cv[y][x]=(min(255,230+v//2), int(90+ (y-top)*4), 10,255)
                if (x+y+f)%7==0: cv[y][x]=(255,220,100,255) # ember
    return cv

os.makedirs(OUT, exist_ok=True)
wp(os.path.join(OUT,"slopeL.png"),32,32,slopeL())
wp(os.path.join(OUT,"slopeR.png"),32,32,slopeR())
wp(os.path.join(OUT,"platform.png"),32,32,platform())
wp(os.path.join(OUT,"portalA.png"),32,32,portal((40,120,255)))
wp(os.path.join(OUT,"portalB.png"),32,32,portal((255,120,40)))
wp(os.path.join(OUT,"gravOrb.png"),32,32,gravOrb())
# strips
for name,fn in [("water",water_frame),("lava",lava_frame)]:
    frs=[fn(f) for f in range(4)]
    wp(os.path.join(OUT,f"{name}.png"),32,32,frs[0])
    wp(os.path.join(OUT,f"{name}-strip.png"),128,32, [[c for fr in frs for c in fr[y]] for y in range(32)])
print("done")
