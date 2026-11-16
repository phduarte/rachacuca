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
import { installMode, promptInstall, setupInstall } from './pwa/install';
import { db, type GameRecord, type SavedSession } from './data/db';
import { clearSession, loadSession, SAVE_DEBOUNCE_MS, saveSession, saveSessionPatchSync } from './data/session';
import { confirmDialog } from './ui/confirm';
import { recordGame, type RecordOutcome } from './data/stats';
import { catalog, enabledIds, findImage, loadCatalog, onCatalogChange, registerTemporary, userEntry } from './data/images';
import { createGalleryScreen } from './ui/gallery';
import { installHintShown, loadRecent, markInstallHintShown, saveRecent, type Recent } from './data/meta';
import { createRotateHint, keepAwake, LANDSCAPE_PHONE, setupBackButton, setupFullscreen } from './pwa/fullscreen';
import { applyPalette, paletteById, PALETTES } from './theme/palettes';
import { fileImageUrl } from './theme/images';
import { pickFresh, RECENT_IMAGES, RECENT_PALETTES, remember } from './theme/draw';
import { glitch, setCrt, tubeTransition } from './render/crt';
import { retroize } from './theme/retroize';
import { loadSettings, saveSettings, showNumbers } from './settings';
import { createBrand } from './ui/brand';
import { createMenu, createMenuButton } from './ui/menu';
import { createPauseButton, createPauseScreen } from './ui/pause';
import { createInstallHint } from './ui/installHint';
import { createTitleScreen } from './ui/title';
import { createMainMenu } from './ui/mainMenu';
import { createStatsScreen } from './ui/stats';

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
/** Paletas e imagens recentes (store meta), carregadas na abertura. */
let recent: Recent = { palettes: [], images: [] };
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

// Base da tela de jogo (seção 10.2): espiar, miniatura da imagem e novo jogo.
const bottomBar = document.createElement('footer');
bottomBar.className = 'bottom-bar';
const peekBtn = document.createElement('button');
peekBtn.className = 'icon-btn peek-btn';
peekBtn.setAttribute('aria-label', 'Espiar a imagem completa (segure)');
// Olho em pixel art
peekBtn.innerHTML = `<svg viewBox="0 0 11 7" width="26" height="17" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="currentColor" d="M3 0h5v1h2v1h1v3h-1v1H8v1H3V6H1V5H0V2h1V1h2zM4 2v3h3V2z"/></svg>`;
const thumb = document.createElement('span');
thumb.className = 'bar-thumb';
thumb.setAttribute('role', 'img');
const barNewGame = document.createElement('button');
barNewGame.className = 'bar-new-game';
barNewGame.textContent = 'NOVO JOGO';
bottomBar.append(peekBtn, thumb, barNewGame);

/** Telas (seção 10.2): abertura, menu principal e jogo. */
type Screen = 'title' | 'menu' | 'game' | 'stats' | 'gallery';
let screen: Screen = 'title';

/** Versão nova pronta (seção 9.4): aplicar recarrega o app. */
let applyUpdate: (() => void) | null = null;
const menuState = () => ({
  ...settings,
  images: catalog().map(({ id, title, thumb, pixelated }) => ({ id, title, thumb, pixelated })),
  install: installMode(),
  update: !!applyUpdate,
});
const installHint = createInstallHint();
const menu = createMenu(menuState, {
  size(n) {
    settings.size = n;
    saveSettings(settings);
    mainMenu.render();
    // Em jogo, o tamanho novo vale já; no menu principal, no próximo NOVO JOGO.
    if (screen === 'game') newGame();
  },
  open() {
    pause();
  },
  newGame: () => startGame(),
  palette(id) {
    settings.palette = id;
    saveSettings(settings);
    // Paleta fixa vale já; "sortear" vale a partir da próxima partida.
    if (id === 'random') return;
    gamePalette = id;
    applyTheme();
  },
  crt(on) {
    settings.crt = on;
    saveSettings(settings);
    setCrt(on);
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
    if (id === 'random') return;
    gameImage = id;
    applyImage();
  },
  gallery: () => go('gallery'),
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
    // Seção 9.4: salva a partida antes de recarregar na versão nova.
    void saveNow().then(() => applyUpdate?.());
  },
  install: () => installNow(),
});

