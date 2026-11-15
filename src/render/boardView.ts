/**
 * DOM do tabuleiro (seção 11.1): cada peça é um <div> posicionado por
 * transform: translate3d(), animado por transição CSS.
 */
import { colOf, rowOf, type Board, type Direction } from '../core/board';

export class BoardView {
  readonly el: HTMLDivElement;
  private tileEls = new Map<number, HTMLDivElement>();
  private size = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.setAttribute('role', 'grid');
    this.el.setAttribute('aria-label', 'Tabuleiro');
    this.el.addEventListener('animationend', () => this.el.classList.remove(...BUMP_CLASSES));
  }

  /** Recria as peças para um tabuleiro novo. */
  mount(board: Board): void {
    this.size = board.size;
    this.el.style.setProperty('--size', String(board.size));
    this.el.replaceChildren();
    this.tileEls.clear();
    board.tiles.forEach((tile) => {
      if (tile === 0) return;
      const t = document.createElement('div');
      t.className = 'tile';
      t.textContent = String(tile);
      t.setAttribute('role', 'button');
      this.tileEls.set(tile, t);
      this.el.append(t);
    });
    this.update(board);
  }

  /** Posiciona cada peça na sua casa atual. */
  update(board: Board): void {
    board.tiles.forEach((tile, i) => {
      const t = this.tileEls.get(tile);
      if (!t) return;
      const r = rowOf(this.size, i);
      const c = colOf(this.size, i);
      t.style.transform = `translate3d(${c * 100 + c * this.gapPct()}%, ${r * 100 + r * this.gapPct()}%, 0)`;
      t.dataset.index = String(i);
      t.setAttribute('aria-label', `Peça ${tile}, linha ${r + 1}, coluna ${c + 1}`);
    });
  }

  /** Balanço do tabuleiro no sentido do deslize (seção 6.1). */
  bump(dir: Direction): void {
    this.el.classList.remove(...BUMP_CLASSES);
    void this.el.offsetWidth; // reinicia a animação
    this.el.classList.add(`bump-${dir}`);
  }

  /** Índice da casa sob um ponto da tela, ou -1. */
  indexAt(clientX: number, clientY: number): number {
    // Área interna da moldura (sem o aro), onde ficam as peças.
    const rect = this.el.getBoundingClientRect();
    const left = rect.left + this.el.clientLeft;
    const top = rect.top + this.el.clientTop;
    const c = Math.floor(((clientX - left) / this.el.clientWidth) * this.size);
    const r = Math.floor(((clientY - top) / this.el.clientHeight) * this.size);
    if (r < 0 || c < 0 || r >= this.size || c >= this.size) return -1;
    return r * this.size + c;
  }

  /** A fresta entre peças, em % do lado de uma peça (para o translate). */
  private gapPct(): number {
    const side = this.el.clientWidth;
    if (!side) return 0;
    const gap = parseFloat(getComputedStyle(this.el).getPropertyValue('--gap')) || 0;
    const tile = (side - gap) / this.size - gap;
    return (gap / tile) * 100;
  }
}

const BUMP_CLASSES = ['bump-left', 'bump-right', 'bump-up', 'bump-down'];
