"""Gera os ícones do PWA em pixel art (tema padrão: moldura vermelha, peças brancas).

Uso: python scripts/make-icons.py public/icons prévia.png  (requer Pillow)
"""
import sys
from pathlib import Path
from PIL import Image

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

BG = (0x1B, 0x1B, 0x24, 255)
BEZEL = (0xD9, 0x27, 0x1C, 255)
BEZEL_HI = (0xF0, 0x55, 0x45, 255)
BEZEL_LO = (0x9E, 0x18, 0x10, 255)
FRAME = (0xB5, 0x1D, 0x14, 255)
FRAME_SHADOW = (0x7E, 0x12, 0x0C, 255)
FACE = (0xF7, 0xF5, 0xF0, 255)
EDGE_LIGHT = (0xFF, 0xFF, 0xFF, 255)
EDGE_DARK = (0xCD, 0xC8, 0xBD, 255)
TEXT = (0x14, 0x14, 0x14, 255)
CLEAR = (0, 0, 0, 0)

# Dígitos 3x5
DIGITS = {
    1: ["010", "110", "010", "010", "111"],
    2: ["111", "001", "111", "100", "111"],
    3: ["111", "001", "011", "001", "111"],
    4: ["101", "101", "111", "001", "001"],
    5: ["111", "100", "111", "001", "111"],
    6: ["111", "100", "111", "101", "111"],
    7: ["111", "001", "010", "010", "010"],
    8: ["111", "101", "111", "101", "111"],
}

TILE, GAP, MARGIN = 8, 1, 1
BOARD = MARGIN * 2 + TILE * 3 + GAP * 2  # 28


def board() -> Image.Image:
    """Tabuleiro 3x3 resolvido (28x28 px), casa vazia no canto inferior direito."""
    im = Image.new("RGBA", (BOARD, BOARD), FRAME)
    px = im.load()
    for i in range(9):
        r, c = divmod(i, 3)
        x0 = MARGIN + c * (TILE + GAP)
        y0 = MARGIN + r * (TILE + GAP)
        if i == 8:  # casa vazia: sombra interna em cima/esquerda
            for k in range(TILE):
                px[x0 + k, y0] = FRAME_SHADOW
                px[x0, y0 + k] = FRAME_SHADOW
            continue
        for y in range(TILE):
            for x in range(TILE):
                if y == TILE - 1 or x == TILE - 1:
                    col = EDGE_DARK
                elif y == 0 or x == 0:
                    col = EDGE_LIGHT
                else:
                    col = FACE
                px[x0 + x, y0 + y] = col
        for dy, row in enumerate(DIGITS[i + 1]):
            for dx, bit in enumerate(row):
                if bit == "1":
                    px[x0 + 2 + dx, y0 + 1 + dy] = TEXT
    return im


def framed(size: int, radius: int, bezel: int, fill_outside) -> Image.Image:
    """Aro de plástico com chanfro, cantos arredondados em degraus, tabuleiro no centro."""
    im = Image.new("RGBA", (size, size), fill_outside)
    px = im.load()

    def inside(x, y):
        # canto arredondado em pixel: distância ao centro do arco
        cx = min(max(x, radius), size - 1 - radius)
        cy = min(max(y, radius), size - 1 - radius)
        return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + radius * 0.6

    for y in range(size):
        for x in range(size):
            if not inside(x, y):
                continue
            col = BEZEL
            if not inside(x - 1, y - 1):
                col = BEZEL_HI
            elif not inside(x + 1, y + 1):
                col = BEZEL_LO
            px[x, y] = col
    off = (size - BOARD) // 2
    im.alpha_composite(board(), (off, off))
    return im


def up(im: Image.Image, scale: int) -> Image.Image:
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


# "any": aro arredondado com fundo transparente (32 px de grade)
base = framed(32, 4, 2, CLEAR)
up(base, 6).save(OUT / "icon-192.png", optimize=True)
up(base, 16).save(OUT / "icon-512.png", optimize=True)

# maskable: fundo vermelho pleno; tabuleiro dentro da zona segura (círculo de 80%)
mask = Image.new("RGBA", (512, 512), BEZEL)
b = up(board(), 10)  # 280 px, diagonal 396 < 409
# borda escura de 1 px (escala 10) em volta do tabuleiro, como o recorte do aro
rim = Image.new("RGBA", (300, 300), BEZEL_LO)
mask.alpha_composite(rim, (106, 106))
mask.alpha_composite(b, (116, 116))
mask.convert("RGB").save(OUT / "maskable-512.png", optimize=True)

# Apple: opaco (iOS arredonda os cantos sozinho)
apple = Image.new("RGBA", (180, 180), BEZEL)
apple.alpha_composite(Image.new("RGBA", (150, 150), BEZEL_LO), (15, 15))
apple.alpha_composite(up(board(), 5), (20, 20))
apple.convert("RGB").save(OUT / "apple-touch-icon-180.png", optimize=True)

# prévia lado a lado para conferência
prev = Image.new("RGBA", (512 * 2 + 192 + 180 + 60, 532), BG)
x = 10
for name in ["icon-512.png", "maskable-512.png", "icon-192.png", "apple-touch-icon-180.png"]:
    ic = Image.open(OUT / name).convert("RGBA")
    prev.alpha_composite(ic, (x, 10))
    x += ic.width + 10
prev.save(Path(sys.argv[2]))
print("ok")
