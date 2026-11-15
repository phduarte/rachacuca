import './style.css';
import { createBoard, isSolved, moveAt, moveDirection, type Board, type Direction, type MoveResult, type Size } from './core/board';
import { newSeed, shuffle } from './core/shuffle';
import { formatTime, Timer } from './core/timer';
import { BoardView } from './render/boardView';
import { bindInput, SWIPE_MIN_PX, type DragControl } from './render/input';
import { VICTORY_TIMES, VictoryEffect } from './render/victory';
import * as sfx from './audio/sfx';
import { holdMusic, setMusic } from './audio/music';
import { setupServiceWorker } from './pwa/sw';
import { installMode, markIOSHintShown, promptInstall, setupInstall, shouldShowIOSHint } from './pwa/install';
import { createRotateHint, keepAwake, LANDSCAPE_PHONE, setupBackButton, setupFullscreen } from './pwa/fullscreen';
import { applyPalette, paletteById } from './theme/palettes';
import { builtinImageUrl, fileImageUrl, photoFromFile } from './theme/images';
import { originalImageUrl } from './theme/originals';
import { forgetRetro, RETRO_GRID, retroize } from './theme/retroize';
import { loadPhoto, loadSettings, savePhoto, saveSettings, showNumbers } from './settings';
import { createBrand } from './ui/brand';
import { createMenu, createMenuButton } from './ui/menu';
import { createPauseButton, createPauseScreen } from './ui/pause';
import { createInstallHint } from './ui/installHint';

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
const pauseBtn = createPauseButton();
const topBar = document.createElement('header');
topBar.className = 'top-bar';
topBar.append(pauseBtn, createBrand(), menuBtn);
status.className = 'status';
const display = document.createElement('section');
display.className = 'display';
display.append(hud, status);

/** Versão nova pronta (seção 9.4): aplicar recarrega o app. */
let applyUpdate: (() => void) | null = null;
const menuState = () => ({ ...settings, photo, install: installMode(), update: !!applyUpdate });
const installHint = createInstallHint();
const menu = createMenu(menuState, {
  size(n) {
    settings.size = n;
    saveSettings(settings);
    newGame();
  },
  open() {
    timer.pause();
    pause();
  },
  newGame: () => newGame(),
  palette(id) {
    settings.palette = id;
    saveSettings(settings);
    applyPalette(paletteById(id));
    // No modo retrô a imagem é requantizada para a paleta nova.
    if (settings.retro) applyImage();
  },
  retro(on) {
    settings.retro = on;
    saveSettings(settings);
    applyImage();
  },
  numbers(mode) {
    settings.numbers = mode;
    saveSettings(settings);
    applyNumbers();
  },
  image(id) {
    settings.image = id;
    saveSettings(settings);
    applyImage();
  },
  async photo(file) {
    photo = await photoFromFile(file);
    forgetRetro('user');
    if (!savePhoto(photo)) alert('A FOTO VALE SÓ ATÉ FECHAR O JOGO: FALTOU ESPAÇO.');
    settings.image = 'user';
    saveSettings(settings);
    applyImage();
  },
  volume(level) {
    settings.volume = level;
    saveSettings(settings);
    sfx.setVolume(level);
  },
  music(on) {
    settings.music = on;
    saveSettings(settings);
    setMusic(on);
  },
  vibration(on) {
    settings.vibration = on;
    victory.vibration = on;
    saveSettings(settings);
    if (on) navigator.vibrate?.(8);
  },
  update() {
    applyUpdate?.();
  },
  install() {
    if (installMode() === 'ios') {
      installHint.open();
      armBack();
    } else void promptInstall().then(() => menu.refresh());
  },
});

sfx.setVolume(settings.volume);
setMusic(settings.music);
// Seção 6.2: o AudioContext só toca depois de um gesto do jogador (iOS e
// Chrome). Retomar é barato, então todo toque tenta (o iOS suspende o áudio
// ao trocar de app).
for (const type of ['pointerdown', 'pointerup', 'keydown'] as const) {
  window.addEventListener(type, sfx.unlockAudio, { capture: true, passive: true });
}
// Bipe ao navegar no menu (seção 6.3).
menu.el.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) sfx.beep();
});

