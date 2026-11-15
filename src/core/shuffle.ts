/**
 * Embaralhamento com semente, teste de solubilidade e critérios de qualidade
 * (seções 2.4 e 3.3 da especificação).
 */
import { createBoard, isSolved, solvedTiles, type Board, type Size } from './board';

/** PRNG mulberry32: rápido, 32 bits, determinístico pela semente. Retorna [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente nova a partir de `crypto.getRandomValues`. */
export function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** Pares (a, b) com a antes de b e a > b, ignorando a casa vazia. */
export function countInversions(tiles: readonly number[]): number {
  const seq = tiles.filter((t) => t !== 0);
  let inv = 0;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + 1; j < seq.length; j++) {
      if (seq[i]! > seq[j]!) inv++;
    }
  }
  return inv;
}

/**
 * Seção 2.4:
 * - N ímpar: solucionável se inversões for par.
 * - N par: solucionável se (inversões + linha da casa vazia contada de baixo, a partir de 1) for ímpar.
 */
export function isSolvable(size: number, tiles: readonly number[]): boolean {
  const inv = countInversions(tiles);
  if (size % 2 === 1) return inv % 2 === 0;
  const emptyRowFromBottom = size - Math.floor(tiles.indexOf(0) / size);
  return (inv + emptyRowFromBottom) % 2 === 1;
}

/** Soma das distâncias de Manhattan de cada peça até a casa certa. */
export function manhattan(size: number, tiles: readonly number[]): number {
  let sum = 0;
  tiles.forEach((t, i) => {
    if (t === 0) return;
    const goal = t - 1;
    sum += Math.abs(Math.floor(i / size) - Math.floor(goal / size)) + Math.abs((i % size) - (goal % size));
  });
  return sum;
}

/** Peças (não vazias) que já estão na casa certa. */
export function tilesInPlace(tiles: readonly number[]): number {
  return tiles.reduce((n, t, i) => n + (t !== 0 && t === i + 1 ? 1 : 0), 0);
}

export const MIN_MANHATTAN: Record<Size, number> = { 3: 10, 4: 30, 5: 60, 6: 100 };
export const MAX_IN_PLACE_RATIO = 0.25;

export function meetsQuality(size: Size, tiles: readonly number[]): boolean {
  const pieces = size * size - 1;
  return (
    !isSolved({ size, tiles }) &&
    tilesInPlace(tiles) <= pieces * MAX_IN_PLACE_RATIO &&
    manhattan(size, tiles) >= MIN_MANHATTAN[size]
  );
}

/**
 * Fisher–Yates com a semente; se não tiver solução, troca as duas primeiras
 * peças não vazias (inverte a paridade). Repete com o mesmo PRNG até passar
 * nos critérios de qualidade, então a mesma semente sempre dá a mesma posição.
 */
export function shuffle(size: Size, seed: number): Board {
  const rand = mulberry32(seed);
  for (;;) {
    const tiles = solvedTiles(size);
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!];
    }
    if (!isSolvable(size, tiles)) {
      const a = tiles[0] === 0 ? 1 : 0;
      const b = tiles[a + 1] === 0 ? a + 2 : a + 1;
      [tiles[a], tiles[b]] = [tiles[b]!, tiles[a]!];
    }
    if (meetsQuality(size, tiles)) return createBoard(size, tiles);
  }
}
