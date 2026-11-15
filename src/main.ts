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
const hud = document.createElement('div');
hud.className = 'hud';
const timeEl = document.createElement('span');
const movesEl = document.createElement('span');
hud.append(timeEl, movesEl);

const view = new BoardView();
const newGameBtn = document.createElement('button');
newGameBtn.textContent = 'NOVO JOGO';
const status = document.createElement('div');
status.setAttribute('aria-live', 'polite');

app.append(hud, view.el, newGameBtn, status);

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
  movesEl.textContent = `MOV ${moves}`;
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
