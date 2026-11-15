"""Gera as 12 imagens originais do jogo (seção 4.1): pixel art 512 × 512, PNG indexado.

Uso: python scripts/make-originals.py  (requer Pillow; rode da raiz do repositório)

Cada cena é desenhada numa grade de 128 × 128 e ampliada 4× sem suavização.
São arte original que evoca gêneros da época, sem copiar personagens,
cenários ou logotipos de jogos existentes. Formas grandes e contraste alto,
para continuar legível cortada em 6 × 6.
"""
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "images" / "originals"
G = 128  # grade
SCALE = 4


def new(bg):
    im = Image.new("RGB", (G, G), bg)
    return im, ImageDraw.Draw(im)


def rect(d, x, y, w, h, c):
    if w > 0 and h > 0:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=c)


def disc(d, cx, cy, r, c):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)


def sprite(d, x, y, rows, colors, scale=1):
    """Desenha um sprite de texto: cada caractere é uma cor do dicionário ('.' = vazio)."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            c = colors.get(ch)
            if c:
                rect(d, x + i * scale, y + j * scale, scale, scale, c)


def bands(d, colors, y0=0, y1=G):
    """Céu em faixas horizontais iguais."""
    h = (y1 - y0) / len(colors)
    for i, c in enumerate(colors):
        rect(d, 0, round(y0 + i * h), G, round(y0 + (i + 1) * h) - round(y0 + i * h), c)


def stars(d, n, seed, y1=G, colors=("#ffffff",)):
    r = random.Random(seed)
    for _ in range(n):
        d.point((r.randrange(G), r.randrange(y1)), fill=r.choice(colors))


# 1. Invasão Orbital ---------------------------------------------------------
def invasao():
    im, d = new("#05051a")
    stars(d, 90, 1, colors=("#ffffff", "#8888ff", "#ffd319"))
    # Naves alienígenas originais: disco com cúpula e três pernas
    alien = [
        "...cccc...",
        "..cwccwc..",
        ".bbbbbbbb.",
        "bbybbybbyb",
        ".b..bb..b.",
        "b...bb...b",
    ]
    rows = [("#ff2a6d", "#ffd319"), ("#05d9e8", "#ffffff"), ("#7cff4f", "#ff2a6d"), ("#ff9a3d", "#05d9e8")]
    for j, (body, light) in enumerate(rows):
        for i in range(6):
            sprite(d, 10 + i * 19, 14 + j * 14, alien, {"c": "#c2c3ff", "w": "#05051a", "b": body, "y": light}, 1)
    # Raio alienígena e tiro do canhão
    rect(d, 47, 76, 1, 10, "#ff2a6d")
    rect(d, 78, 70, 1, 8, "#ffffff")
    # Asteroides flutuando como escudo
    for x, y, r in ((22, 100, 8), (64, 96, 6), (104, 101, 9)):
        disc(d, x, y, r, "#7a6a5a")
        disc(d, x - 2, y - 2, r - 3, "#9a8a78")
        rect(d, x + 1, y + 1, 2, 2, "#4e4236")
        rect(d, x - r // 2, y + r // 3, 2, 2, "#4e4236")
    # Canhão
    cannon = ["....ww....", "...wwww...", ".gggggggg.", "gggggggggg"]
    sprite(d, 66, 114, cannon, {"w": "#ffffff", "g": "#7cff4f"}, 1)
    rect(d, 0, 120, G, 1, "#7cff4f")
    rect(d, 0, 121, G, 7, "#0b0b2a")
    return im


# 2. Labirinto Neon ----------------------------------------------------------
def labirinto():
    im, d = new("#000008")
    wall = "#d02aff"
    # Grade 8 × 8 de corredores com paredes fixas (desenho próprio)
    walls_h = [
        (0, 0, 16), (0, 15, 16),
        (2, 2, 3), (7, 2, 2), (11, 2, 3),
        (2, 5, 2), (6, 5, 4), (12, 5, 2),
        (0, 8, 3), (5, 8, 6), (13, 8, 3),
        (2, 11, 3), (7, 11, 2), (11, 11, 3),
        (4, 13, 8),
    ]
    walls_v = [
        (0, 0, 16), (15, 0, 16),
        (5, 2, 4), (10, 2, 4), (8, 5, 4),
        (3, 9, 3), (12, 9, 3), (8, 11, 3),
    ]
    u = 8  # célula
    for cx, cy, n in walls_h:
        rect(d, cx * u, cy * u + 2, n * u, 4, wall)
    for cx, cy, n in walls_v:
        rect(d, cx * u + 2, cy * u, 4, n * u, wall)
    # Contorno neon claro
    px = im.load()
    glow = [(x, y) for y in range(G) for x in range(G) if px[x, y] == (208, 42, 255)]
    for x, y in glow:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < G and 0 <= ny < G and px[nx, ny] == (0, 0, 8):
                px[nx, ny] = (240, 160, 255)
    # Bolinhas nos corredores
    for y in range(1, 16):
        for x in range(1, 16):
            cx, cy = x * u - 4 + 4, y * u - 4 + 4
            if all(px[cx + k, cy] == (0, 0, 8) for k in (-1, 0, 1)) and (x + y) % 2 == 0:
                rect(d, cx, cy, 2, 2, "#ffd6a8")
    # Herói: bolinha com antena e olhos (original)
    hero = ["...r...", "...y...", ".yyyyy.", "yykyky.", "yyyyyyy", "yyyyyyy", ".yyyyy."]
    sprite(d, 60, 51, hero, {"y": "#ffe600", "k": "#000008", "r": "#ff2a6d"}, 1)
    # Espíritos de chama (originais)
    spirit = ["..x.x..", ".xxxxx.", "xwkxwkx", "xxxxxxx", "xxxxxxx", "x.x.x.x"]
    for (x, y, c) in ((18, 26, "#7cff4f"), (100, 26, "#f7f5f0"), (20, 98, "#2a8cff"), (98, 98, "#c8ff00")):
        sprite(d, x, y, spirit, {"x": c, "w": "#ffffff", "k": "#000008"}, 1)
    # Frutinha bônus
    sprite(d, 92, 66, ["..g", ".g.", "rr.", "rrr", ".r."], {"g": "#3fae49", "r": "#ff2a2a"}, 1)
    return im


# 3. Castelo do Dragão -------------------------------------------------------
def castelo():
    im, d = new("#5fc3f5")
    bands(d, ["#3a7bd5", "#4a8ee0", "#5fa3ea", "#78b8f2", "#94cdf7"], 0, 90)
    # Nuvens em blocos
    for (x, y) in ((8, 14), (70, 8), (96, 38)):
        rect(d, x, y + 4, 26, 6, "#ffffff")
        rect(d, x + 5, y, 14, 4, "#ffffff")
        rect(d, x + 2, y + 10, 22, 2, "#d6ecff")
    # Penhasco
    d.polygon([(0, 128), (0, 92), (20, 86), (38, 90), (52, 80), (76, 82), (96, 92), (128, 88), (128, 128)], fill="#6b4a2b")
    for y in range(96, 128, 6):
        for x in range((y // 6) % 2 * 6, G, 12):
            rect(d, x, y, 7, 1, "#4e331c")
    rect(d, 0, 118, G, 10, "#3fae49")
    for x in range(0, G, 4):
        rect(d, x, 116, 2, 2, "#3fae49")
    # Castelo
    stone, dark = "#b8b8c8", "#7a7a90"
    rect(d, 40, 56, 48, 28, stone)
    for x in range(40, 88, 6):
        rect(d, x, 52, 3, 4, stone)
    for tx in (34, 80):
        rect(d, tx, 40, 14, 44, stone)
        for x in range(tx, tx + 14, 4):
            rect(d, x, 36, 2, 4, stone)
        d.polygon([(tx - 2, 36), (tx + 7, 22), (tx + 16, 36)], fill="#d9271c")
        rect(d, tx + 5, 50, 4, 6, "#1b1b24")
    # Torre central com o dragão
    rect(d, 56, 26, 16, 30, stone)
    for x in range(56, 72, 4):
        rect(d, x, 22, 2, 4, stone)
    rect(d, 59, 66, 10, 18, "#4e331c")
    d.pieslice([59, 61, 68, 71], 180, 360, fill="#4e331c")
    for y in range(60, 84, 5):
        rect(d, 40, y, 48, 1, dark)
    dragon = [
        "......gg.....",
        ".....gggg....",
        "....ggwkg....",
        "w..gggggggrr.",
        "ww.ggggg.....",
        "wwwgggggg....",
        ".wwgggggggg..",
        "...gg.gg..ggg",
        "...g...g....g",
    ]
    sprite(d, 55, 4, dragon, {"g": "#2e9e3a", "w": "#7cff4f", "k": "#000000", "r": "#ff9a3d"}, 1)
    # Bandeirinha
    rect(d, 40, 14, 1, 8, "#1b1b24")
    rect(d, 41, 14, 5, 3, "#ffd319")
    return im


# 4. Rodovia ao Pôr do Sol ---------------------------------------------------
def rodovia():
    im, d = new("#1a0533")
    bands(d, ["#1a0533", "#2e0a4f", "#4c0f6b", "#7a1478", "#b11a6e", "#e0245e", "#ff5a3d"], 0, 70)
    # Sol listrado
    for y in range(26, 71):
        half = math.sqrt(max(0, 26 ** 2 - (y - 52) ** 2))
        if y > 52 and (y - 53) % 6 < (y - 53) // 6 + 1:
            continue
        c = "#fff275" if y < 40 else "#ffd319" if y < 52 else "#ff9a3d"
        rect(d, round(64 - half), y, round(2 * half), 1, c)
    # Morros
    for x in range(G):
        h = 6 + 4 * math.sin(x / 9) + 3 * math.sin(x / 4.3)
        rect(d, x, round(70 - h), 1, round(h), "#2a0845")
    # Chão e estrada em perspectiva
    rect(d, 0, 70, G, 58, "#140326")
    for y in range(70, G):
        t = (y - 70) / 58
        half = 4 + t * 70
        rect(d, round(64 - half), y, round(2 * half), 1, "#2b2b3a")
        # Faixas laterais
        rect(d, round(64 - half), y, max(1, round(t * 6)), 1, "#ff2a6d")
        rect(d, round(64 + half - max(1, round(t * 6))), y, max(1, round(t * 6)), 1, "#ff2a6d")
        # Faixa central tracejada
        if int((1 / (t + 0.08)) * 6) % 2 == 0:
            rect(d, round(64 - max(1, t * 3)), y, max(1, round(t * 6)), 1, "#fff1e8")
    # Palmeiras
    def palm(x, base, h, flip):
        for k in range(h):
            xx = x + round(flip * (k / h) ** 2 * 6)
            rect(d, xx, base - k, 3, 1, "#1b0a1f")
        top = (x + flip * 6 + 1, base - h)
        for ang in (-150, -110, -70, -30, 10, 190):
            a = math.radians(ang)
            for t in range(16):
                px = round(top[0] + math.cos(a) * t)
                py = round(top[1] + math.sin(a) * t + t * t / 30)
                rect(d, px, py, 2, 2, "#1b0a1f")
    palm(12, 110, 46, 1)
    palm(108, 112, 40, -1)
    # Carro esportivo genérico, de costas
    car = [
        "....rrrrrrrr....",
        "...rwwwwwwwwr...",
        "..rrrrrrrrrrrr..",
        "rrrrrrrrrrrrrrrr",
        "rLLrrrrrrrrrrLLr",
        "rrrrkkkkkkkkrrrr",
        ".kk..........kk.",
    ]
    sprite(d, 48, 108, car, {"r": "#e0245e", "w": "#05d9e8", "L": "#ffd319", "k": "#000000"}, 2)
    return im


# 5. Masmorra 8 Bits ---------------------------------------------------------
def masmorra():
    im, d = new("#2b2b3a")
    # Tijolos
    for y in range(0, 100, 8):
        off = (y // 8) % 2 * 8
        for x in range(-8 + off, G, 16):
            rect(d, x + 1, y + 1, 14, 6, "#4a4a5e")
            rect(d, x + 1, y + 1, 14, 1, "#5e5e75")
    # Chão
    rect(d, 0, 100, G, 28, "#3b2a1e")
    for y in range(100, G, 7):
        rect(d, 0, y, G, 1, "#2a1d14")
    # Porta em arco
    d.pieslice([40, 30, 88, 78], 180, 360, fill="#1b1b24")
    rect(d, 40, 54, 49, 46, "#1b1b24")
    d.pieslice([44, 34, 84, 74], 180, 360, fill="#6b4220")
    rect(d, 44, 54, 41, 46, "#6b4220")
    for x in range(48, 84, 8):
        rect(d, x, 40 if 52 < x < 76 else 46, 1, 60, "#4e2f16")
    rect(d, 44, 60, 41, 3, "#7a7a90")
    rect(d, 44, 84, 41, 3, "#7a7a90")
    disc(d, 78, 74, 2, "#ffd319")
    # Tochas
    for tx in (18, 104):
        rect(d, tx, 46, 6, 3, "#7a7a90")
        rect(d, tx + 2, 49, 2, 10, "#6b4220")
        d.polygon([(tx - 1, 46), (tx + 3, 30), (tx + 7, 46)], fill="#ff9a3d")
        d.polygon([(tx + 1, 46), (tx + 3, 36), (tx + 5, 46)], fill="#fff275")
        for r, c in ((18, (255, 160, 60)),):
            pass
    # Herói com espada (original: elmo com pluma, escudo redondo)
    hero = [
        "......r.....",
        ".....rr.....",
        "....ssss....",
        "....sKKs....",
        "....ssss....",
        "..bbbbbbbb..",
        ".obbbbbbbbw.",
        "ooobbbbbb.w.",
        "ooobbbbbb.w.",
        ".o.bbbbbb.h.",
        "...bb..bb...",
        "...bb..bb...",
        "..kkk..kkk..",
    ]
    sprite(d, 48, 72, hero, {"r": "#ff2a2a", "s": "#c2c3c7", "K": "#1b1b24", "b": "#2a5cff", "o": "#ffd319", "w": "#ffffff", "h": "#6b4220", "k": "#3b2a1e"}, 2)
    return im


# 6. Blocos em Queda ---------------------------------------------------------
def blocos():
    im, d = new("#0b0b2a")
    # Poço de 12 colunas (peças de 3 e de 5 blocos, não as de 4)
    cell = 8
    x0, y0, cols, rows = 16, 8, 12, 14
    rect(d, x0 - 4, y0, 4, rows * cell + 4, "#7a7a90")
    rect(d, x0 + cols * cell, y0, 4, rows * cell + 4, "#7a7a90")
    rect(d, x0 - 4, y0 + rows * cell, cols * cell + 8, 4, "#7a7a90")
    rect(d, x0, y0, cols * cell, rows * cell, "#141432")
    for c in range(1, cols):
        rect(d, x0 + c * cell, y0, 1, rows * cell, "#1c1c44")
    colors = {
        "r": ("#ff3b3b", "#ff9a9a", "#a01818"),
        "y": ("#ffd319", "#fff59a", "#b08a00"),
        "g": ("#3fd14a", "#a6ff9a", "#1e7a26"),
        "b": ("#2a8cff", "#9ac8ff", "#1450a0"),
        "p": ("#c14aff", "#e6a6ff", "#6e1aa0"),
        "o": ("#ff8a1e", "#ffc48a", "#a04e00"),
    }

    def block(c, r, k):
        x, y = x0 + c * cell, y0 + r * cell
        face, hi, lo = colors[k]
        rect(d, x, y, cell, cell, lo)
        rect(d, x, y, cell - 1, cell - 1, hi)
        rect(d, x + 1, y + 1, cell - 2, cell - 2, face)
        rect(d, x + 2, y + 2, 2, 2, hi)

    stack = [
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        "p...........",
        "pp.....y....",
        "pbb...yyy..o",
        "rbbgg.rrooo.",
        "rrbggprroooy",
        "rgggpppbbyyy",
    ]
    for r, row in enumerate(stack):
        for c, k in enumerate(row):
            if k != ".":
                block(c, r, k)
    # Peça caindo: pentaminó em "P" e um triminó em "L"
    for c, r in ((6, 3), (7, 3), (6, 4), (7, 4), (6, 5)):
        block(c, r, "g")
    for c, r in ((2, 1), (2, 2), (3, 2)):
        block(c, r, "o")
    # Painel de próxima peça
    rect(d, 116, 10, 10, 30, "#141432")
    for c, r in ((0, 0), (0, 1), (0, 2)):
        rect(d, 118 + c * 3, 14 + r * 7, 6, 6, "#c14aff")
    return im


# 7. Rua dos Lutadores -------------------------------------------------------
def lutadores():
    im, d = new("#140326")
    # Prédios
    for x, w, h, c in ((0, 30, 70, "#2a0845"), (28, 26, 84, "#331056"), (52, 34, 64, "#2a0845"), (84, 22, 90, "#3b1263"), (104, 24, 74, "#2a0845")):
        rect(d, x, 92 - h, w, h, c)
        for wy in range(92 - h + 6, 88, 9):
            for wx in range(x + 4, x + w - 4, 7):
                if (wx * 7 + wy * 3) % 5 != 0:
                    rect(d, wx, wy, 3, 4, "#ffd319" if (wx + wy) % 3 else "#05d9e8")
    # Letreiro de neon "LUTA"
    rect(d, 56, 34, 28, 12, "#1b0a1f")
    font = {
        "L": ["x..", "x..", "x..", "xxx"],
        "U": ["x.x", "x.x", "x.x", "xxx"],
        "T": ["xxx", ".x.", ".x.", ".x."],
        "A": ["xxx", "x.x", "xxx", "x.x"],
    }
    for i, ch in enumerate("LUTA"):
        sprite(d, 59 + i * 6, 38, font[ch], {"x": "#ff2a6d"}, 1)
    # Chão
    rect(d, 0, 92, G, 36, "#3a3a4a")
    for y in (100, 110, 122):
        rect(d, 0, y, G, 1, "#2a2a38")
    rect(d, 0, 92, G, 2, "#ff2a6d")
    # Dois lutadores originais em guarda
    left = [
        "....hhh.....",
        "...hssss....",
        "...ssKss....",
        "....sss.....",
        "..wwwwwwss..",
        ".ssw.www.ss.",
        ".ss.wwww....",
        "....rrrr....",
        "....wwww....",
        "...ww..ww...",
        "..ww....ww..",
        "..ww....ww..",
        ".kkk....kkk.",
    ]
    right = [
        ".....bbb....",
        "....bssss...",
        "....ssKss...",
        ".....sss....",
        "..ssgggggg..",
        ".ss.ggg.gss.",
        "....gggg.ss.",
        "....kkkk....",
        "....gggg....",
        "...gg..gg...",
        "..gg....gg..",
        "..gg....gg..",
        ".www....www.",
    ]
    sprite(d, 22, 66, left, {"h": "#1b1b24", "s": "#e0a070", "K": "#1b1b24", "w": "#ffffff", "r": "#d9271c", "k": "#1b1b24"}, 2)
    sprite(d, 78, 66, right, {"b": "#ffd319", "s": "#c68a5a", "K": "#1b1b24", "g": "#2e9e3a", "k": "#1b1b24", "w": "#ffffff"}, 2)
    # Barras de energia
    rect(d, 6, 6, 50, 6, "#1b0a1f")
    rect(d, 7, 7, 40, 4, "#ffd319")
    rect(d, 72, 6, 50, 6, "#1b0a1f")
    rect(d, 81, 7, 40, 4, "#ffd319")
    return im


# 8. Floresta Encantada ------------------------------------------------------
def floresta():
    im, d = new("#1f5f3a")
    bands(d, ["#a6e3ff", "#8fd3f7", "#79c2ee"], 0, 40)
    # Árvores ao fundo
    for x in range(-6, G, 18):
        disc(d, x + 9, 34, 14, "#1e6b34")
        disc(d, x + 4, 26, 9, "#2a8a44")
    # Cachoeira
    rect(d, 84, 8, 22, 70, "#b8eaff")
    for y in range(8, 78, 3):
        rect(d, 86 + (y * 5) % 16, y, 3, 2, "#ffffff")
    d.polygon([(78, 8), (84, 8), (84, 78), (76, 78)], fill="#7a6a5a")
    d.polygon([(106, 8), (114, 8), (118, 78), (106, 78)], fill="#7a6a5a")
    # Lago
    d.ellipse([60, 70, 128, 96], fill="#3a9ad9")
    for x in range(66, 124, 9):
        rect(d, x, 80 + (x % 3) * 3, 5, 1, "#b8eaff")
    # Grama
    rect(d, 0, 92, G, 36, "#3fae49")
    d.polygon([(0, 70), (60, 74), (64, 92), (0, 92)], fill="#3fae49")
    for x in range(0, G, 3):
        rect(d, x, 92 + (x * 7) % 30, 1, 2, "#2e8a38")
    # Cogumelos
    for (x, y, s) in ((10, 94, 3), (26, 100, 2), (44, 88, 2)):
        rect(d, x + 2 * s, y, 2 * s, 4 * s, "#f7f5f0")
        d.pieslice([x, y - 4 * s, x + 6 * s, y + 2 * s], 180, 360, fill="#e0245e")
        rect(d, x + s, y - 2 * s, s, s, "#ffffff")
        rect(d, x + 4 * s, y - 3 * s, s, s, "#ffffff")
    # Baú
    rect(d, 52, 104, 26, 16, "#8a5a2b")
    rect(d, 52, 100, 26, 6, "#a8703a")
    rect(d, 52, 106, 26, 2, "#ffd319")
    rect(d, 63, 104, 4, 6, "#ffd319")
    rect(d, 52, 100, 2, 20, "#ffd319")
    rect(d, 76, 100, 2, 20, "#ffd319")
    # Vagalumes
    for (x, y) in ((20, 60), (40, 50), (34, 76), (70, 56)):
        rect(d, x, y, 2, 2, "#fff275")
    return im


# 9. Ninja do Telhado --------------------------------------------------------
def ninja():
    im, d = new("#0b0b2a")
    bands(d, ["#0b0b2a", "#141440", "#1d1d56", "#2a2a6b"], 0, 128)
    stars(d, 40, 9, y1=70)
    # Lua cheia
    disc(d, 76, 44, 30, "#fff5c8")
    for (x, y, r) in ((66, 36, 5), (88, 52, 4), (78, 62, 3)):
        disc(d, x, y, r, "#f0e3a0")
    # Telhados
    roof = "#1b0a1f"
    d.polygon([(0, 96), (34, 84), (68, 96)], fill=roof)
    rect(d, 0, 96, 70, 32, roof)
    d.polygon([(56, 104), (96, 90), (128, 100), (128, 128), (56, 128)], fill="#140818")
    for x in range(0, 70, 6):
        rect(d, x, 98, 4, 1, "#3b1a40")
    # Beirais curvos
    d.polygon([(0, 96), (-2, 92), (4, 95)], fill=roof)
    d.polygon([(68, 96), (72, 92), (64, 95)], fill=roof)
    # Ninja em silhueta sobre a lua
    ninja = [
        ".....kkk......",
        "....kkkkk.....",
        "....kwwkk..r..",
        "....kkkkk.rr..",
        "..kkkkkkkkr...",
        ".kk.kkkkk.....",
        "kk..kkkkk.....",
        "....kkkkk.....",
        "....kk.kk.....",
        "...kk...kk....",
        "..kk.....kk...",
        ".kk.......k...",
    ]
    sprite(d, 56, 54, ninja, {"k": "#05050f", "w": "#ffffff", "r": "#d9271c"}, 2)
    # Espada nas costas
    d.line([(60, 56), (80, 46)], fill="#c2c3c7")
    return im


# 10. Kart na Pista ----------------------------------------------------------
def kart():
    im, d = new("#3fae49")
    for y in range(0, G, 8):
        for x in range((y // 8) % 2 * 8, G, 16):
            rect(d, x, y, 8, 8, "#38a042")
    # Pista oval vista de cima
    d.rounded_rectangle([10, 14, 118, 114], radius=40, fill="#5a5a6a")
    d.rounded_rectangle([34, 38, 94, 90], radius=20, fill="#3fae49")
    # Zebras nas curvas
    for k in range(0, 360, 12):
        a = math.radians(k)
        for (cx, cy) in ((50, 54), (78, 54), (50, 74), (78, 74)):
            pass
    def curb(box):
        x0, y0, x1, y1 = box
        for i in range(0, 200):
            t = i / 200 * 2 * math.pi
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
            x = cx + math.cos(t) * rx
            y = cy + math.sin(t) * ry
            c = "#ffffff" if (i // 8) % 2 else "#d9271c"
            rect(d, round(x) - 1, round(y) - 1, 3, 3, c)
    curb([10, 14, 118, 114])
    curb([34, 38, 94, 90])
    d.rounded_rectangle([34, 38, 94, 90], radius=20, fill="#3fae49")
    d.rounded_rectangle([12, 16, 116, 112], radius=38, outline="#d9271c")
    # Linha de chegada quadriculada
    for j in range(0, 22, 2):
        for i in range(2):
            rect(d, 62 + i * 2, 92 + j, 2, 2, "#ffffff" if (i + j // 2) % 2 else "#000000")
    # Árvores e arquibancada no centro
    for (x, y) in ((50, 50), (62, 56), (74, 50), (56, 70), (70, 72)):
        disc(d, x, y, 5, "#1e6b34")
        disc(d, x - 1, y - 1, 3, "#2e9e3a")
    # Karts (vista de cima)
    kart_s = ["k..k", "cccc", "cwwc", "cccc", "k..k"]
    for (x, y, c) in ((40, 98, "#ffd319"), (24, 60, "#2a8cff"), (100, 40, "#ff2a6d"), (86, 100, "#c14aff")):
        sprite(d, x, y, kart_s, {"k": "#1b1b24", "c": c, "w": "#ffffff"}, 2)
    return im


# 11. Fliperama --------------------------------------------------------------
def fliperama():
    im, d = new("#1a0533")
    # Parede com faixa neon
    rect(d, 0, 0, G, 80, "#24073f")
    rect(d, 0, 10, G, 2, "#ff2a6d")
    rect(d, 0, 14, G, 1, "#05d9e8")
    # Piso quadriculado
    for y in range(80, G, 8):
        for x in range((y // 8) % 2 * 8, G, 16):
            rect(d, x, y, 8, 8, "#2b2b3a")
    rect(d, 0, 80, G, 1, "#05d9e8")
    for y in range(80, G, 8):
        for x in range(((y // 8) + 1) % 2 * 8, G, 16):
            rect(d, x, y, 8, 8, "#e8e8f0")
    # Gabinetes
    screens = ["#05d9e8", "#7cff4f", "#ff2a6d", "#ffd319"]
    tops = ["#d9271c", "#2a5cff", "#ffd319", "#2e9e3a"]
    for i in range(4):
        x = 6 + i * 30
        rect(d, x, 24, 26, 80, "#1b1b24")
        rect(d, x + 2, 24, 22, 8, tops[i])
        rect(d, x + 4, 26, 18, 4, "#fff1e8")
        rect(d, x + 3, 36, 20, 18, "#05050f")
        rect(d, x + 5, 38, 16, 14, screens[i])
        # "Jogo" na tela: blocos simples
        for k in range(3):
            rect(d, x + 7 + k * 5, 41 + (k + i) % 3 * 3, 3, 3, "#05050f")
        d.polygon([(x, 56), (x + 26, 56), (x + 30, 66), (x - 4, 66)], fill="#3b3b4e")
        disc(d, x + 7, 60, 2, "#ff2a2a")
        rect(d, x + 6, 58, 2, 2, "#1b1b24")
        disc(d, x + 15, 61, 1, "#ffd319")
        disc(d, x + 20, 61, 1, "#05d9e8")
        rect(d, x + 2, 66, 22, 38, "#2a2a3a")
        rect(d, x + 10, 76, 6, 4, "#ffd319")
    return im


# 12. Quarto dos Anos 90 -----------------------------------------------------
def quarto():
    im, d = new("#5a8fd6")
    # Parede listrada
    for x in range(0, G, 8):
        rect(d, x, 0, 4, 84, "#6a9fe0")
    # Janela com noite
    rect(d, 8, 8, 32, 26, "#f7f5f0")
    rect(d, 10, 10, 28, 22, "#1d2b53")
    rect(d, 23, 10, 2, 22, "#f7f5f0")
    disc(d, 32, 16, 3, "#fff5c8")
    stars(d, 0, 0)
    for (x, y) in ((13, 13), (18, 22), (28, 27), (14, 28)):
        rect(d, x, y, 1, 1, "#ffffff")
    # Pôster genérico
    rect(d, 92, 8, 26, 34, "#ffd319")
    rect(d, 94, 10, 22, 30, "#ff2a6d")
    d.polygon([(105, 14), (112, 30), (98, 30)], fill="#ffd319")
    rect(d, 96, 33, 18, 2, "#fff1e8")
    # Piso de madeira
    rect(d, 0, 84, G, 44, "#a8703a")
    for y in range(86, G, 6):
        rect(d, 0, y, G, 1, "#8a5a2b")
        for x in range((y * 7) % 23, G, 23):
            rect(d, x, y - 5, 1, 5, "#8a5a2b")
    # Rack e TV de tubo
    rect(d, 36, 72, 56, 14, "#6b4220")
    rect(d, 36, 72, 56, 2, "#8a5a2b")
    rect(d, 40, 30, 48, 42, "#3b3b4e")
    rect(d, 42, 32, 44, 38, "#2b2b3a")
    rect(d, 46, 36, 30, 30, "#05d9e8")
    # Cena na TV: chão e um personagem genérico
    rect(d, 46, 58, 30, 8, "#3fae49")
    sprite(d, 56, 48, [".rr.", "rssr", ".bb.", "b..b"], {"r": "#d9271c", "s": "#ffd6a8", "b": "#2a5cff"}, 2)
    for k in range(3):
        disc(d, 81, 40 + k * 6, 1, "#7a7a90")
    rect(d, 60, 22, 1, 8, "#1b1b24")
    rect(d, 70, 22, 1, 8, "#1b1b24")
    d.line([(60, 22), (54, 14)], fill="#1b1b24")
    d.line([(70, 22), (76, 14)], fill="#1b1b24")
    # Console genérico, controle e cartuchos sem marca
    rect(d, 46, 88, 30, 10, "#c2c3c7")
    rect(d, 46, 88, 30, 2, "#e4e4ea")
    rect(d, 52, 84, 16, 5, "#7a7a90")
    rect(d, 66, 92, 6, 2, "#d9271c")
    d.line([(60, 98), (60, 106), (40, 110)], fill="#1b1b24")
    rect(d, 28, 106, 16, 8, "#4a4a5e")
    rect(d, 30, 109, 3, 3, "#1b1b24")
    disc(d, 39, 109, 1, "#d9271c")
    disc(d, 41, 111, 1, "#ffd319")
    for i, c in enumerate(("#2e9e3a", "#d9271c", "#2a5cff", "#ffd319")):
        rect(d, 88 + i * 9, 100 - (i % 2) * 2, 8, 12, "#4a4a5e")
        rect(d, 89 + i * 9, 102 - (i % 2) * 2, 6, 6, c)
    # Fitas
    for i in range(3):
        rect(d, 8 + i * 4, 98 - i * 5, 22, 5, "#1b1b24")
        rect(d, 12 + i * 4, 99 - i * 5, 14, 3, "#f7f5f0")
    return im


SCENES = [
    ("01-invasao-orbital", invasao),
    ("02-labirinto-neon", labirinto),
    ("03-castelo-do-dragao", castelo),
    ("04-rodovia-ao-por-do-sol", rodovia),
    ("05-masmorra-8-bits", masmorra),
    ("06-blocos-em-queda", blocos),
    ("07-rua-dos-lutadores", lutadores),
    ("08-floresta-encantada", floresta),
    ("09-ninja-do-telhado", ninja),
    ("10-kart-na-pista", kart),
    ("11-fliperama", fliperama),
    ("12-quarto-dos-anos-90", quarto),
]

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (4 * G * 2, 3 * G * 2))
    for i, (name, fn) in enumerate(SCENES):
        im = fn()
        big = im.resize((G * SCALE, G * SCALE), Image.NEAREST)
        # PNG indexado: as cenas têm poucas cores, a paleta adaptativa é exata.
        big.convert("P", palette=Image.ADAPTIVE, colors=64).save(OUT / f"{name}.png", optimize=True)
        sheet.paste(im.resize((G * 2, G * 2), Image.NEAREST), ((i % 4) * G * 2, (i // 4) * G * 2))
    import sys
    if len(sys.argv) > 1:
        sheet.save(sys.argv[1])
    print(f"ok: {len(SCENES)} imagens")
