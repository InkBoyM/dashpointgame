"""Seamless looping theme backgrounds, 256x256, tile in all directions. Stdlib only.
Wrap trick: every blob is stamped at (+dx,+dy) for dx,dy in (-S,0,S) so edges match."""
import zlib, struct, os, math, random
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\bg"
S = 256
def wp(path,px):
    raw=b"".join(b"\x00"+b"".join(struct.pack("4B",*c) for c in r) for r in px)
    def ck(t,d):
        c=t+d; return struct.pack(">I",len(d))+c+struct.pack(">I",zlib.crc32(c)&0xffffffff)
    open(path,"wb").write(b"\x89PNG\r\n\x1a\n"+ck(b"IHDR",struct.pack(">IIBBBBB",S,S,8,6,0,0,0))+ck(b"IDAT",zlib.compress(raw,9))+ck(b"IEND",b""))
    print("wrote",os.path.basename(path), len(open(path,'rb').read()), "B")

def new(base):
    return [[base]*S for _ in range(S)]

def stamp(cv,x,y,col,r=1):
    for dy in range(-r,r+1):
        for dx in range(-r,r+1):
            if dx*dx+dy*dy<=r*r:
                for ox in (-S,0,S):
                    for oy in (-S,0,S):
                        xx,yy=x+dx+ox,y+dy+oy
                        if 0<=xx<S and 0<=yy<S: cv[yy][xx]=col

def grad(cv, edge, center):
    # symmetric edge->center->edge so the tile loops seamlessly in all directions
    for y in range(S):
        k = 1.0 - abs(2.0 * y / (S - 1) - 1.0)
        cv[y] = [(int(edge[0]+(center[0]-edge[0])*k),int(edge[1]+(center[1]-edge[1])*k),int(edge[2]+(center[2]-edge[2])*k),255)]*S

def meadow():
    cv=new((0,0,0,0))
    grad(cv,(52,140,80),(96,190,110))
    R=random.Random(21)
    for _ in range(260):
        stamp(cv,R.randrange(S),R.randrange(S),(60+R.randrange(40),150+R.randrange(50),80+R.randrange(30),255),R.choice([1,1,2]))
    for _ in range(70):  # grass blades
        x,y=R.randrange(S),R.randrange(S)
        for ox in (-S,0,S):
            for oy in (-S,0,S):
                xx,yy=x+ox,y+oy
                if 0<=xx<S and 0<=yy-2<S: cv[yy-2][xx]=(40,120,60,255)
    for _ in range(12):  # soft clouds
        x,y=R.randrange(S),R.randrange(30,120)
        for i in range(14):
            stamp(cv,x+i*3,y+int(math.sin(i)*3),(235,245,255,70),4)
    return cv

def glacier():
    cv=new((0,0,0,0))
    grad(cv,(150,200,235),(200,235,255))
    R=random.Random(22)
    for _ in range(40):  # diagonal ice streaks (wrapped)
        x,y=R.randrange(S),R.randrange(S)
        for i in range(26):
            stamp(cv,x+i,y+i//2,(255,255,255,60),2)
    for _ in range(120):
        stamp(cv,R.randrange(S),R.randrange(S),(255,255,255,220),1)
    return cv

def volcano():
    cv=new((0,0,0,0))
    grad(cv,(26,18,24),(58,30,34))
    R=random.Random(23)
    for _ in range(500):
        stamp(cv,R.randrange(S),R.randrange(S),(40+R.randrange(30),26+R.randrange(18),30+R.randrange(16),255),R.choice([1,1,2]))
    # glowing cracks (wrapped polylines)
    for _ in range(10):
        x,y=R.randrange(S),R.randrange(S)
        a=R.uniform(0,math.pi*2)
        for i in range(46):
            a+=R.uniform(-0.5,0.5)
            x+=math.cos(a)*4; y+=math.sin(a)*3
            for ox in (-S,0,S):
                for oy in (-S,0,S):
                    xx,yy=int(x+ox),int(y+oy)
                    if 0<=xx<S and 0<=yy<S:
                        cv[yy][xx]=(255,120,20,255)
                        if xx+1<S: cv[yy][xx+1]=(255,200,80,255)
    for _ in range(40):
        stamp(cv,R.randrange(S),R.randrange(S),(255,80,10,200),1)
    return cv

def desert():
    cv=new((0,0,0,0))
    grad(cv,(232,196,130),(205,160,100))
    R=random.Random(24)
    for _ in range(14):  # dune curves (periods divide S so they wrap horizontally)
        y0=R.randrange(S); amp=R.uniform(6,16); per=R.choice([64,128,256]); ph=R.uniform(0,6)
        for x in range(S):
            y=int(y0+math.sin(x/per*math.pi*2+ph)*amp)
            for ox in (-S,0,S):
                for oy in (-S,0,S):
                    xx,yy=x+ox,y+oy
                    if 0<=xx<S and 0<=yy<S: cv[yy][xx]=(214,178,112,255)
                    if 0<=xx<S and 0<=yy+2<S: cv[yy+2][xx]=(244,214,150,255)
    for _ in range(300):
        stamp(cv,R.randrange(S),R.randrange(S),(190+R.randrange(40),150+R.randrange(35),95+R.randrange(25),255),1)
    return cv

def cave():
    cv=new((0,0,0,0))
    grad(cv,(16,12,26),(44,30,58))
    R=random.Random(25)
    for _ in range(420):
        stamp(cv,R.randrange(S),R.randrange(S),(30+R.randrange(45),22+R.randrange(30),48+R.randrange(45),255),R.choice([1,1,2]))
    for _ in range(26):  # faint crystals
        x,y=R.randrange(S),R.randrange(S)
        col=(120+R.randrange(60),220,255,200) if R.random()<0.5 else (200,140,255,200)
        for i in range(5):
            stamp(cv,x,y-i,col,1)
    return cv

os.makedirs(OUT, exist_ok=True)
for name,fn in [("bg-meadow",meadow),("bg-glacier",glacier),("bg-volcano",volcano),("bg-desert",desert),("bg-cave",cave)]:
    wp(os.path.join(OUT,name+".png"),fn())
print("done")
