import './style.css';
import { isSolved, moveAt, moveDirection, type Board, type MoveResult, type Size } from './core/board';
import { newSeed, shuffle } from './core/shuffle';
import { formatTime, Timer } from './core/timer';
import { BoardView } from './render/boardView';
import { bindInput } from './render/input';
import { setupServiceWorker } from './pwa/sw';

// Bloqueios da seção 9.2 (menu de toque longo e pinça do iOS).
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

const app = document.querySelector<HTMLDivElement>('#app')!;
function stat(label: string, modifier: string): { el: HTMLDivElement; value: HTMLSpanElement } {
  const el = document.createElement('div');
  el.className = `stat stat--${modifier}`;
  const l = document.createElement('span');
  l.className = 'stat-label';
  l.textContent = label;
  const value = document.createElement('span');
  value.className = 'stat-value';
  el.append(l, value);
  return { el, value };
}

const hud = document.createElement('div');
hud.className = 'hud';
const timeStat = stat('TEMPO', 'time');
const movesStat = stat('MOVIMENTOS', 'moves');
const timeEl = timeStat.value;
const movesEl = movesStat.value;
hud.append(timeStat.el, movesStat.el);

const view = new BoardView();
const newGameBtn = document.createElement('button');
newGameBtn.textContent = 'NOVO JOGO';
const status = document.createElement('div');
status.setAttribute('aria-live', 'polite');

// Layout pela zona do polegar: comando raro no topo (fora do alcance natural,
// longe de toques acidentais), placar grande no meio (só leitura) e tabuleiro
// embaixo, onde o polegar alcança.
const topBar = document.createElement('header');
topBar.className = 'top-bar';
topBar.append(newGameBtn);
status.className = 'status';
const display = document.createElement('section');
display.className = 'display';
display.append(hud, status);

app.append(topBar, display, view.el);

let size: Size = 4;
let board: Board;
let moves = 0;
let won = false;
const timer = new Timer();

function newGame(): void {
  board = shuffle(size, newSeed());
  moves = 0;
  won = false;
  status.textContent = '';
  timer.reset();
  view.mount(board);
  renderHud();
}

function apply(result: MoveResult | null): void {
  if (!result || won) return;
  if (!timer.running) timer.start();
  board = result.board;
  moves += result.moved.length;
  view.update(board);
  view.bump(result.direction);
  renderHud();
  if (isSolved(board)) {
    won = true;
    timer.pause();
    status.textContent = 'VOCÊ RACHOU A CUCA!';
  }
}

function renderHud(): void {
  timeEl.textContent = formatTime(timer.elapsedMs());
  movesEl.textContent = String(moves);
}

bindInput(view.el, {
  tap: (x, y) => apply(moveAt(board, view.indexAt(x, y))),
  swipe: (dir) => apply(moveDirection(board, dir)),
});

// Seção 2.5: pausa quando o app perde o foco.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) timer.pause();
});

newGameBtn.addEventListener('click', newGame);
window.addEventListener('resize', () => view.update(board));
setInterval(renderHud, 250);

setupServiceWorker((applyUpdate) => {
  if (confirm('NOVA VERSÃO! REINICIAR?')) applyUpdate();
});

newGame();
