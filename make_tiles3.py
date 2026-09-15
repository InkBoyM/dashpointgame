"""Batch-3 tile sprites: convL, convR. Stdlib only."""
import zlib, struct, os
OUT = r"C:\Users\inkli\AppData\Local\Temp\opencode\dashpointgame-work\assets\tiles"
def wp(path,w,h,px):
    raw=b"".join(b"\x00"+b"".join(struct.pack("4B",*c) for c in r) for r in px)
    def ck(t,d):
        c=t+d; return struct.pack(">I",len(d))+c+struct.pack(">I",zlib.crc32(c)&0xffffffff)
    open(path,"wb").write(b"\x89PNG\r\n\x1a\n"+ck(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+ck(b"IDAT",zlib.compress(raw,9))+ck(b"IEND",b""))
    print("wrote",os.path.basename(path))
T=(0,0,0,0)
BRK=(155,105,65,255); BRK2=(120,80,50,255); MORT=(45,35,30,255); YEL=(255,210,60,255)

def conv(left):
    cv=[[T]*32 for _ in range(32)]
    for y in range(32):
        for x in range(32):
            cv[y][x]=BRK if (x//8+y//8)%2==0 else BRK2
            if x%8==0 or y%8==0: cv[y][x]=MORT
    # belt band
    for y in (13,14,15,16,17,18):
        for x in range(2,30):
            cv[y][x]=(60,64,80,255)
    # chevrons: < for left, > for right
    for cx in (7, 16, 25):
        for j in range(5):
            y = 13 + j
            if not (13 <= y <= 17): continue
            if left:
                x = cx - 2 + abs(j - 2)
                for xx in (x, x + 1):
                    if 2 <= xx < 30: cv[y][xx] = YEL
            else:
                x = cx + 2 - abs(j - 2)
                for xx in (x, x - 1):
                    if 2 <= xx < 30: cv[y][xx] = YEL
    return cv

os.makedirs(OUT, exist_ok=True)
wp(os.path.join(OUT,"convL.png"),32,32,conv(True))
wp(os.path.join(OUT,"convR.png"),32,32,conv(False))
print("done")
