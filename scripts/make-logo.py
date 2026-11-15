"""Recorta a marca do arquivo original e tira o fundo azul-marinho.

Uso: python scripts/make-logo.py assets/brand/racha-cuca-original.jpg public/brand/logo.webp  (requer Pillow)

O fundo é removido por preenchimento a partir das bordas: tudo que é escuro e
está ligado à borda vira transparente; na faixa de transição (o brilho em volta
do contorno branco) a transparência é proporcional ao brilho.
"""
import sys
from collections import deque
from pathlib import Path
from PIL import Image

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])
LO, HI = 70, 200  # brilho: abaixo de LO some, acima de HI fica opaco
FILL = 150  # o preenchimento para no contorno claro

im = Image.open(SRC).convert("RGB")
w, h = im.size
px = im.load()


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


bg = bytearray(w * h)
q = deque()
for x in range(w):
    q.extend([(x, 0), (x, h - 1)])
for y in range(h):
    q.extend([(0, y), (w - 1, y)])
while q:
    x, y = q.popleft()
    i = y * w + x
    if bg[i] or lum(px[x, y]) >= FILL:
        continue
    bg[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
            q.append((nx, ny))

out = Image.new("RGBA", (w, h))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        a = 255
        if bg[y * w + x]:
            t = (lum((r, g, b)) - LO) / (HI - LO)
            a = round(255 * min(1, max(0, t)) ** 1.5)
        op[x, y] = (r, g, b, a)

out = out.crop(out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
# Margem de 4 px; largura final W (2× a maior exibição).
W = 320
pad = Image.new("RGBA", (out.width + 8, out.height + 8))
pad.paste(out, (4, 4))
pad = pad.resize((W, round(W * pad.height / pad.width)), Image.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
pad.save(OUT, quality=88, method=6) if OUT.suffix == ".webp" else pad.save(OUT, optimize=True)
print(OUT, pad.size, OUT.stat().st_size // 1024, "KiB")
