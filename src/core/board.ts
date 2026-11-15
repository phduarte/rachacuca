/**
 * Estado e regras do tabuleiro (seções 2.1–2.3 da especificação).
 *
 * `tiles[i]` é a peça na casa `i` (leitura linha a linha); 0 é a casa vazia.
 * Resolvido: [1, 2, …, N²−1, 0].
 */

export type Size = 3 | 4 | 5 | 6;
export const SIZES: readonly Size[] = [3, 4, 5, 6];

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Board {
  readonly size: Size;
  readonly tiles: readonly number[];
}

/** Uma peça que mudou de casa num movimento. */
export interface TileMove {
  tile: number;
  from: number;
  to: number;
}

export interface MoveResult {
  board: Board;
  /** Peças deslocadas, da mais próxima da casa vazia para a mais distante. */
  moved: TileMove[];
  /** Sentido em que as peças andaram (útil para o balanço do tabuleiro). */
  direction: Direction;
}

export function solvedTiles(size: Size): number[] {
  const n = size * size;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? 0 : i + 1));
}

export function createBoard(size: Size, tiles: readonly number[] = solvedTiles(size)): Board {
  if (tiles.length !== size * size) {
    throw new Error(`Tabuleiro ${size}×${size} precisa de ${size * size} casas, recebeu ${tiles.length}`);
  }
  const seen = new Set(tiles);
  if (seen.size !== tiles.length || tiles.some((t) => t < 0 || t >= tiles.length)) {
    throw new Error('Peças inválidas: precisa ser uma permutação de 0..N²−1');
  }
  return { size, tiles: [...tiles] };
}

export const rowOf = (size: number, index: number): number => Math.floor(index / size);
export const colOf = (size: number, index: number): number => index % size;

export function emptyIndex(board: Board): number {
  return board.tiles.indexOf(0);
}

export function isSolved(board: Board): boolean {
  const last = board.tiles.length - 1;
  return board.tiles.every((t, i) => (i === last ? t === 0 : t === i + 1));
}

/** Pode mover a peça da casa `index`? (mesma linha ou coluna da casa vazia, e não ela mesma) */
export function canMove(board: Board, index: number): boolean {
  const e = emptyIndex(board);
  if (index === e || index < 0 || index >= board.tiles.length) return false;
  const { size } = board;
  return rowOf(size, index) === rowOf(size, e) || colOf(size, index) === colOf(size, e);
}

/**
 * Toque na peça da casa `index`. Se estiver na linha/coluna da casa vazia,
 * desliza ela e todas as peças entre ela e a casa vazia (deslize em fila).
 * Cada peça deslocada conta 1 movimento (`moved.length`).
 * Retorna `null` se o movimento não é válido.
 */
export function moveAt(board: Board, index: number): MoveResult | null {
  if (!canMove(board, index)) return null;
  const { size } = board;
  const e = emptyIndex(board);
  const sameRow = rowOf(size, index) === rowOf(size, e);
  const step = sameRow ? (index > e ? 1 : -1) : index > e ? size : -size;

  const tiles = [...board.tiles];
  const moved: TileMove[] = [];
  // Começa pela peça vizinha da casa vazia e vai até a tocada.
  for (let hole = e; hole !== index; hole += step) {
    const from = hole + step;
    const tile = tiles[from]!;
    tiles[hole] = tile;
    tiles[from] = 0;
    moved.push({ tile, from, to: hole });
  }

  // As peças andam no sentido oposto a `step`.
  const direction: Direction = sameRow ? (step > 0 ? 'left' : 'right') : step > 0 ? 'up' : 'down';
  return { board: { size, tiles }, moved, direction };
}

/**
 * Swipe/seta: as peças andam no sentido `dir`. Move a peça que está do lado
 * oposto ao sentido, encostada na casa vazia. Retorna `null` se não houver.
 */
export function moveDirection(board: Board, dir: Direction): MoveResult | null {
  const { size } = board;
  const e = emptyIndex(board);
  const r = rowOf(size, e);
  const c = colOf(size, e);
  let index: number;
  switch (dir) {
    case 'up':
      if (r === size - 1) return null;
      index = e + size;
      break;
    case 'down':
      if (r === 0) return null;
      index = e - size;
      break;
    case 'left':
      if (c === size - 1) return null;
      index = e + 1;
      break;
    case 'right':
      if (c === 0) return null;
      index = e - 1;
      break;
  }
  return moveAt(board, index);
}