const victory = new VictoryEffect();
victory.vibration = settings.vibration;
let stopVictorySound = (): void => {};
const pauseScreen = createPauseScreen({
  resume: () => resume(),
  restart: () => newGame(seed),
  menu() {
    menu.open();
    armBack();
  },
});
app.append(topBar, display, view.el, pauseScreen.el, menu.el, installHint.el, victory.canvas, createRotateHint());
setupFullscreen();
/** Conta os pedidos de imagem para ignorar recortes que chegam atrasados. */
let imageRequest = 0;

applyPalette(paletteById(settings.palette));
applyImage();

/** Seção 3.2: com imagem, o número só aparece se a opção (ou o tamanho) pedir. */
function applyNumbers(): void {
  view.el.classList.toggle('hide-numbers', !showNumbers(settings, size));
}

interface SourceImage {
  url: string;
  pixelated: boolean;
  /** Lado da grade do modo retrô: imagens menores não são ampliadas. */
  grid: number;
}

/** A imagem escolhida em cores originais (null = só números). */
async function sourceImage(): Promise<SourceImage | null> {
  if (settings.image === 'user') return photo ? { url: photo, pixelated: false, grid: RETRO_GRID } : null;
  const original = originalImageUrl(settings.image);
  if (original) return { url: original, pixelated: true, grid: RETRO_GRID };
  const builtin = builtinImageUrl(settings.image);
  if (builtin) return { url: builtin, pixelated: true, grid: 64 };
  const file = fileImageUrl(settings.image);
  if (!file) return null;
  const { url, pixelated } = await file;
  return { url, pixelated, grid: RETRO_GRID };
}

/**
 * Aplica a imagem da partida: em cores originais ou, no modo retrô, em grade
 * de pixels nas cores da paleta (seção 3.2). O recorte e o retrô são
 * assíncronos; respostas de pedidos antigos são ignoradas.
 */
function applyImage(): void {
  const req = ++imageRequest;
  const show = (url: string | null, pixelated = false) => {
    if (req === imageRequest) view.setImage(url, pixelated);
  };
  sourceImage().then(
    (src) => {
      if (!src) return show(null);
      if (!settings.retro) return show(src.url, src.pixelated);
      retroize(settings.image, src.url, paletteById(settings.palette), src.grid).then(
        (url) => show(url, true),
        () => show(src.url, src.pixelated),
      );
    },
    () => show(null),
  );
}

let size: Size = settings.size;
let board: Board;
let moves = 0;
let won = false;
/** Contagem antes de embaralhar: o tabuleiro aparece montado e não aceita jogadas. */
let starting = false;
/** Pausa (seção 2.5): relógio parado, tabuleiro coberto, sem jogadas. */
let paused = false;
/** Semente da partida atual: REINICIAR recomeça a mesma posição. */
let seed = 0;
let gameId = 0;
const timer = new Timer();

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 800;
/** Voo das peças ao embaralhar: 600 ms cada, com até 300 ms de atraso (seção 3.3). */
const SHUFFLE_MS = 600;
const SHUFFLE_STAGGER_MS = 300;
/** Duração do deslize (--slide-ms no CSS): o impacto acontece no fim. */
const SLIDE_MS = 110;
/** Arrasto: completa se passou de 40% do caminho (seção 5)... */
const DRAG_COMMIT = 0.4;
/** ...ou se foi um peteleco rápido, como um swipe. */
const FLICK_MS = 250;
/** Fila de comandos durante a animação (seção 5). */
const QUEUE_MAX = 2;

/** Um comando é avaliado só na hora de rodar, sobre o tabuleiro daquele momento. */
type Command = () => MoveResult | null;
const queue: Command[] = [];
/** Peças em movimento: novos comandos entram na fila. */
let sliding = false;

