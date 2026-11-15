import { describe, expect, it } from 'vitest';
import { canMove, createBoard, emptyIndex, isSolved, moveAt, moveDirection, solvedTiles } from './board';

describe('board', () => {
  it('tabuleiro resolvido tem a casa vazia no canto inferior direito', () => {
    expect(solvedTiles(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(isSolved(createBoard(4))).toBe(true);
  });

  it('rejeita tabuleiros inválidos', () => {
    expect(() => createBoard(3, [1, 2, 3])).toThrow();
    expect(() => createBoard(3, [1, 1, 3, 4, 5, 6, 7, 8, 0])).toThrow();
  });

  it('move peça vizinha da casa vazia e conta 1 movimento', () => {
    const b = createBoard(3);
    const r = moveAt(b, 7)!;
    expect(r.board.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(r.moved).toEqual([{ tile: 8, from: 7, to: 8 }]);
    expect(r.direction).toBe('right');
    expect(isSolved(r.board)).toBe(false);
  });

  it('deslize em fila move todas as peças entre a tocada e a casa vazia, 1 movimento por peça', () => {
    const b = createBoard(4);
    const r = moveAt(b, 12)!; // canto inferior esquerdo, mesma linha da vazia
    expect(r.board.tiles.slice(12)).toEqual([0, 13, 14, 15]);
    expect(r.moved.map((m) => m.tile)).toEqual([15, 14, 13]);
    expect(r.direction).toBe('right');

    const c = moveAt(b, 3)!; // topo da última coluna
    expect([3, 7, 11, 15].map((i) => c.board.tiles[i])).toEqual([0, 4, 8, 12]);
    expect(c.moved).toHaveLength(3);
    expect(c.direction).toBe('down');
  });

  it('peça fora da linha/coluna da casa vazia não move', () => {
    const b = createBoard(3);
    expect(canMove(b, 0)).toBe(false);
    expect(moveAt(b, 0)).toBeNull();
    expect(moveAt(b, emptyIndex(b))).toBeNull();
  });

  it('swipe move a peça do lado oposto ao sentido', () => {
    const b = createBoard(3); // vazia em (2,2)
    expect(moveDirection(b, 'right')!.moved[0]!.tile).toBe(8);
    expect(moveDirection(b, 'down')!.moved[0]!.tile).toBe(6);
    expect(moveDirection(b, 'left')).toBeNull();
    expect(moveDirection(b, 'up')).toBeNull();
  });

  it('não altera o tabuleiro original', () => {
    const b = createBoard(3);
    moveAt(b, 7);
    expect(isSolved(b)).toBe(true);
  });
});