function installNow(): void {
  if (installMode() === 'ios') {
    installHint.open();
    armBack();
  } else
    void promptInstall().then(() => {
      menu.refresh();
      mainMenu.render();
    });
}

sfx.setVolume(settings.volume);
setCrt(settings.crt);
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
  restart: () => newGame({ seed }),
  menu: () => go('menu'),
});

const titleScreen = createTitleScreen(() => {
  go('menu');
  // Seção 8.1: partida salva ao fechar o app; ao reabrir, oferece continuar.
  void dataReady.then(async () => {
    if (!savedSession || gameId > 0) return;
    if (await confirmDialog('CONTINUAR PARTIDA?', 'HÁ UMA PARTIDA SALVA NESTE APARELHO.')) continueGame();
    else await dropSavedSession();
  });
});
const mainMenu = createMainMenu(
  () => ({
    canContinue: (gameId > 0 && !won) || !!savedSession,
    size: settings.size,
    unlocked6: settings.unlocked6,
    install: !!installMode(),
    update: !!applyUpdate,
    stats: true,
  }),
  {
    continue: () => continueGame(),
    newGame: () => go('game', () => newGame()),
    size(n) {
      settings.size = n;
      saveSettings(settings);
    },
    images: () => go('gallery'),
    stats: () => go('stats'),
    options() {
      menu.open();
      armBack();
    },
    install: () => installNow(),
    update: () => void saveNow().then(() => applyUpdate?.()),
  },
);
mainMenu.el.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) sfx.beep();
});

const statsScreen = createStatsScreen({
  back: () => go('menu'),
  replay: (g) => go('game', () => newGame({ seed: g.seed, size: g.size, image: g.imageId, palette: g.paletteId })),
  thumb: (id) => findImage(id)?.thumb ?? null,
});
const galleryScreen = createGalleryScreen({ back: () => go('menu'), palette: () => paletteById(gamePalette) });
galleryScreen.el.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) sfx.beep();
});
onCatalogChange(() => menu.refresh());
statsScreen.el.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('button')) sfx.beep();
});

/** Troca de tela com a transição do tubo (seção 10.2). */
function go(to: Screen, after?: () => void): void {
  tubeTransition(() => {
    screen = to;
    app.dataset.screen = to;
    titleScreen.hidden = to !== 'title';
    mainMenu.el.hidden = to !== 'menu';
    statsScreen.el.hidden = to !== 'stats';
    galleryScreen.el.hidden = to !== 'gallery';
    if (to === 'gallery') galleryScreen.show();
    if (to === 'stats') statsScreen.show(settings.size);
    if (to === 'menu') mainMenu.render();
    after?.();
    syncAwake();
    if (to === 'menu') mainMenu.el.querySelector<HTMLButtonElement>('.main-item:not([hidden])')?.focus({ preventScroll: true });
  });
}

/** CONTINUAR: volta para a partida da memória ou retoma a salva no aparelho. */
function continueGame(): void {
  const saved = gameId === 0 ? savedSession : null;
  go('game', () => {
    if (saved) restoreSession(saved);
    // Retomada sempre começa em pausa: o jogo não volta a correr sozinho.
    if (saved) pause();
    else resume();
  });
}

/** NÃO na pergunta de continuar: a partida salva conta como abandonada. */
async function dropSavedSession(): Promise<void> {
  const s = savedSession;
  savedSession = null;
  mainMenu.render();
  if (!s) return;
  await recordGame({ ...s.game, timeMs: Math.round(s.elapsedMs), status: 'abandoned', finishedAt: Date.now() });
  await clearSession();
}

/** NOVO JOGO das opções e da barra: em jogo começa já; fora, vai para o jogo. */
function startGame(): void {
  if (screen === 'game') newGame();
  else go('game', () => newGame());
}
app.dataset.screen = screen;
app.append(titleScreen, mainMenu.el, statsScreen.el, galleryScreen.el, topBar, display, view.el, bottomBar, pauseScreen.el, menu.el, installHint.el, victory.canvas, createRotateHint());
setupFullscreen();
/** Conta os pedidos de imagem para ignorar recortes que chegam atrasados. */
let imageRequest = 0;

