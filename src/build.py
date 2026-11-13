"""Build the dependency-free extension and deliverables using Python's standard library."""
from pathlib import Path
import shutil
import struct
import zlib
import zipfile
import json
import hashlib
import math

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src"
OUTPUT = ROOT / "outputs" / "点选缩放"


def extension_files():
    return [p for p in sorted(SOURCE.rglob('*')) if p.is_file() and p.suffix != '.py'
            and '__pycache__' not in p.parts and 'desktop' not in p.relative_to(SOURCE).parts and p.name != '待修问题.md']


def copy_extension(destination):
    # No MSI in the installed plugin: the software installer contains the plugin,
    # so embedding the installer again would create recursive packaging.
    destination.mkdir(parents=True, exist_ok=True)
    for source in extension_files():
        target=destination/source.relative_to(SOURCE)
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(source,target)


def polygon(x, y, vertices):
    inside = False
    j = len(vertices) - 1
    for i, (xi, yi) in enumerate(vertices):
        xj, yj = vertices[j]
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def rounded(x, y, lo, hi, radius):
    if not (lo <= x <= hi and lo <= y <= hi):
        return False
    cx = min(max(x, lo + radius), hi - radius)
    cy = min(max(y, lo + radius), hi - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def icon(size):
    # Matches icons/fish.svg: a white line-drawn fish on blue, no external assets.
    points=[]
    def curve(a,b,c,d):
        for i in range(33):
            t=i/32;u=1-t
            points.append((u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]))
    curve((72,128),(101,79),(161,79),(190,128))
    curve((190,128),(161,177),(101,177),(72,128))
    segments=list(zip(points,points[1:]))+[((72,128),(43,101)),((43,101),(43,155)),((43,155),(72,128))]
    def white(x,y):
        x=244.5-x  # The application fish faces left in every generated size.
        if (x-158)**2+(y-117)**2<=6**2:return True
        if not (36<=x<=197 and 85<=y<=171):return False
        for (ax,ay),(bx,by) in segments:
            if x<min(ax,bx)-6 or x>max(ax,bx)+6 or y<min(ay,by)-6 or y>max(ay,by)+6:continue
            dx=bx-ax;dy=by-ay
            if not dx and not dy:continue
            t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)))
            if (x-ax-t*dx)**2+(y-ay-t*dy)**2<=36:return True
        return False
    rows=[]
    for py in range(size):
        row=bytearray()
        for px in range(size):
            samples=[]
            for sy in range(3):
                for sx in range(3):
                    x=(px+(sx+.5)/3)*256/size;y=(py+(sy+.5)/3)*256/size
                    color=(38,132,215,255) if rounded(x,y,1,255,56) else (0,0,0,0)
                    if white(x,y):color=(255,255,255,255)
                    samples.append(color)
            row.extend(round(sum(c[k] for c in samples)/9) for k in range(4))
        rows.append(b"\x00"+row)
    def chunk(kind,data):return struct.pack(">I",len(data))+kind+data+struct.pack(">I",zlib.crc32(kind+data))
    return b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",size,size,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(b"".join(rows)))+chunk(b"IEND",b"")

def build_icons():
    folder=SOURCE/'icons';folder.mkdir(exist_ok=True)
    sizes=(16,32,48,128,256);images=[icon(size) for size in sizes]
    for size,png in zip(sizes,images):(folder/f'{size}.png').write_bytes(png)
    entries=[];offset=6+16*len(sizes)
    for size,png in zip(sizes,images):
        entries.append(struct.pack('<BBBBHHII',size%256,size%256,0,0,1,32,len(png),offset));offset+=len(png)
    (folder/'fish.ico').write_bytes(struct.pack('<HHH',0,1,len(sizes))+b''.join(entries)+b''.join(images))


def main():
    (SOURCE / "icons").mkdir(exist_ok=True)
    build_icons()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # The direct PiP player replaces these three legacy landing-page assets.
    for name in ("watchroom.html", "watchroom.css", "watchroom.js"):
        obsolete = OUTPUT / name
        if obsolete.resolve().parent == OUTPUT.resolve() and obsolete.is_file():
            obsolete.unlink()
    copy_extension(OUTPUT)
    version = json.loads((SOURCE / "manifest.json").read_text(encoding="utf-8"))["version"]
    packaged_msi = OUTPUT / "installer/PointResizeVideo.msi"
    record = ROOT / "work/installer/build-manifest.json"
    current_msi = False
    if record.exists():
        info = json.loads(record.read_text(encoding="utf-8"))
        candidate = Path(info["msi"])
        if info["version"] == version and candidate.exists() and hashlib.sha256(candidate.read_bytes()).hexdigest() == info["msiSHA256"]:
            packaged_msi.parent.mkdir(exist_ok=True)
            shutil.copy2(candidate, packaged_msi)
            current_msi = True
    if not current_msi and packaged_msi.is_file():
        assert packaged_msi.resolve().parent == (OUTPUT / "installer").resolve()
        packaged_msi.unlink()  # Only the known generated, outdated installer.
    zip_path = OUTPUT.parent / f"点选缩放-{version}.zip"
    packages = [zip_path]
    for package in packages:
        with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as archive:
            for source in sorted(OUTPUT.rglob("*")):
                if source.is_file(): archive.write(source, source.relative_to(OUTPUT.parent))
    print(f"Built: {zip_path} ({zip_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
