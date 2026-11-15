/**
 * Entrada (seção 5): toque, swipe, arrastar e teclado.
 *
 * Arrastar: se o dedo desce numa peça que pode andar, `dragStart` devolve um
 * controle que recebe o deslocamento a cada `pointermove`. Ao soltar, o
 * controle decide (completa ou volta). Se ele recusar o gesto (o dedo foi
 * para outro eixo, por exemplo), o gesto vira toque ou swipe como sempre.
 */
import type { Direction } from '../core/board';

export interface DragControl {
  move(dx: number, dy: number): void;
  /** Dedo solto. Retorna true se tratou o gesto como arrasto. */
  end(dx: number, dy: number): boolean;
  /** Gesto cancelado pelo sistema: volta sem mover. */
  cancel(): void;
}

export interface InputHandlers {
  /** Primeiro contato (destrava áudio etc.). */
  down?(): void;
  dragStart?(clientX: number, clientY: number): DragControl | null;
  tap(clientX: number, clientY: number): void;
  swipe(dir: Direction): void;
}

export const SWIPE_MIN_PX = 24;

export function bindInput(target: HTMLElement, h: InputHandlers): () => void {
  let start: { id: number; x: number; y: number; drag: DragControl | null } | null = null;

  const down = (e: PointerEvent) => {
    h.down?.();
    if (start) return; // um dedo por vez
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: h.dragStart?.(e.clientX, e.clientY) ?? null };
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura */
    }
  };
  const move = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId || !start.drag) return;
    start.drag.move(e.clientX - start.x, e.clientY - start.y);
  };
  const up = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const s = start;
    start = null;
    if (s.drag?.end(dx, dy)) return;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
      h.tap(s.x, s.y);
    } else if (Math.abs(dx) > Math.abs(dy)) {
      h.swipe(dx > 0 ? 'right' : 'left');
    } else {
      h.swipe(dy > 0 ? 'down' : 'up');
    }
  };
  const cancel = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    start.drag?.cancel();
    start = null;
  };

  const KEYS: Record<string, Direction> = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };
  const key = (e: KeyboardEvent) => {
    const dir = KEYS[e.code];
    if (dir) {
      e.preventDefault();
      h.down?.();
      h.swipe(dir);
    }
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
  };
}
