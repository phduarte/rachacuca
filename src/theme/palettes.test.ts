import { describe, expect, it } from 'vitest';
import { contrast, MIN_CONTRAST, needsOutline, PALETTES } from './palettes';

describe('paletas (seção 3.1)', () => {
  it('tem as 12 paletas da spec, além da padrão', () => {
    const ids = PALETTES.map((p) => p.id);
    for (const id of ['cga-1', 'cga-2', 'dmg', 'nes', 'c64', 'zx', 'msx', 'amiga', 'vga-sunset', 'arcade-neon', 'beige-pc', '16bit-blue']) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('calcula o contraste WCAG', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it.each(PALETTES.map((p) => [p.id, p] as const))('%s: número legível na peça', (_id, p) => {
    // Ou passa de 4,5:1, ou ganha contorno no texto.
    expect(contrast(p.text, p.face) >= MIN_CONTRAST || needsOutline(p)).toBe(true);
  });
});
