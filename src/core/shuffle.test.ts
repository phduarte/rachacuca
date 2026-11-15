import { describe, expect, it } from 'vitest';
import { SIZES, solvedTiles, type Size } from './board';
import { countInversions, isSolvable, manhattan, MIN_MANHATTAN, meetsQuality, mulberry32, shuffle, tilesInPlace } from './shuffle';

/** Todas as posições 3×3 alcançáveis a partir da resolvida (busca em largura). */
function reachable3x3(): Set<string> {
  const start = solvedTiles(3);
  const seen = new Set([start.join(',')]);
  const queue = [start];
  for (let q = 0; q < queue.length; q++) {
    const t = queue[q]!;
    const e = t.indexOf(0);
    const r = Math.floor(e / 3);
    const c = e % 3;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      const n = [...t];
      const j = nr * 3 + nc;
      [n[e], n[j]] = [n[j]!, n[e]!];
      const key = n.join(',');
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(n);
      }
    }
  }
  return seen;
}

describe('solubilidade', () => {
  it('o tabuleiro resolvido passa no próprio teste', () => {
    for (const s of SIZES) expect(isSolvable(s, solvedTiles(s))).toBe(true);
  });

  it('o desafio 14-15 de Sam Loyd não tem solução', () => {
    const t = solvedTiles(4);
    [t[13], t[14]] = [t[14]!, t[13]!];
    expect(countInversions(t)).toBe(1);
    expect(isSolvable(4, t)).toBe(false);
  });

  it('3×3: o teste de paridade bate com a busca exaustiva', () => {
    const reach = reachable3x3();
    expect(reach.size).toBe(181_440); // 9!/2
    const rand = mulberry32(42);
    for (let k = 0; k < 20_000; k++) {
      const t = solvedTiles(3);
      for (let i = t.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [t[i], t[j]] = [t[j]!, t[i]!];
      }
      expect(isSolvable(3, t)).toBe(reach.has(t.join(',')));
    }
  });
});

describe('shuffle', () => {
  it('a mesma semente gera sempre a mesma posição', () => {
    for (const s of SIZES) expect(shuffle(s, 123_456).tiles).toEqual(shuffle(s, 123_456).tiles);
    expect(shuffle(4, 1).tiles).not.toEqual(shuffle(4, 2).tiles);
  });

  // Critério de aceitação: 100.000 embaralhamentos por tamanho.
  it.each(SIZES)('%i×%i: 100.000 embaralhamentos, todos solucionáveis e dentro da qualidade', (size: Size) => {
    const pieces = size * size - 1;
    for (let seed = 1; seed <= 100_000; seed++) {
      const { tiles } = shuffle(size, seed);
      if (!isSolvable(size, tiles) || !meetsQuality(size, tiles)) {
        throw new Error(`semente ${seed} falhou: ${tiles.join(',')}`);
      }
    }
    // checagem explícita dos limites para uma amostra
    const t = shuffle(size, 7).tiles;
    expect(manhattan(size, t)).toBeGreaterThanOrEqual(MIN_MANHATTAN[size]);
    expect(tilesInPlace(t)).toBeLessThanOrEqual(pieces * 0.25);
  });

  it('3×3: embaralhamentos estão no conjunto alcançável', () => {
    const reach = reachable3x3();
    for (let seed = 1; seed <= 5_000; seed++) expect(reach.has(shuffle(3, seed).tiles.join(','))).toBe(true);
  });
});
