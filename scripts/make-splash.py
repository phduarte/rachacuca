"""Gera as telas de abertura do iOS (apple-touch-startup-image, seção 9.2).

Uso: python scripts/make-splash.py  (requer Pillow; rode da raiz do repositório)

Para cada iPhone da lista, cria public/splash/iphone-<L>x<A>.png (retrato, em
pixels físicos) com a marca centrada sobre o fundo do jogo, e reescreve as
tags <link rel="apple-touch-startup-image"> no index.html, entre os
marcadores <!-- splash:start --> e <!-- splash:end -->.
"""
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "splash"
LOGO = ROOT / "public" / "brand" / "logo.webp"
INDEX = ROOT / "index.html"
BG = (0x1B, 0x1B, 0x24)  # --bg do tema padrão (src/style.css)

# (largura CSS, altura CSS, devicePixelRatio): telas de iPhone em retrato
DEVICES = [
    (440, 956, 3),  # 16/17 Pro Max
    (402, 874, 3),  # 16/17 Pro, 17
    (420, 912, 3),  # Air
    (430, 932, 3),  # 14 Pro Max, 15 Plus/Pro Max, 16 Plus
    (393, 852, 3),  # 14 Pro, 15, 15 Pro, 16, 16e
    (428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (390, 844, 3),  # 12, 12 Pro, 13, 13 Pro, 14
    (375, 812, 3),  # X, XS, 11 Pro, 12/13 mini
    (414, 896, 3),  # XS Max, 11 Pro Max
    (414, 896, 2),  # XR, 11
    (414, 736, 3),  # 6/7/8 Plus
    (375, 667, 2),  # 6/7/8, SE 2ª e 3ª ger.
    (320, 568, 2),  # SE 1ª ger.
]

OUT.mkdir(parents=True, exist_ok=True)
logo = Image.open(LOGO).convert("RGBA")
tags = []
for w, h, dpr in DEVICES:
    pw, ph = w * dpr, h * dpr
    im = Image.new("RGB", (pw, ph), BG)
    lw = round(pw * 0.55)
    lh = round(logo.height * lw / logo.width)
    mark = logo.resize((lw, lh), Image.LANCZOS)
    im.paste(mark, ((pw - lw) // 2, (ph - lh) // 2 - ph // 20), mark)
    name = f"iphone-{pw}x{ph}.png"
    im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(OUT / name, optimize=True)
    media = (
        f"(device-width: {w}px) and (device-height: {h}px) and "
        f"(-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)"
    )
    tags.append(f'    <link rel="apple-touch-startup-image" media="{media}" href="%BASE_URL%splash/{name}" />')

html = INDEX.read_text(encoding="utf-8")
block = "<!-- splash:start -->\n" + "\n".join(tags) + "\n    <!-- splash:end -->"
html, n = re.subn(r"<!-- splash:start -->.*?<!-- splash:end -->", lambda _: block, html, flags=re.S)
if n != 1:
    raise SystemExit("index.html sem os marcadores <!-- splash:start --> / <!-- splash:end -->")
INDEX.write_text(html, encoding="utf-8", newline="\n")
print(f"ok: {len(DEVICES)} telas")