/** Paleta e imagem da partida atual (sorteadas ou fixadas no menu). */
let gamePalette = settings.palette === 'random' ? PALETTES[0]!.id : settings.palette;
let gameImage = settings.image === 'random' ? 'none' : settings.image;

/** Todas as imagens que entram no sorteio (seção 3.2). */
function imageIds(): string[] {
  const ids = enabledIds();
  return ids.length ? ids : ['none'];
}

/** Seção 3: sorteia paleta e imagem sem repetir as recentes (ou usa as fixadas). */
function chooseTheme(): void {
  gamePalette =
    settings.palette === 'random'
      ? pickFresh(PALETTES.map((p) => p.id), recent.palettes, RECENT_PALETTES)
      : settings.palette;
  gameImage = settings.image === 'random' ? pickFresh(imageIds(), recent.images, RECENT_IMAGES) : settings.image;
  recent = {
    palettes: remember(recent.palettes, gamePalette, RECENT_PALETTES),
    images: gameImage === 'none' ? recent.images : remember(recent.images, gameImage, RECENT_IMAGES),
  };
  void saveRecent(recent);
}

const paletteToast = document.createElement('div');
paletteToast.className = 'palette-toast';
paletteToast.setAttribute('aria-live', 'polite');
app.append(paletteToast);
let toastTimer = 0;
let shownPalette = '';

/** Aplica a paleta (com glitch e o nome por 1,5 s, se mudou) e a imagem. */
function applyTheme(): void {
  const p = paletteById(gamePalette);
  if (p.id !== shownPalette) {
    if (shownPalette) glitch();
    shownPalette = p.id;
    applyPalette(p);
    paletteToast.textContent = `PALETA: ${p.name}`;
    paletteToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => paletteToast.classList.remove('show'), 1500);
  }
  applyImage();
}

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
  const img = findImage(gameImage);
  if (!img) return null;
  // As da pasta assets/images são recortadas em quadrado na hora.
  const file = fileImageUrl(gameImage);
  if (file) {
    const { url, pixelated } = await file;
    return { url, pixelated, grid: img.grid };
  }
  return { url: img.url, pixelated: img.pixelated, grid: img.grid };
}

/**
 * Aplica a imagem da partida: em cores originais ou, no modo retrô, em grade
 * de pixels nas cores da paleta (seção 3.2). O recorte e o retrô são
 * assíncronos; respostas de pedidos antigos são ignoradas.
 */