const countdown = document.createElement('div');
countdown.className = 'countdown';
countdown.setAttribute('aria-live', 'assertive');

const winMsg = document.createElement('div');
winMsg.className = 'win-msg';
winMsg.setAttribute('role', 'status');
winMsg.textContent = 'Rachou a Cuca!';

function newGame(gameSeed = newSeed()): void {
  const id = ++gameId;
  size = settings.size;
  seed = gameSeed;
  const shuffled = shuffle(size, seed);
  paused = false;
  pauseScreen.hide();
  board = createBoard(size);
  moves = 0;
  won = false;
  starting = true;
  status.textContent = '';
  victory.cancel();
  stopVictorySound();
  stopVictorySound = () => {};
  queue.length = 0;
  sliding = false;
  winMsg.remove();
  timer.reset();
  view.mount(board);
  applyNumbers();
  view.el.classList.remove('shuffling');
  view.el.append(countdown);
  renderHud();
  syncAwake();

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
    view.scatter(board, SHUFFLE_STAGGER_MS);
    sfx.rattle(SHUFFLE_MS);
    setTimeout(() => {
      if (id !== gameId) return;
      view.el.classList.remove('shuffling');
      view.settle();
      starting = false;
    }, SHUFFLE_MS + SHUFFLE_STAGGER_MS);
  };
  tick();
}

/** Toque, swipe ou tecla: roda já ou espera o deslize atual terminar. */
function command(cmd: Command): void {
  if (won || starting || paused) return;
  if (sliding) {
    if (queue.length < QUEUE_MAX) queue.push(cmd);
    return;
  }
  run(cmd);
}

function run(cmd: Command): void {
  const result = cmd();
  if (result) apply(result);
  else sfx.thud();
}

function apply(result: MoveResult): void {
  if (!timer.running) timer.start();
  board = result.board;
  moves += result.moved.length;
  view.update(board);
  renderHud();
  const solved = isSolved(board);
  if (solved) {
    won = true;
    // Vencer um 5 × 5 libera o 6 × 6 "Insano" (seção 2.1).
    if (size === 5 && !settings.unlocked6) {
      settings.unlocked6 = true;
      saveSettings(settings);
    }
    timer.pause();
    queue.length = 0;
    renderHud();
    syncAwake();
  }
  sliding = true;
  const id = gameId;
  setTimeout(() => {
    if (id !== gameId) return;
    sliding = false;
    impact(result, solved);
    const next = queue.shift();
    if (next && !won) run(next);
  }, SLIDE_MS);
}

/** Fim do deslize: balanço, estalo e vibração (seção 6), ou a vitória (seção 7). */
function impact(result: MoveResult, solved: boolean): void {
  if (settings.vibration) navigator.vibrate?.(8);
  if (solved) {
    view.bump(result.direction, true);
    // A música sai de cena durante o efeito e volta quando ele termina.
    holdMusic('victory', true);
    const stopSfx = sfx.victory(VICTORY_TIMES);
    stopVictorySound = () => {
      stopSfx();
      holdMusic('victory', false);
    };
    victory.play(view.el, size, {
      reveal: () => view.el.append(winMsg),
      done: () => stopVictorySound(),
    });
    return;
  }
  view.bump(result.direction, result.moved.length >= 3);
  sfx.slide(result.moved.length);
}

const DIR_VECTORS: Record<Direction, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/**
 * Arrastar (seção 5): a peça (e as da fila até a casa vazia) segue o dedo
 * no eixo permitido. Solta depois de 40% do caminho, completa; antes, volta.
 */
