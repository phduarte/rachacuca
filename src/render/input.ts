/**
 * Entrada (seção 5): toque, swipe e teclado. Arrastar peça e a fila de
 * comandos durante a animação entram na fase 2.
 */
import type { Direction } from '../core/board';

export interface InputHandlers {
  tap(clientX: number, clientY: number): void;
  swipe(dir: Direction): void;
}

const SWIPE_MIN_PX = 24;

export function bindInput(target: HTMLElement, h: InputHandlers): () => void {
  let start: { id: number; x: number; y: number } | null = null;

  const down = (e: PointerEvent) => {
    start = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const s = start;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
      h.tap(s.x, s.y);
    } else if (Math.abs(dx) > Math.abs(dy)) {
      h.swipe(dx > 0 ? 'right' : 'left');
    } else {
      h.swipe(dy > 0 ? 'down' : 'up');
    }
  };
  const cancel = () => (start = null);

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
      h.swipe(dir);
    }
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key);
  };
}
