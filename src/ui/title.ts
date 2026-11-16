/**
 * Tela de abertura (seção 10.2): o logo se monta peça por peça, "PRESS START"
 * pisca a 1 Hz e há um "© 19XX" de brincadeira. O toque aqui é o primeiro
 * gesto do jogador: destrava o áudio, a tela cheia e o wake lock.
 */
const COLS = 3;
const ROWS = 4;

export function createTitleScreen(onStart: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'screen title-screen';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Começar: toque ou aperte Enter');
  el.tabIndex = 0;

  const logo = document.createElement('h1');
  logo.className = 'title-logo';
  logo.setAttribute('aria-label', 'Racha Cuca');
  const url = `${import.meta.env.BASE_URL}brand/logo.webp`;
  // Peças em ordem embaralhada, cada uma voando de um lado até o lugar.
  const order = Array.from({ length: COLS * ROWS }, (_, i) => i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < COLS * ROWS; i++) {
    const piece = document.createElement('span');
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    piece.style.backgroundImage = `url("${url}")`;
    piece.style.backgroundPosition = `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;
    piece.style.setProperty('--from-x', `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty('--from-y', `${(Math.random() - 0.5) * 320}px`);
    piece.style.animationDelay = `${order.indexOf(i) * 90}ms`;
    logo.append(piece);
  }

  const press = document.createElement('p');
  press.className = 'press-start';
  press.textContent = 'PRESS START';
  const copy = document.createElement('p');
  copy.className = 'title-copy';
  copy.textContent = `© 19XX RACHA CUCA · v${__APP_VERSION__}`;
  el.append(logo, press, copy);

  let started = false;
  const start = () => {
    if (started || el.hidden) return;
    started = true;
    onStart();
    setTimeout(() => (started = false), 500);
  };
  el.addEventListener('click', start);
  window.addEventListener('keydown', (e) => {
    if (!el.hidden && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      start();
    }
  });
  return el;
}
