import { describe, expect, it } from 'vitest';
import { pickFresh, remember } from './draw';

/** PRNG com semente (mulberry32), para o teste ser reproduzível. */
function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Joga `games` partidas seguidas e devolve a sequência sorteada. */
function play(all: string[], avoid: number, games: number, seed = 1): string[] {
  const r = rng(seed);
  let recent: string[] = [];
  const seq: string[] = [];
  for (let i = 0; i < games; i++) {
    const x = pickFresh(all, recent, avoid, r);
    seq.push(x);
    recent = remember(recent, x, avoid);
  }
  return seq;
}

describe('sorteio sem repetir as recentes (seção 3)', () => {
  const palettes = Array.from({ length: 13 }, (_, i) => `p${i}`);
  const images = Array.from({ length: 20 }, (_, i) => `i${i}`);

  it('nunca repete nenhuma das 3 últimas paletas', () => {
    const seq = play(palettes, 3, 2000);
    seq.forEach((p, i) => expect(seq.slice(Math.max(0, i - 3), i)).not.toContain(p));
  });

  it('nunca repete nenhuma das 5 últimas imagens', () => {
    const seq = play(images, 5, 2000, 7);
    seq.forEach((p, i) => expect(seq.slice(Math.max(0, i - 5), i)).not.toContain(p));
  });

  it('com banco pequeno, evita quantas der', () => {
    const seq = play(['a', 'b', 'c'], 5, 300, 3);
    // Com 3 imagens, cada uma só volta depois das outras duas.
    seq.forEach((p, i) => expect(seq.slice(Math.max(0, i - 2), i)).not.toContain(p));
  });

  it('com uma opção só, repete', () => {
    expect(play(['x'], 5, 3)).toEqual(['x', 'x', 'x']);
  });

  it('usa todo o banco ao longo do tempo', () => {
    expect(new Set(play(palettes, 3, 500)).size).toBe(palettes.length);
  });

  it('remember guarda só os últimos, sem duplicar', () => {
    expect(remember(['a', 'b', 'c'], 'b', 3)).toEqual(['a', 'c', 'b']);
    expect(remember(['a', 'b', 'c'], 'd', 3)).toEqual(['b', 'c', 'd']);
  });
});