function dragStart(x: number, y: number): DragControl | null {
  if (won || starting || sliding || paused) return null;
  const result = moveAt(board, view.indexAt(x, y));
  if (!result) return null;
  const tiles = result.moved.map((m) => m.tile);
  const [ux, uy] = DIR_VECTORS[result.direction];
  const pitch = view.pitch();
  const from = board;
  const t0 = performance.now();
  let dragging = false;
  return {
    move(dx, dy) {
      if (board !== from) return;
      const along = Math.max(0, Math.min(pitch, dx * ux + dy * uy));
      // Tremidinha de toque não vira arrasto.
      if (!dragging && along < 4) return;
      dragging = true;
      view.drag(tiles, ux * along, uy * along);
    },
    end(dx, dy) {
      view.release();
      if (board !== from || won || starting || paused) return false;
      // Pouco movimento é toque: o tap faz o mesmo deslize.
      if (Math.hypot(dx, dy) < SWIPE_MIN_PX) return false;
      const along = dx * ux + dy * uy;
      const across = Math.abs(dx * uy - dy * ux);
      // Foi para outro eixo ou para trás: vira swipe.
      if (along <= 0 || across > along) return false;
      const flick = performance.now() - t0 < FLICK_MS;
      if (along >= pitch * DRAG_COMMIT || flick) command(() => (board === from ? result : null));
      return true;
    },
    cancel() {
      view.release();
    },
  };
}

/** Tela acesa só com a partida em jogo (seção 9.3). */
function syncAwake(): void {
  keepAwake(!won && !paused);
}

/** Pausa a partida em jogo; na contagem ou depois da vitória não há o que pausar. */
function pause(): void {
  if (won || starting || paused) return;
  paused = true;
  timer.pause();
  queue.length = 0;
  view.release();
  renderHud();
  pauseScreen.show(formatTime(timer.elapsedMs()), moves);
  syncAwake();
}

function resume(): void {
  if (!paused) return;
  paused = false;
  pauseScreen.hide();
  // O relógio só volta se a partida já tinha começado (ele parte no 1º movimento).
  if (moves > 0) timer.start();
  syncAwake();
  armBack();
}

/** Diálogo aberto por cima do jogo (opções, guia de instalação...). */
function openDialog(): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>('dialog[open]');
}

// Voltar (Android): fecha o diálogo aberto ou pausa a partida (seção 9.3).
// Na pausa, sem nada para fechar, o voltar segue o padrão do sistema.
const armBack = setupBackButton(
  () => !!openDialog() || (!won && !starting && !paused),
  () => {
    const dlg = openDialog();
    if (dlg) dlg.close();
    else pause();
  },
);

function renderHud(): void {
  timeEl.textContent = formatTime(timer.elapsedMs());
  movesEl.textContent = String(moves);
}

bindInput(view.el, {
  dragStart,
  tap(x, y) {
    const i = view.indexAt(x, y);
    // Toque na moldura ou na casa vazia não é jogada.
    if (i < 0 || board.tiles[i] === 0) return;
    command(() => moveAt(board, i));
  },
  swipe: (dir) => command(() => moveDirection(board, dir)),
});

// Seção 2.5: perder o foco leva à pausa, e o jogo não volta a correr sozinho.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    timer.pause();
    pause();
  }
  // Sem música tocando com o app em segundo plano.
  holdMusic('hidden', document.hidden);
});

menuBtn.addEventListener('click', () => {
  menu.open();
  armBack();
});
pauseBtn.addEventListener('click', () => pause());
// Esc pausa (seção 5). Com um diálogo aberto, o próprio Esc o fecha.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !openDialog()) pause();
});
// Celular deitado: o aviso "GIRE O APARELHO" cobre o jogo, então pausa.
matchMedia(LANDSCAPE_PHONE).addEventListener('change', (e) => {
  if (e.matches) pause();
});
window.addEventListener('resize', () => view.update(board));
setInterval(renderHud, 250);

setupInstall(() => menu.refresh());
// iOS no Safari, ainda não instalado: o guia aparece sozinho uma única vez.
if (shouldShowIOSHint()) {
  markIOSHintShown();
  installHint.open();
}

// A versão nova espera no menu; o botão do menu ganha um aviso.
setupServiceWorker((apply) => {
  applyUpdate = apply;
  menuBtn.classList.add('has-update');
  menu.refresh();
});

newGame();
