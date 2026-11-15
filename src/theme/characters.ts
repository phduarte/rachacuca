/**
 * Personagens originais no estilo dos desenhos animados dos anos 70:
 * contorno grosso e escuro, cores quentes (mostarda, laranja, marrom,
 * verde-oliva) e fundos de faixas e raios de sol. Nenhum copia personagem
 * existente (seção 4.1).
 *
 * Cada imagem tem três camadas: fundo, figura (que recebe o contorno
 * automático por fora) e detalhes (olhos, boca etc., desenhados por cima).
 */
import type { BuiltinImage } from './images';

const N = 64;
const INK = '#2b1608';

type Px = (x: number, y: number, color: string) => void;

interface Fig {
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void;
  rect(x: number, y: number, w: number, h: number, color: string): void;
  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, color: string): void;
  line(x0: number, y0: number, x1: number, y1: number, color: string, thick?: number): void;
}

function shapes(set: (x: number, y: number, c: string) => void): Fig {
  const f: Fig = {
    ellipse(cx, cy, rx, ry, color) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, color);
    },
    rect(x, y, w, h, color) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, color);
    },
    tri(ax, ay, bx, by, cx, cy, color) {
      const s = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
        (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
      for (let y = Math.min(ay, by, cy); y <= Math.max(ay, by, cy); y++)
        for (let x = Math.min(ax, bx, cx); x <= Math.max(ax, bx, cx); x++) {
          const d1 = s(x, y, ax, ay, bx, by);
          const d2 = s(x, y, bx, by, cx, cy);
          const d3 = s(x, y, cx, cy, ax, ay);
          if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, color);
        }
    },
    line(x0, y0, x1, y1, color, thick = 1) {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= steps; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / steps);
        const y = Math.round(y0 + ((y1 - y0) * k) / steps);
        f.rect(x, y, thick, thick, color);
      }
    },
  };
  return f;
}

/** Junta fundo, figura com contorno e detalhes. */
function compose(px: Px, bg: (f: Fig, px: Px) => void, figure: (f: Fig) => void, details: (f: Fig) => void): void {
  bg(shapes(px), px);
  const buf: Array<string | null> = new Array(N * N).fill(null);
  figure(
    shapes((x, y, c) => {
      if (x >= 0 && y >= 0 && x < N && y < N) buf[y * N + x] = c;
    }),
  );
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = buf[y * N + x];
      if (c) {
        px(x, y, c);
        continue;
      }
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx!;
        const ny = y + dy!;
        return nx >= 0 && ny >= 0 && nx < N && ny < N && buf[ny * N + nx];
      });
      if (near) px(x, y, INK);
    }
  details(shapes(px));
}

/** Faixas horizontais com cantos arredondados, típicas da década. */
function stripes(f: Fig, colors: string[]): void {
  const h = Math.ceil(N / colors.length);
  colors.forEach((c, i) => f.rect(0, i * h, N, h, c));
}

/** Raios de sol a partir de um ponto, alternando duas cores. */
function sunburst(px: Px, cx: number, cy: number, a: string, b: string, rays = 16): void {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const ang = Math.atan2(y - cy, x - cx) + Math.PI;
      px(x, y, Math.floor((ang / (2 * Math.PI)) * rays) % 2 ? a : b);
    }
}

function eye(f: Fig, x: number, y: number, r: number, lookX = 0, lookY = 0): void {
  f.ellipse(x, y, r, r, '#ffffff');
  f.ellipse(x + lookX, y + lookY, Math.max(1, r * 0.45), Math.max(1, r * 0.45), INK);
  f.rect(Math.round(x + lookX - 1), Math.round(y + lookY - 1), 1, 1, '#ffffff');
}

