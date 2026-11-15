/**
 * Tela cheia e orientação (seção 9.3).
 *
 * Instalado, o manifest já abre em tela cheia e em retrato. No navegador
 * comum (Android), o primeiro toque pede tela cheia e trava o retrato. No iOS
 * a API não existe para páginas: lá a tela cheia só vem com o app instalado.
 */

/** Aberto como app instalado (tela inicial), e não numa aba do navegador. */
export function isInstalled(): boolean {
  return (
    matchMedia('(display-mode: fullscreen)').matches ||
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Telefone ou tablet: no desktop, tela cheia no primeiro clique seria intrusivo. */
function isTouchDevice(): boolean {
  return matchMedia('(pointer: coarse)').matches;
}

function lockPortrait(): void {
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  orientation?.lock?.('portrait').catch(() => {
    /* sem trava: o aviso "GIRE O APARELHO" cobre o caso */
  });
}

/**
 * Pede tela cheia no primeiro gesto do jogador (o navegador exige um gesto).
 * Faz isso uma única vez: se o jogador sair da tela cheia, a escolha é dele.
 */
export function setupFullscreen(): void {
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) lockPortrait();
  });
  if (isInstalled() || !isTouchDevice() || !document.documentElement.requestFullscreen) return;

  const events = ['pointerup', 'keydown'] as const;
  const once = () => {
    for (const type of events) window.removeEventListener(type, once, true);
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
      /* recusado pelo navegador: segue na aba */
    });
  };
  for (const type of events) window.addEventListener(type, once, true);
}

/**
 * Aparelho deitado sem trava de orientação (celular): o aviso em pixel art
 * cobre a tela. Tablets e desktop deitados usam o layout largo e não veem o
 * aviso (a regra de mídia fica no CSS, em .rotate-hint).
 */
export const LANDSCAPE_PHONE = '(orientation: landscape) and (pointer: coarse) and (max-height: 479px)';

export function createRotateHint(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'rotate-hint';
  el.setAttribute('role', 'alert');
  // Celular em pixel art (grade de 16 × 16) deitado, com a seta de girar.
  el.innerHTML = `
    <svg viewBox="0 0 16 16" width="128" height="128" shape-rendering="crispEdges" aria-hidden="true">
      <g class="rotate-hint-phone">
        <rect x="5" y="1" width="6" height="11" fill="currentColor"/>
        <rect x="6" y="2" width="4" height="8" fill="var(--bg)"/>
        <rect x="7" y="10" width="2" height="1" fill="var(--bg)"/>
      </g>
      <g fill="var(--accent)">
        <rect x="2" y="12" width="1" height="2"/>
        <rect x="3" y="14" width="8" height="1"/>
        <rect x="10" y="13" width="1" height="3"/>
        <rect x="11" y="14" width="1" height="1"/>
      </g>
    </svg>
    <p>GIRE O<br>APARELHO</p>`;
  return el;
}

/**
 * Tela acesa durante a partida (seção 9.3). O sistema solta a trava sozinho
 * quando o app sai de cena; ela é pedida de novo quando ele volta, se o jogo
 * ainda quiser. Onde a API não existe, nada acontece.
 */
let wakeLock: WakeLockSentinel | null = null;
let wantAwake = false;
let requesting = false;

async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator) || wakeLock || requesting || document.hidden) return;
  requesting = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!wantAwake || wakeLock) {
      void lock.release();
      return;
    }
    wakeLock = lock;
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null;
    });
  } catch {
    /* recusado (bateria fraca, aba oculta etc.) */
  } finally {
    requesting = false;
  }
}

export function keepAwake(on: boolean): void {
  if (on === wantAwake) return;
  wantAwake = on;
  if (on) void requestWakeLock();
  else if (wakeLock) {
    const lock = wakeLock;
    wakeLock = null;
    void lock.release().catch(() => {});
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && wantAwake) void requestWakeLock();
});
