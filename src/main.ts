import './style.css';
import { createBoard, isSolved, moveAt, moveDirection, type Board, type MoveResult, type Size } from './core/board';
import { newSeed, shuffle } from './core/shuffle';
import { formatTime, Timer } from './core/timer';
import { BoardView } from './render/boardView';
import { bindInput } from './render/input';
import { VictoryEffect } from './render/victory';
import { setupServiceWorker } from './pwa/sw';
import { applyPalette, paletteById } from './theme/palettes';
import { builtinImageUrl, fileImageUrl, photoFromFile } from './theme/images';
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

const victory = new VictoryEffect();
app.append(topBar, display, view.el, menu.el, victory.canvas);
applyPalette(paletteById(settings.palette));
applyImage();

let imageRequest = 0;

function applyImage(): void {
  const req = ++imageRequest;
  if (settings.image === 'user' && photo) return view.setImage(photo);
  const file = fileImageUrl(settings.image);
  if (!file) return view.setImage(builtinImageUrl(settings.image), true);
  // A imagem da pasta é recortada de forma assíncrona; ignora respostas velhas.
  file.then(
    ({ url, pixelated }) => req === imageRequest && view.setImage(url, pixelated),
    () => req === imageRequest && view.setImage(null),
  );
}

let size: Size = 4;
let board: Board;
let moves = 0;
let won = false;
/** Contagem antes de embaralhar: o tabuleiro aparece montado e não aceita jogadas. */
let starting = false;
let gameId = 0;
const timer = new Timer();

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 800;
const SHUFFLE_MS = 600;

const countdown = document.createElement('div');
countdown.className = 'countdown';
countdown.setAttribute('aria-live', 'assertive');

const winMsg = document.createElement('div');
winMsg.className = 'win-msg';
winMsg.setAttribute('role', 'status');
winMsg.textContent = 'Rachou a Cuca!';

function newGame(): void {
  const id = ++gameId;
  const shuffled = shuffle(size, newSeed());
  board = createBoard(size);
  moves = 0;
  won = false;
  starting = true;
  status.textContent = '';
  victory.cancel();
  winMsg.remove();
  timer.reset();
  view.mount(board);
  view.el.classList.remove('shuffling');
  view.el.append(countdown);
  renderHud();

  let n = COUNTDOWN_FROM;
  const tick = () => {
    if (id !== gameId) return;
    if (n > 0) {
      countdown.textContent = String(n);
      // Reinicia a animação do número a cada passo.
      countdown.classList.remove('pop');
      void countdown.offsetWidth;
      countdown.classList.add('pop');
      n--;
      setTimeout(tick, COUNTDOWN_STEP_MS);
      return;
    }
    countdown.remove();
    board = shuffled;
    view.el.classList.add('shuffling');
    view.update(board);
    setTimeout(() => {
      if (id !== gameId) return;
      view.el.classList.remove('shuffling');
      starting = false;
    }, SHUFFLE_MS);
  };
  tick();
}

function apply(result: MoveResult | null): void {
  if (!result || won || starting) return;
  if (!timer.running) timer.start();
  board = result.board;
  moves += result.moved.length;
  view.update(board);
  view.bump(result.direction);
  renderHud();
  if (isSolved(board)) {
    won = true;
    timer.pause();
    renderHud();
    victory.play(view.el, size, {
      reveal: () => view.el.append(winMsg),
      done: () => {},
    });
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