function applyImage(): void {
  const req = ++imageRequest;
  const show = (url: string | null, pixelated = false) => {
    if (req !== imageRequest) return;
    view.setImage(url, pixelated);
    // Miniatura na base da tela de jogo.
    thumb.style.backgroundImage = url ? `url("${url}")` : '';
    thumb.classList.toggle('bar-thumb--numbers', !url);
    thumb.classList.toggle('pixelated', !!url && pixelated);
    thumb.textContent = url ? '' : '123';
    thumb.setAttribute('aria-label', url ? 'Imagem da partida' : 'Só números');
    // Sem imagem não há o que espiar.
    peekBtn.disabled = !url;
  };
  sourceImage().then(
    (src) => {
      if (!src) return show(null);
      if (!settings.retro) return show(src.url, src.pixelated);
      retroize(gameImage, src.url, paletteById(gamePalette), src.grid).then(
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
/** Espiadas na partida (seção 3.2): entram no resultado e nas estatísticas. */
let peeks = 0;
/** Registro da partida (seção 11.3): id, início e posição inicial. */
let recordId = '';
let startedAt = 0;
let initialTiles: number[] = [];
/** Resultado da gravação da última vitória (recorde novo etc.), para o painel. */
let lastOutcome: Promise<RecordOutcome> | null = null;

function gameRecord(status: GameRecord['status']): GameRecord {
  return {
    id: recordId,
    size,
    seed,
    imageId: gameImage,
    paletteId: gamePalette,
    initialTiles,
    status,
    moves,
    timeMs: Math.round(timer.elapsedMs()),
    peeks,
    startedAt,
    finishedAt: Date.now(),
  };
}

/** Partida salva no aparelho e ainda não retomada. */
let savedSession: SavedSession | null = null;
let saveTimer = 0;
/** Cópia da foto usada na partida, para ela seguir se a foto for trocada (seção 4.2). */
let imageCopy: { gameId: number; blob: Blob } | null = null;

/** Salva a partida em andamento (já ou com debounce de 300 ms). */
function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNow(), SAVE_DEBOUNCE_MS);
}

async function saveNow(): Promise<void> {
  clearTimeout(saveTimer);
  if (!inProgress()) return;
  const id = gameId;
  // Imagem do jogador: vai uma cópia junto, para a partida seguir se ela for apagada.
  const own = userEntry(gameImage);
  if (own?.blob && imageCopy?.gameId !== id) imageCopy = { gameId: id, blob: own.blob };
  const { status: _s, finishedAt: _f, ...game } = gameRecord('abandoned');
  await saveSession({
    game,
    tiles: [...board.tiles],
    elapsedMs: timer.elapsedMs(),
    imageCopy: imageCopy?.gameId === id ? imageCopy.blob : undefined,
  });
}

/** Partida mexida e não terminada: sair dela para outra conta como abandono (seção 2.5). */
function inProgress(): boolean {
  return gameId > 0 && !won && moves > 0;
}
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
winMsg.setAttribute('aria-label', 'Rachou a Cuca!');
// Mesma arte da logomarca: palavra de cima laranja, de baixo azul (ui/brand).
for (const [word, mod] of [
  ['RACHOU', 'top'],
  ['A CUCA!', 'bottom'],
] as const) {
  const w = document.createElement('span');
  w.className = `win-word win-word--${mod}`;
  w.dataset.text = word;
  w.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.textContent = word;
  w.append(fill);
  winMsg.append(w);
}

/**
 * Partida nova (seção 3): sorteia paleta, imagem e embaralhamento.
 * REINICIAR passa a mesma semente e mantém paleta e imagem.
 */
interface Replay {
  seed: number;
  /** Jogar de novo uma partida do histórico: também tamanho, imagem e paleta. */
  size?: Size;
  image?: string;
  palette?: string;
}

function newGame(replay?: Replay): void {
  if (inProgress()) void recordGame(gameRecord('abandoned'));
  clearTimeout(saveTimer);
  void clearSession();
  savedSession = null;
  const id = ++gameId;
  let gameSeed: number;
  if (!replay) {
    size = settings.size;
    gameSeed = newSeed();
    chooseTheme();
  } else {
    // REINICIAR mantém tamanho, imagem e paleta; JOGAR DE NOVO traz os da partida.
    gameSeed = replay.seed;
    if (replay.size) size = replay.size;
    if (replay.image) gameImage = replay.image;
    if (replay.palette) gamePalette = replay.palette;
  }
  applyTheme();
  seed = gameSeed;
  const shuffled = shuffle(size, seed);
  recordId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  startedAt = Date.now();
  initialTiles = [...shuffled.tiles];
  paused = false;
  pauseScreen.hide();
  board = createBoard(size);
  moves = 0;
  peeks = 0;
  stopPeek();
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
  if (screen !== 'game' || won || starting || paused) return;
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
  scheduleSave();
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
    clearTimeout(saveTimer);
    void clearSession();
    lastOutcome = recordGame(gameRecord('won'));
    const outcomeOf = lastOutcome;
    void outcomeOf.then((o) => {
      if (lastOutcome === outcomeOf && (o.newBestTime || o.newBestMoves)) status.textContent = 'NOVO RECORDE!';
    });
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
  if (screen !== 'game' || won || starting || sliding || paused) return null;
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

/** Retoma a partida salva: posição, tempo, movimentos, espiadas, semente, imagem e paleta. */
function restoreSession(s: SavedSession): void {
  savedSession = null;
  gameId++;
  const g = s.game;
  size = g.size;
  seed = g.seed;
  recordId = g.id;
  startedAt = g.startedAt;
  initialTiles = [...g.initialTiles];
  moves = g.moves;
  peeks = g.peeks;
  gamePalette = g.paletteId;
  gameImage = g.imageId;
  // A foto do jogador sumiu ou mudou: a partida segue com a cópia salva.
  if (s.imageCopy) {
    imageCopy = { gameId, blob: s.imageCopy };
    if (!findImage(g.imageId)) registerTemporary(g.imageId, s.imageCopy);
  }
  won = false;
  starting = false;
  paused = false;
  sliding = false;
  queue.length = 0;
  victory.cancel();
  countdown.remove();
  winMsg.remove();
  status.textContent = '';
  board = createBoard(size, s.tiles);
  view.mount(board);
  view.el.classList.remove('shuffling');
  applyNumbers();
  applyTheme();
  timer.reset(s.elapsedMs);
  renderHud();
}

/** Tela acesa só com a partida em jogo (seção 9.3). */
function syncAwake(): void {
  keepAwake(screen === 'game' && !won && !paused);
}

/** Pausa a partida em jogo; na contagem ou depois da vitória não há o que pausar. */
function pause(): void {
  if (screen !== 'game' || won || starting || paused) return;
  paused = true;
  stopPeek();
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

// Voltar (Android): fecha o diálogo aberto, pausa a partida ou, no menu
// principal com partida em andamento, volta para ela (seção 9.3). Na pausa e
// na abertura, sem nada para fechar, o voltar segue o padrão do sistema.
const armBack = setupBackButton(
  () =>
    !!openDialog() ||
    (screen === 'game' && !won && !starting && !paused) ||
    (screen === 'menu' && gameId > 0 && !won) ||
    screen === 'stats' ||
    screen === 'gallery',
  () => {
    const dlg = openDialog();
    if (dlg) dlg.close();
    else if (screen === 'stats' || screen === 'gallery') go('menu');
    else if (screen === 'menu') go('game');
    else pause();
  },
);

/**
 * Espiar (seções 3.2 e 5): segurar o botão mostra a imagem completa em
 * transparência sobre o tabuleiro; soltar esconde. Cada espiada conta.
 */
function startPeek(): void {
  if (peekBtn.disabled || screen !== 'game' || won || paused || view.el.classList.contains('peeking')) return;
  peeks++;
  view.el.classList.add('peeking');
  peekBtn.setAttribute('aria-pressed', 'true');
}

function stopPeek(): void {
  view.el.classList.remove('peeking');
  peekBtn.setAttribute('aria-pressed', 'false');
}

peekBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try {
    peekBtn.setPointerCapture(e.pointerId);
  } catch {
    /* sem captura */
  }
  startPeek();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) peekBtn.addEventListener(type, stopPeek);
// Teclado: segurar Enter ou espaço no botão.
peekBtn.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
    e.preventDefault();
    startPeek();
  }
});
peekBtn.addEventListener('keyup', stopPeek);
peekBtn.addEventListener('blur', stopPeek);

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
// Seção 8.1: e salva a partida na hora.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    timer.pause();
    pause();
    void saveNow();
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
window.addEventListener('resize', () => board && view.update(board));
barNewGame.addEventListener('click', () => {
  sfx.beep();
  newGame();
});
setInterval(renderHud, 250);

