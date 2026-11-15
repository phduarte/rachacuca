/**
 * Imagens do quebra-cabeça. As embarcadas são pixel art original (seção 4.1),
 * desenhada em código numa grade de 64 × 64 para não pesar no pacote.
 * A foto do jogador é recortada no centro em quadrado.
 */

import { CHARACTERS } from './characters';

const N = 64;

type Px = (x: number, y: number, color: string) => void;

export interface BuiltinImage {
  id: string;
  name: string;
  draw(px: Px): void;
}

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function disc(px: Px, cx: number, cy: number, r: number, color: (x: number, y: number) => string | null): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        const c = color(x, y);
        if (c) px(x, y, c);
      }
    }
  }
}

export const BUILTIN_IMAGES: BuiltinImage[] = [
  {
    id: 'sunset',
    name: 'PÔR DO SOL',
    draw(px) {
      const sky = ['#1a0533', '#2e0a4f', '#4c0f6b', '#7a1478', '#b11a6e', '#e0245e', '#ff5a3d'];
      for (let y = 0; y < 40; y++) for (let x = 0; x < N; x++) px(x, y, sky[Math.min(6, Math.floor(y / 6))]!);
      // Sol listrado
      disc(px, 32, 28, 15, (_x, y) => {
        // Na metade de baixo, faixas vazias cada vez mais grossas
        if (y > 28 && (y - 29) % 5 < Math.floor((y - 29) / 5) + 1) return null;
        return y < 20 ? '#fff275' : y < 28 ? '#ffd319' : '#ff9a3d';
      });
      // Montanhas
      for (let x = 0; x < N; x++) {
        const h = Math.max(0, 9 - Math.abs(((x + 4) % 22) - 11)) + Math.max(0, 6 - Math.abs(((x + 15) % 14) - 7));
        for (let y = 40 - Math.floor(h * 0.7); y < 40; y++) px(x, y, '#2a0845');
      }
      // Chão com grade em perspectiva
      for (let y = 40; y < N; y++) for (let x = 0; x < N; x++) px(x, y, '#140326');
      for (let k = 1; k < 9; k++) {
        const y = 40 + Math.round(k * k * 0.33);
        if (y < N) for (let x = 0; x < N; x++) px(x, y, '#ff2a6d');
      }
      for (let k = -10; k <= 10; k++) {
        for (let y = 40; y < N; y++) px(Math.round(32 + k * (y - 39) * 0.55), y, '#ff2a6d');
      }
      for (let x = 0; x < N; x++) px(x, 40, '#05d9e8');
    },
  },
  {
    id: 'space',
    name: 'ESPAÇO',
    draw(px) {
      const r = rng(7);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) px(x, y, y < 32 ? '#0b0b2a' : '#100c36');
      for (let i = 0; i < 70; i++) px(Math.floor(r() * N), Math.floor(r() * N), r() < 0.25 ? '#ffd319' : '#ffffff');
      // Planeta com faixas e sombra
      disc(px, 40, 26, 14, (x, y) => {
        const band = Math.floor((y - 12) / 4) % 3;
        const shade = x + y > 74;
        return (shade ? ['#a33a1a', '#b8541c', '#8f2a14'] : ['#ff8f3d', '#ffb35c', '#e05a2a'])[band]!;
      });
      // Anel
      for (let t = 0; t < 360; t += 2) {
        const a = (t * Math.PI) / 180;
        const x = Math.round(40 + Math.cos(a) * 23);
        const y = Math.round(26 + Math.sin(a) * 6 - Math.cos(a) * 3);
        if (Math.sin(a) > 0 || (x - 40) ** 2 + (y - 26) ** 2 > 196) {
          px(x, y, '#ffe3a3');
          px(x, y + 1, '#c9a46a');
        }
      }
      // Lua
      disc(px, 13, 48, 7, (x, y) => (x + y > 63 ? '#6b6b8a' : '#c2c3c7'));
      px(11, 46, '#8a8aa6');
      px(12, 46, '#8a8aa6');
      px(15, 50, '#8a8aa6');
      // Foguete
      const rocket = ['..w..', '.wrw.', '.www.', '.wbw.', '.www.', 'rwwwr', 'r.o.r', '..o..'];
      rocket.forEach((row, dy) =>
        [...row].forEach((ch, dx) => {
          const c = { w: '#f4f1ea', r: '#ff004d', b: '#29adff', o: '#ffa300' }[ch];
          if (c) px(48 + dx, 46 + dy, c);
        }),
      );
    },
  },
  {
    id: 'island',
    name: 'ILHA',
    draw(px) {
      for (let y = 0; y < 36; y++) for (let x = 0; x < N; x++) px(x, y, y < 12 ? '#3fa9f5' : y < 24 ? '#5fc3f5' : '#8fdcf7');
      disc(px, 50, 11, 6, () => '#fff275');
      for (const [cx, cy, w] of [[8, 9, 10], [26, 16, 8]] as const) {
        for (let x = 0; x < w; x++) px(cx + x, cy, '#ffffff');
        for (let x = 2; x < w - 2; x++) px(cx + x, cy - 1, '#ffffff');
      }
      // Mar com ondas
      for (let y = 36; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const wave = (x + y * 3) % 11 === 0 && y % 3 === 0;
          px(x, y, wave ? '#9ee6ff' : y < 46 ? '#1f7fb8' : '#16608f');
        }
      }
      // Areia
      for (let y = 40; y <= 48; y++) {
        const half = Math.round(18 * Math.sqrt(Math.max(0, 1 - ((y - 44) / 5) ** 2)));
        for (let x = 26 - half; x <= 26 + half; x++) px(x, y, y < 43 ? '#f7d488' : '#e0b45c');
      }
      // Coqueiro
      for (let y = 20; y < 42; y++) {
        const x = Math.round(24 + ((42 - y) / 22) ** 2 * 6);
        px(x, y, '#8a5a2b');
        px(x + 1, y, y % 3 === 0 ? '#6b4220' : '#a8703a');
      }
      const top = { x: 30, y: 19 };
      const leaves: Array<[number, number]> = [[-1, 0.2], [1, 0.25], [-0.7, -0.5], [0.7, -0.45], [0, -1]];
      for (const [dx, dy] of leaves) {
        for (let t = 0; t <= 11; t++) {
          const x = Math.round(top.x + dx * t);
          const y = Math.round(top.y + dy * t + (t * t) / 18);
          px(x, y, '#2e9e3a');
          px(x, y + 1, '#1f7a2c');
        }
      }
      px(29, 21, '#6b4220');
      px(31, 21, '#6b4220');
    },
  },
];

BUILTIN_IMAGES.push(...CHARACTERS);

const cache = new Map<string, string>();

/** Desenha (uma vez) a imagem embarcada e devolve uma data URL PNG. */
export function builtinImageUrl(id: string): string | null {
  const img = BUILTIN_IMAGES.find((i) => i.id === id);
  if (!img) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = N;
  const ctx = canvas.getContext('2d')!;
  img.draw((x, y, color) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  });
  const url = canvas.toDataURL('image/png');
  cache.set(id, url);
  return url;
}

/** Lê uma foto escolhida pelo jogador, recorta o quadrado central e reduz. */
export async function photoFromFile(file: File, side = 512): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  canvas
    .getContext('2d')!
    .drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, side, side);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}
