from PIL import Image
import sys

sheet = sys.argv[1] if len(sys.argv) > 1 else 'assets/bomberman_sheet V2.png'
im = Image.open(sheet).convert('RGBA')
# frame size for V2 — each logical cell is 48×48
fw,fh = 48,48
cols = im.width//fw
rows = im.height//fh

print(f"Scanning '{sheet}' -> size={im.width}x{im.height}  frame={fw}x{fh}  cols={cols} rows={rows} total={cols*rows}")

def cell_and_mask(r,c):
    box=(c*fw,r*fh,(c+1)*fw,(r+1)*fh)
    cell = list(im.crop(box).getdata())
    # cell is list of (r,g,b,a) tuples, row-major
    mask = [1 if px[3] > 16 else 0 for px in cell]
    return cell, mask

for r in range(rows):
    diffs=[]
    for c in range(cols-1):
        a,ma = cell_and_mask(r,c)
        b,mb = cell_and_mask(r,c+1)
        # compute per-pixel difference only where either alpha > 16
        total = 0
        count = 0
        for i in range(len(a)):
            if ma[i] or mb[i]:
                ar,ag,ab,aa = a[i]
                br,bg,bb,ba = b[i]
                total += abs(ar-br) + abs(ag-bg) + abs(ab-bb)
                count += 1
        val = (total / count) if count else 0.0
        diffs.append(val)
    print(f"row {r} diffs:\n" + ' '.join(f"{d:.1f}" for d in diffs))
    import statistics
    mean = statistics.mean(diffs)
    thresh = mean * 1.4
    bounds = [i+1 for i,d in enumerate(diffs) if d > thresh]
    print('  boundaries at columns:', bounds)
