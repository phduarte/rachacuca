import { describe, expect, it } from 'vitest';
import { hexToRgb, nearest, quantize, type Rgb } from './quantize';

const BW: Rgb[] = [
  [0, 0, 0],
  [255, 255, 255],
];
const DMG: Rgb[] = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'].map(hexToRgb);

/** Degradê horizontal de cinza w × h. */
function gradient(w: number, h: number): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const v = Math.round((x / (w - 1)) * 255);
      d.set([v, v, v, 255], o);
    }
  return d;
}

function colorsOf(d: Uint8ClampedArray): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < d.length; i += 4) s.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
  return s;
}

describe('quantização (modo retrô, seção 3.2)', () => {
  it('converte hex em RGB', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });

  it('escolhe a cor mais próxima', () => {
    expect(nearest(10, 10, 10, BW)).toBe(0);
    expect(nearest(240, 250, 245, BW)).toBe(1);
    expect(nearest(0x8b, 0xac, 0x0f, DMG)).toBe(2);
  });

  it.each(['none', 'bayer', 'floyd'] as const)('%s: só sobram cores da paleta', (dither) => {
    const out = quantize(gradient(32, 8), 32, 8, DMG, dither);
    const allowed = new Set(DMG.map((c) => c.join(',')));
    for (const c of colorsOf(out)) expect(allowed).toContain(c);
  });

  it.each(['bayer', 'floyd'] as const)('%s: é determinístico e pontilha o degradê', (dither) => {
    const src = gradient(32, 8);
    const a = quantize(src, 32, 8, BW, dither);
    const b = quantize(src, 32, 8, BW, dither);
    expect(a).toEqual(b);
    // No meio do degradê, preto e branco se misturam na mesma coluna/região.
    const mid = [...a.slice((4 * 32 + 12) * 4, (4 * 32 + 20) * 4)].filter((_, i) => i % 4 === 0);
    expect(new Set(mid).size).toBe(2);
  });

  it('mantém o alfa e não altera a entrada', () => {
    const src = new Uint8ClampedArray([200, 10, 10, 128]);
    const copy = new Uint8ClampedArray(src);
    const out = quantize(src, 1, 1, BW, 'none');
    expect(out[3]).toBe(128);
    expect(src).toEqual(copy);
  });

  it('a mesma imagem fica diferente em paletas diferentes', () => {
    const src = gradient(16, 4);
    expect(quantize(src, 16, 4, BW)).not.toEqual(quantize(src, 16, 4, DMG));
  });
});
