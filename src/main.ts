import './style.css';
import { isSolved, moveAt, moveDirection, type Board, type MoveResult, type Size } from './core/board';
import { newSeed, shuffle } from './core/shuffle';
import { formatTime, Timer } from './core/timer';
import { BoardView } from './render/boardView';
import { bindInput } from './render/input';
import { setupServiceWorker } from './pwa/sw';
import { applyPalette, paletteById } from './theme/palettes';
import { builtinImageUrl, photoFromFile } from './theme/images';
import { loadPhoto, loadSettings, savePhoto, saveSettings } from './settings';
import { createBrand } from './ui/brand';
import { createMenu, createMenuButton } from './ui/menu';

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
const settings = loadSettings();
let photo = loadPhoto();
const status = document.createElement('div');
status.setAttribute('aria-live', 'polite');

// Layout pela zona do polegar: marca e menu no topo (fora do alcance natural,
// longe de toques acidentais), placar grande no meio (só leitura) e tabuleiro
// embaixo, onde o polegar alcança.
const menuBtn = createMenuButton();
const topBar = document.createElement('header');
topBar.className = 'top-bar';
topBar.append(createBrand(), menuBtn);
status.className = 'status';
const display = document.createElement('section');
display.className = 'display';
display.append(hud, status);

const menu = createMenu(() => ({ palette: settings.palette, image: settings.image, photo }), {
  open: () => timer.pause(),
  newGame: () => newGame(),
  palette(id) {
    settings.palette = id;
    saveSettings(settings);
    applyPalette(paletteById(id));
  },
  image(id) {
    settings.image = id;
    saveSettings(settings);
    applyImage();
  },
  async photo(file) {
    photo = await photoFromFile(file);
    if (!savePhoto(photo)) alert('A FOTO VALE SÓ ATÉ FECHAR O JOGO: FALTOU ESPAÇO.');
    settings.image = 'user';
    saveSettings(settings);
    applyImage();
  },
});

app.append(topBar, display, view.el, menu.el);
applyPalette(paletteById(settings.palette));
applyImage();

function applyImage(): void {
  if (settings.image === 'user' && photo) view.setImage(photo);
  else view.setImage(builtinImageUrl(settings.image), true);
}

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

menuBtn.addEventListener('click', () => menu.open());
window.addEventListener('resize', () => view.update(board));
setInterval(renderHud, 250);

setupServiceWorker((applyUpdate) => {
  if (confirm('NOVA VERSÃO! REINICIAR?')) applyUpdate();
});

newGame();