setupInstall(() => menu.refresh());

/** Dados do aparelho (seção 11.3): migra a versão anterior e carrega o que o jogo usa. */
async function loadData(): Promise<void> {
  await loadCatalog();
  recent = await loadRecent();
  savedSession = await loadSession();
  mainMenu.render();
  // iOS no Safari, ainda não instalado: o guia aparece sozinho uma única vez
  // (só com banco: sem ele, apareceria a cada abertura).
  if (installMode() === 'ios' && (await db()) && !(await installHintShown())) {
    void markInstallHintShown();
    installHint.open();
  }
}
const dataReady = loadData();
window.addEventListener('pagehide', () => {
  if (!inProgress()) return;
  saveSessionPatchSync({ id: recordId, tiles: [...board.tiles], elapsedMs: timer.elapsedMs(), moves, peeks });
  void saveNow();
});

// A versão nova espera no menu; o botão do menu ganha um aviso.
setupServiceWorker((apply) => {
  applyUpdate = apply;
  menuBtn.classList.add('has-update');
  menu.refresh();
  mainMenu.render();
});

// Começa na abertura, com a paleta fixada (ou a padrão) e sem partida.
shownPalette = gamePalette;
applyPalette(paletteById(gamePalette));
mainMenu.render();
titleScreen.focus({ preventScroll: true });
