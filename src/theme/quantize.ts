/**
 * Quantização para a paleta da partida (seção 3.2, modo retrô). Lógica pura,
 * sem DOM: roda no Web Worker de `retroize` ou, no fallback, na thread principal.
 */
export type Rgb = readonly [number, number, number];
export type Dither = 'bayer' | 'floyd' | 'none';

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Distância perceptual barata ("redmean"): pesa mais o verde, como o olho. */
function distance(r: number, g: number, b: number, c: Rgb): number {
  const rm = (r + c[0]) / 2;
  const dr = r - c[0];
  const dg = g - c[1];
  const db = b - c[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

/** Índice da cor da paleta mais próxima de (r, g, b). */
export function nearest(r: number, g: number, b: number, palette: readonly Rgb[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = distance(r, g, b, palette[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Matriz de Bayer 4 × 4 (limiares 0..15). */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Força do pontilhado ordenado, em níveis de 0 a 255. */
const BAYER_SPREAD = 64;

/**
 * Devolve uma cópia de `rgba` (w × h) só com as cores de `palette`.
 * O alfa é mantido. Determinística: a mesma entrada gera sempre a mesma saída.
 */
export function quantize(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  palette: readonly Rgb[],
  dither: Dither = 'bayer',
): Uint8ClampedArray {
  if (!palette.length) throw new Error('paleta vazia');
  const out = new Uint8ClampedArray(rgba);
  // Floyd–Steinberg espalha o erro em floats, para não acumular arredondamento.
  const err = dither === 'floyd' ? new Float32Array(w * h * 3) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const o = p * 4;
      let r = rgba[o]!;
      let g = rgba[o + 1]!;
      let b = rgba[o + 2]!;
      if (dither === 'bayer') {
        const t = (BAYER4[(y & 3) * 4 + (x & 3)]! / 16 - 0.5) * BAYER_SPREAD;
        r += t;
        g += t;
        b += t;
      } else if (err) {
        r += err[p * 3]!;
        g += err[p * 3 + 1]!;
        b += err[p * 3 + 2]!;
      }
      const c = palette[nearest(r, g, b, palette)]!;
      out[o] = c[0];
      out[o + 1] = c[1];
      out[o + 2] = c[2];
      if (err) {
        const er = r - c[0];
        const eg = g - c[1];
        const eb = b - c[2];
        const spread = (dx: number, dy: number, k: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny >= h) return;
          const q = (ny * w + nx) * 3;
          err[q] = err[q]! + er * k;
          err[q + 1] = err[q + 1]! + eg * k;
          err[q + 2] = err[q + 2]! + eb * k;
        };
        spread(1, 0, 7 / 16);
        spread(-1, 1, 3 / 16);
        spread(0, 1, 5 / 16);
        spread(1, 1, 1 / 16);
      }
    }
  }
  return out;
}
