/**
 * Sorteio de paleta e imagem a cada partida (seção 3): nunca repete as
 * escolhas recentes (3 paletas, 5 imagens), quando há opções suficientes.
 */
export const RECENT_PALETTES = 3;
export const RECENT_IMAGES = 5;

/**
 * Sorteia um item de `all` fora dos `avoid` mais recentes de `recent`
 * (o mais recente é o último). Se o banco for pequeno, evita só quantos
 * dá para evitar, deixando ao menos uma opção.
 */
export function pickFresh<T>(all: readonly T[], recent: readonly T[], avoid: number, rnd: () => number = Math.random): T {
  if (!all.length) throw new Error('nada para sortear');
  const n = Math.min(avoid, all.length - 1);
  const blocked = new Set(n > 0 ? recent.slice(-n) : []);
  const pool = all.filter((x) => !blocked.has(x));
  return pool[Math.floor(rnd() * pool.length)]!;
}

/** Acrescenta `item` ao histórico, guardando só os `keep` últimos. */
export function remember<T>(recent: readonly T[], item: T, keep: number): T[] {
  return [...recent.filter((x) => x !== item), item].slice(-keep);
}