export const CHARACTERS: BuiltinImage[] = [
  {
    id: 'owl',
    name: 'CORUJA SABIDA',
    draw(px) {
      compose(
        px,
        (f) => {
          stripes(f, ['#f2c14e', '#f2c14e', '#f08a24', '#d9541e', '#8f3b1b', '#5a2a12', '#5a2a12', '#5a2a12']);
          // Lua cheia atrás
          f.ellipse(48, 14, 9, 9, '#fff3c4');
        },
        (f) => {
          // Galho
          f.rect(0, 53, N, 5, '#7a4a22');
          f.ellipse(56, 52, 5, 3, '#6b8e23');
          // Corpo, orelhas e barriga
          f.tri(19, 22, 23, 9, 28, 20, '#a0612e');
          f.tri(36, 20, 41, 9, 45, 22, '#a0612e');
          f.ellipse(32, 36, 15, 18, '#a0612e');
          f.ellipse(32, 42, 10, 11, '#f2d9a0');
          // Asas
          f.ellipse(17, 40, 4, 10, '#7a4a22');
          f.ellipse(47, 40, 4, 10, '#7a4a22');
          // Livro na asa
          f.rect(40, 44, 12, 8, '#c0392b');
          // Pés
          f.rect(25, 52, 5, 3, '#f08a24');
          f.rect(34, 52, 5, 3, '#f08a24');
        },
        (f) => {
          // Penas da barriga em "v"
          for (const [x, y] of [[28, 37], [34, 37], [31, 41], [27, 45], [35, 45], [31, 49]]) {
            f.rect(x!, y!, 1, 1, '#c99a5b');
            f.rect(x! + 1, y! + 1, 1, 1, '#c99a5b');
            f.rect(x! + 2, y!, 1, 1, '#c99a5b');
          }
          // Disco facial e óculos redondos
          f.ellipse(26, 28, 6, 6, '#f2d9a0');
          f.ellipse(38, 28, 6, 6, '#f2d9a0');
          eye(f, 26, 28, 4, 1, 1);
          eye(f, 38, 28, 4, -1, 1);
          for (let t = 0; t < 360; t += 8) {
            const a = (t * Math.PI) / 180;
            f.rect(Math.round(26 + Math.cos(a) * 5.5), Math.round(28 + Math.sin(a) * 5.5), 1, 1, INK);
            f.rect(Math.round(38 + Math.cos(a) * 5.5), Math.round(28 + Math.sin(a) * 5.5), 1, 1, INK);
          }
          f.rect(31, 27, 2, 1, INK);
          // Bico
          f.tri(30, 33, 34, 33, 32, 37, '#f08a24');
          // Páginas do livro
          f.rect(41, 45, 10, 1, '#fff3c4');
          f.rect(45, 44, 1, 8, INK);
        },
      );
    },
  },
  {
    id: 'turtle',
    name: 'TARTARUGA DE PATINS',
    draw(px) {
      compose(
        px,
        (f, p) => {
          sunburst(p, 32, 30, '#f2c14e', '#f08a24', 18);
          // Pista de dança xadrez
          for (let y = 50; y < N; y++)
            for (let x = 0; x < N; x++) p(x, y, (Math.floor(x / 6) + Math.floor((y - 50) / 4)) % 2 ? '#8e3b8f' : '#e05a9a');
          f.rect(0, 50, N, 1, '#5a1f5c');
        },
        (f) => {
          // Pernas
          f.rect(18, 40, 6, 8, '#9acd32');
          f.rect(36, 40, 6, 8, '#9acd32');
          // Patins: bota vermelha e rodas
          f.rect(15, 46, 11, 5, '#d9271c');
          f.rect(33, 46, 11, 5, '#d9271c');
          f.ellipse(17, 53, 2, 2, '#fff3c4');
          f.ellipse(24, 53, 2, 2, '#fff3c4');
          f.ellipse(35, 53, 2, 2, '#fff3c4');
          f.ellipse(42, 53, 2, 2, '#fff3c4');
          // Cauda, casco e borda do casco
          f.tri(8, 38, 13, 36, 13, 41, '#9acd32');
          f.ellipse(29, 38, 18, 5, '#e0a82e');
          f.ellipse(29, 31, 16, 11, '#557a1f');
          f.rect(11, 31, 37, 7, '#557a1f');
          f.rect(11, 37, 37, 3, '#e0a82e');
          // Pescoço e cabeça
          f.rect(44, 26, 6, 9, '#9acd32');
          f.ellipse(50, 22, 8, 7, '#9acd32');
        },
        (f) => {
          // Desenho do casco
          for (const [x, y] of [[20, 28], [29, 24], [38, 28], [24, 34], [34, 34]]) {
            f.ellipse(x!, y!, 3, 2.5, '#3e5a16');
            f.ellipse(x!, y!, 1.6, 1.2, '#7aa52e');
          }
          // Faixa na testa (anos 70!)
          f.rect(43, 17, 15, 2, '#d9271c');
          f.rect(42, 19, 2, 3, '#d9271c');
          eye(f, 52, 22, 2.6, 1, 0);
          // Sorriso e bochecha
          f.line(49, 27, 52, 28, INK);
          f.line(52, 28, 55, 26, INK);
          f.rect(55, 24, 2, 1, '#f08a24');
          // Cadarços
          f.rect(17, 47, 6, 1, '#fff3c4');
          f.rect(35, 47, 6, 1, '#fff3c4');
          // Riscos de velocidade
          for (const y of [20, 26, 32]) f.rect(1, y, 5, 1, '#fff3c4');
        },
      );
    },
  },
  {
    id: 'frog',
    name: 'SAPO VIOLEIRO',
    draw(px) {
      compose(
        px,
        (f) => {
          stripes(f, ['#2f8f8a', '#3aa6a0', '#7cc4a4', '#f2c14e', '#f08a24', '#2f6f8a', '#245a73', '#1d4a60']);
          // Sol se pondo
          f.ellipse(12, 30, 7, 7, '#fff3c4');
        },
        (f) => {
          // Vitória-régia
          f.ellipse(30, 56, 22, 5, '#6b8e23');
          // Corpo e pernas
          f.ellipse(20, 52, 7, 4, '#5fa83a');
          f.ellipse(40, 52, 7, 4, '#5fa83a');
          f.ellipse(30, 42, 13, 11, '#5fa83a');
          // Cabeça com olhos saltados
          f.ellipse(30, 27, 14, 9, '#5fa83a');
          f.ellipse(22, 19, 5, 5, '#5fa83a');
          f.ellipse(38, 19, 5, 5, '#5fa83a');
          // Violão: braço, cabeça e corpo
          f.line(38, 42, 56, 24, '#7a4a22', 3);
          f.rect(54, 20, 5, 5, '#5a2a12');
          f.ellipse(34, 46, 8, 7, '#e0892e');
          f.ellipse(27, 47, 6, 6, '#e0892e');
        },
        (f) => {
          // Barriga
          f.ellipse(22, 38, 3, 3, '#cde39a');
          eye(f, 22, 19, 3.2, 1, 1);
          eye(f, 38, 19, 3.2, 1, 1);
          // Boca larga e bochechas
          f.line(20, 29, 25, 32, INK);
          f.line(25, 32, 35, 32, INK);
          f.line(35, 32, 40, 29, INK);
          f.ellipse(19, 28, 2, 1.4, '#f08a7a');
          f.ellipse(41, 28, 2, 1.4, '#f08a7a');
          // Contorno do corpo do violão (separa do corpo do sapo)
          const inGuitar = (x: number, y: number) =>
            ((x - 34) / 8) ** 2 + ((y - 46) / 7) ** 2 <= 1 || ((x - 27) / 6) ** 2 + ((y - 47) / 6) ** 2 <= 1;
          for (let y = 38; y <= 54; y++)
            for (let x = 19; x <= 43; x++)
              if (inGuitar(x, y) && (!inGuitar(x + 1, y) || !inGuitar(x - 1, y) || !inGuitar(x, y + 1) || !inGuitar(x, y - 1)))
                f.rect(x, y, 1, 1, INK);
          // Boca do violão, cordas e mão
          f.ellipse(31, 46, 2.6, 2.6, '#3b1e0c');
          for (const k of [0, 1]) f.line(28 + k, 49 + k, 55 + k, 23 + k, '#fff3c4');
          f.ellipse(44, 36, 3, 3, '#5fa83a');
          // Notas musicais
          for (const [x, y] of [[46, 8], [54, 12]]) {
            f.ellipse(x!, y! + 4, 1.6, 1.2, INK);
            f.rect(x! + 1, y!, 1, 4, INK);
            f.rect(x! + 1, y!, 3, 1, INK);
          }
          // Ondinhas na água
          for (const [x, y] of [[4, 60], [52, 61], [8, 50]]) f.rect(x!, y!, 4, 1, '#7cc4a4');
        },
      );
    },
  },
];
