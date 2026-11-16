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
    this.el.addEventListener('animationend', (e) => {
      if (e.target === this.el) this.el.classList.remove(...BUMP_CLASSES, 'bump-strong');
    });
  }

  /** Recria as peças para um tabuleiro novo. */
  mount(board: Board): void {
    this.size = board.size;
    this.el.style.setProperty('--size', String(board.size));
    this.el.dataset.size = String(board.size);
    this.el.classList.remove('gaps-dark', 'seamless');
    this.el.replaceChildren();
    this.tileEls.clear();
    board.tiles.forEach((tile) => {
      if (tile === 0) return;
      const t = this.makeTile(tile);
      this.tileEls.set(tile, t);
      this.el.append(t);
    });
    this.update(board);
  }

  private makeTile(tile: number): HTMLDivElement {
    const t = document.createElement('div');
    t.className = 'tile';
    const num = document.createElement('span');
    num.className = 'tile-num';
    num.textContent = String(tile);
    t.append(num);
    // Pedaço da imagem que esta peça mostra: o da sua casa de origem.
    const home = tile - 1;
    const max = this.size - 1;
    t.style.backgroundPosition = `${(colOf(this.size, home) / max) * 100}% ${(rowOf(this.size, home) / max) * 100}%`;
    t.setAttribute('role', 'button');
    return t;
  }

  /**
   * Vitória (seção 7.1): a peça que faltava (N²) aparece na casa vazia, no
   * canto inferior direito, completando a imagem.
   */
  showLastPiece(): void {
    const last = this.size * this.size;
    if (this.tileEls.has(last)) return;
    const t = this.makeTile(last);
    t.classList.add('tile--last');
    t.removeAttribute('role');
    this.tileEls.set(last, t);
    this.el.append(t);
    this.place(t, last - 1);
  }

  /** As frestas escurecem no início do efeito de vitória. */
  darkenGaps(on: boolean): void {
    this.el.classList.toggle('gaps-dark', on);
  }

  /** Assentamento: as frestas fecham e a imagem aparece inteira (seção 7.1). */
  setSeamless(board: Board, on: boolean): void {
    this.el.classList.toggle('seamless', on);
    this.update(board);
  }

  private place(t: HTMLDivElement, i: number): void {
    const r = rowOf(this.size, i);
    const c = colOf(this.size, i);
    const g = this.gapPct();
    t.style.transform = `translate3d(${c * 100 + c * g}%, ${r * 100 + r * g}%, 0)`;
  }

  /** Imagem das peças (null = só números). `pixelated` para pixel art. */
  setImage(url: string | null, pixelated = false): void {
    this.el.classList.toggle('has-image', !!url);
    this.el.classList.toggle('pixelated', !!url && pixelated);
    if (url) this.el.style.setProperty('--img', `url("${url}")`);
    else this.el.style.removeProperty('--img');
  }

  /** Posiciona cada peça na sua casa atual. */
  update(board: Board): void {
    board.tiles.forEach((tile, i) => {
      const t = this.tileEls.get(tile);
      if (!t) return;
      const r = rowOf(this.size, i);
      const c = colOf(this.size, i);
      this.place(t, i);
      t.dataset.index = String(i);
      t.setAttribute('aria-label', `Peça ${tile}, linha ${r + 1}, coluna ${c + 1}`);
    });
    const last = this.tileEls.get(this.size * this.size);
    if (last) this.place(last, this.size * this.size - 1);
  }

  /**
   * Embaralhada animada (seção 3.3): cada peça voa até a casa sorteada com
   * um atraso aleatório de até `maxDelayMs`, para não saírem todas juntas.
   */
  scatter(board: Board, maxDelayMs: number): void {
    for (const t of this.tileEls.values()) t.style.transitionDelay = `${Math.round(Math.random() * maxDelayMs)}ms`;
    this.update(board);
  }

  /** Tira os atrasos da embaralhada. */
  settle(): void {
    for (const t of this.tileEls.values()) t.style.transitionDelay = '';
  }

  /**
   * Arrastar (seção 5): desloca as peças `tiles` em (dx, dy) px a partir da
   * casa atual, sem transição, seguindo o dedo.
   */
  drag(tiles: readonly number[], dx: number, dy: number): void {
    for (const tile of tiles) {
      const t = this.tileEls.get(tile);
      if (!t) continue;
      t.classList.add('dragging');
      t.style.translate = `${dx}px ${dy}px`;
    }
  }

  /**
   * Solta as peças arrastadas. A volta do deslocamento é animada junto com o
   * `transform`; se o movimento foi aceito (update logo depois), a peça
   * continua de onde o dedo largou até a casa nova.
   */
  release(): void {
    for (const t of this.tileEls.values()) {
      if (!t.classList.contains('dragging')) continue;
      t.classList.remove('dragging');
      t.style.translate = '';
    }
  }

  /** Distância em px de uma casa até a vizinha (peça + fresta). */
  pitch(): number {
    const gap = parseFloat(getComputedStyle(this.el).getPropertyValue('--gap')) || 0;
    return (this.el.clientWidth - gap) / this.size;
  }

  /**
   * Balanço do tabuleiro no sentido do deslize (seção 6.1): 2 px, ou 3 px
   * (`strong`) num deslize em fila de 3 peças ou mais.
   */
  bump(dir: Direction, strong = false): void {
    this.el.classList.remove(...BUMP_CLASSES, 'bump-strong');
    void this.el.offsetWidth; // reinicia a animação
    this.el.classList.add(`bump-${dir}`);
    if (strong) this.el.classList.add('bump-strong');
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
